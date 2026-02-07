import { useState, useEffect, useCallback } from 'react';
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
  mockChannels,
  mockCampaigns,
  mockDeals,
  mockNotifications,
  mockOffers,
  mockPublisherStats,
  mockAdvertiserStats
} from './lib/mock-data';
import { Channel, Campaign, Deal, UserRole, User } from './types';
import { getTelegramUser, initTelegramWebApp, showBackButton, hideBackButton, hapticImpact } from './lib/telegram';
import { api } from './lib/api';
import { authenticateWithTelegram } from './lib/auth';
import { adaptUser, adaptChannel, adaptCampaign, adaptDeal, adaptOffer, adaptNotification } from './lib/adapters';

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
  const [screen, setScreen] = useState<Screen>({ type: 'splash' });
  const [user, setUser] = useState<User>(mockUser);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [channels, setChannels] = useState(mockChannels);
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [deals, setDeals] = useState(mockDeals);
  const [offers, setOffers] = useState(mockOffers);
  const [paymentModal, setPaymentModal] = useState<{
    amount: number;
    escrowAddress: string;
    dealLabel: string;
  } | null>(null);

  // ── Data loaders ──

  const loadChannels = useCallback(async () => {
    try {
      const data = await api.channels.list();
      if (data.length > 0) setChannels(data.map(adaptChannel));
    } catch { /* keep mock data */ }
  }, []);

  const loadCampaigns = useCallback(async () => {
    try {
      const data = await api.campaigns.list();
      if (data.length > 0) setCampaigns(data.map(adaptCampaign));
    } catch { /* keep mock data */ }
  }, []);

  const loadDeals = useCallback(async () => {
    try {
      const data = await api.deals.list();
      if (data.length > 0) setDeals(data.map(adaptDeal));
    } catch { /* keep mock data */ }
  }, []);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await api.notifications.list();
      if (data.length > 0) setNotifications(data.map(adaptNotification));
    } catch { /* keep mock data */ }
  }, []);

  const loadOffers = useCallback(async () => {
    try {
      const data = await api.offers.getMine();
      if (data.length > 0) setOffers(data.map(adaptOffer));
    } catch { /* keep mock data */ }
  }, []);

  // ── Boot sequence ──

  useEffect(() => {
    async function boot() {
      initTelegramWebApp();

      // Step 1: Try to authenticate with backend
      const token = await authenticateWithTelegram();

      // Step 2: If authenticated, fetch user profile from backend
      if (token) {
        try {
          const backendUser = await api.users.getMe();
          const tgUser = getTelegramUser();
          const adaptedUser = adaptUser(backendUser, tgUser);
          setUser(adaptedUser);

          // If user already has roles, skip onboarding
          if (adaptedUser.roles.length > 0) {
            setScreen({ type: 'tab', tab: 'home' });
          }
        } catch {
          // Backend fetch failed — fall back to Telegram data
          const tgUser = createUserFromTelegram();
          if (tgUser) setUser(tgUser);
        }
      } else {
        // Not in Telegram or auth failed — use Telegram data or mock
        const tgUser = createUserFromTelegram();
        if (tgUser) setUser(tgUser);
      }

      // Step 3: Load data (public endpoints don't need auth)
      await Promise.all([loadChannels(), loadCampaigns()]);

      // Step 4: Load authenticated data
      if (token) {
        await Promise.all([loadDeals(), loadNotifications(), loadOffers()]);
      }
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

  const handleAddChannelComplete = async () => {
    // Refresh channels from backend after adding
    await loadChannels();
    handleBackToTab('profile');
  };

  const handleBookAdSlot = (channel: Channel) => {
    const cheapest = channel.pricing.find(p => p.enabled);
    if (cheapest) {
      const fee = cheapest.price * 0.05;
      setPaymentModal({
        amount: cheapest.price + fee,
        escrowAddress: 'UQC0CO7RjXK4E8ngGJJnTon...',
        dealLabel: `${channel.name} - ${cheapest.format}`,
      });
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
            publisherStats={user.roles.includes('publisher') ? mockPublisherStats : undefined}
            advertiserStats={user.roles.includes('advertiser') ? mockAdvertiserStats : undefined}
            channels={channels}
            onAddChannel={handleAddChannel}
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
          amount={paymentModal.amount}
          escrowAddress={paymentModal.escrowAddress}
          dealLabel={paymentModal.dealLabel}
          onConfirm={() => setPaymentModal(null)}
          onClose={() => setPaymentModal(null)}
        />
      )}
    </div>
  );
}
