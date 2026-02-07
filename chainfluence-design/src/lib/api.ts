// ── Backend response types (what the API actually returns) ──

export interface BackendUser {
  id: string;
  username: string | null;
  walletAddress: string | null;
  isPublisher: boolean;
  isAdvertiser: boolean;
  memberSince: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendChannel {
  id: string;
  ownerId: string;
  username: string | null;
  title: string | null;
  category: string | null;
  subscribers: number | null;
  avgViews: number | null;
  isVerified: boolean;
  isActive: boolean;
  statsUpdatedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendCampaign {
  id: number;
  advertiserId: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  budget: string | null;
  createdAt: string;
  updatedAt: string;
  offerCount?: number;
}

export interface BackendOffer {
  id: number;
  campaignId: number;
  publisherId: string;
  channelId: string;
  status: string;
  amount: string | null;
  format: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendDeal {
  id: number;
  dealId: number;
  verificationChatId: string;
  status: string;
  releasedAt: string | null;
  refundedAt: string | null;
  txHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BackendNotification {
  id: number;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface BackendReview {
  id: number;
  dealId: number;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

// ── Token management (in-memory for Telegram Mini App security) ──

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
}

export function getToken(): string | null {
  return accessToken;
}

// ── API client ──

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(
  path: string,
  options?: { method?: string; body?: unknown; isPublic?: boolean },
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!options?.isPublic && accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options?.method || 'GET',
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new ApiError(response.status, err.message || 'Request failed');
  }

  return response.json();
}

// ── Typed API methods ──

export const api = {
  auth: {
    login: (initData: string) =>
      apiFetch<{ access_token: string }>('/auth/login', {
        method: 'POST',
        body: { initData },
        isPublic: true,
      }),
  },

  users: {
    getMe: () => apiFetch<BackendUser>('/users/me'),

    updateMe: (data: { username?: string; isPublisher?: boolean; isAdvertiser?: boolean }) =>
      apiFetch<BackendUser>('/users/me', { method: 'PATCH', body: data }),

    updateWallet: (walletAddress: string) =>
      apiFetch<BackendUser>('/users/me/wallet', {
        method: 'PATCH',
        body: { walletAddress },
      }),
  },

  channels: {
    list: (category?: string) =>
      apiFetch<BackendChannel[]>(
        `/channels${category ? `?category=${encodeURIComponent(category)}` : ''}`,
        { isPublic: true },
      ),

    getMine: () => apiFetch<BackendChannel[]>('/channels/mine'),

    getById: (id: string) =>
      apiFetch<BackendChannel>(`/channels/${id}`, { isPublic: true }),

    create: (data: { channelId?: number; username?: string }) =>
      apiFetch<BackendChannel>('/channels', { method: 'POST', body: data }),

    update: (id: string, data: { title?: string; category?: string; isActive?: boolean }) =>
      apiFetch<BackendChannel>(`/channels/${id}`, { method: 'PATCH', body: data }),
  },

  campaigns: {
    list: (params?: { category?: string; status?: string; advertiserId?: string }) => {
      const query = new URLSearchParams();
      if (params?.category) query.set('category', params.category);
      if (params?.status) query.set('status', params.status);
      if (params?.advertiserId) query.set('advertiserId', params.advertiserId);
      const qs = query.toString();
      return apiFetch<BackendCampaign[]>(
        `/campaigns${qs ? `?${qs}` : ''}`,
        { isPublic: true },
      );
    },

    getById: (id: number) =>
      apiFetch<BackendCampaign>(`/campaigns/${id}`, { isPublic: true }),

    create: (data: { title: string; description?: string; category?: string; budget?: string }) =>
      apiFetch<BackendCampaign>('/campaigns', { method: 'POST', body: data }),

    update: (id: number, data: { title?: string; description?: string; category?: string; status?: string; budget?: string }) =>
      apiFetch<BackendCampaign>(`/campaigns/${id}`, { method: 'PATCH', body: data }),

    getOffers: (campaignId: number) =>
      apiFetch<BackendOffer[]>(`/campaigns/${campaignId}/offers`, { isPublic: true }),

    createOffer: (campaignId: number, data: { channelId: number; amount?: string; format?: string }) =>
      apiFetch<BackendOffer>(`/campaigns/${campaignId}/offers`, { method: 'POST', body: data }),
  },

  offers: {
    getMine: () => apiFetch<BackendOffer[]>('/offers/mine'),

    accept: (id: number) =>
      apiFetch<BackendOffer>(`/offers/${id}/accept`, { method: 'POST' }),

    reject: (id: number) =>
      apiFetch<BackendOffer>(`/offers/${id}/reject`, { method: 'POST' }),
  },

  deals: {
    list: () => apiFetch<BackendDeal[]>('/deals'),

    getById: (dealId: number) => apiFetch<BackendDeal>(`/deals/${dealId}`),

    register: (data: { dealId: number; verificationChatId: number }) =>
      apiFetch<BackendDeal>('/deals/register', { method: 'POST', body: data }),
  },

  reviews: {
    create: (dealId: number, data: { rating: number; comment?: string }) =>
      apiFetch<BackendReview>(`/deals/${dealId}/reviews`, { method: 'POST', body: data }),

    getByChannel: (channelId: string) =>
      apiFetch<BackendReview[]>(`/channels/${channelId}/reviews`, { isPublic: true }),
  },

  notifications: {
    list: () => apiFetch<BackendNotification[]>('/notifications'),

    markRead: (id: number) =>
      apiFetch<BackendNotification>(`/notifications/${id}/read`, { method: 'PATCH' }),

    markAllRead: () =>
      apiFetch<{ count: number }>('/notifications/read-all', { method: 'POST' }),
  },

  escrow: {
    createWallet: (dealId: number) =>
      apiFetch<{ address: string; publicKey: string }>('/escrow/create-wallet', {
        method: 'POST',
        body: { dealId },
      }),

    verifyAndRegister: (body: Record<string, unknown>) =>
      apiFetch<{ success: boolean; error?: string; txHash?: string }>(
        '/escrow/verify-and-register',
        { method: 'POST', body },
      ),
  },
};
