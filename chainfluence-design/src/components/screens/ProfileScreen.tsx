import { User, PublisherStats, AdvertiserStats, Channel } from '../../types';
import { TrendingUp, DollarSign, Star, Award } from 'lucide-react';
import { Button } from '../ui/button';
import { WalletButton } from '../WalletButton';

interface ProfileScreenProps {
  user: User;
  publisherStats?: PublisherStats;
  advertiserStats?: AdvertiserStats;
  channels: Channel[];
  onAddChannel: () => void;
  onAddPublisherRole?: () => void;
}

export function ProfileScreen({ user, publisherStats, advertiserStats, channels, onAddChannel, onAddPublisherRole }: ProfileScreenProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  };

  const userChannels = channels.filter(c => c.publisherId === user.id);

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-6">
        <div className="flex items-start gap-4 mb-4">
          <img
            src={user.avatar}
            alt={user.displayName}
            className="w-20 h-20 rounded-full bg-muted"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold mb-1">{user.displayName}</h1>
            <p className="text-muted-foreground mb-2">{user.username}</p>
            {user.memberSince && (
              <p className="text-sm text-muted-foreground">
                Member since {formatDate(user.memberSince)}
              </p>
            )}
          </div>
        </div>

        {/* Role badges */}
        <div className="flex gap-2">
          {user.roles.includes('publisher') && (
            <span className="px-3 py-1 bg-[var(--ton-blue)]/20 text-[var(--ton-blue)] rounded-full text-sm border border-[var(--ton-blue)]/30">
              Publisher
            </span>
          )}
          {user.roles.includes('advertiser') && (
            <span className="px-3 py-1 bg-[var(--success-green)]/20 text-[var(--success-green)] rounded-full text-sm border border-[var(--success-green)]/30">
              Advertiser
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Wallet Section */}
        <WalletButton />

        {/* Publisher Stats */}
        {user.roles.includes('publisher') && publisherStats && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Publisher Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-[var(--ton-blue)]" />
                  <span className="text-xs text-muted-foreground">Channels Listed</span>
                </div>
                <p className="text-2xl font-semibold">{publisherStats.channelsListed}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-[var(--success-green)]" />
                  <span className="text-xs text-muted-foreground">Total Earned</span>
                </div>
                <p className="text-2xl font-semibold">{publisherStats.totalEarned} <span className="text-sm text-muted-foreground">TON</span></p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[var(--ton-blue)]" />
                  <span className="text-xs text-muted-foreground">Deals Completed</span>
                </div>
                <p className="text-2xl font-semibold">{publisherStats.dealsCompleted}</p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Rating</span>
                </div>
                <p className="text-2xl font-semibold">{publisherStats.rating} / 5</p>
              </div>
            </div>
          </div>
        )}

        {/* Advertiser Stats */}
        {user.roles.includes('advertiser') && advertiserStats && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-4">Advertiser Stats</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="w-4 h-4 text-[var(--ton-blue)]" />
                  <span className="text-xs text-muted-foreground">Total Spent</span>
                </div>
                <p className="text-2xl font-semibold">{advertiserStats.totalSpent} <span className="text-sm text-muted-foreground">TON</span></p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[var(--success-green)]" />
                  <span className="text-xs text-muted-foreground">Deals Completed</span>
                </div>
                <p className="text-2xl font-semibold">{advertiserStats.dealsCompleted}</p>
              </div>
              <div className="col-span-2">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-[var(--ton-blue)]" />
                  <span className="text-xs text-muted-foreground">Campaigns Created</span>
                </div>
                <p className="text-2xl font-semibold">{advertiserStats.campaignsCreated}</p>
              </div>
            </div>
          </div>
        )}

        {/* My Channels — only for publishers */}
        {user.roles.includes('publisher') ? (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">My Channels</h2>
              <Button
                size="sm"
                onClick={onAddChannel}
                className="bg-primary text-primary-foreground"
              >
                Add Channel
              </Button>
            </div>

            {userChannels.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No channels listed yet
              </p>
            ) : (
              <div className="space-y-3">
                {userChannels.map((channel) => (
                  <div key={channel.id} className="flex items-center gap-3 p-3 bg-background rounded-lg">
                    <img
                      src={channel.avatar}
                      alt={channel.name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{channel.name}</h3>
                      <p className="text-sm text-muted-foreground">{channel.username}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Subscribers</p>
                      <p className="font-medium">{channel.stats.subscribers >= 1000 ? `${(channel.stats.subscribers / 1000).toFixed(0)}K` : channel.stats.subscribers}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : onAddPublisherRole ? (
          <div className="bg-card border border-border rounded-xl p-4">
            <h2 className="font-semibold mb-2">List Your Channels</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Add the Publisher role to list your Telegram channels and earn from advertisers.
            </p>
            <Button
              size="sm"
              onClick={onAddPublisherRole}
              className="bg-[var(--ton-blue)] text-white"
            >
              Add Publisher Role
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
