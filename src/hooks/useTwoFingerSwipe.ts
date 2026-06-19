import { useEffect, useRef } from 'react';

interface Options {
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  enabled?: boolean;
  minDistance?: number;
}

export function useTwoFingerSwipe(
  ref: React.RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight, enabled = true, minDistance = 60 }: Options
) {
  const startX = useRef<number | null>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    const el = ref.current;

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;
      startX.current = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      startY.current = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    };
    const onEnd = (e: TouchEvent) => {
      if (startX.current === null) return;
      const endX = e.changedTouches[0]?.clientX ?? startX.current;
      const endY = e.changedTouches[0]?.clientY ?? startY.current ?? 0;
      const dx = endX - startX.current;
      const dy = endY - (startY.current ?? 0);
      if (Math.abs(dx) > minDistance && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx < 0) onSwipeLeft();
        else onSwipeRight();
      }
      startX.current = null;
      startY.current = null;
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [enabled, minDistance, onSwipeLeft, onSwipeRight, ref]);
}
