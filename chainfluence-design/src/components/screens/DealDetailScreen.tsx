import { Deal, Channel, User } from '../../types';
import { ArrowLeft, CheckCircle2, Clock, Copy, Image as ImageIcon } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { FormatBadge } from '../FormatBadge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useState } from 'react';

interface DealDetailScreenProps {
  deal: Deal;
  channel: Channel;
  user: User;
  onBack: () => void;
}

export function DealDetailScreen({ deal, channel, user, onBack }: DealDetailScreenProps) {
  const [creativeText, setCreativeText] = useState(deal.creativeText || '');
  const [publisherFeedback, setPublisherFeedback] = useState('');
  const [postLink, setPostLink] = useState('');
  const [showCreativeForm, setShowCreativeForm] = useState(
    deal.status === 'ACCEPTED' && deal.advertiserId === user.id && !deal.creativeText
  );

  const isPublisher = deal.publisherId === user.id;
  const isAdvertiser = deal.advertiserId === user.id;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusColor = (status: 'completed' | 'current' | 'future') => {
    if (status === 'completed') return 'bg-[var(--success-green)]';
    if (status === 'current') return 'bg-[var(--pending-amber)] animate-pulse';
    return 'bg-muted';
  };

  const handleSubmitCreative = () => {
    console.log('Submit creative:', creativeText);
    // In real app, submit to backend
    setShowCreativeForm(false);
  };

  const handleApproveCreative = () => {
    console.log('Approve creative');
    // In real app, update deal status
  };

  const handleRequestChanges = () => {
    console.log('Request changes:', publisherFeedback);
    // In real app, update deal status
  };

  const handleConfirmPosted = () => {
    console.log('Confirm posted:', postLink);
    // In real app, submit post verification
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold mb-1">Deal #{deal.id}</h1>
            <StatusBadge status={deal.status} />
          </div>
        </div>
      </div>

      {/* Party Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
          <img
            src={channel.avatar}
            alt={channel.name}
            className="w-12 h-12 rounded-full"
          />
          <div className="flex-1">
            <p className="font-medium">{channel.name}</p>
            <p className="text-sm text-muted-foreground">{channel.username}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">
              {isPublisher ? 'Advertiser' : 'Channel'}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-4">Timeline</h2>
        <div className="space-y-4">
          {deal.timeline.map((step, index) => (
            <div key={index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(step.status)}`}>
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  )}
                  {step.status === 'current' && (
                    <Clock className="w-5 h-5 text-white" />
                  )}
                </div>
                {index < deal.timeline.length - 1 && (
                  <div className={`w-0.5 h-12 ${step.status === 'completed' ? 'bg-[var(--success-green)]' : 'bg-muted'}`} />
                )}
              </div>
              <div className="flex-1 pb-4">
                <p className="font-medium">{step.step}</p>
                {step.timestamp && (
                  <p className="text-sm text-muted-foreground">{formatDate(step.timestamp)}</p>
                )}
                {step.details && (
                  <p className="text-sm text-[var(--ton-blue)] mt-1">{step.details}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Deal Info Card */}
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold mb-3">Deal Information</h2>
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Format</span>
            <FormatBadge format={deal.format} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold text-[var(--ton-blue)]">{deal.amount} TON</span>
          </div>
          {isPublisher && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Your payout</span>
              <span className="font-semibold text-[var(--success-green)]">
                {(deal.amount - deal.platformFee).toFixed(2)} TON
              </span>
            </div>
          )}
          {isAdvertiser && (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Total paid</span>
              <span className="font-semibold">{deal.totalAmount} TON</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Platform fee (5%)</span>
            <span>{deal.platformFee} TON</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Scheduled</span>
            <span className="text-sm">{formatDate(deal.scheduledDate)}</span>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-sm">Escrow address</span>
              <button
                onClick={() => copyToClipboard(deal.escrowAddress)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs font-mono bg-background p-2 rounded break-all">
              {deal.escrowAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Creative Section - Advertiser submits */}
      {showCreativeForm && isAdvertiser && (
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Submit Your Ad Creative</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="creative">Ad Copy</Label>
              <Textarea
                id="creative"
                value={creativeText}
                onChange={(e) => setCreativeText(e.target.value)}
                placeholder="Enter your ad text here..."
                rows={6}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Media Upload</Label>
              <div className="mt-1 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                <ImageIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tap to upload images</p>
              </div>
            </div>
            <Button
              onClick={handleSubmitCreative}
              className="w-full bg-primary text-primary-foreground"
            >
              Submit Creative
            </Button>
          </div>
        </div>
      )}

      {/* Creative Preview - Both see */}
      {deal.creativeText && (
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Ad Creative</h2>
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="bg-background rounded-lg p-3 mb-3">
              <p className="text-sm whitespace-pre-line">{deal.creativeText}</p>
            </div>
            {deal.creativeImages && deal.creativeImages.map((img, idx) => (
              <img
                key={idx}
                src={img}
                alt={`Creative ${idx + 1}`}
                className="w-full rounded-lg mb-2"
              />
            ))}
          </div>

          {/* Publisher Review Actions */}
          {deal.status === 'CREATIVE_PENDING' && isPublisher && (
            <div className="mt-4 space-y-3">
              <Button
                onClick={handleApproveCreative}
                className="w-full bg-[var(--success-green)] text-white hover:bg-[var(--success-green)]/90"
              >
                Approve Creative
              </Button>
              <div className="space-y-2">
                <Textarea
                  value={publisherFeedback}
                  onChange={(e) => setPublisherFeedback(e.target.value)}
                  placeholder="Request changes (optional)"
                  rows={3}
                />
                <Button
                  onClick={handleRequestChanges}
                  variant="outline"
                  className="w-full"
                >
                  Request Changes
                </Button>
              </div>
            </div>
          )}

          {/* Advertiser waiting state */}
          {deal.status === 'CREATIVE_PENDING' && isAdvertiser && (
            <div className="mt-4 p-4 bg-accent/50 rounded-lg text-center">
              <Clock className="w-8 h-8 text-[var(--pending-amber)] mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Waiting for publisher to review your creative
              </p>
            </div>
          )}

          {/* Publisher feedback */}
          {deal.publisherFeedback && (
            <div className="mt-4 p-4 bg-[var(--pending-amber)]/10 border border-[var(--pending-amber)]/30 rounded-lg">
              <p className="text-sm font-medium mb-1">Publisher Feedback:</p>
              <p className="text-sm text-muted-foreground">{deal.publisherFeedback}</p>
            </div>
          )}
        </div>
      )}

      {/* Post Confirmation - Publisher */}
      {deal.status === 'APPROVED' && isPublisher && (
        <div className="p-4">
          <h2 className="font-semibold mb-3">Confirm Posting</h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Once you've posted the ad to your channel, confirm it here.
            </p>
            <div>
              <Label htmlFor="postLink">Message ID or Post Link</Label>
              <Input
                id="postLink"
                value={postLink}
                onChange={(e) => setPostLink(e.target.value)}
                placeholder="https://t.me/channel/1234 or message ID"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleConfirmPosted}
              className="w-full bg-primary text-primary-foreground"
              disabled={!postLink}
            >
              I've Posted the Ad
            </Button>
          </div>
        </div>
      )}

      {/* Posted - Live Metrics */}
      {deal.status === 'POSTED' && (
        <div className="p-4">
          <h2 className="font-semibold mb-3">Live Metrics</h2>
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            {deal.postId && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Post Link</p>
                <a
                  href={deal.postId}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline break-all"
                >
                  {deal.postId}
                </a>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-semibold mb-1">12,450</p>
                <p className="text-xs text-muted-foreground">Views</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <p className="text-2xl font-semibold mb-1">234</p>
                <p className="text-xs text-muted-foreground">Forwards</p>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Time remaining</span>
                <span className="text-sm font-medium">18h 32m</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-[var(--ton-blue)] rounded-full h-2" style={{ width: '65%' }} />
              </div>
            </div>
          </div>

          {isAdvertiser && (
            <Button
              variant="outline"
              className="w-full mt-4 text-[var(--error-red)] border-[var(--error-red)]/30"
            >
              Report Issue
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
