import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { cn } from '../ui/utils';

interface DashboardSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function DashboardSection({
  title,
  description,
  children,
  className,
  action,
}: DashboardSectionProps) {
  return (
    <Card className={cn('shadow-none', className)}>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="mt-1 text-[13px]">{description}</CardDescription>
          )}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
