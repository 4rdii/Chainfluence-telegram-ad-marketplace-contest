# Backend code reading order

Read the files below in order, from simplest to most complex. Each entry has a short "what to notice" so you know what to look for.

---

## 1. Foundation (config, health, bootstrap)

| Order | File | What to notice |
|-------|------|----------------|
| 1.1 | `src/config/configuration.ts` | Exports a single function that returns env-based config (port, database, telegram, tee, jwt). No logic. |
| 1.2 | `src/config/env.validation.ts` | `validateEnv()` throws if any required env var is missing. Called in `main.ts` before app creation. |
| 1.3 | `src/health/health.controller.ts` | `GET /health` (liveness), `GET /health/ready` (DB check via `$queryRaw`). Uses `@Public()` so no JWT. |
| 1.4 | `src/health/health.module.ts` | Registers the health controller only. |
| 1.5 | `src/main.ts` | Runs `validateEnv()`, creates app, global `ValidationPipe`, CORS, listens on config port. |

---

## 2. Database (Prisma)

| Order | File | What to notice |
|-------|------|----------------|
| 2.1 | `prisma/schema.prisma` | All models: User (Telegram id as PK), Deal, Review, Notification, Channel (→ User), Campaign, Offer (→ Campaign). Relations and `@@map` for table names. |
| 2.2 | `src/prisma/prisma.service.ts` | Extends `PrismaClient`; `onModuleInit` calls `$connect()`. Injected everywhere as the DB layer. |
| 2.3 | `src/prisma/prisma.module.ts` | `@Global()` module that provides and exports `PrismaService`. |

---

## 3. Auth (Telegram + JWT)

| Order | File | What to notice |
|-------|------|----------------|
| 3.1 | `src/auth/public.decorator.ts` | `@Public()` sets metadata so `JwtAuthGuard` skips JWT for that route. |
| 3.2 | `src/auth/current-user.decorator.ts` | `@CurrentUserId()` reads `request.user.userId` (set by JWT strategy). |
| 3.3 | `src/auth/dto/login.dto.ts` | Body for login: `initData` string from Telegram Mini App. |
| 3.4 | `src/auth/telegram-validation.service.ts` | Validates Mini App `initData`: HMAC-SHA256 with bot token, parses `user`, checks `auth_date` expiry. Core of "who is the user". |
| 3.5 | `src/auth/jwt.strategy.ts` | Passport JWT strategy: extracts token from `Authorization`, validates with secret, `validate()` returns `{ userId }` (payload.sub = Telegram id). |
| 3.6 | `src/auth/jwt-auth.guard.ts` | Wraps Passport guard; if handler/class has `@Public()`, returns true and skips JWT. |
| 3.7 | `src/auth/auth.service.ts` | `login(initData)`: validate → find or create user (set `memberSince` on create) → sign JWT with `sub: user.id`. |
| 3.8 | `src/auth/auth.controller.ts` | `POST /auth/login` with `LoginDto`; `@Public()`. |
| 3.9 | `src/auth/auth.module.ts` | Registers PassportModule, JwtModule (async config), controller, and all auth providers. Exports `AuthService`. |

---

## 4. Users (profile and wallet)

| Order | File | What to notice |
|-------|------|----------------|
| 4.1 | `src/users/dto/update-me.dto.ts` | Optional: username, isPublisher, isAdvertiser. |
| 4.2 | `src/users/dto/update-wallet.dto.ts` | Required: walletAddress (TON). |
| 4.3 | `src/users/users.service.ts` | `findById`, `updateMe`, `updateWallet`; all keyed by user id. `toResponse()` maps bigint/Date to JSON-friendly shapes. |
| 4.4 | `src/users/users.controller.ts` | `GET /users/me`, `PATCH /users/me`, `PATCH /users/me/wallet`; all use `@CurrentUserId()` and JWT guard. |
| 4.5 | `src/users/users.module.ts` | Controller + service; no extra imports. |

---

## 5. Deals (off-chain storage for scheduler)

| Order | File | What to notice |
|-------|------|----------------|
| 5.1 | `src/deals/dto/register-deal.dto.ts` | dealId (number), verificationChatId (number). |
| 5.2 | `src/deals/deals.service.ts` | `register`: idempotent on dealId. `findActiveDeals` for scheduler. `updateDealStatus(dealId, 'released'|'refunded', txHash)` used by scheduler. |
| 5.3 | `src/deals/deals.controller.ts` | `POST /deals/register`, `GET /deals`, `GET /deals/:dealId`. All authenticated. |
| 5.4 | `src/deals/deals.module.ts` | Controller + service; exports service for TEE/scheduler. |

---

## 6. TEE client and scheduler

| Order | File | What to notice |
|-------|------|----------------|
| 6.1 | `src/tee/tee-client.service.ts` | HTTP client for TEE: `createEscrowWallet(dealId)`, `verifyAndRegisterDeal(body)`, `checkDeal(dealId, verificationChatId)`. Base URL from config. |
| 6.2 | `src/tee/check-deal.scheduler.ts` | Cron every 10 min: loads active deals, calls TEE `checkDeal` for each; on `released`/`refunded` updates deal via `DealsService.updateDealStatus`. |
| 6.3 | `src/tee/tee.module.ts` | Imports DealsModule; provides TeeClientService and CheckDealScheduler. Exports TeeClientService for escrow proxy. |

---

## 7. Telegram Bot API (for channels)

