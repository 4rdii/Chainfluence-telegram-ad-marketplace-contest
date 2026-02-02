# Telegram Ads Marketplace - Product Design

## Overview

A Telegram Mini App marketplace connecting channel owners with advertisers, featuring TON-based escrow payments secured by EigenCompute TEE.

---

## User Personas

### 1. Channel Owner (Publisher)
- Owns one or more Telegram channels
- Wants to monetize through advertising
- Needs simple ad management and reliable payments

### 2. Advertiser (Buyer)
- Wants to promote products/services
- Looking for channels matching their target audience
- Needs transparency on channel stats and ad performance

### 3. PR Manager (Agency)
- Manages multiple channels for clients
- Handles ad operations at scale
- Needs dashboard for multi-channel management

---

## Core User Flows

### Flow 1: Channel Listing (Publisher)

```
┌─────────────────────────────────────────────────────────────┐
│                    LIST YOUR CHANNEL                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Step 1: Connect Channel                                    │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🔗 Connect via @YourChannelBot                     │   │
│  │     Add bot as admin to verify ownership            │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Step 2: Verified Stats (auto-fetched)                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  👥 Subscribers: 45,230                             │   │
│  │  📊 Avg Views:   12,450 (last 10 posts)            │   │
│  │  📈 Engagement:  27.5%                              │   │
│  │  🏷️ Category:   [Technology ▼]                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Step 3: Set Pricing                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Ad Format          Duration    Price (TON)         │   │
│  │  ─────────────────────────────────────────────      │   │
│  │  ☑ 1/24 (24h pin)   24 hours    [___50___]        │   │
│  │  ☑ 2/48 (48h stay)  48 hours    [___35___]        │   │
│  │  ☑ 3/72 (72h stay)  72 hours    [___25___]        │   │
│  │  ☐ Eternal post     Forever     [________]         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [ List Channel - 2 TON ]               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Flow 2: Browse & Book (Advertiser)

```
┌─────────────────────────────────────────────────────────────┐
│  🔍 Search   [crypto, trading_______]  [Technology ▼]      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📢 CryptoNews Daily                    ⭐ 4.8      │   │
│  │  👥 125K subs  │  📊 32K avg views  │  💎 Premium   │   │
│  │  ────────────────────────────────────────────────   │   │
│  │  1/24: 120 TON  │  2/48: 80 TON  │  3/72: 50 TON   │   │
│  │                              [ View Details ]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📢 DeFi Alpha                          ⭐ 4.5      │   │
│  │  👥 45K subs   │  📊 15K avg views  │  🔥 Hot       │   │
│  │  ────────────────────────────────────────────────   │   │
│  │  1/24: 50 TON   │  2/48: 35 TON   │  3/72: 20 TON  │   │
│  │                              [ View Details ]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘

                              ▼ Click "View Details"

┌─────────────────────────────────────────────────────────────┐
│  📢 CryptoNews Daily                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Verified Stats (Updated 2h ago)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Subscribers:     125,230  (+2.3% this week)        │   │
│  │  Avg Post Views:  32,450                            │   │
│  │  Engagement Rate: 25.9%                             │   │
│  │  Post Frequency:  4.2/day                           │   │
│  │  Audience:        🇺🇸 35% 🇷🇺 20% 🇩🇪 15% Other 30% │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💰 Book an Ad Slot                                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Format:  (●) 1/24 Pin    ( ) 2/48    ( ) 3/72     │   │
│  │  Price:   120 TON                                   │   │
│  │  Date:    [  Tomorrow 10:00 AM  ▼]                 │   │
│  │                                                     │   │
│  │  ┌─────────────────────────────────────────────┐   │   │
│  │  │     [ Book Now - Pay 120 TON to Escrow ]    │   │   │
│  │  └─────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Flow 3: Creative Approval Workflow

