# Backend — NestJS API Server

## Overview

The backend is a NestJS application that serves as the coordination layer between the frontend, TEE service, and PostgreSQL database. It handles authentication, user management, channel/campaign/offer workflows, deal orchestration, and runs a scheduler that periodically checks deal status via the TEE.

The backend is located in `backend/`.

**Key principle**: The backend does NOT make trust-critical decisions about funds. It orchestrates workflows and stores off-chain metadata. All escrow operations are delegated to the TEE.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| NestJS | Application framework |
| Prisma | ORM and database migrations |
| PostgreSQL | Persistent storage |
| Passport + JWT | Authentication |
| `@nestjs/schedule` | Cron-based deal checking |
| GramJS | Telegram MTProto client (channel stats) |
| Telegram Bot API | Channel verification, content posting |

---

## Module Architecture

```
AppModule
├── ConfigModule (global)           # Environment-based configuration
├── ScheduleModule (global)         # Cron job support
├── PrismaModule (global)           # Database client
├── AuthModule                      # Telegram auth + JWT
├── UsersModule                     # User profiles
├── ChannelsModule                  # Channel registration + stats
├── CampaignsModule                 # Campaign CRUD
├── OffersModule                    # Publisher offers on campaigns
├── DealsModule                     # Deal lifecycle management
├── EscrowModule                    # TEE proxy + signing orchestration
├── TeeModule                       # TEE HTTP client + scheduler
├── ReviewsModule                   # Post-deal ratings
├── NotificationsModule             # In-app notifications
├── UploadsModule                   # File uploads
├── HealthModule                    # Health checks
└── LoggerModule                    # Structured logging
```

All routes require JWT authentication by default (global `JwtAuthGuard`). Routes marked with `@Public()` are exempt.

---

## Authentication Flow

```
Frontend                    Backend                         Telegram
   │                           │                               │
   │  1. User opens Mini App   │                               │
   │     Telegram provides     │                               │
   │     initData (HMAC-signed)│                               │
   │                           │                               │
   │  2. POST /auth/login      │                               │
   │     { initData }          │                               │
   │  ────────────────────────►│                               │
   │                           │  3. Validate HMAC-SHA256      │
   │                           │     secretKey = HMAC(botToken, "WebAppData")
   │                           │     hash = HMAC(secretKey, dataCheckString)
   │                           │     Verify hash matches       │
   │                           │     Check auth_date < 24h     │
   │                           │                               │
   │                           │  4. Find or create user       │
   │                           │     (Telegram ID as primary key)
   │                           │                               │
   │                           │  5. Sign JWT                  │
   │                           │     { sub: telegramUserId }   │
   │  ◄────────────────────────│                               │
   │  { token: "eyJ..." }     │                               │
   │                           │                               │
   │  6. All subsequent requests include:                      │
   │     Authorization: Bearer <token>                         │
```

### Key Files

- `auth/telegram-validation.service.ts` — Validates Telegram's HMAC signature on initData
- `auth/auth.service.ts` — Issues JWT after validation
- `auth/jwt.strategy.ts` — Passport strategy that extracts userId from JWT
- `auth/jwt-auth.guard.ts` — Global guard (skips routes with `@Public()`)
- `auth/current-user.decorator.ts` — `@CurrentUserId()` parameter decorator

---

## Database Schema

### Models

**User** — Telegram user identity
```
id: BigInt (Telegram user ID, primary key)
username: String?
walletAddress: String? (TON wallet)
isPublisher: Boolean
isAdvertiser: Boolean
memberSince: DateTime
```

**Channel** — Publisher's Telegram channel
```
id: BigInt (Telegram channel ID, primary key)
ownerId: BigInt → User
username, title, category: String
subscribers, avgViews, postsPerWeek: Int
engagementRate, avgReach: Float?
isVerified, isActive: Boolean
```

**Campaign** — Advertiser's bulk ad request
```
id: Int (auto-increment)
advertiserId: BigInt → User
title, description, category: String
budget: Float?
creativeText, creativeImages: String?
preferredFormats, preferredCategories: String?
minSubscribers, minEngagement: Int?
deadline: DateTime?
status: String (active/paused/completed)
```

