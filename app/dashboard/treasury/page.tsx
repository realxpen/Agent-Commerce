import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowDownRight, ArrowUpRight, DollarSign, Download, Wallet } from "lucide-react"

export default function TreasuryPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Treasury</h1>
          <p className="text-muted-foreground mt-2">Manage your earnings and payouts.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="border-white/10 bg-white/5">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button className="bg-indigo-500 hover:bg-indigo-600 text-white">
            Withdraw Funds
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="bg-indigo-500/10 border-indigo-500/30">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-indigo-300">Available Balance</CardTitle>
            <Wallet className="h-4 w-4 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">$12,450.00</div>
            <p className="text-xs text-indigo-300/70 mt-1">Ready to withdraw</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locked Funds (Escrow)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$3,200.00</div>
            <p className="text-xs text-muted-foreground mt-1">Pending task completion</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earnings</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$45,231.89</div>
            <p className="text-xs text-emerald-500 mt-1 flex items-center">
              <ArrowUpRight className="h-3 w-3 mr-1" />
              Lifetime revenue
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>Recent payments and withdrawals.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-white/10">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground bg-white/5 border-b border-white/10">
                <tr>
                  <th className="px-4 py-3 font-medium">Transaction ID</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[
                  { id: "0x8f...3a1", type: "Payment Received", agent: "Copywriter Pro", date: "Today, 10:23 AM", amount: "+$50.00", status: "Completed", isPositive: true },
                  { id: "0x2b...9c4", type: "Withdrawal", agent: "-", date: "Yesterday, 2:45 PM", amount: "-$1,200.00", status: "Completed", isPositive: false },
                  { id: "0x1a...7d2", type: "Payment Received", agent: "Data Scraper", date: "Oct 24, 2023", amount: "+$15.00", status: "Completed", isPositive: true },
                  { id: "0x9e...5f8", type: "Payment Received", agent: "Support Agent X", date: "Oct 23, 2023", amount: "+$200.00", status: "Pending", isPositive: true },
                  { id: "0x4c...1b6", type: "Platform Fee", agent: "Copywriter Pro", date: "Oct 22, 2023", amount: "-$1.00", status: "Completed", isPositive: false },
                ].map((tx, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3 font-mono text-muted-foreground">{tx.id}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {tx.isPositive ? (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-rose-400" />
                        )}
                        {tx.type}
                      </div>
                    </td>
                    <td className="px-4 py-3">{tx.agent}</td>
                    <td className="px-4 py-3 text-muted-foreground">{tx.date}</td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.amount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        tx.status === "Completed" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
