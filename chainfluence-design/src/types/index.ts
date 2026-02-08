// User roles and types
export type UserRole = 'publisher' | 'advertiser';

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  roles: UserRole[];
  walletAddress?: string;
  walletBalance: number;
  memberSince: string;
}

// Channel types
export type ChannelCategory = 'Crypto' | 'DeFi' | 'Tech' | 'News' | 'Education' | 'Entertainment' | 'Lifestyle' | 'Trading' | 'NFT' | 'Gaming';

export type AdFormat = '1/24' | '2/48' | '3/72' | 'eternal';

export interface FormatPricing {
  format: AdFormat;
  price: number;
  enabled: boolean;
  description: string;
}

export interface ChannelStats {
  subscribers: number;
  avgViews: number | null;
  engagement: number | null;
  postsPerWeek: number | null;
  audienceByCountry: { country: string; percentage: number }[];
  growth: number | null;
}

export interface Channel {
  id: string;
  username: string;
  name: string;
  avatar: string;
  category: ChannelCategory;
  stats: ChannelStats;
  pricing: FormatPricing[];
  rating: number;
  reviewCount: number;
  publisherId: string;
  verified: boolean;
}

// Campaign types
export interface Campaign {
  id: string;
  advertiserId: string;
  title: string;
  category: ChannelCategory;
  description: string;
  creativeText: string;
  creativeImages: string[];
  budgetPerChannel: number;
  totalBudget?: number;
  preferredFormats: AdFormat[];
  minSubscribers: number;
  minEngagement: number;
  preferredCategories: ChannelCategory[];
  preferredRegions: string[];
  deadline: string;
  status: 'active' | 'paused' | 'completed';
  offerCount: number;
  acceptedCount: number;
  liveCount: number;
  contentGuidelines?: string;
  createdAt: string;
}

// Deal types
export type DealStatus = 
  | 'DEPOSITED' 
  | 'ACCEPTED' 
  | 'CREATIVE_PENDING' 
  | 'CREATIVE_CHANGES_REQUESTED'
  | 'APPROVED' 
  | 'POSTED' 
  | 'RELEASED' 
  | 'REFUNDED' 
  | 'DISPUTED';

export interface DealTimeline {
  step: string;
  status: 'completed' | 'current' | 'future';
  timestamp?: string;
  details?: string;
}

export interface Deal {
  id: string;
  advertiserId: string;
  publisherId: string;
  channelId: string;
  campaignId?: string;
  format: AdFormat;
  amount: number;
  platformFee: number;
  totalAmount: number;
  scheduledDate: string;
  status: DealStatus;
  creativeText?: string;
  creativeImages?: string[];
  publisherFeedback?: string;
  postId?: string;
  escrowAddress: string;
  timeline: DealTimeline[];
  createdAt: string;
  completedAt?: string;
}

// Offer types
export type OfferStatus = 'pending' | 'accepted' | 'declined';

export interface Offer {
  id: string;
  campaignId: string;
  publisherId: string;
  channelId: string;
  format: AdFormat;
  price: number;
  proposedDate: string;
  status: OfferStatus;
  createdAt: string;
}

// Review types
export interface Review {
  id: string;
  dealId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

// Notification types
export type NotificationType = 
  | 'booking_request'
  | 'deposit_received'
  | 'deal_accepted'
  | 'deal_declined'
  | 'creative_submitted'
  | 'creative_approved'
  | 'creative_changes_requested'
  | 'posting_reminder'
  | 'post_verified'
  | 'funds_released'
  | 'funds_refunded'
  | 'dispute_opened'
  | 'campaign_offer'
  | 'offer_accepted'
  | 'offer_declined'
  | 'campaign_ending';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  relatedId?: string;
}

// Publisher stats
export interface PublisherStats {
  channelsListed: number;
  totalEarned: number;
  dealsCompleted: number;
  rating: number;
}

// Advertiser stats
export interface AdvertiserStats {
  totalSpent: number;
  dealsCompleted: number;
  campaignsCreated: number;
}
