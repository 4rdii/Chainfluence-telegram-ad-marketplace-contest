# TEE Service — EigenCompute Trusted Execution Environment

## Overview

The TEE service is the security-critical core of Chainfluence. It runs inside an EigenCompute Trusted Execution Environment and is the **only component** that:

- Holds private keys for escrow wallets
- Verifies cryptographic signatures from both parties
- Makes release/refund decisions
- Transfers funds on the TON blockchain
- Registers deals on the smart contract

The TEE is located in `ton-escrow-tee/`.

---

## Why a TEE?

Smart contracts on TON cannot call external APIs. But advertising verification requires checking Telegram — does the post exist? Does the content match? Has it been modified?

The TEE bridges this gap. It can:
1. Read deal terms from the blockchain (trustless source)
2. Call Telegram Bot API to verify content (off-chain data)
3. Execute fund transfers based on verifiable conditions

EigenCompute provides:
- **Hardware isolation** — Code runs in a secure enclave
- **Attestation** — Cryptographic proof that the exact published code is running
- **KMS integration** — Master mnemonic injected at runtime, never stored on disk
- **Stateless execution** — No persistent state; everything re-derived on each call

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/createEscrowWallet` | Derive escrow address for a deal |
| POST | `/verifyAndRegisterDeal` | Verify all conditions and register on-chain |
| POST | `/checkDeal` | Check deal status, release/refund if conditions met |
| GET | `/adminWallet` | Return TEE admin wallet address |
| GET | `/health` | Health check |
| GET | `/version` | Service version |

---

## Source Files

### `index.ts` — HTTP API

Express server that exposes the TEE's functionality as REST endpoints. On startup:
1. Reads `MNEMONIC`, `BOT_TOKEN`, `DEAL_REGISTRY_ADDRESS` from environment
2. Creates TON client (mainnet or testnet based on `TESTNET` env)
3. Derives admin wallet (index 0) for contract interactions
4. Initializes `TeeService` with all dependencies
5. If some env vars are missing, runs in "wallet-only mode" (only wallet derivation works)

### `tee-service.ts` — Core Escrow Logic

The main service class containing all business logic. Three core functions:

#### `createEscrowWallet(dealId)`

Derives a unique HD wallet for the deal and returns its address.

```
Input:  { dealId: 42 }
Output: { address: "UQC0...", publicKey: "abc..." }
```

Derivation: `escrowIndex = dealId + 1` (index 0 is reserved for admin).

#### `verifyAndRegisterDeal(input)`

Multi-step verification pipeline:

```
Step 1: Verify publisher's TonConnect signature
  - Rebuild signData envelope from deal params
  - Verify ed25519 signature against public key
  - Check public key matches claimed address

Step 2: Verify advertiser's TonConnect signature
  - Same process as publisher

Step 3: Poll escrow wallet for deposit
  - Check balance every 10 seconds, up to 60 seconds
  - Must be >= expected amount

Step 4: Verify post content via Telegram Bot API
  - Forward message from channel to verification chat
  - Extract text/caption
  - Compute SHA-256 hash
  - Compare with signed contentHash
  - Delete forwarded message (cleanup)

Step 5: Register deal on-chain
  - Send createDeal transaction to Deal Registry contract
  - Only TEE (admin) can call this function

If any step fails AFTER deposit is confirmed:
  → Automatic refund to advertiser
```

#### `checkDeal(dealId, verificationChatId)`

Called periodically by the backend scheduler:

```
Step 1: Fetch deal from on-chain registry
  - getDeal(dealId) returns all deal parameters

Step 2: Verify post status via Telegram Bot API
  - Forward message to verification chat
  - Check content hash matches
  - Determine: 'valid', 'deleted', or 'modified'

Step 3: Check time condition
  - Is current_time >= postedAt + duration?

Step 4: Decision
  - Content deleted/modified → REFUND to advertiser
  - Duration expired + content valid → RELEASE to publisher
  - Duration not expired + content valid → PENDING (do nothing)

Step 5: Execute transfer (if release/refund)
  - Calculate transfer amount (balance - 0.01 TON gas reserve)
  - Send from escrow wallet to recipient
  - Return txHash
```

#### `handleUnregisteredDeal(dealId)`

Safety mechanism for deals that were never registered on-chain:

```
1. Check escrow wallet balance
2. If balance > 0 and deal not in contract:
   a. Read first incoming transaction from blockchain
   b. Get deposit timestamp and sender address
   c. If current_time - deposit_time > 12 hours:
      → Refund to original sender
