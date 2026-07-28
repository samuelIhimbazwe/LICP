import * as React from 'react';
import { TabsList } from '../ui/tabs';
import { cn } from '../ui/utils';

/** Scrollable underline tab bar — matches Compliance, Contracts, and other module pages. */
export function ModuleTabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  return (
    <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <TabsList
        className={cn(
          'h-auto min-h-9 w-max min-w-full flex-nowrap justify-start gap-4 border-b border-border bg-transparent px-0 sm:gap-6',
          className
        )}
        {...props}
      >
        {children}
      </TabsList>
    </div>
  );
}
