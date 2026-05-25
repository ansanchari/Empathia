"use client"

import { Logo } from "@/components/ui/logo"

import { useEffect, useState } from "react"
import { supabase } from '@/lib/supabaseClient'
import { useApp } from "@/lib/app-context"
import {
  TrendingDown,
  TrendingUp,
  Minus,
  Heart,
  MessageCircle,
  AlertTriangle,
  Clock,
  X,
  Bell,
  CheckCircle2,
  Info,
  Quote,
  Link2,
  Sparkles // <-- NEW icon for the Cycle Sync banner
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { MoodChart } from "../ui/MoodChart"
import { CopilotCard } from "../ui/CopilotCard"
import { motion, Variants, AnimatePresence } from "framer-motion"

// --- Animation Variants ---
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08, 
      delayChildren: 0.1,
    }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 25
    }
  }
}

const EMPATHY_QUOTES = [
  "Connection is the energy that exists between people when they feel seen, heard, and valued.",
  "Empathy is seeing with the eyes of another, listening with the ears of another, and feeling with the heart of another.",
  "Sometimes the most important thing in a whole day is the rest we take between two deep breaths.",
  "To love and be loved is to feel the sun from both sides.",
  "We are all so incredibly interconnected that we can only heal together.",
  "The most valuable thing we can offer each other is our active presence.",
  "A problem shared is a problem halved.",
  "There is no greater intelligence than the intelligence of the heart."
]

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  const diff = current - previous
  if (diff === 0) return <span className="flex items-center gap-1 text-xs text-muted-foreground"><Minus className="h-3.5 w-3.5" />Holding steady</span>
  if (diff < 0) return <span className="flex items-center gap-1 text-accent"><TrendingDown className="h-3.5 w-3.5" />Down {Math.abs(diff)} from last time</span>
  return <span className="flex items-center gap-1 text-primary"><TrendingUp className="h-3.5 w-3.5" />Up {diff} from last time</span>
}

function getMoodLevel(score: number | null): { label: string; severity: "low" | "mid" | "high" | "empty" } {
  if (score === null) return { label: "Waiting...", severity: "empty" }
  if (score <= 3) return { label: "Needs Support", severity: "low" }
  if (score <= 6) return { label: "Getting By", severity: "mid" }
  return { label: "Doing Well", severity: "high" }
}

function getDeepLink(app: string, phone: string): string {
  if (!phone) return "#"
  const cleanPhone = phone.replace(/[^0-9+]/g, "")
  switch (app) {
    case "WhatsApp": return `https://wa.me/${cleanPhone.replace("+", "")}`
    case "Telegram": return `https://t.me/${cleanPhone}`
    case "SMS": return `sms:${cleanPhone}`
    default: return "#"
  }
}

function ReachOutModal({ partner, setReachOutModalOpen, setScreen }: { partner: any, setReachOutModalOpen: any, setScreen: any }) {
  if (!partner) return null
  const deepLink = getDeepLink(partner.preferredApp, partner.phoneNumber)

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 backdrop-blur-sm sm:items-center p-4"
    >
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-xl text-accent">Reach Out</h3>
          <button onClick={() => setReachOutModalOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
        </div>
        
        <p className="mt-2 text-sm text-muted-foreground">
          How would you like to connect with <strong className="text-foreground">{partner.name}</strong>?
        </p>
        
        <div className="mt-6 flex flex-col gap-3">
          <button 
            onClick={() => {
              setReachOutModalOpen(false)
              setScreen("chat")
            }} 
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <MessageCircle className="h-4 w-4" />
            Open Private Chat
          </button>

          <a 
            href={deepLink} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => setReachOutModalOpen(false)} 
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-secondary py-4 text-sm font-semibold text-foreground shadow-sm transition-all hover:bg-muted active:scale-[0.98]"
          >
            Switch to {partner.preferredApp || "WhatsApp"}
          </a>
        </div>

        <button 
          onClick={() => setReachOutModalOpen(false)} 
          className="mt-4 w-full rounded-2xl py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </motion.div>
    </motion.div>
  )
}

