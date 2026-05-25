import { GoogleGenerativeAI } from "@google/generative-ai"
import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)

// --- NEW: The Biological Math Engine ---
function calculateMenstrualPhase(lastPeriodStart: string, cycleLength: number): string {
  if (!lastPeriodStart || !cycleLength) return ""
  
  const start = new Date(lastPeriodStart)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - start.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
  
  // Find where they are in their current cycle loop
  const currentDay = (diffDays % cycleLength) + 1
  
  if (currentDay >= 1 && currentDay <= 5) return "Menstrual Phase (Energy is likely lowest, cravings or physical discomfort common. Needs physical comfort and rest.)"
  if (currentDay >= 6 && currentDay <= 13) return "Follicular Phase (Energy is rising, mood is generally upbeat and creative.)"
  if (currentDay >= 14 && currentDay <= 16) return "Ovulatory Phase (Peak energy, highly communicative and social.)"
  return "Luteal Phase (Energy is winding down, might experience PMS symptoms like irritability or anxiety. Needs deep patience, grace, and gentle support.)"
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization')

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL as string,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
      { global: { headers: { Authorization: authHeader || '' } } }
    )

    const { data: { user } } = await supabase.auth.getUser()
    const loggedInUserId = user?.id

    if (!loggedInUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { chartData, latestContext } = await req.json()

    // 1. Find the Partner ID
    const { data: relationship } = await supabase
      .from('relationships')
      .select('user_a_id, user_b_id')
      .or(`user_a_id.eq.${loggedInUserId},user_b_id.eq.${loggedInUserId}`)
      .eq('status', 'active')
      .single()

    let partnerId = null
    if (relationship) {
      partnerId = relationship.user_a_id === loggedInUserId ? relationship.user_b_id : relationship.user_a_id
    }

    let historicalContext = ""
    let bioContext = "" // --- NEW: Biological Context Variable ---
    
    if (partnerId) {
      // --- NEW: Fetch Partner's Biological Profile ---
      const { data: partnerProfile } = await supabase
        .from('profiles')
        .select('track_cycle, cycle_length, last_period_start')
        .eq('id', partnerId)
        .single()

      if (partnerProfile?.track_cycle && partnerProfile.last_period_start) {
        const phase = calculateMenstrualPhase(partnerProfile.last_period_start, partnerProfile.cycle_length)
        bioContext = `
        CRITICAL BIOLOGICAL CONTEXT: 
        The partner is currently in their ${phase}. 
        Use this biological context to suggest highly empathetic, phase-appropriate support mechanisms. 
        STRICT RULE: You MUST NEVER use this biological data to dismiss, invalidate, or belittle their psychological feelings (e.g., NEVER say "they are just hormonal"). Use it ONLY to inform how the user can better support their physical and emotional needs today.
        `
      }

      // --- EXISTING RAG SEARCH ---
      if (latestContext) {
        const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" })
        const embedResult = await embedModel.embedContent(latestContext)
        const queryEmbedding = embedResult.embedding.values

        const { data: similarLogs, error } = await supabase.rpc('match_mood_logs', {
          query_embedding: queryEmbedding,
          match_threshold: 0.7, 
          match_count: 3,
          p_user_id: partnerId 
        })

        if (!error && similarLogs && similarLogs.length > 0) {
          historicalContext = `
          HISTORICAL PSYCHOLOGICAL CONTEXT:
          The partner has felt similarly in the past. Here are previous logs that match their current state:
          ${similarLogs.map((log: any) => `- Past Score: ${log.score}/10, Context: "${log.context}"`).join('\n')}
          `
        }
      }
    }

    const sanitizedData = chartData?.map((log: any) => ({ day: log.day, score: log.score })) || []

    // --- UPDATED: The prompt now includes the bioContext ---
    const prompt = `
      You are an empathetic, insightful relationship copilot built into a mood-tracking app. 
      The user's partner (Alias: "The Partner") has logged the following recent mood scores out of 10:
      ${JSON.stringify(sanitizedData)}
      
      Their most recent text context note was: "${latestContext || "No note provided."}"
      
      ${historicalContext}
      ${bioContext}
      
      Based on this data, provide a short, actionable, and gentle suggestion (2 to 3 sentences maximum) on how the user can best support their partner today. 
      If there is historical context provided, reference it subtly. 
      If biological context is provided, tailor your actionable advice to support that specific cycle phase.
      Do not use the partner's real name. Speak directly to the user.
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    const result = await model.generateContent(prompt)
    
    return NextResponse.json({ insight: result.response.text() })

  } catch (error) {
    console.error("AI Generation Error:", error)
    return NextResponse.json({ error: "Failed to generate insight." }, { status: 500 })
  }
}