import { apiClient, setTokens, clearTokens } from './client';
import type {
  User,
  AuthTokens,
  LoginCredentials,
  RegisterCredentials,
} from '@/types';

export const authApi = {
  /**
   * Login with phone and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post<{ access_token: string; token_type: string; user: User }>(
      '/auth/login/',
      credentials
    );
    const { access_token, user } = response.data;
    const tokens: AuthTokens = {
      access_token,
      refresh_token: '', // Backend doesn't return refresh token on login
      expires_in: 3600,
      token_type: 'bearer',
    };
    setTokens(tokens);
    return { user, tokens };
  },

  /**
   * Register a new user with phone
   */
  async register(data: RegisterCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await apiClient.post<{ message: string; user: User; access_token: string | null }>(
      '/auth/register/',
      data
    );
    const { user, access_token } = response.data;
    const tokens: AuthTokens = {
      access_token: access_token || '',
      refresh_token: '',
      expires_in: 3600,
      token_type: 'bearer',
    };
    if (access_token) {
      setTokens(tokens);
    }
    return { user, tokens };
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearTokens();
    }
  },

  /**
   * Get the current authenticated user
   */
  async getCurrentUser(): Promise<User> {
    // Backend returns data directly, not wrapped
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  /**
   * Refresh the access token
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Backend returns data directly, not wrapped
    const response = await apiClient.post<AuthTokens>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    const tokens = response.data;
    setTokens(tokens);
    return tokens;
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    await apiClient.post('/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  /**
   * Verify email address
   */
  async verifyEmail(token: string): Promise<void> {
    await apiClient.post('/auth/verify-email', { token });
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<void> {
    await apiClient.post('/auth/resend-verification');
  },
};
