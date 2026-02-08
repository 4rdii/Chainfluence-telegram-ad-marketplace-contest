import { useState } from 'react';
import { Campaign, Channel } from '../../types';
import { CategoryChip } from '../CategoryChip';
import { FormatBadge } from '../FormatBadge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, Calendar, Coins, Users, TrendingUp, CheckCircle2, XCircle } from 'lucide-react';

interface CampaignDetailScreenProps {
  campaign: Campaign;
  userChannels: Channel[];
  onBack: () => void;
  onSubmitOffer: (channelId: string, format: string, price: number, date: string) => void;
}

export function CampaignDetailScreen({ campaign, userChannels, onBack, onSubmitOffer }: CampaignDetailScreenProps) {
  const [selectedChannel, setSelectedChannel] = useState(userChannels[0]?.id || '');
  const [selectedFormat, setSelectedFormat] = useState(campaign.preferredFormats[0]);
  const [offerPrice, setOfferPrice] = useState(campaign.budgetPerChannel);
  const [proposedDate, setProposedDate] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedChannelData = userChannels.find(c => c.id === selectedChannel);

  const checkRequirement = (met: boolean) => {
    return met ? (
      <CheckCircle2 className="w-4 h-4 text-[var(--success-green)]" />
    ) : (
      <XCircle className="w-4 h-4 text-[var(--error-red)]" />
    );
  };

  const meetsRequirements = selectedChannelData ? {
    subscribers: selectedChannelData.stats.subscribers >= campaign.minSubscribers,
    engagement: (selectedChannelData.stats.engagement ?? 0) >= campaign.minEngagement,
    category: campaign.preferredCategories.includes(selectedChannelData.category)
  } : { subscribers: false, engagement: false, category: false };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitOffer(selectedChannel, selectedFormat, offerPrice, proposedDate);
    setShowSuccess(true);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const daysUntilDeadline = Math.ceil(
    (new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  if (showSuccess) {
    return (
      <div className="pb-20 flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-[var(--success-green)]/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-[var(--success-green)]" />
          </div>
          <h2 className="text-2xl font-semibold mb-3">Offer Submitted!</h2>
          <p className="text-muted-foreground mb-6">
            You'll be notified when the advertiser responds to your offer.
          </p>
          <Button onClick={onBack} className="w-full bg-primary text-primary-foreground">
            Back to Campaigns
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-32">
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

      {/* Campaign Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold mb-2">{campaign.title}</h1>
            <CategoryChip category={campaign.category} />
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>Posted {formatDate(campaign.createdAt)}</span>
          <span>•</span>
          <span>Ends in {daysUntilDeadline} days</span>
        </div>
      </div>

      {/* Description */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-2">Description</h2>
        <p className="text-muted-foreground">{campaign.description}</p>
      </div>

      {/* Creative Preview */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-3">Creative Preview</h2>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="bg-background rounded-lg p-3 mb-3">
            <p className="text-sm whitespace-pre-line">{campaign.creativeText}</p>
          </div>
          {campaign.creativeImages.map((img, idx) => (
            <img
              key={idx}
              src={img}
              alt={`Creative ${idx + 1}`}
              className="w-full rounded-lg mb-2"
            />
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            This is what you'll post to your channel
          </p>
        </div>
        {campaign.contentGuidelines && (
          <div className="mt-3 p-3 bg-accent/50 rounded-lg">
            <p className="text-sm">
              <span className="font-medium">Guidelines: </span>
              {campaign.contentGuidelines}
            </p>
          </div>
        )}
      </div>

      {/* Requirements */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-3">Requirements</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <span className="text-sm">Budget per channel</span>
            <span className="font-semibold text-[var(--ton-blue)]">{campaign.budgetPerChannel} TON</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <span className="text-sm">Accepted formats</span>
            <div className="flex gap-1.5">
              {campaign.preferredFormats.map(format => (
                <FormatBadge key={format} format={format} size="sm" />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <span className="text-sm">Min subscribers</span>
            <span className="font-medium">{campaign.minSubscribers.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <span className="text-sm">Min engagement</span>
            <span className="font-medium">{campaign.minEngagement}%</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <span className="text-sm">Target regions</span>
            <span className="font-medium">{campaign.preferredRegions.join(', ')}</span>
          </div>
        </div>
      </div>

      {/* Your Channel Match */}
      {selectedChannelData && (
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Your Channel Match</h2>
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {checkRequirement(meetsRequirements.subscribers)}
                <span className="text-sm">Subscribers: {selectedChannelData.stats.subscribers.toLocaleString()}</span>
              </div>
              <span className="text-xs text-muted-foreground">(min {campaign.minSubscribers.toLocaleString()})</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {checkRequirement(meetsRequirements.engagement)}
                <span className="text-sm">Engagement: {selectedChannelData.stats.engagement != null ? `${selectedChannelData.stats.engagement}%` : 'n/a'}</span>
              </div>
              <span className="text-xs text-muted-foreground">(min {campaign.minEngagement}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {checkRequirement(meetsRequirements.category)}
                <span className="text-sm">Category: {selectedChannelData.category}</span>
              </div>
              <span className="text-xs text-muted-foreground">({campaign.preferredCategories.join(', ')})</span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Offer Form */}
      <div className="p-4">
        <h2 className="font-semibold mb-4">Submit Your Offer</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Select Channel */}
          {userChannels.length > 1 && (
            <div>
              <Label htmlFor="channel">Select Channel</Label>
              <select
                id="channel"
                value={selectedChannel}
                onChange={(e) => setSelectedChannel(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg"
              >
                {userChannels.map((channel) => (
                  <option key={channel.id} value={channel.id}>
                    {channel.name} ({channel.stats.subscribers.toLocaleString()} subs)
                  </option>
                ))}
              </select>
            </div>
          )}

          {userChannels.length === 1 && (
            <div className="p-3 bg-card border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <img
                  src={selectedChannelData?.avatar}
                  alt={selectedChannelData?.name}
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <p className="font-medium">{selectedChannelData?.name}</p>
                  <p className="text-sm text-muted-foreground">{selectedChannelData?.username}</p>
                </div>
              </div>
            </div>
          )}

          {/* Select Format */}
          <div>
            <Label>Select Format</Label>
            <div className="mt-2 space-y-2">
              {campaign.preferredFormats.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSelectedFormat(format)}
                  className={`w-full p-3 rounded-lg border-2 transition-colors text-left ${
                    selectedFormat === format
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card'
                  }`}
                >
                  <FormatBadge format={format} />
                </button>
              ))}
            </div>
          </div>

          {/* Your Price */}
          <div>
            <Label htmlFor="price">Your Price (TON)</Label>
            <div className="relative mt-1">
              <Input
                id="price"
                type="number"
                value={offerPrice}
                onChange={(e) => setOfferPrice(Number(e.target.value))}
                className="pr-12"
                min="0"
                step="0.1"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                TON
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Campaign budget: {campaign.budgetPerChannel} TON
            </p>
          </div>

          {/* Proposed Date */}
          <div>
            <Label htmlFor="date">Proposed Posting Date</Label>
            <Input
              id="date"
              type="datetime-local"
              value={proposedDate}
              onChange={(e) => setProposedDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
            size="lg"
            disabled={!proposedDate || userChannels.length === 0}
          >
            Submit Offer
          </Button>
        </form>
      </div>
    </div>
  );
}
