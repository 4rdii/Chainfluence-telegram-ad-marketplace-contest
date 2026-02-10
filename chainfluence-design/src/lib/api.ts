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
  publisherId: string;
  advertiserId: string;
  channelId: string | null;
  verificationChatId: string;
  status: string;
  escrowAddress: string | null;
  amount: string | null;
  duration: number | null;
  contentHash: string | null;
  postId: number | null;
  postedAt: number | null;
  publisherWallet: string | null;
  advertiserWallet: string | null;
  publisherSigned: boolean;
  advertiserSigned: boolean;
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

// ── TEE / Escrow types ──

/** Per-party TonConnect signData metadata */
export interface PartySignMeta {
  /** Hex-encoded ed25519 signature */
  signature: string;
  /** Hex-encoded ed25519 public key */
  publicKey: string;
  /** signData envelope timestamp (unix seconds) */
  timestamp: number;
  /** signData envelope domain (dApp domain) */
  domain: string;
}

/** Deal parameters matching the TEE's expected DealParams shape */
export interface VerifyAndRegisterParams {
  dealId: number;
  channelId: number;
  postId: number;
  /** SHA-256 content hash as BigInt-compatible string (e.g. "0xabc..." or decimal) */
  contentHash: string;
  /** Duration in seconds */
  duration: number;
  /** Publisher's real TON wallet address */
  publisher: string;
  /** Advertiser's real TON wallet address */
  advertiser: string;
  /** Amount in nanoTON as string for BigInt precision */
  amount: string;
  /** Unix timestamp when the ad was posted */
  postedAt: number;
}

/** Full payload for POST /escrow/verify-and-register */
export interface VerifyAndRegisterPayload {
  params: VerifyAndRegisterParams;
  verificationChatId: number;
  publisher: PartySignMeta;
  advertiser: PartySignMeta;
  /** Telegram user ID of the publisher (backend-only, for DB) */
  publisherId: number;
  /** Telegram user ID of the advertiser (backend-only, for DB) */
  advertiserId: number;
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

import { dlog } from './debug-log';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.PROD ? 'https://debazaar.click/v1' : 'http://localhost:3000/v1');

