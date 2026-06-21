import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextResponse } from "next/server"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string)

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text) return NextResponse.json({ embedding: null })

    const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" })
    const result = await model.embedContent(text)
    
    return NextResponse.json({ embedding: result.embedding.values })
  } catch (error) {
    console.error("Embedding Error:", error)
    return NextResponse.json({ error: "Failed to generate embedding" }, { status: 500 })
  }
}