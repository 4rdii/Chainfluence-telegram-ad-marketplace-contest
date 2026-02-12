import {
  api,
  type BackendUser,
  type BackendChannel,
  type BackendCampaign,
  type BackendOffer,
  type BackendDeal,
  type BackendNotification,
  type BackendReview,
} from './api';

import type {
  User,
  UserRole,
  Channel,
  ChannelCategory,
  FormatPricing,
  Campaign,
  Offer,
  OfferStatus,
  Deal,
  DealStatus,
  AdFormat,
  Notification,
  NotificationType,
  Review,
} from '../types';

import type { TelegramUser } from './telegram';

// ── User adapter ──

export function adaptUser(bu: BackendUser, tgUser: TelegramUser | null): User {
  const roles: UserRole[] = [];
  if (bu.isPublisher) roles.push('publisher');
  if (bu.isAdvertiser) roles.push('advertiser');

  const displayName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ')
    : bu.username || 'User';

  return {
    id: bu.id,
    username: bu.username ? `@${bu.username}` : `user_${bu.id}`,
    displayName,
    avatar:
      tgUser?.photo_url ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=0088CC&color=fff`,
    roles,
    walletAddress: bu.walletAddress ?? undefined,
    walletBalance: 0, // comes from blockchain, not backend
    memberSince: bu.memberSince || bu.createdAt,
  };
}

// ── Channel adapter ──

const DEFAULT_PRICING: FormatPricing[] = [
  { format: '1/24', price: 0, enabled: false, description: 'Pinned for 24 hours' },
  { format: '2/48', price: 0, enabled: false, description: 'Stay for 48 hours' },
  { format: '3/72', price: 0, enabled: false, description: 'Stay for 72 hours' },
  { format: 'eternal', price: 0, enabled: false, description: 'Permanent post' },
];

export function adaptChannel(bc: BackendChannel): Channel {
  const name = bc.title || bc.username || `Channel ${bc.id}`;
  const subscribers = bc.subscribers ?? 0;
  const avgViews = bc.avgViews ?? null;

  const pricing: FormatPricing[] =
    Array.isArray(bc.pricing) && bc.pricing.length > 0
      ? (bc.pricing as FormatPricing[])
      : DEFAULT_PRICING;

  return {
    id: bc.id,
    username: bc.username ? `@${bc.username}` : `channel_${bc.id}`,
    name,
    avatar: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(name)}`,
    category: (bc.category as ChannelCategory) || 'Crypto',
    stats: {
      subscribers,
      avgViews,
      engagement: subscribers > 0 && avgViews != null ? Math.min(100, Math.round((avgViews / subscribers) * 1000) / 10) : null,
      postsPerWeek: bc.postsPerWeek ?? null,
      audienceByCountry: [],
      growth: null,
    },
    pricing,
    rating: 0,
    reviewCount: 0,
    publisherId: bc.ownerId,
    verified: bc.isVerified,
  };
}

// ── Campaign adapter ──

export function adaptCampaign(bc: BackendCampaign): Campaign {
  const budget = bc.budget ? parseFloat(bc.budget) : 0;

  return {
    id: bc.id.toString(),
    advertiserId: bc.advertiserId,
    title: bc.title,
    category: (bc.category as ChannelCategory) || 'Crypto',
    description: bc.description || '',
    creativeText: bc.creativeText || '',
    creativeImages: Array.isArray(bc.creativeImages)
      ? bc.creativeImages.map((id) => api.uploads.getUrl(id))
      : [],
    budgetPerChannel: budget,
    totalBudget: budget || undefined,
    preferredFormats: Array.isArray(bc.preferredFormats) ? (bc.preferredFormats as AdFormat[]) : [],
    minSubscribers: bc.minSubscribers ?? 0,
    minEngagement: bc.minEngagement ?? 0,
    preferredCategories: Array.isArray(bc.preferredCategories) ? (bc.preferredCategories as ChannelCategory[]) : [],
    preferredRegions: [],
    deadline: bc.deadline || '',
    status: (bc.status as 'active' | 'paused' | 'completed') || 'active',
    offerCount: bc.offerCount ?? 0,
    acceptedCount: 0,
    liveCount: 0,
    createdAt: bc.createdAt,
  };
}

// ── Offer adapter ──

export function adaptOffer(bo: BackendOffer): Offer {
  return {
    id: bo.id.toString(),
    campaignId: bo.campaignId.toString(),
    publisherId: bo.publisherId,
    channelId: bo.channelId,
    format: (bo.format as AdFormat) || '1/24',
    price: bo.amount ? parseFloat(bo.amount) : 0,
    proposedDate: '',
    status: (bo.status as OfferStatus) || 'pending',
    createdAt: bo.createdAt,
  };
}

// ── Deal adapter ──

import type { DealTimeline } from '../types';

