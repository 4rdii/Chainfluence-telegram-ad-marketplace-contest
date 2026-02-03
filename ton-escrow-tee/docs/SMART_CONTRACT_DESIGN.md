# Deal Registry Smart Contract

## Overview

A minimal smart contract (written in **Tolk**) that acts as a **trustless state registry** for deal terms. The contract does NOT hold funds - TEE HD wallets manage escrow funds.

**Contract responsibilities:**
1. Store deal terms on-chain (immutable commitment)
2. Only allow TEE (admin) to create deals
3. Provide `getDeal` for anyone to verify terms

**TEE responsibilities:**
1. Verify signatures from both parties before registering
2. Derive HD wallets for escrow
3. Hold and transfer funds
4. Verify deposits and content via Bot API

## Why Admin-Only Create

| Aspect | Anyone Creates | Admin-Only Creates |
|--------|---------------|-------------------|
| Who calls contract | Advertiser | TEE |
| Signature verification | On-chain (complex) | In TEE (simple) |
| When deal is created | Before deposit | After all verifications pass |
| Invalid deals on-chain | Possible | Impossible |

**Chosen approach: Admin-Only** - TEE verifies everything first, then registers.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEAL FLOW                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Both parties sign deal params off-chain                     │
│     Publisher signs: {dealId, channelId, postId, contentHash,   │
│                       duration, publisher, advertiser, amount,  │
│                       postedAt}                                 │
│     Advertiser signs: same params                               │
│                                                                 │
│  2. Advertiser deposits TON to escrow address                   │
│     Backend detects deposit, calls TEE                          │
│                                                                 │
│  3. TEE verifies everything:                                    │
│     ✓ Publisher signature valid                                 │
│     ✓ Advertiser signature valid                                │
│     ✓ Deposit >= amount                                         │
│     ✓ Post exists via Bot API                                   │
│     ✓ Content hash matches                                      │
│                                                                 │
│  4. TEE calls createDeal on contract                            │
│     Only TEE (admin) can do this                                │
│                                                                 │
│  5. Deal is now registered on-chain                             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Contract State

```tolk
// Tolk smart contract

global admin: address;      // TEE address (set once at deploy)
global deals: dict;         // Dictionary: deal_id -> deal_data
global nextDealId: int;     // Auto-increment counter
```

### Deal Data Structure

Each deal stores:
- `channelId` (int64) - Telegram channel ID
- `postId` (int64) - Telegram message ID
- `contentHash` (uint256) - SHA256 of ad content
- `duration` (uint32) - Seconds ad must stay up
- `publisher` (address) - Publisher's TON address
- `advertiser` (address) - Advertiser's TON address
- `amount` (coins) - Escrow amount in nanoTON
- `postedAt` (uint32) - When ad was posted (unix timestamp)
- `createdAt` (uint32) - When deal was registered (unix timestamp)

---

## Contract Functions

### 1. `createDeal` (Admin Only)

```tolk
fun onInternalMessage(msgValue: int, msgFull: cell, msgBody: slice) {
    // ...
    if (op == OP_CREATE_DEAL) {
        // Only admin (TEE) can create deals
        assert(senderAddress == admin, ERROR_UNAUTHORIZED);

        // Parse deal params from message
        // Store in deals dictionary
        // Increment nextDealId
    }
}
```

**Called by:** TEE only (after verifying signatures, deposit, content)
**Gas cost:** ~0.05 TON

### 2. `getDeal` (Getter - Free)

```tolk
get fun getDeal(dealId: int): (int, int, int, int, address, address, int, int, int) {
    // Returns: channelId, postId, contentHash, duration,
    //          publisher, advertiser, amount, postedAt, createdAt
}
```

**Called by:** Anyone (to verify deal terms)
**Gas cost:** FREE

### 3. `dealExists` (Getter - Free)

```tolk
get fun dealExists(dealId: int): int {
    // Returns 1 if exists, 0 if not
}
```

### 4. `getNextDealId` (Getter - Free)

```tolk
get fun getNextDealId(): int {
    // Returns next available deal ID
}
```

### 5. `getAdmin` (Getter - Free)

```tolk
get fun getAdmin(): address {
    // Returns admin (TEE) address
}
```

---

## Cell Structure

Due to TON's 1023-bit cell limit, deal data is split:

**Main cell:**
- channelId (64 bits)
- postId (64 bits)
- contentHash (256 bits)
- duration (32 bits)
- postedAt (32 bits)
- createdAt (32 bits)
- Reference to address cell

**Address cell (referenced):**
- publisher (267 bits)
- advertiser (267 bits)
- amount (124 bits max)

---

## Message Format

### createDeal Message Body

```
| Field       | Bits | Description              |
|-------------|------|--------------------------|
| op          | 32   | 0x1 (OP_CREATE_DEAL)     |
| dealId      | 64   | Deal ID                  |
| channelId   | 64   | Telegram channel ID      |
| postId      | 64   | Telegram message ID      |
| contentHash | 256  | SHA256 of content        |
| duration    | 32   | Duration in seconds      |
| ref         | cell | Address cell (below)     |

Address cell:
| Field       | Bits | Description              |
|-------------|------|--------------------------|
| publisher   | 267  | Publisher address        |
| advertiser  | 267  | Advertiser address       |
| amount      | var  | Amount (VarUInt16)       |
| postedAt    | 32   | Posted timestamp         |
```

---

## Security Properties

| Attack | Mitigated By |
|--------|-------------|
| Fake deal registration | Only admin can create |
| Admin lies about terms | Admin is TEE with attestation |
| Modify deal after creation | Deals are immutable once stored |
| Query wrong deal | Deal ID is explicit parameter |

---

## TypeScript Integration

```typescript
// From ton-escrow-tee/src/deal-registry.ts

const OP_CREATE_DEAL = 0x1;

// Build createDeal message
const addressesCell = beginCell()
    .storeAddress(params.publisher)
    .storeAddress(params.advertiser)
    .storeCoins(params.amount)
    .storeUint(params.postedAt, 32)
    .endCell();

const body = beginCell()
    .storeUint(OP_CREATE_DEAL, 32)
    .storeUint(params.dealId, 64)
    .storeInt(params.channelId, 64)
    .storeInt(params.postId, 64)
    .storeUint(params.contentHash, 256)
    .storeUint(params.duration, 32)
    .storeRef(addressesCell)
    .endCell();
```

---

## Comparison

| Aspect | Full Escrow Contract | Deal Registry (Current) |
|--------|---------------------|------------------------|
| Fund custody | Contract | TEE HD Wallets |
| Who creates deals | Advertiser | TEE (admin) |
| Signature verification | On-chain | In TEE |
| Complexity | High | Low |
| Gas per deal | ~0.15 TON | ~0.05 TON |
| Trust model | Trustless | TEE-secured |
