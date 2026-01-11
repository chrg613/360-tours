import { create } from 'zustand';
import type { Tour, Scene, Hotspot } from '@/types';

interface TourEditorState {
  // Current tour being edited
  currentTour: Tour | null;
  currentSceneId: string | null;
  selectedHotspotId: string | null;

  // Editor UI state
  isEditing: boolean;
  isPreviewing: boolean;
  showScenePanel: boolean;
  showHotspotPanel: boolean;
  showSettingsPanel: boolean;

  // Pending changes
  hasUnsavedChanges: boolean;
  pendingChanges: {
    tour?: Partial<Tour>;
    scenes?: Record<string, Partial<Scene>>;
    hotspots?: Record<string, Partial<Hotspot>>;
  };
}

interface TourEditorActions {
  // Tour actions
  setCurrentTour: (tour: Tour | null) => void;
  updateTourDraft: (updates: Partial<Tour>) => void;

  // Scene actions
  setCurrentScene: (sceneId: string | null) => void;
  addSceneDraft: (scene: Scene) => void;
  updateSceneDraft: (sceneId: string, updates: Partial<Scene>) => void;
  removeSceneDraft: (sceneId: string) => void;
  reorderScenes: (sceneIds: string[]) => void;

  // Hotspot actions
  selectHotspot: (hotspotId: string | null) => void;
  addHotspotDraft: (sceneId: string, hotspot: Hotspot) => void;
  updateHotspotDraft: (hotspotId: string, updates: Partial<Hotspot>) => void;
  removeHotspotDraft: (hotspotId: string) => void;

  // UI actions
  setEditing: (isEditing: boolean) => void;
  setPreviewing: (isPreviewing: boolean) => void;
  toggleScenePanel: () => void;
  toggleHotspotPanel: () => void;
  toggleSettingsPanel: () => void;

  // Save actions
  markAsSaved: () => void;
  discardChanges: () => void;
  reset: () => void;
}

type TourEditorStore = TourEditorState & TourEditorActions;

const initialState: TourEditorState = {
  currentTour: null,
  currentSceneId: null,
  selectedHotspotId: null,
  isEditing: false,
  isPreviewing: false,
  showScenePanel: true,
  showHotspotPanel: false,
  showSettingsPanel: false,
  hasUnsavedChanges: false,
  pendingChanges: {},
};

