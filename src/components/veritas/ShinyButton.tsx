"use client"

import type React from "react"

interface ShinyButtonProps {
  children: React.ReactNode
  onClick?: () => void
  className?: string
  disabled?: boolean
  type?: "button" | "submit" | "reset"
}

export function ShinyButton({ children, onClick, className = "", disabled, type = "button" }: ShinyButtonProps) {
  return (
    <button
      type={type}
      className={`shiny-cta ${disabled ? 'opacity-40 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{children}</span>
    </button>
  )
}
