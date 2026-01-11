import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Images, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Progress,
} from '@/components/ui';
import { toursApi, uploadApi } from '@/api';
import { tourSchema } from '@/utils/validation';
import type { TourFormData } from '@/utils/validation';
import { validateImageFile } from '@/utils/validation';
import { ROUTES, QUERY_KEYS, DEFAULT_TOUR_SETTINGS } from '@/constants';
import { cn } from '@/utils';
import type { Tour } from '@/types';

interface UploadingFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export function TourCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'info' | 'upload'>('info');
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [createdTour, setCreatedTour] = useState<Tour | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TourFormData>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'draft',
      is_public: false,
      settings: DEFAULT_TOUR_SETTINGS,
    },
  });

  // Create tour mutation
  const createMutation = useMutation({
    mutationFn: (data: TourFormData) => toursApi.createTour(data),
    onSuccess: (tour) => {
      setCreatedTour(tour);
      setStep('upload');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOURS] });
    },
  });

  // Add scene mutation
  const addSceneMutation = useMutation({
    mutationFn: ({ tourId, imageUrl }: { tourId: string; imageUrl: string }) =>
      toursApi.createScene(tourId, { image_url: imageUrl }),
  });

  const onSubmit = async (data: TourFormData) => {
    await createMutation.mutateAsync(data);
  };

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: UploadingFile[] = [];

    files.forEach((file) => {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push({
          file,
          progress: 0,
          status: 'pending',
        });
      } else {
        validFiles.push({
          file,
          progress: 0,
          status: 'error',
          error: validation.error,
        });
      }
    });

    setUploadingFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    const validFiles: UploadingFile[] = [];

    files.forEach((file) => {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push({
          file,
          progress: 0,
          status: 'pending',
        });
      } else {
        validFiles.push({
          file,
          progress: 0,
          status: 'error',
          error: validation.error,
        });
      }
    });

    setUploadingFiles((prev) => [...prev, ...validFiles]);
  }, []);

  const removeFile = (index: number) => {
    setUploadingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!createdTour) return;

    for (let i = 0; i < uploadingFiles.length; i++) {
      const uploadFile = uploadingFiles[i];
      if (uploadFile.status !== 'pending') continue;

      setUploadingFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: 'uploading' as const } : f))
      );

      try {
        const result = await uploadApi.uploadFile(uploadFile.file, {
          folder: 'scenes',
          visibility: 'public',
          onProgress: (progress) => {
            setUploadingFiles((prev) =>
              prev.map((f, idx) => (idx === i ? { ...f, progress } : f))
            );
          },
        });

        // Add scene to tour
        await addSceneMutation.mutateAsync({
          tourId: createdTour.id,
          imageUrl: result.public_url,
        });

        setUploadingFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: 'completed' as const, url: result.public_url } : f
          )
        );
      } catch (err) {
        setUploadingFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: 'error' as const, error: 'Upload failed' }
              : f
          )
        );
      }
    }

    // Refresh tour data
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOURS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOUR, createdTour.id] });
  };

  const pendingCount = uploadingFiles.filter((f) => f.status === 'pending').length;
  const completedCount = uploadingFiles.filter((f) => f.status === 'completed').length;
  const isUploading = uploadingFiles.some((f) => f.status === 'uploading');

  return (
    <div className="animate-fade-in mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(ROUTES.TOURS)}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
            Create New Tour
          </h1>
          <p className="text-[var(--color-text-muted)]">
            {step === 'info' ? 'Step 1: Tour Information' : 'Step 2: Upload Scenes'}
          </p>
        </div>
      </div>

      {/* Step 1: Tour Info */}
      {step === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle>Tour Information</CardTitle>
            <CardDescription>
              Enter the basic information for your virtual tour
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <Input
                label="Tour Title"
                {...register('title')}
                placeholder="e.g., Modern Downtown Apartment"
                error={errors.title?.message}
              />

              <div className="w-full">
                <label className="mb-1.5 block text-sm font-medium text-[var(--color-text-primary)]">
                  Description
                </label>
                <textarea
                  {...register('description')}
                  placeholder="Describe your virtual tour..."
                  rows={4}
                  className="flex w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-500)]"
                />
                {errors.description && (
                  <p className="mt-1.5 text-sm text-[var(--color-error-500)]">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(ROUTES.TOURS)}
                >
                  Cancel
                </Button>
                <Button type="submit" isLoading={createMutation.isPending}>
                  Continue to Upload
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && createdTour && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Upload 360° Images</CardTitle>
              <CardDescription>
                Drag and drop your panoramic images or click to browse
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Drop Zone */}
              <label
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors',
                  'border-[var(--color-border)] hover:border-[var(--color-primary-500)] hover:bg-[var(--color-surface)]'
                )}
              >
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Upload className="h-10 w-10 text-[var(--color-text-muted)]" />
                <p className="mt-4 text-sm font-medium text-[var(--color-text-primary)]">
                  Drop files here or click to upload
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  JPEG, PNG, or WebP up to 50MB each
                </p>
              </label>

              {/* File List */}
              {uploadingFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  {uploadingFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] p-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface)]">
                        <Images className="h-5 w-5 text-[var(--color-text-muted)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {file.file.name}
                        </p>
                        {file.status === 'uploading' && (
                          <Progress value={file.progress} className="mt-1 h-1" />
                        )}
                        {file.status === 'error' && (
                          <p className="text-xs text-[var(--color-error-600)]">{file.error}</p>
                        )}
                        {file.status === 'completed' && (
                          <p className="text-xs text-[var(--color-success-600)]">Uploaded</p>
                        )}
                      </div>
                      {file.status === 'uploading' ? (
                        <Loader2 className="h-5 w-5 animate-spin text-[var(--color-primary-600)]" />
                      ) : file.status !== 'completed' ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => navigate(`/tours/${createdTour.id}/edit`)}>
              Skip & Edit Later
            </Button>
            <div className="flex items-center gap-4">
              {uploadingFiles.length > 0 && (
                <span className="text-sm text-[var(--color-text-muted)]">
                  {completedCount} of {uploadingFiles.length} uploaded
                </span>
              )}
              {pendingCount > 0 && (
                <Button onClick={uploadFiles} isLoading={isUploading}>
                  Upload {pendingCount} Files
                </Button>
              )}
              {pendingCount === 0 && completedCount > 0 && (
                <Button onClick={() => navigate(`/tours/${createdTour.id}/edit`)}>
                  Continue to Editor
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
