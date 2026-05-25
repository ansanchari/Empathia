"use client"

import { motion } from "framer-motion"
import Image from "next/image"

interface LogoProps {
  className?: string
  size?: number
}

// Increased default size to 180 since it includes the text now
export function Logo({ className = "", size = 180 }: LogoProps) {
  return (
    <motion.div 
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      // NEW: Added mx-auto here. This guarantees it will center itself!
      className={`relative mx-auto flex shrink-0 items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <Image 
        src="/logo.svg" /* THIS MUST MATCH YOUR FILE NAME EXACTLY */
        alt="Empathia Brand"
        fill
        className="object-contain"
        priority
      />
    </motion.div>
  )
}