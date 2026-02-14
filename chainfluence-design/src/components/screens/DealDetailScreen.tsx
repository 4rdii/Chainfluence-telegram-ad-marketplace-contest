import { Deal, Channel, User } from '../../types';
import { ArrowLeft, CheckCircle2, Clock, Copy, Loader2, RefreshCw, XCircle, Send, AlertTriangle, Unlock, ChevronDown, ChevronUp, ExternalLink, Shield, Wallet, Users } from 'lucide-react';
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
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
  const isPosted = deal.timeline.some(
    s => s.step === 'Ad Posted' && s.status === 'completed'
  );

  // Progress calculation
  const completedSteps = deal.timeline.filter(s => s.status === 'completed').length;
  const totalSteps = deal.timeline.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  // Determine what the user needs to do next
  const getNextAction = (): { label: string; sublabel: string } | null => {
    if (deal.status === 'REFUNDED') return null;
    if (deal.status === 'RELEASED') return null;

    if (isPublisher) {
      if (hasCreative && !publisherSigned) return { label: 'Review Required', sublabel: 'Review the creative and approve or reject' };
      if (publisherSigned && !advertiserSigned) return { label: 'Waiting', sublabel: 'Advertiser needs to approve' };
      if (isPosted) return { label: 'Ad is Live', sublabel: 'Release funds when conditions are met' };
      if (hasBothSigs && !isPosted) return { label: 'Posting', sublabel: 'Ad is being posted to channel' };
    }

    if (isAdvertiser) {
      if (hasCreative && !publisherSigned) return { label: 'Waiting', sublabel: 'Channel owner is reviewing your creative' };
      if (publisherSigned && !advertiserSigned) return { label: 'Approval Required', sublabel: 'Channel owner approved — sign to confirm' };
      if (isPosted) return { label: 'Ad is Live', sublabel: 'Dispute if conditions are not met' };
      if (hasBothSigs && !isPosted) return { label: 'Posting', sublabel: 'Ad is being posted to channel' };
    }

    return { label: 'In Progress', sublabel: 'Deal is being set up' };
  };

  const nextAction = getNextAction();

  // Determine primary action for sticky bar
  const getPrimaryAction = () => {
    if (deal.status === 'REFUNDED' || deal.status === 'RELEASED') return null;

    // Publisher: review creative
    if (isPublisher && hasCreative && !publisherSigned && deal.status !== 'REFUNDED') {
      return { type: 'approve' as const };
    }
    // Advertiser: sign after publisher approved
    if (isAdvertiser && publisherSigned && !advertiserSigned && deal.status !== 'REFUNDED') {
      return { type: 'advertiser-approve' as const };
    }
    // Publisher: release funds when ad is live
    if (isPublisher && isPosted && deal.status !== 'RELEASED' && deal.status !== 'REFUNDED' && onCheckDeal) {
      return { type: 'release' as const };
    }
    // Advertiser: dispute when ad is live
    if (isAdvertiser && isPosted && deal.status !== 'RELEASED' && deal.status !== 'REFUNDED' && onCheckDeal) {
      return { type: 'dispute' as const };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  // Progress bar color
  const getProgressColor = () => {
    if (deal.status === 'REFUNDED') return 'bg-[var(--error-red)]';
    if (deal.status === 'RELEASED') return 'bg-[var(--success-green)]';
    if (isPosted) return 'bg-[var(--success-green)]';
    return 'bg-[var(--ton-blue)]';
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>
            {onRefresh && (
              <button
                onClick={async () => {
                  setIsRefreshing(true);
                  try { await onRefresh(); } finally { setIsRefreshing(false); }
                }}
                disabled={isRefreshing}
                className="p-2 rounded-lg hover:bg-accent active:scale-90 transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Deal title + status */}
          <div className="flex items-start justify-between mb-1">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{channel.name}</h1>
              <p className="text-sm text-muted-foreground">Deal #{deal.id}</p>
            </div>
            <StatusBadge status={deal.status} />
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{completedSteps}/{totalSteps} steps</span>
            {nextAction && (
              <span className="text-xs font-medium text-[var(--ton-blue)]">{nextAction.label}</span>
            )}
          </div>
          <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor()}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Next Action Banner */}
      {nextAction && (
        <div className={`mx-4 mt-4 p-3 rounded-xl border ${
          nextAction.label === 'Waiting'
            ? 'bg-[var(--pending-amber)]/5 border-[var(--pending-amber)]/20'
            : nextAction.label === 'Ad is Live'
            ? 'bg-[var(--success-green)]/5 border-[var(--success-green)]/20'
            : nextAction.label === 'Posting'
            ? 'bg-primary/5 border-primary/20'
            : 'bg-[var(--ton-blue)]/5 border-[var(--ton-blue)]/20'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              nextAction.label === 'Waiting'
                ? 'bg-[var(--pending-amber)]/15'
                : nextAction.label === 'Ad is Live'
                ? 'bg-[var(--success-green)]/15'
                : nextAction.label === 'Posting'
                ? 'bg-primary/15'
                : 'bg-[var(--ton-blue)]/15'
            }`}>
              {nextAction.label === 'Waiting' && <Clock className="w-5 h-5 text-[var(--pending-amber)]" />}
              {nextAction.label === 'Review Required' && <CheckCircle2 className="w-5 h-5 text-[var(--ton-blue)]" />}
              {nextAction.label === 'Approval Required' && <Wallet className="w-5 h-5 text-[var(--ton-blue)]" />}
              {nextAction.label === 'Ad is Live' && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--success-green)] opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--success-green)]" />
                </span>
              )}
              {nextAction.label === 'Posting' && <Send className="w-5 h-5 text-primary" />}
              {nextAction.label === 'In Progress' && <Clock className="w-5 h-5 text-[var(--ton-blue)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{nextAction.label}</p>
              <p className="text-xs text-muted-foreground">{nextAction.sublabel}</p>
            </div>
          </div>
        </div>
      )}

      {/* Refunded banner */}
      {deal.status === 'REFUNDED' && (
        <div className="mx-4 mt-4 p-4 bg-[var(--error-red)]/5 border border-[var(--error-red)]/20 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--error-red)]/15 flex items-center justify-center flex-shrink-0">
              <XCircle className="w-5 h-5 text-[var(--error-red)]" />
            </div>
            <div>
              <p className="text-sm font-medium">Deal Cancelled</p>
              <p className="text-xs text-muted-foreground">Funds have been refunded to the advertiser</p>
            </div>
          </div>
        </div>
      )}

      {/* Parties */}
      <div className="mx-4 mt-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <img src={channel.avatar} alt={channel.name} className="w-11 h-11 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{channel.name}</p>
              <p className="text-xs text-muted-foreground">{channel.username}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <FormatBadge format={deal.format} size="sm" />
              <span className="text-xs text-muted-foreground">
                {isPublisher ? 'Your channel' : 'Publisher'}
              </span>
            </div>
          </div>

          {/* Amount summary inline */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">
                  {isPublisher ? 'Your payout' : 'Total cost'}
                </p>
                <p className={`text-lg font-bold ${isPublisher ? 'text-[var(--success-green)]' : 'text-foreground'}`}>
                  {isPublisher ? (deal.amount - deal.platformFee).toFixed(2) : Number(deal.totalAmount.toFixed(4))} TON
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Platform fee</p>
                <p className="text-sm text-muted-foreground">{Number(deal.platformFee.toFixed(4))} TON (5%)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creative Preview — Telegram-style */}
      {deal.creativeText && (
        <div className="mx-4 mt-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Ad Creative</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Telegram message bubble style */}
            <div className="p-4">
              <div className="bg-[var(--ton-blue)]/5 border border-[var(--ton-blue)]/10 rounded-2xl rounded-tl-md p-4">
                {deal.creativeImages && deal.creativeImages.length > 0 && (
                  <div className="mb-3 -mx-1">
                    {deal.creativeImages.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Creative ${idx + 1}`}
                        className="w-full rounded-lg mb-2 last:mb-0"
                      />
                    ))}
                  </div>
                )}
                <p className="text-sm whitespace-pre-line leading-relaxed">{deal.creativeText}</p>
                <div className="flex justify-end mt-2">
                  <span className="text-[10px] text-muted-foreground">
                    {channel.username}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline — collapsible */}
      <div className="mx-4 mt-4">
        <button
          onClick={() => setTimelineOpen(!timelineOpen)}
          className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Timeline</span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {completedSteps}/{totalSteps}
            </span>
          </div>
          {timelineOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {timelineOpen && (
          <div className="mt-2 bg-card border border-border rounded-xl p-4">
            <div className="space-y-0">
              {deal.timeline.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.status === 'completed'
                        ? 'bg-[var(--success-green)]'
                        : step.status === 'current'
                        ? 'bg-[var(--pending-amber)] animate-pulse'
                        : 'bg-muted'
                    }`}>
                      {step.status === 'completed' && <CheckCircle2 className="w-4 h-4 text-white" />}
                      {step.status === 'current' && <Clock className="w-3.5 h-3.5 text-white" />}
                      {step.status === 'future' && <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                    </div>
                    {index < deal.timeline.length - 1 && (
                      <div className={`w-0.5 flex-1 min-h-[24px] ${
                        step.status === 'completed' ? 'bg-[var(--success-green)]/40' : 'bg-muted'
                      }`} />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <p className={`text-sm font-medium ${step.status === 'future' ? 'text-muted-foreground' : ''}`}>
                      {step.step}
                    </p>
                    {step.timestamp && (
                      <p className="text-xs text-muted-foreground mt-0.5">{formatDate(step.timestamp)}</p>
                    )}
                    {step.details && (
                      <p className="text-xs text-[var(--ton-blue)] mt-0.5">{step.details}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Deal Details — collapsible */}
      <div className="mx-4 mt-3">
        <button
          onClick={() => setDetailsOpen(!detailsOpen)}
          className="w-full flex items-center justify-between p-3 bg-card border border-border rounded-xl hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Deal Details</span>
          </div>
          {detailsOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {detailsOpen && (
          <div className="mt-2 bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Format</span>
              <FormatBadge format={deal.format} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Deal amount</span>
              <span className="text-sm font-semibold text-[var(--ton-blue)]">{Number(deal.amount.toFixed(4))} TON</span>
            </div>
            {isPublisher && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Your payout</span>
                <span className="text-sm font-semibold text-[var(--success-green)]">
                  {(deal.amount - deal.platformFee).toFixed(2)} TON
                </span>
              </div>
            )}
            {isAdvertiser && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total paid</span>
                <span className="text-sm font-semibold">{Number(deal.totalAmount.toFixed(4))} TON</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Platform fee</span>
              <span className="text-sm">{Number(deal.platformFee.toFixed(4))} TON (5%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Created</span>
              <span className="text-sm">{formatDate(deal.createdAt)}</span>
            </div>

            {/* Signatures */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-2">Signatures</p>
              <div className="flex gap-2">
                <div className={`flex-1 p-2 rounded-lg text-center text-xs ${
                  publisherSigned
                    ? 'bg-[var(--success-green)]/10 text-[var(--success-green)]'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Users className="w-3.5 h-3.5 mx-auto mb-1" />
                  Publisher {publisherSigned ? 'Signed' : 'Pending'}
                </div>
                <div className={`flex-1 p-2 rounded-lg text-center text-xs ${
                  advertiserSigned
                    ? 'bg-[var(--success-green)]/10 text-[var(--success-green)]'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  <Wallet className="w-3.5 h-3.5 mx-auto mb-1" />
                  Advertiser {advertiserSigned ? 'Signed' : 'Pending'}
                </div>
              </div>
            </div>

            {/* Escrow */}
            <div className="pt-2 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Escrow address</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => copyToClipboard(deal.escrowAddress)}
                    className="p-1 hover:bg-accent rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--success-green)]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    href={`https://tonviewer.com/${deal.escrowAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 hover:bg-accent rounded transition-colors"
                    title="View on explorer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </a>
                </div>
              </div>
              <p className="text-[11px] font-mono bg-background p-2 rounded-lg break-all text-muted-foreground">
                {deal.escrowAddress}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Advertiser dispute option (before ad posted) */}
      {isAdvertiser && !isPosted && deal.status !== 'RELEASED' && deal.status !== 'REFUNDED' && onCheckDeal && (
        <div className="mx-4 mt-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-3 text-center">
              If the deal is stuck and 12 hours have passed since your deposit, you can request a refund.
            </p>
            <Button
              onClick={handleCheckDeal}
              variant="outline"
              size="sm"
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

      {/* Error display */}
      {actionError && (
        <div className="mx-4 mt-3">
          <div className="p-3 bg-[var(--error-red)]/10 border border-[var(--error-red)]/20 rounded-xl">
            <p className="text-sm text-[var(--error-red)] text-center">{actionError}</p>
          </div>
        </div>
      )}

      {/* Action Bar */}
      {primaryAction && (
        <div className="mx-4 mt-4">
          {primaryAction.type === 'approve' && (
            <div className="space-y-2">
              <Button
                onClick={handleApprove}
                className="w-full bg-[var(--success-green)] text-white hover:bg-[var(--success-green)]/90 h-12 text-base"
                disabled={isApproving || isRejecting}
              >
                {isApproving ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Approve & Sign
                  </span>
                )}
              </Button>
              <Button
                onClick={handleReject}
                variant="outline"
                className="w-full text-[var(--error-red)] border-[var(--error-red)]/30 hover:bg-[var(--error-red)]/10 h-10"
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
          )}

          {primaryAction.type === 'advertiser-approve' && (
            <Button
              onClick={handleAdvertiserApprove}
              className="w-full bg-primary text-primary-foreground h-12 text-base"
              disabled={isApproving}
            >
              {isApproving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  Approve & Sign
                </span>
              )}
            </Button>
          )}

          {primaryAction.type === 'release' && (
            <Button
              onClick={handleCheckDeal}
              className="w-full bg-[var(--success-green)] text-white hover:bg-[var(--success-green)]/90 h-12 text-base"
              disabled={isChecking}
            >
              {isChecking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verifying...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Unlock className="w-5 h-5" />
                  Release Funds
                </span>
              )}
            </Button>
          )}

          {primaryAction.type === 'dispute' && (
            <Button
              onClick={handleCheckDeal}
              variant="outline"
              className="w-full text-[var(--error-red)] border-[var(--error-red)]/30 hover:bg-[var(--error-red)]/10 h-12 text-base"
              disabled={isChecking}
            >
              {isChecking ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Dispute & Refund
                </span>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
