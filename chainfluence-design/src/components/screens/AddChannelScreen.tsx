import { useState } from 'react';
import { ArrowLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { formatStat } from '../../lib/format-stat';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { ChannelCategory, FormatPricing } from '../../types';
import { CategoryChip } from '../CategoryChip';
import { api } from '../../lib/api';
import { adaptChannel } from '../../lib/adapters';

interface AddChannelScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

type ChannelType = 'public' | 'private';

/** Parse private channel input: link (t.me/c/123/2), short ID (123), or full ID (-100123). Returns channelId for API. */
function parsePrivateChannelInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // t.me/c/3253146149/2 or t.me/c/3253146149
  const linkMatch = trimmed.match(/t\.me\/c\/(\d+)(?:\/\d+)?/);
  if (linkMatch) {
    const num = parseInt(linkMatch[1], 10);
    return -(1000000000000 + num); // -1003253146149 format for Telegram supergroups
  }

  // Just digits: 3253146149 or full ID: -1003253146149
  const numOnly = trimmed.replace(/[^0-9-]/g, '');
  if (/^-?\d+$/.test(numOnly)) {
    const n = parseInt(numOnly, 10);
    if (n < -1e12) return n; // Already full ID (-100...)
    if (n >= 0) return -(1000000000000 + n); // Add -100 prefix
    return n;
  }
  return null;
}

