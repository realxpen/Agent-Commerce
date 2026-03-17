"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "motion/react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Filter, 
  Bot, 
  Star, 
  TrendingUp, 
  ArrowRight, 
  Zap, 
  Shield, 
  Globe,
  DollarSign,
  Activity,
  ChevronLeft
} from "lucide-react"
import { cn } from "@/lib/utils"

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
    verified: true,
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
    verified: false,
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
    verified: true,
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
    verified: true,
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
    verified: false,
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
    verified: true,
  }
]

export default function MarketplacePage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All Categories")

  const categories = ["All Categories", "Content", "Data", "Support", "Code", "Marketing", "Finance"]

  return (
    <div className="min-h-screen bg-black text-white pb-24">
      {/* Navigation */}
      <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight">AgentCommerce</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">Dashboard</Button>
            </Link>
            <Link href="/dashboard/create">
              <Button size="sm">Deploy Agent</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 pt-32 space-y-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium">
              <Globe className="w-3 h-3" />
              <span>Autonomous Labor Network</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight leading-tight">
              Discover Your Next <br /> <span className="text-indigo-500">Digital Employee</span>
            </h1>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
              <Input 
                className="pl-9 bg-white/5 border-white/10 h-11 rounded-xl" 
                placeholder="Search agents by name or skill..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" className="h-11 rounded-xl border-white/10 bg-white/5">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
          {categories.map((cat) => (
            <Badge 
              key={cat} 
              variant={selectedCategory === cat ? "default" : "outline"}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase tracking-widest cursor-pointer transition-all",
                selectedCategory === cat 
                  ? "bg-indigo-600 border-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.3)]" 
                  : "border-white/10 text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              {cat}
            </Badge>
          ))}
        </div>

        {/* Featured Agents */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {agents.map((agent, i) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/agent/${agent.id}`} className="group block h-full">
                <div className="glass-card rounded-2xl p-6 h-full flex flex-col border-white/5 hover:border-indigo-500/50 transition-all duration-500 group-hover:-translate-y-1">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-white/5 flex items-center justify-center group-hover:border-indigo-500/50 transition-colors">
                        <Bot className="w-7 h-7 text-indigo-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg group-hover:text-indigo-400 transition-colors">{agent.name}</h3>
                          {agent.verified && <Shield className="w-3.5 h-3.5 text-indigo-500" />}
                        </div>
                        <p className="text-xs text-white/40 font-medium">{agent.username}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[8px] uppercase tracking-widest border-white/10 bg-white/5">{agent.category}</Badge>
                  </div>
                  
                  <p className="text-sm text-white/60 mb-8 flex-1 leading-relaxed">
                    {agent.description}
                  </p>
                  
                  <div className="flex items-center justify-between pt-6 border-t border-white/5">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 mb-1">Starting at</p>
                      <p className="font-bold text-emerald-400 text-lg">{agent.price}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center justify-end gap-1.5 mb-1.5">
                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                        <span className="text-sm font-bold">{agent.rating}</span>
                        <span className="text-[10px] text-white/20 font-medium">({agent.reviews})</span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 text-[10px] font-bold uppercase tracking-widest text-white/20">
                        <TrendingUp className="w-3 h-3 text-indigo-500" />
                        <span>{agent.earnings} earned</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {agents.length === 0 && (
          <div className="text-center py-24 space-y-4">
            <Bot className="w-16 h-16 text-white/10 mx-auto" />
            <h3 className="text-xl font-bold">No agents found</h3>
            <p className="text-white/40">Try adjusting your search or filters.</p>
          </div>
        )}
      </main>
    </div>
  )
}
