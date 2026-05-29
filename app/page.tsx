"use client"

import { AppProvider, useApp } from "@/lib/app-context"
import { BottomNav } from "@/components/bottom-nav"
import { OnboardingScreen } from "@/components/screens/onboarding-screen"
import { MoodScreen } from "@/components/screens/mood-screen"
import { DashboardScreen } from "@/components/screens/dashboard-screen"
import { SettingsScreen } from "@/components/screens/settings-screen"
import { ChatScreen } from "@/components/screens/chat-screen"
import { GlobalToast } from "@/components/ui/global-toast"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { motion, AnimatePresence } from "framer-motion"
import { BreathingBackground } from "@/components/ui/breathing-background"

function AppLayout() {
  const { screen, setScreen, sessionUser, hasLoggedMoodToday, setHasLoggedMoodToday } = useApp()
  
  const [isVerifying, setIsVerifying] = useState(true)

  // EFFECT 1: Ask the database for the truth on initial load
  useEffect(() => {
    if (!sessionUser) {
      setIsVerifying(false)
      return
    }

    const verifyTodaysMood = async () => {
      // Find the exact start of today in the user's local timezone
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      // Ask Supabase if this user has any logs created today
      const { data } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', sessionUser.id)
        .gte('created_at', startOfToday.toISOString())
        .limit(1)

      const userLoggedToday = Boolean(data && data.length > 0)

      // Tell the global context the truth!
      if (setHasLoggedMoodToday) {
        setHasLoggedMoodToday(userLoggedToday)
      }
      
      // We are done checking, unlock the app
      setIsVerifying(false)
    }

    verifyTodaysMood()
  }, [sessionUser, setHasLoggedMoodToday])

  // EFFECT 2: The Silent Bouncer
  useEffect(() => {
    // Don't make any routing decisions until we finish checking the database
    if (isVerifying || !sessionUser) return 

    // Keep logged-in users off the onboarding screen
    if (screen === "onboarding") {
      setScreen(hasLoggedMoodToday ? "dashboard" : "mood")
    } 
    // The Absolute Fail-Safe Guard (SILENT)
    else if (screen === "dashboard" && hasLoggedMoodToday === false) {
      setScreen("mood")
    }
  }, [screen, hasLoggedMoodToday, isVerifying, sessionUser, setScreen])


  // If the app is still fetching the user or verifying the mood, show a clean background
  if (isVerifying) {
    return <div className="mx-auto min-h-dvh w-full bg-background relative" />
  }

  // If no user is logged in, trap them on Onboarding
  if (!sessionUser) {
    return (
      <div className="mx-auto min-h-dvh w-full bg-background relative">
        <OnboardingScreen />
      </div>
    )
  }

  // The Main App Flow
  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col bg-background relative overflow-hidden">
      
      <BreathingBackground />
      
      <GlobalToast />

      <main className="flex flex-1 flex-col overflow-x-hidden relative">
        
        {/* NEW: The Magic Animation Wrapper */}
        <AnimatePresence mode="wait">
          <motion.div
            key={screen}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex w-full flex-1 flex-col"
          >
            {screen === "mood" && <MoodScreen />}
            {screen === "dashboard" && <DashboardScreen />}
            {screen === "settings" && <SettingsScreen />}
            {screen === "chat" && <ChatScreen />}
          </motion.div>
        </AnimatePresence>
        
      </main>
      
      <BottomNav />
    </div>
  )
}

export default function EmpathiaApp() {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  )
}