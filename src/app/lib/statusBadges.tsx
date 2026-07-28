import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';

function formatLabel(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const toneClasses: Record<string, string> = {
  default: 'border-border bg-muted/50 text-foreground',
  muted: 'border-border bg-background text-muted-foreground',
  success: 'border-emerald-200/80 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200/80 bg-amber-50 text-amber-900',
  danger: 'border-red-200/80 bg-red-50 text-red-900',
};

const statusTone: Record<string, keyof typeof toneClasses> = {
  compliant: 'success',
  completed: 'success',
  connected: 'success',
  active: 'success',
  confirmed: 'success',
  success: 'success',
  warning: 'warning',
  pending: 'muted',
  scheduled: 'muted',
  in_progress: 'default',
  upcoming: 'muted',
  medium: 'default',
  low: 'muted',
  overdue: 'danger',
  error: 'danger',
  disconnected: 'danger',
  high: 'danger',
  critical: 'danger',
  blocked: 'danger',
  suspended: 'danger',
};

export function StatusBadge({
  status,
  label,
  className,
}: {
  status: string;
  label?: string;
  className?: string;
}) {
  const key = status.toLowerCase();
  const tone = statusTone[key] ?? 'default';
  return (
    <Badge
      variant="outline"
      className={cn(
        'rounded-sm px-2 py-0 text-[11px] font-normal',
        toneClasses[tone],
        className
      )}
    >
      {label ?? formatLabel(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge status={priority} label={formatLabel(priority)} />;
}

/** Neutral chart palette for Recharts — charcoal + gold */
export const CHART = {
  primary: '#1a1a1a',
  secondary: '#a68b67',
  tertiary: '#78716c',
  muted: '#d6cfc7',
  grid: '#f0ebe4',
  success: '#059669',
  warning: '#d97706',
  danger: '#b91c1c',
} as const;

export function chartTooltipStyle() {
  return {
    contentStyle: {
      borderRadius: '6px',
      border: '1px solid #e4e4e7',
      boxShadow: 'none',
      fontSize: '12px',
    },
  };
}