**Offer** — Publisher's response to a campaign
```
id: Int (auto-increment)
campaignId: Int → Campaign
publisherId: BigInt → User
channelId: BigInt
status: String (pending/accepted/rejected)
amount: Float?
format: String?
```

**Deal** — Full deal record (mirrors on-chain + local state)
```
id: Int (auto-increment)
dealId: Int (unique, matches on-chain)
publisherId, advertiserId: BigInt → User
channelId, verificationChatId: BigInt
status: String (active/approved/released/refunded/rejected)

# Escrow fields
escrowAddress, amount, duration, contentHash: String
postId, postedAt: String?

# Wallet addresses
publisherWallet, advertiserWallet: String?

# Signatures (TonConnect)
publisherSignature, publisherPublicKey: String?
publisherSignTimestamp, publisherSignDomain: String?
advertiserSignature, advertiserPublicKey: String?
advertiserSignTimestamp, advertiserSignDomain: String?

# Creative content
creativeText, creativeImages: String?

# Settlement
releasedAt, refundedAt: DateTime?
txHash: String?
```

**Review** — Post-deal rating
```
dealId: Int → Deal
reviewerId, revieweeId: BigInt → User
rating: Int (1-5)
comment: String?
```

**Notification** — In-app notification
```
userId: BigInt → User
type, title, body: String
read: Boolean
```

---

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | Public | Login with Telegram initData |

### Users
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users/me` | JWT | Get current user profile |
| PATCH | `/users/me` | JWT | Update profile |
| PATCH | `/users/me/wallet` | JWT | Link TON wallet address |

### Channels
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/channels` | Public | List all channels |
| GET | `/channels/:id` | Public | Channel details |
| GET | `/channels/mine` | JWT | My channels |
| POST | `/channels` | JWT | Register channel |
| PATCH | `/channels/:id` | JWT | Update channel (owner only) |
| DELETE | `/channels/:id` | JWT | Remove channel (owner only) |

### Campaigns
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/campaigns` | Public | List campaigns |
| GET | `/campaigns/:id` | Public | Campaign details |
| POST | `/campaigns` | JWT | Create campaign |
| PATCH | `/campaigns/:id` | JWT | Update campaign |
| GET | `/campaigns/:id/offers` | JWT | Offers on campaign |
| POST | `/campaigns/:id/offers` | JWT | Submit offer |

### Offers
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offers/mine` | JWT | My offers (publisher) |
| POST | `/offers/:id/accept` | JWT | Accept offer (advertiser) |
| POST | `/offers/:id/reject` | JWT | Reject offer (advertiser) |

### Deals
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/deals` | JWT | List my deals |
| GET | `/deals/:dealId` | JWT | Deal details |
| POST | `/deals/register` | JWT | Register new deal |

### Escrow
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/escrow/create-wallet` | JWT | Get escrow address from TEE |
| POST | `/escrow/:dealId/sign` | JWT | Submit TonConnect signature |
| POST | `/escrow/:dealId/confirm-posted` | JWT | Confirm ad was posted |
| POST | `/escrow/:dealId/check` | JWT | Manually trigger TEE check |
| POST | `/escrow/verify-and-register` | JWT | Direct TEE verification |

### Reviews
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/deals/:dealId/reviews` | JWT | Submit review |
| GET | `/channels/:channelId/reviews` | Public | Channel reviews |

### Notifications
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | JWT | My notifications |
| PATCH | `/notifications/:id/read` | JWT | Mark as read |
| POST | `/notifications/read-all` | JWT | Mark all as read |

### Health
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | Public | Liveness check |
| GET | `/health/ready` | Public | Readiness (DB connectivity) |

---

## Escrow Orchestration

The `EscrowService` orchestrates the deal signing and TEE triggering flow:

```
1. Frontend creates deal → backend stores record (status=active)

2. Backend calls TEE → createEscrowWallet(dealId)
   Returns unique escrow address for advertiser deposit

3. Publisher signs deal → POST /escrow/:dealId/sign (role=publisher)
   Backend stores: publisherSignature, publisherPublicKey, publisherSignTimestamp, publisherSignDomain

