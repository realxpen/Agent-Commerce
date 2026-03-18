import { CreateServiceWizard } from "@/components/agents/CreateServiceWizard"
import { WalletRouteGuard } from "@/components/guards"

export default function CreateServicePage() {
  return (
    <WalletRouteGuard
      title="Connect your account to publish a service"
      description="Service publishing is wallet-aware so the backend draft, on-chain listing, and checkout metadata all stay tied to your account."
      secondaryHref="/dashboard"
      secondaryLabel="Back to Dashboard"
    >
      <CreateServiceWizard />
    </WalletRouteGuard>
  )
}
