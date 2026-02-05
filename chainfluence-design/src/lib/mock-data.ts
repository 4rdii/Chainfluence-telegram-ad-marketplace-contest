import { 
  Channel, 
  Campaign, 
  Deal, 
  Notification, 
  User, 
  Review, 
  Offer,
  PublisherStats,
  AdvertiserStats 
} from '../types';

export const mockUser: User = {
  id: 'user1',
  username: '@crypto_enthusiast',
  displayName: 'Alex Chen',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
  roles: ['publisher', 'advertiser'],
  walletAddress: 'UQC0CO7RjXK4E...',
  walletBalance: 342.5,
  memberSince: '2025-12-01'
};

export const mockChannels: Channel[] = [
  {
    id: 'ch1',
    username: '@cryptonews_daily',
    name: 'CryptoNews Daily',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=CryptoNews',
    category: 'Crypto',
    stats: {
      subscribers: 125230,
      avgViews: 32450,
      engagement: 25.9,
      postsPerWeek: 14,
      audienceByCountry: [
        { country: 'US', percentage: 35 },
        { country: 'UK', percentage: 15 },
        { country: 'DE', percentage: 12 },
        { country: 'Other', percentage: 38 }
      ],
      growth: 2.3
    },
    pricing: [
      { format: '1/24', price: 120, enabled: true, description: 'Pinned for 24 hours' },
      { format: '2/48', price: 85, enabled: true, description: 'Stay for 48 hours' },
      { format: '3/72', price: 65, enabled: true, description: 'Stay for 72 hours' },
      { format: 'eternal', price: 200, enabled: true, description: 'Permanent post' }
    ],
    rating: 4.8,
    reviewCount: 23,
    publisherId: 'pub1',
    verified: true
  },
  {
    id: 'ch2',
    username: '@defi_insights',
    name: 'DeFi Insights',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=DeFi',
    category: 'DeFi',
    stats: {
      subscribers: 89450,
      avgViews: 28120,
      engagement: 31.5,
      postsPerWeek: 10,
      audienceByCountry: [
        { country: 'US', percentage: 42 },
        { country: 'SG', percentage: 18 },
        { country: 'JP', percentage: 15 },
        { country: 'Other', percentage: 25 }
      ],
      growth: 5.8
    },
    pricing: [
      { format: '1/24', price: 95, enabled: true, description: 'Pinned for 24 hours' },
      { format: '2/48', price: 70, enabled: true, description: 'Stay for 48 hours' },
      { format: '3/72', price: 55, enabled: false, description: 'Stay for 72 hours' },
      { format: 'eternal', price: 180, enabled: true, description: 'Permanent post' }
    ],
    rating: 4.9,
    reviewCount: 31,
    publisherId: 'pub2',
    verified: true
  },
  {
    id: 'ch3',
    username: '@nft_marketplace_updates',
    name: 'NFT Marketplace Updates',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=NFT',
    category: 'NFT',
    stats: {
      subscribers: 56780,
      avgViews: 18920,
      engagement: 33.4,
      postsPerWeek: 21,
      audienceByCountry: [
        { country: 'US', percentage: 38 },
        { country: 'UK', percentage: 22 },
        { country: 'CA', percentage: 12 },
        { country: 'Other', percentage: 28 }
      ],
      growth: 8.1
    },
    pricing: [
      { format: '1/24', price: 75, enabled: true, description: 'Pinned for 24 hours' },
      { format: '2/48', price: 55, enabled: true, description: 'Stay for 48 hours' },
      { format: '3/72', price: 45, enabled: true, description: 'Stay for 72 hours' },
      { format: 'eternal', price: 150, enabled: false, description: 'Permanent post' }
    ],
    rating: 4.6,
    reviewCount: 17,
    publisherId: 'pub3',
    verified: false
  }
];

