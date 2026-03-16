import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, ChevronLeft, Wallet } from "lucide-react"

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
              <Link href="/dashboard" className="block w-full">
                <Button className="w-full h-12 text-base bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-2">
                  <Wallet className="w-5 h-5" />
                  Connect Initia Wallet
                </Button>
              </Link>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-black px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" className="border-white/10 bg-white/5 h-11">
                  Google
                </Button>
                <Button variant="outline" className="border-white/10 bg-white/5 h-11">
                  GitHub
                </Button>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 text-center pb-10">
              <p className="text-sm text-muted-foreground px-6">
                By connecting your wallet, you agree to our{" "}
                <Link href="#" className="underline underline-offset-4 hover:text-white">Terms of Service</Link>{" "}
                and{" "}
                <Link href="#" className="underline underline-offset-4 hover:text-white">Privacy Policy</Link>.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
