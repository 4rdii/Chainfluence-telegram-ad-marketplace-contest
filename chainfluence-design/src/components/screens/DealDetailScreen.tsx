import { Deal, Channel, User } from '../../types';
import { ArrowLeft, CheckCircle2, Clock, Copy, Loader2, RefreshCw, XCircle, Send, AlertTriangle, Unlock } from 'lucide-react';
import { StatusBadge } from '../StatusBadge';
import { FormatBadge } from '../FormatBadge';
import { Button } from '../ui/button';
import { useState } from 'react';

interface DealDetailScreenProps {
  deal: Deal;
  channel: Channel;
  user: User;
  onBack: () => void;
  /** Channel owner approves the deal (prompts wallet to sign) */
  onApproveDeal?: (deal: Deal) => Promise<void>;
  /** Channel owner rejects the deal (triggers refund) */
  onRejectDeal?: (deal: Deal) => Promise<void>;
  /** Advertiser approves the deal (prompts wallet to sign) */
  onAdvertiserApprove?: (deal: Deal) => Promise<void>;
  /** Trigger TEE check on the deal (release/refund based on conditions) */
  onCheckDeal?: (deal: Deal) => Promise<void>;
  /** Refresh deal status from backend */
  onRefresh?: () => Promise<void>;
}

export function DealDetailScreen({
  deal, channel, user, onBack,
  onApproveDeal, onRejectDeal, onAdvertiserApprove, onCheckDeal, onRefresh,
}: DealDetailScreenProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionError, setActionError] = useState('');

  const isPublisher = deal.publisherId === user.id;
  const isAdvertiser = deal.advertiserId === user.id;

  // Derive signature state from timeline
  const publisherSigned = deal.timeline.some(
    s => s.step === 'Channel Owner Approved' && s.status === 'completed'
  );
  const advertiserSigned = deal.timeline.some(
    s => s.step === 'Advertiser Approved' && s.status === 'completed'
  );
  const hasBothSigs = publisherSigned && advertiserSigned;
  const hasCreative = !!deal.creativeText;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
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

  const handleApprove = async () => {
    if (!onApproveDeal) return;
    setIsApproving(true);
    setActionError('');
    try {
      await onApproveDeal(deal);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve deal');
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (!onRejectDeal) return;
    setIsRejecting(true);
    setActionError('');
    try {
      await onRejectDeal(deal);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to reject deal');
    } finally {
      setIsRejecting(false);
    }
  };

  const handleAdvertiserApprove = async () => {
    if (!onAdvertiserApprove) return;
    setIsApproving(true);
    setActionError('');
    try {
      await onAdvertiserApprove(deal);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to approve deal');
    } finally {
      setIsApproving(false);
    }
  };

  const handleCheckDeal = async () => {
    if (!onCheckDeal) return;
    setIsChecking(true);
    setActionError('');
    try {
      await onCheckDeal(deal);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Check deal failed');
    } finally {
      setIsChecking(false);
    }
  };

  const isPosted = deal.timeline.some(
    s => s.step === 'Ad Posted' && s.status === 'completed'
  );

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
          {onRefresh && (
            <button
              onClick={async () => {
                setIsRefreshing(true);
                try { await onRefresh(); } finally { setIsRefreshing(false); }
              }}
              disabled={isRefreshing}
              className="p-2 rounded-lg hover:bg-accent active:scale-90 transition-all"
            >
              <RefreshCw className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isRefreshing ? 'animate-spin' : 'hover:rotate-180'}`} />
            </button>
          )}
        </div>
      </div>

      {/* Party Info */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
          <img src={channel.avatar} alt={channel.name} className="w-12 h-12 rounded-full" />
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
                  {step.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-white" />}
                  {step.status === 'current' && <Clock className="w-5 h-5 text-white" />}
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
            <span className="text-muted-foreground">Created</span>
            <span className="text-sm">{formatDate(deal.createdAt)}</span>
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

      {/* Creative Preview - Both see when creative exists */}
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
        </div>
      )}

      {/* ── ACTION SECTIONS ── */}

      {/* 1. Channel Owner: Approve / Reject (after creative submitted, before signing) */}
      {isPublisher && hasCreative && !publisherSigned && deal.status !== 'REFUNDED' && (
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Review Deal</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Review the ad creative above. Approving will prompt your wallet to sign the deal.
          </p>
          {actionError && (
            <p className="text-sm text-[var(--error-red)] mb-3">{actionError}</p>
          )}
          <div className="space-y-3">
            <Button
              onClick={handleApprove}
              className="w-full bg-[var(--success-green)] text-white hover:bg-[var(--success-green)]/90"
              disabled={isApproving || isRejecting}
            >
              {isApproving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Approve & Sign
                </span>
              )}
            </Button>
            <Button
              onClick={handleReject}
              variant="outline"
              className="w-full text-[var(--error-red)] border-[var(--error-red)]/30 hover:bg-[var(--error-red)]/10"
              disabled={isApproving || isRejecting}
            >
              {isRejecting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rejecting...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Reject & Refund
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 2. Advertiser: Approve (after channel owner signed, before advertiser signs) */}
      {isAdvertiser && publisherSigned && !advertiserSigned && deal.status !== 'REFUNDED' && (
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold mb-3">Approve Deal</h2>
          <p className="text-sm text-muted-foreground mb-4">
            The channel owner has approved your ad. Sign to confirm the deal.
          </p>
          {actionError && (
            <p className="text-sm text-[var(--error-red)] mb-3">{actionError}</p>
          )}
          <Button
            onClick={handleAdvertiserApprove}
            className="w-full bg-primary text-primary-foreground"
            disabled={isApproving}
          >
            {isApproving ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Approve & Sign
              </span>
            )}
          </Button>
        </div>
      )}

      {/* 3. Advertiser waiting for channel owner */}
      {isAdvertiser && hasCreative && !publisherSigned && deal.status !== 'REFUNDED' && (
        <div className="p-4 border-b border-border">
          <div className="p-4 bg-accent/50 rounded-lg text-center">
            <Clock className="w-8 h-8 text-[var(--pending-amber)] mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Waiting for channel owner to review your creative
            </p>
          </div>
        </div>
      )}

      {/* 4. Channel owner waiting for advertiser to sign */}
      {isPublisher && publisherSigned && !advertiserSigned && deal.status !== 'REFUNDED' && (
        <div className="p-4 border-b border-border">
          <div className="p-4 bg-accent/50 rounded-lg text-center">
            <Clock className="w-8 h-8 text-[var(--pending-amber)] mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Waiting for advertiser to approve and sign
            </p>
          </div>
        </div>
      )}

      {/* 5. Both signatures collected — auto-posting to channel */}
      {hasBothSigs && !isPosted && deal.status !== 'REFUNDED' && (
        <div className="p-4 border-b border-border">
          <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
            <Send className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="font-medium mb-1">Both Parties Approved</p>
            <p className="text-sm text-muted-foreground">
              Posting the ad to the channel...
            </p>
          </div>
        </div>
      )}

      {/* 6a. Advertiser: Dispute & Refund (before ad posted — deposit timeout protection) */}
      {isAdvertiser && !isPosted && deal.status !== 'RELEASED' && deal.status !== 'REFUNDED' && onCheckDeal && (
        <div className="p-4 border-b border-border">
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-3 text-center">
              If the deal is stuck and 12 hours have passed since your deposit, you can request a refund.
            </p>
            {actionError && (
              <p className="text-sm text-[var(--error-red)] mb-3 text-center">{actionError}</p>
            )}
            <Button
              onClick={handleCheckDeal}
              variant="outline"
              className="w-full text-[var(--error-red)] border-[var(--error-red)]/30 hover:bg-[var(--error-red)]/10"
              disabled={isChecking}
            >
              {isChecking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Checking...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Dispute & Refund
                </span>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* 6b. Ad posted — actions for each party */}
      {isPosted && deal.status !== 'RELEASED' && deal.status !== 'REFUNDED' && (
        <div className="p-4">
          <div className="bg-card border border-border rounded-lg p-4">
            <div className="p-3 bg-[var(--success-green)]/10 rounded-lg text-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-[var(--success-green)] mx-auto mb-2" />
              <p className="font-medium mb-1">Ad is Live</p>
              <p className="text-sm text-muted-foreground">
                TEE verifies conditions automatically. You can also trigger a check manually.
              </p>
            </div>
            {actionError && (
              <p className="text-sm text-[var(--error-red)] mb-3 text-center">{actionError}</p>
            )}
            {isPublisher && onCheckDeal && (
              <Button
                onClick={handleCheckDeal}
                className="w-full bg-[var(--success-green)] text-white hover:bg-[var(--success-green)]/90"
                disabled={isChecking}
              >
                {isChecking ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Unlock className="w-4 h-4" />
                    Release Funds
                  </span>
                )}
              </Button>
            )}
            {isAdvertiser && onCheckDeal && (
              <Button
                onClick={handleCheckDeal}
                variant="outline"
                className="w-full text-[var(--error-red)] border-[var(--error-red)]/30 hover:bg-[var(--error-red)]/10"
                disabled={isChecking}
              >
                {isChecking ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Dispute & Refund
                  </span>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Refunded state */}
      {deal.status === 'REFUNDED' && (
        <div className="p-4">
          <div className="p-4 bg-[var(--error-red)]/10 border border-[var(--error-red)]/30 rounded-lg text-center">
            <XCircle className="w-8 h-8 text-[var(--error-red)] mx-auto mb-2" />
            <p className="text-sm font-medium">Deal Rejected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Funds have been refunded to the advertiser.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