const dealStatusMap: Record<string, DealStatus> = {
  active: 'DEPOSITED',
  approved: 'APPROVED',
  rejected: 'REFUNDED',
  released: 'RELEASED',
  refunded: 'REFUNDED',
};

const durationToFormat: Record<number, AdFormat> = {
  86400: '1/24',
  172800: '2/48',
  259200: '3/72',
  0: 'eternal',
};

function buildTimeline(bd: BackendDeal, status: DealStatus): DealTimeline[] {
  const steps: DealTimeline[] = [];
  const hasCreative = !!bd.creativeText;
  const isApproved = status === 'APPROVED' || bd.publisherSigned || bd.advertiserSigned || bd.postId != null || status === 'RELEASED' || status === 'REFUNDED';
  const hasBothSigs = bd.publisherSigned && bd.advertiserSigned;
  const isPosted = bd.postId != null;
  const isFinal = status === 'RELEASED' || status === 'REFUNDED';

  // 1. Escrow Deposited
  steps.push({
    step: 'Escrow Deposited',
    status: 'completed',
    timestamp: bd.createdAt,
    details: bd.escrowAddress ? `Escrow: ${bd.escrowAddress.slice(0, 12)}...` : undefined,
  });

  // 2. Creative Submitted
  steps.push({
    step: 'Creative Submitted',
    status: hasCreative ? 'completed' : 'current',
    details: hasCreative ? 'Ad copy and media provided' : 'Waiting for advertiser to submit creative',
  });

  // 3. Channel Owner Approved (publisher signs)
  steps.push({
    step: 'Channel Owner Approved',
    status: bd.publisherSigned ? 'completed' : hasCreative ? 'current' : 'future',
    details: bd.publisherSigned
      ? 'Channel owner reviewed and signed'
      : hasCreative
        ? 'Waiting for channel owner to review'
        : undefined,
  });

  // 4. Advertiser Approved (advertiser signs)
  steps.push({
    step: 'Advertiser Approved',
    status: bd.advertiserSigned ? 'completed' : bd.publisherSigned ? 'current' : 'future',
    details: bd.advertiserSigned
      ? 'Advertiser reviewed and signed'
      : bd.publisherSigned
        ? 'Waiting for advertiser to approve'
        : undefined,
  });

  // 5. Ad Posted (auto-posted by backend)
  steps.push({
    step: 'Ad Posted',
    status: isPosted ? 'completed' : hasBothSigs ? 'current' : 'future',
    timestamp: bd.postedAt ? new Date(bd.postedAt * 1000).toISOString() : undefined,
    details: isPosted
      ? `Post ID: ${bd.postId}`
      : hasBothSigs
        ? 'Posting to channel...'
        : undefined,
  });

  // 6. Released / Refunded
  steps.push({
    step: status === 'REFUNDED' ? 'Funds Refunded' : 'Funds Released',
    status: isFinal ? 'completed' : 'future',
    timestamp: bd.releasedAt || bd.refundedAt || undefined,
    details: bd.txHash ? `TX: ${bd.txHash.slice(0, 16)}...` : undefined,
  });

  return steps;
}

export function adaptDeal(bd: BackendDeal): Deal {
  const amountTon = bd.amount ? Number(bd.amount) / 1_000_000_000 : 0;
  const fee = amountTon * 0.05;
  const status = dealStatusMap[bd.status] || 'DEPOSITED';
  const format = bd.duration != null ? (durationToFormat[bd.duration] || '1/24') : '1/24';

  return {
    id: bd.dealId.toString(),
    advertiserId: bd.advertiserId ?? '',
    publisherId: bd.publisherId ?? '',
    channelId: bd.channelId ?? '',
    format,
    amount: amountTon,
    platformFee: fee,
    totalAmount: amountTon,
    scheduledDate: bd.createdAt,
    status,
    escrowAddress: bd.escrowAddress ?? '',
    creativeText: bd.creativeText || undefined,
    creativeImages: Array.isArray(bd.creativeImages)
      ? bd.creativeImages.map((id) => api.uploads.getUrl(id))
      : undefined,
    timeline: buildTimeline(bd, status),
    createdAt: bd.createdAt,
    completedAt: bd.releasedAt || bd.refundedAt || undefined,
  };
}

// ── Notification adapter ──

export function adaptNotification(bn: BackendNotification): Notification {
  return {
    id: bn.id.toString(),
    type: bn.type as NotificationType,
    title: bn.title,
    body: bn.body || '',
    timestamp: bn.createdAt,
    read: bn.readAt !== null,
  };
}

// ── Review adapter ──

export function adaptReview(br: BackendReview): Review {
  return {
    id: br.id.toString(),
    dealId: br.dealId.toString(),
    reviewerId: br.reviewerId,
    reviewerName: 'User',
    reviewerAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${br.reviewerId}`,
    rating: br.rating,
    comment: br.comment || '',
    createdAt: br.createdAt,
  };
}