4. Advertiser signs deal → POST /escrow/:dealId/sign (role=advertiser)
   Backend stores: advertiserSignature, advertiserPublicKey, advertiserSignTimestamp, advertiserSignDomain

5. Publisher posts ad → POST /escrow/:dealId/confirm-posted
   Backend stores: postId, postedAt

6. After each step, tryTriggerTee() checks:
   - Both signatures present?
   - postId set?
   If all conditions met → calls TEE verifyAndRegisterDeal()

7. TEE verifies everything and registers on-chain
   Backend updates deal status based on TEE response
```

### Key File: `escrow/escrow.service.ts`

- `signDeal()` — Stores party signature, checks if both signed + post confirmed → auto-trigger
- `confirmPosted()` — Parses post link for postId, sets postedAt, checks trigger
- `tryTriggerTee()` — Assembles full payload and calls TEE
- `checkDeal()` — User-triggered status check via TEE

---

## Deal Check Scheduler

**File**: `tee/check-deal.scheduler.ts`

Runs every 10 minutes via `@Cron('0 */10 * * * *')`:

```
1. Load all deals with status = 'active'
2. For each deal:
   a. Call TEE POST /checkDeal { dealId, verificationChatId }
   b. TEE returns: { action: 'pending' | 'released' | 'refunded', txHash? }
   c. If 'released': updateDealStatus(dealId, 'released', txHash)
   d. If 'refunded': updateDealStatus(dealId, 'refunded', txHash)
   e. If 'pending': do nothing (check again next cycle)
```

This ensures deals automatically settle without user intervention. The scheduler is the only caller of `checkDeal` in normal operation (users can also trigger manual checks).

---

## Channel Registration

**File**: `channels/channels.service.ts`

When a publisher registers a channel:

1. **Verification** — Check that the user is an admin of the channel:
   - **GramJS path** (if MTProto session available): Uses `getFullChannel()` for reliable detection including private channels
   - **Bot API path** (fallback): Calls `getChatAdministrators()` and checks if bot is admin

2. **Stats collection** (if GramJS available):
   - `getChannelHistoryStats()` — Reads recent posts to compute average views and posting frequency
   - `getChannelBroadcastStats()` — Fetches language distribution, engagement rate, reach, shares, reactions

3. **Database** — Creates or updates channel record with all collected stats

---

## TEE Client

**File**: `tee/tee-client.service.ts`

Simple HTTP client that wraps TEE API calls:

```typescript
createEscrowWallet(dealId: number)      → POST /createEscrowWallet
verifyAndRegisterDeal(payload: object)  → POST /verifyAndRegisterDeal
checkDeal(payload: object)              → POST /checkDeal
```

Base URL configured via `TEE_URL` environment variable.

---

## Development

```bash
cd backend
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run start:dev
```

### Running Tests

```bash
npm run test         # Unit tests
npm run test:e2e     # End-to-end tests
npm run test:cov     # Coverage report
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `TEE_URL` | Yes | TEE service URL |
| `PORT` | No | Server port (default: 3000) |
| `NODE_ENV` | No | Environment (development/production) |
| `TELEGRAM_API_ID` | No | MTProto API ID (for GramJS) |
| `TELEGRAM_API_HASH` | No | MTProto API hash (for GramJS) |

---

## Code Reading Order

For new developers, read the backend code in this order (from simplest to most complex):

1. **Foundation**: `config/`, `health/`, `main.ts`
2. **Database**: `prisma/schema.prisma`, `prisma/prisma.service.ts`
3. **Auth**: `auth/public.decorator.ts` → `telegram-validation.service.ts` → `jwt.strategy.ts` → `auth.service.ts`
4. **Users**: `users/users.service.ts` → `users.controller.ts`
5. **Deals**: `deals/deals.service.ts` → `deals.controller.ts`
6. **TEE**: `tee/tee-client.service.ts` → `tee/check-deal.scheduler.ts`
7. **Channels**: `channels/channels.service.ts`
8. **Campaigns/Offers**: `campaigns/` → `offers/`
9. **Escrow**: `escrow/escrow.service.ts` (most complex — orchestrates the full signing flow)
10. **App wiring**: `app.module.ts`

See `backend/docs/READING_ORDER.md` for a detailed file-by-file guide.
