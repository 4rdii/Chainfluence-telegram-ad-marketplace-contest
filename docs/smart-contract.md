# Smart Contract — Deal Registry

## Overview

The Deal Registry is a minimal smart contract written in **Tolk** (TON's high-level language) that stores deal metadata on the TON blockchain. It acts as an immutable notary — recording what both parties agreed to — while the TEE handles all fund management separately.

The contract is located in `ton-deal-registry/`.

---

## Design Philosophy

### What the Contract Does

- Stores deal terms on-chain (immutable once written)
- Restricts write access to the TEE (admin-only `createDeal`)
- Provides free getter functions for anyone to verify deal terms

### What the Contract Does NOT Do

- Hold or transfer funds (TEE HD wallets handle escrow)
- Verify signatures (done in TEE before registration)
- Track deal status (derived from escrow balance and external checks)
- Implement release/refund logic (TEE executes fund transfers)

### Why This Split?

| Aspect | Full Escrow Contract | Deal Registry (Current) |
|--------|---------------------|------------------------|
| Fund custody | Contract | TEE HD Wallets |
| Who creates deals | Advertiser | TEE (admin) |
| Signature verification | On-chain (complex) | In TEE (simple) |
| Content verification | Impossible (no API access) | TEE calls Telegram API |
| Complexity | High (~500+ lines) | Low (~100 lines) |
| Gas per deal | ~0.15 TON | ~0.05 TON |
| Attack surface | Large | Minimal |

The contract is intentionally simple. Complex logic belongs in the TEE where it can access external APIs and be updated without redeploying an immutable contract.

---

## Admin-Only Registration

Only the TEE (admin address, set at deploy time) can create deals. This is a critical design choice:

| Aspect | Anyone Creates | Admin-Only (Current) |
|--------|---------------|---------------------|
| Who calls contract | Advertiser | TEE |
| Signature verification | Must be on-chain (expensive) | Done in TEE (free) |
| When deal is created | Before verification | After ALL checks pass |
| Invalid deals on-chain | Possible | Impossible |
| Gas cost | Higher (more logic) | Lower (just storage) |

By the time a deal appears on-chain, the TEE has already verified:
1. Both parties signed the exact same terms
2. Deposit is confirmed in the escrow wallet
3. Post exists on the Telegram channel
4. Content hash matches the agreed content

---

## Contract State

```tolk
global admin: address;      // TEE address (immutable after deploy)
global nextDealId: int;     // Auto-increment counter
global deals: dict;         // Dictionary: dealId → deal cell
```

### Deal Data Structure

Each deal stores 9 fields across two cells (due to TON's 1023-bit cell limit):

**Main cell** (stored in dictionary):
| Field | Bits | Description |
|-------|------|-------------|
| channelId | 64 | Telegram channel ID |
| postId | 64 | Telegram message ID |
| contentHash | 256 | SHA-256 of ad content |
| duration | 32 | Seconds ad must stay up |
| postedAt | 32 | When ad was posted (unix timestamp) |
| createdAt | 32 | When deal was registered (unix timestamp) |
| ref[0] | cell | Reference to address cell |

**Address cell** (referenced from main cell):
| Field | Bits | Description |
|-------|------|-------------|
| publisher | 267 | Publisher's TON address |
| advertiser | 267 | Advertiser's TON address |
| amount | variable | Escrow amount in nanoTON (VarUInt16) |

The split is necessary because a single cell can hold at most 1023 bits, and two TON addresses alone use 534 bits.

---

## Contract Functions

### `createDeal` (Op 0x1) — Admin Only

Registers a new deal. Only callable by the admin (TEE) address.

**Message body**:
```
| Field       | Bits | Description           |
|-------------|------|-----------------------|
| op          | 32   | 0x1 (OP_CREATE_DEAL)  |
| dealId      | 64   | Deal identifier       |
| channelId   | 64   | Telegram channel ID   |
| postId      | 64   | Telegram message ID   |
| contentHash | 256  | SHA-256 of content    |
| duration    | 32   | Duration in seconds   |
| ref[0]      | cell | Address cell          |

Address cell:
| Field       | Bits | Description           |
|-------------|------|-----------------------|
| publisher   | 267  | Publisher address     |
| advertiser  | 267  | Advertiser address    |
| amount      | var  | Amount (VarUInt16)    |
| postedAt    | 32   | Posted timestamp      |
```

**Validation**:
- Sender must be admin (error 401 if not)
- Deal ID must not already exist (error 409 if duplicate)

**Gas cost**: ~0.05 TON

### `getDeal(dealId)` — Getter (Free)

Returns all 9 deal fields. Can be called by anyone at no cost.

```tolk
get fun getDeal(dealId: int):
  (int, int, int, int, address, address, int, int, int)
  // channelId, postId, contentHash, duration,
  // publisher, advertiser, amount, postedAt, createdAt
```

### `dealExists(dealId)` — Getter (Free)

Returns 1 if deal exists, 0 if not.

### `getNextDealId()` — Getter (Free)

Returns the next available deal ID (auto-increment counter).

### `getAdmin()` — Getter (Free)

Returns the admin (TEE) address.

---

## TypeScript Integration

### Contract Wrapper (`wrappers/DealRegistry.ts`)

The TypeScript wrapper provides a clean interface for interacting with the contract:

```typescript
import { DealRegistry } from './wrappers/DealRegistry';

// Open contract
const registry = provider.open(DealRegistry.createFromAddress(address));

// Create deal (TEE only)
await registry.sendCreateDeal(provider.sender(), {
  dealId: 42n,
  channelId: -1001234567890n,
  postId: 123n,
  contentHash: 0xabcdef...n,
  duration: 86400n,  // 24 hours
  publisher: Address.parse('...'),
  advertiser: Address.parse('...'),
  amount: toNano('50'),
  postedAt: BigInt(Math.floor(Date.now() / 1000)),
});

// Read deal (anyone, free)
const deal = await registry.getDeal(42n);
// deal = { channelId, postId, contentHash, duration,
//          publisher, advertiser, amount, postedAt, createdAt }
```

### TEE Usage (`ton-escrow-tee/src/deal-registry.ts`)

The TEE uses a similar wrapper to register deals after verification:

```typescript
// Build message body
const body = beginCell()
  .storeUint(OP_CREATE_DEAL, 32)
  .storeUint(params.dealId, 64)
  .storeInt(params.channelId, 64)
  .storeInt(params.postId, 64)
  .storeUint(params.contentHash, 256)
  .storeUint(params.duration, 32)
  .storeRef(
    beginCell()
      .storeAddress(params.publisher)
      .storeAddress(params.advertiser)
      .storeCoins(params.amount)
      .storeUint(params.postedAt, 32)
      .endCell()
  )
  .endCell();
```

---

## Security Properties

| Attack | Mitigated By |
|--------|-------------|
| Fake deal registration | Only admin (TEE) can call createDeal |
| Admin lies about terms | Admin is TEE with hardware attestation |
| Modify deal after creation | Deals are immutable once stored |
| Query wrong deal | Deal ID is explicit parameter |
| Drain contract funds | Contract holds no funds (only ~0.1 TON for storage) |
| Deploy malicious contract | Contract address is public and verifiable |

---

## Tests

**File**: `tests/DealRegistry.spec.ts`

| Test | Description |
|------|-------------|
| Deploy | Contract deploys and initializes correctly |
| Admin create | Admin can create deals successfully |
| Non-admin rejected | Error 401 for unauthorized callers |
| Duplicate rejected | Error 409 for existing deal IDs |
| Multiple deals | Multiple deals stored and retrieved correctly |
| Counter increment | nextDealId increments properly |
| Getter correctness | All 9 fields returned accurately |

### Running Tests

```bash
cd ton-deal-registry
npm install
npx blueprint test
```

Uses TON Sandbox for isolated blockchain simulation.

---

## Deployment

### Build

```bash
npx blueprint build
```

Compiles the Tolk source to a BOC (Bag of Cells) file.

### Deploy

```bash
npx blueprint run deployDealRegistry
```

The deploy script:
1. Compiles the contract
2. Sets the admin address (TEE wallet at index 0)
3. Deploys to testnet/mainnet
4. Returns the contract address

### Configuration

After deployment, set the contract address in:
- TEE service: `DEAL_REGISTRY_ADDRESS` environment variable
- Frontend (optional): For direct contract queries

---

## Contract Source

The full Tolk source is in `contracts/deal_registry.tolk`. It's approximately 100 lines — intentionally minimal to reduce attack surface and gas costs.

---

## Project Structure

```
ton-deal-registry/
├── contracts/
│   └── deal_registry.tolk      # Contract source (Tolk)
├── wrappers/
│   ├── DealRegistry.ts         # TypeScript wrapper
│   └── DealRegistry.compile.ts # Compilation config
├── tests/
│   └── DealRegistry.spec.ts    # Contract tests
├── scripts/
│   └── deployDealRegistry.ts   # Deployment script
├── jest.config.ts
├── package.json
└── tsconfig.json
```
