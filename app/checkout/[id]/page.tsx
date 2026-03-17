"use client"

import { useState } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "motion/react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { 
  Bot, 
  CheckCircle2, 
  ChevronLeft, 
  Lock, 
  ShieldCheck, 
  Wallet, 
  Zap, 
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/providers/SessionProvider"

export default function CheckoutPage() {
  const [step, setStep] = useState<"details" | "processing" | "success">("details")
  const { isSessionActive } = useSession()

  const handlePayment = () => {
    setStep("processing")
    const delay = isSessionActive ? 800 : 3000
    setTimeout(() => {
      setStep("success")
    }, delay)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/agent/1" className="flex items-center gap-2 text-white/40 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium text-sm">Cancel Order</span>
          </Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Lock className="w-3 h-3" />
            <span>Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 pt-32">
        <div className="w-full max-w-lg relative">
          <AnimatePresence mode="wait">
            {step === "details" && (
              <motion.div
                key="details"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
                  <CardHeader className="text-center pb-8 pt-10">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-6 shadow-inner">
                      <Bot className="w-10 h-10 text-indigo-500" />
                    </div>
                    <CardTitle className="text-3xl font-display font-bold tracking-tight">Hire Copywriter Pro</CardTitle>
                    <CardDescription className="text-white/40">You are deploying a task to @copywriter_pro</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="prompt" className="text-xs font-bold uppercase tracking-widest text-white/40">Task Description</Label>
                        <textarea 
                          id="prompt" 
                          className="flex min-h-[120px] w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                          placeholder="Describe what you need the agent to do. Be as specific as possible..."
                        />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 space-y-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40 font-medium">Standard Service</span>
                        <span className="font-bold">50.00 USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40 font-medium">Network Fee</span>
                        <span className="font-bold">0.05 USDC</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/40 font-medium">Platform Fee (2%)</span>
                        <span className="font-bold">1.00 USDC</span>
                      </div>
                      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                        <span className="font-bold text-lg">Total</span>
                        <div className="text-right">
                          <span className="text-2xl font-bold text-indigo-500">$51.05 USDC</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between group cursor-pointer hover:bg-indigo-500/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-[0_0_20px_rgba(79,70,229,0.3)]"></div>
                        <div>
                          <p className="font-bold text-sm">Pay with Wallet</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Balance: 1,240.50 USDC</p>
                        </div>
                      </div>
                      <Wallet className="w-5 h-5 text-indigo-500" />
                    </div>
                  </CardContent>
                  <CardFooter className="flex-col gap-6 pb-10">
                    <Button 
                      className="w-full h-14 text-lg font-bold shadow-[0_0_30px_rgba(79,70,229,0.4)]"
                      onClick={handlePayment}
                    >
                      Confirm & Authorize Payment
                    </Button>
                    <p className="text-center text-[10px] font-bold uppercase tracking-widest text-white/20 flex items-center justify-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-500" />
                      Smart contract escrow enabled
                    </p>
                  </CardFooter>
                </Card>
              </motion.div>
            )}

            {step === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <Card className="glass-card border-white/5 shadow-2xl text-center py-20 px-10">
                  <CardContent className="flex flex-col items-center justify-center space-y-8">
                    <div className="w-24 h-24 relative flex items-center justify-center">
                      <div className="absolute inset-0 rounded-full border-4 border-white/5"></div>
                      <div className={cn(
                        "absolute inset-0 rounded-full border-4 border-t-transparent animate-spin",
                        isSessionActive ? "border-indigo-400" : "border-indigo-500"
                      )}></div>
                      {isSessionActive ? (
                        <Zap className="w-10 h-10 text-indigo-400 animate-pulse" />
                      ) : (
                        <Wallet className="w-10 h-10 text-indigo-500" />
                      )}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-2xl font-bold font-display">
                        {isSessionActive ? "Auto-signing Task" : "Confirming Transaction"}
                      </h3>
                      <p className="text-white/40 max-w-xs mx-auto">
                        {isSessionActive 
                          ? "Your active session is automatically authorizing this deployment." 
                          : "Please approve the transaction in your wallet to deploy the task to the network."}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="glass-card border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] text-center py-20 px-10">
                  <CardContent className="flex flex-col items-center justify-center space-y-8">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-3xl font-bold font-display">Payment Successful</h3>
                      <p className="text-white/40 max-w-xs mx-auto">Your task has been successfully deployed to @copywriter_pro on the Initia network.</p>
                    </div>
                    <div className="pt-8 w-full space-y-4">
                      <Link href="/dashboard/tasks" className="block w-full">
                        <Button className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]">
                          View Task Status
                        </Button>
                      </Link>
                      <Link href="/marketplace" className="block w-full">
                        <Button variant="ghost" className="w-full h-14 text-lg font-bold text-white/40 hover:text-white">
                          Return to Marketplace
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
