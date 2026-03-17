"use client"

import { useState } from "react"
import { motion } from "motion/react"
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Search, 
  Filter, 
  ExternalLink,
  Bot,
  User,
  Zap,
  ChevronRight,
  Terminal,
  History
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const tasks = [
  { 
    id: "JOB-9021", 
    agent: "ContentGen Pro", 
    client: "Acme Corp", 
    task: "Generate 10 blog posts about AI in Web3", 
    status: "completed", 
    progress: 100, 
    date: "2 mins ago",
    logs: [
      { time: "14:02:11", message: "Task initialized", type: "info" },
      { time: "14:02:15", message: "Analyzing keywords: Web3, Blockchain, AI", type: "info" },
      { time: "14:03:45", message: "Drafting post 1: The intersection of AI and DAOs", type: "info" },
      { time: "14:05:12", message: "Drafting post 5: Predictive analytics in DeFi", type: "info" },
      { time: "14:08:30", message: "Finalizing all 10 posts", type: "info" },
      { time: "14:09:01", message: "Task completed successfully", type: "success" },
    ],
    history: [
      { event: "Created", time: "14:02:11", user: "Acme Corp" },
      { event: "Assigned", time: "14:02:12", user: "System" },
      { event: "Started", time: "14:02:15", user: "ContentGen Pro" },
      { event: "Finished", time: "14:09:01", user: "ContentGen Pro" },
    ]
  },
  { 
    id: "JOB-9020", 
    agent: "DevOps Bot", 
    client: "StartupX", 
    task: "Deploy Kubernetes cluster on Initia", 
    status: "in-progress", 
    progress: 65, 
    date: "1 hour ago",
    logs: [
      { time: "13:15:00", message: "Initializing cluster configuration", type: "info" },
      { time: "13:16:20", message: "Provisioning nodes on Initia network", type: "info" },
      { time: "13:20:45", message: "Node 1: Ready", type: "success" },
      { time: "13:21:10", message: "Node 2: Ready", type: "success" },
      { time: "13:25:00", message: "Installing control plane components", type: "info" },
      { time: "13:30:15", message: "Configuring networking (Calico)", type: "info" },
    ],
    history: [
      { event: "Created", time: "13:15:00", user: "StartupX" },
      { event: "Assigned", time: "13:15:05", user: "System" },
      { event: "Started", time: "13:15:10", user: "DevOps Bot" },
    ]
  },
  { 
    id: "JOB-9019", 
    agent: "ResearchAI", 
    client: "UniLab", 
    task: "Analyze 500 research papers on ZK-Proofs", 
    status: "in-progress", 
    progress: 30, 
    date: "3 hours ago",
    logs: [
      { time: "11:00:00", message: "Fetching papers from ArXiv API", type: "info" },
      { time: "11:15:00", message: "Downloaded 500 papers", type: "success" },
      { time: "11:16:00", message: "Starting semantic analysis", type: "info" },
      { time: "11:45:00", message: "Processed 150/500 papers", type: "info" },
    ],
    history: [
      { event: "Created", time: "11:00:00", user: "UniLab" },
      { event: "Assigned", time: "11:00:10", user: "System" },
      { event: "Started", time: "11:00:15", user: "ResearchAI" },
    ]
  },
  { 
    id: "JOB-9018", 
    agent: "ContentGen Pro", 
    client: "Global Media", 
    task: "Social media strategy for Q2", 
    status: "failed", 
    progress: 15, 
    date: "5 hours ago",
    logs: [
      { time: "09:00:00", message: "Task started", type: "info" },
      { time: "09:05:00", message: "Fetching market trends", type: "info" },
      { time: "09:10:00", message: "Error: API limit reached for TrendData API", type: "error" },
      { time: "09:10:05", message: "Retrying in 5 minutes...", type: "warning" },
      { time: "09:15:05", message: "Error: API limit reached. Task aborted.", type: "error" },
    ],
    history: [
      { event: "Created", time: "09:00:00", user: "Global Media" },
      { event: "Assigned", time: "09:00:05", user: "System" },
      { event: "Started", time: "09:00:10", user: "ContentGen Pro" },
      { event: "Failed", time: "09:15:05", user: "ContentGen Pro" },
    ]
  },
  { 
    id: "JOB-9017", 
    agent: "DevOps Bot", 
    client: "FinTech Inc", 
    task: "Security audit of smart contracts", 
    status: "completed", 
    progress: 100, 
    date: "8 hours ago",
    logs: [
      { time: "06:00:00", message: "Scanning contract source code", type: "info" },
      { time: "06:10:00", message: "Running static analysis (Slither)", type: "info" },
      { time: "06:20:00", message: "Checking for reentrancy vulnerabilities", type: "info" },
      { time: "06:30:00", message: "No critical vulnerabilities found", type: "success" },
      { time: "06:35:00", message: "Generating PDF report", type: "info" },
      { time: "06:40:00", message: "Task completed", type: "success" },
    ],
    history: [
      { event: "Created", time: "06:00:00", user: "FinTech Inc" },
      { event: "Assigned", time: "06:00:05", user: "System" },
      { event: "Started", time: "06:00:10", user: "DevOps Bot" },
      { event: "Finished", time: "06:40:00", user: "DevOps Bot" },
    ]
  },
]

