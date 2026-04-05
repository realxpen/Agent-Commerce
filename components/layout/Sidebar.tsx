"use client"

import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
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
  FolderOpen,
  CheckCircle2,
  Sparkles,
  Wallet2,
  Zap,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { AppLink } from "@/components/layout/AppLink"
import { BrandMark } from "@/components/layout/BrandMark"
import { Button } from "@/components/ui/button"
import { useSessionApproval } from "@/hooks/session"
import { useBackendAuth } from "@/hooks/auth"
import { useWalletConnectionFlow } from "@/hooks/wallet"

const INITIA_WALLET_DOCS_URL = "https://docs.initia.xyz/home/tools/wallet"

const navigation = [
  { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Agent", href: "/dashboard/create", icon: PlusCircle },
  { name: "Create Service", href: "/dashboard/services/new", icon: Layers3 },
  { name: "Deliverables", href: "/dashboard/deliverables", icon: FolderOpen },
  { name: "Treasury", href: "/dashboard/treasury", icon: Wallet },
  { name: "Bridge", href: "/dashboard/bridge", icon: ArrowRightLeft },
  { name: "Tasks", href: "/dashboard/tasks", icon: ListTodo },
  { name: "Marketplace", href: "/marketplace", icon: Store },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

function SidebarSessionCard() {
  const session = useSessionApproval({ surface: "sidebar" })

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-indigo-400" />
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
              Auto-Signing
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-white/55">
            {session.isSessionActive
              ? `Smooth repeat actions are active for ${session.sessionRemainingLabel}.`
              : "Session inactive. Manual confirmation required for wallet-backed actions."}
          </p>
        </div>

        <div
          className={cn(
            "rounded-full px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em]",
            session.isSessionActive
              ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
              : "border border-white/10 bg-white/[0.04] text-white/40",
          )}
        >
          {session.isSessionActive ? "Ready now" : "Approval needed"}
        </div>
      </div>

      <Button
        className="mt-4 h-8 w-full rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200 hover:bg-indigo-500/15"
        disabled={session.primaryActionDisabled}
        onClick={() => void session.onPrimaryAction()}
      >
        {session.isPending || session.isRevoking ? (
          <>
            <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
            Working
          </>
        ) : (
          session.primaryActionLabel
        )}
      </Button>
    </div>
  )
}

function SidebarWalletCard() {
  const wallet = useWalletConnectionFlow()
  const auth = useBackendAuth()

  if (!wallet.isConnected) {
    return (
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg">
            <Wallet2 className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-white">No wallet connected</p>
            <p className="mt-1 text-[10px] text-white/40">
              Connect to unlock creator actions
            </p>
          </div>
        </div>

        <Button
          className="mt-4 h-8 w-full rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          onClick={() => void wallet.connect()}
          disabled={wallet.isBusy}
        >
          {wallet.isBusy ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Connecting
            </>
          ) : (
            "Connect Wallet"
          )}
        </Button>
      </div>
    )
  }

  const verified = auth.isAuthenticated && wallet.isOnExpectedAppchain

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 shadow-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">
            {wallet.displayName}
          </p>
          {wallet.resolvedUsername ? (
            <div className="mt-1 flex items-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                {wallet.username ? ".init" : "resolved"}
              </span>
              <span className="truncate text-[10px] font-medium text-emerald-200">
                {wallet.resolvedInitUsername}
              </span>
            </div>
          ) : null}
          <p className="mt-1 truncate font-mono text-[10px] text-white/40">
            {wallet.shortAddress ?? wallet.initiaAddress ?? wallet.hexAddress}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        {verified ? (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">
              Verified
            </span>
          </>
        ) : (
          <>
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-300">
              {auth.isAuthenticated ? "Connected" : "Sync needed"}
            </span>
          </>
        )}
      </div>

      {wallet.isUsernameLoading ? (
        <div className="mt-3 rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-200">
            Checking usernames
          </p>
          <p className="mt-1 text-[11px] leading-5 text-indigo-100/70">
            Resolving this wallet against the live Initia usernames registry.
          </p>
        </div>
      ) : null}

      {!wallet.resolvedUsername && !wallet.isUsernameLoading ? (
        <div className="mt-3 rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
            No Init username yet
          </p>
          <p className="mt-1 text-[11px] leading-5 text-amber-100/70">
            Connect a wallet profile with a live `.init` name, then reconnect to
            show your handle here.
          </p>
          <a
            className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 transition hover:text-white"
            href={INITIA_WALLET_DOCS_URL}
            rel="noreferrer"
            target="_blank"
          >
            Learn how
          </a>
        </div>
      ) : null}

      {!auth.isAuthenticated ? (
        <Button
          className="mt-4 h-8 w-full rounded-xl border border-white/10 bg-white/5 text-[10px] font-bold uppercase tracking-[0.18em] text-white hover:bg-white/10"
          onClick={() => void auth.signIn()}
          disabled={auth.isSigningIn}
        >
          {auth.isSigningIn ? (
            <>
              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              Unlocking
            </>
          ) : (
            "Unlock Backend Sync"
          )}
        </Button>
      ) : null}
    </div>
  )
}

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
            <AppLink
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
            </AppLink>
          )
        })}
      </nav>

      <div className="p-4 space-y-4">
        <SidebarSessionCard />

        <SidebarWalletCard />

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
