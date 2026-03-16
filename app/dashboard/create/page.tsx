"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Bot, CheckCircle2, ChevronRight, Settings, Wallet } from "lucide-react"

const steps = [
  { id: 1, name: "Identity", icon: Bot },
  { id: 2, name: "Service & Pricing", icon: Settings },
  { id: 3, name: "Treasury", icon: Wallet },
  { id: 4, name: "Review", icon: CheckCircle2 },
]

export default function CreateAgentPage() {
  const [currentStep, setCurrentStep] = useState(1)

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create AI Agent</h1>
        <p className="text-muted-foreground mt-2">Configure your autonomous business agent.</p>
      </div>

      {/* Progress Bar */}
      <div className="relative mb-8">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-white/10 -translate-y-1/2"></div>
        <div 
          className="absolute top-1/2 left-0 h-0.5 bg-indigo-500 -translate-y-1/2 transition-all duration-500"
          style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
        ></div>
        <div className="relative flex justify-between">
          {steps.map((step) => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors bg-black ${
                  step.id < currentStep 
                    ? "border-indigo-500 text-indigo-500" 
                    : step.id === currentStep 
                      ? "border-indigo-500 text-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
                      : "border-white/20 text-muted-foreground"
                }`}
              >
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium ${step.id <= currentStep ? "text-white" : "text-muted-foreground"}`}>
                {step.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <Card className="mt-8">
        {currentStep === 1 && (
          <>
            <CardHeader>
              <CardTitle>Agent Identity</CardTitle>
              <CardDescription>Give your agent a name and describe its purpose.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input id="name" placeholder="e.g. Copywriter Pro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="username">Initia Username</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-white/10 bg-white/5 text-muted-foreground text-sm">
                    @
                  </span>
                  <Input id="username" className="rounded-l-none" placeholder="copywriter_pro" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Short Description</Label>
                <textarea 
                  id="description" 
                  className="flex min-h-[100px] w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  placeholder="Describe what your agent does..."
                />
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 2 && (
          <>
            <CardHeader>
              <CardTitle>Service & Pricing</CardTitle>
              <CardDescription>Define what your agent sells and how much it costs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="serviceType">Service Category</Label>
                <select id="serviceType" className="flex h-10 w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <option value="content">Content Creation</option>
                  <option value="data">Data Analysis</option>
                  <option value="support">Customer Support</option>
                  <option value="code">Code Generation</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pricingModel">Pricing Model</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="border border-indigo-500 bg-indigo-500/10 rounded-lg p-4 cursor-pointer">
                    <h4 className="font-medium mb-1 text-indigo-400">Pay per task</h4>
                    <p className="text-xs text-muted-foreground">Charge a fixed fee for each completed job.</p>
                  </div>
                  <div className="border border-white/10 bg-white/5 rounded-lg p-4 cursor-pointer hover:border-white/20 transition-colors">
                    <h4 className="font-medium mb-1">Subscription</h4>
                    <p className="text-xs text-muted-foreground">Charge a recurring monthly fee for access.</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (USDC)</Label>
                <Input id="price" type="number" placeholder="50.00" />
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 3 && (
          <>
            <CardHeader>
              <CardTitle>Treasury Setup</CardTitle>
              <CardDescription>Configure where your agent&apos;s earnings will be sent.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500"></div>
                  <div>
                    <p className="font-medium">Connected Wallet</p>
                    <p className="text-sm text-muted-foreground">0x71C...9A23</p>
                  </div>
                </div>
                <Button variant="outline" size="sm">Change</Button>
              </div>
              <div className="space-y-2">
                <Label>Revenue Split (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-4">Automatically route a percentage of earnings to another address.</p>
                <Button variant="outline" className="w-full border-dashed border-white/20 text-muted-foreground">
                  + Add Split Address
                </Button>
              </div>
            </CardContent>
          </>
        )}

        {currentStep === 4 && (
          <>
            <CardHeader>
              <CardTitle>Review & Deploy</CardTitle>
              <CardDescription>Review your agent&apos;s configuration before deploying to the network.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 rounded-xl bg-indigo-500/20 border border-indigo-500/50 flex items-center justify-center">
                    <Bot className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">Copywriter Pro</h3>
                    <p className="text-indigo-400 text-sm">@copywriter_pro</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-y-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Category</p>
                    <p className="font-medium">Content Creation</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Pricing</p>
                    <p className="font-medium">50.00 USDC / task</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground mb-1">Treasury Wallet</p>
                    <p className="font-medium font-mono">0x71C...9A23</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        <CardFooter className="flex justify-between border-t border-white/5 pt-6">
          <Button 
            variant="ghost" 
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            Back
          </Button>
          <Button 
            className="bg-indigo-500 hover:bg-indigo-600 text-white"
            onClick={() => {
              if (currentStep < 4) setCurrentStep(currentStep + 1)
              else alert("Deploying agent...")
            }}
          >
            {currentStep === 4 ? "Deploy Agent" : "Continue"}
            {currentStep < 4 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
