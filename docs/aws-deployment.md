# AgentCommerce on AWS

This is the fastest AWS layout for making AgentCommerce publicly testable without rewriting the stack.

## Recommended AWS Architecture

Use this shape:

- **Frontend**: AWS Amplify Hosting for the Next.js app
- **Backend API + worker + indexer + faucet**: one Ubuntu EC2 instance
- **Appchain public endpoints**: the same EC2 instance or a separate Ubuntu EC2 instance
- **Postgres**: Amazon RDS for PostgreSQL
- **Redis**: Amazon ElastiCache for Redis
- **DNS**: Amazon Route 53
- **Optional later**: Amazon S3 for uploads and artifact storage

This matches the current codebase well because the backend uses long-running Node processes, Prisma, Redis queues, and a `minitiad`-driven demo faucet. Those are a much better fit for EC2 than serverless functions.

Official AWS references:

- [Amplify Next.js deployment](https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html)
- [Amplify SSR support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html)
- [Amazon EC2 getting started](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/EC2_GetStarted.html)
- [Amazon RDS for PostgreSQL](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_PostgreSQL.html)
- [Amazon ElastiCache overview](https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/WhatIs.html)
- [Route 53 hosted zones](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/CreatingHostedZone.html)

## Lowest-Friction Hackathon Topology

Use one public domain with these records:

| Surface | Suggested URL | AWS target |
| --- | --- | --- |
| Frontend | `https://app.agentcommerce.xyz` | Amplify app |
| Backend API | `https://api.agentcommerce.xyz` | EC2 public IP or ALB |
| JSON-RPC | `https://jsonrpc.agentcommerce.xyz` | same EC2 public IP or ALB |
| Tendermint RPC | `https://rpc.agentcommerce.xyz` | same EC2 public IP or ALB |
| REST | `https://rest.agentcommerce.xyz` | same EC2 public IP or ALB |
| Indexer | `https://indexer.agentcommerce.xyz` | same EC2 public IP or ALB |

For the hackathon, the easiest operating model is:

- Amplify hosts the frontend.
- One Ubuntu EC2 box runs:
  - backend API
  - worker
  - indexer
  - optional faucet
  - Nginx reverse proxy
  - the public chain endpoints you expose
- RDS and ElastiCache are managed services.

## Deployment Order

Do these in order.

### 1. Create DNS and decide the public names

1. Create or import your domain into Route 53.
2. Create the subdomain plan you will actually use.
3. Keep the frontend on `app.<domain>` and the API/chain endpoints on separate subdomains.

If you do not own a custom domain yet, you can still deploy with temporary Amplify and EC2 URLs first, then switch DNS later.

### 2. Launch the EC2 instance

Use Ubuntu on EC2 for the current stack.

Suggested minimum hackathon setup:

- Ubuntu 24.04 LTS
- enough disk for repo, artifacts, and chain data
- one Elastic IP if you want stable DNS targeting

Open only:

- `22` for SSH from your IP
- `80` and `443` publicly

Keep internal app ports private:

- backend `4000`
- JSON-RPC `8545`
- Tendermint RPC `26657`
- REST `1317`
- indexer `8080`

Nginx should listen on `80` and `443` and proxy each subdomain to the correct internal port.

### 3. Provision Postgres and Redis

Create:

- one RDS PostgreSQL database
- one ElastiCache Redis instance or serverless Redis deployment

Collect:

- `DATABASE_URL`
- `REDIS_URL`

Those go into [backend/.env.production.example](C:/Users/HP/Documents/Agent-Commerce/backend/.env.production.example).

### 4. Deploy the backend onto EC2

Copy the repo to the EC2 box and set up the backend under a stable path like:

```bash
/opt/agent-commerce
```

Then:

```bash
cd /opt/agent-commerce/backend
npm install
npx prisma generate
npx prisma db push
npm run build
```

Create the real backend env file from:

- [backend/.env.production.example](C:/Users/HP/Documents/Agent-Commerce/backend/.env.production.example)

At minimum, replace:

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `WEBHOOK_SECRET`
- `GEMINI_API_KEY` or `OPENAI_API_KEY`
- `BACKEND_PUBLIC_BASE_URL`
- `CORS_ORIGIN`
- `AUTH_MESSAGE_URI`
- any public appchain URLs

### 5. Run the backend as services

Install the backend services with the templates in:

- [infra/aws/systemd/agent-commerce-backend.service](C:/Users/HP/Documents/Agent-Commerce/infra/aws/systemd/agent-commerce-backend.service)
- [infra/aws/systemd/agent-commerce-worker.service](C:/Users/HP/Documents/Agent-Commerce/infra/aws/systemd/agent-commerce-worker.service)
- [infra/aws/systemd/agent-commerce-indexer.service](C:/Users/HP/Documents/Agent-Commerce/infra/aws/systemd/agent-commerce-indexer.service)

