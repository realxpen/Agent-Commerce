import Link from "next/link"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, ChevronLeft } from "lucide-react"
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
              <CardDescription className="text-base mt-2">Connect your wallet to get started</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <WalletAccountCard />
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/55">
                Wallet sign-in is the only live login path in this deployment. Social login buttons were removed so this screen only shows working auth options.
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