export const useTourEditorStore = create<TourEditorStore>()((set, get) => ({
  ...initialState,

  // Tour actions
  setCurrentTour: (tour) => {
    set({
      currentTour: tour,
      currentSceneId: tour?.scenes?.[0]?.id || null,
      hasUnsavedChanges: false,
      pendingChanges: {},
    });
  },

  updateTourDraft: (updates) => {
    const { pendingChanges } = get();
    set({
      pendingChanges: {
        ...pendingChanges,
        tour: { ...pendingChanges.tour, ...updates },
      },
      hasUnsavedChanges: true,
    });
  },

  // Scene actions
  setCurrentScene: (sceneId) => {
    set({ currentSceneId: sceneId, selectedHotspotId: null });
  },

  addSceneDraft: (scene) => {
    const { currentTour, pendingChanges } = get();
    if (!currentTour) return;

    const updatedScenes = [...(currentTour.scenes || []), scene];
    set({
      currentTour: { ...currentTour, scenes: updatedScenes },
      pendingChanges: {
        ...pendingChanges,
        scenes: {
          ...pendingChanges.scenes,
          [scene.id]: scene,
        },
      },
      hasUnsavedChanges: true,
    });
  },

  updateSceneDraft: (sceneId, updates) => {
    const { pendingChanges } = get();
    set({
      pendingChanges: {
        ...pendingChanges,
        scenes: {
          ...pendingChanges.scenes,
          [sceneId]: { ...pendingChanges.scenes?.[sceneId], ...updates },
        },
      },
      hasUnsavedChanges: true,
    });
  },

  removeSceneDraft: (sceneId) => {
    const { currentTour, currentSceneId, pendingChanges } = get();
    if (!currentTour?.scenes) return;

    const updatedScenes = currentTour.scenes.filter((s) => s.id !== sceneId);
    const newCurrentSceneId = currentSceneId === sceneId
      ? updatedScenes[0]?.id || null
      : currentSceneId;

    set({
      currentTour: { ...currentTour, scenes: updatedScenes },
      currentSceneId: newCurrentSceneId,
      pendingChanges: {
        ...pendingChanges,
        scenes: {
          ...pendingChanges.scenes,
          [sceneId]: { id: sceneId, deleted: true } as Partial<Scene>,
        },
      },
      hasUnsavedChanges: true,
    });
  },

  reorderScenes: (sceneIds) => {
    const { currentTour } = get();
    if (!currentTour?.scenes) return;

    const sceneMap = new Map(currentTour.scenes.map((s) => [s.id, s]));
    const reorderedScenes = sceneIds
      .map((id, index) => {
        const scene = sceneMap.get(id);
        return scene ? { ...scene, order_index: index } : null;
      })
      .filter((s): s is Scene => s !== null);

    set({
      currentTour: { ...currentTour, scenes: reorderedScenes },
      hasUnsavedChanges: true,
    });
  },

  // Hotspot actions
  selectHotspot: (hotspotId) => {
    set({ selectedHotspotId: hotspotId });
  },

  addHotspotDraft: (sceneId, hotspot) => {
    const { currentTour, pendingChanges } = get();
    if (!currentTour?.scenes) return;

    const updatedScenes = currentTour.scenes.map((scene) => {
      if (scene.id === sceneId) {
        return {
          ...scene,
          hotspots: [...(scene.hotspots || []), hotspot],
        };
      }
      return scene;
    });

    set({
      currentTour: { ...currentTour, scenes: updatedScenes },
      selectedHotspotId: hotspot.id,
      pendingChanges: {
        ...pendingChanges,
        hotspots: {
          ...pendingChanges.hotspots,
          [hotspot.id]: hotspot,
        },
      },
      hasUnsavedChanges: true,
    });
  },

  updateHotspotDraft: (hotspotId, updates) => {
    const { pendingChanges } = get();
    set({
      pendingChanges: {
        ...pendingChanges,
        hotspots: {
          ...pendingChanges.hotspots,
          [hotspotId]: { ...pendingChanges.hotspots?.[hotspotId], ...updates },
        },
      },
      hasUnsavedChanges: true,
    });
  },

  removeHotspotDraft: (hotspotId) => {
    const { currentTour, selectedHotspotId, pendingChanges } = get();
    if (!currentTour?.scenes) return;

    const updatedScenes = currentTour.scenes.map((scene) => ({
      ...scene,
      hotspots: scene.hotspots?.filter((h) => h.id !== hotspotId),
    }));

    set({
      currentTour: { ...currentTour, scenes: updatedScenes },
      selectedHotspotId: selectedHotspotId === hotspotId ? null : selectedHotspotId,
      pendingChanges: {
        ...pendingChanges,
        hotspots: {
          ...pendingChanges.hotspots,
          [hotspotId]: { id: hotspotId, deleted: true } as Partial<Hotspot>,
        },
      },
      hasUnsavedChanges: true,
    });
  },

  // UI actions
  setEditing: (isEditing) => set({ isEditing }),
  setPreviewing: (isPreviewing) => set({ isPreviewing }),
  toggleScenePanel: () => set((state) => ({ showScenePanel: !state.showScenePanel })),
  toggleHotspotPanel: () => set((state) => ({ showHotspotPanel: !state.showHotspotPanel })),
  toggleSettingsPanel: () => set((state) => ({ showSettingsPanel: !state.showSettingsPanel })),

  // Save actions
  markAsSaved: () => {
    set({ hasUnsavedChanges: false, pendingChanges: {} });
  },

  discardChanges: () => {
    set({ hasUnsavedChanges: false, pendingChanges: {} });
  },

  reset: () => {
    set(initialState);
  },
}));