```

This prevents funds from being permanently locked if the registration process fails.

### `wallet.ts` — HD Wallet Derivation

Implements BIP-39 + SLIP-0010 standard for deterministic TON wallet generation.

**Derivation path**: `m/44'/607'/index'/0'` (607 = TON coin type per SLIP-44)

**Key functions**:

- `deriveTonWallet(mnemonic, index)` — Derives wallet at specific index
  - Converts mnemonic to BIP-39 seed
  - Derives ed25519 keypair via SLIP-0010
  - Creates WalletContractV4 instance
  - Returns `{ address, addressRaw, publicKey, secretKey, path }`

- `deriveAdminWallet(mnemonic)` — Admin at index 0 (pays gas for contract calls)
- `deriveEscrowWallet(mnemonic, dealId)` — Escrow at index `dealId + 1`
- `getWalletBalance(client, address)` — Query balance from blockchain
- `transferTon(client, wallet, to, amount)` — Execute TON transfer

**Design properties**:
- Same mnemonic = same wallets every time (TEE can restart safely)
- WalletContractV4 is the standard TON wallet (compatible with all tools)
- Each deal is isolated in its own wallet

### `signature.ts` — TonConnect Signature Verification

Verifies that both publisher and advertiser cryptographically approved the deal terms using their real TON wallets.

**How TonConnect signing works**:

1. Frontend builds a TON Cell containing deal parameters
2. Frontend calls `tonConnectUI.signData({ type: 'cell', schema, cell })`
3. User's wallet app wraps the cell in an envelope:
   ```
   prefix(0x75746f6e, 32) | schemaHash(32) | timestamp(64) |
   signerAddress | domainCell | payloadCell
   ```
4. Wallet signs the SHA-256 hash of this envelope with ed25519
5. Returns: signature, publicKey, timestamp

**TEE verification**:

1. `buildDealParamsCell(params)` — Reconstructs the exact cell from deal parameters
2. `buildSignDataEnvelope(...)` — Reconstructs the full envelope that the wallet signed
3. `verifyTonConnectSignature(...)` — Verifies ed25519 signature against envelope hash

**Address verification**: `verifyPublicKeyMatchesAddress()` tries multiple wallet versions (V4R2, V5R1, V3R2, V3R1) since users may use different wallet implementations. If no match is found, it logs a warning (custodial wallets may not match).

**Schema**: The TL-B schema string and its CRC32 hash are embedded in the signed envelope. Both frontend and TEE must use the identical schema.

### `bot-api.ts` — Telegram Content Verification

Uses Telegram Bot API to verify ad content on channels.

**Key functions**:

- `computeContentHash(content)` — SHA-256 of text string (must match frontend's implementation)

- `forwardMessage(channelId, messageId, verificationChatId)` — Forwards the post to a verification chat to confirm it exists. The bot must be admin of both the channel and the verification chat.

- `verifyContent(channelId, messageId, expectedHash, verificationChatId)` — Full verification:
  1. Forward message to verification chat
  2. Extract text or caption from forwarded message
  3. Compute SHA-256 hash of content
  4. Compare with expected hash
  5. Delete forwarded message (cleanup)
  6. Return: `{ exists, hashMatch, currentHash, wasEdited }`

- `checkPostStatus(channelId, messageId, expectedHash, verificationChatId)` — Returns enum: `'valid'`, `'deleted'`, or `'modified'`

**Why forward instead of read?** Telegram Bot API doesn't have a `getMessage` method. Forwarding is the standard way to verify a message exists and read its content.

### `deal-registry.ts` — Smart Contract Interaction

TypeScript wrapper for the Deal Registry contract:

- `sendCreateDeal(params)` — Constructs and sends createDeal transaction
- `getDeal(dealId)` — Queries deal data from contract (returns all 9 fields)
- `getNextDealId()` — Current deal counter
- `dealExists(dealId)` — Boolean existence check

### `ton-client.ts` — TON Blockchain Client

Configures TonClient4 with retry logic:

- `createTonClient(config)` — Points to mainnet or testnet endpoint
- `withRetry(fn, maxRetries)` — Retries with exponential backoff on rate limiting (429 errors)
- `waitForTransaction(...)` — Polls until transaction is confirmed on-chain

### `types.ts` — Type Definitions

Core interfaces:

- `DealParams` — Full deal specification (dealId, channelId, contentHash, duration, publisher, advertiser, amount, postId, postedAt)
- `PartySignMeta` — TonConnect signature metadata (signature, publicKey, timestamp, domain)
- `VerifyAndRegisterInput` — Input to verifyAndRegisterDeal
- `CheckDealResult` — `{ action: 'pending' | 'released' | 'refunded', reason?, txHash? }`
- `StoredDeal` — What's stored in the contract
- `TonWallet` — Derived wallet with keys and path

---

## Security Properties

| Attack Vector | Mitigation |
|---------------|------------|
| Forge deal registration | Only TEE (admin) can call createDeal on contract |
| Steal escrow funds | Private keys never leave TEE enclave |
| Fake deposit confirmation | TEE reads balance directly from blockchain |
| Tamper with content verification | TEE calls Telegram API independently |
| Replay old signatures | Timestamp embedded in signed envelope |
| Use wrong wallet | Public key checked against multiple wallet versions |
| Lock funds forever | 12-hour timeout auto-refund for unregistered deals |
| TEE state corruption | Stateless — re-derives everything on each call |

---

## Deployment

### Docker Build & Push

```bash
cd ton-escrow-tee
docker build -t docker.io/<user>/ton-escrow-tee:latest .
docker push docker.io/<user>/ton-escrow-tee:latest
```

### EigenCompute Deploy

```bash
ecloud compute app upgrade <app-id> --image-ref docker.io/<user>/ton-escrow-tee:latest
```

### Environment Variables (via EigenCompute KMS)

| Variable | Required | Description |
|----------|----------|-------------|
| `MNEMONIC` | Yes | Master mnemonic (SECRET — never log this) |
| `BOT_TOKEN` | Yes | Telegram Bot API token |
| `DEAL_REGISTRY_ADDRESS` | Yes | TON address of Deal Registry contract |
| `TESTNET` | No | "true" for testnet |
| `PORT` | No | HTTP port (default: 3000) |
| `TONCENTER_API_KEY` | No | For higher rate limits |

### Management

```bash
ecloud compute app list                    # List apps
ecloud compute app info <app-name>         # App details
ecloud compute app logs <app-name>         # View logs
ecloud compute app start <app-name>        # Start
ecloud compute app stop <app-name>         # Stop
```

---

## Development

```bash
cd ton-escrow-tee
npm install
cp .env.example .env
# Set MNEMONIC, BOT_TOKEN, DEAL_REGISTRY_ADDRESS, TESTNET=true
npm run dev
```

### Local Docker Testing

```bash
docker build -t ton-escrow-tee .
docker run --rm --env-file .env ton-escrow-tee
```
