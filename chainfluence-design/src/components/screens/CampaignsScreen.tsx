import { useState } from 'react';
import { Campaign, ChannelCategory } from '../../types';
import { CampaignCard } from '../CampaignCard';
import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface CampaignsScreenProps {
  campaigns: Campaign[];
  onCampaignClick: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
  userRole: 'publisher' | 'advertiser' | 'both';
}

export function CampaignsScreen({ campaigns, onCampaignClick, onCreateCampaign, userRole }: CampaignsScreenProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<ChannelCategory[]>([]);
  const [sortBy, setSortBy] = useState<'budget' | 'newest' | 'ending' | 'match'>('budget');

  const categories: ChannelCategory[] = ['Crypto', 'DeFi', 'Tech', 'News', 'Education', 'Entertainment', 'Lifestyle', 'Trading', 'NFT', 'Gaming'];

  const toggleCategory = (category: ChannelCategory) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredCampaigns = campaigns
    .filter(c => c.status === 'active')
    .filter(campaign => {
      const matchesSearch = 
        campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        campaign.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = 
        selectedCategories.length === 0 || selectedCategories.includes(campaign.category);

      return matchesSearch && matchesCategory;
    });

  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case 'budget':
        return b.budgetPerChannel - a.budgetPerChannel;
      case 'newest':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'ending':
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'match':
        return 0; // Would calculate match score if we had user's channels
      default:
        return 0;
    }
  });

  if (userRole === 'advertiser') {
    return (
      <div className="pb-20 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-center px-6 max-w-md">
          <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Publisher Feature</h2>
          <p className="text-muted-foreground mb-6">
            This section is for publishers to browse advertiser campaigns. Switch to publisher mode to access campaigns.
          </p>
          <Button onClick={onCreateCampaign} className="bg-primary text-primary-foreground">
            Create Your Own Campaign
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Browse Campaigns</h1>
          {userRole === 'both' && (
            <Button
              size="sm"
              onClick={onCreateCampaign}
              className="bg-primary text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          )}
        </div>
        
        {/* Search Bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search campaigns..."
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
            <option value="budget">Highest Budget</option>
            <option value="newest">Newest</option>
            <option value="ending">Ending Soon</option>
            <option value="match">Best Match</option>
          </select>
        </div>
      </div>

      {/* Campaign List */}
      <div className="p-4">
        {sortedCampaigns.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">No campaigns match your filters</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sortedCampaigns.map((campaign, index) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                onViewDetails={onCampaignClick}
                showMatchIndicator={index === 0 && sortBy === 'match'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
