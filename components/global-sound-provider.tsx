'use client';

import { useEffect, useRef } from 'react';
import { soundEngine } from '@/lib/sound-engine';

export default function GlobalSoundProvider({ children }: { children: React.ReactNode }) {
  const lastInteraction = useRef(0);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      const target = event.target as HTMLElement | null;
      const interactive = target?.closest('button, a, [role="button"]');
      if (!interactive || (interactive as HTMLButtonElement).disabled) return;
      const now = Date.now();
      if (now - lastInteraction.current < 45) return;
      lastInteraction.current = now;
      soundEngine.playTap();
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, []);

  return children;
}