| Order | File | What to notice |
|-------|------|----------------|
| 7.1 | `src/telegram/telegram-api.service.ts` | Uses bot token from config. `getChat(chatId)`, `getChatAdministrators(chatId)`, `isBotAdmin(chatId, botUserId)`, `getBotId()`. Used when adding a channel to verify the bot is admin. |

---

## 8. Channels

| Order | File | What to notice |
|-------|------|----------------|
| 8.1 | `src/channels/dto/create-channel.dto.ts` | channelId (number) or username (string). |
| 8.2 | `src/channels/dto/update-channel.dto.ts` | Optional: title, category, isActive. |
| 8.3 | `src/channels/channels.service.ts` | `create`: get chat from Telegram, verify bot is admin, then create/update channel. `findMine`, `findAll(category?)`, `findOne`, `update` (owner-only). |
| 8.4 | `src/channels/channels.controller.ts` | POST/GET mine/PATCH require JWT; GET list and GET by id are `@Public()`. |
| 8.5 | `src/channels/channels.module.ts` | Imports TelegramModule; controller + service. |

---

## 9. Campaigns and offers

| Order | File | What to notice |
|-------|------|----------------|
| 9.1 | `src/campaigns/dto/create-campaign.dto.ts` | title; optional description, category, budget. |
| 9.2 | `src/campaigns/dto/update-campaign.dto.ts` | Optional: title, description, category, status, budget. |
| 9.3 | `src/campaigns/campaigns.service.ts` | CRUD keyed by advertiserId (current user). findAll supports category/status/advertiserId filters. |
| 9.4 | `src/campaigns/campaigns.controller.ts` | CRUD + `GET /campaigns/:id/offers` and `POST /campaigns/:id/offers` (delegate to OffersService). |
| 9.5 | `src/campaigns/campaigns.module.ts` | Imports OffersModule so controller can use OffersService. |
| 9.6 | `src/offers/dto/create-offer.dto.ts` | channelId; optional amount, format. |
| 9.7 | `src/offers/offers.service.ts` | create (publisher), findByCampaign, findMine (publisher), accept/reject (advertiser only, status must be pending). |
| 9.8 | `src/offers/offers.controller.ts` | `GET /offers/mine`, `POST /offers/:id/accept`, `POST /offers/:id/reject`. Campaign offers live under campaigns controller. |
| 9.9 | `src/offers/offers.module.ts` | Controller + service only. |

---

## 10. Escrow proxy (optional TEE front)

| Order | File | What to notice |
|-------|------|----------------|
| 10.1 | `src/escrow/dto/create-wallet.dto.ts` | dealId. |
| 10.2 | `src/escrow/escrow.service.ts` | `createWallet`: forward to TEE. `verifyAndRegisterDeal`: forward to TEE; on success, call `DealsService.register` so the deal is stored for the scheduler. |
| 10.3 | `src/escrow/escrow.controller.ts` | `POST /escrow/create-wallet`, `POST /escrow/verify-and-register` (body passed through to TEE). Both require JWT. |
| 10.4 | `src/escrow/escrow.module.ts` | Imports DealsModule and TeeModule. |

---

## 11. Reviews and notifications

| Order | File | What to notice |
|-------|------|----------------|
| 11.1 | `src/reviews/dto/create-review.dto.ts` | rating 1–5; optional comment. |
| 11.2 | `src/reviews/reviews.service.ts` | create: deal must exist and be released/refunded; one review per user per deal. findByChannel (currently not filtered by channel in DB). |
| 11.3 | `src/reviews/reviews.controller.ts` | Two controllers: `POST /deals/:dealId/reviews` (auth) and `GET /channels/:channelId/reviews` (public). |
| 11.4 | `src/reviews/reviews.module.ts` | Registers both controllers and ReviewsService. |
| 11.5 | `src/notifications/notifications.service.ts` | create(userId, type, title, body), findAll(userId), markRead(userId, id), markAllRead(userId). |
| 11.6 | `src/notifications/notifications.controller.ts` | `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`. All auth. |
| 11.7 | `src/notifications/notifications.module.ts` | Controller + service; exports service (for future use from scheduler). |

---

## 12. App wiring

| Order | File | What to notice |
|-------|------|----------------|
| 12.1 | `src/app.module.ts` | Imports ConfigModule (global), ScheduleModule, PrismaModule, AuthModule, UsersModule, DealsModule, ChannelsModule, CampaignsModule, OffersModule, EscrowModule, TeeModule, ReviewsModule, NotificationsModule, HealthModule. Registers `APP_GUARD` with `JwtAuthGuard` so all routes require JWT unless `@Public()`. |

---

## Quick dependency map

- **main.ts** → validateEnv, AppModule, ConfigService, ValidationPipe, CORS.
- **Auth** → Config, Prisma, JWT/Passport; used by every protected route.
- **Users** → Auth (CurrentUserId), Prisma.
- **Deals** → Prisma; used by TeeModule (scheduler) and EscrowModule.
- **TEE** → Config (TEE URL), DealsService (read active, update status).
- **Telegram** → Config (bot token).
- **Channels** → Prisma, TelegramApiService.
- **Campaigns** → Prisma, OffersService (for offer routes).
- **Offers** → Prisma (Campaign relation).
- **Escrow** → TeeClientService, DealsService.
- **Reviews** → Prisma (Deal relation).
- **Notifications** → Prisma.

Read in the order above; open each file in your editor and use this doc as a checklist.
