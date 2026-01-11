import { useState, useCallback } from 'react';
import { Map, ChevronUp, ChevronDown, X, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { cn } from '@/utils';
import type { FloorPlan, FloorPlanMarker, Scene } from '@/types';

interface FloorPlanOverlayProps {
  floorPlans: FloorPlan[];
  currentSceneId: string;
  scenes: Scene[];
  onSceneChange: (sceneId: string) => void;
  className?: string;
  defaultExpanded?: boolean;
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

export function FloorPlanOverlay({
  floorPlans,
  currentSceneId,
  scenes,
  onSceneChange,
  className,
  defaultExpanded = false,
  position = 'bottom-left',
}: FloorPlanOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentFloorIndex, setCurrentFloorIndex] = useState(0);

  // Sort floor plans by floor number
  const sortedFloorPlans = [...floorPlans].sort((a, b) => a.floor_number - b.floor_number);
  const currentFloorPlan = sortedFloorPlans[currentFloorIndex];

  // Find which floor the current scene is on
  const findSceneFloor = useCallback(() => {
    for (let i = 0; i < sortedFloorPlans.length; i++) {
      const floorPlan = sortedFloorPlans[i];
      if (floorPlan.markers.some((m) => m.scene_id === currentSceneId)) {
        return i;
      }
    }
    return 0;
  }, [sortedFloorPlans, currentSceneId]);

  // Auto-switch floor when scene changes
  const sceneFloorIndex = findSceneFloor();
  if (sceneFloorIndex !== currentFloorIndex && sortedFloorPlans[sceneFloorIndex]) {
    setCurrentFloorIndex(sceneFloorIndex);
  }

  const handleFloorChange = (direction: 'up' | 'down') => {
    if (direction === 'up' && currentFloorIndex < sortedFloorPlans.length - 1) {
      setCurrentFloorIndex(currentFloorIndex + 1);
    } else if (direction === 'down' && currentFloorIndex > 0) {
      setCurrentFloorIndex(currentFloorIndex - 1);
    }
  };

  const handleMarkerClick = (marker: FloorPlanMarker) => {
    onSceneChange(marker.scene_id);
  };

  const getSceneTitle = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    return scene?.title || 'Scene';
  };

  // Get position classes
  const positionClasses = {
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
  };

  if (!floorPlans.length || !currentFloorPlan) {
    return null;
  }

  // Minimized state - just show toggle button
  if (isMinimized) {
    return (
      <div className={cn('absolute z-10', positionClasses[position], className)}>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setIsMinimized(false)}
                className="rounded-full shadow-lg bg-[var(--color-surface-elevated)]"
              >
                <Map className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Show floor plan</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'absolute z-10',
        positionClasses[position],
        className
      )}
    >
      <div
        className={cn(
          'rounded-lg bg-[var(--color-surface-elevated)] shadow-xl overflow-hidden transition-all duration-300',
          isExpanded ? 'w-80 h-72' : 'w-48 h-40'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-2">
            <Map className="h-4 w-4 text-[var(--color-text-muted)]" />
            <span className="text-sm font-medium truncate">
              {currentFloorPlan.name}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsExpanded(!isExpanded)}
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <Minimize2 className="h-3.5 w-3.5" />
              ) : (
                <Maximize2 className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setIsMinimized(true)}
              title="Minimize"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Floor Plan Image with Markers */}
        <div className="relative flex-1 p-2" style={{ height: 'calc(100% - 72px)' }}>
          <div className="relative w-full h-full rounded overflow-hidden bg-[var(--color-surface)]">
            <img
              src={currentFloorPlan.image_url}
              alt={currentFloorPlan.name}
              className="w-full h-full object-contain"
            />

            {/* Scene Markers */}
            <TooltipProvider>
              {currentFloorPlan.markers.map((marker) => (
                <Tooltip key={marker.scene_id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleMarkerClick(marker)}
                      className={cn(
                        'absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 transition-all duration-200',
                        marker.scene_id === currentSceneId
                          ? 'bg-[var(--color-primary-500)] border-white scale-125 ring-2 ring-[var(--color-primary-500)]/50'
                          : 'bg-white border-[var(--color-primary-500)] hover:scale-110 hover:bg-[var(--color-primary-100)]'
                      )}
                      style={{
                        left: `${marker.x}%`,
                        top: `${marker.y}%`,
                      }}
                    >
                      {marker.scene_id === currentSceneId && (
                        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-primary-500)] opacity-75" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {marker.label || getSceneTitle(marker.scene_id)}
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </div>

        {/* Floor Navigation (if multiple floors) */}
        {sortedFloorPlans.length > 1 && (
          <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--color-border)]">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleFloorChange('down')}
              disabled={currentFloorIndex === 0}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <span className="text-xs text-[var(--color-text-muted)]">
              Floor {currentFloorPlan.floor_number}
              {sortedFloorPlans.length > 1 && (
                <span className="ml-1">
                  ({currentFloorIndex + 1}/{sortedFloorPlans.length})
                </span>
              )}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => handleFloorChange('up')}
              disabled={currentFloorIndex === sortedFloorPlans.length - 1}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
