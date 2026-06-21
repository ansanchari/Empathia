"use client"

import { useState } from "react"
import { useApp, type Screen } from "@/lib/app-context"
import { SmilePlus, LayoutDashboard, MessageCircle, Settings, AlertCircle } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const navItems: { screen: Screen; label: string; icon: any }[] = [
  { screen: "mood", label: "Mood", icon: SmilePlus },
  { screen: "dashboard", label: "Support", icon: LayoutDashboard },
  { screen: "chat", label: "Chat", icon: MessageCircle },
  { screen: "settings", label: "Settings", icon: Settings },
]

export function BottomNav() {
  const { screen, setScreen, hasLoggedMoodToday } = useApp()
  const [showWarning, setShowWarning] = useState(false)

  const handleNavigation = (targetScreen: Screen) => {
    if (targetScreen === "dashboard" && hasLoggedMoodToday === false) {
      setShowWarning(true)
      
      setTimeout(() => {
        setShowWarning(false)
      }, 3000)
      
      setScreen("mood")
      return
    }
    
    setScreen(targetScreen)
  }

  return (
    <>
      <AnimatePresence>
        {showWarning && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="fixed bottom-[88px] left-0 right-0 z-50 mx-auto flex w-[90%] max-w-sm items-center gap-3 rounded-2xl bg-destructive px-4 py-3 text-destructive-foreground shadow-lg backdrop-blur-md"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">
              Please log your own mood today before checking on your partner.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 z-50 flex w-full justify-center border-t border-border bg-card/90 pb-safe backdrop-blur-md"
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="flex w-full max-w-4xl items-center justify-around px-2 py-2">
          {navItems.map(({ screen: s, label, icon: Icon }) => {
            const isActive = screen === s
            return (
              <motion.button
                key={s}
                onClick={() => handleNavigation(s)}
                whileTap={{ scale: 0.85 }}
                className={`relative flex min-w-[72px] flex-col items-center gap-1 rounded-xl px-2 py-2 transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                aria-current={isActive ? "page" : undefined}
                aria-label={label}
              >
                
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-active-pill"
                    className="absolute inset-0 z-0 rounded-xl bg-primary/10"
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  />
                )}

                <div className="relative z-10 flex flex-col items-center gap-0.5">
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[11px] font-medium">{label}</span>
                </div>
                
              </motion.button>
            )
          })}
        </div>
      </nav>
    </>
  )
}