export function AddChannelScreen({ onBack, onComplete }: AddChannelScreenProps) {
  const [step, setStep] = useState(1);
  const [channelType, setChannelType] = useState<ChannelType>('public');
  const [channelUsername, setChannelUsername] = useState('');
  const [channelPrivateInput, setChannelPrivateInput] = useState('');
  const [verified, setVerified] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ChannelCategory>('Crypto');
  const [pricing, setPricing] = useState<FormatPricing[]>([
    { format: '1/24', price: 0, enabled: false, description: 'Pinned for 24 hours' },
    { format: '2/48', price: 0, enabled: false, description: 'Stay for 48 hours' },
    { format: '3/72', price: 0, enabled: false, description: 'Stay for 72 hours' },
    { format: 'eternal', price: 0, enabled: false, description: 'Permanent post' },
  ]);

  const categories: ChannelCategory[] = [
    'Crypto', 'DeFi', 'Tech', 'News', 'Education', 
    'Entertainment', 'Lifestyle', 'Trading', 'NFT', 'Gaming'
  ];

  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [channelId, setChannelId] = useState<string | null>(null);
  const [channelTitle, setChannelTitle] = useState('');
  const [channelSubs, setChannelSubs] = useState(0);
  const [channelAvgViews, setChannelAvgViews] = useState<number | null>(null);
  const [channelEngagement, setChannelEngagement] = useState<number | null>(null);
  const [channelPostsPerWeek, setChannelPostsPerWeek] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [priceStrings, setPriceStrings] = useState<Record<string, string>>({});

  const handleVerifyChannel = async () => {
    setVerifying(true);
    setVerifyError('');
    try {
      const payload =
        channelType === 'public'
          ? { username: channelUsername.replace(/^@/, '') }
          : (() => {
              const channelId = parsePrivateChannelInput(channelPrivateInput);
              if (channelId === null) throw new Error('Invalid link or ID. Use t.me/c/123 or -100123...');
              return { channelId };
            })();

      const result = await api.channels.create(payload);
      setChannelId(result.id);
      const adapted = adaptChannel(result);
      setChannelTitle(adapted.name);
      setChannelSubs(adapted.stats.subscribers);
      setChannelAvgViews(adapted.stats.avgViews ?? null);
      setChannelEngagement(adapted.stats.engagement ?? null);
      setChannelPostsPerWeek(adapted.stats.postsPerWeek ?? null);
      setVerified(true);
      // Fetch live stats via GramJS (public channels only)
      try {
        const stats = await api.channels.getStats(result.id);
        setChannelSubs(stats.subscriberCount);
        if (stats.avgViews != null) setChannelAvgViews(stats.avgViews);
        if (stats.engagementRate != null) setChannelEngagement(stats.engagementRate);
      } catch { /* private channels or MTProto not configured */ }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to verify channel';
      setVerifyError(message);
    } finally {
      setVerifying(false);
    }
  };

  const updatePricing = (format: string, field: 'price' | 'enabled', value: number | boolean) => {
    setPricing(prev => prev.map(p => 
      p.format === format ? { ...p, [field]: value } : p
    ));
  };

  const handleComplete = async () => {
    if (!channelId) return;
    setSaving(true);
    try {
      await api.channels.update(channelId, {
        category: selectedCategory,
        pricing,
      });
      onComplete();
    } catch (err) {
      console.error('Failed to save channel details:', err);
      onComplete();
    } finally {
      setSaving(false);
    }
  };

  const renderProgressBar = () => (
    <div className="flex items-center gap-2 mb-6">
      {[1, 2, 3].map((s) => (
        <div key={s} className="flex items-center flex-1">
          <div className={`h-1 w-full rounded-full transition-colors ${
            s <= step ? 'bg-primary' : 'bg-muted'
          }`} />
        </div>
      ))}
    </div>
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
        <h1 className="text-xl font-semibold">Add Channel</h1>
      </div>

      <div className="p-4">
        {renderProgressBar()}

        {/* Step 1: Connect Channel */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Connect Your Channel</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You must add @chainfluence_miniapp_bot as admin to your channel first
              </p>
            </div>

            {/* Public vs Private toggle */}
            <div>
              <Label>Channel type</Label>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => { setChannelType('public'); setVerifyError(''); setVerified(false); }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    channelType === 'public'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Public (@username)
                </button>
                <button
                  type="button"
                  onClick={() => { setChannelType('private'); setVerifyError(''); setVerified(false); }}
                  className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    channelType === 'private'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  Private (link)
                </button>
              </div>
            </div>

            {channelType === 'public' ? (
              <div>
                <Label htmlFor="username">Channel Username</Label>
                <Input
                  id="username"
                  value={channelUsername}
                  onChange={(e) => setChannelUsername(e.target.value)}
                  placeholder="@channel_username"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter your public channel username
                </p>
              </div>
            ) : (
              <div>
                <Label htmlFor="private">Private Channel Link or ID</Label>
                <Input
                  id="private"
                  value={channelPrivateInput}
                  onChange={(e) => setChannelPrivateInput(e.target.value)}
                  placeholder="https://t.me/c/3253146149/2 or -1003253146149"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste the channel link or ID. We add -100 automatically
                </p>
              </div>
            )}

            <Button
              onClick={handleVerifyChannel}
              className="w-full"
              disabled={
                verified ||
                verifying ||
                (channelType === 'public' ? !channelUsername.trim() : !channelPrivateInput.trim())
              }
            >
              {verifying ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
              ) : verified ? (
                'Verified ✓'
              ) : (
                'Verify Channel'
              )}
            </Button>

            {verifyError && (
              <div className="bg-[var(--error-red)]/10 border border-[var(--error-red)]/30 rounded-lg p-4">
                <p className="text-sm text-[var(--error-red)]">{verifyError}</p>
              </div>
            )}

            {verified && (
              <div className="bg-[var(--success-green)]/10 border border-[var(--success-green)]/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <img
                    src={`https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(channelTitle)}`}
                    alt="Channel"
                    className="w-12 h-12 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{channelTitle}</h3>
                      <CheckCircle2 className="w-4 h-4 text-[var(--success-green)]" />
                    </div>
                    <p className="text-sm text-muted-foreground">{channelType === 'public' ? channelUsername : 'Private channel'}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {channelSubs.toLocaleString()} subscribers · {formatStat(channelAvgViews)} avg views
                    </p>
                    <p className="text-xs text-[var(--success-green)] mt-1">Bot is admin: Verified</p>
                  </div>
                </div>
              </div>
            )}

            <Button
              onClick={() => setStep(2)}
              className="w-full bg-primary text-primary-foreground"
              disabled={!verified}
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Channel Stats */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Channel Statistics</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Stats fetched automatically from Telegram.
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span className="text-xs text-muted-foreground">Subscribers</span>
                </div>
                <p className="text-2xl font-semibold">{channelSubs.toLocaleString()}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="text-xs text-muted-foreground">Avg Views</span>
                </div>
                <p className="text-2xl font-semibold">{formatStat(channelAvgViews)}</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <span className="text-xs text-muted-foreground">Engagement</span>
                </div>
                <p className="text-2xl font-semibold">{
                  channelEngagement != null ? `${channelEngagement.toFixed(1)}%` : 'n/a'
                }</p>
              </div>

              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-muted-foreground">Posts/Week</span>
                </div>
                <p className="text-2xl font-semibold">{channelPostsPerWeek != null ? channelPostsPerWeek : 'n/a'}</p>
              </div>
            </div>

            {/* Category Selection */}
            <div>
              <Label>Category</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-accent text-accent-foreground border border-border'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(1)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={() => setStep(3)}
                className="flex-1 bg-primary text-primary-foreground"
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Set Pricing */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Set Your Pricing</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Enable ad formats and set your prices
              </p>
            </div>

            {/* Pricing Cards */}
            <div className="space-y-4">
              {pricing.map((p) => (
                <div key={p.format} className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium mb-1">{p.format === 'eternal' ? 'Eternal' : p.format}</h3>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={p.enabled}
                        onChange={(e) => updatePricing(p.format, 'enabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {p.enabled && (
                    <div className="relative">
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={priceStrings[p.format] ?? (p.price ? String(p.price) : '')}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === '' || /^\d*\.?\d*$/.test(v)) {
                            setPriceStrings((prev: Record<string, string>) => ({ ...prev, [p.format]: v }));
                            const num = parseFloat(v);
                            if (!isNaN(num)) updatePricing(p.format, 'price', num);
                            else if (v === '') updatePricing(p.format, 'price', 0);
                          }
                        }}
                        placeholder="Enter price"
                        className="pr-12"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        TON
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setStep(2)}
                variant="outline"
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                className="flex-1 bg-primary text-primary-foreground"
                disabled={saving || !pricing.some(p => p.enabled && p.price > 0)}
              >
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                ) : (
                  'List Channel'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
