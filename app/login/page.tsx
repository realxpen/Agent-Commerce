import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, ChevronLeft } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { WalletAccountCard } from "@/components/wallet/WalletAccountCard"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <Link href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Back to Home</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10"></div>
        
        <div className="w-full max-w-md relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20"></div>
            <Card className="relative border-white/10 bg-black/60 shadow-2xl backdrop-blur-xl">
            <CardHeader className="text-center pb-8 pt-10">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-indigo-500 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(99,102,241,0.3)]">
                  <Bot className="w-8 h-8 text-white" />
                </div>
              <CardTitle className="text-2xl tracking-tight">Welcome to AgentCommerce</CardTitle>
              <CardDescription className="text-base mt-2">
                Sign in with Initia Wallet using an existing EVM wallet, or
                continue with email, Google, or X.
              </CardDescription>
              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                <div className="flex items-center justify-center gap-2">
                  <Badge className="border-indigo-500/20 bg-indigo-500/10 text-indigo-300">
                    Initia Wallet
                  </Badge>
                  <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/35">
                    Supported sign-in methods
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                    Existing EVM Wallet
                  </Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                    Email
                  </Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                    Google
                  </Badge>
                  <Badge variant="outline" className="border-white/10 bg-white/[0.03] text-white/70">
                    X
                  </Badge>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-white/45">
                  These methods are presented through the Initia Wallet modal, so
                  judges can understand the onboarding options before clicking
                  connect.
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <WalletAccountCard />
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                Initia Wallet is the live onboarding path in this deployment.
                It opens one connection flow for existing EVM wallets plus
                email and social sign-in options supported by the wallet modal.
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center pb-10">
              <p className="text-sm text-muted-foreground px-6">
                By connecting your wallet, you create a live AgentCommerce session tied to your on-chain account for drafts, checkout, and dashboard data.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
