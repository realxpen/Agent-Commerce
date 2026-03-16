import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Clock, CheckCircle2, AlertCircle, Eye, MessageSquare } from "lucide-react"

export default function TasksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tasks & Orders</h1>
        <p className="text-muted-foreground mt-2">Manage incoming requests and agent outputs.</p>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="w-full justify-start border-b border-white/10 rounded-none bg-transparent p-0 h-auto mb-6">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-4 py-2">
            All Tasks
          </TabsTrigger>
          <TabsTrigger value="in-progress" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-4 py-2">
            In Progress
          </TabsTrigger>
          <TabsTrigger value="completed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-4 py-2">
            Completed
          </TabsTrigger>
          <TabsTrigger value="disputed" className="rounded-none border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent px-4 py-2">
            Disputed
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {[
            { id: "ORD-9821", agent: "Copywriter Pro", client: "0x4A2...1B9C", status: "In Progress", time: "10 mins ago", amount: "50 USDC" },
            { id: "ORD-9820", agent: "Data Scraper", client: "0x9F1...E32A", status: "Completed", time: "2 hours ago", amount: "15 USDC" },
            { id: "ORD-9819", agent: "Support Agent X", client: "0x2C8...D74F", status: "Completed", time: "1 day ago", amount: "200 USDC" },
            { id: "ORD-9818", agent: "Copywriter Pro", client: "0x7E4...9A1B", status: "Disputed", time: "2 days ago", amount: "50 USDC" },
          ].map((task, i) => (
            <Card key={i} className="overflow-hidden border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    task.status === "In Progress" ? "bg-amber-500/20 text-amber-400" :
                    task.status === "Completed" ? "bg-emerald-500/20 text-emerald-400" :
                    "bg-rose-500/20 text-rose-400"
                  }`}>
                    {task.status === "In Progress" && <Clock className="w-5 h-5" />}
                    {task.status === "Completed" && <CheckCircle2 className="w-5 h-5" />}
                    {task.status === "Disputed" && <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{task.id}</h3>
                      <Badge variant="outline" className={`text-xs ${
                        task.status === "In Progress" ? "border-amber-500/50 text-amber-400" :
                        task.status === "Completed" ? "border-emerald-500/50 text-emerald-400" :
                        "border-rose-500/50 text-rose-400"
                      }`}>
                        {task.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="font-medium text-white/80">{task.agent}</span>
                      <span>•</span>
                      <span>Client: <span className="font-mono">{task.client}</span></span>
                      <span>•</span>
                      <span>{task.time}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 md:ml-auto">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm text-muted-foreground mb-1">Amount</p>
                    <p className="font-medium text-emerald-400">{task.amount}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-white/10 bg-white/5">
                      <Eye className="w-4 h-4 mr-2" />
                      View Output
                    </Button>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <MessageSquare className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>
        {/* Other tabs would have filtered content */}
      </Tabs>
    </div>
  )
}
