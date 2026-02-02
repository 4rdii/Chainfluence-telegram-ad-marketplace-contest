# Development Roadmap

## Overview

This roadmap outlines the development plan for the Telegram Ads Marketplace MVP. Each milestone includes deliverables, technical challenges, and open questions that need investigation.

---

## Architecture Components

```
┌──────────────────────────────────────────────────────────────────────┐
│                         TELEGRAM MINI APP                            │
│                    (React/Vue + TON Connect)                         │
└────────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTPS
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          BACKEND API                                 │
│                     (Node.js / Express)                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │
│  │   Users     │  │  Channels   │  │  Creatives  │  │ Notifications│ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │
└───────┬──────────────────┬───────────────────┬───────────────────────┘
        │                  │                   │
        ▼                  ▼                   ▼
┌───────────────┐  ┌───────────────┐   ┌───────────────────────────────┐
│  PostgreSQL   │  │ Telegram Bot  │   │     TEE SERVICE (EigenCompute)│
│  (off-chain   │  │     API       │   │  ┌─────────────────────────┐  │
│   data only)  │  └───────────────┘   │  │  Escrow Controller      │  │
└───────────────┘                      │  │  - HD wallet derivation │  │
                                       │  │  - Verify vs CONTRACT   │  │
                                       │  │  - Fund release/refund  │  │
                                       │  └─────────────────────────┘  │
                                       └───────────────┬───────────────┘
                                                       │
                                 ┌─────────────────────┴──────────────┐
                                 ▼                                    ▼
                    ┌─────────────────────┐              ┌─────────────────┐
                    │  DEAL REGISTRY      │              │  TEE HD WALLETS │
                    │  (Smart Contract)   │              │  (Hold Funds)   │
                    │  - Store deal terms │              │  - Per-deal     │
                    │  - get_deal() FREE  │              │    escrow addr  │
                    └─────────────────────┘              └─────────────────┘
```

### Trust Model

| Component | Stores | Trust Level |
|-----------|--------|-------------|
| Smart Contract | Deal terms (immutable) | Trustless (on-chain) |
| TEE HD Wallets | Escrow funds | Trusted (TEE attestation) |
| PostgreSQL | Channels, creatives, users | Backend-trusted |
| Backend API | Nothing critical | Untrusted by TEE |

---

## Milestone 1: Core Infrastructure

**Goal:** Set up foundational services and prove key integrations work.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 1.1 | Backend API skeleton (Express + TypeScript) | |
| 1.2 | PostgreSQL database setup (off-chain data only) | |
| 1.3 | Deal Registry smart contract (FunC) | |
| 1.4 | TEE escrow service with HTTP API | |
| 1.5 | Telegram Bot setup and basic commands | |
| 1.6 | TON deposit detection mechanism | |

### Technical Details

#### 1.1 Backend API Skeleton
- Express.js with TypeScript
- Basic middleware (auth, logging, error handling)
- API structure following REST conventions
- Environment-based configuration

#### 1.2 Database Setup
- PostgreSQL for OFF-CHAIN data only:
  - Users, channels, channel_pricing
  - Creatives (text, media references)
  - Notifications, reviews
- Deal terms stored ON-CHAIN (not in DB)
- Migration system (Knex or Prisma)
- Connection pooling

#### 1.3 Deal Registry Smart Contract

Simple FunC contract that stores deal terms on-chain:

```func
;; Contract functions
create_deal(publisher, amount, timeouts)  ;; Advertiser commits terms
get_deal(deal_id)                         ;; TEE reads terms (FREE)
get_next_deal_id()                        ;; Get current counter
```

**What contract stores:**
- advertiser address
- publisher address
- amount (in nanoTON)
- escrow_index (for TEE HD derivation)
- created_at, accept_timeout, release_timeout

**What contract does NOT store:**
- Funds (held by TEE HD wallets)
- Deal status (derived from escrow balance)
- Creatives, channel info (in PostgreSQL)

**Gas cost:** ~0.02 TON per deal (only `create_deal` costs gas)

See [SMART_CONTRACT_DESIGN.md](SMART_CONTRACT_DESIGN.md) for full implementation.

#### 1.4 TEE Escrow Service
Extend current `index.ts` to expose HTTP endpoints:

