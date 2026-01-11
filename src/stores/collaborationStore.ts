import { create } from 'zustand';

// Activity item type for tour collaboration
export interface ActivityItem {
  id: string;
  tour_id: string;
  user_id: string;
  action: 'created' | 'updated' | 'deleted' | 'commented' | 'published' | 'invited' | 'left';
  target_type: 'tour' | 'scene' | 'hotspot' | 'comment' | 'collaborator';
  target_id?: string;
  target_title?: string;
  details?: Record<string, unknown>;
  user?: {
    id: string;
    full_name: string | null;
    profile_image_url: string | null;
  };
  created_at: string;
}

interface CollaborationState {
  activities: ActivityItem[];
  isLoadingActivities: boolean;
  collaborators: Array<{
    id: string;
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    user?: {
      full_name: string | null;
      email: string | null;
      profile_image_url: string | null;
    };
  }>;
  isLoadingCollaborators: boolean;

  // Actions
  setActivities: (activities: ActivityItem[]) => void;
  addActivity: (activity: ActivityItem) => void;
  setLoadingActivities: (loading: boolean) => void;
  setCollaborators: (collaborators: CollaborationState['collaborators']) => void;
  setLoadingCollaborators: (loading: boolean) => void;
  clearCollaboration: () => void;
}

export const useCollaborationStore = create<CollaborationState>((set) => ({
  activities: [],
  isLoadingActivities: false,
  collaborators: [],
  isLoadingCollaborators: false,

  setActivities: (activities) => set({ activities }),

  addActivity: (activity) =>
    set((state) => ({
      activities: [activity, ...state.activities],
    })),

  setLoadingActivities: (loading) => set({ isLoadingActivities: loading }),

  setCollaborators: (collaborators) => set({ collaborators }),

  setLoadingCollaborators: (loading) => set({ isLoadingCollaborators: loading }),

  clearCollaboration: () =>
    set({
      activities: [],
      isLoadingActivities: false,
      collaborators: [],
      isLoadingCollaborators: false,
    }),
}));
