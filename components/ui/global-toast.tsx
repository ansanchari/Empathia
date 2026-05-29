"use client"

import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useApp } from "@/lib/app-context"
import { MessageCircle, X } from "lucide-react"

interface ToastNotification {
  id: string
  content: string
}

export function GlobalToast() {
  const { sessionUser, screen, setScreen } = useApp()
  const [notification, setNotification] = useState<ToastNotification | null>(null)
  
  const [activeRelId, setActiveRelId] = useState<string | null>(null)

  const screenRef = useRef(screen)
  useEffect(() => {
    screenRef.current = screen
  }, [screen])

  useEffect(() => {
    if (!sessionUser) return
    let isMounted = true

    const fetchRelationship = async () => {
      const { data: rel } = await supabase
        .from('relationships')
        .select('id')
        .or(`user_a_id.eq.${sessionUser.id},user_b_id.eq.${sessionUser.id}`)
        .eq('status', 'active')
        .maybeSingle()

      if (rel && isMounted) setActiveRelId(rel.id)
    }

    fetchRelationship()

    const relChannel = supabase
      .channel(`toast-rel-watcher-${sessionUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'relationships' },
        (payload) => {
          const newRel = payload.new as { id: string; status: string; user_a_id: string; user_b_id: string }

          if (newRel && newRel.status === 'active') {
            if (newRel.user_a_id === sessionUser.id || newRel.user_b_id === sessionUser.id) {
              if (isMounted) setActiveRelId(newRel.id)
            }
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(relChannel)
    }
  }, [sessionUser?.id])


  useEffect(() => {
    if (!activeRelId || !sessionUser) return
    
    let isMounted = true
    console.log("🟢 Global Toast is now actively listening to relationship:", activeRelId)

    const msgChannel = supabase
      .channel(`toast-msg-${activeRelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `relationship_id=eq.${activeRelId}`
        },
        (payload) => {
          const newMsg = payload.new as { id: string; content: string; sender_id: string }
          
          if (newMsg.sender_id !== sessionUser.id && screenRef.current !== "chat") {
            setNotification({
              id: newMsg.id,
              content: newMsg.content
            })

            setTimeout(() => {
              if (isMounted) setNotification(null)
            }, 5000)
          }
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(msgChannel)
    }
  }, [activeRelId, sessionUser?.id])


  if (!notification) return null

  return (
    <div className="fixed top-4 left-0 right-0 z-[100] mx-auto flex w-full max-w-2xl px-4 animate-in slide-in-from-top-10 fade-in duration-300">
      
      <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-md transition-all hover:scale-[1.02]">
        
        <div 
          onClick={() => {
            setScreen("chat")
            setNotification(null)
          }}
          className="flex flex-1 cursor-pointer items-center gap-3 overflow-hidden"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-semibold text-foreground">New Message</span>
            <span className="truncate text-sm text-muted-foreground">
              {notification.content}
            </span>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => setNotification(null)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          aria-label="Close notification"
        >
          <X className="h-4 w-4 pointer-events-none" />
        </button>
        
      </div>
    </div>
  )
}