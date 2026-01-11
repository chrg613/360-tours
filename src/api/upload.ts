import { apiClient } from './client';
import type { FileUploadResponse, MediaFile, PaginatedResponse } from '@/types';

export interface UploadOptions {
  folder?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  onProgress?: (progress: number) => void;
}

/**
 * Helper to extract data from API response.
 * Backend returns data directly (no wrapper), so we just return response.data.
 */
function extractData<T>(response: { data: T }): T {
  return response.data;
}

export const uploadApi = {
  /**
   * Upload a single file
   * Backend returns: { file_path, public_url, file_type, file_size, content_type, original_filename }
   */
  async uploadFile(file: File, options: UploadOptions = {}): Promise<FileUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.visibility) {
      formData.append('visibility', options.visibility);
    }

    const response = await apiClient.post<FileUploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (options.onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          options.onProgress(progress);
        }
      },
    });
    return extractData(response);
  },

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    options: UploadOptions = {}
  ): Promise<FileUploadResponse[]> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (options.folder) {
      formData.append('folder', options.folder);
    }
    if (options.visibility) {
      formData.append('visibility', options.visibility);
    }

    const response = await apiClient.post<FileUploadResponse[]>(
      '/upload/batch',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: progressEvent => {
          if (options.onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            options.onProgress(progress);
          }
        },
      }
    );
    return extractData(response);
  },

  /**
   * Get user's media files
   */
  async getMediaFiles(params?: {
    page?: number;
    page_size?: number;
    folder?: string;
    mime_type?: string;
  }): Promise<PaginatedResponse<MediaFile>> {
    const response = await apiClient.get<PaginatedResponse<MediaFile>>('/media', {
      params,
    });
    return extractData(response);
  },

  /**
   * Get a single media file
   */
  async getMediaFile(id: string): Promise<MediaFile> {
    const response = await apiClient.get<MediaFile>(`/media/${id}`);
    return extractData(response);
  },

  /**
   * Delete a media file
   */
  async deleteMediaFile(id: string): Promise<void> {
    await apiClient.delete(`/media/${id}`);
  },

  /**
   * Get upload URL for direct upload (presigned URL)
   */
  async getUploadUrl(params: {
    filename: string;
    content_type: string;
    folder?: string;
  }): Promise<{
    upload_url: string;
    file_url: string;
    expires_at: string;
  }> {
    const response = await apiClient.post<{
      upload_url: string;
      file_url: string;
      expires_at: string;
    }>('/upload/presigned', params);
    return extractData(response);
  },
};