export const mockCampaigns: Campaign[] = [
  {
    id: 'camp1',
    advertiserId: 'adv1',
    title: 'TonSwap DEX Launch Promo',
    category: 'DeFi',
    description: 'Promote our new decentralized exchange on TON blockchain. Looking for channels with engaged crypto audiences who are interested in DeFi and trading.',
    creativeText: '🚀 TonSwap is LIVE! Trade crypto with ZERO fees for the first 30 days!\n\n✅ Lightning-fast swaps\n✅ Best rates on TON\n✅ Earn rewards as LP\n\nStart trading now 👇',
    creativeImages: ['https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800'],
    budgetPerChannel: 80,
    totalBudget: 1000,
    preferredFormats: ['1/24', '2/48'],
    minSubscribers: 10000,
    minEngagement: 5,
    preferredCategories: ['Crypto', 'DeFi', 'Trading'],
    preferredRegions: ['Global'],
    deadline: '2026-03-01',
    status: 'active',
    offerCount: 12,
    acceptedCount: 3,
    liveCount: 2,
    contentGuidelines: 'Must include link button and pin for full duration. No edits to copy.',
    createdAt: '2026-02-02'
  },
  {
    id: 'camp2',
    advertiserId: 'adv2',
    title: 'Crypto Trading Course Launch',
    category: 'Education',
    description: 'We are launching a comprehensive crypto trading course and looking for channels to promote it. Perfect for channels with audiences interested in learning about crypto trading.',
    creativeText: '📚 Master Crypto Trading in 30 Days!\n\nLearn from pros:\n• Technical analysis\n• Risk management\n• DeFi strategies\n\n50% OFF early bird special!\nEnroll now: [link]',
    creativeImages: ['https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800'],
    budgetPerChannel: 60,
    preferredFormats: ['2/48', '3/72'],
    minSubscribers: 5000,
    minEngagement: 10,
    preferredCategories: ['Crypto', 'Education', 'Trading'],
    preferredRegions: ['Global'],
    deadline: '2026-02-20',
    status: 'active',
    offerCount: 8,
    acceptedCount: 1,
    liveCount: 1,
    createdAt: '2026-01-28'
  },
  {
    id: 'camp3',
    advertiserId: 'user1',
    title: 'NFT Collection Mint Announcement',
    category: 'NFT',
    description: 'Announcing our exclusive NFT collection launch. Looking for NFT and art-focused channels with highly engaged communities.',
    creativeText: '🎨 Exclusive NFT Drop Alert!\n\nUnique AI-generated art collection\n• Only 1000 pieces\n• Minting Feb 15\n• Whitelist spots available\n\nJoin the community 👇',
    creativeImages: ['https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800'],
    budgetPerChannel: 100,
    totalBudget: 500,
    preferredFormats: ['1/24'],
    minSubscribers: 15000,
    minEngagement: 8,
    preferredCategories: ['NFT', 'Crypto'],
    preferredRegions: ['Global'],
    deadline: '2026-02-14',
    status: 'active',
    offerCount: 15,
    acceptedCount: 2,
    liveCount: 0,
    contentGuidelines: 'Pin to top for 24 hours. Include all images.',
    createdAt: '2026-02-01'
  }
];

