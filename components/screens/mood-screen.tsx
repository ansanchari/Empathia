"use client"


import { useState, useEffect } from "react"
import { supabase } from '@/lib/supabaseClient' 
import { useApp } from "@/lib/app-context"
import { EyeOff, Eye, Send, Smile, Frown, Meh, Loader2, Plus, Check, MessageSquare, Mic, MicOff } from "lucide-react"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { motion, Variants, AnimatePresence } from "framer-motion"

//Animation Variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 }
  }
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, y: 0,
    transition: { type: "spring", stiffness: 300, damping: 25 }
  }
}

const NEGATIVE_TAGS = [
  "Work Stress", "Poor Sleep", "Health / Illness", 
  "Family Dynamics", "Financial Stress", "Feeling Overwhelmed"
]

const NEUTRAL_TAGS = [
  "Work Routine", "Sleep", "Health", 
  "Family & Friends", "Finances", "Daily Chores"
]

const POSITIVE_TAGS = [
  "Great Sleep", "Quality Time", "Career Success", 
  "Good Workout", "Relaxing Day", "Feeling Productive"
]

const moodLabels: Record<number, { label: string; color: string }> = {
  1: { label: "Very Low", color: "#6366F1" },
  2: { label: "Low", color: "#818CF8" },
  3: { label: "Down", color: "#A5B4FC" },
  4: { label: "Below Average", color: "#94A3B8" },
  5: { label: "Neutral", color: "#64748B" },
  6: { label: "Okay", color: "#475569" },
  7: { label: "Good", color: "#38BDF8" },
  8: { label: "Great", color: "#0EA5E9" },
  9: { label: "Wonderful", color: "#0284C7" },
  10: { label: "Excellent", color: "#0369A1" },
}

function getMoodIcon(score: number) {
  if (score <= 3) return <Frown className="h-12 w-12" />
  if (score <= 6) return <Meh className="h-12 w-12" />
  return <Smile className="h-12 w-12" />
}

function getMoodKey(score: number) {
  if (score <= 3) return 'frown'
  if (score <= 6) return 'meh'
  return 'smile'
}

