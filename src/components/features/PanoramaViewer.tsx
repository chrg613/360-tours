import { useEffect, useRef, useState, useCallback } from 'react';
import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin';
import { StereoPlugin } from '@photo-sphere-viewer/stereo-plugin';
import '@photo-sphere-viewer/core/index.css';
import '@photo-sphere-viewer/markers-plugin/index.css';
import type { Scene, Hotspot, TourSettings } from '@/types';
import { useTourEditorStore } from '@/stores';
import { VIEWER_DEFAULTS } from '@/constants';
import { cn } from '@/utils';
import { Smartphone, Glasses, X } from 'lucide-react';
import { Button } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';

interface PanoramaViewerProps {
  scene: Scene;
  hotspots: Hotspot[];
  isEditor?: boolean;
  tourSettings?: TourSettings;
  onHotspotClick?: (hotspot: Hotspot) => void;
  onPositionClick?: (position: { yaw: number; pitch: number }) => void;
  onHotspotDrag?: (hotspotId: string, position: { yaw: number; pitch: number }) => void;
  onSceneChange?: (sceneId: string) => void;
  showControls?: boolean;
  className?: string;
}

interface VRSupport {
  gyroscope: boolean;
  stereo: boolean;
  webxr: boolean;
}

export function PanoramaViewer({
  scene,
  hotspots,
  isEditor = false,
  tourSettings,
  onHotspotClick,
  onPositionClick,
  onHotspotDrag,
  onSceneChange,
  showControls = true,
  className,
}: PanoramaViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersPluginRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gyroscopePluginRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stereoPluginRef = useRef<any>(null);

  const [vrSupport, setVrSupport] = useState<VRSupport>({
    gyroscope: false,
    stereo: false,
    webxr: false,
  });
  const [gyroscopeEnabled, setGyroscopeEnabled] = useState(false);
  const [stereoEnabled, setStereoEnabled] = useState(false);
  const [vrError, setVrError] = useState<string | null>(null);

  const { selectHotspot, setCurrentScene } = useTourEditorStore();

  // Check VR capabilities
  useEffect(() => {
    const checkVrSupport = async () => {
      const support: VRSupport = {
        gyroscope: false,
        stereo: false,
        webxr: false,
      };

      // Check for device orientation (gyroscope)
      if (window.DeviceOrientationEvent) {
        // On iOS 13+, we need to request permission
        if (
          typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
            .requestPermission === 'function'
        ) {
          // Permission will be requested when user clicks the button
          support.gyroscope = true;
        } else {
          // Non-iOS or older iOS
          support.gyroscope = true;
        }
      }

      // Check for WebXR support
      if ('xr' in navigator) {
        try {
          support.webxr = await (navigator as Navigator & { xr: { isSessionSupported: (mode: string) => Promise<boolean> } }).xr.isSessionSupported('immersive-vr');
        } catch {
          support.webxr = false;
        }
      }

      // Stereo mode is available on all devices (cardboard-style)
      support.stereo = true;

      setVrSupport(support);
    };

    checkVrSupport();
  }, []);

  // Initialize viewer
  useEffect(() => {
    if (!containerRef.current) return;

    // Build navbar items based on settings
    const navbarItems: string[] = [];
    if (!isEditor) {
      if (tourSettings?.auto_rotate !== false) {
        navbarItems.push('autorotate');
      }
      navbarItems.push('zoom');
      if (tourSettings?.enable_fullscreen !== false) {
        navbarItems.push('fullscreen');
      }
    }

    // Build plugins array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const plugins: any[] = [
      [MarkersPlugin, { markers: [] }],
    ];

    // Add gyroscope plugin if VR is enabled
    if (tourSettings?.enable_vr !== false) {
      plugins.push([GyroscopePlugin, {
        touchmove: true,
        absolutePosition: false,
        moveMode: 'smooth',
      }]);
    }

    // Add stereo plugin if VR is enabled
    if (tourSettings?.enable_vr !== false) {
      plugins.push([StereoPlugin, {}]);
    }

    const viewer = new Viewer({
      container: containerRef.current,
      panorama: scene.image_url,
      defaultPitch: scene.metadata?.initial_view?.pitch ?? VIEWER_DEFAULTS.defaultPitch,
      defaultYaw: scene.metadata?.initial_view?.yaw ?? VIEWER_DEFAULTS.defaultYaw,
      defaultZoomLvl: scene.metadata?.initial_view?.zoom ?? VIEWER_DEFAULTS.defaultZoom,
      minFov: scene.metadata?.camera?.min_fov ?? VIEWER_DEFAULTS.minFov,
      maxFov: scene.metadata?.camera?.max_fov ?? VIEWER_DEFAULTS.maxFov,
      navbar: isEditor ? false : navbarItems.length > 0 ? navbarItems : false,
      plugins,
    });

    viewerRef.current = viewer;
    markersPluginRef.current = viewer.getPlugin(MarkersPlugin);

    // Get VR plugins if available
    if (tourSettings?.enable_vr !== false) {
      try {
        gyroscopePluginRef.current = viewer.getPlugin(GyroscopePlugin);
        stereoPluginRef.current = viewer.getPlugin(StereoPlugin);
      } catch {
        // Plugins not available
      }
    }

    // Handle click for adding hotspots in editor mode
    if (isEditor && onPositionClick) {
      viewer.addEventListener('click', (e) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = e.data as any;
        // Accept both right-click and regular click for hotspot placement
        if (data?.yaw !== undefined && data?.pitch !== undefined) {
          onPositionClick({
            yaw: data.yaw,
            pitch: data.pitch,
          });
        }
      });
    }

    return () => {
      // Cleanup VR states
      setGyroscopeEnabled(false);
      setStereoEnabled(false);
      viewer.destroy();
      viewerRef.current = null;
      markersPluginRef.current = null;
      gyroscopePluginRef.current = null;
      stereoPluginRef.current = null;
    };
  }, [scene.id, isEditor, onPositionClick, tourSettings]);

  // Update panorama when scene changes
  useEffect(() => {
    if (viewerRef.current && scene.image_url) {
      viewerRef.current.setPanorama(scene.image_url, {
        position: {
          pitch: scene.metadata?.initial_view?.pitch ?? 0,
          yaw: scene.metadata?.initial_view?.yaw ?? 0,
        },
        zoom: scene.metadata?.initial_view?.zoom ?? 50,
      });
    }
  }, [scene.image_url, scene.metadata]);

  // Update markers when hotspots change
  useEffect(() => {
    if (!markersPluginRef.current) return;

    // Clear existing markers
    markersPluginRef.current.clearMarkers();

    // Add new markers
    hotspots.forEach((hotspot) => {
      if (!hotspot.is_active) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markerConfig: any = {
        id: hotspot.id,
        position: {
          yaw: hotspot.position.yaw,
          pitch: hotspot.position.pitch,
        },
        tooltip: hotspot.title || undefined,
        data: hotspot,
        // Enable dragging in editor mode
        draggable: isEditor,
      };

      // Set marker appearance based on type
      switch (hotspot.type) {
        case 'navigation':
          markerConfig.html = `
            <div class="psv-marker-navigation" style="
              width: ${hotspot.icon_size || 32}px;
              height: ${hotspot.icon_size || 32}px;
              background-color: ${hotspot.icon_color || '#5b6ff4'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </div>
          `;
          break;
        case 'info':
          markerConfig.html = `
            <div class="psv-marker-info" style="
              width: ${hotspot.icon_size || 32}px;
              height: ${hotspot.icon_size || 32}px;
              background-color: ${hotspot.icon_color || '#10b981'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            </div>
          `;
          break;
        case 'audio':
          markerConfig.html = `
            <div class="psv-marker-audio" style="
              width: ${hotspot.icon_size || 32}px;
              height: ${hotspot.icon_size || 32}px;
              background-color: ${hotspot.icon_color || '#8b5cf6'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
              </svg>
            </div>
          `;
          break;
        case 'video':
          markerConfig.html = `
            <div class="psv-marker-video" style="
              width: ${hotspot.icon_size || 32}px;
              height: ${hotspot.icon_size || 32}px;
              background-color: ${hotspot.icon_color || '#ef4444'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
          `;
          break;
        case 'link':
          markerConfig.html = `
            <div class="psv-marker-link" style="
              width: ${hotspot.icon_size || 32}px;
              height: ${hotspot.icon_size || 32}px;
              background-color: ${hotspot.icon_color || '#0ea5e9'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
              </svg>
            </div>
          `;
          break;
        default:
          markerConfig.html = `
            <div class="psv-marker-default" style="
              width: ${hotspot.icon_size || 32}px;
              height: ${hotspot.icon_size || 32}px;
              background-color: ${hotspot.icon_color || '#f59e0b'};
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              transition: transform 0.2s;
            ">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </div>
          `;
      }

      markersPluginRef.current?.addMarker(markerConfig);
    });

    // Handle marker clicks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMarkerSelect = (e: any) => {
      const hotspot = e.marker?.data as Hotspot;
      if (!hotspot) return;

      if (isEditor) {
        selectHotspot(hotspot.id);
      } else if (hotspot.type === 'navigation' && hotspot.target_scene_id) {
        setCurrentScene(hotspot.target_scene_id);
        onSceneChange?.(hotspot.target_scene_id);
      }

      onHotspotClick?.(hotspot);
    };

    // Handle marker drag (editor mode only)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleMarkerDropped = (e: any) => {
      const hotspot = e.marker?.data as Hotspot;
      if (!hotspot || !onHotspotDrag) return;

      const newPosition = {
        yaw: e.marker.position.yaw,
        pitch: e.marker.position.pitch,
      };

      onHotspotDrag(hotspot.id, newPosition);
    };

    markersPluginRef.current.addEventListener('select-marker', handleMarkerSelect);

    // Add drag listener in editor mode
    if (isEditor && onHotspotDrag) {
      markersPluginRef.current.addEventListener('marker-dropped', handleMarkerDropped);
    }

    return () => {
      markersPluginRef.current?.removeEventListener('select-marker', handleMarkerSelect);
      if (isEditor && onHotspotDrag) {
        markersPluginRef.current?.removeEventListener('marker-dropped', handleMarkerDropped);
      }
    };
  }, [hotspots, isEditor, selectHotspot, setCurrentScene, onHotspotClick, onSceneChange, onHotspotDrag]);

  // Toggle gyroscope
  const toggleGyroscope = useCallback(async () => {
    if (!gyroscopePluginRef.current) {
      setVrError('Gyroscope not available');
      return;
    }

    try {
      if (gyroscopeEnabled) {
        gyroscopePluginRef.current.stop();
        setGyroscopeEnabled(false);
      } else {
        // Request permission on iOS 13+
        if (
          typeof (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> })
            .requestPermission === 'function'
        ) {
          const permission = await (
            DeviceOrientationEvent as unknown as { requestPermission: () => Promise<string> }
          ).requestPermission();
          if (permission !== 'granted') {
            setVrError('Gyroscope permission denied');
            return;
          }
        }

        await gyroscopePluginRef.current.start();
        setGyroscopeEnabled(true);
        setVrError(null);
      }
    } catch (error) {
      console.error('Gyroscope error:', error);
      setVrError('Failed to enable gyroscope');
    }
  }, [gyroscopeEnabled]);

  // Toggle stereo (VR) mode
  const toggleStereo = useCallback(async () => {
    if (!stereoPluginRef.current) {
      setVrError('VR mode not available');
      return;
    }

    try {
      if (stereoEnabled) {
        stereoPluginRef.current.stop();
        setStereoEnabled(false);
      } else {
        // Enter fullscreen for better VR experience
        if (containerRef.current && !document.fullscreenElement) {
          await containerRef.current.requestFullscreen?.();
        }

        stereoPluginRef.current.start();
        setStereoEnabled(true);
        setVrError(null);

        // Also enable gyroscope if available
        if (gyroscopePluginRef.current && !gyroscopeEnabled && vrSupport.gyroscope) {
          try {
            await gyroscopePluginRef.current.start();
            setGyroscopeEnabled(true);
          } catch {
            // Gyroscope optional for stereo mode
          }
        }
      }
    } catch (error) {
      console.error('Stereo mode error:', error);
      setVrError('Failed to enable VR mode');
    }
  }, [stereoEnabled, gyroscopeEnabled, vrSupport.gyroscope]);

  // Exit stereo mode on fullscreen exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && stereoEnabled) {
        stereoPluginRef.current?.stop();
        setStereoEnabled(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [stereoEnabled]);

  // Check if VR controls should be shown
  const showVrControls = showControls &&
    !isEditor &&
    tourSettings?.enable_vr !== false &&
    (vrSupport.gyroscope || vrSupport.stereo);

  return (
    <div className={cn('relative h-full w-full', className)}>
      <div
        ref={containerRef}
        className="viewer-container h-full w-full"
        style={{ minHeight: '400px' }}
      />

      {/* VR Controls */}
      {showVrControls && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
          <TooltipProvider>
            {/* Gyroscope toggle */}
            {vrSupport.gyroscope && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={gyroscopeEnabled ? 'default' : 'secondary'}
                    size="icon"
                    onClick={toggleGyroscope}
                    className={cn(
                      'rounded-full shadow-lg',
                      gyroscopeEnabled && 'bg-[var(--color-primary-500)]'
                    )}
                  >
                    <Smartphone className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {gyroscopeEnabled ? 'Disable gyroscope' : 'Enable gyroscope control'}
                </TooltipContent>
              </Tooltip>
            )}

            {/* VR/Stereo mode toggle */}
            {vrSupport.stereo && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={stereoEnabled ? 'default' : 'secondary'}
                    size="icon"
                    onClick={toggleStereo}
                    className={cn(
                      'rounded-full shadow-lg',
                      stereoEnabled && 'bg-[var(--color-primary-500)]'
                    )}
                  >
                    <Glasses className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {stereoEnabled ? 'Exit VR mode' : 'Enter VR mode (cardboard)'}
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      )}

      {/* VR Error message */}
      {vrError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-2 rounded-lg bg-[var(--color-error-500)] px-4 py-2 text-white shadow-lg">
            <span className="text-sm">{vrError}</span>
            <button
              onClick={() => setVrError(null)}
              className="hover:opacity-80"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Stereo mode overlay instructions */}
      {stereoEnabled && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="rounded-lg bg-black/70 px-4 py-2 text-white text-sm">
            Place phone in VR headset. Tap screen to exit.
          </div>
        </div>
      )}
    </div>
  );
}
