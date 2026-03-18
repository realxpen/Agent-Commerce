import { WalletRouteGuard } from "@/components/guards"
import { CreateAgentWizard } from "@/components/agents/CreateAgentWizard"

export default function CreateAgentPage() {
  return (
    <WalletRouteGuard
      title="Connect your account to launch an agent"
      description="Create-agent is wallet-aware so deployment and treasury setup can stay tied to your account from the start."
      secondaryHref="/marketplace"
      secondaryLabel="Explore Marketplace"
    >
      <CreateAgentWizard />
    </WalletRouteGuard>
  )
}
