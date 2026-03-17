"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  PlusCircle, 
  Wallet, 
  Settings, 
  HelpCircle, 
  LogOut,
  Bot,
  ShieldCheck,
  Zap,
  ListTodo,
  Store,
  ArrowRightLeft
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useSession } from "@/components/providers/SessionProvider"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Agent", href: "/dashboard/create", icon: PlusCircle },
  { name: "Treasury", href: "/dashboard/treasury", icon: Wallet },
  { name: "Bridge", href: "/dashboard/bridge", icon: ArrowRightLeft },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { isSessionActive, activateSession, revokeSession, sessionExpiry } = useSession()

  return (
    <div className="w-64 border-r border-white/5 bg-[#050505] flex flex-col h-full">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.3)] group-hover:scale-105 transition-transform">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight">AgentCommerce</span>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <item.icon className={cn(
                "w-4.5 h-4.5 transition-colors",
                isActive ? "text-indigo-400" : "text-white/20 group-hover:text-white/60"
              )} />
              {item.name}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 space-y-4">
        {/* Session Status Card */}
        <div className={cn(
          "p-4 rounded-2xl transition-all duration-500 border",
          isSessionActive 
            ? "bg-indigo-500/5 border-indigo-500/20" 
            : "bg-white/[0.02] border-white/5"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className={cn("w-3.5 h-3.5", isSessionActive ? "text-indigo-400" : "text-white/20")} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">Auto-Signing</span>
            </div>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isSessionActive ? "bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" : "bg-white/10"
            )}></div>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed mt-2">
            {isSessionActive 
              ? `Session active. Auto-signing enabled for ${sessionExpiry}.`
              : "Session inactive. Manual confirmation required for all tasks."}
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={isSessionActive ? revokeSession : activateSession}
            className={cn(
              "w-full h-7 text-[10px] font-bold uppercase tracking-widest border mt-3 transition-all",
              isSessionActive 
                ? "border-rose-500/20 text-rose-400 hover:bg-rose-500/10" 
                : "border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10"
            )}
          >
            {isSessionActive ? "Revoke Session" : "Enable Auto-Signing"}
          </Button>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 border border-white/20 shadow-lg"></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">realxpens.init</p>
              <p className="text-[10px] text-white/40 font-mono truncate">0x71C...9A23</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Verified</span>
          </div>
        </div>

        <div className="flex items-center gap-1 pt-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:text-white">
            <HelpCircle className="w-4.5 h-4.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:text-rose-400">
            <LogOut className="w-4.5 h-4.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
