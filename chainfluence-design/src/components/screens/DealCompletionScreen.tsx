import { ArrowLeft, CheckCircle2, Undo2, ExternalLink, Star, Copy } from 'lucide-react';
import { useState } from 'react';
import { Deal, Channel } from '../../types';
import { hapticImpact, hapticNotification } from '../../lib/telegram';

interface DealCompletionScreenProps {
  deal: Deal;
  channel: Channel;
  onBack: () => void;
  onLeaveReview: (dealId: string, rating: number) => void;
  onBackToDeals: () => void;
}

export function DealCompletionScreen({
  deal,
  channel,
  onBack,
  onLeaveReview,
  onBackToDeals,
}: DealCompletionScreenProps) {
  const [copied, setCopied] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [hasReviewed, setHasReviewed] = useState(false);
  const isReleased = deal.status === 'RELEASED';
  const isRefunded = deal.status === 'REFUNDED';

  const handleStarClick = (starValue: number) => {
    hapticImpact('medium');
    setRating(starValue);
    setHasReviewed(true);
    hapticNotification('success');
    onLeaveReview(deal.id, starValue);
  };

  const txHash = deal.timeline.find(
    (t) => t.step === 'Verified & Released' || t.details?.includes('TON')
  )?.details;

  const handleCopy = () => {
    navigator.clipboard.writeText(deal.escrowAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const publisherPayout = deal.amount - deal.platformFee;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="p-4">
        <button
          onClick={onBack}
          className="p-1 -ml-1 hover:bg-accent rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col items-center px-4 pt-4">
        {/* Icon */}
        {isReleased && (
          <>
            <div className="w-24 h-24 rounded-full bg-[var(--success-green)]/15 flex items-center justify-center mb-6">
              <CheckCircle2 className="w-14 h-14 text-[var(--success-green)]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Deal Completed!</h1>
            <p className="text-muted-foreground text-center mb-8">
              Funds have been released to the publisher
            </p>
          </>
        )}

        {isRefunded && (
          <>
            <div className="w-24 h-24 rounded-full bg-[var(--pending-amber)]/15 flex items-center justify-center mb-6">
              <Undo2 className="w-14 h-14 text-[var(--pending-amber)]" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Deal Refunded</h1>
            <p className="text-muted-foreground text-center mb-8">
              Funds have been returned to the advertiser
            </p>
          </>
        )}

        {/* Details card */}
        <div className="w-full bg-card border border-border rounded-2xl p-5 space-y-4">
          {/* Channel */}
          <div className="flex items-center gap-3">
            <img
              src={channel.avatar}
              alt={channel.name}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="font-semibold">{channel.name}</p>
              <p className="text-xs text-muted-foreground">{channel.username}</p>
            </div>
          </div>

          <div className="w-full h-px bg-border" />

          {/* Amount */}
          <div className="space-y-3">
            {isReleased && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Deal amount</span>
                  <span className="text-sm font-medium">{deal.amount} TON</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Platform fee (5%)
                  </span>
                  <span className="text-sm font-medium text-muted-foreground">
                    -{deal.platformFee} TON
                  </span>
                </div>
                <div className="w-full h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Publisher received</span>
                  <span className="text-base font-bold text-[var(--success-green)]">
                    {publisherPayout} TON
                  </span>
                </div>
              </>
            )}
            {isRefunded && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reason</span>
                  <span className="text-sm font-medium text-[var(--error-red)]">
                    Post removed early
                  </span>
                </div>
                <div className="w-full h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">Advertiser refunded</span>
                  <span className="text-base font-bold text-[var(--pending-amber)]">
                    {deal.totalAmount} TON
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="w-full h-px bg-border" />

          {/* Transaction */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Transaction</p>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
            >
              <span className="font-mono text-xs truncate max-w-[200px]">
                {deal.escrowAddress}
              </span>
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <Copy className="w-3.5 h-3.5 flex-shrink-0" />
              )}
            </button>
            {txHash && (
              <button className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ExternalLink className="w-3.5 h-3.5" />
                View on TON Explorer
              </button>
            )}
          </div>

          {/* Completed date */}
          {deal.completedAt && (
            <>
              <div className="w-full h-px bg-border" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Completed</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(deal.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Star Rating Section */}
      {isReleased && (
        <div className="px-4 pb-4">
          <div className="bg-card border border-border rounded-2xl p-5">
            <p className="text-center text-sm text-muted-foreground mb-3">
              {hasReviewed ? 'Thanks for your feedback!' : 'How was your experience?'}
            </p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => !hasReviewed && handleStarClick(star)}
                  onMouseEnter={() => !hasReviewed && setHoveredRating(star)}
                  onMouseLeave={() => !hasReviewed && setHoveredRating(0)}
                  disabled={hasReviewed}
                  className={`p-1 transition-all ${hasReviewed ? 'cursor-default' : 'cursor-pointer hover:scale-110 active:scale-95'}`}
                >
                  <Star
                    className={`w-10 h-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {hasReviewed && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                You rated this deal {rating} star{rating !== 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Bottom button */}
      <div className="p-4 pb-8">
        <button
          onClick={onBackToDeals}
          className="w-full bg-muted text-foreground hover:bg-muted/80 rounded-xl py-4 font-semibold text-base transition-colors"
        >
          Back to Deals
        </button>
      </div>
    </div>
  );
}
