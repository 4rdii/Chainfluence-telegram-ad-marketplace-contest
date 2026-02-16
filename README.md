# Chainfluence

**Trustless Telegram Advertising powered by TON Blockchain and EigenCompute TEE**

Chainfluence is a trustless advertising marketplace for Telegram channels. Publishers (channel owners) and advertisers connect through a Telegram Mini App. Funds are held in TEE-managed escrow wallets — not by any centralized party — and are automatically released or refunded based on cryptographically verifiable conditions.

> **[Watch the Demo](docs/chainfluence-demo-lq.mp4)**

---

## Table of Contents

- [How It Works](#how-it-works)
- [Architecture](#architecture)
- [Why This Design](#why-this-design)
- [Component Overview](#component-overview)
- [Deal Lifecycle](#deal-lifecycle)
- [Trust Model](#trust-model)
- [Security Design](#security-design)
- [Current Known Limitations](#current-known-limitations)
- [Future Thoughts](#future-thoughts)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## How It Works

1. **Agreement** — Publisher and advertiser agree on terms (channel, ad format, price, duration). Both cryptographically sign the deal parameters using their TON wallets via TonConnect.
2. **Deposit** — Advertiser deposits TON to a deal-specific escrow address derived by the TEE.
3. **Posting** — Publisher posts the agreed ad content to their Telegram channel.
4. **Verification** — TEE verifies both signatures, confirms deposit, validates post content via Telegram Bot API, and registers the deal on-chain.
5. **Monitoring** — A backend scheduler periodically calls the TEE to check whether the post is still live and unmodified.
6. **Settlement** — When the ad duration expires and content is verified intact, TEE releases funds to the publisher. If the content was removed or modified, TEE refunds the advertiser.

No human intervention is needed for settlement. The TEE makes all release/refund decisions based on on-chain data and Telegram API verification.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   Telegram Mini App (Frontend)                      │
│            React + TypeScript + TonConnect + Vite                    │
│         Deal signing, wallet connect, UI for all workflows          │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ HTTPS
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Caddy (Reverse Proxy + TLS)                     │
│              CORS handling, Cloudflare DNS, routing                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Backend (NestJS)                              │
│                                                                     │
│  Auth (Telegram Mini App initData validation + JWT)                 │
│  Users, Channels, Campaigns, Offers, Deals, Reviews, Notifications  │
│  Escrow Service (orchestrates signing flow, triggers TEE)           │
│  Scheduler (every 10 min: calls TEE checkDeal for active deals)    │
│                                                                     │
│                    PostgreSQL (via Prisma ORM)                       │
└───────────────────┬─────────────────────────────────────────────────┘
                    │ HTTP
                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│               TEE Service (EigenCompute)                             │
│                                                                     │
│  HD Wallet Derivation ── unique escrow address per deal             │
│  TonConnect Signature Verification ── proves both parties agreed    │
│  Telegram Bot API ── verifies post existence and content hash       │
│  Fund Transfer ── release to publisher or refund to advertiser      │
│  Contract Registration ── writes deal terms on-chain                │
│                                                                     │
└───────────────┬──────────────────────────┬──────────────────────────┘
                │                          │
                ▼                          ▼
┌──────────────────────────┐  ┌──────────────────────────────────────┐
│   Deal Registry          │  │   TEE-Derived Escrow Wallets         │
│   (TON Smart Contract)   │  │   (One per deal, HD-derived)         │
│                          │  │                                      │
│   Stores deal metadata:  │  │   Advertiser deposits TON here.      │
│   - channel, post IDs    │  │   TEE holds the private keys.        │
│   - content hash         │  │   Funds transfer only when TEE       │
│   - duration, parties    │  │   verifies conditions are met.       │
│   - amounts              │  │                                      │
│                          │  │   Admin wallet (index 0) pays gas    │
│   Only TEE can write.    │  │   for contract registration.         │
│   Anyone can read (free).│  │                                      │
└──────────────────────────┘  └──────────────────────────────────────┘
```

---

## Why This Design

### The Core Problem

An advertising escrow needs to:
1. Hold funds securely until conditions are met
2. Verify off-chain data (Telegram posts) that smart contracts cannot access
3. Execute automated release/refund based on real-world conditions
4. Prove to both parties that the decision was fair

### Escrow Options Compared

| Approach | Pros | Cons |
|----------|------|------|
| **Smart Contract Escrow** | Fully trustless | Cannot verify Telegram content; complex on-chain logic |
| **Centralized Backend** | Simple; can access APIs | Users must trust the operator completely |
| **Multisig** | Distributed trust | Requires manual coordination; slow resolution |
| **Oracle Network (Chainlink)** | Decentralized; battle-tested | No native TON support; high latency; per-request cost |
| **TEE (EigenCompute)** | Can access APIs; verifiable execution; TON native | Requires TEE hardware trust assumption |

### Why TEE Wins

The fundamental challenge is that ad verification requires **off-chain data** (does the Telegram post exist? does its content match?). Smart contracts cannot call external APIs. Oracles add latency and cost. A centralized backend requires full trust.

TEE provides the best tradeoff:

- **Off-chain data access** — TEE calls Telegram Bot API to verify posts exist and content matches the agreed hash.
- **Verifiable execution** — EigenCompute provides attestation that the exact code ran correctly in a secure enclave.
- **Key security** — Private keys for escrow wallets never leave the TEE. They are derived at runtime from a KMS-injected mnemonic.
- **Automation** — No manual intervention needed. Release and refund happen automatically based on verifiable conditions.
- **Cost effective** — TEE is invoked on-demand. No per-query oracle fees.
- **TON native** — Direct integration with TON blockchain without bridges or wrappers.

### Why the Contract Only Stores Metadata

The Deal Registry contract does NOT hold funds. It only stores deal terms (channel, content hash, duration, parties, amounts). This is deliberate:

- **Simplicity** — The contract is ~100 lines of Tolk. Fewer lines = fewer bugs = smaller attack surface.
- **Gas efficiency** — Registering a deal costs ~0.05 TON. A full escrow contract with release/refund logic would cost 3x more.
- **Flexibility** — The TEE can implement complex verification logic (API calls, hash comparisons, timeouts) that would be impossible or prohibitively expensive on-chain.
- **Transparency** — Anyone can read deal terms from the contract for free using `getDeal()`. The on-chain record proves what both parties agreed to.

The contract acts as an **immutable notary** — it timestamps and stores the agreement. The TEE acts as the **executor** — it holds funds and enforces the terms.

### Why HD Wallets for Escrow

Each deal gets a unique escrow address derived from a single master mnemonic using BIP-39 + SLIP-0010 (derivation path `m/44'/607'/index'/0'`):

- **Deterministic** — Same mnemonic always produces the same wallets. TEE can be restarted without losing access.
- **Isolated** — Each deal's funds are in a separate wallet. No commingling.
- **Scalable** — Unlimited deals from one mnemonic. No key management overhead.
- **Auditable** — Anyone can verify the escrow balance for a specific deal by checking its derived address.

### Why Telegram Auth + JWT

Users authenticate through Telegram Mini App's `initData`, which is HMAC-signed by Telegram's servers using the bot token. The backend validates this signature and issues a short-lived JWT. This means:

- No separate login/password system needed
- Identity is tied to Telegram account (natural for a Telegram marketplace)
- JWT allows stateless API authentication after initial validation

---

## Component Overview

### Frontend (`chainfluence-design/`)

Telegram Mini App built with React, TypeScript, and Vite. Integrates TonConnect for wallet operations and deal signing. Contains all user-facing screens (home, channels, campaigns, deals, profile) and the deal signing cryptography that must match the TEE's verification exactly.

See [docs/frontend.md](docs/frontend.md) for details.

### Backend (`backend/`)

NestJS application with Prisma ORM and PostgreSQL. Handles authentication, user/channel/campaign management, deal orchestration, and a cron scheduler that polls the TEE for deal status updates. Acts as the coordination layer between frontend and TEE — it does NOT make trust-critical decisions about funds.

See [docs/backend.md](docs/backend.md) for details.

### TEE Service (`ton-escrow-tee/`)

Node.js service running inside an EigenCompute Trusted Execution Environment. Holds the master mnemonic, derives escrow wallets, verifies TonConnect signatures, checks Telegram post content, and executes fund transfers. This is the only component that touches private keys.

See [docs/tee.md](docs/tee.md) for details.

### Smart Contract (`ton-deal-registry/`)

Minimal Tolk smart contract deployed on TON blockchain. Stores deal metadata (channel, post, content hash, duration, parties, amounts) with admin-only write access (only the TEE can register deals). Provides free getter functions for anyone to verify deal terms.

See [docs/smart-contract.md](docs/smart-contract.md) for details.

### Infrastructure

- **Caddy** (`caddy/`) — Reverse proxy with automatic TLS, CORS handling, and routing
- **Docker Compose** (`docker-compose.yml`) — Orchestrates PostgreSQL, backend, pgAdmin, and Caddy
- **EigenCompute** — Hosts the TEE service with KMS-managed secrets

---

## Deal Lifecycle

```
                        ┌──────────┐
                        │  CREATE  │  Advertiser initiates deal
                        └────┬─────┘  Backend creates record, TEE derives escrow address
                             │
                             ▼
                        ┌──────────┐
                        │  DEPOSIT │  Advertiser sends TON to escrow address
                        └────┬─────┘  (unique per deal, derived by TEE)
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              Both parties sign     Either party
              deal params via       doesn't sign
              TonConnect            within timeout
                    │                 │
                    ▼                 ▼
              ┌──────────┐     ┌──────────┐
              │ APPROVED │     │ REFUNDED │  12-hour deposit timeout
              └────┬─────┘     └──────────┘  TEE auto-refunds
                   │
                   ▼
              backend using GramJs posts ad
              content to channel
                   │
                   ▼
              ┌──────────────────┐
              │ TEE VERIFICATION │  Verifies signatures, deposit,
              └────┬─────────────┘  post content hash, registers on-chain
                   │
          ┌────────┴────────┐
          ▼                 ▼
     Verification      Verification
     succeeds          fails
          │                 │
          ▼                 ▼
     ┌──────────┐     ┌──────────┐
     │ ON-CHAIN │     │ REFUNDED │  Auto-refund on any check failure
     └────┬─────┘     └──────────┘
          │
          ▼
     Scheduler checks every 10 min:
     Is post still live? Content unchanged?
          │
     ┌────┴────────────────┐
     ▼                     ▼
  Duration expired     Content removed
  + content valid      or modified
     │                     │
     ▼                     ▼
┌──────────┐          ┌──────────┐
│ RELEASED │          │ REFUNDED │
└──────────┘          └──────────┘
```

### What Gets Verified

| Check | Who Verifies | How |
|-------|-------------|-----|
| Both parties agreed to terms | TEE | TonConnect ed25519 signature verification |
| Deposit amount is sufficient | TEE | Reads escrow wallet balance from blockchain |
| Post exists on channel | TEE | Forwards message via Telegram Bot API |
| Post content matches agreement | TEE | SHA-256 hash comparison |
| Post stayed up for full duration | TEE + Scheduler | Periodic re-verification via Bot API |
| Deal terms are immutable | Smart Contract | On-chain storage, anyone can verify |

---

## Trust Model

| Component | What It Stores/Controls | Trust Level | Why |
|-----------|------------------------|-------------|-----|
| Smart Contract | Deal terms (immutable) | **Trustless** | On-chain, transparent, anyone can read |
| TEE (EigenCompute) | Escrow private keys, fund transfers | **TEE-secured** | Hardware attestation, keys never leave enclave |
| Backend (NestJS) | User profiles, creative content, deal coordination | **Backend-trusted** | No access to funds; only orchestrates workflow |
| PostgreSQL | Off-chain metadata | **Backend-trusted** | Stores non-critical data (channels, notifications) |
| Frontend | User interface, deal signing | **Client-side** | All critical operations verified server-side |

### What the Backend Cannot Do

The backend is intentionally limited. It **cannot**:
- Move escrow funds (no access to private keys)
- Register fake deals on-chain (only TEE is the contract admin)
- Forge signatures (cryptographically bound to user wallets)
- Lie to the TEE (TEE reads deal terms from blockchain, not from backend)

The worst a compromised backend can do is refuse to serve the UI or delay deal processing. It cannot steal funds or create unauthorized deals.

---

## Security Design

### Signature Flow

Both parties sign the exact same deal parameters cell using TonConnect's `signData`:

```
Signed cell structure:
  Main cell: dealId(64) | channelId(64) | contentHash(256) | duration(32)
    ref[0] → publisher(address) | advertiser(address) | amount(coins)

Envelope (what wallet actually signs):
  prefix(32) | schemaHash(32) | timestamp(64) | signerAddress | domainCell | dealParamsCell
```

The TEE rebuilds this exact envelope and verifies the ed25519 signature against the signer's public key. It also checks that the public key corresponds to the claimed TON address (trying multiple wallet versions: V4R2, V5R1, V3R2, V3R1).

**Important**: `postId` and `postedAt` are intentionally NOT signed. This allows both parties to sign before the ad is posted (better UX), with the TEE independently verifying post details afterward.

### Content Hash Verification

The content hash is SHA-256 of the post text/caption. The frontend computes this hash when the deal is created, both parties sign it, and the TEE verifies it matches the actual post content fetched via Telegram Bot API.

### Deposit Timeout

If a deal is never registered on-chain (e.g., verification fails or parties never sign), the TEE implements a 12-hour timeout. After 12 hours, funds are automatically returned to the original depositor. The TEE reads the transaction history from the blockchain to identify the sender — no database dependency.

### TEE Isolation

- The master mnemonic is injected via EigenCompute KMS at runtime — never stored on disk
- The TEE is stateless — it re-derives wallets and re-reads blockchain state on every call
- EigenCompute provides cryptographic attestation that the exact published code is running

---

## Current Known Limitations

Chainfluence intentionally pushes trust-critical execution into a TEE so it can verify Telegram data and move funds without a centralized custodian. That design comes with explicit limitations and operational risks.

- **TEE code is upgradeable by the operator (us).**  
  If we can deploy new enclave code at any time, we can change release/refund logic, verification rules, or key handling. Attestation only proves “this code ran,” not “this code is what you expected,” unless clients actively verify the measurement against an allowlist.

- **TEE downtime can freeze settlement.**  
  If the TEE is unavailable, deals cannot be verified, registered, released, or refunded. Funds are in TEE-controlled escrow wallets; downtime turns “trustless automation” into “paused automation.” In prolonged outages, users may experience frozen funds until service is restored.

---

## Future Thoughts

Chainfluence is designed to work end-to-end today, but the long-term goal is to reduce remaining trust/ops assumptions and expand the marketplace into a more expressive “ad protocol” on top of Telegram + TON.

### Addressing Known Limitations

#### Upgradeability

EigenCompute is explicitly moving toward stronger guarantees around *what code is actually running*. In particular, EigenCompute’s **Verifiable Execution** and **Verifiable Builds** are intended to close the gap between “a TEE ran” and “the expected code ran”:

- Verifiable Execution: https://docs.eigencloud.xyz/eigencompute/concepts/trust-guarantees  
- Verifiable Builds: https://docs.eigencloud.xyz/eigencompute/concepts/verifiable-builds  

In addition to platform guarantees, we plan to evolve governance over time:

- **Start centralized, evolve to DAO-controlled upgrades.**  
  Initially, upgrades are managed by the team for speed of iteration. Over time, we plan to introduce a DAO (with a governance token) where protocol upgrades and configuration changes require **majority vote**.

- **DAO as the “admin” for upgrade decisions.**  
  The goal is that “who decides upgrades” is no longer a single operator decision. Instead, governance controls which enclave measurement(s) are approved for production, and what policy changes are allowed (e.g., timeouts, verification rules, deal types).

- **Public upgrade visibility.**  
  As governance matures, upgrades will be published with transparent metadata (commit hash / build provenance / measurement identifiers), so users can verify what version is active and when changes occurred.

#### Downtime

TEE downtime can freeze verification and settlement, so we want to reduce “operator uptime” from a hidden risk to an explicit, monitorable guarantee:

- **Prepaid TEE commitments + periodic proofs.**  
  We plan to keep the TEE service paid in advance (e.g., one year), and publish periodic attestations/proofs that the service is funded and scheduled to remain active. This does not eliminate all downtime risk, but it narrows the most common failure mode: “service stopped because the operator failed to maintain it.”

- **Operational hardening (reliability over heroics).**  
  We aim to add redundant deployment practices (health checks, automated restarts, alerting) so failures are detected and corrected quickly, with minimal time spent in “frozen settlement” states.

### Advancing the Protocol

Beyond hardening limitations, there are several product/protocol directions that can materially expand Chainfluence adoption and capability:

- **Bootstrap as a channel indexer (not just a middleman).**  
  Early on, we can act as a discovery layer: help advertisers find high-quality channels using structured channel metadata and performance signals, even before they run full escrowed campaigns.

- **Bring supply first: influencers + large channels.**  
  We plan to actively partner with influencers and large publishers to seed the marketplace, so advertisers see immediate inventory and publishers see real demand from day one.

- **Support more assets and payments.**  
  Add support for more tokens—especially stablecoins—to reduce volatility exposure, and explore cross-chain payments so advertisers can fund deals from other ecosystems while settling cleanly into TON escrow.

- **Richer deal types.**  
  Expand beyond fixed-price posts into:
  - **Auctions** (bid for a slot),
  - **time-based pricing** (premium rates during peak engagement windows),
  - and **staking-based offers** (token-staked guarantees, discounts, or prioritized placement).

- **DAO token: governance + possible utility.**  
  The governance token can serve as the coordination mechanism for upgrades and policy changes. Over time, it may also support utility features (e.g., staking to access premium inventory, fee discounts, or spam resistance), if the market demands it.

- **Privacy (if users demand it).**  
  If deal privacy becomes a priority, we can explore ways to reduce public exposure of sensitive terms while preserving verifiability (e.g., selective disclosure or commitment-based publishing of deal terms).

---

## Project Structure

```
chainfluence/
├── backend/                    # NestJS API server
│   ├── src/
│   │   ├── auth/               # Telegram Mini App auth + JWT
│   │   ├── users/              # User profiles and wallet linking
│   │   ├── channels/           # Publisher channel registration
│   │   ├── campaigns/          # Advertiser campaign management
│   │   ├── offers/             # Publisher offers on campaigns
│   │   ├── deals/              # Deal CRUD and status management
│   │   ├── escrow/             # Signing flow orchestration, TEE proxy
│   │   ├── tee/                # TEE HTTP client + deal check scheduler
│   │   ├── notifications/      # In-app notification system
│   │   ├── reviews/            # Post-deal rating system
│   │   ├── telegram/           # Telegram Bot API + GramJS integration
│   │   ├── uploads/            # File upload handling
│   │   ├── health/             # Health check endpoints
│   │   ├── prisma/             # Database client
│   │   ├── config/             # Environment validation
│   │   └── logger/             # Logging service
│   ├── prisma/
│   │   └── schema.prisma       # Database schema
│   └── Dockerfile
│
├── ton-escrow-tee/             # TEE service (runs in EigenCompute)
│   ├── src/
│   │   ├── index.ts            # HTTP API (Express)
│   │   ├── tee-service.ts      # Core escrow logic
│   │   ├── wallet.ts           # HD wallet derivation (BIP-39/SLIP-0010)
│   │   ├── signature.ts        # TonConnect signature verification
│   │   ├── bot-api.ts          # Telegram content verification
│   │   ├── deal-registry.ts    # Smart contract interaction
│   │   ├── ton-client.ts       # TON blockchain client with retry
│   │   └── types.ts            # Type definitions
│   └── Dockerfile
│
├── ton-deal-registry/          # TON smart contract
│   ├── contracts/
│   │   └── deal_registry.tolk  # Tolk contract source
│   ├── wrappers/
│   │   └── DealRegistry.ts     # TypeScript wrapper
│   ├── tests/
│   │   └── DealRegistry.spec.ts
│   └── scripts/
│       └── deployDealRegistry.ts
│
├── chainfluence-design/        # Telegram Mini App frontend
│   ├── src/
│   │   ├── App.tsx             # Main app + screen navigation
│   │   ├── lib/                # API client, auth, deal signing, adapters
│   │   ├── components/         # UI components and screen views
│   │   └── types/              # Frontend type definitions
│   └── public/
│       └── tonconnect-manifest.json
│
├── caddy/                      # Reverse proxy
│   ├── Caddyfile               # Routing + TLS config
│   └── Dockerfile
│
├── tests/                      # Integration tests
│   ├── integration/            # TEE + contract integration tests
│   └── unit/                   # Wallet derivation tests
│
├── scripts/                    # Utility scripts
├── docker-compose.yml          # Local development orchestration
├── Makefile                    # Build shortcuts
└── docs/                       # Component documentation
    ├── frontend.md
    ├── backend.md
    ├── tee.md
    └── smart-contract.md
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- A Telegram bot token (from @BotFather)
- TON testnet wallet with test TON

### Smart Contract

```bash
cd ton-deal-registry
npm install
npx blueprint build    # Compile Tolk contract
npx blueprint test     # Run contract tests
npx blueprint run      # Deploy to testnet
```

### TEE Service

```bash
cd ton-escrow-tee
npm install
cp .env.example .env
# Set: MNEMONIC, BOT_TOKEN, DEAL_REGISTRY_ADDRESS, TESTNET=true
npm run dev
```

### Backend

```bash
cd backend
npm install
cp .env.example .env
# Set: DATABASE_URL, TELEGRAM_BOT_TOKEN, TEE_URL, JWT_SECRET
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

### Frontend

```bash
cd chainfluence-design
npm install
# Set VITE_API_BASE_URL in .env
npm run dev
```

### Full Stack (Docker)

```bash
# Set environment variables in backend/.env
docker compose up -d
```

---

## Deployment

### Backend + Database

Docker Compose deploys PostgreSQL, the NestJS backend, pgAdmin, and Caddy. The Caddy reverse proxy handles TLS termination using Cloudflare DNS challenge.

```bash
make up                    # Start all services
make build-backend-and-up  # Rebuild backend and start
```

### TEE Service (EigenCompute)

```bash
cd ton-escrow-tee
docker build -t docker.io/<user>/ton-escrow-tee:latest .
docker push docker.io/<user>/ton-escrow-tee:latest
ecloud compute app upgrade <app-id> --image-ref docker.io/<user>/ton-escrow-tee:latest
```

Environment variables (`MNEMONIC`, `BOT_TOKEN`, etc.) are managed through EigenCompute KMS — they are injected at runtime and never stored on disk.

### Smart Contract

Deployed once to TON mainnet/testnet using Blueprint:

```bash
cd ton-deal-registry
npx blueprint run deployDealRegistry
```

The contract address is then configured in both the TEE service (`DEAL_REGISTRY_ADDRESS`) and can be verified by anyone on-chain.

### Frontend

Deployed as static files to Vercel (or any static host):

```bash
cd chainfluence-design
npm run build
# Deploy build/ directory
```

---

## Environment Variables

### Backend

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token |
| `JWT_SECRET` | Yes | Secret for JWT signing (min 32 chars) |
| `TEE_URL` | Yes | URL of the TEE service |
| `PORT` | No | Server port (default: 3000) |
| `TELEGRAM_API_ID` | No | For GramJS MTProto (advanced channel stats) |
| `TELEGRAM_API_HASH` | No | For GramJS MTProto |

### TEE Service

| Variable | Required | Description |
|----------|----------|-------------|
| `MNEMONIC` | Yes | Master mnemonic for HD wallet derivation (SECRET) |
| `BOT_TOKEN` | Yes | Telegram Bot API token for content verification |
| `DEAL_REGISTRY_ADDRESS` | Yes | TON address of Deal Registry contract |
| `TESTNET` | No | Set to "true" for testnet (default: mainnet) |
| `PORT` | No | Server port (default: 3000) |
| `TONCENTER_API_KEY` | No | TON Center API key for higher rate limits |

### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | Yes | Backend API URL |

---

## Documentation

Detailed per-component documentation is in the [docs/](docs/) folder:

- [Frontend](docs/frontend.md) — Mini App architecture, screens, deal signing
- [Backend](docs/backend.md) — API structure, auth flow, database schema, scheduler
- [TEE Service](docs/tee.md) — Escrow logic, wallet derivation, signature verification, content checks
- [Smart Contract](docs/smart-contract.md) — Contract design, cell structure, security properties

---

## License

MIT
