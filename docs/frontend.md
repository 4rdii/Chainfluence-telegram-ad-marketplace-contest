# Frontend — Telegram Mini App

## Overview

The Chainfluence frontend is a Telegram Mini App (TMA) built with React, TypeScript, and Vite. It runs inside Telegram's WebView and integrates with TonConnect for wallet operations and cryptographic deal signing.

The frontend is located in `chainfluence-design/`.

---

## Tech Stack

| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| TypeScript | Type safety |
| Vite | Build tooling |
| TonConnect UI React | TON wallet connection and transaction signing |
| Tailwind CSS v4 | Styling |
| Lucide React | Icons |
| Telegram WebApp SDK | Mini App lifecycle, haptics, back button |

---

## Architecture

The app uses a screen-based navigation system managed through a discriminated union type in `App.tsx`:

```typescript
type Screen =
  | { type: 'loading' }
  | { type: 'splash' }
  | { type: 'roleSelection' }
  | { type: 'tab'; tab: TabType }
  | { type: 'channelDetail'; channel: Channel }
  | { type: 'campaignDetail'; campaign: Campaign }
  | { type: 'dealDetail'; deal: Deal }
  | { type: 'payment'; dealId: number; amount: number; ... }
  // ... more screens
```

This approach avoids a router library (unnecessary complexity for a Mini App) and gives full control over transitions and state passing between screens.

---

## Key Files

### `src/App.tsx`

Central application component. Manages:
- Screen navigation state
- Data loading (users, channels, campaigns, deals, notifications, offers)
- Authentication flow (Telegram initData → backend JWT)
- TonConnect wallet integration
- Event handlers for all user interactions (accept offer, send payment, sign deal, etc.)

### `src/lib/api.ts`

