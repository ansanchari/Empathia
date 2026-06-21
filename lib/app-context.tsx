"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"
import { supabase } from '@/lib/supabaseClient' 

export type Screen = "onboarding" | "mood" | "dashboard" | "settings" | "chat"
export type RelationshipRole = "Parent" | "Child" | "Spouse" | "Sibling" | "Friend" | ""
export type PreferredApp = "WhatsApp" | "Telegram" | "SMS"

export type Gender = "Female" | "Male" | "Non-Binary" | "Prefer not to say" | ""

export interface MoodEntry {
  score: number
  context: string
  isPrivate: boolean
  timestamp: Date
}

export interface UserProfile {
  name: string
  inviteCode: string
  partnerCode: string
  role: RelationshipRole | ""
  preferredApp: PreferredApp
  phoneNumber: string
  isLinked: boolean
  
  gender: Gender
  trackCycle: boolean
  cycleLength: number
  lastPeriodStart: string 
}

export interface PartnerData {
  name: string
  currentMood: number
  previousMood: number
  context: string
  isContextPrivate: boolean
  preferredApp: PreferredApp
  phoneNumber: string
  lastUpdated: Date
}

interface AppContextType {
  screen: Screen
  setScreen: (s: Screen) => void
  profile: UserProfile
  updateProfile: (updates: Partial<UserProfile>) => void
  moodHistory: MoodEntry[]
  addMoodEntry: (entry: MoodEntry) => void
  partner: PartnerData | null
  reachOutModalOpen: boolean
  setReachOutModalOpen: (open: boolean) => void
  hasLoggedMoodToday: boolean
  setHasLoggedMoodToday: (hasLogged: boolean) => void
  sessionUser: any // Exposing this so onboarding can use it if needed
  setSessionUser: (user: any) => void
}

const AppContext = createContext<AppContextType | null>(null)

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [isInitializing, setIsInitializing] = useState(true)
  
  const [sessionUser, setSessionUser] = useState<any>(null)
  
  const [screen, setRawScreen] = useState<Screen>("onboarding")
  const [reachOutModalOpen, setReachOutModalOpen] = useState(false)
  const [hasLoggedMoodToday, setHasLoggedMoodToday] = useState(false)
  
  const [profile, setProfile] = useState<UserProfile>({
    name: "",
    inviteCode: generateCode(),
    partnerCode: "",
    role: "",
    preferredApp: "WhatsApp",
    phoneNumber: "",
    isLinked: false,
    
    gender: "",
    trackCycle: false,
    cycleLength: 28,
    lastPeriodStart: new Date().toISOString().split('T')[0],
  })

  const [moodHistory, setMoodHistory] = useState<MoodEntry[]>([])
  const [partner] = useState<PartnerData | null>(null)

  const updateProfile = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }))
  }, [])

  const addMoodEntry = useCallback((entry: MoodEntry) => {
    setMoodHistory((prev) => [entry, ...prev])
  }, [])

  useEffect(() => {
    async function restoreSession() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        setSessionUser(null)
        setRawScreen("onboarding")
        setIsInitializing(false)
        return
      }

      setSessionUser(session.user)

      const { data: dbProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (dbProfile) {
        updateProfile({
          name: dbProfile.full_name || "",
          preferredApp: (dbProfile.preferred_app as PreferredApp) || "WhatsApp",
          phoneNumber: dbProfile.contact_info || "",
          gender: (dbProfile.gender as Gender) || "",
          trackCycle: dbProfile.track_cycle || false,
          cycleLength: dbProfile.cycle_length || 28,
          lastPeriodStart: dbProfile.last_period_start || new Date().toISOString().split('T')[0]
        })
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { data: moodLogs } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', session.user.id)
        .gte('created_at', today.toISOString())
        .limit(1)

      const loggedToday = (moodLogs?.length ?? 0) > 0
      setHasLoggedMoodToday(loggedToday)

      if (loggedToday) {
        setRawScreen("dashboard")
      } else {
        setRawScreen("mood")
      }

      setIsInitializing(false)
    }

    restoreSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setSessionUser(null)
        setRawScreen("onboarding")
        setHasLoggedMoodToday(false)
      } else if (event === 'SIGNED_IN' && session?.user) {
        setSessionUser(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [updateProfile])

  const setScreen = useCallback((newScreen: Screen) => {
    
    if (newScreen === "dashboard" && !hasLoggedMoodToday) {
      setRawScreen("mood")
      return
    }

    setRawScreen(newScreen)
  }, [hasLoggedMoodToday])

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <h1 className="font-serif text-3xl text-accent animate-pulse">Empathia</h1>
          <p className="text-sm text-muted-foreground">Restoring your session...</p>
        </div>
      </div>
    )
  }

  return (
    <AppContext.Provider
      value={{
        screen,
        setScreen,
        profile,
        updateProfile,
        moodHistory,
        addMoodEntry,
        partner,
        reachOutModalOpen,
        setReachOutModalOpen,
        hasLoggedMoodToday,
        setHasLoggedMoodToday,
        sessionUser, 
        setSessionUser
      }}
    >
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}