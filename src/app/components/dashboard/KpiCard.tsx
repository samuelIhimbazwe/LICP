import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useNavigate } from 'react-router';
import { Card, CardContent } from '../ui/card';
import { cn } from '../ui/utils';
import type { HeadlineKpi, RagStatus } from '../../types/analytics';

const ragStyles: Record<RagStatus, string> = {
  green: 'bg-emerald-500',
  amber: 'bg-amber-500',
  red: 'bg-red-500',
  neutral: 'bg-muted-foreground/40',
};

function TrendBadge({
  trend,
  invert,
  delta,
  label,
}: {
  trend: HeadlineKpi['trend'];
  invert?: boolean;
  delta?: number;
  label?: string;
}) {
  const good =
    trend === 'stable' ? null : invert ? trend === 'down' : trend === 'up';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <div
      className={cn(
        'mt-2 flex items-center gap-1 text-[12px]',
        trend === 'stable' && 'text-muted-foreground',
        good === true && 'text-emerald-700 dark:text-emerald-400',
        good === false && 'text-red-600 dark:text-red-400'
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      {delta !== undefined && (
        <span className="tabular-nums font-medium">
          {delta > 0 ? '+' : ''}
          {delta}
          {typeof delta === 'number' && Math.abs(delta) < 50 ? '' : ''}
        </span>
      )}
      {label && <span className="text-muted-foreground">{label}</span>}
    </div>
  );
}

function MiniSpark({ values, invert }: { values: number[]; invert?: boolean }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const w = 64;
  const h = 24;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  const stroke = invert ? 'var(--chart-5)' : 'var(--chart-2)';
  return (
    <svg width={w} height={h} className="shrink-0 opacity-80" aria-hidden>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" points={points} />
    </svg>
  );
}

export function KpiCard({ kpi }: { kpi: HeadlineKpi }) {
  const navigate = useNavigate();
  const clickable = Boolean(kpi.href);

  return (
    <Card
      className={cn(
        'shadow-none transition-colors',
        clickable && 'cursor-pointer hover:border-brand/40'
      )}
      onClick={() => kpi.href && navigate(kpi.href)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('h-1.5 w-1.5 rounded-full', ragStyles[kpi.status])} />
              <p className="text-[13px] text-muted-foreground">{kpi.label}</p>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {kpi.displayValue}
            </p>
            {kpi.targetLabel && (
              <p className="mt-1 text-[11px] text-muted-foreground">{kpi.targetLabel}</p>
            )}
            <TrendBadge
              trend={kpi.trend}
              invert={kpi.invertTrend}
              delta={kpi.delta}
              label={kpi.deltaLabel}
            />
          </div>
          {kpi.sparkline && kpi.sparkline.length > 1 && (
            <MiniSpark values={kpi.sparkline} invert={kpi.invertTrend} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiGrid({ kpis, className }: { kpis: HeadlineKpi[]; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 xl:grid-cols-3', className)}>
      {kpis.map((kpi) => (
        <KpiCard key={kpi.id} {...{ kpi }} />
      ))}
    </div>
  );
}
