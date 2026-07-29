import { Scale } from 'lucide-react';
import { cn } from '../ui/utils';

interface BrandMarkProps {
  size?: 'sm' | 'md';
  showText?: boolean;
  className?: string;
}

/** System brand mark — gold scale on card (original Option A look). */
export function BrandMark({ size = 'md', showText = true, className }: BrandMarkProps) {
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';
  const boxSize = size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'brand-mark-box flex shrink-0 items-center justify-center border bg-card',
          boxSize
        )}
        style={{ borderColor: 'color-mix(in srgb, var(--logo, #a68b67) 35%, transparent)' }}
      >
        <Scale
          className={cn(iconSize)}
          style={{ color: 'var(--logo, #a68b67)' }}
          strokeWidth={1.5}
        />
      </div>
      {showText && (
        <div className="min-w-0">
          <p
            className={cn(
              'brand-title font-semibold text-current',
              size === 'sm' ? 'text-[11px]' : 'text-sm'
            )}
          >
            LICP
          </p>
          {size === 'md' && (
            <p className="brand-subtitle mt-1 text-[10px] text-current/60">
              Legal Intelligence
            </p>
          )}
        </div>
      )}
    </div>
  );
}