REST API client that communicates with the NestJS backend. Stores JWT token in memory (not localStorage — Mini Apps don't fully support it). Provides typed methods for all API operations:

```typescript
api.auth.login(initData)
api.users.me()
api.channels.list()
api.campaigns.list()
api.deals.list()
api.deals.register(payload)
api.escrow.createWallet(dealId)
api.escrow.signDeal(dealId, role, signatureData)
api.escrow.confirmPosted(dealId, postLink)
api.offers.accept(offerId)
// ... etc
```

### `src/lib/deal-signing.ts`

Cryptographic deal signing using TonConnect's `signData` API. This is security-critical — the cell structure must match the TEE's verification exactly.

**Key functions:**

- `buildDealParamsCell(params)` — Constructs the TON Cell that gets signed:
  ```
  Main cell: dealId(64) | channelId(64) | contentHash(256) | duration(32)
    ref[0] → publisher(address) | advertiser(address) | amount(coins)
  ```

- `signDealWithTonConnect(tonConnectUI, params)` — Calls TonConnect to sign the cell, returns signature + public key + timestamp + domain.

- `computeContentHash(content)` — SHA-256 of ad text using `crypto.subtle.digest()`. Must produce the same hash as the TEE's implementation.

### `src/lib/auth.ts`

Handles the Telegram Mini App authentication flow:
1. Extract `initData` from `window.Telegram.WebApp.initData`
2. Send to backend `POST /auth/login`
3. Store returned JWT for subsequent API calls

### `src/lib/telegram.ts`

Telegram WebApp SDK helpers:
- `initTelegramWebApp()` — Calls `ready()`, `expand()`, sets dark theme colors
- `showBackButton()` / `hideBackButton()` — Native Telegram back button
- `hapticImpact()` / `hapticNotification()` — Haptic feedback

### `src/lib/adapters.ts`

Transforms backend API responses into frontend types. Handles differences between backend data shapes (snake_case, BigInt IDs) and frontend expectations.

### `src/types/index.ts`

Complete type definitions for all entities: User, Channel, Campaign, Deal, Offer, Review, Notification, plus enums for DealStatus, ChannelCategory, AdFormat, etc.

---

## Screens

| Screen | File | Purpose |
|--------|------|---------|
| Loading | `App.tsx` | Initial loading with logo animation |
| Splash | `SplashScreen.tsx` | First-time user onboarding |
| Role Selection | `RoleSelectionScreen.tsx` | Choose publisher/advertiser/both |
| Home | `HomeScreen.tsx` | Dashboard with stats, pending actions, recent activity |
| Channels | `ChannelsScreen.tsx` | Browse available channels |
| Channel Detail | `ChannelDetailScreen.tsx` | Channel stats, pricing, book ad |
| Add Channel | `AddChannelScreen.tsx` | Publisher registers their channel |
| Campaigns | `CampaignsScreen.tsx` | Browse/create ad campaigns |
| Campaign Detail | `CampaignDetailScreen.tsx` | Campaign details, submit offers |
| Create Campaign | `CreateCampaignScreen.tsx` | Advertiser creates a campaign |
| My Campaigns | `MyCampaignsScreen.tsx` | Manage own campaigns |
| My Offers | `MyOffersScreen.tsx` | Publisher views their offers |
| Deals | `DealsScreen.tsx` | List of active/completed deals |
| Deal Detail | `DealDetailScreen.tsx` | Full deal view with progress bar, actions, timeline |
| Deal Completion | `DealCompletionScreen.tsx` | Post-deal completion flow |
| Payment | `PaymentModal.tsx` | TON payment via TonConnect |
| Notifications | `NotificationsScreen.tsx` | In-app notification feed |
| Profile | `ProfileScreen.tsx` | User profile, wallet, channels |

---

## Deal Signing Flow

The frontend implements the publisher/advertiser signing flow:

```
1. User navigates to deal detail
2. Deal shows "Sign Deal" button (if user hasn't signed yet)
3. User taps "Sign Deal"
4. Frontend calls signDealWithTonConnect():
   a. Builds deal params cell (must match TEE exactly)
   b. Encodes as BOC (Bag of Cells)
   c. Calls tonConnectUI.signData({ type: 'cell', schema, cell })
   d. User approves in wallet app (Tonkeeper, etc.)
   e. Returns: signature, publicKey, timestamp, domain
5. Frontend sends signature to backend: POST /escrow/:dealId/sign
6. Backend stores signature in database
7. When both parties have signed AND post is confirmed:
   → Backend auto-triggers TEE verification
```

### Critical Invariant

The `buildDealParamsCell()` in the frontend and `buildDealParamsCell()` in the TEE (`ton-escrow-tee/src/signature.ts`) must produce **identical** cell structures. Any mismatch will cause signature verification to fail.

Fields that are signed: `dealId`, `channelId`, `contentHash`, `duration`, `publisher` (address), `advertiser` (address), `amount`.

Fields that are NOT signed (verified separately by TEE): `postId`, `postedAt`.

---

## Payment Flow

```
1. User accepts an offer or books a channel
2. Frontend navigates to payment screen with:
   - escrow address (from TEE)
   - amount (from deal terms)
   - fee breakdown
3. User taps "Send Payment"
4. Frontend calls tonConnectUI.sendTransaction():
   - Sends exact amount to escrow address
   - User confirms in wallet app
5. On success:
   - If offer was pending: backend marks offer as accepted
   - If deal registration pending: backend registers deal
6. TEE independently detects deposit by polling escrow balance
```

---

## Telegram Mini App Considerations

- **No `position: fixed`** — Does not work reliably in Telegram's WebView. All layouts use normal document flow.
- **Safe area** — Must account for Telegram's native header bar at the top.
- **`pb-20`** — Bottom padding on scrollable content to account for the fixed bottom navigation bar.
- **Dark theme** — App forces dark mode via `.dark` CSS class and sets Telegram header/background colors to match.
- **Haptic feedback** — Used on button presses for native feel.

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Backend API URL (e.g., `https://debazaar.click`) |

---

## Development

```bash
cd chainfluence-design
npm install
npm run dev      # Development server with HMR
npm run build    # Production build to build/
```

Deployed to Vercel as static files. The `vercel.json` configures SPA routing.
