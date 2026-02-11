import { useState } from 'react';
import { Campaign, Channel, Offer, User } from '../../types';
import { CategoryChip } from '../CategoryChip';
import { FormatBadge } from '../FormatBadge';
import { StatusBadge } from '../StatusBadge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ArrowLeft, Coins, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

interface CampaignDetailScreenProps {
  campaign: Campaign;
  user: User;
  userChannels: Channel[];
  /** All channels (to look up offer channel info) */
  channels?: Channel[];
  /** Offers for this campaign (advertiser view) */
  offers?: Offer[];
  /** Publisher's own offers on this campaign */
  myOffers?: Offer[];
  onBack: () => void;
  onSubmitOffer: (channelId: string, format: string, price: number, date: string) => void;
  onAcceptOffer?: (offer: Offer) => Promise<void>;
  onRejectOffer?: (offerId: string) => Promise<void>;
}

export function CampaignDetailScreen({
  campaign, user, userChannels, channels, offers, myOffers,
  onBack, onSubmitOffer, onAcceptOffer, onRejectOffer,
}: CampaignDetailScreenProps) {
  const isOwner = user.id === campaign.advertiserId;

  const [selectedChannel, setSelectedChannel] = useState(userChannels[0]?.id || '');
  const [selectedFormat, setSelectedFormat] = useState(campaign.preferredFormats[0]);
  const [offerPriceStr, setOfferPriceStr] = useState(String(campaign.budgetPerChannel));
  const [proposedDate, setProposedDate] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');

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
    const price = parseFloat(offerPriceStr);
    if (isNaN(price) || price <= 0) return;
    onSubmitOffer(selectedChannel, selectedFormat, price, proposedDate);
    setShowSuccess(true);
  };

  const handleAccept = async (offer: Offer) => {
    if (!onAcceptOffer) return;
    setAcceptingId(offer.id);
    setActionError('');
    try {
      await onAcceptOffer(offer);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to accept offer');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleReject = async (offerId: string) => {
    if (!onRejectOffer) return;
    setRejectingId(offerId);
    setActionError('');
    try {
      await onRejectOffer(offerId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject offer');
    } finally {
      setRejectingId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const daysUntilDeadline = Math.ceil(
    (new Date(campaign.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  const getOfferChannel = (channelId: string) =>
    channels?.find(c => c.id === channelId);

  // Publisher success state
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
          {campaign.deadline && (
            <>
              <span>•</span>
              <span>Ends in {daysUntilDeadline} days</span>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-2">Description</h2>
        <p className="text-muted-foreground">{campaign.description}</p>
      </div>

      {/* Creative Preview */}
      {campaign.creativeText && (
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
            {!isOwner && (
              <p className="text-xs text-muted-foreground mt-2">
                This is what you'll post to your channel
              </p>
            )}
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
      )}

      {/* Requirements */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-3">Requirements</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
            <span className="text-sm">Budget per channel</span>
            <span className="font-semibold text-[var(--ton-blue)]">{campaign.budgetPerChannel} TON</span>
          </div>
          {campaign.preferredFormats.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <span className="text-sm">Accepted formats</span>
              <div className="flex gap-1.5">
                {campaign.preferredFormats.map(format => (
                  <FormatBadge key={format} format={format} size="sm" />
                ))}
              </div>
            </div>
          )}
          {campaign.minSubscribers > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <span className="text-sm">Min subscribers</span>
              <span className="font-medium">{campaign.minSubscribers.toLocaleString()}</span>
            </div>
          )}
          {campaign.minEngagement > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <span className="text-sm">Min engagement</span>
              <span className="font-medium">{campaign.minEngagement}%</span>
            </div>
          )}
          {campaign.preferredRegions.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
              <span className="text-sm">Target regions</span>
              <span className="font-medium">{campaign.preferredRegions.join(', ')}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── ADVERTISER VIEW: Manage Offers ── */}
      {isOwner && (
        <div className="p-4">
          <h2 className="font-semibold mb-4">
            Offers {offers && offers.length > 0 ? `(${offers.length})` : ''}
          </h2>

          {actionError && (
            <p className="text-sm text-[var(--error-red)] mb-3">{actionError}</p>
          )}

          {(!offers || offers.length === 0) ? (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                <Coins className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No offers yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Publishers will submit offers once they see your campaign
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {offers.map((offer) => {
                const offerChannel = getOfferChannel(offer.channelId);
                const isBusy = acceptingId === offer.id || rejectingId === offer.id;

                return (
                  <div
                    key={offer.id}
                    className="bg-card border border-border rounded-xl p-4"
                  >
                    {/* Channel info */}
                    <div className="flex items-center gap-3 mb-3">
                      {offerChannel ? (
                        <>
                          <img
                            src={offerChannel.avatar}
                            alt={offerChannel.name}
                            className="w-10 h-10 rounded-full flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{offerChannel.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {offerChannel.username} • {offerChannel.stats.subscribers.toLocaleString()} subs
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">Channel #{offer.channelId}</p>
                        </div>
                      )}
                      <StatusBadge status={offer.status} size="sm" />
                    </div>

                    {/* Price + Format */}
                    <div className="flex items-center gap-4 mb-3 p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">Price</p>
                        <p className="text-sm font-semibold">
                          {offer.price} <span className="text-xs text-muted-foreground font-normal">TON</span>
                        </p>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-xs text-muted-foreground">Format</p>
                        <FormatBadge format={offer.format} />
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div>
                        <p className="text-xs text-muted-foreground">Submitted</p>
                        <p className="text-sm">{formatDate(offer.createdAt)}</p>
                      </div>
                    </div>

                    {/* Accept / Reject buttons for pending offers */}
                    {offer.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleAccept(offer)}
                          className="flex-1 bg-[var(--success-green)] text-white hover:bg-[var(--success-green)]/90"
                          disabled={isBusy}
                        >
                          {acceptingId === offer.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Accepting...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
                              Accept & Pay
                            </span>
                          )}
                        </Button>
                        <Button
                          onClick={() => handleReject(offer.id)}
                          variant="outline"
                          className="flex-1 text-[var(--error-red)] border-[var(--error-red)]/30 hover:bg-[var(--error-red)]/10"
                          disabled={isBusy}
                        >
                          {rejectingId === offer.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Rejecting...
                            </span>
                          ) : (
                            <span className="flex items-center justify-center gap-2">
                              <XCircle className="w-4 h-4" />
                              Reject
                            </span>
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── PUBLISHER VIEW: Channel Match + Submit Offer ── */}
      {!isOwner && (
        <>
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

          {/* Your Offers on this campaign */}
          {myOffers && myOffers.length > 0 && (
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold mb-3">Your Offers</h2>
              <div className="space-y-3">
                {myOffers.map((offer) => {
                  const offerChannel = channels?.find(c => c.id === offer.channelId);
                  return (
                    <div
                      key={offer.id}
                      className="bg-card border border-border rounded-xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {offerChannel && (
                            <img
                              src={offerChannel.avatar}
                              alt={offerChannel.name}
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <p className="text-sm font-medium">
                            {offerChannel?.name || `Channel #${offer.channelId}`}
                          </p>
                        </div>
                        <StatusBadge status={offer.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{offer.price} TON</span>
                        <span>•</span>
                        <FormatBadge format={offer.format} />
                        <span>•</span>
                        <span>{formatDate(offer.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Offer Form */}
          {userChannels.length > 0 ? (
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
                {campaign.preferredFormats.length > 0 && (
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
                )}

                {/* Your Price */}
                <div>
                  <Label htmlFor="price">Your Price (TON)</Label>
                  <div className="relative mt-1">
                    <Input
                      id="price"
                      type="text"
                      inputMode="decimal"
                      value={offerPriceStr}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) setOfferPriceStr(v);
                      }}
                      className="pr-12"
                      placeholder="Enter price"
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
          ) : (
            <div className="p-4">
              <div className="text-center py-8 px-4 bg-card border border-border rounded-xl">
                <p className="text-muted-foreground font-medium">No channels yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a channel to your profile to submit offers on campaigns
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