```
ADVERTISER                    SYSTEM                    PUBLISHER
    │                           │                           │
    │  1. Submit Creative       │                           │
    │  ───────────────────────► │                           │
    │   (text + media)          │                           │
    │                           │  2. Notify Publisher      │
    │                           │  ────────────────────────►│
    │                           │                           │
    │                           │  3a. APPROVE              │
    │                           │  ◄────────────────────────│
    │  ◄───────────────────────  │                           │
    │   "Creative Approved!     │                           │
    │    Scheduled for posting" │                           │
    │                           │                           │
    │         ─── OR ───        │                           │
    │                           │                           │
    │                           │  3b. REQUEST CHANGES      │
    │                           │  ◄────────────────────────│
    │  ◄───────────────────────  │   (with feedback)        │
    │   "Changes requested:     │                           │
    │    [feedback message]"    │                           │
    │                           │                           │
    │  4. Resubmit Creative     │                           │
    │  ───────────────────────► │                           │
    │                           │   ... cycle repeats ...   │
    │                           │                           │

┌─────────────────────────────────────────────────────────────┐
│              CREATIVE SUBMISSION (Advertiser)               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Deal #1234 - CryptoNews Daily (1/24)                      │
│                                                             │
│  📝 Ad Text:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🚀 Introducing TonSwap - The fastest DEX on TON!  │   │
│  │                                                     │   │
│  │  ✅ 0.1% fees                                       │   │
│  │  ✅ Instant swaps                                   │   │
│  │  ✅ 100+ token pairs                                │   │
│  │                                                     │   │
│  │  👉 Try now: t.me/tonswap_bot                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📎 Attachments:                                           │
│  ┌──────────┐  ┌──────────┐                               │
│  │  📷      │  │  ➕ Add  │                               │
│  │ banner   │  │  Media   │                               │
│  │  .png    │  │          │                               │
│  └──────────┘  └──────────┘                               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              [ Submit for Approval ]                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Flow 4: Verification & Release

```
┌─────────────────────────────────────────────────────────────┐
│                 DEAL VERIFICATION                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Deal #1234 - Status: POSTED                               │
│                                                             │
│  📋 Verification Checklist:                                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ✅ Post published at scheduled time                │   │
│  │  ✅ Content matches approved creative               │   │
│  │  ✅ Post is pinned (1/24 format)                    │   │
│  │  ⏳ 24h duration not yet complete                   │   │
│  │     Time remaining: 18h 32m                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📊 Live Performance:                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Views:      8,234 (vs 32K avg - tracking...)      │   │
│  │  Clicks:     342 (4.2% CTR)                        │   │
│  │  Forwards:   23                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ⏰ Auto-release in: 18h 32m                               │
│     (when duration complete + verified)                    │
│                                                             │
│  ─────────────────────────────────────────────────────     │
│  ⚠️  Report Issue:                                         │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  ( ) Post removed early                             │   │
│  │  ( ) Content modified                               │   │
│  │  ( ) Wrong timing                                   │   │
│  │  ( ) Other: [_______________]                       │   │
│  │                                                     │   │
│  │  [ Submit Dispute ]                                 │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Deal State Machine

### State Derivation (Not Stored)

Deal status is **derived** from multiple sources, not stored in a single field:

| State | How to Determine |
|-------|------------------|
| CREATED | Contract has deal, escrow balance = 0 |
| DEPOSITED | Escrow balance >= deal.amount |
| ACCEPTED | Publisher confirmed (off-chain flag) |
| CREATIVE_PENDING | Creative submitted, not yet approved |
| APPROVED | Creative approved (off-chain flag) |
| POSTED | post_message_id is set |
| VERIFIED | TEE confirmed post, funds released |
| REFUNDED | Escrow balance = 0, refund tx exists |

### State Flow

