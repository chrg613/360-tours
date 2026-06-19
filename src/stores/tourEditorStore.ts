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

  // Undo/redo history
  past: EditorSnapshot[];
  future: EditorSnapshot[];
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

  // Undo/redo actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

type TourEditorStore = TourEditorState & TourEditorActions;

interface EditorSnapshot {
  currentTour: Tour | null;
  currentSceneId: string | null;
  selectedHotspotId: string | null;
  pendingChanges: TourEditorState['pendingChanges'];
  hasUnsavedChanges: boolean;
}

const HISTORY_LIMIT = 50;

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
  past: [],
  future: [],
};

export const useTourEditorStore = create<TourEditorStore>()((set, get) => {
  // Helper that snapshots the current data-state before applying a mutation,
  // pushes it onto `past` (capped at HISTORY_LIMIT), and clears `future`.
  // Only used for DATA-mutating actions; UI-only actions skip history.
  const withHistory = (mutation: (state: TourEditorState) => Partial<TourEditorState>) => {
    const state = get();
    const snapshot: EditorSnapshot = {
      currentTour: state.currentTour,
      currentSceneId: state.currentSceneId,
      selectedHotspotId: state.selectedHotspotId,
      pendingChanges: state.pendingChanges,
      hasUnsavedChanges: state.hasUnsavedChanges,
    };
    const next = mutation(state);
    set({
      ...next,
      past: [...state.past, snapshot].slice(-HISTORY_LIMIT),
      future: [],
    });
  };

  return {
    ...initialState,

    // Tour actions
    setCurrentTour: (tour) => {
      set({
        currentTour: tour,
        currentSceneId: tour?.scenes?.[0]?.id || null,
        hasUnsavedChanges: false,
        pendingChanges: {},
        past: [],
        future: [],
      });
    },

    updateTourDraft: (updates) => {
      withHistory((state) => {
        const currentTour = state.currentTour;
        return {
          // Optimistically apply to currentTour so the UI reflects the change
          // immediately (survives refetch failures too).
          currentTour: currentTour ? { ...currentTour, ...updates } : currentTour,
          pendingChanges: {
            ...state.pendingChanges,
            tour: { ...state.pendingChanges.tour, ...updates },
          },
          hasUnsavedChanges: true,
        };
      });
    },

    // Scene actions
    setCurrentScene: (sceneId) => {
      set({ currentSceneId: sceneId, selectedHotspotId: null });
    },

    addSceneDraft: (scene) => {
      const { currentTour } = get();
      if (!currentTour) return;

      withHistory((state) => {
        const updatedScenes = [...(currentTour.scenes || []), scene];
        return {
          currentTour: { ...currentTour, scenes: updatedScenes },
          pendingChanges: {
            ...state.pendingChanges,
            scenes: {
              ...state.pendingChanges.scenes,
              [scene.id]: scene,
            },
          },
          hasUnsavedChanges: true,
        };
      });
    },

    updateSceneDraft: (sceneId, updates) => {
      withHistory((state) => ({
        pendingChanges: {
          ...state.pendingChanges,
          scenes: {
            ...state.pendingChanges.scenes,
            [sceneId]: { ...state.pendingChanges.scenes?.[sceneId], ...updates },
          },
        },
        hasUnsavedChanges: true,
      }));
    },

    removeSceneDraft: (sceneId) => {
      const { currentTour, currentSceneId } = get();
      if (!currentTour?.scenes) return;
      const scenes = currentTour.scenes;

      withHistory((state) => {
        const updatedScenes = scenes.filter((s) => s.id !== sceneId);
        const newCurrentSceneId =
          currentSceneId === sceneId ? updatedScenes[0]?.id || null : currentSceneId;
        return {
          currentTour: { ...currentTour, scenes: updatedScenes },
          currentSceneId: newCurrentSceneId,
          pendingChanges: {
            ...state.pendingChanges,
            scenes: {
              ...state.pendingChanges.scenes,
              [sceneId]: { id: sceneId, deleted: true } as Partial<Scene>,
            },
          },
          hasUnsavedChanges: true,
        };
      });
    },

    reorderScenes: (sceneIds) => {
      const { currentTour } = get();
      if (!currentTour?.scenes) return;
      const scenes = currentTour.scenes;

      withHistory(() => {
        const sceneMap = new Map(scenes.map((s) => [s.id, s]));
        const reorderedScenes = sceneIds
          .map((id, index) => {
            const scene = sceneMap.get(id);
            return scene ? { ...scene, order_index: index } : null;
          })
          .filter((s): s is Scene => s !== null);

        return {
          currentTour: { ...currentTour, scenes: reorderedScenes },
          hasUnsavedChanges: true,
        };
      });
    },

    // Hotspot actions
    selectHotspot: (hotspotId) => {
      set({ selectedHotspotId: hotspotId });
    },

    addHotspotDraft: (sceneId, hotspot) => {
      const { currentTour } = get();
      if (!currentTour?.scenes) return;
      const scenes = currentTour.scenes;

      withHistory((state) => {
        const updatedScenes = scenes.map((scene) => {
          if (scene.id === sceneId) {
            return {
              ...scene,
              hotspots: [...(scene.hotspots || []), hotspot],
            };
          }
          return scene;
        });

        return {
          currentTour: { ...currentTour, scenes: updatedScenes },
          selectedHotspotId: hotspot.id,
          pendingChanges: {
            ...state.pendingChanges,
            hotspots: {
              ...state.pendingChanges.hotspots,
              [hotspot.id]: hotspot,
            },
          },
          hasUnsavedChanges: true,
        };
      });
    },

    updateHotspotDraft: (hotspotId, updates) => {
      withHistory((state) => ({
        pendingChanges: {
          ...state.pendingChanges,
          hotspots: {
            ...state.pendingChanges.hotspots,
            [hotspotId]: { ...state.pendingChanges.hotspots?.[hotspotId], ...updates },
          },
        },
        hasUnsavedChanges: true,
      }));
    },

    removeHotspotDraft: (hotspotId) => {
      const { currentTour, selectedHotspotId } = get();
      if (!currentTour?.scenes) return;
      const scenes = currentTour.scenes;

      withHistory((state) => {
        const updatedScenes = scenes.map((scene) => ({
          ...scene,
          hotspots: scene.hotspots?.filter((h) => h.id !== hotspotId),
        }));

        return {
          currentTour: { ...currentTour, scenes: updatedScenes },
          selectedHotspotId: selectedHotspotId === hotspotId ? null : selectedHotspotId,
          pendingChanges: {
            ...state.pendingChanges,
            hotspots: {
              ...state.pendingChanges.hotspots,
              [hotspotId]: { id: hotspotId, deleted: true } as Partial<Hotspot>,
            },
          },
          hasUnsavedChanges: true,
        };
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
      // A save is a commit point; clear history so undo cannot
      // re-introduce changes that are already persisted to the server.
      set({ hasUnsavedChanges: false, pendingChanges: {}, past: [], future: [] });
    },

    discardChanges: () => {
      set({ hasUnsavedChanges: false, pendingChanges: {} });
    },

    reset: () => {
      set(initialState);
    },

    // Undo/redo actions
    undo: () => {
      const { past, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      const current: EditorSnapshot = {
        currentTour: get().currentTour,
        currentSceneId: get().currentSceneId,
        selectedHotspotId: get().selectedHotspotId,
        pendingChanges: get().pendingChanges,
        hasUnsavedChanges: get().hasUnsavedChanges,
      };
      set({
        ...previous,
        past: past.slice(0, -1),
        future: [current, ...future].slice(0, HISTORY_LIMIT),
      });
    },

    redo: () => {
      const { past, future } = get();
      if (future.length === 0) return;
      const next = future[0];
      const current: EditorSnapshot = {
        currentTour: get().currentTour,
        currentSceneId: get().currentSceneId,
        selectedHotspotId: get().selectedHotspotId,
        pendingChanges: get().pendingChanges,
        hasUnsavedChanges: get().hasUnsavedChanges,
      };
      set({
        ...next,
        past: [...past, current].slice(-HISTORY_LIMIT),
        future: future.slice(1),
      });
    },

    canUndo: () => get().past.length > 0,
    canRedo: () => get().future.length > 0,
  };
});