dlog.info('API_BASE_URL =', API_BASE_URL);

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
  const method = options?.method || 'GET';
  const url = `${API_BASE_URL}${path}`;
  
  dlog.info(`${method} ${path}`);
  dlog.info(`  → Full URL: ${url}`);

  if (options?.body !== undefined) {
    const payload = typeof options.body === 'object' ? JSON.stringify(options.body) : String(options.body);
    dlog.info(`  → Payload length: ${payload.length} bytes`);
    dlog.info(`  → Payload preview: ${payload.length > 300 ? payload.slice(0, 300) + '...' : payload}`);
  } else if (path.includes('?')) {
    dlog.info(`  → Query string: ${path.split('?')[1]}`);
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const withAuth = !options?.isPublic && !!accessToken;
  if (withAuth) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  
  dlog.info(`  → Headers:`, JSON.stringify(headers, null, 2));
  dlog.info(`  → Auth: ${withAuth ? 'yes (Bearer token)' : 'no (public endpoint)'}`);

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
    credentials: 'include', // Include credentials for CORS
  };
  
  dlog.info(`  → Fetch options:`, {
    method: fetchOptions.method,
    headers: fetchOptions.headers,
    hasBody: !!fetchOptions.body,
    bodyLength: fetchOptions.body ? String(fetchOptions.body).length : 0,
    credentials: fetchOptions.credentials,
  });

  try {
    dlog.info(`  → Starting fetch request...`);
    dlog.info(`  → Browser origin: ${window.location.origin}`);
    dlog.info(`  → Browser user agent: ${navigator.userAgent.substring(0, 100)}`);
    const startTime = Date.now();
    
    const response = await fetch(url, fetchOptions);
    const duration = Date.now() - startTime;
    
    dlog.info(`  → Fetch completed in ${duration}ms`);
    dlog.info(`  → Response status: ${response.status} ${response.statusText}`);
    dlog.info(`  → Response headers:`, Object.fromEntries(response.headers.entries()));
    dlog.info(`  → Response ok: ${response.ok}`);
    dlog.info(`  → Response type: ${response.type}`);
    dlog.info(`  → Response url: ${response.url}`);

    if (!response.ok) {
      let errorBody: any = {};
      try {
        const text = await response.text();
        dlog.error(`  → Error response body (raw): ${text.substring(0, 500)}`);
        errorBody = text ? JSON.parse(text) : {};
      } catch (parseErr) {
        dlog.error(`  → Failed to parse error response as JSON`);
      }
      
      const msg = errorBody.message || `${response.status} ${response.statusText}`;
      dlog.error(`${method} ${path} → ${response.status}: ${msg}`);
      throw new ApiError(response.status, msg);
    }

    const data = await response.json();
    dlog.info(`${method} ${path} → ${response.status} OK (${duration}ms)`);
    return data as T;
  } catch (e) {
    // Re-throw ApiError as-is
    if (e instanceof ApiError) {
      throw e;
    }
    
    // Enhanced error logging
    const errorDetails: any = {
      name: (e as Error).name,
      message: (e as Error).message,
      stack: (e as Error).stack,
    };
    
    // Check if it's a network error
    if (e instanceof TypeError) {
      errorDetails.type = 'TypeError';
      errorDetails.isNetworkError = true;
      if ((e as TypeError).message.includes('fetch')) {
        errorDetails.subtype = 'fetch_failed';
      }
      if ((e as TypeError).message.includes('Load failed')) {
        errorDetails.subtype = 'load_failed';
        errorDetails.possibleCauses = [
          'CORS preflight (OPTIONS) failed - backend not allowing this origin',
          'CORS headers missing or incorrect in backend response',
          'Backend CORS not configured or backend not restarted after CORS changes',
          'SSL certificate issue',
          'Network connectivity problem',
          'Request blocked by browser security policy',
        ];
        errorDetails.browserOrigin = window.location.origin;
        errorDetails.telegramWebApp = typeof window.Telegram !== 'undefined' ? 'yes' : 'no';
      }
    }
    
    // Try to detect CORS-specific errors
    if (e instanceof TypeError && (e as TypeError).message.includes('Load failed')) {
      dlog.error(`  → CORS DIAGNOSIS:`);
      dlog.error(`     - This is likely a CORS preflight failure`);
      dlog.error(`     - Browser origin: ${window.location.origin}`);
      dlog.error(`     - Backend URL: ${url}`);
      dlog.error(`     - Check: Backend must allow origin "${window.location.origin}"`);
      dlog.error(`     - Check: Backend must respond to OPTIONS requests with proper CORS headers`);
      dlog.error(`     - Check: Backend was restarted after adding CORS configuration`);
      dlog.error(`     - Check: Backend CORS must include credentials: true`);
    }
    
    dlog.error(`${method} ${path} → NETWORK ERROR`);
    dlog.error(`  → Error details:`, errorDetails);
    dlog.error(`  → Full error object:`, e);
    dlog.error(`  → URL attempted: ${url}`);
    dlog.error(`  → Request method: ${method}`);
    dlog.error(`  → Request headers sent:`, headers);
    
    // Wrap network errors
    throw new Error(`Network error: ${e instanceof Error ? e.message : String(e)}`);
  }
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

    /** Fetch channel stats from GramJS (subscribers only for now). Persists to DB. Public channels only. */
    getStats: (id: string) =>
      apiFetch<{ channelId: string; username: string; subscriberCount: number }>(`/channels/${id}/stats`, { isPublic: true }),

    /** Resolve username to channelId via Telegram API. Call before create when you only have username. */
    resolve: (username: string) =>
      apiFetch<{ channelId: number; title: string | null; username: string | null }>(
        `/channels/resolve?username=${encodeURIComponent(username.replace(/^@/, ''))}`,
      ),

    create: (data: { channelId?: number; username?: string }) =>
      apiFetch<BackendChannel>('/channels', { method: 'POST', body: data }),

    update: (id: string, data: { title?: string; category?: string; isActive?: boolean }) =>
      apiFetch<BackendChannel>(`/channels/${id}`, { method: 'PATCH', body: data }),

    delete: (id: string) =>
      apiFetch<{ message: string }>(`/channels/${id}`, { method: 'DELETE' }),
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

    register: (data: {
      dealId: number;
      verificationChatId: number;
      publisherId?: number;
      advertiserId?: number;
      channelId?: number;
      escrowAddress?: string;
      amount?: string;
      duration?: number;
      contentHash?: string;
      publisherWallet?: string;
      advertiserWallet?: string;
    }) =>
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

    /** Submit TonConnect signData signature for a deal party.
     *  Auto-triggers TEE when both signatures + post info are present. */
    signDeal: (data: {
      dealId: number;
      role: 'publisher' | 'advertiser';
      signature: string;
      publicKey: string;
      walletAddress: string;
      timestamp: number;
      domain: string;
    }) =>
      apiFetch<{
        deal: BackendDeal;
        teeResult?: { success: boolean; error?: string; txHash?: string };
      }>('/escrow/sign-deal', {
        method: 'POST',
        body: data,
      }),

    /** Publisher confirms the ad was posted (sets postId/postedAt).
     *  Auto-triggers TEE if both signatures already exist. */
    confirmPosted: (data: { dealId: number; postLink: string }) =>
      apiFetch<{
        deal: BackendDeal;
        teeResult?: { success: boolean; error?: string; txHash?: string };
      }>(
        '/escrow/confirm-posted',
        { method: 'POST', body: data },
      ),

    /** Direct pass-through to TEE (when all data is available client-side) */
    verifyAndRegister: (payload: VerifyAndRegisterPayload) =>
      apiFetch<{ success: boolean; error?: string; txHash?: string }>(
        '/escrow/verify-and-register',
        { method: 'POST', body: payload },
      ),
  },
};
