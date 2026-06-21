import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createClient } from "@supabase/supabase-js";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const globalLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"), 
  analytics: false,
});

const chatLimiter = new Ratelimit({
  redis: redis,
  limiter: Ratelimit.slidingWindow(60, "1 m"), 
  analytics: false,
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "127.0.0.1";
    const { success: ipSuccess, reset: ipReset } = await globalLimiter.limit(`ip_${ip}`);
    
    if (!ipSuccess) {
      return NextResponse.json(
        { error: "Too many requests from this IP. Please slow down." }, 
        { status: 429, headers: { "Retry-After": ipReset.toString() } }
      );
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const secureUserId = user.id;

    const body = await req.json();
    const { relationship_id, content } = body; 

    if (
      !relationship_id || 
      typeof content !== "string" || 
      content.trim().length === 0 || 
      content.length > 2000
    ) {
      return NextResponse.json({ error: "Invalid payload or message too long (Max 2000 chars)" }, { status: 400 });
    }

    const { success: globalSuccess, reset: globalReset } = await globalLimiter.limit(`global_${secureUserId}`);
    if (!globalSuccess) {
      return NextResponse.json(
        { error: "Platform rate limit exceeded.", retryAfter: globalReset },
        { status: 429, headers: { "Retry-After": globalReset.toString() } }
      );
    }

    const { data: validRelationship, error: relError } = await supabase
      .from("relationships")
      .select("id")
      .eq("id", relationship_id)
      .eq("status", "active")
      .or(`user_a_id.eq.${secureUserId},user_b_id.eq.${secureUserId}`)
      .single();

    if (relError || !validRelationship) {
      console.warn(`Blocked unauthorized relationship access by: ${secureUserId}`);
      return NextResponse.json({ error: "Unauthorized chat access" }, { status: 403 });
    }

    const { success: chatSuccess, reset: chatReset } = await chatLimiter.limit(`chat_${secureUserId}_${validRelationship.id}`);
    if (!chatSuccess) {
      return NextResponse.json(
        { error: "You're sending messages too fast. Take a breath.", retryAfter: chatReset },
        { status: 429, headers: { "Retry-After": chatReset.toString() } }
      );
    }

    const { data, error } = await supabase
      .from("messages")
      .insert([{
        relationship_id: validRelationship.id,
        sender_id: secureUserId, 
        content: content.trim(),
        is_read: false,
      }])
      .select()
      .single();

    if (error) {
      console.error("Supabase insert error:", error); 
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error("Server API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}