export const mockDeals: Deal[] = [
  {
    id: 'deal1',
    advertiserId: 'adv1',
    publisherId: 'user1',
    channelId: 'ch1',
    format: '1/24',
    amount: 120,
    platformFee: 6,
    totalAmount: 126,
    scheduledDate: '2026-02-15T14:00:00Z',
    status: 'CREATIVE_PENDING',
    escrowAddress: 'UQC0CO7RjXK4E8ngGJJnTon...',
    timeline: [
      { step: 'Deal Created', status: 'completed', timestamp: '2026-02-10T14:00:00Z' },
      { step: 'Deposit Received', status: 'completed', timestamp: '2026-02-10T14:05:00Z', details: '126 TON' },
      { step: 'Deal Accepted', status: 'completed', timestamp: '2026-02-10T15:30:00Z' },
      { step: 'Creative Submitted', status: 'current', timestamp: '2026-02-11T09:00:00Z' },
      { step: 'Creative Approved', status: 'future' },
      { step: 'Ad Posted', status: 'future' },
      { step: 'Verified & Released', status: 'future' }
    ],
    creativeText: '🚀 Amazing crypto project launching soon! Don\'t miss out on early access.',
    creativeImages: ['https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800'],
    createdAt: '2026-02-10T14:00:00Z'
  },
  {
    id: 'deal2',
    advertiserId: 'user1',
    publisherId: 'pub2',
    channelId: 'ch2',
    campaignId: 'camp1',
    format: '2/48',
    amount: 70,
    platformFee: 3.5,
    totalAmount: 73.5,
    scheduledDate: '2026-02-12T10:00:00Z',
    status: 'POSTED',
    escrowAddress: 'UQC0CO7RjXK4E8ngGJJnTon...',
    timeline: [
      { step: 'Deal Created', status: 'completed', timestamp: '2026-02-08T12:00:00Z' },
      { step: 'Deposit Received', status: 'completed', timestamp: '2026-02-08T12:05:00Z', details: '73.5 TON' },
      { step: 'Deal Accepted', status: 'completed', timestamp: '2026-02-08T13:00:00Z' },
      { step: 'Creative Approved', status: 'completed', timestamp: '2026-02-08T13:00:00Z', details: 'From campaign' },
      { step: 'Ad Posted', status: 'current', timestamp: '2026-02-12T10:15:00Z' },
      { step: 'Verified & Released', status: 'future' }
    ],
    creativeText: '🚀 TonSwap is LIVE! Trade crypto with ZERO fees for the first 30 days!',
    creativeImages: ['https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800'],
    postId: 'https://t.me/defi_insights/1234',
    createdAt: '2026-02-08T12:00:00Z'
  },
  {
    id: 'deal3',
    advertiserId: 'adv3',
    publisherId: 'user1',
    channelId: 'ch3',
    format: '1/24',
    amount: 75,
    platformFee: 3.75,
    totalAmount: 78.75,
    scheduledDate: '2026-02-05T16:00:00Z',
    status: 'RELEASED',
    escrowAddress: 'UQC0CO7RjXK4E8ngGJJnTon...',
    timeline: [
      { step: 'Deal Created', status: 'completed', timestamp: '2026-02-03T10:00:00Z' },
      { step: 'Deposit Received', status: 'completed', timestamp: '2026-02-03T10:05:00Z', details: '78.75 TON' },
      { step: 'Deal Accepted', status: 'completed', timestamp: '2026-02-03T11:00:00Z' },
      { step: 'Creative Submitted', status: 'completed', timestamp: '2026-02-03T14:00:00Z' },
      { step: 'Creative Approved', status: 'completed', timestamp: '2026-02-03T15:00:00Z' },
      { step: 'Ad Posted', status: 'completed', timestamp: '2026-02-05T16:10:00Z' },
      { step: 'Verified & Released', status: 'completed', timestamp: '2026-02-06T16:15:00Z', details: '71.25 TON to publisher' }
    ],
    creativeText: 'Check out this amazing NFT collection!',
    creativeImages: [],
    postId: 'https://t.me/nft_marketplace_updates/567',
    createdAt: '2026-02-03T10:00:00Z',
    completedAt: '2026-02-06T16:15:00Z'
  }
];

export const mockOffers: Offer[] = [
  {
    id: 'offer1',
    campaignId: 'camp1',
    publisherId: 'user1',
    channelId: 'ch1',
    format: '1/24',
    price: 95,
    proposedDate: '2026-02-16T14:00:00Z',
    status: 'pending',
    createdAt: '2026-02-11T10:00:00Z'
  },
  {
    id: 'offer2',
    campaignId: 'camp1',
    publisherId: 'pub2',
    channelId: 'ch2',
    format: '2/48',
    price: 70,
    proposedDate: '2026-02-12T10:00:00Z',
    status: 'accepted',
    createdAt: '2026-02-08T11:00:00Z'
  },
  {
    id: 'offer3',
    campaignId: 'camp2',
    publisherId: 'user1',
    channelId: 'ch3',
    format: '3/72',
    price: 55,
    proposedDate: '2026-02-18T12:00:00Z',
    status: 'declined',
    createdAt: '2026-02-09T15:00:00Z'
  }
];