export function MoodScreen() {
  const { addMoodEntry, profile, setScreen, setHasLoggedMoodToday } = useApp()
  const [score, setScore] = useState(5)
  const [context, setContext] = useState("")
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition()
  const [baseContext, setBaseContext] = useState("")
  
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showCustom, setShowCustom] = useState(false)

  const moodInfo = moodLabels[score]
  const currentTags = score >= 7 ? POSITIVE_TAGS : score <= 4 ? NEGATIVE_TAGS : NEUTRAL_TAGS

  useEffect(() => {
    if (isListening) {
      setContext(baseContext + (baseContext && transcript ? " " : "") + transcript)
    }
  }, [transcript, isListening, baseContext])

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      setBaseContext(context) 
      startListening()
      setShowCustom(true) 
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      alert("Authentication error.")
      setIsSubmitting(false)
      return
    }

    const tagsString = selectedTags.join(", ")
    let finalContextString = ""
    if (tagsString && context) finalContextString = `${tagsString}. ${context}`
    else if (tagsString) finalContextString = tagsString
    else if (context) finalContextString = context

    let embedding = null
    if (finalContextString) {
      try {
        const embedRes = await fetch('/api/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: finalContextString })
        })
        const embedData = await embedRes.json()
        embedding = embedData.embedding
      } catch (e) {
        console.error("Failed to generate embedding, saving without it.", e)
      }
    }

    const { error: dbError } = await supabase
      .from('mood_logs')
      .insert([
        { 
          user_id: user.id, 
          score: score,
          context: finalContextString,
          is_private: isPrivate,
          embedding: embedding 
        }
      ])

    if (dbError) {
      alert("Error saving mood: " + dbError.message)
      setIsSubmitting(false)
      return
    }

    setHasLoggedMoodToday(true)
    addMoodEntry({ score, context: finalContextString, isPrivate, timestamp: new Date() })
    setSubmitted(true)
    setIsSubmitting(false)
  }

  useEffect(() => {
    if (submitted) {
      const timer = setTimeout(() => {
        setSubmitted(false)
        setContext("")
        setBaseContext("")
        setSelectedTags([]) 
        setShowCustom(false) 
        setScreen("dashboard")
      }, 1800)
      
      return () => clearTimeout(timer) 
    }
  }, [submitted, setScreen])

  if (submitted) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-transparent pb-28 pt-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-5 px-5"
        >
          <motion.div 
            animate={{ scale: [1, 1.1, 1], rotate: [0, 10, -10, 0] }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
            className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 text-primary shadow-[0_0_40px_rgba(var(--primary),0.3)]"
          >
            <Smile className="h-12 w-12" />
          </motion.div>
          <div className="text-center">
            <h2 className="font-serif text-3xl font-medium text-accent">Mood Logged</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {profile.name ? `Thank you, ${profile.name}.` : "Thank you."} Your
              feelings matter.
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-transparent pb-28 pt-8">
      
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-5 relative"
      >
        
        {/* Header */}
        <motion.header variants={itemVariants} className="text-center mt-2">
          <h1 className="font-serif text-3xl font-medium text-accent">How are you feeling?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Take a moment to check in with yourself.
          </p>
        </motion.header>

        {/*Dynamic Breathing Mood Card */}
        <motion.div 
          variants={itemVariants} 
          animate={{ 
            boxShadow: `0px 10px 40px -15px ${moodInfo.color}60`,
            borderColor: `${moodInfo.color}40`
          }}
          className="flex flex-col items-center gap-3 rounded-[2rem] border-2 bg-card/80 p-8 shadow-xl backdrop-blur-xl transition-colors duration-500 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-card pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-secondary shadow-inner">
              <AnimatePresence mode="wait">
                <motion.div
                  key={getMoodKey(score)}
                  initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  exit={{ scale: 0.5, opacity: 0, rotate: 30 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  style={{ color: moodInfo.color }}
                >
                  {getMoodIcon(score)}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="flex flex-col items-center mt-2">
              <div className="flex items-baseline gap-2">
                <motion.span
                  key={score}
                  initial={{ y: -10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className="font-serif text-6xl font-bold tracking-tighter"
                  style={{ color: moodInfo.color }}
                >
                  {score}
                </motion.span>
                <span className="text-lg font-medium text-muted-foreground">/ 10</span>
              </div>
              <motion.span
                key={moodInfo.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm font-bold uppercase tracking-widest mt-1"
                style={{ color: moodInfo.color }}
              >
                {moodInfo.label}
              </motion.span>
            </div>
          </div>
        </motion.div>

        {/* Vertical Slider */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4 px-2">
          <div className="relative h-4 w-full rounded-full bg-secondary border border-border shadow-inner">
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-all duration-300 ease-out"
              style={{ 
                width: `${((score - 1) / 9) * 100}%`,
                backgroundColor: moodInfo.color 
              }}
            />
            <input
              id="mood-slider"
              type="range"
              min={1}
              max={10}
              step={1}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="absolute inset-0 h-4 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-thumb]:h-8 [&::-webkit-slider-thumb]:w-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-card [&::-webkit-slider-thumb]:shadow-xl [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-foreground [&::-moz-range-thumb]:h-8 [&::-moz-range-thumb]:w-8 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-card [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-foreground [&::-moz-range-thumb]:shadow-xl transition-all"
              aria-label={`Mood score: ${score} out of 10`}
            />
          </div>
          <div className="flex justify-between px-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            <span>Low</span>
            <span>Neutral</span>
            <span>High</span>
          </div>
        </motion.div>

        {/* Context Area */}
        <motion.section variants={itemVariants} className="flex flex-col gap-4 mt-2">
          <div className="flex items-end justify-between border-b border-border pb-3">
            <div className="flex flex-col">
              <h3 className="text-sm font-semibold text-foreground">What's contributing to this?</h3>
            </div>
            
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all shadow-sm border ${
                isPrivate
                  ? "bg-accent/15 text-accent border-accent/30"
                  : "bg-card text-muted-foreground border-border hover:bg-secondary"
              }`}
            >
              {isPrivate ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              {isPrivate ? "Private" : "Shared"}
            </button>
          </div>

          {/*The Quick Chips Grid with Tactile Feedback */}
          <div className="flex flex-wrap gap-2.5">
            {currentTags.map(tag => {
              const isSelected = selectedTags.includes(tag)
              return (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                    isSelected 
                      ? "border-primary bg-primary/10 text-primary shadow-sm" 
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" />}
                  {tag}
                </motion.button>
              )
            })}
            
            <motion.button
              whileTap={{ scale: 0.92 }}
              type="button"
              onClick={() => setShowCustom(!showCustom)}
              className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-colors ${
                showCustom || context.length > 0
                  ? "border-foreground bg-foreground text-background shadow-sm" 
                  : "border-dashed border-border/70 bg-transparent text-muted-foreground hover:bg-secondary"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              Other
            </motion.button>

            {isSupported && (
              <motion.button
                whileTap={{ scale: 0.92 }}
                type="button"
                onClick={toggleListening}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition-all relative ${
                  isListening
                    ? "border-red-500 bg-red-500/10 text-red-500 shadow-sm"
                    : "border-dashed border-border/70 bg-transparent text-muted-foreground hover:bg-secondary"
                }`}
              >
                {/* Pulsing Aura for active listening */}
                {isListening && (
                  <span className="absolute inset-0 rounded-full bg-red-500/20 animate-ping" />
                )}
                {isListening ? <MicOff className="h-3.5 w-3.5 relative z-10" /> : <Mic className="h-3.5 w-3.5" />}
                <span className="relative z-10">{isListening ? "Listening..." : "Voice"}</span>
              </motion.button>
            )}
          </div>

          {/* The Custom Text Area */}
          <AnimatePresence>
            {(showCustom || context.length > 0 || isListening) && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <div className={`relative transition-all duration-300 rounded-[1.25rem] bg-card border ${isListening ? "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]" : "border-border shadow-sm"}`}>
                  <MessageSquare className={`absolute left-4 top-4 h-5 w-5 transition-colors ${isListening ? "text-red-500" : "text-muted-foreground"}`} />
                  <textarea
                    id="mood-context"
                    placeholder={isListening ? "I'm listening... speak your mind." : "Type your own context here..."}
                    value={context}
                    onChange={(e) => {
                      setContext(e.target.value)
                      setBaseContext(e.target.value)
                    }}
                    rows={4}
                    className="w-full resize-none bg-transparent p-4 pl-12 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
                {!isSupported && (
                   <p className="text-[10px] text-muted-foreground text-right mt-1.5 px-2">
                     Voice logging is not supported in this browser.
                   </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {isPrivate && (
            <motion.p 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-xs font-medium text-muted-foreground px-2"
            >
              This note will be hidden from your partner. Only your mood score will be shared.
            </motion.p>
          )}
        </motion.section>

        {/* Submit Button */}
        <motion.button
          variants={itemVariants}
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 mt-4 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" strokeWidth={2.5} />
          )}
          {isSubmitting ? "Saving Entry..." : "Log Mood"}
        </motion.button>

      </motion.div>
    </div>
  )
}