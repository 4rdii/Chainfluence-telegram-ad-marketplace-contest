import { AdFormat } from '../types';

interface FormatBadgeProps {
  format: AdFormat;
  size?: 'sm' | 'md';
}

export function FormatBadge({ format, size = 'md' }: FormatBadgeProps) {
  const getFormatLabel = () => {
    switch (format) {
      case 'test':
        return '3min';
      case '1/24':
        return '1/24';
      case '2/48':
        return '2/48';
      case '3/72':
        return '3/72';
      case 'eternal':
        return 'Eternal';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center rounded-md bg-accent text-accent-foreground border border-border ${sizeClasses} font-medium`}>
      {getFormatLabel()}
    </span>
  );
}
