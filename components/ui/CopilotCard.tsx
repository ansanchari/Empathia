"use client"

import { useState } from "react"
import { Sparkles, Loader2, BrainCircuit } from "lucide-react"
import { supabase } from '@/lib/supabaseClient'

interface CopilotProps {
  partnerName: string;
  hasHistory: boolean;
  chartData: any;
  latestContext: string;
}

export function CopilotCard({ partnerName, hasHistory, chartData, latestContext }: CopilotProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)

  const handleGenerate = async () => {
    if (!hasConsented) return; 
    setIsGenerating(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const response = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ 
          partnerName, 
          chartData, 
          latestContext,
          userId: session?.user?.id 
        })
      })


      const data = await response.json()
      
      if (data.insight) {
        setInsight(data.insight)
      } else {
        setInsight("I'm sorry, I couldn't generate an insight right now. Please try again later.")
      }
    } catch (error) {
      setInsight("Network error. Make sure your environment variables are configured correctly.")
    } finally {
      setIsGenerating(false)
    }
  }

  if (!hasHistory) return null

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-card to-secondary/20 p-5 shadow-sm">
      <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
      
      <div className="relative z-10 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <h3 className="font-serif text-lg font-medium text-foreground">AI Analysis</h3>
        </div>
      </div>

      <div className="relative z-10 mt-4">
        {!insight ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/50 py-8">
            <BrainCircuit className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-center text-sm text-muted-foreground px-4">
              AI can analyze {partnerName}'s recent mood trends and context notes to provide personalized support advice.
            </p>
            
            <label className="mt-3 flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors px-4">
              <input 
                type="checkbox" 
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                className="accent-primary h-3.5 w-3.5 rounded border-border cursor-pointer flex-shrink-0"
              />
              <span className="leading-snug">
                I consent to securely sharing this anonymous data with AI.
              </span>
            </label>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !hasConsented}
              className="mt-2 flex items-center gap-2 rounded-full bg-foreground px-5 py-2 text-xs font-semibold text-background transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {isGenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {isGenerating ? "Analyzing Patterns..." : "Generate AI Insight"}
            </button>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-2 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm leading-relaxed text-foreground">
              {insight}
            </p>
            <div className="mt-3 flex justify-end">
              <button 
                onClick={() => setInsight(null)}
                className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Clear Insight
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}