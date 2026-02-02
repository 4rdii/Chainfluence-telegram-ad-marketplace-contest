# TON Escrow Smart Contract Design

## Overview

A minimal smart contract that acts as a **trustless state registry** for deal terms. The contract does NOT hold funds - TEE HD wallets still manage escrow funds.

**Contract responsibilities:**
1. Store deal terms on-chain (immutable commitment)
2. Provide `get_deal` for TEE to verify terms

**TEE responsibilities (unchanged):**
1. Derive HD wallets for escrow
2. Hold and transfer funds
3. Verify deposits against on-chain deal terms

## Why This Approach

| Aspect | Backend DB Only | Contract as State Registry |
|--------|-----------------|---------------------------|
| Deal terms | Backend can lie | Immutable on-chain |
| TEE verification | Must trust backend | Reads from chain directly |
| Advertiser commitment | Can dispute terms | Signed on-chain tx |
| Complexity | Lower | Slightly higher |
| Gas cost | None | ~0.02 TON per deal |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    SIMPLIFIED ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Advertiser                                                    │
│       │                                                         │
│       │  1. create_deal(publisher, amount, timeout)             │
│       │  ─────────────────────────────►  CONTRACT               │
│       │     (commits to terms on-chain)  (stores terms)         │
│       │                                                         │
│       │  2. deposit TON ──────────────►  TEE HD WALLET          │
│       │     (to derived escrow address)  (holds funds)          │
│       │                                                         │
│   TEE                                                           │
│       │                                                         │
│       │  3. get_deal(deal_id) ────────►  CONTRACT               │
│       │  ◄────────────────────────────   {publisher, amount,    │
│       │                                   timeout, advertiser}  │
│       │                                                         │
│       │  4. Verify deposit against on-chain terms:              │
│       │     - escrow balance >= deal.amount                     │
│       │     - within timeout period                             │
│       │                                                         │
│       │  5. Execute release/refund from TEE wallet              │
│       │     (TEE still controls the actual funds)               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Contract State (Minimal)

```func
;; FunC (TON smart contract language)

;; Simple deal registry - just stores terms, doesn't hold funds

global cell deals;           ;; Dictionary: deal_id -> deal_data
global int next_deal_id;     ;; Auto-increment counter

;; Deal data structure (per deal)
;; - advertiser: MsgAddress (who pays)
;; - publisher: MsgAddress (who receives)
;; - amount: Coins (expected deposit in nanoTON)
;; - escrow_index: uint32 (TEE HD wallet derivation index)
;; - created_at: uint32 (timestamp)
;; - accept_timeout: uint32 (seconds)
;; - release_timeout: uint32 (seconds)
```

No status tracking in contract - TEE derives status from:
1. On-chain deal terms (from contract)
2. Escrow wallet balance (from blockchain)
3. Off-chain events (from backend)

---

## Contract Functions

### 1. `create_deal` (Advertiser)

```func
() create_deal(
    slice publisher,
    int amount,
    int accept_timeout,
    int release_timeout
) impure {
    ;; Get next deal ID
    int deal_id = next_deal_id;
    next_deal_id += 1;

    ;; Store deal terms
    ;; escrow_index = deal_id + 1 (matching TEE derivation)
    deals~udict_set(64, deal_id, pack_deal(
        sender_address,    ;; advertiser
        publisher,
        amount,
        deal_id + 1,       ;; escrow_index for TEE
        now(),
        accept_timeout,
        release_timeout
    ));

    ;; Emit event with escrow address (TEE can derive, but helpful)
}
```

**Called by:** Advertiser via Mini App
**Gas cost:** ~0.02 TON

### 2. `get_deal` (Getter - Free)

```func
;; method_id makes this a getter (free to call, no gas)
(slice, slice, int, int, int, int, int) get_deal(int deal_id) method_id {
    (slice deal_data, int found) = deals.udict_get?(64, deal_id);
    throw_unless(404, found);

    return unpack_deal(deal_data);
    ;; Returns: (advertiser, publisher, amount, escrow_index,
    ;;           created_at, accept_timeout, release_timeout)
}

int get_next_deal_id() method_id {
    return next_deal_id;
}
```

**Called by:** TEE to verify deal terms
**Gas cost:** FREE (getter method)

---

## That's It!

The contract is intentionally minimal:

| What contract does | What contract does NOT do |
|-------------------|--------------------------|
| Store deal terms | Hold funds |
| Provide `get_deal` | Track deal status |
| Auto-increment IDs | Handle timeouts |
| Emit creation events | Process payments |

---

## TEE Verification Flow