```typescript
// Proposed TEE API endpoints
POST /api/escrow/derive     // Get escrow address for deal
POST /api/escrow/verify     // Verify deposit against CONTRACT terms
POST /api/escrow/release    // Release funds to publisher
POST /api/escrow/refund     // Refund to advertiser
GET  /api/escrow/balance    // Check escrow balance

// TEE Verification - reads from CONTRACT, not backend
async function verifyDeposit(dealId: number): Promise<VerificationResult> {
  // 1. Read deal terms from CONTRACT (trustless!)
  const deal = await contract.get_deal(dealId);

  // 2. Derive escrow wallet using escrow_index from contract
  const escrow = await deriveEscrowWallet(mnemonic, deal.escrow_index);

  // 3. Check escrow balance on-chain
  const balance = await client.getBalance(escrow.addressRaw);

  // 4. Verify balance >= amount from contract
  return { verified: balance >= deal.amount, deal, escrow };
}
```

**Key security:** TEE reads deal terms from contract, not backend. Backend cannot lie.

#### 1.5 Telegram Bot
- Use grammy.js or telegraf
- `/start` - Register user
- `/verify <channel>` - Start channel verification
- Webhook vs polling decision

#### 1.6 TON Deposit Detection

**DECISION: Hybrid Backend Polling + TEE Verification**

```
┌─────────────────────────────────────────────────────────────────┐
│                    DEPOSIT DETECTION FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  BACKEND (untrusted)              TEE (trusted)                │
│       │                                │                        │
│       │  1. Poll getTransactions       │                        │
│       │     every 30s for active       │                        │
│       │     escrow addresses           │                        │
│       │                                │                        │
│       │  2. Detect incoming tx         │                        │
│       │     matching deal amount       │                        │
│       │                                │                        │
│       │  3. POST /escrow/verify ──────►│                        │
│       │     { deal_id, tx_hash }       │                        │
│       │                                │  4. Independent verify │
│       │                                │     - Derive address   │
│       │                                │     - Fetch tx on-chain│
│       │                                │     - Check amount     │
│       │                                │     - Confirm finality │
│       │                                │                        │
│       │  ◄─────────────────────────────│  5. Return result     │
│       │     { verified: true }         │                        │
│       │                                │                        │
│       │  6. Update DB: DEPOSITED       │                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this approach:**
- Backend handles high-frequency polling (cheap, stateless)
- TEE only called when deposit detected (reduces TEE load)
- TEE never trusts backend - always verifies on-chain
- If backend lies about deposit, TEE will reject
- If backend misses deposit, user can trigger manual check

### Challenges & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| TON API rate limits | Medium | Use API key, implement caching |
| TEE-Backend communication security | High | HTTPS + API keys, consider mTLS |
| Database schema changes | Low | Use migrations from day 1 |

---

## Milestone 2: Channel Management

**Goal:** Publishers can list and manage their channels.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 2.1 | Channel verification flow (bot as admin) | |
| 2.2 | Fetch and store channel statistics | |
| 2.3 | Channel listing with pricing | |
| 2.4 | Channel search and browse API | |

### Technical Details

#### 2.1 Channel Verification

**OPEN QUESTION: How to verify channel ownership?**

Flow:
1. User provides channel username
2. Bot checks if it's admin of that channel
3. If yes, channel is verified

```typescript
// Check if bot is admin
const admins = await bot.api.getChatAdministrators(channelId);
const botIsAdmin = admins.some(a => a.user.id === botId);
```

**UNCERTAINTY:**
- What permissions does bot need? Just any admin, or specific rights?
- Can we detect if bot was removed later?
- Telegram API returns channel ID as negative number - need to handle

#### 2.2 Channel Statistics

**OPEN QUESTION: What stats can we actually fetch?**

Available via Telegram Bot API:
- `getChat()` - title, username, member count (for public channels)
- `getChatMemberCount()` - subscriber count

**NOT available via Bot API:**
- Average views per post
- Engagement rate
- Audience demographics
- Post frequency

**Possible solutions:**
1. **Channel owner provides stats** - Trust-based, can lie
2. **Parse recent posts** - Bot can read channel posts and count views
   - Need to investigate: Can bot see view counts?
3. **Third-party analytics** - TGStat API, Telemetr.io
   - External dependency, may cost money
4. **Manual verification** - Admin reviews screenshots
   - Doesn't scale

**NEEDS INVESTIGATION:** Test what `getChat()` and reading posts actually returns for channels where bot is admin.

#### 2.3 Channel Listing

```typescript
// API endpoints
POST /api/channels           // Create listing
GET  /api/channels/:id       // Get channel details
PUT  /api/channels/:id       // Update pricing
DELETE /api/channels/:id     // Delist channel
GET  /api/channels           // Browse/search
```

### Challenges & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Can't fetch view counts | High | Research alternatives, may need TGStat |
| Fake channels | Medium | Require minimum subscribers, manual review |
| Bot removed from channel | Medium | Periodic re-verification |

---

## Milestone 3: Deal Flow (Core Escrow)

**Goal:** Complete deal lifecycle from booking to payment.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 3.1 | Deal creation and escrow address generation | |
| 3.2 | Deposit detection and confirmation | |
| 3.3 | Publisher accept/reject flow | |
| 3.4 | Timeout-based automatic refunds | |
| 3.5 | Fund release to publisher | |

### Technical Details

#### 3.1 Deal Creation

```typescript
// POST /api/deals
{
  channel_id: 123456,
  format: "1/24",
  scheduled_time: "2024-02-15T10:00:00Z"
}

