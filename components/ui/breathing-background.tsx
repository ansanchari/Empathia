"use client"

import { motion } from "framer-motion"

export function BreathingBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      
      {/* Orb 1: Primary Color - Moved closer to center, increased opacity and reduced blur */}
      <motion.div
        className="absolute -right-[10%] top-[0%] h-[70vw] w-[70vw] rounded-full bg-primary/30 blur-[60px] sm:h-[500px] sm:w-[500px] sm:blur-[80px]"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -50, 0],
          y: [0, 50, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Orb 2: Accent Color - Moved closer to center, increased opacity and reduced blur */}
      <motion.div
        className="absolute -left-[10%] bottom-[10%] h-[80vw] w-[80vw] rounded-full bg-accent/30 blur-[60px] sm:h-[600px] sm:w-[600px] sm:blur-[80px]"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, 60, 0],
          y: [0, -40, 0],
        }}
        transition={{
          duration: 11, 
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1, 
        }}
      />
      
    </div>
  )
}