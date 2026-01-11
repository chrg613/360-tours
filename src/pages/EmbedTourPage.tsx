import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Expand, Minimize } from 'lucide-react';
import { PageLoader, Button } from '@/components/ui';
import { toursApi } from '@/api';
import { PanoramaViewer } from '@/components/features/PanoramaViewer';
import { FloorPlanOverlay } from '@/components/features/FloorPlanOverlay';
import { HotspotContentModal } from '@/components/features/HotspotContentModal';
import { useTourEditorStore } from '@/stores';
import { cn } from '@/utils';
import type { Hotspot } from '@/types';

// Generate a session ID for analytics tracking
function getSessionId(): string {
  let sessionId = sessionStorage.getItem('tour_session_id');
  if (!sessionId) {
    sessionId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('tour_session_id', sessionId);
  }
  return sessionId;
}

// PostMessage event types for parent communication
interface EmbedMessage {
  type: 'ready' | 'sceneChange' | 'hotspotClick' | 'fullscreenChange' | 'error';
  tourId: string;
  data?: Record<string, unknown>;
}

export function EmbedTourPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { currentSceneId, setCurrentScene, setCurrentTour } = useTourEditorStore();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [showHotspotModal, setShowHotspotModal] = useState(false);
  const sessionIdRef = useRef<string>(getSessionId());

  // URL parameter configuration
  const startSceneId = searchParams.get('scene');
  const autoplay = searchParams.get('autoplay') !== '0';
  const showNavbar = searchParams.get('navbar') !== '0';
  const showBranding = searchParams.get('branding') !== '0';
  const minimalChrome = searchParams.get('minimal') === '1';
  const autoHideControls = searchParams.get('autohide') === '1';

  // Use public API endpoints (no authentication required for embeds)
  const { data: tour, isLoading: isLoadingTour, error: tourError } = useQuery({
    queryKey: ['public-tour', id],
    queryFn: () => toursApi.getPublicTour(id!),
    enabled: !!id,
  });

  // Scenes are included in tour response from public API
  const scenes = tour?.scenes;
  const isLoadingScenes = isLoadingTour;
  const scenesError = null;

  // Send message to parent window
  const postMessage = useCallback((message: EmbedMessage) => {
    if (window.parent !== window) {
      window.parent.postMessage(message, '*');
    }
  }, []);

  // Track analytics events
  const trackEvent = useCallback(
    async (eventType: string, sceneId?: string, hotspotId?: string) => {
      if (!id) return;
      try {
        await toursApi.trackEvent(id, {
          event_type: eventType,
          scene_id: sceneId,
          hotspot_id: hotspotId,
          session_id: sessionIdRef.current,
        });
      } catch (error) {
        // Silently fail analytics tracking
        console.debug('Analytics tracking failed:', error);
      }
    },
    [id]
  );

  // Handle hotspot clicks for non-navigation types
  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    // Track hotspot click
    trackEvent('hotspot_click', currentSceneId || undefined, hotspot.id);

    // Navigation is handled inside PanoramaViewer
    if (hotspot.type === 'navigation') return;

    // Notify parent of hotspot click
    postMessage({
      type: 'hotspotClick',
      tourId: id!,
      data: {
        hotspotId: hotspot.id,
        hotspotType: hotspot.type,
        hotspotTitle: hotspot.title,
      },
    });

    // For link hotspots, open directly without modal if URL exists
    if (hotspot.type === 'link') {
      const content = hotspot.content as { url?: string; target?: '_blank' | '_self' } | null;
      if (content?.url) {
        window.open(content.url, content.target || '_blank');
        return;
      }
    }

    // For all other types, show the modal
    setActiveHotspot(hotspot);
    setShowHotspotModal(true);
  }, [id, postMessage, trackEvent, currentSceneId]);

  // Initialize tour in store and set initial scene
  useEffect(() => {
    if (tour && scenes) {
      setCurrentTour({ ...tour, scenes });

      const sortedScenes = [...scenes].sort((a, b) => a.order_index - b.order_index);
      const initialScene =
        startSceneId ||
        tour.settings?.initial_scene_id ||
        sortedScenes[0]?.id;

      if (initialScene && initialScene !== currentSceneId) {
        setCurrentScene(initialScene);
      }

      // Notify parent that embed is ready
      postMessage({
        type: 'ready',
        tourId: id!,
        data: {
          title: tour.title,
          sceneCount: scenes.length,
          currentSceneId: initialScene,
        },
      });
    }
  }, [tour, scenes, startSceneId, setCurrentTour, setCurrentScene, currentSceneId, id, postMessage]);

  // Notify parent on scene change and track analytics
  useEffect(() => {
    if (currentSceneId && scenes) {
      // Track scene view
      trackEvent('scene_view', currentSceneId);

      const scene = scenes.find((s) => s.id === currentSceneId);
      postMessage({
        type: 'sceneChange',
        tourId: id!,
        data: {
          sceneId: currentSceneId,
          sceneTitle: scene?.title,
          sceneIndex: scenes.findIndex((s) => s.id === currentSceneId),
        },
      });
    }
  }, [currentSceneId, scenes, id, postMessage, trackEvent]);

  // Listen for messages from parent
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;

      const { type, sceneId } = event.data;

      switch (type) {
        case 'goToScene':
          if (sceneId && scenes?.some((s) => s.id === sceneId)) {
            setCurrentScene(sceneId);
          }
          break;
        case 'nextScene':
          if (scenes && currentSceneId) {
            const sortedScenes = [...scenes].sort((a, b) => a.order_index - b.order_index);
            const currentIndex = sortedScenes.findIndex((s) => s.id === currentSceneId);
            if (currentIndex < sortedScenes.length - 1) {
              setCurrentScene(sortedScenes[currentIndex + 1].id);
            }
          }
          break;
        case 'previousScene':
          if (scenes && currentSceneId) {
            const sortedScenes = [...scenes].sort((a, b) => a.order_index - b.order_index);
            const currentIndex = sortedScenes.findIndex((s) => s.id === currentSceneId);
            if (currentIndex > 0) {
              setCurrentScene(sortedScenes[currentIndex - 1].id);
            }
          }
          break;
        case 'toggleFullscreen':
          toggleFullscreen();
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [scenes, currentSceneId, setCurrentScene]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      postMessage({
        type: 'fullscreenChange',
        tourId: id!,
        data: { isFullscreen: fullscreen },
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [id, postMessage]);

  // Auto-hide controls on inactivity
  useEffect(() => {
    if (!autoHideControls) return;

    let timeout: ReturnType<typeof setTimeout>;

    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setShowControls(false), 3000);
    };

    const handleMouseLeave = () => {
      timeout = setTimeout(() => setShowControls(false), 1000);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Initial hide after 3 seconds
    timeout = setTimeout(() => setShowControls(false), 3000);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      clearTimeout(timeout);
    };
  }, [autoHideControls]);

  // Handle errors
  useEffect(() => {
    const error = tourError || scenesError;
    if (error) {
      postMessage({
        type: 'error',
        tourId: id!,
        data: { message: (error as Error).message || 'Failed to load tour' },
      });
    }
  }, [tourError, scenesError, id, postMessage]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  if (isLoadingTour || isLoadingScenes) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <PageLoader message="Loading tour..." />
      </div>
    );
  }

  if (!tour || !scenes || scenes.length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black">
        <p className="text-white">Tour not available</p>
      </div>
    );
  }

  const sortedScenes = [...scenes].sort((a, b) => a.order_index - b.order_index);
  const currentScene = sortedScenes.find((s) => s.id === currentSceneId) || sortedScenes[0];
  const currentIndex = sortedScenes.findIndex((s) => s.id === currentScene?.id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < sortedScenes.length - 1;

  // Get branding from tour settings
  const branding = tour.settings?.branding;
  const primaryColor = branding?.primary_color || '#5b6ff4';

  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      {/* Viewer */}
      <PanoramaViewer
        scene={currentScene}
        hotspots={currentScene.hotspots || []}
        tourSettings={tour.settings ?? undefined}
        onSceneChange={(sceneId) => setCurrentScene(sceneId)}
        onHotspotClick={handleHotspotClick}
      />

      {/* Floor Plan Overlay */}
      {!minimalChrome && tour.settings?.floor_plans && tour.settings.floor_plans.length > 0 && (
        <FloorPlanOverlay
          floorPlans={tour.settings.floor_plans}
          currentSceneId={currentSceneId || currentScene?.id || ''}
          scenes={sortedScenes}
          onSceneChange={(sceneId) => setCurrentScene(sceneId)}
          position="bottom-left"
          className={cn(
            'transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}

      {/* Navigation Controls (if not minimal chrome and navbar enabled) */}
      {!minimalChrome && showNavbar && sortedScenes.length > 1 && (
        <div
          className={cn(
            'absolute left-0 right-0 bottom-0 z-10 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          )}
        >
          {/* Scene thumbnails */}
          <div className="bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="flex items-center justify-center gap-2">
              {/* Previous button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-white hover:bg-white/20 disabled:opacity-30"
                onClick={() => hasPrevious && setCurrentScene(sortedScenes[currentIndex - 1].id)}
                disabled={!hasPrevious}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              {/* Thumbnail strip */}
              <div className="flex gap-1.5 overflow-x-auto max-w-[70vw] py-1">
                {sortedScenes.map((scene, index) => (
                  <button
                    key={scene.id}
                    onClick={() => setCurrentScene(scene.id)}
                    className={cn(
                      'shrink-0 overflow-hidden rounded transition-all',
                      currentScene?.id === scene.id
                        ? 'ring-2 ring-offset-1 ring-offset-black'
                        : 'opacity-60 hover:opacity-100'
                    )}
                    style={{
                      ['--tw-ring-color' as string]: currentScene?.id === scene.id ? primaryColor : undefined,
                    }}
                    title={scene.title || `Scene ${index + 1}`}
                  >
                    <img
                      src={scene.thumbnail_url || scene.image_url}
                      alt={scene.title || `Scene ${index + 1}`}
                      className="h-10 w-16 object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Next button */}
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-white hover:bg-white/20 disabled:opacity-30"
                onClick={() => hasNext && setCurrentScene(sortedScenes[currentIndex + 1].id)}
                disabled={!hasNext}
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {/* Scene counter */}
            <div className="mt-1.5 text-center text-xs text-white/70">
              {currentIndex + 1} / {sortedScenes.length}
            </div>
          </div>
        </div>
      )}

      {/* Minimal navigation arrows (for minimal chrome mode) */}
      {minimalChrome && sortedScenes.length > 1 && (
        <>
          {hasPrevious && (
            <button
              onClick={() => setCurrentScene(sortedScenes[currentIndex - 1].id)}
              className={cn(
                'absolute left-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity duration-300',
                showControls ? 'opacity-100' : 'opacity-0'
              )}
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => setCurrentScene(sortedScenes[currentIndex + 1].id)}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity duration-300',
                showControls ? 'opacity-100' : 'opacity-0'
              )}
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          )}
        </>
      )}

      {/* Fullscreen button */}
      {!minimalChrome && tour.settings?.enable_fullscreen !== false && (
        <button
          onClick={toggleFullscreen}
          className={cn(
            'absolute top-3 right-3 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-0'
          )}
          title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
        >
          {isFullscreen ? <Minimize className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
        </button>
      )}

      {/* Branding/Watermark */}
      {showBranding && branding?.show_watermark !== false && (
        <div
          className={cn(
            'absolute bottom-2 right-2 z-10 transition-opacity duration-300',
            showControls ? 'opacity-100' : 'opacity-50'
          )}
        >
          {branding?.logo_url ? (
            <img
              src={branding.logo_url}
              alt="Logo"
              className="h-6 max-w-[100px] object-contain"
            />
          ) : (
            <span className="text-xs text-white/50">Powered by 360 Viewer</span>
          )}
        </div>
      )}

      {/* Hotspot Content Modal */}
      <HotspotContentModal
        hotspot={activeHotspot}
        open={showHotspotModal}
        onOpenChange={setShowHotspotModal}
      />
    </div>
  );
}
