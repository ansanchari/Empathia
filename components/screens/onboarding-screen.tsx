"use client"

import { Logo } from "@/components/ui/logo"

import { useState } from "react"
import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabaseClient"
import { ChevronRight, Loader2, Mail, Lock, User, Activity, Calendar, Link2 } from "lucide-react"

export function OnboardingScreen() {
  const { updateProfile, setScreen, setSessionUser } = useApp()
  const [isLoginMode, setIsLoginMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [gender, setGender] = useState<"Male" | "Female" | "Non-Binary" | "">("")
  const [trackCycle, setTrackCycle] = useState(false)
  const [cycleLength, setCycleLength] = useState(28)
  const [lastPeriodStart, setLastPeriodStart] = useState("")
  
  //Optional Partner Code State
  const [partnerCodeInput, setPartnerCodeInput] = useState("")

  const shouldShowCycleSync = gender === "Female" || gender === "Non-Binary"

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (isLoginMode) {
        //THE EXPLICIT LOGIN FLOW
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        
        if (signInError) throw signInError
        if (!signInData.user) throw new Error("Login failed.")

        // Fetch their existing profile data to hydrate the app state
        const { data: dbProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signInData.user.id)
          .single()

        if (!profileError && dbProfile) {
          updateProfile({
            name: dbProfile.full_name || "",
            gender: dbProfile.gender || "",
            trackCycle: dbProfile.track_cycle || false,
            cycleLength: dbProfile.cycle_length || 28,
            lastPeriodStart: dbProfile.last_period_start || "",
            phoneNumber: dbProfile.contact_info || "",
            preferredApp: dbProfile.preferred_app || "WhatsApp"
          })
        }

        setSessionUser(signInData.user)
        setScreen("dashboard")

      } else {
        //EXPLICIT SIGN UP FLOW
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name }
          }
        })

        if (signUpError) throw signUpError
        if (!signUpData.user) throw new Error("Sign up failed.")

        // Save their new biological profile data
        const safeLastPeriod = lastPeriodStart === "" ? null : lastPeriodStart

        const { error: dbError } = await supabase
          .from('profiles')
          .upsert({
            id: signUpData.user.id,
            full_name: name,
            gender: gender,
            track_cycle: trackCycle,
            cycle_length: cycleLength,
            last_period_start: safeLastPeriod
          })

        if (dbError) throw dbError

        if (partnerCodeInput.length === 6) {
          const { data: partnerRel } = await supabase
            .from('relationships')
            .select('*')
            .eq('invite_code', partnerCodeInput)
            .eq('status', 'pending')
            .single()

          if (partnerRel) {
            await supabase
              .from('relationships')
              .update({ user_b_id: signUpData.user.id, status: 'active' })
              .eq('id', partnerRel.id)
          }
        }

        // Update local app state
        updateProfile({ name, gender, trackCycle, cycleLength, lastPeriodStart: safeLastPeriod || "" })
        setSessionUser(signUpData.user)
        setScreen("mood")
      }
      
    } catch (error: any) {
      alert("Authentication Error: " + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4">
        
        {/* Header */}
        <div className="-mb-5 text-center">
          <Logo size={260} />
          <p className="text-sm text-muted-foreground">
            {isLoginMode ? "Welcome back." : " "}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          
          {/* Email & Password (Always Visible) */}
          <div className="flex flex-col gap-4 bg-card p-5 rounded-3xl border border-border shadow-sm">
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 chars)"
                className="w-full rounded-2xl border border-border bg-background py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {/* Profile Setup (Only visible during Sign Up) */}
          {!isLoginMode && (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-4">
              
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  required={!isLoginMode}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-2xl border border-border bg-card shadow-sm py-3 pl-12 pr-4 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex flex-col gap-3">
                <label className="text-sm font-semibold text-foreground px-1">Gender</label>
                <div className="grid grid-cols-3 gap-2">
                  {["Male", "Female", "Non-Binary"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => {
                        setGender(g as any)
                        if (g === "Male") setTrackCycle(false)
                      }}
                      className={`rounded-2xl py-3 text-sm transition-all border ${
                        gender === g
                          ? "bg-primary/10 border-primary text-primary font-semibold"
                          : "bg-card border-border text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {shouldShowCycleSync && (
                <div className="flex flex-col gap-4 bg-card border border-border rounded-3xl p-5 shadow-sm animate-in fade-in">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={trackCycle}
                      onChange={(e) => setTrackCycle(e.target.checked)}
                      className="mt-1 h-5 w-5 accent-primary rounded border-border"
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground flex items-center gap-2">
                        Enable Cycle Syncing <Activity className="h-4 w-4 text-red-500" />
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        Allow the AI to use your phase data to give your partner better relationship advice.
                      </span>
                    </div>
                  </label>

                  {trackCycle && (
                    <div className="flex flex-col gap-4 pt-4 border-t border-border animate-in fade-in">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">Average Cycle Length</label>
                        <div className="flex items-center gap-3">
                          <input 
                            type="range" 
                            min="21" max="35" 
                            value={cycleLength}
                            onChange={(e) => setCycleLength(parseInt(e.target.value))}
                            className="flex-1 accent-primary"
                          />
                          <span className="font-mono bg-background px-3 py-1 rounded-lg border border-border text-foreground text-sm">
                            {cycleLength} days
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-foreground">First day of last period</label>
                        <div className="relative">
                          <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                          <input 
                            type="date"
                            required={trackCycle}
                            value={lastPeriodStart}
                            onChange={(e) => setLastPeriodStart(e.target.value)}
                            className="w-full bg-background border border-border rounded-xl p-2.5 pl-9 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/*Optional Partner Code */}
              <div className="flex flex-col gap-2 mt-2 animate-in fade-in">
                <label className="text-sm font-semibold text-foreground px-1">Partner Code (Optional)</label>
                <div className="relative">
                  <Link2 className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    maxLength={6}
                    value={partnerCodeInput}
                    onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
                    placeholder="e.g. ABCD12"
                    className="w-full rounded-2xl border border-border bg-card shadow-sm py-3 pl-12 pr-4 text-sm font-mono tracking-widest text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <p className="text-xs text-muted-foreground px-1">Have an invite code? Enter it here to link instantly.</p>
              </div>

            </div>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!isLoginMode && (!name || !gender))}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-3xl bg-primary py-4 text-sm font-semibold text-primary-foreground shadow-md transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isLoginMode ? "Sign In" : "Enter Empathia"}
                <ChevronRight className="h-5 w-5" />
              </>
            )}
          </button>
        </form>

        {/* The Toggle Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode)
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLoginMode 
              ? "Don't have an account? Sign up." 
              : "Already have an account? Sign in."}
          </button>
        </div>

      </div>
    </div>
  )
}