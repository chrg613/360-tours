import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api';
import type { User, AuthTokens } from '@/types';

// Mock the API
vi.mock('@/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    getCurrentUser: vi.fn(),
  },
}));

// Helper to create a mock user
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 1,
  supabase_user_id: 'supabase-user-id',
  email: 'test@example.com',
  phone: '+1234567890',
  full_name: 'Test User',
  date_of_birth: null,
  profile_image_url: null,
  role: 'user',
  is_active: true,
  is_verified: true,
  preferences: {},
  notification_settings: {},
  privacy_settings: {},
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

// Helper to create mock tokens
const createMockTokens = (overrides?: Partial<AuthTokens>): AuthTokens => ({
  access_token: 'access-token',
  refresh_token: 'refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  ...overrides,
});

describe('authStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAuthStore.setState({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('has correct initial state', () => {
      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('setUser', () => {
    it('sets user and updates isAuthenticated to true', () => {
      const mockUser = createMockUser();

      useAuthStore.getState().setUser(mockUser);

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('sets isAuthenticated to false when user is null', () => {
      useAuthStore.getState().setUser(null);

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('sets tokens correctly', () => {
      const mockTokens = createMockTokens();

      useAuthStore.getState().setTokens(mockTokens);

      expect(useAuthStore.getState().tokens).toEqual(mockTokens);
    });
  });

  describe('setLoading', () => {
    it('sets loading state', () => {
      useAuthStore.getState().setLoading(true);
      expect(useAuthStore.getState().isLoading).toBe(true);

      useAuthStore.getState().setLoading(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });
  });

  describe('setError', () => {
    it('sets error message', () => {
      useAuthStore.getState().setError('An error occurred');
      expect(useAuthStore.getState().error).toBe('An error occurred');
    });

    it('clears error when set to null', () => {
      useAuthStore.getState().setError('An error');
      useAuthStore.getState().setError(null);
      expect(useAuthStore.getState().error).toBeNull();
    });
  });

  describe('login', () => {
    it('logs in successfully', async () => {
      const mockResponse = {
        user: createMockUser(),
        tokens: createMockTokens(),
      };

      vi.mocked(authApi.login).mockResolvedValue(mockResponse);

      await useAuthStore.getState().login('+1234567890', 'password');

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockResponse.user);
      expect(state.tokens).toEqual(mockResponse.tokens);
      expect(state.isAuthenticated).toBe(true);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('handles login error', async () => {
      vi.mocked(authApi.login).mockRejectedValue(new Error('Invalid credentials'));

      await expect(
        useAuthStore.getState().login('+1234567890', 'wrong-password')
      ).rejects.toThrow('Invalid credentials');

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Invalid credentials');
    });
  });

  describe('register', () => {
    it('registers successfully', async () => {
      const mockResponse = {
        user: createMockUser({ email: 'new@example.com', full_name: 'New User' }),
        tokens: createMockTokens(),
      };

      vi.mocked(authApi.register).mockResolvedValue(mockResponse);

      await useAuthStore.getState().register({
        phone: '+1234567890',
        password: 'password',
        full_name: 'New User',
        email: 'new@example.com',
      });

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockResponse.user);
      expect(state.isAuthenticated).toBe(true);
    });

    it('handles registration error', async () => {
      vi.mocked(authApi.register).mockRejectedValue(new Error('Phone already exists'));

      await expect(
        useAuthStore.getState().register({
          phone: '+1234567890',
          password: 'password',
          full_name: 'Test',
        })
      ).rejects.toThrow('Phone already exists');

      expect(useAuthStore.getState().error).toBe('Phone already exists');
    });
  });

  describe('logout', () => {
    it('clears auth state on logout', async () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: createMockUser(),
        tokens: createMockTokens(),
        isAuthenticated: true,
      });

      vi.mocked(authApi.logout).mockResolvedValue(undefined);

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });

    it('clears auth state even if API call fails', async () => {
      useAuthStore.setState({
        user: createMockUser(),
        tokens: createMockTokens(),
        isAuthenticated: true,
      });

      vi.mocked(authApi.logout).mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().logout();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('fetchCurrentUser', () => {
    it('fetches and sets current user', async () => {
      const mockUser = createMockUser();

      useAuthStore.setState({
        tokens: createMockTokens(),
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      await useAuthStore.getState().fetchCurrentUser();

      const state = useAuthStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.isAuthenticated).toBe(true);
    });

    it('does nothing if no tokens', async () => {
      await useAuthStore.getState().fetchCurrentUser();

      expect(authApi.getCurrentUser).not.toHaveBeenCalled();
    });

    it('clears auth on error', async () => {
      useAuthStore.setState({
        tokens: createMockTokens(),
        isAuthenticated: true,
      });

      vi.mocked(authApi.getCurrentUser).mockRejectedValue(new Error('Unauthorized'));

      await useAuthStore.getState().fetchCurrentUser();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('checkAuth', () => {
    it('verifies authentication status', async () => {
      const mockUser = createMockUser();

      useAuthStore.setState({
        tokens: createMockTokens(),
      });

      vi.mocked(authApi.getCurrentUser).mockResolvedValue(mockUser);

      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
    });

    it('sets loading to false if no tokens', async () => {
      await useAuthStore.getState().checkAuth();

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(authApi.getCurrentUser).not.toHaveBeenCalled();
    });
  });

  describe('clearAuth', () => {
    it('clears all auth state', () => {
      useAuthStore.setState({
        user: createMockUser(),
        tokens: createMockTokens(),
        isAuthenticated: true,
        isLoading: true,
        error: 'Some error',
      });

      useAuthStore.getState().clearAuth();

      const state = useAuthStore.getState();
      expect(state.user).toBeNull();
      expect(state.tokens).toBeNull();
      expect(state.isAuthenticated).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });
  });
});
