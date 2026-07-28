import React from 'react';
import { GlobalSearch } from '../search/GlobalSearch';

export function TopSubNav() {
  return (
    <div className="border-t border-border bg-card px-4 py-2.5 lg:px-6">
      <GlobalSearch />
    </div>
  );
}
