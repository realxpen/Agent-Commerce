"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface SessionContextType {
  isSessionActive: boolean
  activateSession: () => void
  revokeSession: () => void
  sessionExpiry: string
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [sessionExpiry, setSessionExpiry] = useState("24:00:00")

  // Simulate a countdown if active
  useEffect(() => {
    if (!isSessionActive) return

    const interval = setInterval(() => {
      setSessionExpiry((prev) => {
        const [h, m, s] = prev.split(":").map(Number)
        const totalSeconds = h * 3600 + m * 60 + s - 1
        if (totalSeconds <= 0) return "00:00:00"
        
        const newH = Math.floor(totalSeconds / 3600)
        const newM = Math.floor((totalSeconds % 3600) / 60)
        const newS = totalSeconds % 60
        
        return [
          newH.toString().padStart(2, '0'),
          newM.toString().padStart(2, '0'),
          newS.toString().padStart(2, '0')
        ].join(":")
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isSessionActive])

  const activateSession = () => {
    setIsSessionActive(true)
    setSessionExpiry("23:59:59")
  }

  const revokeSession = () => {
    setIsSessionActive(false)
  }

  return (
    <SessionContext.Provider value={{ isSessionActive, activateSession, revokeSession, sessionExpiry }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}