export default function TasksPage() {
  const [selectedTask, setSelectedTask] = useState<typeof tasks[0] | null>(null)

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-1">Tasks & Activity</h1>
          <p className="text-white/40 text-sm">Monitor the real-time execution of your AI agents.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <Input 
              placeholder="Search tasks..." 
              className="pl-9 w-64 h-10 bg-white/5 border-white/5 focus:border-indigo-500/50 transition-all"
            />
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 border-white/5 bg-white/5">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Active Tasks", value: "12", icon: Activity, color: "text-indigo-400" },
          { label: "Completed Today", value: "48", icon: CheckCircle2, color: "text-emerald-400" },
          { label: "Failed Tasks", value: "2", icon: AlertCircle, color: "text-rose-400" },
        ].map((stat) => (
          <Card key={stat.label} className="glass-card p-6 border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-white/40 font-medium">{stat.label}</span>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <h3 className="text-3xl font-display font-bold">{stat.value}</h3>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card 
              className="glass-card p-6 border-white/5 hover:bg-white/[0.04] hover:border-indigo-500/30 transition-all group cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                <div className="flex items-center gap-4 min-w-[200px]">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                    <Bot className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">{task.agent}</h4>
                    <p className="text-[11px] text-white/40 font-mono">{task.id}</p>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <User className="w-3 h-3 text-white/20" />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-white/40">{task.client}</span>
                  </div>
                  <h3 className="text-sm font-medium truncate">{task.task}</h3>
                </div>

                <div className="w-full lg:w-48 space-y-2">
                  <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest">
                    <span className="text-white/40">Progress</span>
                    <span className="text-white/60">{task.progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${task.progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        task.status === "completed" ? "bg-emerald-500" : 
                        task.status === "failed" ? "bg-rose-500" : "bg-indigo-500"
                      )}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between lg:justify-end gap-6 min-w-[150px]">
                  <div className="flex flex-col items-end">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 mb-1",
                      task.status === "completed" ? "border-emerald-500/20 text-emerald-400 bg-emerald-400/5" :
                      task.status === "in-progress" ? "border-amber-500/20 text-amber-400 bg-amber-400/5" :
                      "border-rose-500/20 text-rose-400 bg-rose-400/5"
                    )}>
                      {task.status}
                    </Badge>
                    <span className="text-[10px] text-white/20 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.date}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:text-white group-hover:bg-white/5">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="p-8 rounded-3xl bg-indigo-600/5 border border-indigo-500/10 flex flex-col items-center text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <Zap className="w-6 h-6 text-indigo-400" />
        </div>
        <div className="max-w-md">
          <h3 className="text-xl font-display font-bold mb-2">Auto-Signing is Active</h3>
          <p className="text-sm text-white/60 leading-relaxed">
            Your agents are executing tasks autonomously using your active session. 
            No manual confirmation is required for these operations.
          </p>
        </div>
        <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10">
          View Session Logs
        </Button>
      </div>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedTask} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-w-2xl bg-[#050505] border-white/10 p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                <Bot className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{selectedTask?.agent}</DialogTitle>
                <DialogDescription className="text-indigo-400 font-mono text-xs">
                  {selectedTask?.id}
                </DialogDescription>
              </div>
              <Badge variant="outline" className={cn(
                "ml-auto text-[10px] font-bold uppercase tracking-widest px-2 py-0.5",
                selectedTask?.status === "completed" ? "border-emerald-500/20 text-emerald-400 bg-emerald-400/5" :
                selectedTask?.status === "in-progress" ? "border-amber-500/20 text-amber-400 bg-amber-400/5" :
                "border-rose-500/20 text-rose-400 bg-rose-400/5"
              )}>
                {selectedTask?.status}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white/40 font-bold uppercase tracking-widest">Task Description</p>
              <p className="text-sm text-white/80">{selectedTask?.task}</p>
            </div>
          </DialogHeader>

          <div className="p-6 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
            {/* Logs Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/40">
                <Terminal className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Execution Logs</h3>
              </div>
              <div className="bg-black/50 border border-white/5 rounded-xl p-4 font-mono text-xs space-y-2">
                {selectedTask?.logs.map((log, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-white/20 shrink-0">{log.time}</span>
                    <span className={cn(
                      log.type === "error" ? "text-rose-400" :
                      log.type === "success" ? "text-emerald-400" :
                      log.type === "warning" ? "text-amber-400" : "text-white/60"
                    )}>
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* History Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/40">
                <History className="w-4 h-4" />
                <h3 className="text-xs font-bold uppercase tracking-widest">Event History</h3>
              </div>
              <div className="space-y-3">
                {selectedTask?.history.map((event, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span className="text-sm font-medium">{event.event}</span>
                    </div>
                    <div className="flex items-center gap-4 text-[11px]">
                      <span className="text-white/40">{event.user}</span>
                      <span className="text-white/20">{event.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Meta Info */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Client</p>
                <div className="flex items-center gap-2">
                  <User className="w-3 h-3 text-indigo-400" />
                  <p className="text-sm font-medium">{selectedTask?.client}</p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">Last Updated</p>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <p className="text-sm font-medium">{selectedTask?.date}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
            <Button variant="outline" className="border-white/10 bg-white/5" onClick={() => setSelectedTask(null)}>
              Close
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <ExternalLink className="w-4 h-4 mr-2" />
              View on Explorer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
