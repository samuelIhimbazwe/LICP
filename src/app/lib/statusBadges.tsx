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

/** Theme-aware chart palette — reads CSS variables from active option. */
export const CHART = {
  get primary() {
    return cssVar('--chart-1', '#1a1a1a');
  },
  get secondary() {
    return cssVar('--chart-2', '#a68b67');
  },
  get tertiary() {
    return cssVar('--chart-3', '#78716c');
  },
  get muted() {
    return cssVar('--chart-4', '#d6cfc7');
  },
  get grid() {
    return cssVar('--border', '#e4e4e7');
  },
  get success() {
    return cssVar('--chart-4', '#059669');
  },
  get warning() {
    return cssVar('--chart-2', '#d97706');
  },
  get danger() {
    return cssVar('--chart-5', '#b91c1c');
  },
} as const;

function cssVar(name: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function chartColors() {
  return [CHART.primary, CHART.secondary, CHART.tertiary, CHART.muted, CHART.danger];
}

export function chartTooltipStyle() {
  return {
    contentStyle: {
      borderRadius: '6px',
      border: `1px solid ${cssVar('--border', '#e4e4e7')}`,
      background: cssVar('--card', '#ffffff'),
      color: cssVar('--foreground', '#1a1a1a'),
      boxShadow: 'none',
      fontSize: '12px',
    },
  };
}
