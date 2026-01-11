import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_BASE_URL, API_TIMEOUT, STORAGE_KEYS, ROUTES, ERROR_MESSAGES } from '@/constants';
import type { AuthTokens, ApiError } from '@/types';

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management
// Zustand persist stores: { state: { tokens: {...} }, version: 0 }
// We need to extract tokens from this format
function getTokens(): AuthTokens | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    // Handle Zustand persist format
    if (parsed?.state?.tokens) {
      return parsed.state.tokens;
    }
    // Handle raw token format (for backwards compatibility)
    if (parsed?.access_token) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function setTokens(tokens: AuthTokens): void {
  // Update in Zustand persist format for consistency
  const stored = localStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.state) {
        // Update existing Zustand format
        parsed.state.tokens = tokens;
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(parsed));
        return;
      }
    } catch {
      // Fall through to default behavior
    }
  }
  // Create new Zustand-compatible format
  localStorage.setItem(
    STORAGE_KEYS.AUTH_TOKENS,
    JSON.stringify({ state: { tokens }, version: 0 })
  );
}

function clearTokens(): void {
  localStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
  localStorage.removeItem(STORAGE_KEYS.USER);
}

// Request interceptor - Add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const tokens = getTokens();
    if (tokens?.access_token) {
      config.headers.Authorization = `Bearer ${tokens.access_token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token refresh
apiClient.interceptors.response.use(
  response => response,
  async (error: AxiosError<ApiError>) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && originalRequest) {
      // Try to refresh token
      const tokens = getTokens();
      if (tokens?.refresh_token) {
        try {
          const refreshResponse = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refresh_token: tokens.refresh_token,
          });

          // Backend returns data directly, not wrapped
          const newTokens: AuthTokens = refreshResponse.data;
          setTokens(newTokens);

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${newTokens.access_token}`;
          return apiClient(originalRequest);
        } catch {
          // Refresh failed - clear tokens and redirect to login
          clearTokens();
          window.location.href = ROUTES.LOGIN;
          return Promise.reject(new Error(ERROR_MESSAGES.SESSION_EXPIRED));
        }
      } else {
        // No refresh token - redirect to login
        clearTokens();
        window.location.href = ROUTES.LOGIN;
        return Promise.reject(new Error(ERROR_MESSAGES.SESSION_EXPIRED));
      }
    }

    // Handle other errors - backend returns { detail: { code, message } } or { detail: string }
    let errorMessage: string = ERROR_MESSAGES.GENERIC;
    const responseData = error.response?.data;

    if (responseData?.detail) {
      if (typeof responseData.detail === 'string') {
        errorMessage = responseData.detail;
      } else if (responseData.detail.message) {
        errorMessage = responseData.detail.message;
      }
    } else if (responseData?.error?.message) {
      errorMessage = responseData.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return Promise.reject(new Error(errorMessage));
  }
);

// Export utilities
export { apiClient, getTokens, setTokens, clearTokens };
export default apiClient;
