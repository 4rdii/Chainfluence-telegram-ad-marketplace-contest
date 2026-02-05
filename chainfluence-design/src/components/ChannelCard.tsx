import { Channel } from '../types';
import { CategoryChip } from './CategoryChip';
import { Eye, Users, TrendingUp } from 'lucide-react';
import { Button } from './ui/button';

interface ChannelCardProps {
  channel: Channel;
  onViewDetails: (channel: Channel) => void;
}

export function ChannelCard({ channel, onViewDetails }: ChannelCardProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
    return num.toString();
  };

  const lowestPrice = Math.min(...channel.pricing.filter(p => p.enabled).map(p => p.price));

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3 mb-3">
        <img
          src={channel.avatar}
          alt={channel.name}
          className="w-12 h-12 rounded-full bg-muted"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium truncate">{channel.name}</h3>
            {channel.verified && (
              <svg className="w-4 h-4 text-[var(--ton-blue)] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{channel.username}</p>
        </div>
        <CategoryChip category={channel.category} size="sm" />
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{formatNumber(channel.stats.subscribers)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Eye className="w-4 h-4" />
          <span>{formatNumber(channel.stats.avgViews)}</span>
        </div>
        <div className="flex items-center gap-1">
          <TrendingUp className="w-4 h-4" />
          <span>{channel.stats.engagement}%</span>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1">
          <span className="text-yellow-500">★</span>
          <span className="text-sm font-medium">{channel.rating}</span>
          <span className="text-sm text-muted-foreground">({channel.reviewCount})</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">From</p>
          <p className="font-medium text-[var(--ton-blue)]">{lowestPrice} TON</p>
        </div>
      </div>

      <Button
        onClick={() => onViewDetails(channel)}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        View Details
      </Button>
    </div>
  );
}
