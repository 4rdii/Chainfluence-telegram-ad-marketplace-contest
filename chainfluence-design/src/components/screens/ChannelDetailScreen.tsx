import { Channel } from '../../types';
import { CategoryChip } from '../CategoryChip';
import { FormatBadge } from '../FormatBadge';
import { formatStat, formatPercent } from '../../lib/format-stat';
import { Button } from '../ui/button';
import { ArrowLeft, ExternalLink, Users, Eye, Calendar, MapPin, Star, TrendingUp } from 'lucide-react';

interface ChannelDetailScreenProps {
  channel: Channel;
  onBack: () => void;
  onBookAdSlot: (channel: Channel) => void;
}

export function ChannelDetailScreen({ channel, onBack, onBookAdSlot }: ChannelDetailScreenProps) {
  return (
    <div className="pb-4">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-4 mb-4">
          <img
            src={channel.avatar}
            alt={channel.name}
            className="w-20 h-20 rounded-full bg-muted"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-semibold">{channel.name}</h1>
              {channel.verified && (
                <svg className="w-5 h-5 text-[var(--ton-blue)] flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <p className="text-muted-foreground mb-2">{channel.username}</p>
            <CategoryChip category={channel.category} />
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <span className="text-yellow-500 text-xl">★</span>
            <span className="text-lg font-semibold">{channel.rating}</span>
            <span className="text-muted-foreground">({channel.reviewCount} reviews)</span>
          </div>
        </div>

        <a
          href={`https://t.me/${channel.username.replace('@', '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-primary hover:underline"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Open in Telegram</span>
        </a>
      </div>

      {/* Stats Section */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-4">Channel Statistics</h2>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-[var(--ton-blue)]" />
              <span className="text-xs text-muted-foreground">Subscribers</span>
            </div>
            <p className="text-2xl font-semibold">{formatStat(channel.stats.subscribers)}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="w-4 h-4 text-[var(--ton-blue)]" />
              <span className="text-xs text-muted-foreground">Avg Views</span>
            </div>
            <p className="text-2xl font-semibold">{formatStat(channel.stats.avgViews)}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--success-green)]" />
              <span className="text-xs text-muted-foreground">Engagement</span>
            </div>
            <p className="text-2xl font-semibold">{formatPercent(channel.stats.engagement)}</p>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-[var(--ton-blue)]" />
              <span className="text-xs text-muted-foreground">Posts/Week</span>
            </div>
            <p className="text-2xl font-semibold">{formatStat(channel.stats.postsPerWeek)}</p>
          </div>
        </div>

        {/* Audience by Country */}
        <div className="bg-card border border-border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary" />
            <h3 className="font-medium">Audience by Country</h3>
          </div>
          <div className="space-y-2">
            {channel.stats.audienceByCountry.map((country) => (
              <div key={country.country}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{country.country}</span>
                  <span className="text-muted-foreground">{country.percentage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary rounded-full h-2 transition-all"
                    style={{ width: `${country.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Pricing Table */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-4">Pricing</h2>
        <div className="space-y-3">
          {channel.pricing.filter(p => p.enabled).map((pricing) => (
            <div key={pricing.format} className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <FormatBadge format={pricing.format} />
                    <span className="font-medium">{pricing.description}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {pricing.format === '1/24' && 'Your ad will be pinned at the top for 24 hours'}
                    {pricing.format === '2/48' && 'Your ad will stay in the channel for 48 hours'}
                    {pricing.format === '3/72' && 'Your ad will stay in the channel for 72 hours'}
                    {pricing.format === 'eternal' && 'Your ad will be permanently posted'}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-2xl font-semibold text-[var(--ton-blue)]">{pricing.price}</p>
                  <p className="text-xs text-muted-foreground">TON</p>
                </div>
              </div>
              <Button
                onClick={() => onBookAdSlot(channel)}
                size="sm"
                className="w-full bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
              >
                Book
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews Section */}
      <div className="p-4">
        <h2 className="font-semibold mb-4">Recent Reviews</h2>
        <div className="space-y-4">
          {/* Mock reviews */}
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
                alt="Reviewer"
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Sarah M.</span>
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Great engagement, ad performed well! Publisher was very professional and responsive.
                </p>
                <p className="text-xs text-muted-foreground">2 weeks ago</p>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-lg p-4">
            <div className="flex items-start gap-3 mb-2">
              <img
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=Mike"
                alt="Reviewer"
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">Mike J.</span>
                  <div className="flex">
                    {[1, 2, 3, 4].map((star) => (
                      <Star key={star} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                    ))}
                    <Star className="w-3 h-3 text-muted-foreground" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Good results, would work with again. Audience was very targeted.
                </p>
                <p className="text-xs text-muted-foreground">1 month ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
