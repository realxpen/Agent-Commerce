"use client"

import { motion } from "motion/react"
import { 
  Wallet, 
  ArrowUpRight, 
  TrendingUp, 
  DollarSign, 
  CreditCard,
  Download,
  Filter,
  Search,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const stats = [
  { label: "Available Balance", value: "$42,850.00", change: "+12.5%", icon: Wallet, color: "text-emerald-400" },
  { label: "Pending Revenue", value: "$12,400.00", change: "+5.2%", icon: DollarSign, color: "text-amber-400" },
  { label: "Total Withdrawn", value: "$156,200.00", change: "+18.3%", icon: ArrowUpRight, color: "text-indigo-400" },
  { label: "Active Escrows", value: "14", change: "", icon: CreditCard, color: "text-purple-400" },
]

const transactions = [
  { id: "TX-9021", type: "income", agent: "ContentGen Pro", client: "Acme Corp", amount: "+$1,200.00", status: "completed", date: "2 mins ago" },
  { id: "TX-9020", type: "withdrawal", agent: "System", client: "Main Wallet", amount: "-$5,000.00", status: "processing", date: "1 hour ago" },
  { id: "TX-9019", type: "income", agent: "DevOps Bot", client: "StartupX", amount: "+$850.00", status: "completed", date: "3 hours ago" },
  { id: "TX-9018", type: "income", agent: "ContentGen Pro", client: "Global Media", amount: "+$2,400.00", status: "completed", date: "5 hours ago" },
  { id: "TX-9017", type: "escrow", agent: "ResearchAI", client: "UniLab", amount: "$3,000.00", status: "held", date: "8 hours ago" },
]

export default function TreasuryPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-1">Treasury</h1>
          <p className="text-white/40 text-sm">Manage your agent revenue and on-chain assets.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-white/5 bg-white/5 hover:bg-white/10">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
            Withdraw Funds
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card p-6 border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                  <stat.icon className="w-5 h-5" />
                </div>
                {stat.change && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
                    {stat.change}
                  </span>
                )}
              </div>
              <p className="text-sm text-white/40 font-medium mb-1">{stat.label}</p>
              <h3 className="text-2xl font-display font-bold">{stat.value}</h3>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-card border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-display font-bold">Recent Transactions</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <Input 
                  placeholder="Search transactions..." 
                  className="pl-9 w-64 h-9 bg-white/5 border-white/5 focus:border-indigo-500/50 transition-all text-sm"
                />
              </div>
              <Button variant="outline" size="icon" className="h-9 w-9 border-white/5 bg-white/5">
                <Filter className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold uppercase tracking-widest text-white/20 border-b border-white/5">
                  <th className="px-6 py-4">Transaction ID</th>
                  <th className="px-6 py-4">Agent / Client</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-white/60">{tx.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{tx.agent}</span>
                        <span className="text-[11px] text-white/40">{tx.client}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-sm font-bold",
                        tx.type === "income" ? "text-emerald-400" : tx.type === "withdrawal" ? "text-rose-400" : "text-white"
                      )}>
                        {tx.amount}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5",
                        tx.status === "completed" ? "border-emerald-500/20 text-emerald-400 bg-emerald-400/5" :
                        tx.status === "processing" ? "border-amber-500/20 text-amber-400 bg-amber-400/5" :
                        "border-white/10 text-white/40 bg-white/5"
                      )}>
                        {tx.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-white/40">{tx.date}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white group-hover:bg-white/5">
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-white/5 text-center">
            <Button variant="ghost" className="text-xs text-white/40 hover:text-white">
              View all transactions
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card p-6 border-white/5">
            <h2 className="text-lg font-display font-bold mb-4">Revenue by Agent</h2>
            <div className="space-y-4">
              {[
                { name: "ContentGen Pro", amount: "$24,500", percentage: 65, color: "bg-indigo-500" },
                { name: "DevOps Bot", amount: "$12,350", percentage: 25, color: "bg-purple-500" },
                { name: "ResearchAI", amount: "$6,000", percentage: 10, color: "bg-emerald-500" },
              ].map((agent) => (
                <div key={agent.name} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/60">{agent.name}</span>
                    <span className="font-bold">{agent.amount}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${agent.percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn("h-full rounded-full", agent.color)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-card p-6 border-white/5 bg-indigo-600/5">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              <h2 className="text-lg font-display font-bold">Auto-Signing Yield</h2>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-4">
              Your agents are currently utilizing auto-signing to reduce transaction overhead. 
              Estimated savings this month:
            </p>
            <div className="text-3xl font-display font-bold text-indigo-400 mb-2">
              $142.50
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
              Saved in network fees
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
