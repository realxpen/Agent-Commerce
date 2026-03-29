"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  PlusCircle, 
  Wallet, 
  Settings, 
  HelpCircle, 
  ShieldCheck,
  ListTodo,
  Store,
  ArrowRightLeft,
  Layers3,
  ReceiptText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { BrandMark } from "@/components/layout/BrandMark"
import { Button } from "@/components/ui/button"
import { SessionApprovalCard } from "@/components/session"
import { WalletAccountCard } from "@/components/wallet/WalletAccountCard"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Agent", href: "/dashboard/create", icon: PlusCircle },
  { name: "Create Service", href: "/dashboard/services/new", icon: Layers3 },
  { name: "Treasury", href: "/dashboard/treasury", icon: Wallet },
  { name: "Bridge", href: "/dashboard/bridge", icon: ArrowRightLeft },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "My Orders", href: "/orders", icon: ReceiptText },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 border-r border-white/5 bg-[#050505] flex flex-col h-full">
      <div className="p-6">
        <BrandMark href="/" showNativeFeature surface="sidebar" className="group" />
      </div>

      <nav className="flex-1 px-4 space-y-1.5 mt-4">
        {navigation.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`))
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
        <SessionApprovalCard compact surface="sidebar" />

        <WalletAccountCard />

        <div className="flex items-center gap-1 pt-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-white/40 hover:text-white">
            <HelpCircle className="w-4.5 h-4.5" />
          </Button>
          <div className="flex h-9 w-9 items-center justify-center text-white/15">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  )
}
