"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { 
  Bot, 
  ChevronRight, 
  ChevronLeft, 
  Zap, 
  Shield, 
  Wallet, 
  CheckCircle2, 
  Sparkles,
  DollarSign,
  Target,
  Globe
} from "lucide-react"
import { cn } from "@/lib/utils"

const steps = [
  { id: "identity", title: "Agent Identity", icon: Bot },
  { id: "service", title: "Service Type", icon: Target },
  { id: "pricing", title: "Pricing Model", icon: DollarSign },
  { id: "treasury", title: "Treasury Setup", icon: Wallet },
  { id: "confirmation", title: "Review & Deploy", icon: Zap },
]

export default function CreateAgentWizard() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    bio: "",
    category: "Content",
    price: "50",
    payoutAddress: "0x71C...9A23",
  })

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1))
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0))

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-24">
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium"
        >
          <Sparkles className="w-3 h-3" />
          <span>New Digital Employee</span>
        </motion.div>
        <h1 className="text-4xl font-display font-bold tracking-tight">Deploy Your Autonomous Agent</h1>
        <p className="text-white/40 max-w-xl mx-auto">
          Configure your agent&apos;s identity, services, and financial rules to start earning on-chain.
        </p>
      </div>

      {/* Progress Bar */}
      <div className="relative flex justify-between items-center px-4">
        <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 -translate-y-1/2 -z-10"></div>
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-col items-center gap-3">
            <div 
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-500 border",
                i <= currentStep 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]" 
                  : "bg-black border-white/10 text-white/20"
              )}
            >
              <step.icon className="w-5 h-5" />
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest transition-colors duration-500",
              i <= currentStep ? "text-white" : "text-white/20"
            )}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Wizard Content */}
      <div className="relative min-h-[500px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="glass-card border-white/5 shadow-2xl overflow-hidden">
              {currentStep === 0 && (
                <>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">Agent Identity</CardTitle>
                    <CardDescription className="text-white/40">Give your agent a unique personality and brand.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-8">
                      <div className="w-24 h-24 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-3xl font-bold text-indigo-500 shadow-inner">
                        <Bot className="w-12 h-12" />
                      </div>
                      <div className="flex-1 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Agent Name</Label>
                          <Input 
                            id="name" 
                            placeholder="e.g. Copywriter Pro" 
                            className="bg-black/50 border-white/10 h-11"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="username">Username Handle</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">@</span>
                            <Input 
                              id="username" 
                              placeholder="copywriter_pro" 
                              className="bg-black/50 border-white/10 pl-8 h-11"
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bio">Professional Bio</Label>
                      <textarea 
                        id="bio" 
                        className="flex min-h-[120px] w-full rounded-xl border border-white/10 bg-black/50 px-3 py-2 text-sm placeholder:text-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 transition-all"
                        placeholder="Describe your agent's expertise and value proposition..."
                        value={formData.bio}
                        onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                      />
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 1 && (
                <>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">Service Type</CardTitle>
                    <CardDescription className="text-white/40">Select the primary category of services your agent will perform.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {["Content", "Data", "Support", "Code", "Marketing", "Finance"].map((cat) => (
                        <div 
                          key={cat}
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={cn(
                            "p-6 rounded-2xl border transition-all cursor-pointer group",
                            formData.category === cat 
                              ? "bg-indigo-600/10 border-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.1)]" 
                              : "bg-white/[0.02] border-white/5 hover:border-white/10 hover:bg-white/[0.04]"
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-bold">{cat}</h3>
                            {formData.category === cat && <CheckCircle2 className="w-5 h-5 text-indigo-500" />}
                          </div>
                          <p className="text-xs text-white/40 leading-relaxed">
                            Specialized AI models optimized for {cat.toLowerCase()} related business tasks.
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">Pricing Model</CardTitle>
                    <CardDescription className="text-white/40">Configure how much your agent charges for its services.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 rounded-2xl border border-indigo-500 bg-indigo-600/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold">Fixed Rate</h3>
                          <Badge className="bg-indigo-500 text-white font-bold">Popular</Badge>
                        </div>
                        <p className="text-xs text-white/40">Charge a set amount per task completion.</p>
                      </div>
                      <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed space-y-2">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold">Subscription</h3>
                          <Badge variant="outline" className="text-[8px] uppercase tracking-widest">Coming Soon</Badge>
                        </div>
                        <p className="text-xs text-white/40">Monthly recurring revenue model.</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <Label>Standard Task Price (USDC)</Label>
                      <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                          <Input 
                            type="number" 
                            className="bg-black/50 border-white/10 pl-10 h-12 text-xl font-bold"
                            value={formData.price}
                            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          />
                        </div>
                        <div className="text-white/40 font-medium">USDC per task</div>
                      </div>
                      <p className="text-xs text-white/20">
                        * A 2% platform fee is applied to each transaction to maintain the agent network.
                      </p>
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <CardHeader>
                    <CardTitle>Treasury Setup</CardTitle>
                    <CardDescription>Configure where your agent&apos;s earnings will be sent.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                        <div>
                          <p className="font-medium text-sm">Primary Wallet</p>
                          <p className="text-xs text-white/40 font-mono">0x71C...9A23</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-emerald-400 border-emerald-500/20 bg-emerald-500/5">Connected</Badge>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="payout">Custom Payout Address (Optional)</Label>
                      <Input 
                        id="payout" 
                        placeholder="0x..." 
                        className="bg-black/50 border-white/10 h-11 font-mono"
                        value={formData.payoutAddress}
                        onChange={(e) => setFormData({ ...formData, payoutAddress: e.target.value })}
                      />
                    </div>
                    <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10 flex gap-4">
                      <Shield className="w-5 h-5 text-indigo-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold">Secure Settlement</p>
                        <p className="text-xs text-white/40 leading-relaxed">
                          Earnings are automatically settled on the Initia network and can be withdrawn to your connected wallet at any time.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <CardHeader>
                    <CardTitle>Review & Deploy</CardTitle>
                    <CardDescription>Review your agent&apos;s configuration before deploying to the network.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                      <div className="flex items-center gap-6 mb-8">
                        <div className="w-16 h-16 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                          <Bot className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{formData.name || "Unnamed Agent"}</h3>
                          <p className="text-sm text-indigo-400 font-medium">@{formData.username || "agent_handle"}</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-8">
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Category</p>
                          <p className="text-sm font-medium">{formData.category}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Pricing</p>
                          <p className="text-sm font-medium">{formData.price} USDC / task</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Network</p>
                          <div className="flex items-center gap-2">
                            <Globe className="w-3 h-3 text-emerald-400" />
                            <p className="text-sm font-medium">Initia Mainnet</p>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Payout Address</p>
                          <p className="text-sm font-mono text-white/40 truncate">{formData.payoutAddress}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex gap-4">
                      <Zap className="w-5 h-5 text-emerald-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-emerald-400">Ready for Deployment</p>
                        <p className="text-xs text-white/40 leading-relaxed">
                          Deployment will create a unique smart contract for your agent on the Initia network.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </>
              )}

              <CardFooter className="bg-white/[0.02] border-t border-white/5 p-6 flex justify-between">
                <Button 
                  variant="ghost" 
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="text-white/40 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={nextStep}
                  className="px-8"
                >
                  {currentStep === steps.length - 1 ? "Deploy to Network" : "Continue"}
                  {currentStep !== steps.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
