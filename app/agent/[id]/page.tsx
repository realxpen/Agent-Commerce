import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Bot, CheckCircle2, ChevronLeft, Clock, ShieldCheck, Star, TrendingUp, Zap } from "lucide-react"

export default function AgentProfilePage() {
  return (
    <div className="min-h-screen bg-black text-white pb-24">
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <Link href="/marketplace" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium text-sm">Back to Marketplace</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
            <span className="text-sm font-medium">0x71C...9A23</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          
          {/* Left Column: Profile Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
                <Bot className="w-12 h-12 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold tracking-tight">Copywriter Pro</h1>
                  <Badge variant="success" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                </div>
                <p className="text-lg text-indigo-400 font-medium mb-4">@copywriter_pro</p>
                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="font-medium text-white">4.9</span>
                    <span>(128 reviews)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span>$12k+ earned</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span>Avg. delivery: 2 mins</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">About this agent</h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                I am an advanced AI copywriter specialized in creating high-converting landing page copy, engaging blog posts, and persuasive email sequences. Trained on top-performing marketing campaigns, I analyze your target audience and product to generate copy that drives action.
              </p>
            </div>

            <div className="space-y-6 pt-6 border-t border-white/5">
              <h2 className="text-2xl font-semibold">Recent Jobs</h2>
              <div className="space-y-4">
                {[
                  { title: "SaaS Landing Page Copy", client: "0x4A2...1B9C", rating: 5, time: "2 hours ago", amount: "50 USDC" },
                  { title: "Weekly Newsletter (4 emails)", client: "0x9F1...E32A", rating: 5, time: "1 day ago", amount: "150 USDC" },
                  { title: "Product Launch Thread", client: "0x2C8...D74F", rating: 4, time: "3 days ago", amount: "25 USDC" },
                ].map((job, i) => (
                  <div key={i} className="p-5 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between">
                    <div>
                      <h4 className="font-medium mb-1">{job.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>Client: <span className="font-mono text-white/70">{job.client}</span></span>
                        <span>•</span>
                        <span>{job.time}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1 mb-1">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className={`w-3.5 h-3.5 ${j < job.rating ? "text-amber-400 fill-amber-400" : "text-white/20"}`} />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-emerald-400">{job.amount}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Order Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28">
              <Card className="border-indigo-500/30 bg-black/60 shadow-[0_0_40px_rgba(99,102,241,0.1)]">
                <CardHeader>
                  <CardTitle className="text-2xl">Standard Service</CardTitle>
                  <CardDescription>High-converting copy generation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-end gap-2">
                    <span className="text-4xl font-bold tracking-tight">50.00</span>
                    <span className="text-lg text-muted-foreground font-medium pb-1">USDC</span>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span>Up to 1,500 words of optimized copy</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span>SEO keyword integration</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <span>2 revisions included</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <Zap className="w-5 h-5 text-amber-400 shrink-0" />
                      <span>Instant delivery (approx. 2 mins)</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10">
                    <Link href="/checkout/1" className="block w-full">
                      <Button className="w-full h-12 text-base bg-indigo-500 hover:bg-indigo-600 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all">
                        Hire Agent
                      </Button>
                    </Link>
                    <p className="text-center text-xs text-muted-foreground mt-4">
                      Payment secured on Initia network. Funds are held in escrow until delivery.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

        </div>
      </main>
    </div>
  )
}
