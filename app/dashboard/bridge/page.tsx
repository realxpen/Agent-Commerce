"use client"

import { useState } from "react"
import { 
  ArrowDown, 
  Zap, 
  ShieldCheck, 
  ChevronDown,
  Info,
  RefreshCw,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import { useSession } from "@/components/providers/SessionProvider"

const chains = [
  { id: "initia", name: "Initia", icon: "https://picsum.photos/seed/initia/32/32", balance: "142.50 INIT" },
  { id: "ethereum", name: "Ethereum", icon: "https://picsum.photos/seed/eth/32/32", balance: "0.45 ETH" },
  { id: "arbitrum", name: "Arbitrum", icon: "https://picsum.photos/seed/arb/32/32", balance: "1,200 USDC" },
  { id: "optimism", name: "Optimism", icon: "https://picsum.photos/seed/op/32/32", balance: "0.00 OP" },
]

export default function BridgePage() {
  const [fromChain, setFromChain] = useState(chains[1])
  const [toChain, setToChain] = useState(chains[0])
  const [amount, setAmount] = useState("")
  const [isBridging, setIsBridging] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const { isSessionActive } = useSession()

  const swapChains = () => {
    const temp = fromChain
    setFromChain(toChain)
    setToChain(temp)
  }

  const handleBridge = () => {
    setIsBridging(true)
    const delay = isSessionActive ? 1200 : 4000
    setTimeout(() => {
      setIsBridging(false)
      setIsSuccess(true)
    }, delay)
  }

  if (isSuccess) {
    return (
      <div className="p-8 max-w-2xl mx-auto space-y-8">
        <Card className="glass-card border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.1)] text-center py-20 px-10">
          <CardContent className="flex flex-col items-center justify-center space-y-8">
            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.2)]">
              <ShieldCheck className="w-12 h-12 text-emerald-400" />
            </div>
            <div className="space-y-3">
              <h3 className="text-3xl font-bold font-display">Bridge Successful</h3>
              <p className="text-white/40 max-w-xs mx-auto">Your assets have been successfully transferred to {toChain.name} via the Interwoven Bridge.</p>
            </div>
            <Button 
              onClick={() => setIsSuccess(false)}
              className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_30px_rgba(16,185,129,0.3)]"
            >
              Back to Bridge
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-display font-bold tracking-tight">Interwoven Bridge</h1>
        <p className="text-white/40 text-sm">Move assets seamlessly across the Initia ecosystem.</p>
      </div>

      <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold">Transfer Assets</CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* From Chain */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
              <span>From</span>
              <span>Balance: {fromChain.balance}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" className="h-12 px-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3">
                <Image src={fromChain.icon} alt={fromChain.name} width={24} height={24} className="rounded-full" referrerPolicy="no-referrer" />
                <span className="font-bold">{fromChain.name}</span>
                <ChevronDown className="w-4 h-4 text-white/20" />
              </Button>
              <Input 
                type="number" 
                placeholder="0.00" 
                className="bg-transparent border-none text-right text-2xl font-bold focus-visible:ring-0 p-0 h-auto"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center -my-6 relative z-10">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={swapChains}
              className="h-10 w-10 rounded-xl bg-black border-white/10 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all group"
            >
              <ArrowDown className="w-5 h-5 text-white/40 group-hover:text-indigo-400 transition-colors" />
            </Button>
          </div>

          {/* To Chain */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-white/20">
              <span>To</span>
              <span>Balance: {toChain.balance}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" className="h-12 px-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl flex items-center gap-3">
                <Image src={toChain.icon} alt={toChain.name} width={24} height={24} className="rounded-full" referrerPolicy="no-referrer" />
                <span className="font-bold">{toChain.name}</span>
                <ChevronDown className="w-4 h-4 text-white/20" />
              </Button>
              <div className="text-right text-2xl font-bold text-white/20">
                {amount || "0.00"}
              </div>
            </div>
          </div>

          {/* Bridge Info */}
          <div className="p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Bridge Fee</span>
              <span className="text-white font-medium">0.001 ETH</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/40">Estimated Time</span>
              <span className="text-white font-medium flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-indigo-400" />
                ~5 minutes
              </span>
            </div>
          </div>

          <Button 
            className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_30px_rgba(79,70,229,0.4)] disabled:opacity-50"
            onClick={handleBridge}
            disabled={isBridging || !amount}
          >
            {isBridging ? (
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>{isSessionActive ? "Auto-signing..." : "Bridging Assets..."}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {isSessionActive && <Zap className="w-4 h-4 text-indigo-300" />}
                <span>Bridge Assets</span>
              </div>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="glass-card p-6 border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold">Instant Finality</h3>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Leverage Initia&apos;s interwoven architecture for near-instant cross-chain settlements.
          </p>
        </Card>
        <Card className="glass-card p-6 border-white/5">
          <div className="flex items-center gap-3 mb-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold">Secure Routing</h3>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            Assets are routed through verified validators ensuring maximum security for your funds.
          </p>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/20">
        <Info className="w-3 h-3" />
        Powered by Interwoven Stack
      </div>
    </div>
  )
}
