import axios from 'axios';

import { apiClient, extractData } from './client';
import { SUPABASE_PUBLISHABLE_KEY, API_TIMEOUT } from '@/constants';
import type { FileUploadResponse, MediaFile, PaginatedResponse } from '@/types';
import { supabaseAuth } from '@/lib/supabaseAuth';

export interface UploadOptions {
  folder?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  onProgress?: (progress: number) => void;
}

export interface PresignedUploadRequestItem {
  filename: string;
  content_type?: string;
  file_size?: number;
  folder_type?: string;
  tour_id?: string;
  visibility?: 'public' | 'private' | 'unlisted';
}

export interface PresignedUploadResponseItem {
  upload_id: string;
  signed_url: string;
  token: string;
  path: string;
  public_url: string;
  media?: MediaFile | null;
}

export const uploadApi = {
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

    const response = await apiClient.post<{ items: FileUploadResponse[] }>(
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
    return extractData(response).items;
  },

  async getMediaFiles(params?: {
    page?: number;
    page_size?: number;
    folder?: string;
    mime_type?: string;
  }): Promise<PaginatedResponse<MediaFile>> {
    const response = await apiClient.get<PaginatedResponse<MediaFile>>('/upload/media', {
      params,
    });
    return extractData(response);
  },

  async getMediaFile(id: string): Promise<MediaFile> {
    const response = await apiClient.get<MediaFile>(`/upload/media/${id}`);
    return extractData(response);
  },

  async deleteMediaFile(id: string): Promise<void> {
    await apiClient.delete(`/upload/media/${id}`);
  },

  async createPresignedUploads(
    files: PresignedUploadRequestItem[]
  ): Promise<PresignedUploadResponseItem[]> {
    const response = await apiClient.post<{ items: PresignedUploadResponseItem[] }>(
      '/upload/presigned',
      { files }
    );
    return extractData(response).items;
  },

  async uploadToSignedUrl(
    signedUrl: string,
    file: File,
    options: { onProgress?: (progress: number) => void } = {}
  ): Promise<void> {
    if (!SUPABASE_PUBLISHABLE_KEY) {
      throw new Error(
        'Missing Supabase publishable key (VITE_SUPABASE_PUBLISHABLE_KEY or VITE_SUPABASE_ANON_KEY)'
      );
    }

    const accessToken = await supabaseAuth.getAccessToken();
    const authToken = accessToken || SUPABASE_PUBLISHABLE_KEY;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    try {
      await axios.put(signedUrl, file, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${authToken}`,
          'x-upsert': 'false',
          'Content-Type': file.type || 'application/octet-stream',
        },
        signal: controller.signal,
        onUploadProgress: (progressEvent) => {
          if (!options.onProgress) return;
          const total = progressEvent.total ?? file.size;
          if (!total) return;
          const progress = Math.round((progressEvent.loaded * 100) / total);
          options.onProgress(progress);
        },
      });
    } finally {
      clearTimeout(timeoutId);
    }
  },

  async confirmUpload(uploadId: string): Promise<MediaFile> {
    const response = await apiClient.post<{ media: MediaFile; message: string }>(
      `/upload/confirm/${uploadId}`
    );
    return extractData(response).media;
  },
};
