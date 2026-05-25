"use client"

import { Logo } from "@/components/ui/logo"

import { useApp } from "@/lib/app-context"
import { supabase } from "@/lib/supabaseClient"
import { ChevronLeft, Send, Loader2, MessagesSquare, Check, CheckCheck } from "lucide-react" // <-- ADDED Check and CheckCheck
import { useRef, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"

// --- ADDED is_read to the interface ---
interface ChatMessage {
  id: string
  sender_id: string
  content: string
  created_at: string
  is_read?: boolean 
}

export function ChatScreen() {
  const { setScreen, sessionUser } = useApp()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [relationshipId, setRelationshipId] = useState<string | null>(null)
  
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  useEffect(() => {
    let isMounted = true 
    let channel: any

    const setupChat = async () => {
      const { data: rel } = await supabase
        .from('relationships')
        .select('id')
        .or(`user_a_id.eq.${sessionUser?.id},user_b_id.eq.${sessionUser?.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (!rel || !isMounted) {
        if (isMounted) setIsLoading(false)
        return
      }

      if (isMounted) setRelationshipId(rel.id)

      const { data: history } = await supabase
        .from('messages')
        .select('*')
        .eq('relationship_id', rel.id)
        .order('created_at', { ascending: true })

      if (history && isMounted) {
        setMessages(history)
        
        // --- NEW: Mark unread messages from partner as read on initial load ---
        const unreadIds = history
          .filter(m => m.sender_id !== sessionUser?.id && !m.is_read)
          .map(m => m.id)
          
        if (unreadIds.length > 0) {
          supabase.from('messages').update({ is_read: true }).in('id', unreadIds).then()
        }
      }
      
      if (isMounted) setIsLoading(false)

      channel = supabase
        .channel(`chat-room-${rel.id}`)
        .on(
          'postgres_changes',
          {
            event: '*', // --- UPDATED: Now listening to ALL events (INSERT and UPDATE) ---
            schema: 'public',
            table: 'messages',
            filter: `relationship_id=eq.${rel.id}`
          },
          (payload) => {
            if (payload.eventType === 'INSERT') {
              const newMsg = payload.new as ChatMessage
              setMessages((prev) => {
                if (prev.some(msg => msg.id === newMsg.id)) return prev
                return [...prev, newMsg]
              })
              
              // --- NEW: If you have the chat open and receive a message, instantly mark it read ---
              if (newMsg.sender_id !== sessionUser?.id) {
                supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id).then()
              }
            }

            // --- NEW: Update the UI when a message gets marked as read ---
            if (payload.eventType === 'UPDATE') {
              const updatedMsg = payload.new as ChatMessage
              setMessages((prev) => prev.map(msg => msg.id === updatedMsg.id ? updatedMsg : msg))
            }
          }
        )
        .subscribe()
    }

    setupChat()

    return () => {
      isMounted = false 
      if (channel) supabase.removeChannel(channel)
    }
  }, [sessionUser?.id])

  const handleSend = async () => {
    if (!inputValue.trim() || !relationshipId) return

    setIsSending(true)
    const textToSend = inputValue.trim()
    setInputValue("")

    const { data, error } = await supabase
      .from('messages')
      .insert([{ relationship_id: relationshipId, sender_id: sessionUser?.id, content: textToSend, is_read: false }])
      .select()
      .single()

    if (error) {
      alert("Failed to send message.")
      setInputValue(textToSend) 
    } else if (data) {
      setMessages((prev) => {
        if (prev.some(msg => msg.id === data.id)) return prev
        return [...prev, data]
      })
    }
    
    setIsSending(false)
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent w-full">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent pt-[60px] pb-[160px] w-full">
      
      <header className="fixed top-0 z-40 flex w-full justify-center border-b border-border/50 bg-background/70 px-4 py-3 backdrop-blur-xl shadow-sm">
        <div className="flex w-full max-w-3xl items-center justify-between">
          <button
            onClick={() => setScreen("dashboard")}
            className="flex items-center gap-2 text-muted-foreground transition-colors hover:text-foreground active:scale-95"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            <span className="text-sm font-medium">Back</span>
          </button>
          <h1 className="flex-1 text-center font-serif text-xl font-medium tracking-tight text-foreground">
            Private Chat
          </h1>
          <div className="w-16" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 pt-6 pb-20">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center mt-32 text-muted-foreground opacity-60 animate-in fade-in slide-in-from-bottom-4">
            <div className="h-16 w-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessagesSquare className="h-8 w-8 text-primary/50" />
            </div>
            <p className="text-sm font-medium">It's quiet in here.</p>
            <p className="text-xs mt-1">Send a message to start connecting.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((message) => {
              const isMe = message.sender_id === sessionUser?.id
              return (
                <motion.div 
                  key={message.id} 
                  layout
                  initial={{ opacity: 0, scale: 0.9, originX: isMe ? 1 : 0, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`relative max-w-[80%] md:max-w-[65%] px-5 py-3 text-sm shadow-md ${
                      isMe
                        ? "bg-gradient-to-br from-primary to-accent text-primary-foreground rounded-[24px] rounded-br-sm shadow-primary/20"
                        : "bg-card text-foreground border border-border/60 rounded-[24px] rounded-bl-sm shadow-black/5"
                    }`}
                  >
                    <p className="break-words leading-relaxed">{message.content}</p>
                    
                    {/* --- UPGRADED: Timestamp and Read Receipts UI --- */}
                    <div className={`flex items-center gap-1.5 mt-1.5 justify-end ${isMe ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      <span className="text-[10px] font-medium">
                        {new Date(message.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isMe && (
                        message.is_read ? (
                          <CheckCheck className="h-3.5 w-3.5" />
                        ) : (
                          <Check className="h-3.5 w-3.5 opacity-70" />
                        )
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
        <div ref={scrollContainerRef} className="h-4" />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="fixed bottom-[85px] z-40 flex w-full justify-center px-4 pointer-events-none"
      >
        <div className="flex w-full max-w-2xl shrink-0 items-center gap-2 rounded-full border border-border/40 bg-background/60 backdrop-blur-xl p-1.5 shadow-xl shadow-black/5 pointer-events-auto transition-all focus-within:bg-background/80 focus-within:border-primary/30">
          
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            aria-label="Message input"
          />
          
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md transition-all hover:brightness-110 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            aria-label="Send message"
          >
            {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 ml-0.5" strokeWidth={2.5} />}
          </button>
        </div>
      </form>
    </div>
  )
}