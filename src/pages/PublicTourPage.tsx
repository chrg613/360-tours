import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { MetaTags, VirtualTourStructuredData } from '@/components/common/MetaTags';
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
import { DEFAULT_TOUR_SETTINGS } from '@/constants';
import { PanoramaViewer } from '@/components/features/PanoramaViewer';
import { ShareModal } from '@/components/features/ShareModal';
import { FloorPlanOverlay } from '@/components/features/FloorPlanOverlay';
import { HotspotContentModal } from '@/components/features/HotspotContentModal';
import { useViewerStore } from '@/stores';
import { usePublicTourTracking } from '@/hooks/usePublicTourTracking';
import { useTwoFingerSwipe } from '@/hooks';
import { cn, parseBooleanParam } from '@/utils';
import type { Hotspot } from '@/types';

function getWatermarkPositionClass(position?: string): string {
  switch (position) {
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'top-left':
      return 'top-20 left-4';
    case 'top-right':
      return 'top-20 right-4';
    case 'bottom-right':
    default:
      return 'bottom-4 right-4';
  }
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
  const { currentSceneId, setCurrentScene } = useViewerStore();
  const thumbnailScrollRef = useRef<HTMLDivElement>(null);
  const viewerWrapRef = useRef<HTMLDivElement>(null);

  // Get URL parameters for customization
  const startSceneId = searchParams.get('scene');
  const autoplayParam = parseBooleanParam(searchParams.get('autoplay'));
  const navbarParam = parseBooleanParam(searchParams.get('navbar'));
  const fullscreenParam = parseBooleanParam(searchParams.get('fullscreen'));
  const vrParam = parseBooleanParam(searchParams.get('vr'));
  const rotateParam = parseBooleanParam(searchParams.get('rotate'));

  // Use public API endpoints (no authentication required)
  const { data: tour, isLoading: isLoadingTour } = useQuery({
    queryKey: ['public-tour', id],
    queryFn: () => toursApi.getPublicTour(id!, { track: false }),
    enabled: !!id,
  });

  // Scenes are included in tour response from public API
  const scenes = tour?.scenes;
  const isLoadingScenes = isLoadingTour;

  // Floor plans: prefer those embedded in tour settings; otherwise fetch
  // from the dedicated public endpoint as a graceful fallback.
  const embeddedFloorPlans = tour?.settings?.floor_plans;
  const { data: fetchedFloorPlans } = useQuery({
    queryKey: ['public-tour-floor-plans', id],
    queryFn: () => toursApi.getPublicFloorPlans(id!),
    enabled: !!id && (!embeddedFloorPlans || embeddedFloorPlans.length === 0),
    retry: false,
  });
  const floorPlans = embeddedFloorPlans?.length ? embeddedFloorPlans : fetchedFloorPlans ?? [];

  const sortedScenes = useMemo(() => {
    if (!scenes) return [];
    return [...scenes].sort((a, b) => a.order_index - b.order_index);
  }, [scenes]);

  const viewerSettings = useMemo(() => {
    if (!tour) return undefined;

    const base = tour.settings ?? DEFAULT_TOUR_SETTINGS;
    const autoplay = autoplayParam ?? true;
    const showNavbar = navbarParam ?? true;
    const enableFullscreen = fullscreenParam ?? true;
    const enableVR = vrParam ?? true;

    let autoRotate = base.auto_rotate === true;
    if (rotateParam !== undefined) {
      autoRotate = rotateParam;
    }
    if (!autoplay) {
      autoRotate = false;
    }

    return {
      ...base,
      auto_rotate: autoRotate,
      show_navbar: (base.show_navbar ?? true) && showNavbar,
      enable_fullscreen: (base.enable_fullscreen ?? true) && enableFullscreen,
      enable_vr: (base.enable_vr ?? true) && enableVR,
    };
  }, [autoplayParam, fullscreenParam, navbarParam, rotateParam, tour, vrParam]);

  const showNavbar = viewerSettings?.show_navbar !== false;
  const fullscreenEnabled = viewerSettings?.enable_fullscreen !== false;
  const branding = viewerSettings?.branding;

  const toggleFullscreen = useCallback(() => {
    if (!fullscreenEnabled) return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      return;
    }
    document.exitFullscreen();
  }, [fullscreenEnabled]);

  // Analytics tracking (tour_view, session_start/duration, scene_view)
  const { trackEvent, sessionId } = usePublicTourTracking({
    tourId: id,
    tourLoaded: !!tour,
    currentSceneId: currentSceneId ?? undefined,
  });

  // Set initial scene based on URL param or tour settings
  useEffect(() => {
    const initialScene =
      startSceneId || tour?.settings?.initial_scene_id || sortedScenes[0]?.id;

    if (initialScene) {
      setCurrentScene(initialScene);
    }
  }, [sortedScenes, startSceneId, tour?.settings?.initial_scene_id, setCurrentScene]);

  // Keyboard shortcuts
  // Keep the latest currentSceneId in a ref so the keyboard listener can be
  // registered once per sortedScenes change instead of per scene navigation.
  const currentSceneIdRef = useRef(currentSceneId);
  useEffect(() => {
    currentSceneIdRef.current = currentSceneId;
  }, [currentSceneId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts while typing in form fields / contenteditable elements.
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      if (!sortedScenes.length) return;

      const currentIndex = sortedScenes.findIndex((s) => s.id === currentSceneIdRef.current);

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
          if (fullscreenEnabled) {
            toggleFullscreen();
          }
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
  }, [fullscreenEnabled, sortedScenes, setCurrentScene, toggleFullscreen]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const fullscreen = !!document.fullscreenElement;
      setIsFullscreen(fullscreen);
      if (!fullscreenEnabled) return;
      trackEvent(fullscreen ? 'fullscreen_enter' : 'fullscreen_exit', undefined, undefined, {
        is_fullscreen: fullscreen,
      });
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [fullscreenEnabled, trackEvent]);

  const currentScene = useMemo(() => {
    if (!sortedScenes.length) return undefined;
    return sortedScenes.find((s) => s.id === currentSceneId) || sortedScenes[0];
  }, [currentSceneId, sortedScenes]);

  const currentSceneIdForAnalytics = currentSceneId || currentScene?.id;

  const currentIndex = useMemo(() => {
    if (!currentScene) return -1;
    return sortedScenes.findIndex((s) => s.id === currentScene.id);
  }, [currentScene, sortedScenes]);

  // Two-finger horizontal swipe to navigate between scenes on touch devices.
  useTwoFingerSwipe(viewerWrapRef, {
    enabled: sortedScenes.length > 1,
    onSwipeLeft: () => {
      const i = sortedScenes.findIndex((s) => s.id === currentSceneId);
      if (i >= 0 && i < sortedScenes.length - 1) setCurrentScene(sortedScenes[i + 1].id);
    },
    onSwipeRight: () => {
      const i = sortedScenes.findIndex((s) => s.id === currentSceneId);
      if (i > 0) setCurrentScene(sortedScenes[i - 1].id);
    },
  });

  // Handle hotspot clicks for non-navigation types
  const handleHotspotClick = useCallback(
    (hotspot: Hotspot) => {
      // Track hotspot click
      trackEvent('hotspot_click', currentSceneIdForAnalytics || undefined, hotspot.id);

      // Navigation is handled inside PanoramaViewer
      if (hotspot.type === 'navigation') return;

      // For link hotspots, open directly without modal if URL exists
      if (hotspot.type === 'link') {
        const content = hotspot.content as {
          url?: string;
          target?: '_blank' | '_self';
          link_url?: string;
          link_new_tab?: boolean;
        } | null;
        const url = content?.url || content?.link_url;
        const target = content?.target || (content?.link_new_tab === false ? '_self' : '_blank');
        if (url) {
          window.open(url, target);
          return;
        }
      }

      // For all other types, show the modal
      setActiveHotspot(hotspot);
      setShowHotspotModal(true);
    },
    [currentSceneIdForAnalytics, trackEvent]
  );

  // Handle like toggle
  const handleLikeToggle = useCallback(async () => {
    if (!id) return;

    const next = !isLiked;
    setIsLiked(next);

    try {
      if (next) {
        await toursApi.likePublicTour(id, sessionId);
      } else {
        await toursApi.unlikePublicTour(id, sessionId);
      }
    } catch {
      setIsLiked(!next);
    }
  }, [id, isLiked, sessionId]);

  // Handle share
  const handleShare = useCallback(() => {
    setShowShare(true);
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

  return (
    <div
      className="relative h-screen w-screen bg-black"
      style={{ fontFamily: branding?.font_family }}
    >
      {/* SEO Meta Tags */}
      {tour && (
        <>
          <MetaTags
            title={tour.title}
            description={tour.description || undefined}
            image={tour.thumbnail_url || tour.scenes?.[0]?.thumbnail_url || tour.scenes?.[0]?.image_url || undefined}
            type="website"
            twitterCard="summary_large_image"
          />
          <VirtualTourStructuredData
            name={tour.title}
            description={tour.description || '360° virtual tour'}
            image={tour.thumbnail_url || tour.scenes?.[0]?.thumbnail_url || undefined}
            datePublished={tour.published_at || undefined}
            dateModified={tour.updated_at}
          />
        </>
      )}

      {/* Viewer */}
      {currentScene && (
        <div ref={viewerWrapRef} className="h-full w-full">
          <PanoramaViewer
            scene={currentScene}
            hotspots={currentScene.hotspots || []}
            tourSettings={viewerSettings}
            onSceneChange={(sceneId) => setCurrentScene(sceneId)}
            onHotspotClick={handleHotspotClick}
            onVrModeChange={(enabled) =>
              trackEvent(enabled ? 'vr_enter' : 'vr_exit', undefined, undefined, { mode: 'stereo' })
            }
            onGyroscopeChange={(enabled) =>
              trackEvent(enabled ? 'vr_enter' : 'vr_exit', undefined, undefined, { mode: 'gyroscope' })
            }
          />
        </div>
      )}

      {/* Floor Plan Overlay */}
      {floorPlans.length > 0 && (
        <FloorPlanOverlay
          floorPlans={floorPlans}
          currentSceneId={currentScene?.id || ''}
          scenes={sortedScenes}
          onSceneChange={(sceneId) => setCurrentScene(sceneId)}
          position="bottom-left"
        />
      )}

      {/* Top Bar */}
      <div className="absolute left-0 right-0 top-0 z-10 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="flex min-w-0 items-start gap-3">
          {branding?.logo_url && (
            <img
              src={branding.logo_url}
              alt={`${tour.title} logo`}
              className="mt-0.5 h-9 max-w-[140px] shrink-0 object-contain"
            />
          )}
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white">{tour.title}</h1>
            {tour.description && showInfo && (
              <p className="mt-1 max-w-md text-sm text-white/70">{tour.description}</p>
            )}
          </div>
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
            disabled={!fullscreenEnabled}
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Scene Thumbnails (if navbar enabled) */}
      {showNavbar && sortedScenes.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="relative">
            <div className="pointer-events-none absolute left-0 top-0 bottom-2 z-10 w-8 bg-gradient-to-r from-black/70 to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 bottom-2 z-10 w-8 bg-gradient-to-l from-black/70 to-transparent" />
            <div
              ref={thumbnailScrollRef}
              className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
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
                    loading="lazy"
                    className="h-16 w-24 object-cover"
                  />
                </button>
              ))}
            </div>
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
      {branding?.show_watermark !== false && (
        <div className={cn('absolute z-10 text-xs text-white/50', getWatermarkPositionClass(branding?.watermark_position))}>
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
        onTrackShare={(platform) => trackEvent('tour_share', undefined, undefined, { platform })}
      />

      {/* Hotspot Content Modal */}
      <HotspotContentModal
        hotspot={activeHotspot}
        open={showHotspotModal}
        onOpenChange={setShowHotspotModal}
        muted={isMuted}
        onMutedChange={setIsMuted}
      />
    </div>
  );
}
