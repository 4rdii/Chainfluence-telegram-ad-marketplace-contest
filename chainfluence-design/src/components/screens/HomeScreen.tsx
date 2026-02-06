import { Bell, TrendingUp, Clock, Coins } from 'lucide-react';
import { User, Deal, Notification, Channel } from '../../types';
import { mockChannels } from '../../lib/mock-data';
import { StatusBadge } from '../StatusBadge';

interface HomeScreenProps {
  user: User;
  deals: Deal[];
  notifications: Notification[];
  onNotificationClick: () => void;
  onDealClick: (deal: Deal) => void;
}

export function HomeScreen({ user, deals, notifications, onNotificationClick, onDealClick }: HomeScreenProps) {
  const unreadCount = notifications.filter(n => !n.read).length;
  const activeDeals = deals.filter(d => !['RELEASED', 'REFUNDED'].includes(d.status));
  const pendingActions = deals.filter(d => 
    d.status === 'CREATIVE_PENDING' || 
    d.status === 'CREATIVE_CHANGES_REQUESTED' ||
    d.status === 'DEPOSITED'
  );

  const totalEarned = deals
    .filter(d => d.status === 'RELEASED' && d.publisherId === user.id)
    .reduce((sum, d) => sum + (d.amount - d.platformFee), 0);

  const totalSpent = deals
    .filter(d => d.advertiserId === user.id)
    .reduce((sum, d) => sum + d.totalAmount, 0);

  const getChannelById = (channelId: string) => {
    return mockChannels.find(c => c.id === channelId);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <svg className="w-8 h-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <h1 className="text-xl font-semibold">Chainfluence</h1>
          </div>
          <button 
            onClick={onNotificationClick}
            className="relative p-2 hover:bg-accent rounded-lg transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-[var(--error-red)] text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">Trustless Telegram Advertising</p>
      </div>

      {/* Quick Stats */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--ton-blue)]/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-[var(--ton-blue)]" />
              </div>
            </div>
            <p className="text-2xl font-bold">{activeDeals.length}</p>
            <span className="text-xs text-muted-foreground">Active Deals</span>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[var(--pending-amber)]/15 flex items-center justify-center">
                <Clock className="w-4 h-4 text-[var(--pending-amber)]" />
              </div>
            </div>
            <p className="text-2xl font-bold">{pendingActions.length}</p>
            <span className="text-xs text-muted-foreground">Pending Actions</span>
          </div>

          {user.roles.includes('publisher') && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--success-green)]/15 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-[var(--success-green)]" />
                </div>
              </div>
              <p className="text-2xl font-bold">{totalEarned.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">TON</span></p>
              <span className="text-xs text-muted-foreground">Total Earned</span>
            </div>
          )}

          {user.roles.includes('advertiser') && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--ton-blue)]/15 flex items-center justify-center">
                  <Coins className="w-4 h-4 text-[var(--ton-blue)]" />
                </div>
              </div>
              <p className="text-2xl font-bold">{totalSpent.toFixed(1)} <span className="text-sm font-normal text-muted-foreground">TON</span></p>
              <span className="text-xs text-muted-foreground">Total Spent</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Required */}
      {pendingActions.length > 0 && (
        <div className="px-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Action Required</h2>
          <div className="space-y-3">
            {pendingActions.map((deal) => {
              const channel = getChannelById(deal.channelId);
              if (!channel) return null;

              return (
                <button
                  key={deal.id}
                  onClick={() => onDealClick(deal)}
                  className="w-full bg-card border border-[var(--pending-amber)]/30 rounded-xl p-4 hover:border-[var(--pending-amber)]/50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={channel.avatar}
                        alt={channel.name}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium">{channel.name}</span>
                    </div>
                    <StatusBadge status={deal.status} size="sm" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {deal.status === 'CREATIVE_PENDING' && deal.publisherId === user.id && 
                      'Review creative submission'}
                    {deal.status === 'CREATIVE_PENDING' && deal.advertiserId === user.id && 
                      'Waiting for publisher to review creative'}
                    {deal.status === 'CREATIVE_CHANGES_REQUESTED' && deal.advertiserId === user.id && 
                      'Publisher requested changes to creative'}
                    {deal.status === 'DEPOSITED' && deal.publisherId === user.id && 
                      'Accept or decline deal request'}
                  </p>
                  {(deal.status === 'CREATIVE_PENDING' && deal.publisherId === user.id) ||
                   (deal.status === 'CREATIVE_CHANGES_REQUESTED' && deal.advertiserId === user.id) ||
                   (deal.status === 'DEPOSITED' && deal.publisherId === user.id) ? (
                    <div className="inline-block px-3 py-1 bg-primary text-primary-foreground rounded-lg text-sm">
                      Take Action
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="px-4">
        <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>
        <div className="space-y-2">
          {notifications.slice(0, 5).map((notification) => {
            const getIcon = () => {
              if (notification.type === 'funds_released') return '🎉';
              if (notification.type === 'creative_submitted') return '📝';
              if (notification.type === 'post_verified') return '✅';
              if (notification.type === 'campaign_offer') return '💼';
              return '🔔';
            };

            const getColor = () => {
              if (notification.type === 'funds_released') return 'var(--success-green)';
              if (notification.type === 'creative_submitted' || notification.type === 'campaign_offer') return 'var(--pending-amber)';
              if (notification.type === 'post_verified') return 'var(--ton-blue)';
              return 'var(--muted-foreground)';
            };

            return (
              <div
                key={notification.id}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  notification.read ? 'bg-card/50' : 'bg-card'
                } border border-border`}
              >
                <div
                  className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                  style={{ backgroundColor: getColor() }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium mb-0.5">{notification.title}</p>
                  <p className="text-xs text-muted-foreground mb-1">{notification.body}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(notification.timestamp)}</p>
                </div>
                <span className="text-lg flex-shrink-0">{getIcon()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
