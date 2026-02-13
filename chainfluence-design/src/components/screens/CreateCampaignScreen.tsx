import { useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Upload, Loader2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ChannelCategory, AdFormat } from '../../types';
import { api } from '../../lib/api';

interface CreateCampaignScreenProps {
  onBack: () => void;
  onComplete: () => void;
}

export function CreateCampaignScreen({ onBack, onComplete }: CreateCampaignScreenProps) {
  const [step, setStep] = useState(1);
  
  // Step 1: Campaign Details
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ChannelCategory>('Crypto');
  const [description, setDescription] = useState('');

  // Step 2: Creative & Content
  const [creativeText, setCreativeText] = useState('');
  const [contentGuidelines, setContentGuidelines] = useState('');
  const [creativeImages, setCreativeImages] = useState<{ fileId: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Budget & Requirements
  const [budgetPerChannel, setBudgetPerChannel] = useState('80');
  const [totalBudget, setTotalBudget] = useState('');
  const [selectedFormats, setSelectedFormats] = useState<AdFormat[]>(['1/24', '2/48']);
  const [minSubscribers, setMinSubscribers] = useState(10000);
  const [minEngagement, setMinEngagement] = useState(5);
  const [selectedCategories, setSelectedCategories] = useState<ChannelCategory[]>(['Crypto', 'DeFi']);
  const [deadline, setDeadline] = useState('');

  const categories: ChannelCategory[] = [
    'Crypto', 'DeFi', 'Tech', 'News', 'Education', 
    'Entertainment', 'Lifestyle', 'Trading', 'NFT', 'Gaming'
  ];

  const formats: AdFormat[] = ['test', '1/24', '2/48', '3/72', 'eternal'];

  const toggleFormat = (format: AdFormat) => {
    setSelectedFormats(prev =>
      prev.includes(format)
        ? prev.filter(f => f !== format)
        : [...prev, format]
    );
  };

  const toggleCategory = (cat: ChannelCategory) => {
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await api.uploads.upload(file);
      setCreativeImages((prev) => [
        ...prev,
        { fileId: result.fileId, url: api.uploads.getUrl(result.fileId) },
      ]);
    } catch {
      console.error('Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (fileId: string) => {
    setCreativeImages((prev) => prev.filter((img) => img.fileId !== fileId));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      await api.campaigns.create({
        title,
        description,
        category,
        budget: totalBudget || budgetPerChannel,
        creativeText,
        contentGuidelines,
        creativeImages: creativeImages.map((img) => img.fileId),
        preferredFormats: selectedFormats,
        minSubscribers,
        minEngagement,
        preferredCategories: selectedCategories,
        deadline,
      });
      onComplete();
    } catch {
      console.error('Failed to create campaign');
    } finally {
      setSubmitting(false);
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
        <h1 className="text-xl font-semibold">Create Campaign</h1>
      </div>

      <div className="p-4">
        {renderProgressBar()}

        {/* Step 1: Campaign Details */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Campaign Details</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Tell publishers what you want to promote
              </p>
            </div>

            <div>
              <Label htmlFor="title">Campaign Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., TonSwap DEX Launch Promo"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Category</Label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ChannelCategory)}
                className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Helps publishers find relevant campaigns
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your product/service and what you're looking for..."
                rows={5}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tell publishers about your project and any special requirements
              </p>
            </div>

            <Button
              onClick={() => setStep(2)}
              className="w-full bg-primary text-primary-foreground"
              disabled={!title || !description}
            >
              Next
            </Button>
          </div>
        )}

        {/* Step 2: Creative & Content */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Creative & Content</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Provide the ad content publishers will post
              </p>
            </div>

            <div>
              <Label htmlFor="creative">Ad Copy</Label>
              <Textarea
                id="creative"
                value={creativeText}
                onChange={(e) => setCreativeText(e.target.value)}
                placeholder="Enter the exact text publishers will post..."
                rows={8}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Media Upload</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                className="mt-1 border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer bg-card"
              >
                {uploading ? (
                  <Loader2 className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                )}
                <p className="text-sm text-muted-foreground mb-1">
                  {uploading ? 'Uploading...' : 'Tap to upload images/banners'}
                </p>
                <p className="text-xs text-muted-foreground">PNG, JPG up to 10MB</p>
              </div>
              {creativeImages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {creativeImages.map((img) => (
                    <div key={img.fileId} className="relative w-20 h-20">
                      <img
                        src={img.url}
                        alt="Upload"
                        className="w-full h-full object-cover rounded-lg border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(img.fileId)}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-card border border-border rounded-lg p-4">
              <h3 className="font-medium mb-2">Preview</h3>
              <div className="bg-background rounded-lg p-3">
                {creativeImages.length > 0 && (
                  <img
                    src={creativeImages[0].url}
                    alt="Preview"
                    className="w-full rounded-lg mb-2"
                  />
                )}
                <p className="text-sm whitespace-pre-line">
                  {creativeText || 'Your ad copy will appear here...'}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="guidelines">Content Guidelines (Optional)</Label>
              <Textarea
                id="guidelines"
                value={contentGuidelines}
                onChange={(e) => setContentGuidelines(e.target.value)}
                placeholder="e.g., Must include link button, Pin for full duration, No edits to copy"
                rows={3}
                className="mt-1"
              />
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
                disabled={!creativeText}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Budget & Requirements */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Budget & Requirements</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Set your budget and target audience
              </p>
            </div>

            {/* Budget */}
            <div>
              <Label htmlFor="budget">Budget per Channel (TON)</Label>
              <div className="relative mt-1">
                <Input
                  id="budget"
                  type="text"
                  inputMode="decimal"
                  value={budgetPerChannel}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setBudgetPerChannel(v);
                  }}
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  TON
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                How much you're willing to pay per channel
              </p>
            </div>

            <div>
              <Label htmlFor="totalBudget">Total Campaign Budget (Optional)</Label>
              <div className="relative mt-1">
                <Input
                  id="totalBudget"
                  type="text"
                  inputMode="decimal"
                  value={totalBudget}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^\d*\.?\d*$/.test(v)) setTotalBudget(v);
                  }}
                  className="pr-12"
                  placeholder="Leave empty for unlimited"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  TON
                </span>
              </div>
            </div>

            {/* Preferred Formats */}
            <div>
              <Label>Preferred Formats</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {formats.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => toggleFormat(format)}
                    className={`p-3 rounded-lg border-2 transition-colors ${
                      selectedFormats.includes(format)
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card'
                    }`}
                  >
                    <span className="font-medium">
                      {format === 'eternal' ? 'Eternal' : format}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="space-y-4">
              <h3 className="font-medium">Target Audience</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="minSubs">Min Subscribers</Label>
                  <Input
                    id="minSubs"
                    type="text"
                    inputMode="numeric"
                    value={minSubscribers}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d+$/.test(v)) setMinSubscribers(Number(v) || 0);
                    }}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="minEng">Min Engagement (%)</Label>
                  <Input
                    id="minEng"
                    type="text"
                    inputMode="decimal"
                    value={minEngagement}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setMinEngagement(Number(v) || 0);
                    }}
                    className="mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Preferred Categories</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => toggleCategory(cat)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        selectedCategories.includes(cat)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-accent text-accent-foreground border border-border'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Deadline */}
            <div>
              <Label htmlFor="deadline">Campaign Deadline</Label>
              <Input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accept offers until this date
              </p>
            </div>

            {/* Summary */}
            <div className="bg-accent/50 border border-border rounded-lg p-4 space-y-2">
              <h3 className="font-medium mb-3">Campaign Summary</h3>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="font-medium">{title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Budget:</span>
                  <span className="font-medium">{budgetPerChannel || '0'} TON per channel</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Formats:</span>
                  <span className="font-medium">{selectedFormats.join(', ')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target:</span>
                  <span className="font-medium">{minSubscribers.toLocaleString()}+ subs, {minEngagement}%+ eng</span>
                </div>
              </div>
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
                disabled={!deadline || selectedFormats.length === 0 || submitting}
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Publishing...</>
                ) : (
                  'Publish Campaign'
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
