import { useState, useEffect } from 'react';
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
import { getTelegramUser, initTelegramWebApp, isRunningInTelegram, showBackButton, hideBackButton, hapticImpact } from './lib/telegram';

// Create user from Telegram data
function createUserFromTelegram(): User | null {
  const tgUser = getTelegramUser();
  if (!tgUser) return null;

  return {
    id: tgUser.id.toString(),
    username: tgUser.username ? `@${tgUser.username}` : `user_${tgUser.id}`,
    displayName: [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '),
    avatar: tgUser.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tgUser.first_name)}&background=0088CC&color=fff`,
    roles: [], // Will be set during onboarding
    walletBalance: 0,
    memberSince: '', // Backend will set this when user first registers
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
  const [user, setUser] = useState<User>(() => {
    // Try to get Telegram user on initial load
    const tgUser = createUserFromTelegram();
    return tgUser || mockUser;
  });
  const [notifications, setNotifications] = useState(mockNotifications);
  const [channels] = useState(mockChannels);
  const [campaigns, setCampaigns] = useState(mockCampaigns);
  const [deals] = useState(mockDeals);
  const [offers] = useState(mockOffers);
  const [paymentModal, setPaymentModal] = useState<{
    amount: number;
    escrowAddress: string;
    dealLabel: string;
  } | null>(null);

  // Initialize Telegram WebApp
  useEffect(() => {
    initTelegramWebApp();

    // If running in Telegram and no user yet, try to get user data
    if (isRunningInTelegram()) {
      const tgUser = createUserFromTelegram();
      if (tgUser) {
        setUser(prev => ({
          ...tgUser,
          roles: prev.roles, // Preserve roles if already set
        }));
      }
    }
  }, []);

  // Manage Telegram Back Button
  useEffect(() => {
    // Screens that should show the back button
    const screensWithBackButton = [
      'channelDetail',
      'campaignDetail',
      'dealDetail',
      'dealCompletion',
      'addChannel',
      'createCampaign',
      'notifications',
      'myCampaigns',
      'myOffers',
    ];

    if (screensWithBackButton.includes(screen.type)) {
      const handleBack = () => {
        hapticImpact('light');
        switch (screen.type) {
          case 'channelDetail':
            setScreen({ type: 'tab', tab: 'channels' });
            break;
          case 'campaignDetail':
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
          case 'createCampaign':
            setScreen({ type: 'tab', tab: 'campaigns' });
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

    // Cleanup: hide back button when component unmounts or screen changes
    return () => {
      hideBackButton();
    };
  }, [screen.type]);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getUserRole = (): 'publisher' | 'advertiser' | 'both' => {
    if (user.roles.includes('publisher') && user.roles.includes('advertiser')) {
      return 'both';
    }
    return user.roles[0] as 'publisher' | 'advertiser';
  };

  // Navigation handlers
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

  // Splash & onboarding
  const handleGetStarted = () => {
    setScreen({ type: 'roleSelection' });
  };

  const handleRoleSelected = (roles: UserRole[]) => {
    setUser(prev => ({ ...prev, roles }));
    setScreen({ type: 'tab', tab: 'home' });
  };

  // Notifications
  const handleNotificationClick = () => {
    setScreen({ type: 'notifications' });
  };

  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleMarkRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleNotificationItemClick = (notification: { relatedId?: string }) => {
    if (notification.relatedId) {
      const deal = deals.find(d => d.id === notification.relatedId);
      if (deal) {
        handleDealClick(deal);
        return;
      }
      const campaign = campaigns.find(c => c.id === notification.relatedId);
      if (campaign) {
        setScreen({ type: 'campaignDetail', campaign });
        return;
      }
    }
  };

  // Campaigns
  const handleCreateCampaign = () => {
    setScreen({ type: 'createCampaign' });
  };

  const handleMyCampaigns = () => {
    setScreen({ type: 'myCampaigns' });
  };

  const handlePauseCampaign = (campaignId: string) => {
    setCampaigns(prev =>
      prev.map(c => (c.id === campaignId ? { ...c, status: 'paused' as const } : c))
    );
  };

  const handleResumeCampaign = (campaignId: string) => {
    setCampaigns(prev =>
      prev.map(c => (c.id === campaignId ? { ...c, status: 'active' as const } : c))
    );
  };

  const handleDeleteCampaign = (campaignId: string) => {
    setCampaigns(prev => prev.filter(c => c.id !== campaignId));
  };

  // Offers
  const handleMyOffers = () => {
    setScreen({ type: 'myOffers' });
  };

  // Channel
  const handleAddChannel = () => {
    setScreen({ type: 'addChannel' });
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

  const handleSubmitOffer = (channelId: string, format: string, price: number, date: string) => {
    console.log('Submit offer:', { channelId, format, price, date });
  };

  // Deal completion
  const handleLeaveReview = (dealId: string, rating: number) => {
    console.log('Leave review for:', dealId, 'Rating:', rating);
    // In real app, send to backend
  };

  // Derived
  const userChannels = channels.filter(c => c.publisherId === user.id);
  const userCampaigns = campaigns.filter(c => c.advertiserId === user.id);
  const userOffers = offers.filter(o => o.publisherId === user.id);
  const activeTab = screen.type === 'tab' ? screen.tab : 'home';

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Main Content */}
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
            onComplete={() => handleBackToTab('profile')}
          />
        )}

        {screen.type === 'createCampaign' && (
          <CreateCampaignScreen
            onBack={() => handleBackToTab('campaigns')}
            onComplete={() => handleBackToTab('campaigns')}
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

      {/* Bottom Navigation - Only show on tab screens */}
      {screen.type === 'tab' && (
        <BottomNav
          activeTab={activeTab}
          onTabChange={(tab) => setScreen({ type: 'tab', tab })}
          notificationCount={unreadNotifications}
        />
      )}

      {/* Payment Modal Overlay */}
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
