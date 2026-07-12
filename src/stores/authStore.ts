import { create } from 'zustand';
import type { User, AuthTokens } from '@/types';
import { authApi } from '@/api';
import type { IdentifierChannel } from '@/api/auth';
import { supabaseAuth } from '@/lib/supabaseAuth';
import { setLastAuthMethod, type AuthMethod } from '@/lib/lastAuthMethod';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  setUser: (user: User | null) => void;
  setTokens: (tokens: AuthTokens | null) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  login: (phone: string, password: string) => Promise<void>;
  /** Password login for the identifier state-machine (email or phone channel). */
  loginWithPassword: (channel: IdentifierChannel, identifier: string, password: string) => Promise<void>;
  /** Verify an OTP (email or phone channel) to establish a session and load the user. */
  verifyLoginOtp: (channel: IdentifierChannel, identifier: string, token: string) => Promise<void>;
  /**
   * Set a password on the current (OTP-authenticated) session, then record the
   * password-based last_auth_method. Used by the mandatory set-password step
   * after OTP when the account had no password.
   */
  setPasswordAndComplete: (channel: IdentifierChannel, identifier: string, password: string) => Promise<void>;
  register: (channel: 'email' | 'phone', identifier: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchCurrentUser: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

let authListenerUnsubscribe: (() => void) | null = null;
let authListenerInitialized = false;

export const useAuthStore = create<AuthStore>()((set, get) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
  },

  setTokens: (tokens) => {
    set({ tokens });
  },

  setLoading: (isLoading) => {
    set({ isLoading });
  },

  setError: (error) => {
    set({ error });
  },

  login: async (phone, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await authApi.login({ phone, password });
      set({
        user,
        tokens,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
      setLastAuthMethod('phone_password', phone);
      void authApi.recordLastMethod('phone_password');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  loginWithPassword: async (channel, identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const session =
        channel === 'email'
          ? await supabaseAuth.signInWithEmailPassword({ email: identifier, password })
          : await supabaseAuth.signInWithPassword({ phone: identifier, password });

      const tokens: AuthTokens = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
      };
      set({ tokens });

      const user = await authApi.getCurrentUser();
      set({ user, tokens, isAuthenticated: true, isLoading: false, error: null });

      const method: AuthMethod = channel === 'email' ? 'email_password' : 'phone_password';
      setLastAuthMethod(method, identifier);
      void authApi.recordLastMethod(method);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  verifyLoginOtp: async (channel, identifier, token) => {
    set({ isLoading: true, error: null });
    try {
      const session =
        channel === 'email'
          ? await supabaseAuth.verifyEmailOtp({ email: identifier, token })
          : await supabaseAuth.verifyOtp({ phone: identifier, token });

      const tokens: AuthTokens = {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
      };
      set({ tokens });

      const user = await authApi.getCurrentUser();
      set({ user, tokens, isAuthenticated: true, isLoading: false, error: null });

      const method: AuthMethod = channel === 'email' ? 'email_otp' : 'phone_otp';
      setLastAuthMethod(method, identifier);
      void authApi.recordLastMethod(method);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid or expired OTP';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  setPasswordAndComplete: async (channel, identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      // Session is already established by the preceding OTP verification.
      await supabaseAuth.updatePassword(password);
      set({ isLoading: false, error: null });

      // The account now logs in by password — record that as the last method.
      const method: AuthMethod = channel === 'email' ? 'email_password' : 'phone_password';
      setLastAuthMethod(method, identifier);
      void authApi.recordLastMethod(method);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set password';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  register: async (channel, identifier, password) => {
    set({ isLoading: true, error: null });
    try {
      const { user, tokens } = await authApi.register({ channel, identifier, password });
      if (!tokens?.access_token || !tokens?.refresh_token || !user) {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
          error: 'Account created. Please verify your account and log in.',
        });
        throw new Error('Account created. Please verify your account and log in.');
      }

      set({ user, tokens, isAuthenticated: true, isLoading: false, error: null });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      set({ isLoading: false, error: message });
      throw error;
    }
  },

  logout: async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout API call failed (non-critical):', error instanceof Error ? error.message : error);
    } finally {
      get().clearAuth();
    }
  },

  fetchCurrentUser: async () => {
    if (!supabaseAuth.getTokens()) return;

    set({ isLoading: true });
    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch current user, signing out:', error instanceof Error ? error.message : error);
      try {
        await authApi.logout();
      } catch (logoutError) {
        console.error('Logout during fetchCurrentUser failed:', logoutError instanceof Error ? logoutError.message : logoutError);
      }
      get().clearAuth();
    }
  },

  checkAuth: async () => {
    if (!authListenerInitialized) {
      authListenerInitialized = true;

      if (authListenerUnsubscribe) {
        authListenerUnsubscribe();
      }

      const { unsubscribe } = supabaseAuth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          get().clearAuth();
          return;
        }

        if (session) {
          set({
            tokens: {
              access_token: session.access_token,
              refresh_token: session.refresh_token,
              expires_in: session.expires_in,
              token_type: session.token_type,
            },
          });
        }

        if (event === 'SIGNED_IN' && session && !get().isAuthenticated) {
          try {
            const user = await authApi.getCurrentUser();
            set({ user, isAuthenticated: true });
          } catch (error) {
            console.error('Failed to fetch user on SIGNED_IN, signing out:', error instanceof Error ? error.message : error);
            try {
              await authApi.logout();
            } catch (logoutError) {
              console.error('Logout during SIGNED_IN failed:', logoutError instanceof Error ? logoutError.message : logoutError);
            }
            get().clearAuth();
          }
        }
      });

      authListenerUnsubscribe = unsubscribe;
    }

    // If the store already has a fully-hydrated session (user + tokens +
    // isAuthenticated), skip the re-fetch to avoid a race that could wipe the
    // session when a concurrent login action (e.g. verifyLoginOtp) has just
    // established it.
    const { isAuthenticated, user } = get();
    const tokens = supabaseAuth.getTokens();
    if (isAuthenticated && user && tokens) {
      set({ isLoading: false });
      return;
    }

    set({ isLoading: true, error: null });

    if (!tokens) {
      set({ isLoading: false, isAuthenticated: false, user: null, tokens: null });
      return;
    }

    set({ tokens });

    try {
      const user = await authApi.getCurrentUser();
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch user during checkAuth, signing out:', error instanceof Error ? error.message : error);
      try {
        await authApi.logout();
      } catch (logoutError) {
        console.error('Logout during checkAuth failed:', logoutError instanceof Error ? logoutError.message : logoutError);
      }
      get().clearAuth();
      set({ isLoading: false });
    }
  },

  clearAuth: () => {
    set({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  },
}));

export function resetAuthListener() {
  if (authListenerUnsubscribe) {
    authListenerUnsubscribe();
    authListenerUnsubscribe = null;
  }
  authListenerInitialized = false;
}
