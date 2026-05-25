"use client"

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Lock } from "lucide-react"

interface MoodData {
  day: string;
  score: number;
}

// We keep the mock data inside the component to use as the "blurred background"
const demoData = [
  { day: "Mon", score: 4 },
  { day: "Tue", score: 6 },
  { day: "Wed", score: 5 },
  { day: "Thu", score: 8 },
  { day: "Fri", score: 9 },
  { day: "Sat", score: 7 },
  { day: "Sun", score: 8 },
]

// We add a 'locked' boolean to the props
export function MoodChart({ data, isLocked = false }: { data: MoodData[], isLocked?: boolean }) {
  // If locked, we feed the chart the demo data so it draws a pretty curve to blur
  const chartData = isLocked ? demoData : data

  return (
    <div className="relative h-[250px] w-full bg-card rounded-2xl border border-border p-4 shadow-sm overflow-hidden">
      <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-4">7-Day Mood Trend</h3>
      
      {/* The Chart Container - We apply a blur if it's locked! */}
      <div className={`w-full h-[calc(100%-2rem)] transition-all duration-500 ${isLocked ? "blur-[2px] opacity-70" : ""}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} dy={10} />
            <YAxis domain={[1, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
            {!isLocked && (
              <Tooltip 
                contentStyle={{ backgroundColor: "var(--background)", borderRadius: "8px", border: "1px solid var(--border)", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                itemStyle={{ color: "var(--foreground)", fontWeight: "bold" }}
                cursor={{ stroke: "var(--muted)", strokeWidth: 1, strokeDasharray: "4 4" }}
              />
            )}
            <Area type="monotone" dataKey="score" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" activeDot={!isLocked ? { r: 6, strokeWidth: 0, fill: "#8b5cf6" } : false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* The Glassmorphism Overlay (Only renders if locked) */}
      {isLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/10 backdrop-blur-[1px]">
          <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-background/80 px-6 py-4 shadow-lg backdrop-blur-md">
            <Lock className="h-5 w-5 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-semibold text-foreground">Not Enough Data</p>
              <p className="text-xs text-muted-foreground mt-0.5">Need at least 3 logs to generate a trend.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}