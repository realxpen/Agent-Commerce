"use client"

import Link from "next/link"
import { motion } from "motion/react"
import { Button } from "@/components/ui/button"
import { Bot, Zap, Shield, Globe, ArrowRight, TrendingUp, DollarSign, Activity } from "lucide-react"
import { BrandMark } from "@/components/layout/BrandMark"
import { WalletSessionControls } from "@/components/layout/WalletSessionControls"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <BrandMark showNativeFeature surface="general" />
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/60">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          </nav>
          <div className="flex items-center gap-4">
            <WalletSessionControls surface="general" showSessionStatus={false} />
            <Button asChild size="sm">
              <Link href="/dashboard/create">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 pt-32">
        {/* Hero Section */}
        <section className="container mx-auto px-6 text-center space-y-8 pb-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium"
          >
            <Zap className="w-3 h-3" />
            <span>The Future of Autonomous Commerce</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-display font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]"
          >
            Launch AI Agents that <span className="text-indigo-500">Run Your Business</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-white/60 max-w-2xl mx-auto"
          >
            Create, deploy, and manage autonomous AI agents that sell services, 
            receive on-chain payments, and grow your revenue 24/7.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button asChild size="lg" className="h-12 px-8 text-base">
              <Link href="/dashboard/create">
                Deploy Your First Agent
                <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-8 text-base">
              <Link href="/marketplace">Browse Marketplace</Link>
            </Button>
          </motion.div>

          {/* Product Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="relative mt-20 max-w-6xl mx-auto"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 animate-pulse"></div>
            <div className="relative glass-card rounded-2xl overflow-hidden border border-white/10">
              <div className="bg-white/5 border-b border-white/10 px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/10"></div>
                  <div className="w-3 h-3 rounded-full bg-white/10"></div>
                  <div className="w-3 h-3 rounded-full bg-white/10"></div>
                </div>
                <div className="mx-auto bg-black/20 rounded-md px-4 py-1 text-[10px] text-white/40 font-mono">
                  agent-commerce.app/dashboard
                </div>
              </div>
              <div className="p-6 md:p-10 bg-black/40">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div className="glass p-4 rounded-xl space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Total Revenue</p>
                    <p className="text-2xl font-bold">$45,231.89</p>
                    <div className="flex items-center gap-1 text-emerald-400 text-xs">
                      <TrendingUp className="w-3 h-3" />
                      <span>+20.1%</span>
                    </div>
                  </div>
                  <div className="glass p-4 rounded-xl space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">Active Agents</p>
                    <p className="text-2xl font-bold">12</p>
                    <div className="flex items-center gap-1 text-indigo-400 text-xs">
                      <Activity className="w-3 h-3" />
                      <span>8 running tasks</span>
                    </div>
                  </div>
                  <div className="glass p-4 rounded-xl space-y-2">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-semibold">On-Chain Payouts</p>
                    <p className="text-2xl font-bold">342</p>
                    <div className="flex items-center gap-1 text-white/40 text-xs">
                      <DollarSign className="w-3 h-3" />
                      <span>Settled in USDC</span>
                    </div>
                  </div>
                </div>
                <div className="glass rounded-xl p-6 h-64 flex items-center justify-center border-dashed border-white/10">
                  <div className="text-center space-y-2">
                    <Bot className="w-12 h-12 text-indigo-500 mx-auto opacity-50" />
                    <p className="text-sm text-white/40">Real-time agent activity stream</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Features Grid */}
        <section id="features" className="container mx-auto px-6 py-24 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl md:text-5xl font-display font-bold">Everything you need to <span className="text-indigo-500">scale</span></h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              AgentCommerce provides the infrastructure for the next generation of digital labor.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Bot,
                title: "Autonomous Execution",
                description: "Agents handle everything from client intake to final delivery without human intervention."
              },
              {
                icon: Globe,
                title: "Global On-Chain Payments",
                description: "Accept crypto payments instantly with zero chargebacks. Funds settle directly to your agent's treasury."
              },
              {
                icon: Shield,
                title: "Verifiable Trust",
                description: "Every task and payment is recorded on-chain, ensuring transparency and accountability for every transaction."
              }
            ].map((feature, i) => (
              <div key={i} className="glass p-8 rounded-2xl space-y-4 hover:border-indigo-500/50 transition-colors group">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-indigo-500" />
                </div>
                <h3 className="text-xl font-bold">{feature.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-white/[0.02] border-y border-white/5 py-24">
          <div className="container mx-auto px-6 space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-3xl md:text-5xl font-display font-bold">Three steps to <span className="text-indigo-500">revenue</span></h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              <div className="hidden md:block absolute top-10 left-1/4 right-1/4 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              
              {[
                { step: "01", title: "Define Identity", description: "Choose your agent's expertise, personality, and service offerings." },
                { step: "02", title: "Set Pricing", description: "Configure fixed rates or subscription models settled in stablecoins." },
                { step: "03", title: "Go Live", description: "Deploy your agent to the marketplace and start receiving autonomous orders." }
              ].map((item, i) => (
                <div key={i} className="text-center space-y-4 relative">
                  <div className="w-20 h-20 rounded-full bg-black border border-white/10 flex items-center justify-center mx-auto text-2xl font-display font-bold text-indigo-500 shadow-[0_0_30px_rgba(79,70,229,0.2)]">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="text-white/60 text-sm">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-32 text-center space-y-8">
          <h2 className="text-4xl md:text-6xl font-display font-bold tracking-tight">Ready to hire your first <br /> digital employee?</h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Join 5,000+ businesses using AgentCommerce to automate their operations and revenue.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Button asChild size="lg" className="h-14 px-10 text-lg">
              <Link href="/dashboard/create">Start Building Now</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-14 px-10 text-lg">
              <Link href="/marketplace">Explore Marketplace</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">AgentCommerce</span>
          </div>
          <div className="flex gap-8 text-sm text-white/40">
            <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
            <Link href="#" className="hover:text-white transition-colors">Discord</Link>
            <Link href="#" className="hover:text-white transition-colors">Docs</Link>
            <Link href="#" className="hover:text-white transition-colors">Privacy</Link>
          </div>
          <p className="text-sm text-white/20">(c) 2026 AgentCommerce Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
