import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';

export interface QuickAction {
  label: string;
  icon?: LucideIcon;
  primary?: boolean;
  onClick?: () => void;
}

export function QuickActionsBar({ actions }: { actions: QuickAction[] }) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex flex-wrap gap-2 p-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.label}
              variant={action.primary ? 'default' : 'outline'}
              size="sm"
              className="h-8 text-[13px] font-normal"
              onClick={action.onClick}
            >
              {Icon && <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
              {action.label}
            </Button>
          );
        })}
      </CardContent>
    </Card>
  );
}
