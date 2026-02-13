import { DealStatus } from '../types';

interface StatusBadgeProps {
  status: DealStatus | 'active' | 'paused' | 'completed' | 'pending' | 'accepted' | 'declined';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const getStatusStyles = () => {
    switch (status) {
      case 'DEPOSITED':
      case 'ACCEPTED':
      case 'APPROVED':
      case 'pending':
      case 'CREATIVE_PENDING':
      case 'CREATIVE_CHANGES_REQUESTED':
        return 'bg-[var(--pending-amber)]/20 text-[var(--pending-amber)] border-[var(--pending-amber)]/30';
      case 'POSTED':
      case 'accepted':
      case 'active':
        return 'bg-[var(--error-red)]/20 text-[var(--error-red)] border-[var(--error-red)]/30';
      case 'RELEASED':
      case 'completed':
        return 'bg-[var(--success-green)]/20 text-[var(--success-green)] border-[var(--success-green)]/30';
      case 'REFUNDED':
      case 'DISPUTED':
      case 'declined':
        return 'bg-[var(--error-red)]/20 text-[var(--error-red)] border-[var(--error-red)]/30';
      case 'paused':
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
      default:
        return 'bg-muted text-muted-foreground border-muted-foreground/30';
    }
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'DEPOSITED':
      case 'ACCEPTED':
      case 'APPROVED':
        return 'Pending Action';
      case 'POSTED':
        return 'Live';
      case 'RELEASED':
        return 'Released';
      case 'REFUNDED':
        return 'Refunded';
      case 'DISPUTED':
        return 'Disputed';
      case 'CREATIVE_PENDING':
        return 'Creative Pending';
      case 'CREATIVE_CHANGES_REQUESTED':
        return 'Changes Requested';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const isLive = status === 'POSTED';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${getStatusStyles()} ${sizeClasses}`}>
      {isLive && (
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--error-red)] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--error-red)]" />
        </span>
      )}
      {getStatusLabel()}
    </span>
  );
}