export function DashboardScreen() {
  const { profile, reachOutModalOpen, setReachOutModalOpen, setScreen } = useApp()
  const [dbPartner, setDbPartner] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [quote, setQuote] = useState("")

  const [activeNotification, setActiveNotification] = useState<any>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [partnerLoggedToday, setPartnerLoggedToday] = useState(false)

  useEffect(() => {
    setQuote(EMPATHY_QUOTES[Math.floor(Math.random() * EMPATHY_QUOTES.length)])
  }, [])

  const fetchDashboardData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoading(false)
      return
    }

    const { data: relationship } = await supabase
      .from('relationships')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .eq('status', 'active')
      .maybeSingle()

    if (!relationship) {
      setDbPartner(null) 
      setLoading(false)
      return 
    }

    const partnerId = relationship.user_a_id === user.id ? relationship.user_b_id : relationship.user_a_id

    // UPDATED: Now fetching biological cycle data from the partner's profile
    const { data: partnerProfile } = await supabase.from('profiles').select('*').eq('id', partnerId).single()
    const { data: moodLogs } = await supabase.from('mood_logs').select('score, context, is_private, created_at').eq('user_id', partnerId).order('created_at', { ascending: false }).limit(5)

    const hasHistory = moodLogs && moodLogs.length > 0

    const chartData = hasHistory ? [...moodLogs].reverse().map(log => {
      const date = new Date(log.created_at)
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        score: log.score
      }
    }) : []
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    let loggedToday = false

    if (hasHistory) {
      const lastLogDate = new Date(moodLogs[0].created_at)
      if (lastLogDate >= today) {
        loggedToday = true
      }
    }
    setPartnerLoggedToday(loggedToday)

    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (notifs && notifs.length > 0) setActiveNotification(notifs[0])

    if (partnerProfile) {
      setDbPartner({
        name: partnerProfile.full_name || "Your Partner",
        preferredApp: partnerProfile.preferred_app || "WhatsApp",
        phoneNumber: partnerProfile.contact_info || "",
        hasHistory: hasHistory,
        currentMood: hasHistory ? moodLogs[0].score : null,
        previousMood: hasHistory && moodLogs.length > 1 ? moodLogs[1].score : (hasHistory ? moodLogs[0].score : null),
        lastUpdated: hasHistory ? new Date(moodLogs[0].created_at) : null,
        isContextPrivate: hasHistory ? moodLogs[0].is_private : false,
        context: hasHistory ? moodLogs[0].context : "",
        recentLogs: hasHistory ? moodLogs.map(l => l.score) : [],
        chartData: chartData,
        // Biological Context State
        trackCycle: partnerProfile.track_cycle,
        lastPeriodStart: partnerProfile.last_period_start,
        cycleLength: partnerProfile.cycle_length || 28,
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDashboardData()
  }, []) 

  useEffect(() => {
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mood_logs' }, () => { fetchDashboardData() })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => { fetchDashboardData() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'relationships' }, () => { fetchDashboardData() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => { fetchDashboardData() })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const markAsRead = async () => {
    if (!activeNotification || activeNotification.is_read) return
    setActiveNotification({ ...activeNotification, is_read: true })
    await supabase.from('notifications').update({ is_read: true }).eq('id', activeNotification.id)
  }

  if (loading) return <div className="flex w-full min-h-screen flex-1 items-center justify-center px-5 pb-28 pt-8"><p className="text-muted-foreground animate-pulse">Loading partner data...</p></div>
  
  // ==========================================
  // NEW: Premium Empty State Hero
  // ==========================================
  if (!dbPartner) {
    return (
      <div className="flex w-full min-h-screen flex-1 flex-col items-center justify-center px-5 pb-28 pt-8 relative overflow-hidden">
        
        {/* Animated Background Glow */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-primary/20 rounded-full blur-[80px] pointer-events-none"
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 25 }}
          className="z-10 flex flex-col items-center gap-6 rounded-3xl border border-border bg-card/60 p-8 text-center shadow-xl backdrop-blur-xl w-full max-w-sm"
        >
          <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-secondary">
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <Link2 className="h-10 w-10 text-primary" />
            </motion.div>
          </div>
          
          <div className="flex flex-col gap-2">
            <h2 className="font-serif text-2xl text-foreground">Waiting for Connection</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your dashboard is quiet right now. Generate an invite code and share it with a partner to start syncing your emotional worlds.
            </p>
          </div>
          
          <button
            onClick={() => setScreen("settings")}
            className="mt-2 w-full rounded-2xl bg-primary px-6 py-4 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-105 active:scale-95"
          >
            Go to Settings to Link
          </button>
        </motion.div>
      </div>
    )
  }

  // ==========================================
  // NEW: Biological Context Engine Calculator
  // ==========================================
  let isSensitivePhase = false
  let cycleMessage = ""
  
  if (dbPartner.trackCycle && dbPartner.lastPeriodStart) {
    // Calculate how many days it has been since the first day of their last period
    const daysSince = Math.floor((new Date().getTime() - new Date(dbPartner.lastPeriodStart).getTime()) / (1000 * 3600 * 24))
    const cycleDay = daysSince % dbPartner.cycleLength
    
    if (cycleDay > dbPartner.cycleLength - 5) {
      isSensitivePhase = true
      cycleMessage = `${dbPartner.name} is currently in their late luteal phase. They might be feeling lower energy or more emotionally sensitive today. Extra patience goes a long way.`
    } else if (cycleDay <= 5) {
      isSensitivePhase = true
      cycleMessage = `${dbPartner.name} is in their menstrual phase. Rest, comfort, and physical support are likely a priority right now.`
    }
  }

  const mood = getMoodLevel(dbPartner.currentMood)
  const isLow = mood.severity === "low"
  const hasUnreadNotification = partnerLoggedToday && activeNotification && !activeNotification.is_read

  return (
    <div className="flex w-full flex-col bg-transparent pb-28 pt-8">
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-5 relative"
      >
        
        <motion.header variants={itemVariants} className="flex items-start justify-between">
          <div>
            <h1 className="font-serif text-2xl text-accent">Supporter Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {profile.name ? `${profile.name}, here's` : "Here's"} how{" "}
              <strong className="text-foreground">{dbPartner.name}</strong> is doing.
            </p>
          </div>

          <div className="relative">
            <button 
              onClick={() => {
                setShowNotifications(!showNotifications)
                if (!showNotifications && hasUnreadNotification) markAsRead()
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${
                showNotifications ? 'bg-secondary border-border' : 'bg-card border-border hover:bg-secondary'
              }`}
            >
              <Bell className="h-5 w-5 text-foreground" />
              {hasUnreadNotification && (
                <span className="absolute right-0 top-0 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-accent-foreground border-2 border-card">1</span>
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-12 z-40 w-80 rounded-2xl border border-border bg-card shadow-xl overflow-hidden origin-top-right"
                >
                  <div className="flex items-center justify-between border-b border-border p-4 bg-secondary/50">
                    <h3 className="text-sm font-semibold text-foreground">Daily Status</h3>
                  </div>
                  
                  <div className="flex flex-col p-4">
                    {!partnerLoggedToday ? (
                      <div className="flex items-start gap-3">
                        <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">
                          <strong className="text-foreground">{dbPartner.name}</strong> has not logged their mood today. 
                        </p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        {activeNotification?.type === 'acute_low' || activeNotification?.type === 'statistical_anomaly' ? (
                          <AlertTriangle className="h-4 w-4 text-accent mt-0.5 flex-shrink-0" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        )}
                        <p className="text-sm text-foreground leading-relaxed">
                          {activeNotification?.message || `${dbPartner.name} has checked in for the day.`}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.header>

        {/* --- NEW: Cycle Sync Insight Banner --- */}
        <AnimatePresence>
          {isSensitivePhase && (
            <motion.div 
              initial={{ opacity: 0, height: 0, scale: 0.95 }}
              animate={{ opacity: 1, height: "auto", scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="overflow-hidden"
            >
              <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm">
                <Sparkles className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div className="flex flex-col gap-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Biological Context</h4>
                  <p className="text-sm leading-relaxed text-foreground/90">{cycleMessage}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Main Mood Score Card with Breathing Orb --- */}
        <motion.div 
          variants={itemVariants}
          className={`relative overflow-hidden rounded-3xl border-2 p-6 shadow-sm transition-colors ${!dbPartner.hasHistory ? "border-border bg-card opacity-80" : isLow ? "border-accent bg-card" : "border-border bg-card"}`}
        >
          {/* NEW: The Background Breathing Orb */}
          {dbPartner.hasHistory && (
            <motion.div
              animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute -right-12 -top-12 h-48 w-48 rounded-full blur-[60px] pointer-events-none ${
                isLow ? "bg-accent/40" : mood.severity === "mid" ? "bg-yellow-500/30" : "bg-primary/40"
              }`}
            />
          )}

          <div className="relative z-10 flex items-start justify-between">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-foreground">{dbPartner.name}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold shadow-sm ${!dbPartner.hasHistory ? "bg-secondary text-muted-foreground" : isLow ? "bg-accent text-accent-foreground" : mood.severity === "mid" ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"}`}>
                  {mood.label}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                <Clock className="h-3 w-3" />
                {dbPartner.hasHistory ? formatDistanceToNow(dbPartner.lastUpdated, { addSuffix: true }) : "No recent logs"}
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <div className="flex items-baseline gap-1">
                <span className={`font-serif text-5xl font-bold tracking-tight ${!dbPartner.hasHistory ? "text-muted-foreground" : isLow ? "text-accent" : "text-primary"}`}>
                  {dbPartner.hasHistory ? dbPartner.currentMood : "-"}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">/ 10</span>
              </div>
              <div className="mt-1">
                {dbPartner.hasHistory && dbPartner.recentLogs.length > 1 && (
                  <TrendIndicator current={dbPartner.currentMood} previous={dbPartner.previousMood} />
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* --- Mood Chart --- */}
        {dbPartner.hasHistory && (
          <motion.div variants={itemVariants}>
            <MoodChart 
              data={dbPartner.chartData} 
              isLocked={dbPartner.recentLogs.length < 3} 
            />
          </motion.div>
        )}

        {/* --- Copilot Card --- */}
        <motion.div variants={itemVariants}>
          <CopilotCard 
            partnerName={dbPartner.name} 
            hasHistory={dbPartner.hasHistory} 
            chartData={dbPartner.chartData}
            latestContext={dbPartner.context}
          />
        </motion.div>

        {/* --- Context Section --- */}
        <motion.section variants={itemVariants} className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{"What's on their mind"}</h3>
          <p className={`text-sm leading-relaxed ${dbPartner.hasHistory && dbPartner.context && !dbPartner.isContextPrivate ? "text-foreground italic" : "text-muted-foreground"}`}>
            {!dbPartner.hasHistory 
              ? "waiting for them to log in..." 
              : dbPartner.isContextPrivate 
                ? "They chose to keep their note private today." 
                : dbPartner.context 
                  ? `"${dbPartner.context}"` 
                  : "No specific context provided today."}
          </p>
        </motion.section>

        {/* --- Primary CTA Button --- */}
        <motion.button 
          variants={itemVariants}
          onClick={() => setReachOutModalOpen(true)} 
          disabled={!dbPartner.hasHistory}
          className={`flex w-full items-center justify-center gap-2 rounded-3xl py-4 text-sm font-semibold shadow-md transition-all ${
            dbPartner.hasHistory 
              ? "bg-primary text-primary-foreground hover:brightness-105 active:scale-[0.98]" 
              : "bg-secondary text-muted-foreground cursor-not-allowed border border-border"
          }`}
        >
          <MessageCircle className="h-5 w-5" />
          Reach Out to {dbPartner.name}
        </motion.button>

        {/* --- Bottom Quote --- */}
        <motion.div variants={itemVariants} className="mt-4 flex flex-col items-center justify-center gap-3 px-4 py-8 text-center opacity-70">
          <Quote className="h-6 w-6 text-muted-foreground/50" />
          <p className="font-serif text-lg text-muted-foreground italic leading-relaxed">
            {quote}
          </p>
        </motion.div>

        <AnimatePresence>
          {reachOutModalOpen && (
            <ReachOutModal 
              partner={dbPartner} 
              setReachOutModalOpen={setReachOutModalOpen} 
              setScreen={setScreen} 
            />
          )}
        </AnimatePresence>

      </motion.div>
    </div>
  )
}