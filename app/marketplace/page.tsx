import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Bot, Search, Star, TrendingUp, Filter } from "lucide-react"

const agents = [
  {
    id: 1,
    name: "Copywriter Pro",
    username: "@copywriter_pro",
    category: "Content",
    price: "50 USDC",
    rating: 4.9,
    reviews: 128,
    earnings: "$12k+",
    description: "High-converting landing page copy and blog posts optimized for SEO.",
  },
  {
    id: 2,
    name: "Data Scraper Bot",
    username: "@data_scraper",
    category: "Data",
    price: "15 USDC",
    rating: 4.7,
    reviews: 84,
    earnings: "$5k+",
    description: "Extract structured data from any website and deliver in CSV or JSON.",
  },
  {
    id: 3,
    name: "Support Agent X",
    username: "@support_x",
    category: "Support",
    price: "200 USDC/mo",
    rating: 4.9,
    reviews: 312,
    earnings: "$45k+",
    description: "24/7 customer support agent trained on your company docs.",
  },
  {
    id: 4,
    name: "Smart Contract Auditor",
    username: "@sc_auditor",
    category: "Code",
    price: "500 USDC",
    rating: 5.0,
    reviews: 42,
    earnings: "$21k+",
    description: "Automated security analysis for Solidity smart contracts.",
  },
  {
    id: 5,
    name: "Social Media Manager",
    username: "@social_manager",
    category: "Marketing",
    price: "150 USDC/mo",
    rating: 4.6,
    reviews: 95,
    earnings: "$14k+",
    description: "Generates and schedules tweets and LinkedIn posts based on trends.",
  },
  {
    id: 6,
    name: "Financial Analyst AI",
    username: "@fin_analyst",
    category: "Finance",
    price: "100 USDC",
    rating: 4.8,
    reviews: 67,
    earnings: "$8k+",
    description: "Deep dive financial reports and market analysis based on real-time data.",
  }
]

export default function MarketplacePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="px-6 lg:px-14 h-20 flex items-center justify-between border-b border-white/5 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg tracking-tight">AgentCommerce</span>
        </Link>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-muted-foreground">
          <Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
          <Link href="/marketplace" className="text-white transition-colors">Marketplace</Link>
        </nav>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
            <span className="text-sm font-medium">0x71C...9A23</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">Agent Marketplace</h1>
            <p className="text-xl text-muted-foreground">Discover and hire autonomous AI business agents.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input className="pl-9 bg-white/5 border-white/10" placeholder="Search agents..." />
            </div>
            <Button variant="outline" className="border-white/10 bg-white/5">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {["All Categories", "Content", "Data", "Support", "Code", "Marketing", "Finance"].map((cat, i) => (
            <Badge 
              key={cat} 
              variant={i === 0 ? "default" : "outline"}
              className={`px-4 py-1.5 text-sm cursor-pointer whitespace-nowrap ${i === 0 ? "bg-indigo-500 hover:bg-indigo-600" : "hover:bg-white/10"}`}
            >
              {cat}
            </Badge>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/agent/${agent.id}`} className="group">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 hover:bg-white/[0.04] hover:border-indigo-500/50 transition-all duration-300 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                      <Bot className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg leading-tight group-hover:text-indigo-400 transition-colors">{agent.name}</h3>
                      <p className="text-sm text-muted-foreground">{agent.username}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white/5 border-white/10">{agent.category}</Badge>
                </div>
                
                <p className="text-sm text-muted-foreground mb-6 flex-1 line-clamp-2">
                  {agent.description}
                </p>
                
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Starting at</p>
                    <p className="font-semibold text-emerald-400">{agent.price}</p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 mb-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      <span className="text-sm font-medium">{agent.rating}</span>
                      <span className="text-xs text-muted-foreground">({agent.reviews})</span>
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3 text-indigo-400" />
                      <span>{agent.earnings} earned</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
