# AgentCommerce Public Deployment

This guide turns AgentCommerce from a localhost-only stack into a publicly testable product with:

- public frontend
- public backend API
- public Initia appchain endpoints
- optional public demo `GAS` faucet

If you are deploying on AWS, use the dedicated guide first:

- [docs/aws-deployment.md](C:/Users/HP/Documents/Agent-Commerce/docs/aws-deployment.md)

## Recommended Domain Layout

Use one domain per surface so the env values stay clear:

- frontend: `https://app.agentcommerce.xyz`
- backend: `https://api.agentcommerce.xyz`
- JSON-RPC: `https://jsonrpc.agentcommerce.xyz`
- Tendermint RPC: `https://rpc.agentcommerce.xyz`
- REST: `https://rest.agentcommerce.xyz`
- indexer: `https://indexer.agentcommerce.xyz`

If your infrastructure only exposes a single host with multiple ports, that still works, but separate domains are easier to operate and explain.

## Deployment Order

Do the rollout in this order.

### 1. Publish the appchain first

Before the website matters, the chain endpoints must be reachable from outside your laptop.

Required public endpoints:

- JSON-RPC for EVM reads and wallet transport
- Tendermint RPC for chain status and CLI operations
- REST for account and Cosmos-style queries
- indexer for app UX and chain-aware features

Make sure these are reachable before you deploy the app:

- `https://jsonrpc.agentcommerce.xyz`
- `https://rpc.agentcommerce.xyz`
- `https://rest.agentcommerce.xyz`
- `https://indexer.agentcommerce.xyz`

Also confirm:

- chain id: `4273954181916632`
- Interwoven chain id: `agentcommerce-1`
- native token: `GAS`

### 2. Deploy the backend

Best simple hosting options:

- Railway
- Render
- Fly.io
- one Ubuntu VM with Node, Postgres, Redis, and a reverse proxy

Copy [backend/.env.production.example](/C:/Users/HP/Documents/Agent-Commerce/backend/.env.production.example) to your real backend environment and replace:

- database credentials
- redis credentials
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- AI provider key
- any placeholder domains

Backend envs that must match production:

- `CORS_ORIGIN=https://app.agentcommerce.xyz`
- `AUTH_MESSAGE_URI=https://app.agentcommerce.xyz`
- `BACKEND_PUBLIC_BASE_URL=https://api.agentcommerce.xyz`
- `INITIA_RPC_URL=https://rpc.agentcommerce.xyz`
- `INDEXER_EVM_RPC_URL=https://jsonrpc.agentcommerce.xyz`

Backend start order:

1. `npm install`
2. `npx prisma generate`
3. `npx prisma db push`
4. `npm run build`
5. `npm run start`
6. `npm run start:worker`
7. `npm run start:indexer`

### 3. Deploy the frontend

Best simple hosting options:

- Vercel
- Netlify
- a Node server if you want frontend and backend on the same VM

Copy [.env.production.example](/C:/Users/HP/Documents/Agent-Commerce/.env.production.example) to your real frontend environment and replace the domains if needed.

Frontend envs that must match production:

- `NEXT_PUBLIC_API_BASE_URL=https://api.agentcommerce.xyz`
- `NEXT_PUBLIC_APPCHAIN_RPC_URL=https://jsonrpc.agentcommerce.xyz`
- `NEXT_PUBLIC_APPCHAIN_TENDERMINT_RPC_URL=https://rpc.agentcommerce.xyz`
- `NEXT_PUBLIC_APPCHAIN_REST_URL=https://rest.agentcommerce.xyz`
- `NEXT_PUBLIC_APPCHAIN_INDEXER_URL=https://indexer.agentcommerce.xyz`
- `NEXT_PUBLIC_APPCHAIN_DISPLAY_NAME=AgentCommerce`

Frontend deploy flow:

1. `npm install`
2. `npm run build`
3. `npm run start`

On Vercel, the build command is `npm run build`.

### 4. Turn on the public demo faucet

If you want testers to request `GAS` from the Settings page, enable the backend faucet envs:

- `DEMO_FAUCET_ENABLED=true`
- `DEMO_FAUCET_REQUIRE_AUTH=true`
- `DEMO_FAUCET_CHAIN_ID=agentcommerce-1`
- `DEMO_FAUCET_AMOUNT=10000000000000000000GAS`
- `DEMO_FAUCET_KEY_NAME=gas-station`
- `DEMO_FAUCET_KEYRING_BACKEND=test`

Optional:

- `DEMO_FAUCET_ADMIN_TOKEN` for admin-only manual top-ups

Important:

- the backend host must actually have access to `minitiad`
- the configured faucet key must exist on that host
- the host must be able to reach `INITIA_RPC_URL`

### 5. Test from another device

Do not trust same-machine testing only. Use another browser or phone and verify this order:

1. Open `https://app.agentcommerce.xyz`
2. Connect wallet
3. Switch into AgentCommerce
4. Open `Dashboard -> Settings`
5. Request demo `GAS`
6. Open the bridge page
7. Open a service
8. Go to checkout
9. Confirm the backend and wallet flows work with public URLs

## Minimal Production Checklist

- frontend loads from a public domain
- backend API answers from a public domain
- chain endpoints are public
- wallet can switch into AgentCommerce
- uploaded files and artifacts generate public URLs from the backend host
- deliverable preview/download works from outside localhost
- faucet can fund a tester wallet

## Security Before Launch

Do this before exposing the stack publicly:

- rotate any API keys that were ever committed or pasted in logs
- replace placeholder JWT and webhook secrets
- restrict CORS to your real frontend domain
- add TLS on every public endpoint
- do not expose private infrastructure hosts directly if a reverse proxy can front them
