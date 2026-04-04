# AgentCommerce Deployment Evidence

This file packages the current deployment proof for AgentCommerce in a form that is fast for judges to verify.

## Rollup Identity

- **Interwoven rollup chain ID**: `agentcommerce-1`
- **EVM chain ID**: `4273954181916632`
- **VM**: `evm`

## Deployed Contracts

- **Primary application logic**: `ServiceEscrow`
  - Address: `0x8a57E865966B58964Ae13Ef8c20B23f8dC5d654f`
  - Source: [contracts/src/ServiceEscrow.sol](C:/Users/HP/Documents/Agent-Commerce/contracts/src/ServiceEscrow.sol)
  - Deployment transaction: `0x1d90fb3f6402d8149b687eef7b465a3425a15219ab7b6af1e04ba5e05d181aaf`

- **Supporting registry**: `AgentRegistry`
  - Address: `0xB6Bc813D9274d0AB3d460892D571CCb224dE162E`
  - Source: [contracts/src/AgentRegistry.sol](C:/Users/HP/Documents/Agent-Commerce/contracts/src/AgentRegistry.sol)
  - Deployment transaction: `0x0669f37e724ea010183aaf6b06dbcdef869294b9c1f6bf461a7ec29e100671a3`

## Native Feature Evidence

- **Native feature used**: `auto-signing`
- **Frontend provider wiring**: [components/providers/WalletProvider.tsx](C:/Users/HP/Documents/Agent-Commerce/components/providers/WalletProvider.tsx)
- **Session orchestration**: [components/providers/SessionProvider.tsx](C:/Users/HP/Documents/Agent-Commerce/components/providers/SessionProvider.tsx)
- **Auto-sign UX surface**: [components/session/SessionApprovalCard.tsx](C:/Users/HP/Documents/Agent-Commerce/components/session/SessionApprovalCard.tsx)
- **InterwovenKit config with auto-sign policy**: [lib/appchain/config.ts](C:/Users/HP/Documents/Agent-Commerce/lib/appchain/config.ts)

## Bridge And Wallet Evidence

- **InterwovenKit wallet integration**: [components/providers/WalletProvider.tsx](C:/Users/HP/Documents/Agent-Commerce/components/providers/WalletProvider.tsx)
- **Bridge launch page**: [app/dashboard/bridge/page.tsx](C:/Users/HP/Documents/Agent-Commerce/app/dashboard/bridge/page.tsx)
- **Wallet actions using InterwovenKit**: [hooks/wallet/useWalletActions.ts](C:/Users/HP/Documents/Agent-Commerce/hooks/wallet/useWalletActions.ts)

## Deployment Artifact Proof

- **Foundry broadcast log**: [contracts/evm/broadcast/DeployAll.s.sol/4273954181916632/run-latest.json](C:/Users/HP/Documents/Agent-Commerce/contracts/evm/broadcast/DeployAll.s.sol/4273954181916632/run-latest.json)
- **Submission helper script**: [contracts/script/PrintSubmissionInfo.s.sol](C:/Users/HP/Documents/Agent-Commerce/contracts/script/PrintSubmissionInfo.s.sol)
- **Frontend runtime config**: [.env.local](C:/Users/HP/Documents/Agent-Commerce/.env.local)

## What This Evidence Proves

- AgentCommerce is wired as its own Initia EVM rollup frontend
- the primary application logic is deployed and addressable
- the repository contains deployment transaction artifacts for the live local deployment
- the frontend uses InterwovenKit and implements Initia auto-signing as a native feature

## Important Note For Final Submission

The current proof is strong **local rollup** evidence. For stronger public judging proof, the final submission should ideally also include:

- a public demo video showing the app connected to the rollup
- a public repository with this evidence committed
- if available, public testnet-accessible RPC or deployment references replacing localhost-only runtime URLs