Copy them into `/etc/systemd/system/`, then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable agent-commerce-backend
sudo systemctl enable agent-commerce-worker
sudo systemctl enable agent-commerce-indexer
sudo systemctl start agent-commerce-backend
sudo systemctl start agent-commerce-worker
sudo systemctl start agent-commerce-indexer
```

Verify:

```bash
sudo systemctl status agent-commerce-backend
sudo systemctl status agent-commerce-worker
sudo systemctl status agent-commerce-indexer
```

### 6. Publish the public chain and API endpoints with Nginx

Use:

- [infra/aws/nginx/agentcommerce.conf](C:/Users/HP/Documents/Agent-Commerce/infra/aws/nginx/agentcommerce.conf)

This template maps:

- `api.` -> `localhost:4000`
- `jsonrpc.` -> `localhost:8545`
- `rpc.` -> `localhost:26657`
- `rest.` -> `localhost:1317`
- `indexer.` -> `localhost:8080`

Adjust the domain names, then:

```bash
sudo cp infra/aws/nginx/agentcommerce.conf /etc/nginx/sites-available/agentcommerce.conf
sudo ln -s /etc/nginx/sites-available/agentcommerce.conf /etc/nginx/sites-enabled/agentcommerce.conf
sudo nginx -t
sudo systemctl reload nginx
```

After DNS points to the EC2 box, add TLS with your preferred certificate flow.

### 7. Deploy the frontend to Amplify

Amplify is the right place for the Next.js app.

Use:

- [amplify.yml](C:/Users/HP/Documents/Agent-Commerce/amplify.yml)
- [.env.production.example](C:/Users/HP/Documents/Agent-Commerce/.env.production.example)

In Amplify:

1. Connect the GitHub repo.
2. Set the root to the repository root.
3. Use the provided `amplify.yml`.
4. Add the frontend environment variables from `.env.production.example`.
5. Point `NEXT_PUBLIC_API_BASE_URL` and all public chain URLs to the live EC2-backed domains.

### 8. Add Route 53 records

Create records like:

- `app` -> Amplify
- `api` -> EC2 Elastic IP or ALB
- `jsonrpc` -> EC2 Elastic IP or ALB
- `rpc` -> EC2 Elastic IP or ALB
- `rest` -> EC2 Elastic IP or ALB
- `indexer` -> EC2 Elastic IP or ALB

### 9. Turn on the public demo faucet

If you want self-serve test `GAS`, enable these on the backend:

- `DEMO_FAUCET_ENABLED=true`
- `DEMO_FAUCET_REQUIRE_AUTH=true`
- `DEMO_FAUCET_CHAIN_ID=agentcommerce-1`
- `DEMO_FAUCET_AMOUNT=10000000000000000000GAS`

Also make sure:

- `minitiad` is installed on the EC2 host
- the `gas-station` key exists on that host
- the backend host can reach the live appchain RPC

### 10. Smoke test from another device

Do not stop after same-machine checks.

Verify from a different browser or phone:

1. `https://app.agentcommerce.xyz` loads
2. wallet connect opens
3. network switch goes to AgentCommerce
4. `Dashboard -> Settings` can resolve the public network values
5. demo faucet works if enabled
6. marketplace loads from the public backend
7. checkout can reach the backend and chain endpoints
8. deliverables preview and download use public URLs

## Exact Environment Mapping

### Frontend env in Amplify

Use [.env.production.example](C:/Users/HP/Documents/Agent-Commerce/.env.production.example) as the source of truth.

| Variable | Example value |
| --- | --- |
| `NEXT_PUBLIC_APPCHAIN_RPC_URL` | `https://jsonrpc.agentcommerce.xyz` |
| `NEXT_PUBLIC_APPCHAIN_TENDERMINT_RPC_URL` | `https://rpc.agentcommerce.xyz` |
| `NEXT_PUBLIC_APPCHAIN_REST_URL` | `https://rest.agentcommerce.xyz` |
| `NEXT_PUBLIC_APPCHAIN_INDEXER_URL` | `https://indexer.agentcommerce.xyz` |
| `NEXT_PUBLIC_APPCHAIN_CHAIN_ID` | `4273954181916632` |
| `NEXT_PUBLIC_APPCHAIN_INTERWOVEN_CHAIN_ID` | `agentcommerce-1` |
| `NEXT_PUBLIC_APPCHAIN_DISPLAY_NAME` | `AgentCommerce` |
| `NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS` | `0xB6Bc813D9274d0AB3d460892D571CCb224dE162E` |
| `NEXT_PUBLIC_SERVICE_ESCROW_ADDRESS` | `0x8a57E865966B58964Ae13Ef8c20B23f8dC5d654f` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.agentcommerce.xyz` |

### Backend env on EC2

Use [backend/.env.production.example](C:/Users/HP/Documents/Agent-Commerce/backend/.env.production.example) as the source of truth.

Most important values:

| Variable | Example value |
| --- | --- |
| `CORS_ORIGIN` | `https://app.agentcommerce.xyz` |
| `DATABASE_URL` | `postgresql://agentcommerce:...@<rds-endpoint>:5432/agentcommerce?schema=public` |
| `REDIS_URL` | `redis://default:...@<elasticache-endpoint>:6379` |
| `INITIA_RPC_URL` | `https://rpc.agentcommerce.xyz` |
| `INDEXER_EVM_RPC_URL` | `https://jsonrpc.agentcommerce.xyz` |
| `INDEXER_CHAIN_ID` | `4273954181916632` |
| `AUTH_MESSAGE_URI` | `https://app.agentcommerce.xyz` |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api.agentcommerce.xyz` |
| `BACKEND_PUBLIC_BASE_URL` | `https://api.agentcommerce.xyz` |

## What Not To Put On Amplify

Do not try to move the current backend stack into Amplify functions. The current backend needs:

- a long-running API process
- a long-running worker
- a long-running indexer
- Prisma database access
- Redis queues
- optional `minitiad` access for the faucet

That is why Amplify should host the frontend, while EC2 should host the backend and public chain-facing services.

## Security Checks Before Opening It Publicly

Before you share the app:

- rotate any API keys that were ever committed or pasted in logs
- replace placeholder JWT and webhook secrets
- restrict SSH to your IP
- keep internal service ports private
- front the public endpoints with TLS
- test from outside your own machine
