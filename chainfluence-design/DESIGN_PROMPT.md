# Figma AI Design Prompt - Chainfluence Telegram Mini App

## Overview

Design a **mobile-first Telegram Mini App** for **Chainfluence** - a decentralized two-sided advertising marketplace for Telegram channels. The platform works in **two directions**:

1. **Channel-first (Publisher → Advertiser)**: Publishers list their channels with pricing. Advertisers browse channels and book ad slots.
2. **Campaign-first (Advertiser → Publisher)**: Advertisers create ad campaigns with their content and budget. Publishers browse campaigns and pick ones that fit their channel.

All payments are trustless, managed by a TEE (Trusted Execution Environment) via TON blockchain escrow. Funds are automatically released to the publisher when the ad stays up for the agreed duration, or refunded to the advertiser if the ad is removed/modified early.

The app runs inside Telegram as a Mini App, so all screens must be designed for **mobile portrait view** (360-400px width). Use Telegram's native design language where possible.

---

## Brand & Visual Identity

- **App Name**: Chainfluence
- **Tagline**: "Trustless Telegram Advertising"
- **Tone**: Professional, crypto-native, trustworthy
- **Color Palette**:
  - Primary: TON blue (#0098EA)
  - Success / Released: Green (#2ECC71)
  - Pending / Waiting: Amber (#F39C12)
  - Error / Refund: Red (#E74C3C)
  - Background: Dark (#1A1A2E) or Light (#F5F5F5) - design both variants
  - Cards: Slightly elevated surfaces with subtle shadows
  - Text: High contrast for readability on mobile
- **Typography**: Clean sans-serif (Inter, SF Pro, or system default)
- **Icons**: Outline style, minimal, consistent stroke width
- **Corner Radius**: 12-16px for cards, 8px for buttons, full round for avatars

---

## User Roles

There are two primary user roles. A single user can be both.

### 1. Publisher (Channel Owner)
- Owns one or more Telegram channels
- Lists channels on the marketplace with pricing
- Accepts/rejects incoming ad booking requests
- Reviews and approves ad creatives
- Posts approved ads to their channel
- Receives payment after ad duration is fulfilled

### 2. Advertiser (Buyer)
- Browses channels to find advertising opportunities
- Books ad slots and pays to escrow
- **Creates ad campaigns** that publishers can browse and accept
- Submits ad creatives (text + images)
- Tracks deal progress and ad performance
- Gets refunded if publisher violates the deal

---

## Screen-by-Screen Design

---

### SCREEN 1: Splash / Onboarding

**Purpose**: First-time user experience when opening the Mini App.

**Elements**:
- Chainfluence logo + tagline centered
- Brief value proposition: "Buy and sell Telegram channel ads with trustless escrow"
- Three onboarding slides (swipeable):
  1. "Browse Channels" - illustration of channel cards with stats
  2. "Escrow Protection" - illustration of locked funds with shield icon
  3. "Automatic Settlement" - illustration of funds flowing to publisher
- "Get Started" button at bottom
- Skip link in top right

---

### SCREEN 2: Role Selection

**Purpose**: User chooses how they want to use the platform.

**Elements**:
- Greeting: "Welcome, {Telegram first name}!" with user's Telegram avatar
- Two large tappable cards:
  - **"I'm a Publisher"** - icon of megaphone/channel - subtitle: "List your channel and earn TON"
  - **"I'm an Advertiser"** - icon of rocket/ad - subtitle: "Promote your product to targeted audiences"
- Small text below: "You can switch roles anytime"
- Both cards should be selectable (user can be both)

---

### SCREEN 3: Home / Dashboard

**Purpose**: Main hub after onboarding. Shows role-specific content.

**Layout**: Tab bar at bottom with 5 tabs:
1. **Home** (dashboard icon)
2. **Channels** (megaphone icon) - browse channels (advertiser view)
3. **Campaigns** (rocket icon) - browse ad campaigns (publisher view)
4. **Deals** (handshake icon) - active deals
5. **Profile** (person icon)

**Home Tab Content**:
- **Header**: "Chainfluence" logo + notification bell icon (with badge count)
- **Quick Stats Row** (horizontal scroll):
  - Active Deals: [number]
  - Pending Actions: [number]
  - Total Earned/Spent: [amount] TON
- **Action Required Section**: Cards for items needing attention
  - "Review creative for Deal #1234" (publisher)
  - "Deposit pending for Deal #5678" (advertiser)
  - Each card has action button: "Review", "Pay", etc.
- **Recent Activity Feed**: Timeline of recent deal events
  - "Deal #1234 - Funds released to you" (green dot)
  - "Deal #5678 - Creative submitted" (amber dot)
  - "Deal #9012 - Post verified" (green dot)

---

### SCREEN 4: Publisher - Add Channel

**Purpose**: Publisher connects their Telegram channel.

**Flow**: Multi-step form with progress indicator at top (Step 1/3, 2/3, 3/3)

#### Step 1: Connect Channel
- Input field: "@channel_username"
- Helper text: "Make sure @chainfluence_bot is added as admin to your channel"
- "Verify Channel" button
- On success: Show green checkmark + channel info card:
  - Channel avatar + title
  - "@channel_username"
  - "Bot is admin: Verified"
- "Next" button

#### Step 2: Channel Stats (Auto-fetched)
- Stats displayed in grid of cards (2x2):
  - Subscribers: 125,230 (with people icon)
  - Avg Views: 32,450 (with eye icon)
  - Engagement: 25.9% (with chart icon)
  - Posts/Week: 14 (with calendar icon)
- Category dropdown selector:
  - Options: Crypto, DeFi, Tech, News, Education, Entertainment, Lifestyle, Trading, NFT, Gaming
- "Stats are refreshed every 2 hours"
- "Next" button

#### Step 3: Set Pricing
- Four pricing cards, one for each format:
  - **1/24** (Pinned 24h): Input field for price in TON + toggle to enable/disable
  - **2/48** (Stay 48h): Input field + toggle
  - **3/72** (Stay 72h): Input field + toggle
  - **Eternal** (Permanent): Input field + toggle
- Each card shows:
  - Format name + brief description
  - Price input with "TON" suffix
  - Enable/disable toggle
- Summary at bottom: "Listing fee: 2 TON"
- "List Channel - Pay 2 TON" button (prominent, full-width)
- TON Connect wallet integration triggers on tap

---

### SCREEN 5: Publisher - Channel Management

**Purpose**: View and manage a listed channel.

**Elements**:
- Channel header card:
  - Avatar + name + @username
  - Verified badge
  - "Edit" button (pencil icon)
- Stats grid (same as Step 2 but live-updating)
- Pricing section: Current prices for each enabled format
- **Incoming Requests section**:
  - List of booking requests from advertisers
  - Each request card shows:
    - Advertiser username + avatar
    - Format requested (e.g. "1/24")
    - Price: 120 TON
    - Requested date/time
    - Two buttons: "Accept" (green) / "Decline" (red outline)
- **Active Deals section**:
  - List of accepted deals with status badges
  - Tappable to go to deal detail

---

### SCREEN 6: Advertiser - Browse Channels

**Purpose**: Discover and search for channels to advertise on.

**Elements**:
- **Search bar** at top with filter icon button
- **Filter panel** (slides up from bottom when filter icon tapped):
  - Category: Multi-select chips (Crypto, DeFi, Tech, etc.)
  - Subscribers: Range slider (1K - 1M+)
  - Engagement Rate: Range slider (0% - 50%+)
  - Price Range: Min/Max TON inputs
  - "Apply Filters" button
- **Sort dropdown**: "Sort by" - Most Popular, Cheapest, Highest Engagement, Newest
- **Channel Cards Grid** (1 column, vertical scroll):
  Each card contains:
  - Channel avatar (left) + Channel name + @username
  - Category badge (e.g. "Crypto" chip)
  - Stats row: "125K subs | 32K views | 25.9% eng"
  - Rating: Stars + review count (e.g. "4.8 (23)")
  - Price preview: "From 45 TON"
  - "View Details" button
- **Empty state**: "No channels match your filters" with illustration

---

### SCREEN 7: Advertiser - Channel Detail

**Purpose**: Full channel information before booking.

**Elements**:
- **Hero section**:
  - Channel avatar (large) + name + @username
  - Category badge
  - Rating: Large stars + "4.8 (23 reviews)"
  - "Open in Telegram" link
- **Stats section** (full grid):
  - Subscribers: 125,230
  - Avg Views: 32,450
  - Engagement: 25.9%
  - Posts/Week: 14
  - Audience by country (mini bar chart):
    - US: 35%, UK: 15%, DE: 12%, Other: 38%
  - Growth trend: "+2.3% this month" (with mini sparkline)
- **Pricing Table**:
  | Format | Duration | Price |
  |--------|----------|-------|
  | 1/24   | Pinned 24h | 120 TON |
  | 2/48   | Stay 48h | 85 TON |
  | 3/72   | Stay 72h | 65 TON |
  | Eternal | Permanent | 200 TON |
  Each row has a "Book" button
- **Reviews section**:
  - Average rating card
  - List of recent reviews:
    - Reviewer avatar + name
    - Star rating
    - "Great engagement, ad performed well!" - comment text
    - Date
- **"Book Ad Slot" CTA button** (sticky at bottom)

---

### SCREEN 8: Advertiser - Book Ad Slot

**Purpose**: Configure and confirm an ad booking.

**Elements**:
- **Channel reference** at top: Avatar + name (small, tappable to go back)
- **Format Selection**: Radio button cards
  - 1/24 - Pinned 24h - 120 TON
  - 2/48 - Stay 48h - 85 TON
  - 3/72 - Stay 72h - 65 TON
  - Eternal - Permanent - 200 TON
  - Selected format highlighted with border
- **Schedule**: Date picker + time picker
  - "Select posting date" - calendar widget
  - "Select posting time" - time picker
  - Timezone note: "Times shown in your local timezone"
- **Order Summary Card** (elevated):
  - Channel: CryptoNews Daily
  - Format: 1/24 (Pinned 24h)
  - Date: Feb 15, 2026 at 14:00
  - Price: 120.00 TON
  - Platform fee (5%): 6.00 TON
  - **Total: 126.00 TON**
- **Escrow Info**: Small info card
  - Lock icon + "Funds held in trustless escrow until ad duration is fulfilled"
  - "Powered by EigenCompute TEE"
- **"Pay 126 TON to Escrow" button** (full-width, prominent)
  - Triggers TON Connect wallet popup
- **After payment**: Success animation + "Booking submitted! Waiting for publisher to accept."

---

### SCREEN 9: Deal Detail - Publisher View

**Purpose**: Publisher manages an active deal.

**Elements**:
- **Deal header**:
  - Deal #1234
  - Status badge (DEPOSITED / CREATIVE_PENDING / APPROVED / POSTED / etc.)
  - Advertiser info: avatar + username
- **Deal Timeline** (vertical, showing progression):
  - Each step is a node with line connecting them
  - Completed steps: Green circle + checkmark
  - Current step: Pulsing amber circle
  - Future steps: Grey circle
  - Steps:
    1. Deal Created - Feb 10, 14:00
    2. Deposit Received - Feb 10, 14:05 - "126 TON"
    3. Deal Accepted - Feb 10, 15:30
    4. Creative Submitted - Feb 11, 09:00
    5. Creative Approved - (current, if applicable)
    6. Ad Posted - Scheduled Feb 15, 14:00
    7. Verified & Released - (future)
- **Creative Review Section** (when status = CREATIVE_PENDING):
  - Preview of submitted ad:
    - Text content in a message bubble style
    - Attached images (tappable to enlarge)
    - Buttons/links preview
  - Publisher actions:
    - "Approve Creative" button (green)
    - "Request Changes" button (outline)
    - If requesting changes: Text input for feedback comment
- **Deal Info Card**:
  - Format: 1/24
  - Amount: 120 TON (your payout after 5% fee: 114 TON)
  - Duration: 24 hours
  - Scheduled: Feb 15, 2026 at 14:00
  - Escrow address: UQC0CO7... (truncated + copy icon)
- **Post Confirmation** (when status = APPROVED and posting time arrives):
  - "Confirm you've posted the ad"
  - Input: Message ID or link to the post
  - "I've Posted the Ad" button

---

### SCREEN 10: Deal Detail - Advertiser View

**Purpose**: Advertiser tracks their deal progress.

**Elements**:
- Same deal header as publisher view
- Same timeline visualization
- **Channel Info Card**: Avatar + name + @username
- **Creative Section**:
  - If ACCEPTED (no creative yet):
    - "Submit your ad creative"
    - Text area: Multi-line input for ad copy
    - Media upload: Dropzone area "Tap to upload images"
    - Image previews (thumbnails, removable)
    - "Submit Creative" button
  - If CREATIVE_PENDING:
    - Preview of submitted creative
    - Status: "Waiting for publisher approval"
    - Spinner/loading indicator
  - If publisher requested changes:
    - Show publisher's feedback comment in a bubble
    - Editable creative form pre-filled with previous submission
    - "Resubmit Creative" button
- **Deal Info Card** (same as publisher but shows total paid):
  - Total Paid: 126 TON (incl. 5% platform fee)
  - Escrow Status: "Funds locked in escrow"
  - Balance indicator: Lock icon + amount
- **After posting**:
  - Live metrics card (if available):
    - Views: 12,450
    - Forwards: 234
    - Time remaining: "18h 32m"
  - Progress bar showing time remaining in deal duration
- **Dispute Button** (if deal is POSTED):
  - "Report Issue" link (subtle, not prominent)
  - Opens dispute form: reason dropdown + description

---

### SCREEN 11: Deals List

**Purpose**: View all deals across all channels.

**Elements**:
- **Tab filter** at top: All | Active | Completed | Disputed
- **Deal Cards** (vertical list):
  Each card shows:
  - Left: Channel avatar
  - Center:
    - Channel name
    - Format: "1/24" badge
    - Amount: "120 TON"
    - Date: "Feb 15, 2026"
  - Right:
    - Status badge (colored):
      - DEPOSITED (amber)
      - ACCEPTED (blue)
      - POSTED (blue)
      - RELEASED (green)
      - REFUNDED (red)
      - DISPUTED (red outline)
    - Chevron icon (tappable)
  - Tapping card opens Deal Detail screen
- **Empty state per tab**: "No [active/completed/disputed] deals" with illustration
- **Pull to refresh** indicator

---

### SCREEN 12: Profile

**Purpose**: User profile and settings.

**Elements**:
- **Profile header**:
  - Telegram avatar (large)
  - Display name
  - @username
  - Member since date
- **Wallet Section**:
  - Connected wallet address (truncated + copy)
  - Balance: "342.5 TON"
  - "Disconnect Wallet" link
  - If not connected: "Connect TON Wallet" button (TON Connect)
- **Role badges**: "Publisher" and/or "Advertiser" chips
- **Stats Card**:
  - For publishers:
    - Channels Listed: 2
    - Total Earned: 1,240 TON
    - Deals Completed: 18
    - Rating: 4.8 / 5
  - For advertisers:
    - Total Spent: 890 TON
    - Deals Completed: 12
    - Avg ROI: (if tracked)
- **My Channels** (if publisher):
  - List of listed channels with quick stats
  - "Add Channel" button
- **Reviews Received**:
  - List of reviews from counterparties
- **Settings Section**:
  - Notification preferences
  - Language
  - Currency display (TON / USD equivalent)

---

### SCREEN 13: Notifications

**Purpose**: List of all notifications.

**Elements**:
- **Notification list** (vertical, chronological):
  Each notification has:
  - Icon (type-specific): checkmark, coin, warning, etc.
  - Title: "Funds Released!"
  - Body: "Deal #1234 with CryptoNews Daily completed. 114 TON sent to your wallet."
  - Timestamp: "2 hours ago"
  - Unread indicator (dot)
  - Tappable (navigates to relevant deal)
- **Notification types to design**:
  - New booking request (publisher)
  - Deposit received (both)
  - Deal accepted/declined (advertiser)
  - Creative submitted (publisher)
  - Creative approved/changes requested (advertiser)
  - Posting reminder (publisher)
  - Post verified (both)
  - Funds released (publisher)
  - Funds refunded (advertiser)
  - Dispute opened (both)
  - **New offer on your campaign** (advertiser) - "CryptoNews Daily offered to post your ad for 95 TON"
  - **Offer accepted** (publisher) - "Your offer on TonSwap Promo was accepted!"
  - **Offer declined** (publisher) - "Your offer was not selected"
  - **Campaign ending soon** (advertiser) - "Your campaign expires in 3 days, 5 offers pending"

---

### SCREEN 14: Payment Confirmation Modal

**Purpose**: Overlay shown during TON Connect payment.

**Elements**:
- Semi-transparent overlay
- Modal card:
  - TON diamond icon + "Confirm Payment"
  - Amount: "126.00 TON"
  - To: Escrow address (truncated)
  - Network: "TON Testnet" or "TON Mainnet"
  - "This will open your TON wallet to confirm"
  - "Confirm" button + "Cancel" link
- **Loading state**: After confirm, show spinner + "Waiting for transaction..."
- **Success state**: Checkmark animation + "Payment confirmed!" + "Continue" button
- **Error state**: Warning icon + "Transaction failed" + "Try Again" button

---

### SCREEN 15: Deal Completion Screen

**Purpose**: Shown when a deal reaches final state (released or refunded).

**Elements**:
- **Released (success)**:
  - Large green checkmark animation
  - "Deal Completed!"
  - "120 TON released to publisher" (or "114 TON after 5% fee")
  - Transaction hash (tappable, links to explorer)
  - "Leave a Review" button
  - "Back to Deals" button
- **Refunded**:
  - Large amber refund icon
  - "Deal Refunded"
  - "120 TON returned to advertiser"
  - Reason: "Post was removed before duration ended"
  - Transaction hash
  - "Back to Deals" button

---

## Campaign-First Flow (Advertiser → Publisher)

This is the **reverse marketplace direction**. Instead of publishers listing channels and waiting for advertisers, advertisers create campaigns describing what they want to promote, their budget, and target audience. Publishers then browse these campaigns and offer their channels.

---

### SCREEN 16: Advertiser - Create Campaign

**Purpose**: Advertiser creates an ad campaign that publishers can discover and accept.

**Flow**: Multi-step form with progress indicator (Step 1/3, 2/3, 3/3)

#### Step 1: Campaign Details
- **Campaign Title**: Text input (e.g. "TonSwap DEX Launch Promo")
- **Category**: Dropdown selector (Crypto, DeFi, Tech, Gaming, etc.) - helps publishers find relevant campaigns
- **Description**: Multi-line text area describing what the advertiser wants to promote and any requirements
  - Placeholder: "Describe your product/service and what you're looking for..."
- "Next" button

#### Step 2: Creative & Content
- **Ad Creative** (the actual content to be posted):
  - Text area: Ad copy the publisher will post
  - Media upload zone: Images/banners to include
  - Preview: Shows how the post will look in a Telegram channel (message bubble style)
  - Optional: Multiple creative variants (A/B) - "Add variant" link
- **Content Guidelines** (optional):
  - Text input for any posting instructions
  - e.g. "Must include link button", "Pin for full duration", "No edits to copy"
- "Next" button

#### Step 3: Budget & Requirements
- **Budget per channel**: TON amount input
  - "How much are you willing to pay per channel?"
  - Helper text showing USD equivalent
- **Total campaign budget** (optional): TON amount input
  - "Maximum total spend across all channels"
  - Helper: "Leave empty for unlimited"
- **Preferred format**: Checkbox cards
  - 1/24 (Pinned 24h)
  - 2/48 (Stay 48h)
  - 3/72 (Stay 72h)
  - Eternal (Permanent)
  - Multiple formats can be selected (publisher picks what they offer)
- **Target audience**:
  - Minimum subscribers: Number input (e.g. "10,000")
  - Minimum engagement rate: Number input (e.g. "5%")
  - Preferred categories: Multi-select chips (same as channel categories)
  - Preferred regions: Multi-select (Global, US, Europe, CIS, Asia, LATAM)
- **Campaign deadline**: Date picker
  - "Accept offers until" - after this date the campaign is no longer active
- **Summary card**:
  - Campaign: "TonSwap DEX Launch Promo"
  - Budget: 80 TON per channel
  - Formats: 1/24, 2/48
  - Target: 10K+ subs, 5%+ engagement, Crypto/DeFi
  - Deadline: Mar 1, 2026
- **"Publish Campaign" button** (full-width, prominent)
  - No upfront payment - advertiser pays when accepting a publisher's offer

---

### SCREEN 17: Advertiser - My Campaigns

**Purpose**: Advertiser manages their active campaigns.

**Elements**:
- **Tab filter**: Active | Paused | Completed
- **Campaign Cards** (vertical list):
  Each card shows:
  - Campaign title
  - Category badge
  - Budget: "80 TON per channel"
  - Stats row: "12 offers | 3 accepted | 2 posted"
  - Status badge: ACTIVE (green) / PAUSED (amber) / COMPLETED (grey)
  - Chevron to open detail
- **"Create Campaign" FAB** (floating action button) or top-right "+" button
- **Empty state**: "No campaigns yet. Create your first campaign and let publishers come to you!"

---

### SCREEN 18: Advertiser - Campaign Detail & Offers

**Purpose**: Advertiser views incoming offers from publishers on their campaign.

**Elements**:
- **Campaign header card**:
  - Title + category badge
  - Budget: "80 TON per channel"
  - Deadline: "Mar 1, 2026 (24 days left)"
  - Status badge
  - "Edit" / "Pause" / "Delete" action buttons (icon row)
- **Creative preview**: Collapsible section showing the submitted ad content
- **Stats summary**: "15 offers received | 3 accepted | 2 live"
- **Incoming Offers section** (main content):
  - Tab filter: All Offers | Pending | Accepted | Declined
  - Each offer card shows:
    - Channel avatar + name + @username
    - Channel stats: "125K subs | 32K views | 25.9% eng"
    - Channel category badge
    - Channel rating: Stars
    - Offered format: "1/24" badge
    - Offered price: "95 TON" (publisher can propose their own price)
    - Two buttons: **"Accept" (green)** / **"Decline" (red outline)**
    - Tapping the channel name/avatar opens a mini channel detail view
  - Offers sorted by relevance (best match first)
- **Accepted Offers**: Shows deals that were accepted (links to Deal Detail screen)

---

### SCREEN 19: Publisher - Browse Campaigns

**Purpose**: Publishers discover ad campaigns that match their channel.

**Elements**:
- **Search bar** at top with filter icon
- **Filter panel** (slides up):
  - Category: Multi-select chips
  - Minimum budget: TON input ("Show campaigns offering at least X TON")
  - Format: Multi-select (1/24, 2/48, 3/72, Eternal)
  - "Apply Filters" button
- **Sort dropdown**: "Sort by" - Highest Budget, Newest, Ending Soon, Best Match
- **"Best match" indicator**: If publisher has a channel listed, campaigns are auto-sorted by relevance to their channel's category and stats
- **Campaign Cards** (vertical scroll):
  Each card shows:
  - Advertiser avatar + username (top left)
  - Campaign title (bold)
  - Category badge (e.g. "DeFi" chip)
  - Description preview (2 lines, truncated)
  - Budget: "80 TON per channel" (prominent, highlighted)
  - Accepted formats: Format badges (e.g. "1/24" "2/48")
  - Target: "10K+ subs | 5%+ eng"
  - Deadline: "Ends in 24 days"
  - Creative preview thumbnail (small image if campaign has media)
  - **"View & Offer" button**
- **Match indicator**: If a publisher's channel meets the campaign requirements, show a green "Your channel qualifies" badge on the card
- **Empty state**: "No campaigns match your filters" with illustration

---

### SCREEN 20: Publisher - Campaign Detail & Submit Offer

**Purpose**: Publisher views full campaign details and submits an offer.

**Elements**:
- **Campaign header**:
  - Advertiser avatar + username
  - Campaign title (large)
  - Category badge
  - "Posted 3 days ago | Ends in 24 days"
- **Description section**: Full campaign description text
- **Creative Preview section**:
  - Full ad content preview in message bubble style
  - Text content
  - Attached images (tappable to enlarge)
  - Any links/buttons
  - "This is what you'll post to your channel"
- **Requirements section**:
  - Budget: "80 TON per channel"
  - Accepted formats: 1/24, 2/48
  - Min subscribers: 10,000
  - Min engagement: 5%
  - Target regions: Global
  - Content guidelines: "Must include link button, pin for full duration"
- **Your Channel Match** (if publisher has a channel):
  - Card showing their channel stats vs requirements
  - Green checkmarks for met requirements, red X for unmet
  - e.g. "Subscribers: 125K (min 10K)" with green check
  - e.g. "Engagement: 25.9% (min 5%)" with green check
- **Submit Offer section** (sticky at bottom or card):
  - **Select channel**: Dropdown of publisher's listed channels (if multiple)
  - **Select format**: Radio buttons (only formats the campaign accepts)
  - **Your price**: TON input, pre-filled with campaign budget
    - Publisher can propose a different price (higher or lower)
    - Helper: "Campaign budget: 80 TON"
  - **Proposed date**: Date + time picker for when they'll post
  - **"Submit Offer" button** (full-width, prominent)
- **After submission**: Success state - "Offer submitted! You'll be notified when the advertiser responds."

---

### SCREEN 21: Publisher - My Offers

**Purpose**: Publisher tracks all offers they've submitted to campaigns.

**Elements**:
- **Tab filter**: Pending | Accepted | Declined
- **Offer Cards** (vertical list):
  Each card shows:
  - Campaign title
  - Advertiser avatar + username
  - Your channel: avatar + name
  - Format offered: "1/24" badge
  - Price offered: "95 TON"
  - Status badge:
    - PENDING (amber) - waiting for advertiser response
    - ACCEPTED (green) - advertiser accepted, proceed to deal
    - DECLINED (red) - advertiser chose another publisher
  - If ACCEPTED: "Go to Deal" button
- **Empty state**: "No offers yet. Browse campaigns and submit offers!"

---

### SCREEN 22: Deal Initiation from Campaign (Advertiser accepts offer)

**Purpose**: When an advertiser accepts a publisher's offer, the deal flow begins.

**Elements**:
- **Confirmation modal**:
  - "Accept this offer?"
  - Publisher's channel: Avatar + name + stats
  - Format: 1/24
  - Price: 95 TON
  - Platform fee (5%): 4.75 TON
  - **Total: 99.75 TON**
  - Escrow info: "Funds will be held in trustless escrow"
  - "Pay 99.75 TON to Escrow" button (triggers TON Connect)
  - "Cancel" link
- **After payment**: Deal is created, both parties redirected to Deal Detail screen
  - Creative is already submitted (was part of the campaign)
  - Publisher already knows the content to post
  - Flow continues from DEPOSITED → publisher posts → TEE verifies → settlement

---

## Component Library

Design these as reusable components:

### Cards
- **Channel Card** (for browse list): Avatar + name + stats row + price + CTA
- **Deal Card** (for deals list): Channel + format + amount + status badge
- **Stat Card** (small): Icon + number + label (e.g. eye icon + "32,450" + "Avg Views")
- **Price Card**: Format name + description + price input + toggle
- **Info Card**: Icon + title + description (for escrow info, tips, etc.)
- **Campaign Card** (for campaign browse): Title + category + budget + formats + deadline + CTA
- **Offer Card** (for offers list): Campaign title + channel + price + status
- **Review Card**: Avatar + name + stars + comment + date

### Badges & Chips
- **Status Badge**: Colored pill with text (DEPOSITED, POSTED, RELEASED, etc.)
- **Category Chip**: Rounded chip (Crypto, DeFi, Tech, etc.)
- **Role Badge**: Publisher / Advertiser indicator
- **Verified Badge**: Blue checkmark

### Inputs
- **Text Input**: Label + input field + helper text + error state
- **TON Amount Input**: Number input with "TON" suffix + USD equivalent below
- **Search Bar**: Search icon + input + filter button
- **Text Area**: Multi-line input for ad copy
- **Media Upload Zone**: Dashed border area + upload icon + "Tap to upload"
- **Date Picker**: Calendar popup
- **Time Picker**: Scrollable time selector

### Buttons
- **Primary Button**: Full-width, filled, prominent (for CTAs)
- **Secondary Button**: Outline style
- **Danger Button**: Red for destructive actions
- **Icon Button**: Circle with icon (edit, delete, copy)
- **Toggle**: On/off switch

### Navigation
- **Bottom Tab Bar**: 5 tabs with icons + labels
- **Top Bar**: Back arrow + title + action button
- **Progress Steps**: Horizontal step indicator (1/3, 2/3, 3/3)

### Feedback
- **Toast Notification**: Slide-in from top, auto-dismiss
- **Loading Spinner**: Circular, branded
- **Empty State**: Illustration + text + CTA button
- **Error State**: Warning icon + message + retry button
- **Success Animation**: Checkmark with confetti/pulse

### Data Visualization
- **Timeline** (vertical): Connected nodes showing deal progression
- **Progress Bar**: Horizontal bar showing time remaining
- **Mini Bar Chart**: For audience country breakdown
- **Sparkline**: Small inline chart for growth trends

---

## User Flows Summary

### Flow A: Publisher Lists Channel
```
Splash → Role Selection → Add Channel Step 1 (Connect)
→ Step 2 (Stats) → Step 3 (Pricing) → Pay 2 TON → Channel Listed → Dashboard
```

### Flow B: Advertiser Books Ad
```
Dashboard → Browse → Channel Detail → Book Ad Slot
→ Pay to Escrow → Booking Confirmed → Wait for Publisher → Deal Detail
```

### Flow C: Creative Approval Cycle
```
Deal Detail (Advertiser) → Submit Creative → Wait
→ Deal Detail (Publisher) → Review Creative → Approve / Request Changes
→ (If changes) → Advertiser revises → Resubmit → Publisher re-reviews
→ (If approved) → Ready for Posting
```

### Flow D: Posting & Settlement
```
Posting time arrives → Publisher gets reminder notification
→ Publisher posts ad to channel → Confirms in app (submits post ID)
→ TEE monitors post for duration → Duration ends
→ TEE verifies post still exists → Funds released to publisher
→ Both parties see completion screen → Leave reviews
```

### Flow E: Refund (Violation)
```
Ad is posted → Publisher removes/edits ad early
→ TEE detects content change or deletion during check
→ TEE refunds advertiser automatically
→ Both parties notified → Refund completion screen
```

### Flow F: Advertiser Creates Campaign (Reverse Direction)
```
Dashboard → My Campaigns → Create Campaign Step 1 (Details)
→ Step 2 (Creative & Content) → Step 3 (Budget & Requirements)
→ Publish Campaign → Campaign is live → Publishers can discover it
```

### Flow G: Publisher Discovers & Offers on Campaign
```
Dashboard → Browse Campaigns → View Campaign Detail
→ Review creative & requirements → Check "Your Channel Match"
→ Select channel + format + propose price → Submit Offer → Wait for response
```

### Flow H: Advertiser Accepts Publisher Offer → Deal
```
My Campaigns → Campaign Detail → View Incoming Offers
→ Review publisher's channel stats → Accept Offer
→ Pay to Escrow (TON Connect) → Deal Created
→ (Creative already provided in campaign, so skip creative submission)
→ Publisher posts at proposed date → TEE verifies → Settlement
```

---

## Design Notes

1. **Telegram Mini App Context**: The app opens inside Telegram, so respect the native feel. Use Telegram's back button behavior, consider the top bar space taken by Telegram's UI.

2. **TON Connect Integration**: Payment buttons should clearly indicate they'll open an external wallet app. Show wallet connection state in profile.

3. **Loading States**: Every action that talks to blockchain needs loading states. Transactions take 5-10 seconds. Show progress, not just spinners.

4. **Trust Indicators**: Throughout the app, subtly reinforce that escrow is trustless. Small shield icons, "Protected by TEE" badges, escrow balance indicators.

5. **Responsive Text**: TON amounts can be large numbers. Ensure number formatting handles "1,234,567.89 TON" without overflow.

6. **Dark Mode**: Design both light and dark variants. Telegram users often use dark mode. The dark variant should be the primary design.

7. **Empty States**: Every list/section needs an empty state design. First-time users will see many empty states.

8. **Error Recovery**: Every form needs error states. Every payment needs failure handling. Every network request needs timeout handling.

9. **Accessibility**: Minimum touch target 44x44px. Sufficient color contrast. Clear visual hierarchy.

10. **Animations**: Use subtle micro-interactions for state changes (status badge updates, payment confirmations, timeline progression). Keep animations under 300ms for responsiveness.

11. **Two-Sided Marketplace UX**: The app serves both directions equally. The bottom tab bar has separate tabs for "Channels" (advertiser browses publishers) and "Campaigns" (publisher browses advertiser requests). Both roles see both tabs, but the content is role-relevant. If a user is only a publisher, the "Channels" tab can show a prompt to "Switch to advertiser mode to browse channels". Same logic for the "Campaigns" tab if the user is only an advertiser.

12. **Campaign-First Advantage**: When a deal originates from a campaign, the creative is already provided upfront (it was part of the campaign creation). This means the creative approval step can be simplified or skipped - the publisher already saw the content before submitting their offer. Design the deal timeline to reflect this shorter flow.