// Response
{
  deal_id: 1234,
  escrow_address: "UQC0CO7-mfF8CKzvHR...",
  amount: "50000000000", // 50 TON in nanoTON
  expires_at: "2024-02-14T12:00:00Z" // 24h to deposit
}
```

TEE derives unique escrow address using `deal_id` as derivation index.

#### 3.2 Deposit Detection

**OPEN QUESTION: How to match deposit to deal?**

Options:
1. **Unique address per deal** (current approach)
   - Pro: Clear separation, easy to track
   - Con: Many addresses to monitor

2. **Single hot wallet + memo**
   - Pro: One address to monitor
   - Con: Users may forget memo, parsing complexity

3. **Unique address + expected amount**
   - Current approach + verify exact amount

**Recommended:** Option 1 (unique address per deal).

Detection flow:
```
1. Poll escrow address for new transactions
2. Verify: amount >= deal.price
3. Verify: sender matches advertiser wallet (optional)
4. Update deal status to DEPOSITED
5. Notify publisher
```

#### 3.3 Accept/Reject Flow

```
DEPOSITED ──┬── publisher accepts (24h) ──► ACCEPTED
            │
            └── publisher rejects ──► REFUNDED
            │
            └── timeout (24h) ──► REFUNDED (auto)
```

#### 3.4 Timeout Handling

**OPEN QUESTION: How to handle timeouts reliably?**

Options:
1. **Cron job** - Check expired deals periodically
2. **Job queue** - Schedule refund job at deal creation (Bull, Agenda)
3. **Database triggers** - PostgreSQL scheduled jobs

**Recommended:** Job queue (Bull with Redis) for reliability.

```typescript
// On deal creation
await refundQueue.add('check-deposit-timeout', { dealId }, {
  delay: 24 * 60 * 60 * 1000 // 24 hours
});
```

#### 3.5 Fund Release

TEE executes transfer only when:
1. Deal status is VERIFIED (from backend)
2. Backend signs request (API key + signature)
3. Optional: On-chain verification of post (future enhancement)

```typescript
// POST /api/escrow/release (to TEE)
{
  deal_id: 1234,
  recipient: "publisher_wallet_address",
  amount: "47500000000", // 95% (minus 5% fee)
  signature: "backend_signature"
}
```

### Challenges & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Missed deposits (polling delay) | Medium | Short poll interval, indexer upgrade later |
| Timeout jobs lost on restart | Medium | Persistent job queue (Redis) |
| Backend-TEE trust | High | Signed requests, consider multisig |
| TEE restart loses state | High | TEE re-derives wallets, backend is source of truth |

---

## Milestone 4: Creative Workflow

**Goal:** Advertisers submit creatives, publishers approve/reject.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 4.1 | Creative submission API | |
| 4.2 | Media upload and storage | |
| 4.3 | Publisher review interface | |
| 4.4 | Revision request flow | |

### Technical Details

#### 4.1 Creative Submission

```typescript
// POST /api/deals/:id/creative
{
  text: "Ad copy here...",
  media: ["ipfs://Qm...", "ipfs://Qm..."], // Or S3 URLs
  buttons: [
    { text: "Learn More", url: "https://..." }
  ]
}
```

#### 4.2 Media Storage

**OPEN QUESTION: Where to store media?**

Options:
1. **IPFS** - Decentralized, permanent
   - Pro: Trustless, content-addressed
   - Con: Slow, need pinning service ($), retrieval reliability

2. **S3/CloudStorage** - Centralized
   - Pro: Fast, reliable, cheap
   - Con: Centralized, can be censored

3. **Telegram servers** - Upload to TG, get file_id
   - Pro: Free, fast, integrated
   - Con: Files expire(?), dependency on TG

**Recommended for MVP:** S3/CloudStorage with IPFS as future upgrade.

#### 4.3 Publisher Review

```typescript
// Publisher actions
POST /api/deals/:id/creative/approve
POST /api/deals/:id/creative/reject
{
  feedback: "Please remove the emoji, doesn't match our style"
}
```

### Challenges & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Large media uploads | Low | Size limits, compression |
| Inappropriate content | Medium | Publisher review, report system |
| Creative disputes | Medium | Clear guidelines, admin override |

---

## Milestone 5: Posting & Verification

**Goal:** Ads get posted to channels and verified.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 5.1 | Manual posting notification | |
| 5.2 | Auto-posting via bot (optional) | |
| 5.3 | Post verification system | |
| 5.4 | Duration tracking | |

### Technical Details

#### 5.1 Manual Posting

Simple notification flow:
1. At scheduled time, notify publisher: "Time to post Deal #1234"
2. Publisher posts manually
3. Publisher submits post link/message_id
4. System verifies post exists

#### 5.2 Auto-Posting (Optional Feature)

**OPEN QUESTION: Can bot post to channel?**

Requirements:
- Bot must be admin with "Post Messages" permission
- Bot must be able to pin messages (for 1/24 format)

```typescript
// Post ad to channel
const message = await bot.api.sendMessage(channelId, adText, {
  parse_mode: 'HTML',
  // attach media if needed
});

