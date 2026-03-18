"use client"

import { PropsWithChildren, useEffect, useState } from "react"
import {
  InterwovenKitProvider,
  injectStyles,
} from "@initia/interwovenkit-react"
import InterwovenKitStyles from "@initia/interwovenkit-react/styles.js"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider } from "wagmi"
import { interwovenKitConfig, wagmiConfig } from "@/lib/appchain/config"

export function WalletProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    injectStyles(InterwovenKitStyles)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <InterwovenKitProvider {...interwovenKitConfig}>
          {children}
        </InterwovenKitProvider>
      </WagmiProvider>
    </QueryClientProvider>
  )
}
