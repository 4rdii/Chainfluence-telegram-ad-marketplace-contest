# Chainfluence Backend Plan

## Backend Services

### 1. Auth Service
- Validate Telegram `initData` (HMAC-SHA256 verification)
- Issue JWT/session tokens
- Auto-register new users on first login

### 2. User Service
- Get/update user profile
- Set roles (publisher/advertiser)
- Store `memberSince` timestamp on first registration
- Link TON wallet address to user

### 3. Channel Service
- Add channel (verify bot is admin via Telegram Bot API)
- Fetch channel stats (subscriber count, avg views) from Telegram
- List user's channels
- Update/remove channel
- Channel categories & search

### 4. Campaign Service
- CRUD campaigns (advertiser creates)
- List/search/filter campaigns
- Pause/resume/delete campaigns
- Match campaigns to channels by category

### 5. Offer Service
- Publisher submits offer on a campaign
- Advertiser accepts/rejects offers
- List offers by campaign or by publisher

### 6. Deal Service
- Create deal when offer is accepted
- Deal lifecycle: `PENDING` → `IN_ESCROW` → `LIVE` → `VERIFIED` → `RELEASED`/`REFUNDED`
- Track deal timeline events
- Deal completion & review storage

### 7. Escrow / Payment Service
- Generate escrow smart contract address per deal
- Monitor TON blockchain for incoming payments
- Verify post is live (trigger verification)
- Release funds to publisher or refund to advertiser
- Track transaction hashes

### 8. Review Service
- Store star ratings per deal
- Calculate average ratings per channel/publisher
- Fetch reviews for a channel

### 9. Notification Service
- In-app notifications (deal updates, new offers, campaign activity)
- Mark read/unread
- Optional: push via Telegram bot messages

### 10. Telegram Bot Service
- Handle `/start` deep links
- Send deal update notifications to users
- Verify bot admin status in channels
- Fetch channel info & stats

### Database Tables
```
users, channels, campaigns, offers, deals,
deal_timeline, reviews, notifications, wallets
```

### External Integrations
- Telegram Bot API (channel verification, notifications)
- TON Blockchain (escrow, payments, verification)

---

## Recommended Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Runtime** | **Bun** | Faster than Node.js, native TypeScript, built-in test runner |
| **Framework** | **Hono** | Lightweight, type-safe, works on Bun/Node/edge |
| **Database** | **PostgreSQL** | Relational data (deals, offers, campaigns) with ACID transactions for escrow logic |
| **ORM** | **Drizzle** | Type-safe, lightweight, better DX than Prisma for Bun, no code generation step |
| **Bot Framework** | **grammY** | TypeScript-first Telegram bot, excellent plugin ecosystem |
| **TON SDK** | **@ton/ton + @ton/core** | Official TON libraries, best maintained |
| **Auth** | **Telegram initData validation** | No passwords — Telegram IS the auth. Validate HMAC, issue JWT |
| **Cache** | **Redis** | Rate limiting, session cache, job queues |
| **Job Queue** | **BullMQ** (on Redis) | Background tasks: monitor blockchain, verify posts, send notifications |
| **Deployment** | **Docker → VPS** or **Railway** | Needs long-running processes (blockchain monitoring), so not serverless |

### Why NOT alternatives

- **Prisma** → requires code generation, heavier, Drizzle fits Bun better
- **Express** → legacy, no native TypeScript, slower than Hono
- **NestJS** → overkill decorators/DI for this scope
- **Serverless (Vercel/Lambda)** → can't run persistent blockchain watchers or WebSocket connections
- **MongoDB** → deals/escrow need relational integrity and transactions
- **Python** → TON SDK less mature, can't share types with frontend

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────┐
│  Telegram Mini   │────▶│  Hono API Server (Bun)       │
│  App (React)     │◀────│                              │
└─────────────────┘     │  ├── Auth (initData + JWT)    │
                        │  ├── REST Routes              │
┌─────────────────┐     │  ├── grammY Bot               │
│  Telegram Bot    │────▶│  └── WebSocket (optional)     │
│  API             │◀────│                              │
└─────────────────┘     └──────────┬───────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
              ┌──────────┐  ┌──────────┐  ┌──────────┐
              │ Postgres │  │  Redis   │  │ TON RPC  │
              │ (Drizzle)│  │ (BullMQ) │  │          │
              └──────────┘  └──────────┘  └──────────┘
```

### Shared Code Benefit

Since both frontend and backend are TypeScript, types from `chainfluence-design/src/types/` (`Channel`, `Deal`, `Campaign`, etc.) can live in a shared package — no duplication, no drift.
