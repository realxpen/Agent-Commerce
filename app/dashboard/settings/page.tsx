"use client"

import { 
  User, 
  Wallet, 
  Shield, 
  Zap, 
  Bell, 
  CreditCard, 
  Key, 
  LogOut,
  ExternalLink,
  Bot,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "wallet", label: "Wallet & Session", icon: Wallet },
  { id: "security", label: "Security", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "api", label: "API Keys", icon: Key },
]

export default function SettingsPage() {
  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-1">Settings</h1>
          <p className="text-white/40 text-sm">Manage your account and platform preferences.</p>
        </div>
        <Button variant="outline" className="border-rose-500/20 text-rose-400 bg-rose-400/5 hover:bg-rose-400/10">
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect Wallet
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-1">
          {sections.map((section) => (
            <Button
              key={section.id}
              variant="ghost"
              className={cn(
                "w-full justify-start h-11 px-4 rounded-xl text-sm font-medium transition-all group",
                section.id === "wallet" 
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <section.icon className={cn(
                "w-4.5 h-4.5 mr-3 transition-colors",
                section.id === "wallet" ? "text-indigo-400" : "text-white/20 group-hover:text-white/60"
              )} />
              {section.label}
            </Button>
          ))}
        </div>

        <div className="lg:col-span-3 space-y-8">
          <Card className="glass-card p-8 border-white/5 space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-display font-bold mb-1">Wallet & Session</h2>
                  <p className="text-sm text-white/40">Manage your connected wallet and auto-signing session.</p>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
                  Active Session
                </Badge>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">Connected Wallet</label>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600"></div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">realxpens.init</span>
                        <span className="text-[11px] text-white/40 font-mono">0x71C...9A23</span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-white/20 hover:text-white">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-white/40">Session Duration</label>
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">24 Hours</span>
                      <span className="text-[11px] text-white/40">Expires in 18h 42m</span>
                    </div>
                    <Button variant="ghost" className="h-8 text-[11px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300">
                      Extend
                    </Button>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-indigo-600/5 border border-indigo-500/20 space-y-4">
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-bold">Auto-Signing Permissions</h3>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">
                  Your current session allows agents to execute transactions up to 
                  <span className="text-white font-bold mx-1">10.0 INIT</span> 
                  per operation without manual confirmation.
                </p>
                <div className="flex items-center gap-4">
                  <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 h-9 text-xs">
                    Revoke Session
                  </Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 h-9 text-xs">
                    Modify Limits
                  </Button>
                </div>
              </div>
            </div>

            <div className="h-px w-full bg-white/5"></div>

            <div className="space-y-6">
              <h2 className="text-xl font-display font-bold">Security Preferences</h2>
              <div className="space-y-4">
                {[
                  { label: "Two-Factor Authentication", desc: "Require a second factor for large withdrawals.", active: true },
                  { label: "IP Whitelisting", desc: "Only allow dashboard access from trusted IPs.", active: false },
                  { label: "Transaction Notifications", desc: "Get notified for every on-chain operation.", active: true },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                    <div>
                      <h4 className="text-sm font-medium">{item.label}</h4>
                      <p className="text-[11px] text-white/40">{item.desc}</p>
                    </div>
                    <div className={cn(
                      "w-10 h-5 rounded-full relative transition-colors cursor-pointer",
                      item.active ? "bg-indigo-600" : "bg-white/10"
                    )}>
                      <div className={cn(
                        "w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all",
                        item.active ? "right-0.75" : "left-0.75"
                      )}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button variant="ghost" className="text-white/40 hover:text-white">
                Cancel
              </Button>
              <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-[0_0_20px_rgba(79,70,229,0.4)]">
                Save Changes
              </Button>
            </div>
          </Card>

          <Card className="glass-card p-8 border-white/5 space-y-6">
            <div className="flex items-center gap-3">
              <Bot className="w-6 h-6 text-indigo-400" />
              <h2 className="text-xl font-display font-bold">Platform Status</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: "API", status: "Operational" },
                { label: "Indexer", status: "Operational" },
                { label: "Bridge", status: "Operational" },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <span className="text-xs text-white/60">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{item.status}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
