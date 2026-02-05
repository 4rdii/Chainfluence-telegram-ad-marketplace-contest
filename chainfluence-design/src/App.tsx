import { useState } from 'react';
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
import { 
  mockUser, 
  mockChannels, 
  mockCampaigns, 
  mockDeals, 
  mockNotifications,
  mockPublisherStats,
  mockAdvertiserStats
} from './lib/mock-data';
import { Channel, Campaign, Deal } from './types';

type Screen = 
  | { type: 'tab'; tab: TabType }
  | { type: 'channelDetail'; channel: Channel }
  | { type: 'campaignDetail'; campaign: Campaign }
  | { type: 'dealDetail'; deal: Deal }
  | { type: 'addChannel' }
  | { type: 'createCampaign' }
  | { type: 'notifications' };

export default function App() {
  const [screen, setScreen] = useState<Screen>({ type: 'tab', tab: 'home' });
  const [user] = useState(mockUser);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [channels] = useState(mockChannels);
  const [campaigns] = useState(mockCampaigns);
  const [deals] = useState(mockDeals);

  const unreadNotifications = notifications.filter(n => !n.read).length;

  const getUserRole = (): 'publisher' | 'advertiser' | 'both' => {
    if (user.roles.includes('publisher') && user.roles.includes('advertiser')) {
      return 'both';
    }
    return user.roles[0] as 'publisher' | 'advertiser';
  };

  const handleChannelClick = (channel: Channel) => {
    setScreen({ type: 'channelDetail', channel });
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setScreen({ type: 'campaignDetail', campaign });
  };

  const handleDealClick = (deal: Deal) => {
    setScreen({ type: 'dealDetail', deal });
  };

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
        setScreen({ type: 'dealDetail', deal });
        return;
      }
      const campaign = campaigns.find(c => c.id === notification.relatedId);
      if (campaign) {
        setScreen({ type: 'campaignDetail', campaign });
        return;
      }
    }
  };

  const handleCreateCampaign = () => {
    setScreen({ type: 'createCampaign' });
  };

  const handleAddChannel = () => {
    setScreen({ type: 'addChannel' });
  };

  const handleBackToTab = (tab: TabType = 'home') => {
    setScreen({ type: 'tab', tab });
  };

  const handleBookAdSlot = (channel: Channel) => {
    console.log('Book ad slot for:', channel);
    // In a real app, navigate to booking screen
  };

  const handleSubmitOffer = (channelId: string, format: string, price: number, date: string) => {
    console.log('Submit offer:', { channelId, format, price, date });
    // In a real app, submit to backend
  };

  const userChannels = channels.filter(c => c.publisherId === user.id);
  const activeTab = screen.type === 'tab' ? screen.tab : 'home';

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      {/* Main Content */}
      <div className="max-w-md mx-auto min-h-screen">
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

        {screen.type === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onBack={() => handleBackToTab('home')}
            onNotificationClick={handleNotificationItemClick}
            onMarkAllRead={handleMarkAllRead}
            onMarkRead={handleMarkRead}
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
    </div>
  );
}