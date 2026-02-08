import { 
  Notification, 
  User, 
  Review, 
  Offer
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