```typescript
// TEE verifies deposit against on-chain terms
async function verifyDeposit(dealId: number): Promise<VerificationResult> {
  // 1. Read deal terms from CONTRACT (trustless)
  const deal = await contract.get_deal(dealId);
  // deal = { advertiser, publisher, amount, escrow_index, ... }

  // 2. Derive escrow wallet using same index
  const escrow = await deriveEscrowWallet(mnemonic, deal.escrow_index);

  // 3. Check escrow balance on-chain
  const balance = await client.getBalance(escrow.addressRaw);

  // 4. Verify
  if (balance >= deal.amount) {
    return { verified: true, deal, escrow };
  } else {
    return { verified: false, reason: 'Insufficient deposit' };
  }
}
```

**Key insight:** TEE reads terms from contract, not from backend. Backend cannot lie about deal terms.

---

## Security Properties

| Attack | Mitigated By |
|--------|-------------|
| Backend lies about deal terms | TEE reads from contract |
| Advertiser disputes amount | They signed create_deal tx |
| Publisher claims wrong address | Contract stores their address |
| Someone creates fake deal | Must match advertiser's signature |

---

## Gas Costs

| Operation | Cost | Payer |
|-----------|------|-------|
| create_deal | ~0.02 TON | Advertiser |
| get_deal | FREE | - |

Total per deal: **~0.02 TON** (vs ~0.15 TON for full escrow contract)

---

## Comparison

| Aspect | No Contract | Simple Registry | Full Escrow Contract |
|--------|-------------|-----------------|---------------------|
| Deal terms storage | Backend DB | On-chain | On-chain |
| Fund custody | TEE wallets | TEE wallets | Contract |
| TEE trust required | High | Medium | Low |
| Complexity | Low | Low | High |
| Gas per deal | 0 | ~0.02 TON | ~0.15 TON |
| Advertiser commitment | None | Signed tx | Signed tx |

**Chosen approach: Simple Registry** - best balance of trustlessness and simplicity.

---

## Implementation

### Contract Code (FunC)

```func
#include "imports/stdlib.fc";

;; Storage
global cell deals;
global int next_deal_id;

;; Load storage
() load_data() impure inline {
    slice ds = get_data().begin_parse();
    deals = ds~load_dict();
    next_deal_id = ds~load_uint(64);
}

;; Save storage
() save_data() impure inline {
    set_data(begin_cell()
        .store_dict(deals)
        .store_uint(next_deal_id, 64)
        .end_cell());
}

;; Handle incoming messages
() recv_internal(int my_balance, int msg_value, cell in_msg_full, slice in_msg_body) impure {
    slice cs = in_msg_full.begin_parse();
    int flags = cs~load_uint(4);
    if (flags & 1) { return (); } ;; ignore bounced
    slice sender = cs~load_msg_addr();

    int op = in_msg_body~load_uint(32);

    load_data();

    if (op == 0x1) { ;; create_deal
        slice publisher = in_msg_body~load_msg_addr();
        int amount = in_msg_body~load_coins();
        int accept_timeout = in_msg_body~load_uint(32);
        int release_timeout = in_msg_body~load_uint(32);

        int deal_id = next_deal_id;
        next_deal_id += 1;

        cell deal = begin_cell()
            .store_slice(sender)           ;; advertiser
            .store_slice(publisher)
            .store_coins(amount)
            .store_uint(deal_id + 1, 32)   ;; escrow_index
            .store_uint(now(), 32)         ;; created_at
            .store_uint(accept_timeout, 32)
            .store_uint(release_timeout, 32)
            .end_cell();

        deals~udict_set_ref(64, deal_id, deal);
        save_data();
        return ();
    }

    throw(0xffff); ;; unknown op
}

;; Getter: get deal by ID
(slice, slice, int, int, int, int, int) get_deal(int deal_id) method_id {
    load_data();
    (cell deal_cell, int found) = deals.udict_get_ref?(64, deal_id);
    throw_unless(404, found);

    slice ds = deal_cell.begin_parse();
    return (
        ds~load_msg_addr(),    ;; advertiser
        ds~load_msg_addr(),    ;; publisher
        ds~load_coins(),       ;; amount
        ds~load_uint(32),      ;; escrow_index
        ds~load_uint(32),      ;; created_at
        ds~load_uint(32),      ;; accept_timeout
        ds~load_uint(32)       ;; release_timeout
    );
}

;; Getter: next deal ID
int get_next_deal_id() method_id {
    load_data();
    return next_deal_id;
}
```

### TypeScript Integration (TEE)

```typescript
import { Address, TonClient, Contract } from '@ton/ton';

// Call get_deal getter
async function getDealFromContract(
  client: TonClient,
  contractAddress: Address,
  dealId: number
): Promise<Deal> {
  const contract = client.open(Contract.create(contractAddress));

  const result = await contract.get('get_deal', [
    { type: 'int', value: BigInt(dealId) }
  ]);

  return {
    advertiser: result.stack.readAddress(),
    publisher: result.stack.readAddress(),
    amount: result.stack.readBigNumber(),
    escrowIndex: result.stack.readNumber(),
    createdAt: result.stack.readNumber(),
    acceptTimeout: result.stack.readNumber(),
    releaseTimeout: result.stack.readNumber(),
  };
}
```
