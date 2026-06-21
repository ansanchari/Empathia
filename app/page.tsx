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

//import { EmpathiaDebugger } from "@/components/EmpathiaDebugger"

function AppLayout() {
  const { screen, setScreen, sessionUser, hasLoggedMoodToday, setHasLoggedMoodToday } = useApp()
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    if (!sessionUser) {
      setIsVerifying(false)
      return
    }

    const verifyTodaysMood = async () => {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)

      const { data } = await supabase
        .from('mood_logs')
        .select('id')
        .eq('user_id', sessionUser.id)
        .gte('created_at', startOfToday.toISOString())
        .limit(1)

      const userLoggedToday = Boolean(data && data.length > 0)

      if (setHasLoggedMoodToday) {
        setHasLoggedMoodToday(userLoggedToday)
      }
      
      setIsVerifying(false)
    }

    verifyTodaysMood()
  }, [sessionUser, setHasLoggedMoodToday])

  useEffect(() => {
    if (isVerifying || !sessionUser) return 

    if (screen === "onboarding") {
      setScreen(hasLoggedMoodToday ? "dashboard" : "mood")
    } 
    else if (screen === "dashboard" && hasLoggedMoodToday === false) {
      setScreen("mood")
    }
  }, [screen, hasLoggedMoodToday, isVerifying, sessionUser, setScreen])


  if (isVerifying) {
    return <div className="mx-auto min-h-dvh w-full bg-background relative" />
  }

  if (!sessionUser) {
    return (
      <div className="mx-auto min-h-dvh w-full bg-background relative">
        <OnboardingScreen />
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full flex-col bg-background relative overflow-hidden">
      
      <BreathingBackground />
      <GlobalToast />

      <main className="flex flex-1 flex-col overflow-x-hidden relative">
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
       {/*<EmpathiaDebugger /> */}
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