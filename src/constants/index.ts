// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
export const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 30000;

// Supabase Configuration
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Feature Flags
export const ENABLE_ANALYTICS = import.meta.env.VITE_ENABLE_ANALYTICS === 'true';
export const ENABLE_VR_MODE = import.meta.env.VITE_ENABLE_VR_MODE === 'true';
export const ENABLE_AI_FEATURES = import.meta.env.VITE_ENABLE_AI_FEATURES === 'true';

// Upload Configuration
export const MAX_UPLOAD_SIZE_MB = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB) || 50;
export const MAX_UPLOAD_SIZE_BYTES = MAX_UPLOAD_SIZE_MB * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = (
  import.meta.env.VITE_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp'
).split(',');

// App Configuration
export const APP_NAME = import.meta.env.VITE_APP_NAME || '360 Viewer';
export const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  TOURS: '/tours',
  TOUR_CREATE: '/tours/create',
  TOUR_EDIT: '/tours/:id/edit',
  TOUR_VIEW: '/tours/:id',
  TOUR_PREVIEW: '/tours/:id/preview',
  TOUR_ANALYTICS: '/tours/:id/analytics',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  PUBLIC_TOUR: '/view/:id',
  EMBED_TOUR: '/embed/:id',
} as const;

// Navigation Items
export const NAV_ITEMS = [
  { label: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'LayoutDashboard' },
  { label: 'Tours', path: ROUTES.TOURS, icon: 'Images' },
  { label: 'Analytics', path: '/analytics', icon: 'BarChart3' },
  { label: 'Settings', path: ROUTES.SETTINGS, icon: 'Settings' },
] as const;

// Tour Status Options
export const TOUR_STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-100 text-gray-700' },
  { value: 'published', label: 'Published', color: 'bg-green-100 text-green-700' },
  { value: 'archived', label: 'Archived', color: 'bg-yellow-100 text-yellow-700' },
] as const;

// Hotspot Types
export const HOTSPOT_TYPES = [
  { value: 'navigation', label: 'Navigation', icon: 'ArrowRight', description: 'Navigate to another scene' },
  { value: 'info', label: 'Information', icon: 'Info', description: 'Display text or images' },
  { value: 'audio', label: 'Audio', icon: 'Volume2', description: 'Play audio content' },
  { value: 'video', label: 'Video', icon: 'Play', description: 'Play video content' },
  { value: 'link', label: 'Link', icon: 'Link', description: 'Open external URL' },
  { value: 'custom', label: 'Custom', icon: 'Code', description: 'Custom HTML or action' },
] as const;

// Hotspot Icons
export const HOTSPOT_ICONS = [
  { value: 'arrow-right', label: 'Arrow Right' },
  { value: 'arrow-up', label: 'Arrow Up' },
  { value: 'arrow-down', label: 'Arrow Down' },
  { value: 'info', label: 'Info' },
  { value: 'eye', label: 'Eye' },
  { value: 'star', label: 'Star' },
  { value: 'heart', label: 'Heart' },
  { value: 'camera', label: 'Camera' },
  { value: 'map-pin', label: 'Map Pin' },
] as const;

// Default Tour Settings
export const DEFAULT_TOUR_SETTINGS = {
  auto_rotate: false,
  auto_rotate_speed: 1,
  show_navbar: true,
  enable_fullscreen: true,
  enable_vr: true,
  branding: {
    show_watermark: true,
  },
};

// Default Scene Metadata
export const DEFAULT_SCENE_METADATA = {
  initial_view: {
    yaw: 0,
    pitch: 0,
    zoom: 50,
  },
  camera: {
    fov: 70,
    min_fov: 30,
    max_fov: 90,
  },
};

// Query Keys for TanStack Query
export const QUERY_KEYS = {
  USER: 'user',
  TOURS: 'tours',
  TOUR: 'tour',
  SCENES: 'scenes',
  SCENE: 'scene',
  HOTSPOTS: 'hotspots',
  HOTSPOT: 'hotspot',
  FLOOR_PLANS: 'floor-plans',
  ANALYTICS: 'analytics',
  DASHBOARD_STATS: 'dashboard-stats',
  MEDIA_FILES: 'media-files',
  AI_JOBS: 'ai-jobs',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  AUTH_TOKENS: '360viewer_auth_tokens',
  USER: '360viewer_user',
  THEME: '360viewer_theme',
  TOUR_DRAFTS: '360viewer_tour_drafts',
  VIEWER_PREFERENCES: '360viewer_viewer_prefs',
} as const;

// Photo Sphere Viewer Defaults
export const VIEWER_DEFAULTS = {
  defaultPitch: 0,
  defaultYaw: 0,
  defaultZoom: 50,
  minFov: 30,
  maxFov: 90,
  moveSpeed: 1,
  zoomSpeed: 1,
  autorotateDelay: 2000,
  autorotateSpeed: '1rpm',
  navbar: ['autorotate', 'zoom', 'fullscreen'],
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  UPLOAD_SIZE: `File size exceeds the maximum limit of ${MAX_UPLOAD_SIZE_MB}MB.`,
  UPLOAD_TYPE: 'Invalid file type. Please upload a JPEG, PNG, or WebP image.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  TOUR_CREATED: 'Tour created successfully!',
  TOUR_UPDATED: 'Tour updated successfully!',
  TOUR_DELETED: 'Tour deleted successfully!',
  TOUR_PUBLISHED: 'Tour published successfully!',
  SCENE_ADDED: 'Scene added successfully!',
  SCENE_UPDATED: 'Scene updated successfully!',
  SCENE_DELETED: 'Scene deleted successfully!',
  HOTSPOT_CREATED: 'Hotspot created successfully!',
  HOTSPOT_UPDATED: 'Hotspot updated successfully!',
  HOTSPOT_DELETED: 'Hotspot deleted successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  PASSWORD_CHANGED: 'Password changed successfully!',
} as const;