// Pin for 1/24 format
await bot.api.pinChatMessage(channelId, message.message_id);
```

**UNCERTAINTIES:**
- Can bot attach multiple media types? (photo + text)
- Can bot schedule posts for future? (No - need our own scheduler)
- What if posting fails? Retry logic needed.

#### 5.3 Post Verification

**CRITICAL OPEN QUESTION: How to verify post stayed up?**

Challenges:
1. Need to periodically check if message still exists
2. Need to check if still pinned (for 1/24)
3. Need to detect edits to content
4. Rate limits on checking

Proposed approach:
```
1. Store message_id when posted
2. Periodic verification job (every 1 hour):
   - Fetch message: bot.api.getMessage() ← DOES THIS EXIST?
   - Check content matches approved creative
   - Check pin status
3. If violation detected:
   - Mark deal as DISPUTED
   - Notify advertiser
```

**NEEDS INVESTIGATION:**
- Can bot read messages from channel where it's admin?
- Is there a `getMessage` or `getMessages` method?
- Can we detect if message was edited?

Looking at Telegram Bot API docs:
- `forwardMessage` - can verify message exists
- `copyMessage` - same
- No direct "read message" method

**Alternative verification:**
1. Use `getChatHistory` via MTProto (not Bot API)
2. Use Telegram userbot (against ToS?)
3. Trust publisher + dispute system
4. Screenshot-based verification (manual)

**Recommended for MVP:** Trust-based with dispute option. Publisher confirms posting, advertiser can dispute with evidence.

### Challenges & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| Can't verify programmatically | High | Trust + dispute system for MVP |
| Publisher removes post early | High | Reputation system, escrow delay |
| Auto-posting permissions | Medium | Clear onboarding for bot perms |
| Scheduled posting reliability | Medium | Job queue with retries |

---

## Milestone 6: Telegram Mini App

**Goal:** User-facing interface in Telegram.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 6.1 | Mini App setup (React/Vue) | |
| 6.2 | TON Connect wallet integration | |
| 6.3 | Channel browsing UI | |
| 6.4 | Deal booking flow | |
| 6.5 | Creative submission UI | |
| 6.6 | Dashboard for publishers | |

### Technical Details

#### 6.1 Mini App Setup

```
Tech stack:
- React + TypeScript (or Vue 3)
- Vite for bundling
- @twa-dev/sdk for Telegram integration
- @tonconnect/ui-react for wallet
```

#### 6.2 TON Connect

```typescript
import { TonConnectButton, useTonWallet } from '@tonconnect/ui-react';

