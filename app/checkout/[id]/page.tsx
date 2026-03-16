"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, CheckCircle2, ChevronLeft, Loader2, Lock, ShieldCheck, Wallet } from "lucide-react"

export default function CheckoutPage() {
  const [step, setStep] = useState<"details" | "processing" | "success">("details")

  const handlePayment = () => {
    setStep("processing")
    setTimeout(() => {
      setStep("success")
    }, 3000)
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <Link href="/agent/1" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Cancel Order</span>
        </Link>
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">Secure Checkout</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-lg">
          {step === "details" && (
            <Card className="border-white/10 bg-black/60 shadow-2xl">
              <CardHeader className="text-center pb-8">
                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-indigo-400" />
                </div>
                <CardTitle className="text-2xl">Complete Order</CardTitle>
                <CardDescription>You are hiring Copywriter Pro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Task Description</Label>
                    <textarea 
                      id="prompt" 
                      className="flex min-h-[120px] w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      placeholder="Describe what you need the agent to do. Be as specific as possible..."
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Standard Service</span>
                    <span className="font-medium">50.00 USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Network Fee</span>
                    <span className="font-medium">0.05 USDC</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Platform Fee (2%)</span>
                    <span className="font-medium">1.00 USDC</span>
                  </div>
                  <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                    <span className="font-semibold">Total</span>
                    <div className="text-right">
                      <span className="text-xl font-bold text-indigo-400">51.05 USDC</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                    <div>
                      <p className="font-medium text-sm">Pay with Wallet</p>
                      <p className="text-xs text-muted-foreground">Balance: 1,240.50 USDC</p>
                    </div>
                  </div>
                  <Wallet className="w-5 h-5 text-indigo-400" />
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button 
                  className="w-full h-12 text-base bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all"
                  onClick={handlePayment}
                >
                  Confirm & Pay 51.05 USDC
                </Button>
                <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Smart contract escrow enabled
                </p>
              </CardFooter>
            </Card>
          )}

          {step === "processing" && (
            <Card className="border-white/10 bg-black/60 shadow-2xl text-center py-12">
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 relative flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-white/10"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"></div>
                  <Wallet className="w-8 h-8 text-indigo-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Confirming Transaction</h3>
                  <p className="text-muted-foreground">Please approve the transaction in your wallet...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "success" && (
            <Card className="border-emerald-500/30 bg-black/60 shadow-[0_0_40px_rgba(16,185,129,0.1)] text-center py-12">
              <CardContent className="flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Payment Successful</h3>
                  <p className="text-muted-foreground">Your order has been sent to Copywriter Pro.</p>
                </div>
                <div className="pt-6 w-full space-y-3">
                  <Link href="/dashboard/tasks" className="block w-full">
                    <Button className="w-full h-12 text-base bg-emerald-500 hover:bg-emerald-600 text-white">
                      View Order Status
                    </Button>
                  </Link>
                  <Link href="/marketplace" className="block w-full">
                    <Button variant="ghost" className="w-full h-12 text-base">
                      Return to Marketplace
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
