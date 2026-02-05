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

## TODO

### Refactor: Make checkPostStatus Use Contract Data

- [ ] **Refactor `checkPostStatus` to always fetch from contract**

  **Current Issue:** `checkPostStatus` accepts `channelId`, `postId`, and `contentHash` as parameters. This creates inconsistency:
  - In `verifyAndRegisterDeal`: Uses user-provided params (not yet on-chain)
  - In `checkDeal`: Uses contract data (source of truth)

  **Solution:** Create a clear separation between low-level and high-level verification:
  1. Keep `verifyContent()` in `bot-api.ts` - Low-level method that takes explicit parameters
  2. Create `checkDealStatus()` in `tee-service.ts` - High-level method that fetches from contract

  **Implementation:**
  ```typescript
  // In tee-service.ts
  async checkDealStatus(dealId: number, verificationChatId: number) {
    // 1. Fetch deal from contract (source of truth)
    const contract = this.client.open(this.dealRegistry);
    const deal = await contract.getDeal(BigInt(dealId));

    if (!deal) {
      throw new Error('Deal not found in registry');
    }

    // 2. Verify using contract data
    return await this.botApi.checkPostStatus(
      deal.channelId,
      deal.postId,
      deal.contentHash,
      verificationChatId
    );
  }
  ```

  **Files to modify:**
  - `ton-escrow-tee/src/tee-service.ts` - Add `checkDealStatus()` method
  - Update `checkDeal()` to use the new method
  - Keep `verifyAndRegisterDeal()` using direct params (since deal not registered yet)

  **Why this matters:**
  - All fields (channelId, postId, contentHash) ARE stored in contract (lines 209-211 of tee-service.ts)
  - Contract is the single source of truth after registration
  - Prevents potential security issues from accepting user-provided data

### Code Cleanup

- [ ] **Remove unused `createSenderFromWallet` function**

  **Issue:** The `createSenderFromWallet()` helper function in `ton-escrow-tee/src/deal-registry.ts` (lines 96-121) is defined but never used anywhere in the codebase.

  **Current situation:**
  - The function was created to provide a cleaner way to interact with contract methods
  - The TEE service manually builds and sends transactions instead (tee-service.ts:160-178)
  - No tests or other code references this function

  **Action:** Remove the dead code from `ton-escrow-tee/src/deal-registry.ts`

  **Alternative:** If cleaner contract interactions are desired, refactor `tee-service.ts` to use this helper instead of manual transaction building.

### Image Verification Enhancement

- [ ] **Implement hybrid hash approach for image posts**

  **Current Issue:** The TEE only hashes text/caption content. Image-only posts (without captions) result in empty string hashes, making them unverifiable.

  **Solution:** Implement a hybrid content hashing approach that combines:
  - `file_unique_id` - Telegram's stable file identifier
  - `file_size` - File size in bytes
  - `caption` - Optional text caption (if present)

  **Implementation Notes:**
  - Update `computeContentHash()` in `ton-escrow-tee/src/bot-api.ts` to handle `Message` objects with photos
  - When `message.photo` exists, extract the largest photo size (`photo[photo.length - 1]`)
  - Create combined hash: `SHA256(file_unique_id + file_size + (caption || ''))`
  - This avoids downloading full images while still providing content verification
  - Update frontend to compute the same hash when creating deals for image posts

  **Files to modify:**
  - `ton-escrow-tee/src/bot-api.ts` - Add photo handling to `computeContentHash()`
  - Frontend deal creation - Match the hash computation logic

  **Alternative (more robust but slower):** Download actual image bytes and hash them using `getFile` + `downloadFile` APIs. This provides true content verification but requires more bandwidth.

## License

MIT
