import { apiClient } from './client';
import type { User } from '@/types';

export interface UpdateProfileData {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  notification_settings?: Record<string, boolean>;
  privacy_settings?: Record<string, boolean>;
  preferences?: Record<string, unknown>;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

/**
 * Helper to extract data from API response.
 * Backend returns data directly (no wrapper), so we just return response.data.
 */
function extractData<T>(response: { data: T }): T {
  return response.data;
}

export const usersApi = {
  /**
   * Get the current user's profile
   */
  async getProfile(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
    return extractData(response);
  },

  /**
   * Update the current user's profile
   */
  async updateProfile(data: UpdateProfileData): Promise<User> {
    const response = await apiClient.put<User>('/users/me', data);
    return extractData(response);
  },

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    await apiClient.put('/users/me/password', data);
  },

  /**
   * Upload profile image
   */
  async uploadProfileImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<{ url: string }>(
      '/users/me/profile-image',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return extractData(response);
  },

  /**
   * Delete profile image
   */
  async deleteProfileImage(): Promise<void> {
    await apiClient.delete('/users/me/profile-image');
  },

  /**
   * Get user's usage statistics
   */
  async getUsageStats(): Promise<{
    tours_count: number;
    scenes_count: number;
    storage_used: number;
    storage_limit: number;
    api_calls_this_month: number;
  }> {
    const response = await apiClient.get<{
      tours_count: number;
      scenes_count: number;
      storage_used: number;
      storage_limit: number;
      api_calls_this_month: number;
    }>('/users/me/usage');
    return extractData(response);
  },

  /**
   * Delete account
   */
  async deleteAccount(password: string): Promise<void> {
    await apiClient.delete('/users/me', {
      data: { password },
    });
  },
};
