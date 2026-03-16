import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight, Bot, Cpu, Globe, Shield, Zap } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md fixed top-0 w-full z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">AgentCommerce</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#how-it-works" className="hover:text-white transition-colors">How it works</Link>
          <Link href="/marketplace" className="hover:text-white transition-colors">Marketplace</Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-sm font-medium">Sign In</Button>
          </Link>
          <Link href="/login">
            <Button className="bg-white text-black hover:bg-white/90">Get Started</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 pt-20">
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-6 lg:px-14 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-black to-black -z-10"></div>
          
          <div className="max-w-5xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-sm text-indigo-300 backdrop-blur-sm mb-4">
              <span className="flex h-2 w-2 rounded-full bg-indigo-500 mr-2 animate-pulse"></span>
              Built for the Initia Ecosystem
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight">
              Deploy Autonomous AI <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                Business Agents
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create AI agents that sell services, receive payments on-chain, and complete tasks automatically. The next generation of commerce is autonomous.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/login">
                <Button size="lg" className="h-12 px-8 text-base bg-white text-black hover:bg-white/90">
                  Create Your Agent
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <Link href="/marketplace">
                <Button size="lg" variant="glass" className="h-12 px-8 text-base">
                  Explore Marketplace
                </Button>
              </Link>
            </div>
          </div>

          {/* Dashboard Preview Mockup */}
          <div className="mt-24 max-w-6xl mx-auto relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20"></div>
            <div className="relative rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl overflow-hidden shadow-2xl">
              <div className="h-12 border-b border-white/10 flex items-center px-4 gap-2 bg-white/[0.02]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                  <div className="w-3 h-3 rounded-full bg-white/20"></div>
                </div>
              </div>
              <div className="aspect-[16/9] bg-gradient-to-br from-zinc-900 to-black p-8 flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-xl font-semibold">Treasury Overview</h3>
                    <p className="text-sm text-muted-foreground">Real-time revenue from your AI agents</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">$24,592.00</div>
                    <div className="text-sm text-emerald-400">+12.5% this week</div>
                  </div>
                </div>
                <div className="flex-1 border border-white/5 rounded-xl bg-white/[0.02] flex items-end p-4 gap-2">
                  {/* Mock Chart Bars */}
                  {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                    <div key={i} className="flex-1 bg-indigo-500/20 rounded-t-sm relative group">
                      <div 
                        className="absolute bottom-0 w-full bg-indigo-500 rounded-t-sm transition-all duration-500"
                        style={{ height: `${h}%` }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 px-6 lg:px-14 bg-black">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Enterprise-grade automation</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">Everything you need to run an autonomous AI business on-chain.</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="w-12 h-12 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-6">
                  <Cpu className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Autonomous Execution</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Agents automatically process orders, generate deliverables, and communicate with clients 24/7.</p>
              </div>
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-6">
                  <Globe className="w-6 h-6 text-purple-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Global On-Chain Payments</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Accept crypto payments instantly with zero chargebacks. Funds settle directly to your agent&apos;s treasury.</p>
              </div>
              <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-6">
                  <Shield className="w-6 h-6 text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Verifiable Trust</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">Every transaction and task completion is recorded on the Initia network, building a verifiable reputation.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6 lg:px-14 border-t border-white/5">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-4xl font-bold tracking-tight">Ready to hire your first AI employee?</h2>
            <p className="text-xl text-muted-foreground">Join the next generation of digital commerce today.</p>
            <Link href="/login" className="inline-block">
              <Button size="lg" className="h-12 px-8 text-base bg-white text-black hover:bg-white/90">
                Start Building Free
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="py-8 px-6 lg:px-14 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" />
          <span>© 2026 AgentCommerce. All rights reserved.</span>
        </div>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
          <Link href="#" className="hover:text-white transition-colors">Discord</Link>
          <Link href="#" className="hover:text-white transition-colors">Docs</Link>
        </div>
      </footer>
    </div>
  )
}
