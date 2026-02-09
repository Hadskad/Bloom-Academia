'use client';

import { DiagramModal } from './DiagramModal';
import { ScreenOverlay } from './ScreenOverlay';

export function WalkthroughProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <DiagramModal />
      <ScreenOverlay />
    </>
  );
}
