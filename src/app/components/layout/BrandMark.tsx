import { Scale } from 'lucide-react';
import { cn } from '../ui/utils';

interface BrandMarkProps {
  size?: 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

/** System brand mark (signup, sidebar, auth) — LICP Scale icon. */
export function BrandMark({ size = 'md', showText = true, className }: BrandMarkProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const boxSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-sm border border-brand/30 bg-card',
          boxSize
        )}
      >
        <Scale className={cn(iconSize, 'text-brand')} strokeWidth={1.5} />
      </div>
      {showText && (
        <div className="min-w-0">
          <p
            className={cn(
              'brand-title font-semibold uppercase text-foreground',
              size === 'sm' ? 'text-[11px]' : 'text-sm'
            )}
          >
            LICP
          </p>
          {size === 'md' && (
            <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Legal Intelligence
            </p>
          )}
        </div>
      )}
    </div>
  );
}
