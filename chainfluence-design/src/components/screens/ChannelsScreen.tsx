import { useState } from 'react';
import { Channel, ChannelCategory } from '../../types';
import { ChannelCard } from '../ChannelCard';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface ChannelsScreenProps {
  channels: Channel[];
  onChannelClick: (channel: Channel) => void;
}

export function ChannelsScreen({ channels, onChannelClick }: ChannelsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ChannelCategory[]>([]);
  const [sortBy, setSortBy] = useState<'popular' | 'cheapest' | 'engagement' | 'newest'>('popular');

  const categories: ChannelCategory[] = ['Crypto', 'DeFi', 'Tech', 'News', 'Education', 'Entertainment', 'Lifestyle', 'Trading', 'NFT', 'Gaming'];

  const toggleCategory = (category: ChannelCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredChannels = channels.filter(channel => {
    const matchesSearch = 
      channel.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      channel.username.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = 
      selectedCategories.length === 0 || selectedCategories.includes(channel.category);

    return matchesSearch && matchesCategory;
  });

  const sortedChannels = [...filteredChannels].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.stats.subscribers - a.stats.subscribers;
      case 'cheapest':
        const aMin = Math.min(...a.pricing.filter(p => p.enabled).map(p => p.price));
        const bMin = Math.min(...b.pricing.filter(p => p.enabled).map(p => p.price));
        return aMin - bMin;
      case 'engagement':
        return (b.stats.engagement ?? 0) - (a.stats.engagement ?? 0);
      case 'newest':
        return 0; // Would use createdAt if we had it
      default:
        return 0;
    }
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <h1 className="text-xl font-semibold mb-3">Browse Channels</h1>
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search channels..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-background border-border"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? 'bg-accent' : ''}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-background rounded-lg border border-border">
            <div className="mb-4">
              <label className="text-sm font-medium mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedCategories.includes(category)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground border border-border'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedCategories([]);
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        )}

        {/* Sort */}
        <div className="mt-3">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm"
          >
            <option value="popular">Most Popular</option>
            <option value="cheapest">Cheapest First</option>
            <option value="engagement">Highest Engagement</option>
            <option value="newest">Newest</option>
          </select>
        </div>
      </div>

      {/* Channel List */}
      <div className="p-4">
        {sortedChannels.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No channels match your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                onViewDetails={onChannelClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
