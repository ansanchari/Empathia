"use client"

import { useEffect, useState } from "react"
import { supabase } from '@/lib/supabaseClient' 
import { useApp, type PreferredApp } from "@/lib/app-context"
import { motion, Variants, AnimatePresence } from "framer-motion" // <-- ADDED: AnimatePresence
import { useTheme } from "next-themes"
import { 
  Phone, 
  MessageSquare, 
  Check, 
  Save, 
  Shield, 
  Bell, 
  Info,
  Link2Off,
  LogOut,
  User,
  Link2,
  Copy,
  RefreshCw,
  MessageCircle,
  Activity, 
  Calendar,
  Loader2,
  Palette,
  Sun,
  Moon,
  Monitor,
  AlertTriangle
} from "lucide-react"

//Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
}

//Custom Brand Icons
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

const appOptions: { value: PreferredApp; label: string; icon: React.ElementType }[] = [
  { value: "WhatsApp", label: "WhatsApp", icon: WhatsAppIcon },
  { value: "Telegram", label: "Telegram", icon: TelegramIcon },
  { value: "SMS", label: "SMS", icon: MessageCircle },
]

function generateOTP(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let code = ""
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function SettingsScreen() {
  const { profile, updateProfile, setScreen } = useApp() 
  const { theme, setTheme } = useTheme()
  
  const [mounted, setMounted] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [relationship, setRelationship] = useState<any>(null)
  const [partnerCodeInput, setPartnerCodeInput] = useState("")
  const [linking, setLinking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [refreshingOTP, setRefreshingOTP] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  //State to control the Disconnect Modal
  const [showDisconnectModal, setShowDisconnectModal] = useState(false)

  const [trackCycle, setTrackCycle] = useState(profile.trackCycle)
  const [cycleLength, setCycleLength] = useState(profile.cycleLength)
  const [lastPeriodStart, setLastPeriodStart] = useState(profile.lastPeriodStart)
  const shouldShowCycleSync = profile.gender === "Female" || profile.gender === "Non-Binary"

  useEffect(() => {
    setMounted(true)
  }, [])

  const loadSettings = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!user || error) {
      await supabase.auth.signOut()
      setLoading(false)
      window.location.reload()
      return
    }

    const { data: dbProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (dbProfile) {
      updateProfile({
        name: dbProfile.full_name || "",
        preferredApp: (dbProfile.preferred_app as PreferredApp) || "WhatsApp",
        phoneNumber: dbProfile.contact_info || "",
        trackCycle: dbProfile.track_cycle,
        cycleLength: dbProfile.cycle_length,
        lastPeriodStart: dbProfile.last_period_start
      })
      setTrackCycle(dbProfile.track_cycle)
      setCycleLength(dbProfile.cycle_length)
      setLastPeriodStart(dbProfile.last_period_start)
    }

    const { data: rels } = await supabase
      .from('relationships')
      .select('*')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .in('status', ['active', 'pending'])
      .order('status', { ascending: true }) 
    
    let currentRel = rels?.find(r => r.status === 'active') || rels?.find(r => r.status === 'pending')

    setRelationship(currentRel || null)
    setLoading(false)
  }

  useEffect(() => {
    loadSettings()
  }, []) 

  useEffect(() => {
    const channel = supabase
      .channel('settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'relationships' },
        (payload) => {
          if (payload.eventType === 'UPDATE' && payload.new.status === 'active') {
            setShowSuccess(true)
            setTimeout(() => setShowSuccess(false), 5000) 
          }
          loadSettings()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, []) 

  const handleSave = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .update({ 
        full_name: profile.name, 
        contact_info: profile.phoneNumber, 
        preferred_app: profile.preferredApp,
        track_cycle: trackCycle,
        cycle_length: cycleLength,
        last_period_start: lastPeriodStart === "" ? null : lastPeriodStart
      })
      .eq('id', user.id)

    if (error) {
      alert("Error saving: " + error.message)
      return
    }

    updateProfile({ trackCycle, cycleLength, lastPeriodStart })
    
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  //Logic separated from the UI alert
  const executeDisconnect = async () => {
    const { error } = await supabase
      .from('relationships')
      .delete()
      .eq('id', relationship.id)

    if (error) {
      alert("Error disconnecting: " + error.message)
    } else {
      setShowDisconnectModal(false)
      setRelationship(null)
      loadSettings()
    }
  }

  const handleGenerateCode = async () => {
    setRefreshingOTP(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (relationship?.id) {
      await supabase.from('relationships').delete().eq('id', relationship.id)
    }

    const freshCode = generateOTP()
    const { data: newRel } = await supabase
      .from('relationships')
      .insert([{
        user_a_id: user.id,
        invite_code: freshCode,
        status: 'pending'
      }])
      .select()
      .single()

    setRelationship(newRel)
    setRefreshingOTP(false)
  }

  const handleLinkPartner = async () => {
    setLinking(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { data: partnerRel } = await supabase
      .from('relationships')
      .select('*')
      .eq('invite_code', partnerCodeInput)
      .eq('status', 'pending')
      .single()

    if (!partnerRel) {
      alert("Invalid or expired OTP code. Ask your partner to refresh their code.")
      setLinking(false)
      return
    }

    const { error } = await supabase
      .from('relationships')
      .update({ user_b_id: user?.id, status: 'active' })
      .eq('id', partnerRel.id)

    if (error) {
      alert("Error linking: " + error.message)
    } else {
      await supabase
        .from('relationships')
        .delete()
        .eq('user_a_id', user?.id)
        .eq('status', 'pending')
      
      setPartnerCodeInput("")
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 5000)
      
      loadSettings()
    }
    setLinking(false)
  }

  const handleCopyCode = async () => {
    const codeToCopy = relationship?.invite_code || "ERROR"
    await navigator.clipboard.writeText(codeToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload() 
  }

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center p-10 text-muted-foreground animate-pulse bg-background">
        Loading settings...
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent pb-28 pt-8 relative">
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-5 relative"
      >
        <motion.header variants={itemVariants} className="flex flex-col gap-1">
          <button 
            onClick={() => setScreen("dashboard")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground self-start mb-2 transition-colors"
          >
            &larr; Back
          </button>
          <h1 className="font-serif text-2xl text-accent">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Configure your profile and connections.
          </p>
        </motion.header>

        {/* Appearance Section */}
        {mounted && (
          <motion.section variants={itemVariants} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Palette className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
            </div>
            
            <div className="flex rounded-xl border border-border bg-secondary/50 p-1">
              
              <button
                onClick={() => setTheme('light')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                  theme === 'light' 
                    ? 'bg-card text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>

              <button
                onClick={() => setTheme('system')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                  theme === 'system' 
                    ? 'bg-card text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                System
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-semibold transition-all ${
                  theme === 'dark' 
                    ? 'bg-card text-foreground shadow-sm border border-border/50' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-transparent'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              
            </div>
          </motion.section>
        )}

        {/* Profile Name */}
        <motion.section variants={itemVariants} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Display Name</h2>
          </div>
          <input
            type="text"
            placeholder="Your Name"
            value={profile.name}
            onChange={(e) => updateProfile({ name: e.target.value })}
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </motion.section>

        {/* Preferred Messaging App */}
        <motion.section variants={itemVariants} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Preferred Messaging App</h2>
          </div>
          <div className="flex flex-col gap-2">
            {appOptions.map(({ value, label, icon: Icon }) => {
              const isSelected = profile.preferredApp === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateProfile({ preferredApp: value })}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-sm transition-all ${
                    isSelected ? "border-primary bg-primary/5 text-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`flex-1 text-left ${isSelected ? "font-medium" : ""}`}>{label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary" />}
                </button>
              )
            })}
          </div>
        </motion.section>

        {/* Contact Info */}
        <motion.section variants={itemVariants} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Contact Info</h2>
          </div>
          <input
            type="text"
            placeholder={profile.preferredApp === "Telegram" ? "@username" : "+1 (555) 000-0000"}
            value={profile.phoneNumber}
            onChange={(e) => updateProfile({ phoneNumber: e.target.value })}
            className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </motion.section>

        {/* Biological Context Toggle */}
        {shouldShowCycleSync && (
          <motion.section variants={itemVariants} className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Biological Context</h2>
            </div>
            <div className="flex flex-col gap-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={trackCycle}
                  onChange={(e) => setTrackCycle(e.target.checked)}
                  className="mt-1 h-5 w-5 accent-primary rounded border-border"
                />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground text-sm">Enable Cycle Syncing</span>
                  <span className="text-xs text-muted-foreground mt-0.5">Allow the AI to use your phase data for relationship advice.</span>
                </div>
              </label>

              {trackCycle && (
                <div className="flex flex-col gap-4 pt-3 border-t border-border animate-in fade-in slide-in-from-top-2">
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
                        value={lastPeriodStart}
                        onChange={(e) => setLastPeriodStart(e.target.value)}
                        className="w-full bg-background border border-border rounded-xl p-2.5 pl-9 text-sm text-foreground focus:ring-1 focus:ring-primary focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.section>
        )}

        {/* Connection Section */}
        <motion.section variants={itemVariants} className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            {relationship?.status === 'active' ? (
              <Link2Off className="h-4 w-4 text-primary" />
            ) : (
              <Link2 className="h-4 w-4 text-primary" />
            )}
            <h2 className="text-sm font-semibold text-foreground">Connection</h2>
          </div>
          
          {showSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 p-3 text-sm font-semibold text-green-600 dark:text-green-400 animate-in fade-in slide-in-from-top-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              Partner is successfully linked!
            </div>
          )}

          {relationship?.status === 'active' ? (
            <div className="flex flex-col gap-4 animate-in fade-in">
              <div className="rounded-xl border border-border bg-secondary p-4 text-center">
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Shared Invite Code</span>
                <p className="font-mono text-xl font-bold tracking-[0.25em] text-accent mt-1">{relationship.invite_code}</p>
              </div>
              
              <button 
                //Trigger the in-app modal instead of browser alert
                onClick={() => setShowDisconnectModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/5 py-3 text-sm font-semibold text-accent transition-all hover:bg-accent/10 active:scale-[0.98]"
              >
                <Link2Off className="h-4 w-4" />
                Disconnect Partner
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-5 animate-in fade-in">
              
              {relationship?.status === 'pending' ? (
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Your One-Time Code</span>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-1 items-center justify-center rounded-xl bg-secondary px-4 py-3">
                      <span className="font-mono text-lg font-bold tracking-[0.25em] text-accent mt-0.5">
                        {relationship?.invite_code || "......"}
                      </span>
                    </div>
                    <button 
                      onClick={handleGenerateCode}
                      disabled={refreshingOTP}
                      className="flex h-[52px] w-[52px] items-center justify-center rounded-xl border border-border bg-card text-muted-foreground shadow-sm transition-all hover:bg-secondary hover:text-foreground active:scale-95 disabled:opacity-50"
                    >
                      <RefreshCw className={`h-5 w-5 ${refreshingOTP ? 'animate-spin' : ''}`} />
                    </button>
                    <button 
                      onClick={handleCopyCode}
                      className="flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-all active:scale-95"
                    >
                      {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Share this temporary code to allow a partner to connect with you.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-dashed border-border p-5 text-center">
                  <p className="text-sm text-foreground font-medium">No active connection</p>
                  <p className="text-xs text-muted-foreground mb-2">Generate a code to invite your partner, or enter their code below.</p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={refreshingOTP}
                    className="mx-auto flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all active:scale-95 disabled:opacity-50"
                  >
                     {refreshingOTP ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
                     Generate Invite Code
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4">
                <hr className="flex-1 border-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase">OR</span>
                <hr className="flex-1 border-border" />
              </div>

<div className="flex flex-col gap-2">
  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Enter Partner Code</span>
  <div className="flex flex-col gap-3">
    <input
      type="text"
      placeholder="e.g. ABCD12"
      maxLength={6}
      value={partnerCodeInput}
      onChange={(e) => setPartnerCodeInput(e.target.value.toUpperCase())}
      className="w-full rounded-xl border border-border bg-background px-4 py-3 text-center font-mono text-lg tracking-[0.25em] text-foreground placeholder:text-muted-foreground placeholder:tracking-normal placeholder:font-sans placeholder:text-sm focus:outline-none focus:ring-2 focus:ring-ring"
    />
    <button
      onClick={handleLinkPartner}
      disabled={linking || partnerCodeInput.length !== 6}
      className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-105 active:scale-95 disabled:opacity-50"
    >
      {linking ? "Linking..." : "Link Partner"}
    </button>
  </div>
</div>
            </div>
          )}
        </motion.section>

        {/* Info Cards */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Privacy</span>
              <span className="text-xs text-muted-foreground">
                Your contact info is only visible to your linked partner.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <Bell className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">Notifications</span>
              <span className="text-xs text-muted-foreground">
                {"You'll"} be alerted when your partner logs a mood below 4.
              </span>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-foreground">About Empathia</span>
              <span className="text-xs text-muted-foreground">
                Empathia helps you stay emotionally connected with those who
                matter most.
              </span>
            </div>
          </div>
        </motion.div>

        {/* Save & Log Out Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col gap-3 mt-2">
          <button
            onClick={handleSave}
            className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-sm font-semibold shadow-md transition-all active:scale-[0.98] ${
              saved ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground hover:brightness-105"
            }`}
          >
            {saved ? <><Check className="h-4 w-4" />Saved</> : <><Save className="h-4 w-4" />Save Settings</>}
          </button>

          <button 
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-4 text-sm font-semibold text-muted-foreground shadow-sm transition-all hover:bg-secondary active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </motion.div>

      </motion.div>

      <AnimatePresence>
        {showDisconnectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/30 p-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
              className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
                  <AlertTriangle className="h-7 w-7 text-destructive" />
                </div>
                <h3 className="font-serif text-xl font-semibold text-foreground">Disconnect Partner?</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Are you sure you want to do this? Your partner will immediately lose access to your updates and you will no longer be synced.
                </p>
              </div>
              
              <div className="mt-8 flex flex-col gap-3">
                <button
                  onClick={executeDisconnect}
                  className="flex w-full items-center justify-center rounded-2xl bg-destructive py-3.5 text-sm font-semibold text-destructive-foreground shadow-md transition-all hover:brightness-105 active:scale-[0.98]"
                >
                  Yes, Disconnect
                </button>
                <button
                  onClick={() => setShowDisconnectModal(false)}
                  className="flex w-full items-center justify-center rounded-2xl bg-secondary py-3.5 text-sm font-semibold text-foreground transition-all hover:brightness-95 active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}