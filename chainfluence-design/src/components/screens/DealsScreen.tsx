import { useState } from 'react';
import { Deal, Channel, DealStatus } from '../../types';
import { DealCard } from '../DealCard';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs';
import { Handshake } from 'lucide-react';

interface DealsScreenProps {
  deals: Deal[];
  channels: Channel[];
  onDealClick: (deal: Deal) => void;
}

type DealFilter = 'all' | 'active' | 'completed' | 'disputed';

export function DealsScreen({ deals, channels, onDealClick }: DealsScreenProps) {
  const [filter, setFilter] = useState<DealFilter>('all');

  const getChannelById = (channelId: string) => {
    return channels.find(c => c.id === channelId);
  };

  const filterDeals = (deals: Deal[], filter: DealFilter) => {
    switch (filter) {
      case 'all':
        return deals;
      case 'active':
        return deals.filter(d => !['RELEASED', 'REFUNDED', 'DISPUTED'].includes(d.status));
      case 'completed':
        return deals.filter(d => ['RELEASED', 'REFUNDED'].includes(d.status));
      case 'disputed':
        return deals.filter(d => d.status === 'DISPUTED');
      default:
        return deals;
    }
  };

  const filteredDeals = filterDeals(deals, filter);

  // Sort by most recent first
  const sortedDeals = [...filteredDeals].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const getEmptyMessage = () => {
    switch (filter) {
      case 'active':
        return 'No active deals';
      case 'completed':
        return 'No completed deals';
      case 'disputed':
        return 'No disputed deals';
      default:
        return 'No deals yet';
    }
  };

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <h1 className="text-xl font-semibold mb-4">Deals</h1>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as DealFilter)}>
          <TabsList className="w-full grid grid-cols-4 gap-1">
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="active" className="text-xs">Active</TabsTrigger>
            <TabsTrigger value="completed" className="text-xs">Completed</TabsTrigger>
            <TabsTrigger value="disputed" className="text-xs">Disputed</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Deals List */}
      <div className="p-4">
        {sortedDeals.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Handshake className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">{getEmptyMessage()}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {filter === 'all' && 'Start by browsing channels or campaigns'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDeals.map((deal) => {
              const channel = getChannelById(deal.channelId);
              if (!channel) return null;

              return (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  channel={channel}
                  onClick={onDealClick}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