```
                    ┌──────────┐
                    │ CREATED  │ Deal exists on contract
                    └────┬─────┘
                         │ deposit to escrow address
                         ▼
                    ┌──────────┐
                    │DEPOSITED │ TEE verifies: balance >= contract.amount
                    └────┬─────┘
                         │ publisher accepts (24h timeout → refund)
                         ▼
                    ┌──────────┐
                    │ ACCEPTED │ Publisher committed (off-chain)
                    └────┬─────┘
                         │ advertiser submits creative
                         ▼
              ┌────────────────────────┐
              │   CREATIVE_PENDING    │◄────────────┐
              └──────────┬─────────────┘             │
                         │                          │
           ┌─────────────┴─────────────┐            │
           ▼                           ▼            │
    ┌──────────┐                ┌───────────┐       │
    │ APPROVED │                │ REJECTED  │───────┘
    └────┬─────┘                └───────────┘  revise & resubmit
         │
         │ post at scheduled time
         ▼
    ┌──────────┐
    │  POSTED  │ Ad is live on channel
    └────┬─────┘
         │ duration complete + verified
         ▼
    ┌──────────┐
    │ VERIFIED │ TEE releases funds
    └────┬─────┘
         │ TEE transfer to publisher
         ▼
    ┌──────────┐
    │ RELEASED │ Publisher receives TON (minus fees)
    └──────────┘

    Dispute/Timeout Paths:
    ──────────────────────
    DEPOSITED ──timeout──► REFUNDED (TEE auto-refunds)
    POSTED ──dispute──► DISPUTED ──resolve──► RELEASED or REFUNDED
```

---

## Database Schema

### Storage Split

| Data | Location | Reason |
|------|----------|--------|
| Deal terms (amount, addresses, timeouts) | Smart Contract | Trustless, immutable |
| Creatives (text, media) | PostgreSQL | Off-chain, editable |
| Channel info, users | PostgreSQL | Off-chain metadata |
| Escrow funds | TEE HD Wallets | Secure custody |

### Core Tables (PostgreSQL - Off-Chain Only)

```sql
-- Users (both advertisers and publishers)
CREATE TABLE users (
    id              BIGINT PRIMARY KEY,     -- Telegram user ID
    username        VARCHAR(255),
    wallet_address  VARCHAR(66),            -- TON wallet for payouts
    is_publisher    BOOLEAN DEFAULT FALSE,
    is_advertiser   BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP DEFAULT NOW(),
    reputation      DECIMAL(3,2) DEFAULT 5.00
);

-- Channels listed for advertising
CREATE TABLE channels (
    id              BIGINT PRIMARY KEY,     -- Telegram channel ID
    owner_id        BIGINT REFERENCES users(id),
    username        VARCHAR(255),           -- @channel_name
    title           VARCHAR(255),
    category        VARCHAR(50),
    subscribers     INTEGER,
    avg_views       INTEGER,
    engagement_rate DECIMAL(5,2),
    is_verified     BOOLEAN DEFAULT FALSE,
    is_active       BOOLEAN DEFAULT TRUE,
    stats_updated   TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Pricing for each channel
CREATE TABLE channel_pricing (
    id              SERIAL PRIMARY KEY,
    channel_id      BIGINT REFERENCES channels(id),
    format          VARCHAR(20),            -- '1/24', '2/48', '3/72', 'eternal'
    duration_hours  INTEGER,
    price_tons      DECIMAL(10,2),
    is_available    BOOLEAN DEFAULT TRUE
);

-- Ad deals (OFF-CHAIN data only - core terms are ON-CHAIN)
CREATE TABLE deals (
    id              SERIAL PRIMARY KEY,
    deal_id         INTEGER UNIQUE,         -- Matches on-chain deal_id

    -- Reference to on-chain data (do NOT duplicate here)
    -- advertiser, publisher, amount, timeouts → read from CONTRACT

    -- Off-chain metadata
    channel_id      BIGINT REFERENCES channels(id),
    format          VARCHAR(20),
    escrow_address  VARCHAR(66),            -- Derived TEE address (cached)

    -- Scheduling (off-chain)
    scheduled_time  TIMESTAMP,
    posted_at       TIMESTAMP,

    -- Creative (off-chain - not on contract)
    creative_text   TEXT,
    creative_media  JSONB,                  -- Array of media URLs

    -- Verification (off-chain tracking)
    post_message_id BIGINT,                 -- Telegram message ID
    verified_at     TIMESTAMP,

    -- Timestamps
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

-- NOTE: Deal status is DERIVED, not stored:
-- - Check contract: does deal exist?
-- - Check escrow balance: deposited?
-- - Check off-chain: creative submitted? posted?

-- Deal events (audit log)
CREATE TABLE deal_events (
    id              SERIAL PRIMARY KEY,
    deal_id         INTEGER REFERENCES deals(id),
    event_type      VARCHAR(50),
    actor_id        BIGINT,
    data            JSONB,
    created_at      TIMESTAMP DEFAULT NOW()
);

-- Reviews
CREATE TABLE reviews (
    id              SERIAL PRIMARY KEY,
    deal_id         INTEGER REFERENCES deals(id),
    reviewer_id     BIGINT REFERENCES users(id),
    reviewee_id     BIGINT REFERENCES users(id),
    rating          INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment         TEXT,
    created_at      TIMESTAMP DEFAULT NOW()
);
```

