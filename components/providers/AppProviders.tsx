"use client"

import { PropsWithChildren } from "react"
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider"
import { SessionProvider } from "@/components/providers/SessionProvider"
import { WalletProvider } from "@/components/providers/WalletProvider"

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <WalletProvider>
      <AuthSessionProvider>
        <SessionProvider>{children}</SessionProvider>
      </AuthSessionProvider>
    </WalletProvider>
  )
}
