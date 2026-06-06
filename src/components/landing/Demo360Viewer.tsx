import { useEffect, useRef } from 'react';
import '@photo-sphere-viewer/core/index.css';
import { cn } from '@/utils';

interface Demo360ViewerProps {
  className?: string;
}

export function Demo360Viewer({ className }: Demo360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<unknown>(null);

  useEffect(() => {
    let viewer: unknown;
    let startDelayTimer: ReturnType<typeof setTimeout> | undefined;
    let rotateIntervalId: ReturnType<typeof setInterval> | undefined;

    const initViewer = async () => {
      if (!containerRef.current || viewerRef.current) return;

      try {
        const { Viewer } = await import('@photo-sphere-viewer/core');

        viewer = new Viewer({
          container: containerRef.current,
          panorama: 'https://photo-sphere-viewer-data.netlify.app/assets/sphere.jpg',
          defaultPitch: 0.1,
          defaultYaw: 0,
          navbar: false,
          loadingTxt: '',
          touchmoveTwoFingers: true,
          mousewheelCtrlKey: true,
        });

        viewerRef.current = viewer;

        startDelayTimer = setTimeout(() => {
          if (viewer && typeof (viewer as { rotate: (options: unknown) => void }).rotate === 'function') {
            let yaw = 0;
            rotateIntervalId = setInterval(() => {
              if (!viewerRef.current) {
                clearInterval(rotateIntervalId);
                return;
              }
              yaw += 0.002;
              try {
                (viewer as { rotate: (options: { yaw: number; pitch: number }) => void }).rotate({
                  yaw: yaw,
                  pitch: 0.1,
                });
              } catch {
                clearInterval(rotateIntervalId);
              }
            }, 16);
          }
        }, 1500);
      } catch (error) {
        console.error('Failed to initialize 360 viewer:', error);
      }
    };

    initViewer();

    return () => {
      if (startDelayTimer) clearTimeout(startDelayTimer);
      if (rotateIntervalId) clearInterval(rotateIntervalId);
      if (viewerRef.current && typeof (viewerRef.current as { destroy: () => void }).destroy === 'function') {
        try {
          (viewerRef.current as { destroy: () => void }).destroy();
        } catch {
          // Ignore cleanup errors
        }
      }
      viewerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#0A0A0B]',
        'shadow-[0_25px_60px_-15px_rgba(0,0,0,0.3)]',
        className
      )}
    />
  );
}