### Indexes

```sql
CREATE INDEX idx_channels_category ON channels(category);
CREATE INDEX idx_channels_subscribers ON channels(subscribers DESC);
CREATE INDEX idx_deals_status ON deals(status);
CREATE INDEX idx_deals_advertiser ON deals(advertiser_id);
CREATE INDEX idx_deals_channel ON deals(channel_id);
CREATE INDEX idx_deal_events_deal ON deal_events(deal_id);
```

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      TELEGRAM MINI APP                          │
│                   (React + TON Connect)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND API                               │
│   Users, Channels, Creatives, Notifications (off-chain data)   │
└──────────┬─────────────────────────────────┬────────────────────┘
           │                                 │
           ▼                                 ▼
┌──────────────────┐              ┌─────────────────────────────┐
│   PostgreSQL     │              │    TEE (EigenCompute)       │
│  (off-chain DB)  │              │  - HD wallet derivation     │
└──────────────────┘              │  - Verify vs CONTRACT       │
                                  │  - Release/refund funds     │
                                  └──────────────┬──────────────┘
                                                 │
                     ┌───────────────────────────┴───────────────┐
                     ▼                                           ▼
        ┌─────────────────────┐                    ┌─────────────────────┐
        │  DEAL REGISTRY      │                    │  TEE HD WALLETS     │
        │  (Smart Contract)   │                    │  (Escrow Funds)     │
        │  - Store deal terms │                    │  - Per-deal address │
        │  - get_deal() FREE  │                    │  - Holds TON        │
        └─────────────────────┘                    └─────────────────────┘
```

### Trust Model

| Component | Trust Level | Implementation |
|-----------|-------------|----------------|
| Deal terms | Trustless | Smart contract (on-chain) |
| Escrow funds | TEE-secured | HD wallets in EigenCompute |
| TEE verification | Trustless | Reads from contract, not backend |
| Channel stats | Verified | Bot-fetched from Telegram API |
| Creatives, users | Backend-trusted | PostgreSQL database |

### Smart Contract (Deal Registry)

Minimal contract that stores deal terms on-chain:

```
create_deal(publisher, amount, timeouts)  → Advertiser commits terms
get_deal(deal_id)                         → TEE reads terms (FREE)
```

**Why?** TEE reads deal terms from contract, not backend. Backend cannot lie about:
- Deal amount
- Publisher address
- Timeout periods

### TEE Responsibilities

1. **Wallet Derivation** - HD wallets from KMS mnemonic
2. **Verify Against Contract** - Read deal terms from chain, not backend
3. **Check Deposit** - Verify escrow balance >= contract amount
4. **Fund Release** - Transfer to publisher address from contract
5. **Refund Processing** - Return to advertiser address from contract

### Off-Chain Responsibilities (Backend)

1. **User Interface** - Telegram Mini App
2. **Channel Management** - Listing, stats, pricing
3. **Creative Workflow** - Submission, approval, storage
4. **Notifications** - Telegram bot messages
5. **Deposit Polling** - Monitor escrow addresses, notify TEE

---

## Platform Fees

| Action | Fee |
|--------|-----|
| Channel Listing | 2 TON (one-time) |
| Successful Deal | 5% of deal value |
| Dispute Resolution | 2% (from losing party) |

---

## Key Features for MVP

1. **Telegram Login** - Seamless auth via Mini App
2. **Verified Stats** - Bot fetches real channel metrics
3. **TON Escrow** - Trustless payment holding
4. **Creative Approval** - In-app review workflow
5. **Auto-Posting** - Bot posts to channel (optional)
6. **Verification** - Confirm post stayed up for duration
7. **Ratings** - Build reputation for both parties