// User connects wallet
// Get wallet address for payments
const wallet = useTonWallet();
const userAddress = wallet?.account.address;
```

**OPEN QUESTION: How to trigger payment?**

Options:
1. **Deep link to wallet app**
   ```
   ton://transfer/<escrow_address>?amount=50000000000&text=deal_1234
   ```

2. **TON Connect sendTransaction**
   ```typescript
   await tonConnectUI.sendTransaction({
     validUntil: Math.floor(Date.now() / 1000) + 600,
     messages: [{
       address: escrowAddress,
       amount: toNano('50').toString(),
     }]
   });
   ```

**Recommended:** Option 2 (TON Connect sendTransaction) for better UX.

#### 6.3-6.6 UI Components

Standard React/Vue development. Reference the wireframes in PRODUCT_DESIGN.md.

### Challenges & Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| TWA limitations | Medium | Test early, know constraints |
| Wallet UX friction | Medium | Clear instructions, fallbacks |
| Mobile responsiveness | Low | Mobile-first design |

---

## Milestone 7: Notifications & Polish

**Goal:** Complete notification system and UX improvements.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 7.1 | Telegram notifications for all events | |
| 7.2 | Email notifications (optional) | |
| 7.3 | Deal status tracking UI | |
| 7.4 | Rating and review system | |
| 7.5 | Error handling and edge cases | |

### Notification Events

| Event | Notify |
|-------|--------|
| New booking request | Publisher |
| Deposit confirmed | Publisher, Advertiser |
| Deal accepted | Advertiser |
| Creative submitted | Publisher |
| Creative approved/rejected | Advertiser |
| Post reminder | Publisher |
| Post verified | Both |
| Funds released | Publisher |
| Dispute opened | Both |

---

## Milestone 8: Testing & Security

**Goal:** Ensure system is secure and reliable.

### Deliverables

| # | Task | Status |
|---|------|--------|
| 8.1 | Unit tests for critical paths | |
| 8.2 | Integration tests | |
| 8.3 | Security audit of TEE code | |
| 8.4 | Rate limiting and anti-abuse | |
| 8.5 | Testnet end-to-end testing | |

### Security Checklist

- [ ] TEE API authentication
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] Rate limiting (per user, per IP)
- [ ] Wallet address validation
- [ ] Amount overflow checks
- [ ] Signature verification for releases
- [ ] Audit logging for all escrow operations

---

## Open Questions Summary

### Critical (Must Resolve Before Building)

| # | Question | Proposed Investigation |
|---|----------|----------------------|
| 1 | Can bot read channel messages/views? | Test with real channel |
| 2 | How to verify post stayed up? | Research MTProto, test Bot API limits |
| 3 | How to detect deposits reliably? | Test TON HTTP API polling |

### Important (Resolve During Development)

| # | Question | Proposed Investigation |
|---|----------|----------------------|
| 4 | What channel stats are available? | Test getChatMemberCount, read posts |
| 5 | Can bot pin/unpin messages? | Test with admin bot |
| 6 | TON Connect payment UX | Build prototype |

### Nice to Have (Can Defer)

| # | Question | Notes |
|---|----------|-------|
| 7 | IPFS vs S3 for media | Start with S3, migrate later |
| 8 | Dispute resolution process | Manual admin for MVP |
| 9 | Multi-language support | English only for MVP |

---

## Recommended Development Order

```
Week 1-2: Milestone 1 (Infrastructure)
   └── Parallel: Investigate critical open questions

Week 3-4: Milestone 2 (Channel Management)
   └── Depends on: Q1, Q4 answers

Week 5-6: Milestone 3 (Deal Flow)
   └── Core escrow logic, most critical

Week 7-8: Milestone 4 (Creative Workflow)
   └── Can start parallel with M3

Week 9-10: Milestone 5 (Posting & Verification)
   └── Depends on: Q2 answer

Week 11-12: Milestone 6 (Mini App)
   └── Can start earlier in parallel

Week 13: Milestone 7 (Notifications)
Week 14: Milestone 8 (Testing & Security)
```

---

## Tech Stack Summary

| Component | Technology |
|-----------|------------|
| Backend API | Node.js + Express + TypeScript |
| Database | PostgreSQL |
| Job Queue | Bull + Redis |
| TEE Service | Node.js + TypeScript (EigenCompute) |
| Telegram Bot | grammy.js or telegraf |
| Mini App | React + TypeScript + Vite |
| Wallet | TON Connect |
| Media Storage | S3 (MVP), IPFS (future) |
| Deployment | Docker, EigenCompute for TEE |

---

## Risk Matrix

| Risk | Probability | Impact | Priority |
|------|-------------|--------|----------|
| Can't programmatically verify posts | High | High | P0 |
| TON API rate limits | Medium | Medium | P1 |
| Complex dispute resolution | Medium | Medium | P1 |
| TEE-Backend trust model | Low | High | P1 |
| Channel stats unavailable | Medium | Low | P2 |
| Wallet UX friction | Medium | Medium | P2 |

---

## MVP Scope (Contest Submission)

For the contest, focus on demonstrating:

1. **Working escrow** - Deposit, release, refund
2. **Channel listing** - Basic stats, pricing
3. **Deal flow** - Book, pay, accept
4. **Creative workflow** - Submit, approve
5. **Basic verification** - Trust-based with dispute option

**Defer to post-MVP:**
- Auto-posting
- Programmatic verification
- Advanced stats (TGStat integration)
- IPFS storage
- Multi-language
