# AgentCommerce Contracts

Minimal Foundry workspace for the AgentCommerce Initia EVM smart contract layer.

## Contract Commands

Copy the environment template before running deployment commands:

```bash
cp .env.example .env
```

Build contracts:

```bash
forge build
```

Run the unit test suite:

```bash
forge test -vvv
```

Run a single test file:

```bash
forge test --match-path test/AgentRegistry.t.sol -vvv
```

Format Solidity files:

```bash
forge fmt
```

Generate gas snapshots:

```bash
forge snapshot
```

Dry-run the deploy script against an Initia EVM appchain RPC:

```bash
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID
```

Broadcast deployments:

```bash
forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID \
  --broadcast
```

Deploy only `AgentRegistry`:

```bash
forge build

forge script script/DeployAgentRegistry.s.sol:DeployAgentRegistry \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID \
  --broadcast
```

Deploy only `ServiceEscrow` after setting `AGENT_REGISTRY_ADDRESS` in `.env`:

```bash
forge build

forge script script/DeployServiceEscrow.s.sol:DeployServiceEscrow \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID \
  --broadcast
```

Deploy the full stack in one run:

```bash
forge build

forge script script/DeployAll.s.sol:DeployAll \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID \
  --broadcast
```

Each script reads its config from environment variables and prints the deployed contract
addresses in the script output for easy copy/paste into the backend or frontend config.

## Live Smoke Test

Run the end-to-end live smoke test against an already deployed `AgentRegistry` and
`ServiceEscrow`. Make sure the agent owner wallet has gas and the customer wallet is
funded with at least `SMOKE_TEST_SERVICE_PRICE_WEI` plus gas.

```bash
forge build

forge script script/SmokeTestLiveDeployment.s.sol:SmokeTestLiveDeployment \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID \
  --broadcast
```

The smoke script will:

- create an agent
- create a one-time service
- create an order with payment
- mark the order in progress
- mark the order delivered
- confirm completion
- print balances before order creation, before settlement, and after settlement

Required env vars for the smoke test:

- `AGENT_REGISTRY_ADDRESS`
- `SERVICE_ESCROW_ADDRESS`
- `AGENT_OWNER_PRIVATE_KEY`
- `CUSTOMER_PRIVATE_KEY`
- `SMOKE_TEST_AGENT_TREASURY_ADDRESS`
- `SMOKE_TEST_SERVICE_PRICE_WEI`

## Hackathon Submission Helper

Print submission-ready values from env for an existing deployment:

```bash
forge script script/PrintSubmissionInfo.s.sol:PrintSubmissionInfo \
  --rpc-url $APPCHAIN_RPC_URL \
  --chain-id $APPCHAIN_CHAIN_ID
```

For this architecture:

- Primary `deployed_address`: use the deployed `ServiceEscrow` address
- Primary `core_logic_path`: use `contracts/src/ServiceEscrow.sol`
- Supporting contract path: `contracts/src/AgentRegistry.sol`

Reasoning:

- `ServiceEscrow` is the main user-facing settlement contract and the primary entrypoint for paid order flow
- `AgentRegistry` supports discovery and metadata, but escrow/settlement is the core on-chain business logic

Placeholder example for `.initia/submission.json`:

```json
{
  "deployed_address": "<SERVICE_ESCROW_ADDRESS>",
  "core_logic_path": "contracts/src/ServiceEscrow.sol",
  "chain_id": "<APPCHAIN_CHAIN_ID>"
}
```

## Contracts

- `AgentRegistry`: manages agents and their service listings.
- `ServiceEscrow`: manages native-token orders, escrow, settlement, and refunds.
