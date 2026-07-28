import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { cn } from '../ui/utils';

export interface StatItem {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
}

export function StatCard({ label, value, hint, icon: Icon }: StatItem) {
  return (
    <Card className="shadow-none">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">{label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums text-foreground">
              {value}
            </p>
            {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
          </div>
          {Icon && (
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/50" strokeWidth={1.5} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function StatGrid({ stats, className }: { stats: StatItem[]; className?: string }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
