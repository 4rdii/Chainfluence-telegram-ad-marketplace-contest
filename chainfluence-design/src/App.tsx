import { useState, useEffect, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { BottomNav, TabType } from './components/BottomNav';
import { HomeScreen } from './components/screens/HomeScreen';
import { ChannelsScreen } from './components/screens/ChannelsScreen';
import { CampaignsScreen } from './components/screens/CampaignsScreen';
import { DealsScreen } from './components/screens/DealsScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { ChannelDetailScreen } from './components/screens/ChannelDetailScreen';
import { CampaignDetailScreen } from './components/screens/CampaignDetailScreen';
import { DealDetailScreen } from './components/screens/DealDetailScreen';
import { AddChannelScreen } from './components/screens/AddChannelScreen';
import { CreateCampaignScreen } from './components/screens/CreateCampaignScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { SplashScreen } from './components/screens/SplashScreen';
import { RoleSelectionScreen } from './components/screens/RoleSelectionScreen';
import { MyCampaignsScreen } from './components/screens/MyCampaignsScreen';
import { MyOffersScreen } from './components/screens/MyOffersScreen';
import { DealCompletionScreen } from './components/screens/DealCompletionScreen';
import { PaymentModal } from './components/screens/PaymentModal';
import {
  mockUser,
  mockNotifications,
  mockOffers
} from './lib/mock-data';
import { Channel, Campaign, Deal, UserRole, User } from './types';
import { getTelegramUser, initTelegramWebApp, showBackButton, hideBackButton, hapticImpact } from './lib/telegram';
import { api } from './lib/api';
import { authenticateWithTelegram } from './lib/auth';
import { computeContentHash, signDealWithTonConnect, type DealParamsForSigning } from './lib/deal-signing';
import { adaptUser, adaptChannel, adaptCampaign, adaptDeal, adaptOffer, adaptNotification } from './lib/adapters';
import { DebugPanel } from './components/DebugPanel';
import { dlog } from './lib/debug-log';

// Fallback: create user from Telegram data (no backend)
function createUserFromTelegram(): User | null {
  const tgUser = getTelegramUser();
  if (!tgUser) return null;

  return {
    id: tgUser.id.toString(),
    username: tgUser.username ? `@${tgUser.username}` : `user_${tgUser.id}`,
    displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
    avatar: tgUser.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tgUser.first_name)}&background=0088CC&color=fff`,
    roles: [],
    walletBalance: 0,
    memberSince: '',
  };
}

type Screen =
  | { type: 'loading' }
  | { type: 'splash' }
  | { type: 'roleSelection' }
  | { type: 'tab'; tab: TabType }
  | { type: 'channelDetail'; channel: Channel }
  | { type: 'campaignDetail'; campaign: Campaign }
  | { type: 'dealDetail'; deal: Deal }
  | { type: 'dealCompletion'; deal: Deal }
  | { type: 'addChannel' }
  | { type: 'createCampaign' }
  | { type: 'notifications' }
  | { type: 'myCampaigns' }
  | { type: 'myOffers' };

export default function App() {
  const [tonConnectUI] = useTonConnectUI();
  const tonWallet = useTonWallet();

  const [screen, setScreen] = useState<Screen>({ type: 'loading' });
  const [user, setUser] = useState<User>(mockUser);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [offers, setOffers] = useState(mockOffers);
  const [paymentModal, setPaymentModal] = useState<{
    dealId: number;
    amount: number;
    escrowAddress: string;
    dealLabel: string;
  } | null>(null);

  // ── Data loaders ──

  const loadChannels = useCallback(async () => {
    try {
      const data = await api.channels.list();
      dlog.info(`Loaded ${data.length} channels`);
      let channels = data.map(adaptChannel);
      setChannels(channels);
      if (channels.length > 0) {
        const results = await Promise.allSettled(
          channels.map((c) => api.channels.getStats(c.id)),
        );
        channels = channels.map((ch, i) => {
          const r = results[i];
          if (r.status === 'fulfilled' && r.value) {
            const s = r.value;
            return {
              ...ch,
              stats: {
                ...ch.stats,
                subscribers: s.subscriberCount,
              },
            };
          }
          return ch;
        });
        setChannels(channels);
      }
    } catch (e) { dlog.warn('loadChannels failed:', e); }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await api.campaigns.list();
      dlog.info(`Loaded ${data.length} campaigns`);
      setCampaigns(data.map(adaptCampaign));
    } catch (e) { dlog.warn('loadCampaigns failed:', e); }
  }, []);

  const loadDeals = useCallback(async () => {
    try {
      const data = await api.deals.list();
      dlog.info(`Loaded ${data.length} deals`);
      setDeals(data.map(adaptDeal));
    } catch (e) { dlog.warn('loadDeals failed:', e); }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.list();
      dlog.info(`Loaded ${data.length} notifications`);
      if (data.length > 0) setNotifications(data.map(adaptNotification));
    } catch (e) { dlog.warn('loadNotifications failed:', e); }
  }, []);

  const loadOffers = useCallback(async () => {
    try {
      const data = await api.offers.getMine();
      dlog.info(`Loaded ${data.length} offers`);
      if (data.length > 0) setOffers(data.map(adaptOffer));
    } catch (e) { dlog.warn('loadOffers failed:', e); }
  }, []);

  // ── Boot sequence ──

  useEffect(() => {
    async function boot() {
      dlog.info('Boot: starting...');
      initTelegramWebApp();

      const tgUser = getTelegramUser();
      dlog.info('Boot: TG user =', tgUser ? `${tgUser.id} @${tgUser.username}` : 'null (not in TG)');

      // Step 1: Try to authenticate with backend
      dlog.info('Boot: authenticating...');
      const token = await authenticateWithTelegram();
      dlog.info('Boot: auth result =', token ? 'GOT TOKEN' : 'NO TOKEN');

      // Step 2: If authenticated, fetch user profile from backend
      let isReturningUser = false;
      if (token) {
        try {
          dlog.info('Boot: fetching user profile...');
          const backendUser = await api.users.getMe();
          dlog.info('Boot: user loaded, roles:', backendUser.isPublisher ? 'pub' : '', backendUser.isAdvertiser ? 'adv' : '');
          const adaptedUser = adaptUser(backendUser, tgUser);
          setUser(adaptedUser);
          isReturningUser = adaptedUser.roles.length > 0;
        } catch (e) {
          dlog.error('Boot: profile fetch failed:', e);
          const fallback = createUserFromTelegram();
          if (fallback) setUser(fallback);
        }
      } else {
        const fallback = createUserFromTelegram();
        if (fallback) setUser(fallback);
      }

      // Step 3: Load data (public endpoints don't need auth)
      dlog.info('Boot: loading public data...');
      await Promise.all([loadChannels(), loadCampaigns()]);

      // Step 4: Load authenticated data
      if (token) {
        dlog.info('Boot: loading authenticated data...');
        await Promise.all([loadDeals(), loadNotifications(), loadOffers()]);
      }

      // Step 5: Navigate — returning users go to home, new users see splash
      if (isReturningUser) {
        dlog.info('Boot: returning user, going to home');
        setScreen({ type: 'tab', tab: 'home' });
      } else {
        dlog.info('Boot: new user, showing splash');
        setScreen({ type: 'splash' });
      }

      dlog.info('Boot: complete');
    }

    boot();
  }, [loadChannels, loadCampaigns, loadDeals, loadNotifications, loadOffers]);

  // ── Telegram Back Button ──

  useEffect(() => {
    const screensWithBackButton = [
      'channelDetail', 'campaignDetail', 'dealDetail', 'dealCompletion',
      'addChannel', 'createCampaign', 'notifications', 'myCampaigns', 'myOffers',
    ];

    if (screensWithBackButton.includes(screen.type)) {
      const handleBack = () => {
        hapticImpact('light');
        switch (screen.type) {
          case 'channelDetail':
            setScreen({ type: 'tab', tab: 'channels' });
            break;
          case 'campaignDetail':
          case 'createCampaign':
            setScreen({ type: 'tab', tab: 'campaigns' });
            break;
          case 'dealDetail':
          case 'dealCompletion':
            setScreen({ type: 'tab', tab: 'deals' });
            break;
          case 'addChannel':
          case 'myCampaigns':
          case 'myOffers':
            setScreen({ type: 'tab', tab: 'profile' });
            break;
          case 'notifications':
            setScreen({ type: 'tab', tab: 'home' });
            break;
          default:
            setScreen({ type: 'tab', tab: 'home' });
        }
      };
      showBackButton(handleBack);
    } else {
      hideBackButton();
    }

    return () => { hideBackButton(); };
  }, [screen.type]);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getUserRole = (): 'publisher' | 'advertiser' | 'both' => {
    if (user.roles.includes('publisher') && user.roles.includes('advertiser')) return 'both';
    return user.roles[0] as 'publisher' | 'advertiser';
  };

  // ── Navigation handlers ──

  const handleChannelClick = (channel: Channel) => {
    setScreen({ type: 'channelDetail', channel });
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setScreen({ type: 'campaignDetail', campaign });
  };

  const handleDealClick = (deal: Deal) => {
    if (deal.status === 'RELEASED' || deal.status === 'REFUNDED') {
      setScreen({ type: 'dealCompletion', deal });
    } else {
      setScreen({ type: 'dealDetail', deal });
    }
  };

  const handleBackToTab = (tab: TabType = 'home') => {
    setScreen({ type: 'tab', tab });
  };

  // ── Splash & onboarding ──

  const handleGetStarted = () => {
    setScreen({ type: 'roleSelection' });
  };

  const handleRoleSelected = async (roles: UserRole[]) => {
    setUser(prev => ({ ...prev, roles }));
    setScreen({ type: 'tab', tab: 'home' });

    // Sync roles to backend
    try {
      await api.users.updateMe({
        isPublisher: roles.includes('publisher'),
        isAdvertiser: roles.includes('advertiser'),
      });
    } catch {
      console.error('Failed to sync roles to backend');
    }
  };

  // ── Notifications ──

  const handleNotificationClick = () => {
    setScreen({ type: 'notifications' });
  };

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await api.notifications.markAllRead(); } catch { /* optimistic */ }
  };

  const handleMarkRead = async (id: string) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    try { await api.notifications.markRead(parseInt(id)); } catch { /* optimistic */ }
  };

  const handleNotificationItemClick = (notification: { relatedId?: string }) => {
    if (notification.relatedId) {
      const deal = deals.find(d => d.id === notification.relatedId);
      if (deal) { handleDealClick(deal); return; }
      const campaign = campaigns.find(c => c.id === notification.relatedId);
      if (campaign) { setScreen({ type: 'campaignDetail', campaign }); return; }
    }
  };

  // ── Campaigns ──

  const handleCreateCampaign = () => {
    setScreen({ type: 'createCampaign' });
  };

  const handleMyCampaigns = () => {
    setScreen({ type: 'myCampaigns' });
  };

  const handlePauseCampaign = async (campaignId: string) => {
    setCampaigns(prev => prev.map(c => (c.id === campaignId ? { ...c, status: 'paused' as const } : c)));
    try { await api.campaigns.update(parseInt(campaignId), { status: 'paused' }); } catch { /* optimistic */ }
  };

  const handleResumeCampaign = async (campaignId: string) => {
    setCampaigns(prev => prev.map(c => (c.id === campaignId ? { ...c, status: 'active' as const } : c)));
    try { await api.campaigns.update(parseInt(campaignId), { status: 'active' }); } catch { /* optimistic */ }
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    // Backend doesn't have a delete endpoint — just remove locally
  };

  // ── Offers ──

  const handleMyOffers = () => {
    setScreen({ type: 'myOffers' });
  };

  // ── Channels ──

  const handleAddChannel = () => {
    setScreen({ type: 'addChannel' });
  };

  const handleAddPublisherRole = async () => {
    try {
      await api.users.updateMe({ isPublisher: true, isAdvertiser: user.roles.includes('advertiser') });
      setUser(prev => ({
        ...prev,
        roles: [...new Set([...prev.roles, 'publisher'])],
      }));
      dlog.info('Added publisher role');
    } catch (e) {
      dlog.error('Failed to add publisher role:', e);
    }
  };

  const handleAddChannelComplete = async () => {
    // Refresh channels from backend after adding
    await loadChannels();
    handleBackToTab('profile');
  };

  const handleDeleteChannel = async (channelId: string) => {
    dlog.info('handleDeleteChannel called', { channelId });
    
    // Use Telegram's showConfirm if available, otherwise fallback to browser confirm
    const webApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
    
    if (webApp?.showConfirm) {
      // Use Telegram's native confirmation dialog
      webApp.showConfirm('Are you sure you want to delete this channel?', (confirmed: boolean) => {
        dlog.info('Telegram confirm dialog result:', confirmed);
        if (confirmed) {
          performDelete(channelId);
        }
      });
    } else {
      // Fallback to browser confirm (for testing outside Telegram)
      const confirmed = window.confirm('Are you sure you want to delete this channel?');
      dlog.info('Browser confirm dialog result:', confirmed);
      if (confirmed) {
        performDelete(channelId);
      }
    }
  };

  const performDelete = async (channelId: string) => {
    dlog.info(`Deleting channel: ${channelId}`);
    
    try {
      const result = await api.channels.delete(channelId);
      dlog.info('Delete API response:', result);
      
      // Remove channel from state
      setChannels(prev => {
        const filtered = prev.filter(c => c.id !== channelId);
        dlog.info(`Channel deleted. Remaining channels: ${filtered.length}`);
        return filtered;
      });
      
      dlog.info('Channel deleted successfully');
      
      // Show success feedback
      const webApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
      if (webApp?.showAlert) {
        webApp.showAlert('Channel deleted successfully');
      }
    } catch (e) {
      dlog.error('Failed to delete channel:', e);
      
      let errorMessage = 'Unknown error';
      if (e instanceof Error) {
        errorMessage = e.message;
      } else if (typeof e === 'string') {
        errorMessage = e;
      } else {
        errorMessage = JSON.stringify(e);
      }
      
      // Show error feedback
      const webApp = typeof window !== 'undefined' && window.Telegram?.WebApp;
      if (webApp?.showAlert) {
        webApp.showAlert(`Failed to delete channel: ${errorMessage}`);
      } else {
        alert(`Failed to delete channel:\n${errorMessage}`);
      }
    }
  };

  const handleBookAdSlot = async (channel: Channel) => {
    const cheapest = channel.pricing.find(p => p.enabled);
    if (!cheapest) return;

    const fee = cheapest.price * 0.05;
    const totalAmount = cheapest.price + fee;

    // Generate a deal ID (in production, the backend assigns this)
    const dealId = Date.now() % 1_000_000;

    try {
      // Request an escrow wallet address from the TEE via the backend
      const { address } = await api.escrow.createWallet(dealId);

      // Compute content hash from the creative text
      const contentText = ''; // Creative not yet known at booking time
      const contentHashStr = await computeContentHash(contentText);

      // Map format → duration
      const formatDurations: Record<string, number> = {
        '1/24': 86400, '2/48': 172800, '3/72': 259200, 'eternal': 0,
      };
      const duration = formatDurations[cheapest.format] || 86400;
      const amountNano = Math.floor(totalAmount * 1_000_000_000).toString();

      // Get the advertiser's connected wallet address
      const advertiserWallet = tonWallet?.account?.address
        ? tonWallet.account.address
        : undefined;

      // Register the deal in the backend with escrow data + wallet addresses
      await api.deals.register({
        dealId,
        verificationChatId: parseInt(channel.id, 10),
        publisherId: parseInt(channel.publisherId, 10),
        advertiserId: parseInt(user.id, 10),
        channelId: parseInt(channel.id, 10),
        escrowAddress: address,
        amount: amountNano,
        duration,
        contentHash: contentHashStr,
        advertiserWallet,
      });

      setPaymentModal({
        dealId,
        amount: totalAmount,
        escrowAddress: address,
        dealLabel: `${channel.name} - ${cheapest.format}`,
      });
    } catch (error) {
      console.error('Failed to create escrow wallet:', error);
    }
  };

  const handleSubmitOffer = async (channelId: string, format: string, price: number, _date: string) => {
    try {
      // Find the campaign this offer is for (from current screen)
      const campaignId = screen.type === 'campaignDetail' ? parseInt(screen.campaign.id) : 0;
      if (campaignId) {
        await api.campaigns.createOffer(campaignId, {
          channelId: parseInt(channelId),
          amount: price.toString(),
          format,
        });
        await loadOffers();
      }
    } catch {
      console.error('Failed to submit offer');
    }
  };

  // ── Payment & Escrow flow ──

  /**
   * Helper: build deal params for TonConnect signing from a backend deal.
   * postId and postedAt are NOT included — they aren't part of the signed cell.
   */
  const buildSignableParams = (bd: {
    dealId: number;
    channelId: string | null;
    contentHash: string | null;
    duration: number | null;
    publisherWallet: string | null;
    advertiserWallet: string | null;
    amount: string | null;
  }): DealParamsForSigning => {
    if (!bd.amount || !bd.contentHash || !bd.channelId) {
      throw new Error('Deal is missing required fields (amount, contentHash, or channelId)');
    }
    if (!bd.publisherWallet || !bd.advertiserWallet) {
      throw new Error('Deal is missing wallet addresses. Both parties must connect their wallets.');
    }

    return {
      dealId: bd.dealId,
      channelId: parseInt(bd.channelId, 10),
      contentHash: bd.contentHash,
      duration: bd.duration ?? 86400,
      publisher: bd.publisherWallet,
      advertiser: bd.advertiserWallet,
      amount: bd.amount,
    };
  };

  /**
   * Helper: prompt user to sign deal params via TonConnect and submit to backend.
   * Returns the backend response (which may include teeResult if TEE was triggered).
   */
  const signAndSubmitDeal = async (
    dealId: number,
    role: 'publisher' | 'advertiser',
    dealParams: DealParamsForSigning,
  ) => {
    const signResult = await signDealWithTonConnect(tonConnectUI, dealParams);

    return api.escrow.signDeal({
      dealId,
      role,
      signature: signResult.signature,
      publicKey: signResult.publicKey,
      walletAddress: tonWallet?.account?.address ?? '',
      timestamp: signResult.timestamp,
      domain: signResult.domain,
    });
  };

  /**
   * Called after the advertiser's deposit TX has been submitted.
   *
   * Since postId/postedAt are NOT part of the signed cell, the
   * advertiser can sign immediately after depositing.
   */
  const handlePaymentSent = async (dealId: number) => {
    console.log(`Payment sent for dealId=${dealId}. Prompting advertiser to sign…`);

    try {
      const backendDeal = await api.deals.getById(dealId);
      const dealParams = buildSignableParams(backendDeal);
      await signAndSubmitDeal(dealId, 'advertiser', dealParams);
      console.log(`Advertiser signature submitted for dealId=${dealId}`);
    } catch (error) {
      console.error('Failed to sign deal as advertiser:', error);
    }

    await loadDeals();
  };

  /**
   * Called when the publisher confirms they have posted the ad.
   *
   * The publisher should have already signed the deal (at deal acceptance).
   * This just submits the post link. The backend sets postId/postedAt and
   * auto-triggers TEE if both signatures are present.
   *
   * If the publisher hasn't signed yet, we prompt them to sign here too.
   */
  const handleConfirmPosted = async (deal: Deal, postLink: string) => {
    const dealId = parseInt(deal.id, 10);

    // Check if publisher has already signed; if not, sign now
    const backendDeal = await api.deals.getById(dealId);
    if (!backendDeal.publisherSigned) {
      const dealParams = buildSignableParams(backendDeal);
      await signAndSubmitDeal(dealId, 'publisher', dealParams);
    }

    // Submit post link → backend sets postId/postedAt + may trigger TEE
    const result = await api.escrow.confirmPosted({ dealId, postLink });

    if (result.teeResult && !result.teeResult.success) {
      throw new Error(result.teeResult.error || 'TEE verification failed');
    }

    await loadDeals();
  };

  // ── Deal completion ──

  const handleLeaveReview = async (dealId: string, rating: number) => {
    try {
      await api.reviews.create(parseInt(dealId), { rating });
    } catch {
      console.error('Failed to submit review');
    }
  };

  // ── Campaign creation complete ──

  const handleCreateCampaignComplete = async () => {
    await loadCampaigns();
    handleBackToTab('campaigns');
  };

  // ── Derived ──

  const userChannels = channels.filter(c => c.publisherId === user.id);
  const userCampaigns = campaigns.filter(c => c.advertiserId === user.id);
  const userOffers = offers.filter(o => o.publisherId === user.id);
  const activeTab = screen.type === 'tab' ? screen.tab : 'home';

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto min-h-screen">
        {/* Loading */}
        {screen.type === 'loading' && (
          <div className="flex flex-col items-center justify-center min-h-screen gap-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Loading...</p>
          </div>
        )}

        {/* Onboarding */}
        {screen.type === 'splash' && (
          <SplashScreen onGetStarted={handleGetStarted} />
        )}

        {screen.type === 'roleSelection' && (
          <RoleSelectionScreen user={user} onComplete={handleRoleSelected} />
        )}

        {/* Main tabs */}
        {screen.type === 'tab' && screen.tab === 'home' && (
          <HomeScreen
            user={user}
            deals={deals}
            notifications={notifications}
            channels={channels}
            onNotificationClick={handleNotificationClick}
            onDealClick={handleDealClick}
          />
        )}

        {screen.type === 'tab' && screen.tab === 'channels' && (
          <ChannelsScreen
            channels={channels}
            onChannelClick={handleChannelClick}
          />
        )}

        {screen.type === 'tab' && screen.tab === 'campaigns' && (
          <CampaignsScreen
            campaigns={campaigns}
            onCampaignClick={handleCampaignClick}
            onCreateCampaign={handleCreateCampaign}
            userRole={getUserRole()}
          />
        )}

        {screen.type === 'tab' && screen.tab === 'deals' && (
          <DealsScreen
            deals={deals}
            channels={channels}
            onDealClick={handleDealClick}
          />
        )}

        {screen.type === 'tab' && screen.tab === 'profile' && (
          <ProfileScreen
            user={user}
            publisherStats={user.roles.includes('publisher') ? {
              channelsListed: channels.filter(c => c.publisherId === user.id).length,
              totalEarned: deals.filter(d => d.status === 'RELEASED' && d.publisherId === user.id).reduce((s, d) => s + (d.amount - d.platformFee), 0),
              dealsCompleted: deals.filter(d => ['RELEASED', 'REFUNDED'].includes(d.status) && d.publisherId === user.id).length,
              rating: 0,
            } : undefined}
            advertiserStats={user.roles.includes('advertiser') ? {
              totalSpent: deals.filter(d => d.status === 'RELEASED' && d.advertiserId === user.id).reduce((s, d) => s + d.totalAmount, 0),
              dealsCompleted: deals.filter(d => ['RELEASED', 'REFUNDED'].includes(d.status) && d.advertiserId === user.id).length,
              campaignsCreated: campaigns.filter(c => c.advertiserId === user.id).length,
            } : undefined}
            channels={channels}
            onAddChannel={handleAddChannel}
            onAddPublisherRole={handleAddPublisherRole}
            onDeleteChannel={handleDeleteChannel}
          />
        )}

        {/* Detail screens */}
        {screen.type === 'channelDetail' && (
          <ChannelDetailScreen
            channel={screen.channel}
            onBack={() => handleBackToTab('channels')}
            onBookAdSlot={handleBookAdSlot}
          />
        )}

        {screen.type === 'campaignDetail' && (
          <CampaignDetailScreen
            campaign={screen.campaign}
            userChannels={userChannels}
            onBack={() => handleBackToTab('campaigns')}
            onSubmitOffer={handleSubmitOffer}
          />
        )}

        {screen.type === 'dealDetail' && (
          <DealDetailScreen
            deal={screen.deal}
            channel={channels.find(c => c.id === screen.deal.channelId)!}
            user={user}
            onBack={() => handleBackToTab('deals')}
            onConfirmPosted={handleConfirmPosted}
          />
        )}

        {screen.type === 'dealCompletion' && (
          <DealCompletionScreen
            deal={screen.deal}
            channel={channels.find(c => c.id === screen.deal.channelId)!}
            onBack={() => handleBackToTab('deals')}
            onLeaveReview={handleLeaveReview}
            onBackToDeals={() => handleBackToTab('deals')}
          />
        )}

        {/* Creation flows */}
        {screen.type === 'addChannel' && (
          <AddChannelScreen
            onBack={() => handleBackToTab('profile')}
            onComplete={handleAddChannelComplete}
          />
        )}

        {screen.type === 'createCampaign' && (
          <CreateCampaignScreen
            onBack={() => handleBackToTab('campaigns')}
            onComplete={handleCreateCampaignComplete}
          />
        )}

        {/* Notifications */}
        {screen.type === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onBack={() => handleBackToTab('home')}
            onNotificationClick={handleNotificationItemClick}
            onMarkAllRead={handleMarkAllRead}
            onMarkRead={handleMarkRead}
          />
        )}

        {/* My Campaigns (advertiser) */}
        {screen.type === 'myCampaigns' && (
          <MyCampaignsScreen
            campaigns={userCampaigns}
            onBack={() => handleBackToTab('profile')}
            onCampaignClick={handleCampaignClick}
            onCreateCampaign={handleCreateCampaign}
            onPause={handlePauseCampaign}
            onResume={handleResumeCampaign}
            onDelete={handleDeleteCampaign}
          />
        )}

        {/* My Offers (publisher) */}
        {screen.type === 'myOffers' && (
          <MyOffersScreen
            offers={userOffers}
            campaigns={campaigns}
            channels={channels}
            onBack={() => handleBackToTab('profile')}
            onOfferClick={(offer) => {
              const campaign = campaigns.find(c => c.id === offer.campaignId);
              if (campaign) setScreen({ type: 'campaignDetail', campaign });
            }}
          />
        )}
      </div>

      {/* Bottom Navigation */}
      {screen.type === 'tab' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setScreen({ type: 'tab', tab })}
          notificationCount={unreadNotifications}
        />
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <PaymentModal
          dealId={paymentModal.dealId}
          amount={paymentModal.amount}
          escrowAddress={paymentModal.escrowAddress}
          dealLabel={paymentModal.dealLabel}
          onPaymentSent={handlePaymentSent}
          onConfirm={() => setPaymentModal(null)}
          onClose={() => setPaymentModal(null)}
        />
      )}

      {/* Debug panel — tap the bug button to see logs */}
      <DebugPanel />
    </div>
  );
}
