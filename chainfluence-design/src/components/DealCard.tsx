import { Deal, Channel } from '../types';
import { StatusBadge } from './StatusBadge';
import { FormatBadge } from './FormatBadge';
import { ChevronRight } from 'lucide-react';

interface DealCardProps {
  deal: Deal;
  channel: Channel;
  onClick: (deal: Deal) => void;
}

export function DealCard({ deal, channel, onClick }: DealCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <button
      onClick={() => onClick(deal)}
      className="w-full bg-card border border-border rounded-xl p-4 hover:border-primary/50 transition-colors text-left"
    >
      <div className="flex items-start gap-3">
        <img
          src={channel.avatar}
          alt={channel.name}
          className="w-12 h-12 rounded-full bg-muted flex-shrink-0"
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-medium truncate">{channel.name}</h3>
            <StatusBadge status={deal.status} size="sm" />
          </div>
          
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <FormatBadge format={deal.format} size="sm" />
            <span className="text-sm text-[var(--ton-blue)] font-medium">{deal.amount} TON</span>
          </div>
          
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{formatDate(deal.scheduledDate)}</span>
            <span>Deal #{deal.id}</span>
          </div>
        </div>
        
        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      </div>
    </button>
  );
}
