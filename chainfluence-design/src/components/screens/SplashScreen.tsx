import { useState } from 'react';
import { Shield, BarChart3, Coins, ChevronRight } from 'lucide-react';

interface SplashScreenProps {
  onGetStarted: () => void;
}

const slides = [
  {
    icon: BarChart3,
    color: 'text-[var(--ton-blue)]',
    bgColor: 'bg-[var(--ton-blue)]/15',
    title: 'Browse Channels',
    description:
      'Discover Telegram channels with verified stats, or create ad campaigns and let publishers come to you.',
  },
  {
    icon: Shield,
    color: 'text-[var(--success-green)]',
    bgColor: 'bg-[var(--success-green)]/15',
    title: 'Escrow Protection',
    description:
      'Funds are locked in trustless escrow managed by a TEE. No one can touch them until conditions are met.',
  },
  {
    icon: Coins,
    color: 'text-[var(--pending-amber)]',
    bgColor: 'bg-[var(--pending-amber)]/15',
    title: 'Automatic Settlement',
    description:
      'Ad stays up for the agreed duration? Publisher gets paid. Removed early? Advertiser gets a refund. Fully automatic.',
  },
];

export function SplashScreen({ onGetStarted }: SplashScreenProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onGetStarted();
    }
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLast = currentSlide === slides.length - 1;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip */}
      <div className="flex justify-end p-4">
        {!isLast && (
          <button
            onClick={onGetStarted}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-2.5 mb-2">
            <svg
              className="w-10 h-10 text-primary"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <h1 className="text-3xl font-bold">Chainfluence</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Trustless Telegram Advertising
          </p>
        </div>

        {/* Slide icon */}
        <div
          className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-8 ${slide.bgColor}`}
        >
          <Icon className={`w-12 h-12 ${slide.color}`} />
        </div>

        {/* Slide content */}
        <h2 className="text-2xl font-semibold mb-3 text-center">
          {slide.title}
        </h2>
        <p className="text-muted-foreground text-center leading-relaxed max-w-[280px]">
          {slide.description}
        </p>
      </div>

      {/* Bottom section */}
      <div className="p-6 pb-10">
        {/* Dots */}
        <div className="flex items-center justify-center gap-2.5 mb-16">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentSlide
                  ? 'bg-primary'
                  : 'bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={handleNext}
          className="w-full bg-primary text-primary-foreground rounded-xl py-4 font-semibold text-base flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
        >
          {isLast ? 'Get Started' : 'Next'}
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
