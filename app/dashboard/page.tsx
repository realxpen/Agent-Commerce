"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Bot, 
  Activity, 
  DollarSign, 
  Users, 
  ChevronRight,
  Zap
} from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { useSession } from "@/components/providers/SessionProvider"

export default function DashboardPage() {
  const { isSessionActive } = useSession()
  const [activities, setActivities] = useState([
    { id: 1, agent: "Copywriter AI", action: "Completed blog post", amount: "+$150.00", time: "2m ago", status: "success" },
    { id: 2, agent: "Support Bot", action: "Resolved ticket #492", amount: "+$5.00", time: "15m ago", status: "success" },
    { id: 3, agent: "Data Scraper", action: "Delivered CSV export", amount: "+$45.00", time: "1h ago", status: "success" },
    { id: 4, agent: "Copywriter AI", action: "Completed landing page copy", amount: "+$300.00", time: "3h ago", status: "success" },
    { id: 5, agent: "Financial Analyst", action: "Report generation failed", amount: "$0.00", time: "5h ago", status: "failed" },
  ])

  // Simulate autonomous activity
  useEffect(() => {
    const interval = setInterval(() => {
      const newActivity = {
        id: Date.now(),
        agent: ["Copywriter AI", "Support Bot", "Data Scraper", "Financial Analyst"][Math.floor(Math.random() * 4)],
        action: ["Processed payment", "Updated treasury", "Completed task", "Signed transaction"][Math.floor(Math.random() * 4)],
        time: "Just now",
        status: Math.random() > 0.1 ? "success" : "failed",
        amount: `+$${(Math.random() * 100).toFixed(2)}`
      }
      setActivities(prev => [newActivity, ...prev.slice(0, 4)])
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Overview</h1>
          <p className="text-white/40 mt-1">Monitor your autonomous digital workforce and revenue streams.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="h-9 border-white/5 bg-white/5">
            Last 30 Days
          </Button>
          <Button size="sm" className="h-9">
            <Zap className="w-4 h-4 mr-2" />
            Deploy Agent
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Total Revenue", value: "$45,231.89", icon: DollarSign, trend: "+20.1%", trendUp: true, sub: "Settled in USDC" },
          { label: "Active Agents", value: "12", icon: Bot, trend: "+2", trendUp: true, sub: "8 running tasks" },
          { label: "Tasks Completed", value: "573", icon: Activity, trend: "+12%", trendUp: true, sub: "99.8% success rate" },
          { label: "Unique Clients", value: "124", icon: Users, trend: "+8", trendUp: true, sub: "Since launch" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card border-white/5 hover:border-white/10 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-medium text-white/40 uppercase tracking-wider">{stat.label}</CardTitle>
                <stat.icon className="h-4 w-4 text-white/20" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{stat.value}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className={stat.trendUp ? "text-emerald-400 text-xs font-medium" : "text-rose-400 text-xs font-medium"}>
                    {stat.trend}
                  </span>
                  <span className="text-[10px] text-white/20">{stat.sub}</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Revenue Chart Mockup */}
        <Card className="lg:col-span-4 glass-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Revenue Performance</CardTitle>
              <CardDescription className="text-white/40">Daily earnings across all active agents.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                <span className="text-[10px] text-white/40 font-medium uppercase">Revenue</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px] flex items-end gap-2 pt-10">
            {[40, 30, 45, 70, 65, 80, 100, 85, 90, 110, 95, 120, 105, 130].map((h, i) => (
              <div key={i} className="flex-1 bg-indigo-500/10 rounded-t-lg relative group transition-all duration-500 hover:bg-indigo-500/20">
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ duration: 1, delay: i * 0.05 }}
                  className="absolute bottom-0 w-full bg-indigo-500 rounded-t-lg shadow-[0_0_20px_rgba(79,70,229,0.2)]"
                ></motion.div>
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[10px] font-bold px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  ${h * 10}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3 glass-card border-white/5">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg font-bold">Live Activity</CardTitle>
                {isSessionActive && (
                  <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] animate-pulse">
                    Auto-Signing
                  </Badge>
                )}
              </div>
              <CardDescription className="text-white/40">Real-time agent task stream.</CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-white/40">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <AnimatePresence mode="popLayout">
                {activities.map((item) => (
                  <motion.div 
                    key={item.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center group-hover:border-white/10 transition-colors">
                        <Bot className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold leading-none">{item.agent}</p>
                        <p className="text-xs text-white/40 mt-1.5">{item.action}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={item.status === "success" ? "text-sm font-bold text-emerald-400" : "text-sm font-bold text-rose-400"}>
                        {item.amount}
                      </p>
                      <p className="text-[10px] text-white/20 mt-1 font-medium uppercase">{item.time}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deployment Status */}
      <Card className="glass-card border-white/5">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Agent Deployment Status</CardTitle>
          <CardDescription className="text-white/40">
            Real-time status of your AI agent deployments on the Initia network.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Copywriter AI", status: "Deployed", version: "v1.2.0", time: "2h ago", health: 100 },
              { name: "Support Bot", status: "Deploying", version: "v1.0.5", time: "Just now", health: 45 },
              { name: "Data Scraper", status: "Failed", version: "v2.1.0", time: "1h ago", health: 0 },
            ].map((agent, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{agent.name}</p>
                    <p className="text-[10px] text-white/40 font-medium">Version {agent.version}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge 
                    variant={
                      agent.status === "Deployed" ? "success" : 
                      agent.status === "Deploying" ? "warning" : 
                      "destructive"
                    }
                    className="text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider"
                  >
                    {agent.status}
                  </Badge>
                  <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000",
                        agent.health > 80 ? "bg-emerald-500" : agent.health > 0 ? "bg-amber-500" : "bg-rose-500"
                      )}
                      style={{ width: `${agent.health}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
