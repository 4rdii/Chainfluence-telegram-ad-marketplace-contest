import { ChannelCategory } from '../types';

interface CategoryChipProps {
  category: ChannelCategory;
  size?: 'sm' | 'md';
}

export function CategoryChip({ category, size = 'md' }: CategoryChipProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  
  return (
    <span className={`inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 ${sizeClasses}`}>
      {category}
    </span>
  );
}
