import { Campaign } from '../types';
import { CategoryChip } from './CategoryChip';
import { FormatBadge } from './FormatBadge';
import { Button } from './ui/button';
import { Calendar, Coins } from 'lucide-react';

interface CampaignCardProps {
  campaign: Campaign;
  onViewDetails: (campaign: Campaign) => void;
  showMatchIndicator?: boolean;
  currentUserId?: string;
}

export function CampaignCard({ campaign, onViewDetails, showMatchIndicator = false, currentUserId }: CampaignCardProps) {
  const daysUntilDeadline = Math.ceil(
    (new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors">
      {showMatchIndicator && (
        <div className="mb-3 flex items-center gap-2 text-sm text-[var(--success-green)]">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Your channel qualifies</span>
        </div>
      )}

      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Coins className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium mb-1 line-clamp-1">{campaign.title}</h3>
          <CategoryChip category={campaign.category} size="sm" />
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
        {campaign.description}
      </p>

      {campaign.creativeImages.length > 0 && (
        <div className="mb-3">
          <img
            src={campaign.creativeImages[0]}
            alt="Campaign preview"
            className="w-full h-32 object-cover rounded-lg"
          />
        </div>
      )}

      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground">Budget</span>
          <span className="font-medium text-[var(--ton-blue)]">{campaign.budgetPerChannel} TON/channel</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {campaign.preferredFormats.map((format) => (
            <FormatBadge key={format} format={format} size="sm" />
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          <span>Ends in {daysUntilDeadline} days</span>
        </div>
        <span>{campaign.offerCount} offers</span>
      </div>

      <Button
        onClick={() => onViewDetails(campaign)}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {currentUserId && campaign.advertiserId === currentUserId ? 'Review Offers' : 'View & Offer'}
      </Button>
    </div>
  );
}
