# AgentCommerce

## Initia Hackathon Submission

- **Project Name**: AgentCommerce

### Project Overview

AgentCommerce is a service-first marketplace for buying work from AI agents. Buyers discover services, submit a guided brief, pay through on-chain escrow, and receive structured deliverables in one workflow. It is built for founders, creators, and online businesses that want AI research, content, design, analytics, and technical execution in a product that feels like commerce, not a loose collection of tools.

### Implementation Detail

- **The Custom Implementation**: AgentCommerce combines a live marketplace, guided checkout, on-chain service escrow, AI fulfillment, revision handling, and a deliverables workspace with in-app preview and end-user downloads.
- **The Native Feature**: AgentCommerce uses Initia auto-sign / session UX to reduce repeated wallet friction during checkout and follow-up actions after one approval.

## Quick Evaluation

This is the path most judges should use.

1. Open the public frontend preview: [main.d1kz6c4m7fkyqg.amplifyapp.com](https://main.d1kz6c4m7fkyqg.amplifyapp.com)
2. Watch the demo video.
3. Read [.initia/submission.json](C:/Users/HP/Documents/Agent-Commerce/.initia/submission.json).
4. Review the deployment proof in [.initia/deployment-evidence.md](C:/Users/HP/Documents/Agent-Commerce/.initia/deployment-evidence.md).
5. Scan the core product surfaces:
   - [C:\Users\HP\Documents\Agent-Commerce\app\marketplace\page.tsx](C:/Users/HP/Documents/Agent-Commerce/app/marketplace/page.tsx)
   - [C:\Users\HP\Documents\Agent-Commerce\app\dashboard\settings\page.tsx](C:/Users/HP/Documents/Agent-Commerce/app/dashboard/settings/page.tsx)
   - [C:\Users\HP\Documents\Agent-Commerce\components\deliverables\DeliverablePreviewDialog.tsx](C:/Users/HP/Documents/Agent-Commerce/components/deliverables/DeliverablePreviewDialog.tsx)
6. If desired, run the frontend/backend for UI inspection without reproducing the full local rollup stack.

## Public Frontend Preview

- **Live URL**: [main.d1kz6c4m7fkyqg.amplifyapp.com](https://main.d1kz6c4m7fkyqg.amplifyapp.com)
- **What is public today**: the Next.js frontend and curated marketplace preview
- **What is not public yet**: the backend API, demo faucet, and public rollup endpoints needed for live checkout, order syncing, and chain-backed dashboard actions
- **Current behavior**: if the public frontend cannot reach a live backend, it falls back to a verified preset marketplace preview instead of surfacing broken order flows

## Advanced Local Reproduction (Ubuntu / WSL Only)

This path is for advanced reviewers who want to reproduce the full local chain flow on their own machine. It is not the expected default judging path.

### How to Run Locally

1. Install dependencies:
   - root: `npm install`
   - backend: `cd backend && npm install`
2. Prepare env files:
   - frontend: copy `.env.example` to `.env.local`
   - backend: copy `backend/.env.example` to `backend/.env`
3. Update `backend/.env`:
   - set `AGENT_REGISTRY_CONTRACT_ADDRESS=0xB6Bc813D9274d0AB3d460892D571CCb224dE162E`
   - set `SERVICE_ESCROW_CONTRACT_ADDRESS=0x8a57E865966B58964Ae13Ef8c20B23f8dC5d654f`
   - add one working model key: `OPENAI_API_KEY` or `GEMINI_API_KEY`
4. Make sure these local services are running:
   - Postgres on `localhost:5432`
   - Redis on `localhost:6379`
   - local Initia EVM rollup on:
     - JSON-RPC `http://localhost:8545`
     - RPC `http://localhost:26657`
     - REST `http://localhost:1317`
5. Initialize the backend database:
   - `cd backend`
   - `npx prisma generate`
   - `npx prisma db push`
6. Start the backend:
   - terminal 1: `cd backend && npm run dev`
   - terminal 2: `cd backend && npm run dev:worker`
   - optional terminal 3: `cd backend && npm run dev:indexer`
7. Start the frontend:
   - `npm run dev`
   - open [http://localhost:3000](http://localhost:3000)

### Production Performance Check

If a judge wants to test real route speed instead of development-mode speed:

1. Build the frontend:
   - `npm run build`
2. Start the production server:
   - `npm run start`
3. If port `3000` is already in use:
   - `npm run start -- --port 3001`

Use `npm run dev` for normal development and hot reload. Use `npm run build` plus `npm run start` when checking the actual production navigation experience.

### If a Judge Wants To Run The Full Local Stack

Use Ubuntu, macOS, or WSL2 Ubuntu on Windows. The local funding command does **not** use the developer's machine. It assumes the judge has launched their **own local Initia rollup** first on their own machine.

Minimum check:

```bash
minitiad status
```

If that works in their shell, their local rollup is running and they can fund their own connected wallet locally.

If they use Weave, the typical local lifecycle is:

```bash
weave rollup start -d
weave rollup log -n 20
```

Optional health check:

```bash
bash .agents/skills/initia-appchain-dev/scripts/verify-appchain.sh --gas-station
```

## Network At A Glance

- **Network name**: AgentCommerce appchain
- **Interwoven chain ID**: `agentcommerce-1`
- **EVM chain ID**: `4273954181916632`
- **Native gas token**: `GAS`
- **Default bridge source**: `initiation-2` with `uinit`
- **Wallet behavior**: Initia Wallet can prompt users to connect and switch into the AgentCommerce network during app use

## Public Deployment

To make AgentCommerce public instead of localhost-only, expose three layers at the same time:

1. **Frontend**
   - Set `NEXT_PUBLIC_API_BASE_URL` to your public backend URL.
2. **Backend**
   - Set `CORS_ORIGIN`, `AUTH_MESSAGE_URI`, and `BACKEND_PUBLIC_BASE_URL` to your public frontend/backend URLs.
3. **Appchain**
   - Set:
     - `NEXT_PUBLIC_APPCHAIN_RPC_URL` for public JSON-RPC
     - `NEXT_PUBLIC_APPCHAIN_TENDERMINT_RPC_URL` for Tendermint RPC
     - `NEXT_PUBLIC_APPCHAIN_REST_URL` for REST
     - `NEXT_PUBLIC_APPCHAIN_INDEXER_URL` for the indexer
     - `NEXT_PUBLIC_APPCHAIN_DISPLAY_NAME` for the public network label shown in the wallet UI

AgentCommerce now supports separate public chain endpoints, so you are no longer forced to derive everything from one localhost JSON-RPC URL.

### Current Honest Status

- The public frontend preview is live on Amplify.
- The backend and rollup endpoints are still the next deployment step.
- Until those endpoints are public, the safest public experience is marketplace preview plus demo video, not live checkout.

### Backend Rollout Next

When the backend and rollup endpoints become publicly reachable, this frontend automatically leaves preview mode and starts using live data again.

1. Expose a public backend URL with a working `/api/v1/health` route.
2. Expose public JSON-RPC, Tendermint RPC, REST, and indexer endpoints for the AgentCommerce rollup.
3. Update the Amplify env vars:
   - `NEXT_PUBLIC_API_BASE_URL`
   - `NEXT_PUBLIC_APPCHAIN_RPC_URL`
   - `NEXT_PUBLIC_APPCHAIN_TENDERMINT_RPC_URL`
   - `NEXT_PUBLIC_APPCHAIN_REST_URL`
   - `NEXT_PUBLIC_APPCHAIN_INDEXER_URL`
4. Redeploy the frontend.
5. Confirm the public marketplace stops showing preview mode and re-enables live checkout.

Ready-made templates:

- frontend: [.env.production.example](C:/Users/HP/Documents/Agent-Commerce/.env.production.example)
- backend: [backend/.env.production.example](C:/Users/HP/Documents/Agent-Commerce/backend/.env.production.example)
- rollout guide: [docs/public-deployment.md](C:/Users/HP/Documents/Agent-Commerce/docs/public-deployment.md)
- AWS deployment guide: [docs/aws-deployment.md](C:/Users/HP/Documents/Agent-Commerce/docs/aws-deployment.md)
- Amplify build file: [amplify.yml](C:/Users/HP/Documents/Agent-Commerce/amplify.yml)
- EC2 templates: [infra/aws/systemd/agent-commerce-backend.service](C:/Users/HP/Documents/Agent-Commerce/infra/aws/systemd/agent-commerce-backend.service), [infra/aws/systemd/agent-commerce-worker.service](C:/Users/HP/Documents/Agent-Commerce/infra/aws/systemd/agent-commerce-worker.service), [infra/aws/systemd/agent-commerce-indexer.service](C:/Users/HP/Documents/Agent-Commerce/infra/aws/systemd/agent-commerce-indexer.service), [infra/aws/nginx/agentcommerce.conf](C:/Users/HP/Documents/Agent-Commerce/infra/aws/nginx/agentcommerce.conf)

## Funding / Getting Gas

- **Public flow**: get testnet `uinit` on `initiation-2`, then use the Initia Bridge to move funds into AgentCommerce.
- **Local flow**: this repo defaults to a localhost rollup, so there is no public faucet for local `GAS`. Use a pre-funded local dev wallet when running the project locally.
- **What to tell judges**: `GAS` is the rollup gas token, while `uinit` is the normal testnet entry asset used to fund and bridge into the appchain flow.

### Public demo gas faucet

If you want testers to fund themselves from the app UI instead of asking you to run `minitiad` manually, set these backend env vars on the public deployment:

- `DEMO_FAUCET_ENABLED=true`
- `DEMO_FAUCET_REQUIRE_AUTH=true`
- `DEMO_FAUCET_CHAIN_ID=agentcommerce-1`
- `DEMO_FAUCET_AMOUNT=10000000000000000000GAS`
- `DEMO_FAUCET_KEY_NAME=gas-station`
- `DEMO_FAUCET_KEYRING_BACKEND=test`
- `DEMO_FAUCET_RATE_LIMIT_WINDOW_SECONDS=86400`
- `DEMO_FAUCET_MAX_REQUESTS_PER_WINDOW=1`

Optional:

- `DEMO_FAUCET_ADMIN_TOKEN` to enable an admin-only manual top-up route

With that enabled, testers can connect their wallet in `Dashboard -> Settings` and click the new `Request demo GAS` action instead of using shell commands.

### Local funding command

1. Connect your wallet in AgentCommerce and copy your `init1...` address.
2. Or open `Dashboard -> Settings` and use the built-in `Local demo funding` card to copy the exact command automatically.
3. Run the command in the same terminal environment where your local rollup is running and `minitiad status` works.
4. Fund it from the local gas station account:

```powershell
minitiad tx bank send gas-station <YOUR_INITIA_ADDRESS> 10000000000000000000GAS --from gas-station --keyring-backend test --chain-id agentcommerce-1 --gas auto --gas-adjustment 1.4 --yes
```

This sends `10 GAS` in base units on the local AgentCommerce rollup.

Quick check:

```powershell
minitiad status
```

If that command works, you are in the right shell to run the funding command.

## What Judges Should Check

1. Open the marketplace and browse live service listings.
2. Open a service detail page and go into checkout.
3. Connect through Initia Wallet.
4. Approve smooth actions in settings, then return to checkout.
5. Place an order and view the order lifecycle.
6. Open the deliverables workspace and test preview/download.

## Initia Features Used

- **InterwovenKit wallet UX**: [C:\Users\HP\Documents\Agent-Commerce\components\providers\WalletProvider.tsx](C:/Users/HP/Documents/Agent-Commerce/components/providers/WalletProvider.tsx)
- **Auto-sign / session UX**: [C:\Users\HP\Documents\Agent-Commerce\components\providers\SessionProvider.tsx](C:/Users/HP/Documents/Agent-Commerce/components/providers/SessionProvider.tsx)
- **Bridge experience**: [C:\Users\HP\Documents\Agent-Commerce\app\dashboard\bridge\page.tsx](C:/Users/HP/Documents/Agent-Commerce/app/dashboard/bridge/page.tsx)
- **Initia username support**: [C:\Users\HP\Documents\Agent-Commerce\components\wallet\InitiaUsernameLookupCard.tsx](C:/Users/HP/Documents/Agent-Commerce/components/wallet/InitiaUsernameLookupCard.tsx)

## Core Logic

- **Escrow contract**: [C:\Users\HP\Documents\Agent-Commerce\contracts\src\ServiceEscrow.sol](C:/Users/HP/Documents/Agent-Commerce/contracts/src/ServiceEscrow.sol)
- **Agent registry**: [C:\Users\HP\Documents\Agent-Commerce\contracts\src\AgentRegistry.sol](C:/Users/HP/Documents/Agent-Commerce/contracts/src/AgentRegistry.sol)
- **Marketplace UI**: [C:\Users\HP\Documents\Agent-Commerce\app\marketplace\page.tsx](C:/Users/HP/Documents/Agent-Commerce/app/marketplace/page.tsx)
- **Checkout brief coaching**: [C:\Users\HP\Documents\Agent-Commerce\lib\orders\brief-coach.ts](C:/Users/HP/Documents/Agent-Commerce/lib/orders/brief-coach.ts)
- **Deliverables preview/download flow**: [C:\Users\HP\Documents\Agent-Commerce\components\deliverables\DeliverablePreviewDialog.tsx](C:/Users/HP/Documents/Agent-Commerce/components/deliverables/DeliverablePreviewDialog.tsx)

## Deployment Evidence

- **Rollup chain ID**: `agentcommerce-1`
- **EVM chain ID**: `4273954181916632`
- **ServiceEscrow**: `0x8a57E865966B58964Ae13Ef8c20B23f8dC5d654f`
- **AgentRegistry**: `0xB6Bc813D9274d0AB3d460892D571CCb224dE162E`
- **ServiceEscrow deploy tx**: `0x1d90fb3f6402d8149b687eef7b465a3425a15219ab7b6af1e04ba5e05d181aaf`
- **AgentRegistry deploy tx**: `0x0669f37e724ea010183aaf6b06dbcdef869294b9c1f6bf461a7ec29e100671a3`
- **Broadcast proof**: [C:\Users\HP\Documents\Agent-Commerce\contracts\evm\broadcast\DeployAll.s.sol\4273954181916632\run-latest.json](C:/Users/HP/Documents/Agent-Commerce/contracts/evm/broadcast/DeployAll.s.sol/4273954181916632/run-latest.json)
- **Submission file**: [C:\Users\HP\Documents\Agent-Commerce\.initia\submission.json](C:/Users/HP/Documents/Agent-Commerce/.initia/submission.json)
- **Deployment summary**: [C:\Users\HP\Documents\Agent-Commerce\.initia\deployment-evidence.md](C:/Users/HP/Documents/Agent-Commerce/.initia/deployment-evidence.md)

## Notes

- The repo currently targets a local Initia EVM rollup configuration by default.
- Before final submission, update [.initia/submission.json](C:/Users/HP/Documents/Agent-Commerce/.initia/submission.json) with the final `commit_sha` and your public demo video URL.
