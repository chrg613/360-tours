import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Share2,
  Heart,
  Expand,
  Minimize,
  Volume2,
  VolumeX,
  Info,
  Keyboard,
  X,
} from 'lucide-react';
import { Button, PageLoader, Badge } from '@/components/ui';
import { toursApi } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { PanoramaViewer } from '@/components/features/PanoramaViewer';
import { ShareModal } from '@/components/features/ShareModal';
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

export function PublicTourPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [showHotspotModal, setShowHotspotModal] = useState(false);
  const { currentSceneId, setCurrentScene } = useTourEditorStore();
  const sessionIdRef = useRef<string>(getSessionId());

  // Get URL parameters for customization
  const startSceneId = searchParams.get('scene');
  const autoplay = searchParams.get('autoplay') !== '0';
  const showNavbar = searchParams.get('navbar') !== '0';

  // Use public API endpoints (no authentication required)
  const { data: tour, isLoading: isLoadingTour } = useQuery({
    queryKey: ['public-tour', id],
    queryFn: () => toursApi.getPublicTour(id!),
    enabled: !!id,
  });

  // Scenes are included in tour response from public API
  const scenes = tour?.scenes;
  const isLoadingScenes = isLoadingTour;

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

  // Set initial scene based on URL param or tour settings
  useEffect(() => {
    if (scenes && scenes.length > 0) {
      const initialScene =
        startSceneId ||
        tour?.settings?.initial_scene_id ||
        scenes.sort((a, b) => a.order_index - b.order_index)[0]?.id;

      if (initialScene) {
        setCurrentScene(initialScene);
      }
    }
  }, [scenes, startSceneId, tour?.settings?.initial_scene_id, setCurrentScene]);

  // Track scene changes
  useEffect(() => {
    if (currentSceneId) {
      trackEvent('scene_view', currentSceneId);
    }
  }, [currentSceneId, trackEvent]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!scenes) return;

      const sortedScenes = [...scenes].sort((a, b) => a.order_index - b.order_index);
      const currentIndex = sortedScenes.findIndex((s) => s.id === currentSceneId);

      switch (e.key) {
        case 'ArrowRight':
        case 'n':
          // Next scene
          if (currentIndex < sortedScenes.length - 1) {
            setCurrentScene(sortedScenes[currentIndex + 1].id);
          }
          break;
        case 'ArrowLeft':
        case 'p':
          // Previous scene
          if (currentIndex > 0) {
            setCurrentScene(sortedScenes[currentIndex - 1].id);
          }
          break;
        case 'f':
          // Toggle fullscreen
          toggleFullscreen();
          break;
        case 'm':
          // Toggle mute
          setIsMuted((prev) => !prev);
          break;
        case 'i':
          // Toggle info
          setShowInfo((prev) => !prev);
          break;
        case 's':
          // Show share modal
          setShowShare(true);
          break;
        case '?':
          // Toggle keyboard hints
          setShowKeyboardHints((prev) => !prev);
          break;
        case 'Escape':
          // Close modals
          setShowShare(false);
          setShowKeyboardHints(false);
          setShowInfo(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scenes, currentSceneId, setCurrentScene]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  if (isLoadingTour || isLoadingScenes) {
    return <PageLoader message="Loading tour..." />;
  }

  if (!tour) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold">Tour Not Found</h1>
          <p className="mt-2 text-white/70">
            This tour may have been removed or is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const sortedScenes = scenes?.sort((a, b) => a.order_index - b.order_index) || [];
  const currentScene = sortedScenes.find((s) => s.id === currentSceneId) || sortedScenes[0];
  const currentIndex = sortedScenes.findIndex((s) => s.id === currentScene?.id);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Handle hotspot clicks for non-navigation types
  const handleHotspotClick = useCallback((hotspot: Hotspot) => {
    // Track hotspot click
    trackEvent('hotspot_click', currentSceneId || undefined, hotspot.id);

    // Navigation is handled inside PanoramaViewer
    if (hotspot.type === 'navigation') return;

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
  }, [trackEvent, currentSceneId]);

  // Handle like toggle
  const handleLikeToggle = useCallback(async () => {
    if (!id) return;
    setIsLiked((prev) => !prev);
    // Note: In production, you'd call the like/unlike API here
    // For now, we just update the local state
  }, [id]);

  // Handle share
  const handleShare = useCallback(() => {
    trackEvent('share');
    setShowShare(true);
  }, [trackEvent]);

  return (
    <div className="relative h-screen w-screen bg-black">
      {/* Viewer */}
      {currentScene && (
        <PanoramaViewer
          scene={currentScene}
          hotspots={currentScene.hotspots || []}
          tourSettings={tour.settings ?? undefined}
          onSceneChange={(sceneId) => setCurrentScene(sceneId)}
          onHotspotClick={handleHotspotClick}
        />
      )}

      {/* Floor Plan Overlay */}
      {tour.settings?.floor_plans && tour.settings.floor_plans.length > 0 && (
        <FloorPlanOverlay
          floorPlans={tour.settings.floor_plans}
          currentSceneId={currentSceneId || currentScene?.id || ''}
          scenes={sortedScenes}
          onSceneChange={(sceneId) => setCurrentScene(sceneId)}
          position="bottom-left"
        />
      )}

      {/* Top Bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <div>
          <h1 className="text-xl font-bold text-white">{tour.title}</h1>
          {tour.description && showInfo && (
            <p className="mt-1 max-w-md text-sm text-white/70">{tour.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowInfo(!showInfo)}
          >
            <Info className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'text-white hover:bg-white/20',
              isLiked && 'text-red-500'
            )}
            onClick={handleLikeToggle}
          >
            <Heart className={cn('h-5 w-5', isLiked && 'fill-current')} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={handleShare}
          >
            <Share2 className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
          >
            <Keyboard className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Scene Thumbnails (if navbar enabled) */}
      {showNavbar && sortedScenes.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {sortedScenes.map((scene) => (
              <button
                key={scene.id}
                onClick={() => setCurrentScene(scene.id)}
                className={cn(
                  'shrink-0 overflow-hidden rounded-lg border-2 transition-all',
                  currentScene?.id === scene.id
                    ? 'border-white'
                    : 'border-transparent opacity-70 hover:opacity-100'
                )}
              >
                <img
                  src={scene.thumbnail_url || scene.image_url}
                  alt={scene.title || 'Scene'}
                  className="h-16 w-24 object-cover"
                />
              </button>
            ))}
          </div>
          {/* Scene counter */}
          <div className="mt-2 text-center text-xs text-white/70">
            Scene {currentIndex + 1} of {sortedScenes.length}
          </div>
        </div>
      )}

      {/* Current Scene Info */}
      {currentScene?.title && (
        <div className="absolute bottom-24 left-4 z-10">
          <Badge variant="secondary" className="bg-black/50 text-white">
            {currentScene.title}
          </Badge>
        </div>
      )}

      {/* Keyboard Hints Overlay */}
      {showKeyboardHints && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="max-w-md rounded-lg bg-[var(--color-surface-elevated)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowKeyboardHints(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Next scene</span>
                <span className="font-mono">→ or N</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Previous scene</span>
                <span className="font-mono">← or P</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Toggle fullscreen</span>
                <span className="font-mono">F</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Toggle mute</span>
                <span className="font-mono">M</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Toggle info</span>
                <span className="font-mono">I</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Share</span>
                <span className="font-mono">S</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Show shortcuts</span>
                <span className="font-mono">?</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Close</span>
                <span className="font-mono">Esc</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branding */}
      {tour.settings?.branding?.show_watermark !== false && (
        <div className="absolute bottom-4 right-4 z-10 text-xs text-white/50">
          Powered by 360 Viewer
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        open={showShare}
        onOpenChange={setShowShare}
        tourId={id!}
        tourTitle={tour.title}
        tourDescription={tour.description || undefined}
      />

      {/* Hotspot Content Modal */}
      <HotspotContentModal
        hotspot={activeHotspot}
        open={showHotspotModal}
        onOpenChange={setShowHotspotModal}
      />
    </div>
  );
}
