import React from 'react';
import { BrandMark } from './BrandMark';
import { ThemeToggle } from './ThemeToggle';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
}

export function AuthLayout({ children, title, subtitle, footer }: AuthLayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-[360px]">
          <div className="mb-10 flex flex-col items-center text-center">
            <BrandMark size="md" />
            <div className="brand-divider mt-6" />
            <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Internal organisation access only
            </p>
          </div>

          {(title || subtitle) && (
            <div className="mb-6 text-center">
              {title && (
                <h1 className="brand-title text-lg font-semibold uppercase tracking-[0.1em] text-foreground">{title}</h1>
              )}
              {subtitle && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{subtitle}</p>
              )}
            </div>
          )}

          {children}
        </div>
      </div>

      {footer && (
        <footer className="px-6 py-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          {footer}
        </footer>
      )}
    </div>
  );
}