export const mockNotifications: Notification[] = [
  {
    id: 'notif1',
    type: 'creative_submitted',
    title: 'Creative Submitted',
    body: 'Deal #deal1 - Advertiser submitted ad creative for review.',
    timestamp: '2026-02-05T09:00:00Z',
    read: false,
    relatedId: 'deal1'
  },
  {
    id: 'notif3',
    type: 'campaign_offer',
    title: 'New Offer on Your Campaign',
    body: 'CryptoNews Daily offered to post your TonSwap DEX Launch ad for 95 TON.',
    timestamp: '2026-02-05T07:30:00Z',
    read: false,
    relatedId: 'camp1'
  },
  {
    id: 'notif4',
    type: 'post_verified',
    title: 'Post Verified',
    body: 'Deal #deal2 - Ad post has been verified and is live on DeFi Insights.',
    timestamp: '2026-02-05T06:20:00Z',
    read: false,
    relatedId: 'deal2'
  },
  {
    id: 'notif5',
    type: 'posting_reminder',
    title: 'Posting Reminder',
    body: 'Deal #deal1 - Scheduled to post in 2 hours on CryptoNews Daily.',
    timestamp: '2026-02-04T18:00:00Z',
    read: true,
    relatedId: 'deal1'
  },
  {
    id: 'notif6',
    type: 'deposit_received',
    title: 'Deposit Received',
    body: '126 TON deposited to escrow for Deal #deal1 with CryptoNews Daily.',
    timestamp: '2026-02-04T14:05:00Z',
    read: true,
    relatedId: 'deal1'
  },
  {
    id: 'notif7',
    type: 'offer_accepted',
    title: 'Offer Accepted!',
    body: 'Your offer to post on DeFi Insights was accepted. Deal created.',
    timestamp: '2026-02-04T13:00:00Z',
    read: true,
    relatedId: 'deal2'
  },
  {
    id: 'notif2',
    type: 'funds_released',
    title: 'Funds Released!',
    body: 'Deal #deal3 completed. 71.25 TON sent to your wallet.',
    timestamp: '2026-02-03T16:15:00Z',
    read: true,
    relatedId: 'deal3'
  },
  {
    id: 'notif8',
    type: 'campaign_ending',
    title: 'Campaign Ending Soon',
    body: 'Your NFT Collection Mint campaign expires in 3 days. 15 offers pending.',
    timestamp: '2026-02-03T10:00:00Z',
    read: true,
    relatedId: 'camp3'
  },
  {
    id: 'notif9',
    type: 'creative_approved',
    title: 'Creative Approved',
    body: 'Publisher approved your ad creative for Deal #deal3. Ready for posting.',
    timestamp: '2026-02-02T15:00:00Z',
    read: true,
    relatedId: 'deal3'
  },
  {
    id: 'notif10',
    type: 'booking_request',
    title: 'New Booking Request',
    body: 'New ad booking request for CryptoNews Daily - 1/24 format, 120 TON.',
    timestamp: '2026-02-01T11:00:00Z',
    read: true,
    relatedId: 'deal1'
  }
];

export const mockReviews: Review[] = [
  {
    id: 'rev1',
    dealId: 'deal3',
    reviewerId: 'adv3',
    reviewerName: 'Sarah M.',
    reviewerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    rating: 5,
    comment: 'Great engagement, ad performed well! Publisher was very professional.',
    createdAt: '2026-02-07T10:00:00Z'
  },
  {
    id: 'rev2',
    dealId: 'deal_old1',
    reviewerId: 'adv4',
    reviewerName: 'Mike Johnson',
    reviewerAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    rating: 4,
    comment: 'Good results, would work with again.',
    createdAt: '2026-01-25T14:00:00Z'
  }
];

export const mockPublisherStats: PublisherStats = {
  channelsListed: 2,
  totalEarned: 1240,
  dealsCompleted: 18,
  rating: 4.8
};

export const mockAdvertiserStats: AdvertiserStats = {
  totalSpent: 890,
  dealsCompleted: 12,
  campaignsCreated: 3
};
