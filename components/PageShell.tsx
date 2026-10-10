'use client';

/* Frame for the pages that aren't the map: the shared top bar, a readable
 * column, and the bottom tab bar on phones. */

import type { ReactNode } from 'react';
import TopBar from './TopBar';
import BottomTabs from './nav/BottomTabs';
import { useTheme } from '@/lib/useTheme';

export default function PageShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const { mode, toggle, setMode } = useTheme();
  return (
    <div className="min-h-full bg-ob-bg">
      <TopBar theme={mode} onToggleTheme={toggle} onTheme={setMode} floating={false} />
      <main
        id="main"
        className={`mx-auto w-full px-4 pb-[calc(56px+env(safe-area-inset-bottom)+32px)] pt-2 lg:pb-16 ${wide ? 'max-w-5xl' : 'max-w-3xl'}`}
      >
        {children}
      </main>
      <BottomTabs />
    </div>
  );
}
