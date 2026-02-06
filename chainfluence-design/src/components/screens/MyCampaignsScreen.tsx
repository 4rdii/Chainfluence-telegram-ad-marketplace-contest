import { useState } from 'react';
import { ArrowLeft, Plus, Rocket, MoreVertical, Pause, Play, Trash2 } from 'lucide-react';
import { Campaign } from '../../types';
import { CategoryChip } from '../CategoryChip';
import { StatusBadge } from '../StatusBadge';

interface MyCampaignsScreenProps {
  campaigns: Campaign[];
  onBack: () => void;
  onCampaignClick: (campaign: Campaign) => void;
  onCreateCampaign: () => void;
  onPause: (campaignId: string) => void;
  onResume: (campaignId: string) => void;
  onDelete: (campaignId: string) => void;
}

type CampaignFilter = 'active' | 'paused' | 'completed';

export function MyCampaignsScreen({
  campaigns,
  onBack,
  onCampaignClick,
  onCreateCampaign,
  onPause,
  onResume,
  onDelete,
}: MyCampaignsScreenProps) {
  const [filter, setFilter] = useState<CampaignFilter>('active');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const filtered = campaigns.filter((c) => c.status === filter);

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const counts = {
    active: campaigns.filter((c) => c.status === 'active').length,
    paused: campaigns.filter((c) => c.status === 'paused').length,
    completed: campaigns.filter((c) => c.status === 'completed').length,
  };

  const getDaysLeft = (deadline: string) => {
    const diff = new Date(deadline).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days < 0) return 'Expired';
    if (days === 0) return 'Expires today';
    if (days === 1) return '1 day left';
    return `${days} days left`;
  };

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1 -ml-1 hover:bg-accent rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-semibold">My Campaigns</h1>
          </div>
          <button
            onClick={onCreateCampaign}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          {(['active', 'paused', 'completed'] as CampaignFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filter === tab
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {counts[tab] > 0 && ` (${counts[tab]})`}
            </button>
          ))}
        </div>
      </div>

      {/* Campaign list */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 px-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Rocket className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            No {filter} campaigns
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === 'active' &&
              'Create a campaign and let publishers come to you'}
          </p>
          {filter === 'active' && (
            <button
              onClick={onCreateCampaign}
              className="mt-4 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-4">
          {sorted.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-card border border-border rounded-xl overflow-hidden"
            >
              {/* Card header */}
              <button
                onClick={() => onCampaignClick(campaign)}
                className="w-full text-left p-4 hover:bg-card/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate">
                      {campaign.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <CategoryChip category={campaign.category} />
                      <StatusBadge status={campaign.status} size="sm" />
                    </div>
                  </div>
                  <div className="relative flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === campaign.id ? null : campaign.id);
                      }}
                      className="p-1 hover:bg-accent rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </button>

                    {/* Dropdown menu */}
                    {menuOpen === campaign.id && (
                      <div className="absolute right-0 top-8 w-40 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                        {campaign.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onPause(campaign.id);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                          >
                            <Pause className="w-4 h-4" />
                            Pause
                          </button>
                        )}
                        {campaign.status === 'paused' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onResume(campaign.id);
                              setMenuOpen(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-accent transition-colors text-left"
                          >
                            <Play className="w-4 h-4" />
                            Resume
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(campaign.id);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[var(--error-red)] hover:bg-accent transition-colors text-left"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Budget and deadline */}
                <div className="flex items-center gap-4 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Budget</p>
                    <p className="text-sm font-semibold">
                      {campaign.budgetPerChannel} TON
                      <span className="text-xs text-muted-foreground font-normal">
                        {' '}/ channel
                      </span>
                    </p>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div>
                    <p className="text-xs text-muted-foreground">Deadline</p>
                    <p className="text-sm font-semibold">{getDaysLeft(campaign.deadline)}</p>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-1">
                  <div className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-semibold">{campaign.offerCount}</p>
                    <p className="text-xs text-muted-foreground">Offers</p>
                  </div>
                  <div className="flex-1 bg-[var(--success-green)]/10 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-semibold text-[var(--success-green)]">
                      {campaign.acceptedCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Accepted</p>
                  </div>
                  <div className="flex-1 bg-[var(--ton-blue)]/10 rounded-lg px-3 py-2 text-center">
                    <p className="text-lg font-semibold text-[var(--ton-blue)]">
                      {campaign.liveCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Live</p>
                  </div>
                </div>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
