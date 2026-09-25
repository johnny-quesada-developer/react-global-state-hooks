import type { ReactNode } from 'react';

export function Badge({ children }: { children: ReactNode }) {
  return <span className="ml-2 rounded-sm bg-yellow px-2 text-xs text-text">{children}</span>;
}
