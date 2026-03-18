import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { AppProviders } from "@/components/providers/AppProviders"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
})

export const metadata: Metadata = {
  title: "AgentCommerce | Autonomous AI Business Agents",
  description: "Launch AI agents that run businesses and earn revenue on-chain.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (typeof window !== 'undefined') {
                  const originalFetch = window.fetch;
                  try {
                    window.fetch = originalFetch;
                  } catch (e) {
                    Object.defineProperty(window, 'fetch', {
                      value: originalFetch,
                      writable: true,
                      configurable: true
                    });
                  }
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${spaceGrotesk.variable} font-sans bg-black text-white antialiased`} suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
