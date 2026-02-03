# Telegram Ad Marketplace

A decentralized advertising marketplace for Telegram channels, powered by TON blockchain and EigenCompute TEE for trustless escrow.

## Overview

Publishers (channel owners) and advertisers connect through this platform. Advertisers pay for ads using TON, with funds held in TEE-managed escrow until the ad duration is fulfilled.

### How It Works

1. **Agreement** - Publisher and advertiser agree on terms off-chain, both sign the deal parameters
2. **Deposit** - Advertiser deposits TON to a deal-specific escrow address
3. **Verification** - TEE verifies signatures, deposit, and posted content
4. **Registration** - Deal is registered on-chain via the Deal Registry contract
5. **Monitoring** - Backend periodically checks post status
6. **Settlement** - TEE releases funds to publisher (success) or refunds advertiser (violation)

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │────▶│     TEE     │
│  (Telegram) │     │  (Polling)  │     │ (EigenComp) │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │                          │                          │
                    ▼                          ▼                          ▼
            ┌──────────────┐          ┌──────────────┐          ┌──────────────┐
            │ Deal Registry│          │  HD Wallets  │          │  Bot API     │
            │  (Contract)  │          │   (Escrow)   │          │ (Verify)     │
            └──────────────┘          └──────────────┘          └──────────────┘
```

## Project Structure

```
├── ton-deal-registry/     # TON smart contract (Tolk)
│   ├── contracts/         # Deal Registry contract
│   ├── wrappers/          # TypeScript wrapper
│   └── tests/             # Contract tests
│
└── ton-escrow-tee/        # TEE service
    ├── src/               # Service implementation
    └── docs/              # Detailed documentation
        ├── PRODUCT_DESIGN.md
        ├── ROADMAP.md
        └── SMART_CONTRACT_DESIGN.md
```

## Why EigenCompute TEE?

### The Problem

Ad marketplace escrow needs to:
1. Hold funds securely until conditions are met
2. Verify off-chain data (Telegram posts) that can't be accessed on-chain
3. Execute automated release/refund based on real-world conditions

### Escrow Options Compared

| Approach | Pros | Cons |
|----------|------|------|
| **Smart Contract Escrow** | Fully trustless | Can't verify Telegram content; complex on-chain logic |
| **Centralized Backend** | Simple; can access APIs | Users must trust the operator |
| **Multisig** | Distributed trust | Requires manual coordination; slow |
| **Chainlink CRE** | Decentralized oracle network; battle-tested | No native TON support; higher latency; cost per request |
| **TEE (EigenCompute)** | Can access APIs; verifiable execution; TON native | Requires TEE trust assumption |

### Why TEE Wins for This Use Case

1. **Off-chain Data Access** - TEE can call Telegram Bot API to verify posts exist and content matches
2. **Verifiable Execution** - EigenCompute provides attestation that code ran correctly
3. **Key Security** - Private keys never leave TEE; derived from KMS-provided mnemonic
4. **Automation** - No manual intervention needed for release/refund
5. **Cost Effective** - Invoked on-demand, pay only for compute time
6. **TON Native** - Direct integration with TON blockchain without bridges

### EigenCompute Specifics

- **KMS Integration** - Mnemonic injected at runtime, not stored
- **Stateless** - TEE doesn't persist state; reads from blockchain
- **Attestation** - Cryptographic proof of code integrity
- **On-demand** - Spun up only when needed (deposit detected, check triggered)

## Key Features

- **Trustless Escrow** - Funds held in TEE-derived HD wallets, not custodial
- **On-chain State** - Deal terms recorded on TON blockchain
- **Content Verification** - TEE verifies posts via Telegram Bot API
- **Signature-based Agreement** - Both parties must sign deal terms
- **Automatic Settlement** - Release on success, refund on violation

## TEE Functions

| Function | Description |
|----------|-------------|
| `createEscrowWallet(dealId)` | Derive deposit address for a deal |
| `verifyAndRegisterDeal(input)` | Verify all conditions, register on-chain |
| `checkDeal(dealId)` | Check status, release/refund if conditions met |

## Getting Started

### Deal Registry Contract

```bash
cd ton-deal-registry
npm install
npm run build
npm test
```

### TEE Service

```bash
cd ton-escrow-tee
npm install
npm run dev
```

## Documentation

See [ton-escrow-tee/docs/](ton-escrow-tee/docs/) for detailed documentation:

- [Product Design](ton-escrow-tee/docs/PRODUCT_DESIGN.md) - Full system design
- [Roadmap](ton-escrow-tee/docs/ROADMAP.md) - Development milestones
- [Smart Contract Design](ton-escrow-tee/docs/SMART_CONTRACT_DESIGN.md) - Contract architecture

## License

MIT
