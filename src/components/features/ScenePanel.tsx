import { useState, useRef, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Trash2,
  GripVertical,
  Image,
  ChevronLeft,
  ChevronRight,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { toursApi, uploadApi } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { validateImageFile } from '@/utils/validation';
import { cn } from '@/utils';
import { useToast } from '@/hooks/useToast';
import type { Scene } from '@/types';

interface ScenePanelProps {
  tourId: string;
  scenes: Scene[];
  currentSceneId: string | null;
  onSceneSelect: (sceneId: string | null) => void;
}

interface SortableSceneItemProps {
  scene: Scene;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function SortableSceneItem({
  scene,
  index,
  isSelected,
  onSelect,
  onDelete,
}: SortableSceneItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scene.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onSelect}
      className={cn(
        'group relative cursor-pointer rounded-lg border transition-all',
        isSelected
          ? 'border-[var(--color-primary-500)] ring-2 ring-[var(--color-primary-500)]/20'
          : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]',
        isDragging && 'shadow-lg'
      )}
    >
      {/* Thumbnail */}
      <div className="aspect-video overflow-hidden rounded-t-lg bg-[var(--color-surface)]">
        {scene.thumbnail_url || scene.image_url ? (
          <img
            src={scene.thumbnail_url || scene.image_url}
            alt={scene.title || `Scene ${index + 1}`}
            loading="lazy"
            className="h-full w-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Image className="h-8 w-8 text-[var(--color-text-muted)]" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
          {scene.title || `Scene ${index + 1}`}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {scene.metadata?.room_type && scene.metadata.room_type !== 'other' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-100)] text-[var(--color-primary-700)] font-medium capitalize">
              {scene.metadata.room_type.replace(/_/g, ' ')}
            </span>
          )}
          <p className="text-xs text-[var(--color-text-muted)]">
            {scene.hotspots?.length || 0} hotspots
          </p>
        </div>
      </div>

      {/* Actions (shown on hover) */}
      <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="secondary"
          size="icon-sm"
          className="h-6 w-6"
          onClick={onDelete}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4 text-[var(--color-text-muted)]" />
      </div>
    </div>
  );
}

export function ScenePanel({
  tourId,
  scenes,
  currentSceneId,
  onSceneSelect,
}: ScenePanelProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // Sort scenes by order_index
  const sortedScenes = [...scenes].sort((a, b) => a.order_index - b.order_index);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Delete scene mutation
  const deleteMutation = useMutation({
    mutationFn: (sceneId: string) => toursApi.deleteScene(sceneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENES, tourId] });
      toast('success', 'The scene has been removed from the tour.', { title: 'Scene deleted' });
    },
    onError: () => {
      toast('error', 'Something went wrong. Please try again.', { title: 'Failed to delete scene' });
    },
  });

  // Reorder scenes mutation
  const reorderMutation = useMutation({
    mutationFn: (sceneIds: string[]) => toursApi.reorderScenes(tourId, sceneIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENES, tourId] });
    },
    onError: () => {
      toast('error', 'Something went wrong. Please try again.', { title: 'Failed to reorder scenes' });
      // Refetch to restore correct order
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENES, tourId] });
    },
  });

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sortedScenes.findIndex((s) => s.id === active.id);
        const newIndex = sortedScenes.findIndex((s) => s.id === over.id);

        const newOrder = arrayMove(sortedScenes, oldIndex, newIndex);
        const sceneIds = newOrder.map((s) => s.id);

        // Optimistic update
        queryClient.setQueryData(
          [QUERY_KEYS.SCENES, tourId],
          newOrder.map((s, i) => ({ ...s, order_index: i }))
        );

        // Persist to server
        reorderMutation.mutate(sceneIds);
      }
    },
    [sortedScenes, tourId, queryClient, reorderMutation]
  );

  // Handle file upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setIsUploading(true);

    try {
      const validFiles = files.filter((file) => {
        const validation = validateImageFile(file);
        if (!validation.valid) {
          toast('error', validation.error || 'File could not be uploaded.', { title: 'Invalid file' });
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) return;

      const results = await Promise.allSettled(
        validFiles.map(async (file) => {
          const uploadResult = await uploadApi.uploadFile(file, {
            folder: 'scenes',
            visibility: 'public',
          });
          await toursApi.createScene(tourId, {
            image_url: uploadResult.public_url,
            title: file.name.replace(/\.[^/.]+$/, ''),
          });
        })
      );

      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      const errorCount = results.filter((r) => r.status === 'rejected').length;

      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENES, tourId] });
      if (successCount > 0) {
        toast(
          errorCount > 0 ? 'warning' : 'success',
          `${successCount} scene${successCount > 1 ? 's' : ''} added${errorCount > 0 ? `, ${errorCount} failed` : ''}.`,
          { title: 'Upload complete' }
        );
      } else {
        toast('error', 'All files failed to upload.', { title: 'Upload failed' });
      }
    } catch {
      toast('error', 'Failed to upload scenes. Please try again.', { title: 'Upload failed' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (sceneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this scene?')) {
      await deleteMutation.mutateAsync(sceneId);
      if (currentSceneId === sceneId) {
        const remainingScenes = sortedScenes.filter((s) => s.id !== sceneId);
        onSceneSelect(remainingScenes[0]?.id || null);
      }
    }
  };

  if (collapsed) {
    return (
      <div className="flex w-10 flex-col items-center border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)] py-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(false)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="mt-4 flex flex-col items-center gap-2">
          <span className="text-xs text-[var(--color-text-muted)] [writing-mode:vertical-rl]">
            {scenes.length} scenes
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] p-3">
        <h3 className="font-semibold text-[var(--color-text-primary)]">Scenes</h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setCollapsed(true)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Scene List */}
      <div className="flex-1 overflow-y-auto p-2">
        {isUploading && (
          <div className="mb-2 rounded-lg border border-[var(--color-border)] p-3">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-primary-600)] border-t-transparent" />
              <span className="text-sm text-[var(--color-text-muted)]">Uploading...</span>
            </div>
          </div>
        )}

        {sortedScenes.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Image className="h-10 w-10 text-[var(--color-text-muted)]" />
            <p className="mt-2 text-sm text-[var(--color-text-muted)]">No scenes yet</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedScenes.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {sortedScenes.map((scene, index) => (
                  <SortableSceneItem
                    key={scene.id}
                    scene={scene}
                    index={index}
                    isSelected={currentSceneId === scene.id}
                    onSelect={() => onSceneSelect(scene.id)}
                    onDelete={(e) => handleDelete(scene.id, e)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Drag hint */}
      {sortedScenes.length > 1 && (
        <div className="border-t border-[var(--color-border)] p-2 text-center">
          <p className="text-xs text-[var(--color-text-muted)]">
            Drag scenes to reorder
          </p>
        </div>
      )}
    </div>
  );
}
