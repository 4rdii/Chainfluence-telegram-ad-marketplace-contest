import { useState } from 'react';
import { ArrowLeft, Briefcase, ArrowRight } from 'lucide-react';
import { Offer, Campaign, Channel } from '../../types';
import { StatusBadge } from '../StatusBadge';
import { FormatBadge } from '../FormatBadge';

interface MyOffersScreenProps {
  offers: Offer[];
  campaigns: Campaign[];
  channels: Channel[];
  onBack: () => void;
  onOfferClick: (offer: Offer) => void;
}

type OfferFilter = 'pending' | 'accepted' | 'declined';

export function MyOffersScreen({
  offers,
  campaigns,
  channels,
  onBack,
  onOfferClick,
}: MyOffersScreenProps) {
  const [filter, setFilter] = useState<OfferFilter>('pending');

  const filtered = offers.filter((o) => o.status === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const counts = {
    pending: offers.filter((o) => o.status === 'pending').length,
    accepted: offers.filter((o) => o.status === 'accepted').length,
    declined: offers.filter((o) => o.status === 'declined').length,
  };

  const getCampaign = (campaignId: string) =>
    campaigns.find((c) => c.id === campaignId);

  const getChannel = (channelId: string) =>
    channels.find((c) => c.id === channelId);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-1 -ml-1 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-semibold">My Offers</h1>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['pending', 'accepted', 'declined'] as OfferFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {counts[tab] > 0 && ` (${counts[tab]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Offers list */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            No {filter} offers
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'pending' && 'Browse campaigns and submit offers to get started'}
            {filter === 'accepted' && 'Accepted offers will appear here'}
            {filter === 'declined' && 'No offers have been declined'}
          </p>
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {sorted.map((offer) => {
            const campaign = getCampaign(offer.campaignId);
            const channel = getChannel(offer.channelId);
            if (!campaign || !channel) return null;

            return (
              <button
                key={offer.id}
                onClick={() => onOfferClick(offer)}
                className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all text-left"
              >
                {/* Campaign title + status */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate mb-1">
                      {campaign.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by @{campaign.advertiserId}
                    </p>
                  </div>
                  <StatusBadge status={offer.status} size="sm" />
                </div>

                {/* Channel + offer details */}
                <div className="flex items-center gap-3 mb-3 p-3 bg-muted/30 rounded-lg">
                  <img
                    src={channel.avatar}
                    alt={channel.name}
                    className="w-8 h-8 rounded-full flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{channel.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {channel.username}
                    </p>
                  </div>
                  <FormatBadge format={offer.format} />
                </div>

                {/* Price + date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Your price</p>
                      <p className="text-sm font-semibold">
                        {offer.price}{' '}
                        <span className="text-xs text-muted-foreground font-normal">
                          TON
                        </span>
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div>
                      <p className="text-xs text-muted-foreground">Proposed date</p>
                      <p className="text-sm font-semibold">
                        {formatDate(offer.proposedDate)}
                      </p>
                    </div>
                  </div>

                  {offer.status === 'accepted' && (
                    <div className="flex items-center gap-1 text-primary text-sm font-medium">
                      Go to Deal
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
