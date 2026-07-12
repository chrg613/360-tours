import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload, X, Images, ArrowLeft, Loader2, Sparkles } from 'lucide-react';
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
import { AITourWizard } from '@/components/features';

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
  const [showAIWizard, setShowAIWizard] = useState(true);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TourFormData>({
    resolver: zodResolver(tourSchema),
    defaultValues: {
      title: '',
      description: '',
      status: 'draft',
      visibility: 'private',
      settings: DEFAULT_TOUR_SETTINGS,
    },
  });

  // Pre-fill the form with createdTour data when returning to the info step
  // so the user can edit their previously entered info.
  useEffect(() => {
    if (createdTour && step === 'info') {
      reset({
        title: createdTour.title,
        description: createdTour.description ?? '',
        status: createdTour.status,
        visibility: createdTour.visibility,
        settings: createdTour.settings ?? DEFAULT_TOUR_SETTINGS,
      });
    }
  }, [createdTour, step, reset]);

  // Create tour mutation
  const createMutation = useMutation({
    mutationFn: (data: TourFormData) => toursApi.createTour(data),
    onSuccess: (tour) => {
      setCreatedTour(tour);
      setStep('upload');
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOURS] });
    },
  });

  // Update tour mutation - used when the user goes back to edit info after
  // the tour has already been created.
  const updateTourMutation = useMutation({
    mutationFn: (data: TourFormData) => toursApi.updateTour(createdTour!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOUR, createdTour!.id] });
      setStep('upload');
    },
  });

  // Add scene mutation
  const addSceneMutation = useMutation({
    mutationFn: ({ tourId, imageUrl }: { tourId: string; imageUrl: string }) =>
      toursApi.createScene(tourId, { image_url: imageUrl }),
  });

  const onSubmit = async (data: TourFormData) => {
    if (createdTour) {
      await updateTourMutation.mutateAsync(data);
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleAIComplete = (tour: Tour) => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOURS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOUR, tour.id] });
    navigate(`/tours/${tour.id}`);
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

    const pending = uploadingFiles
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.status === 'pending');

    if (pending.length === 0) return;

    // Mark all pending files as uploading immediately (parallel uploads)
    setUploadingFiles((prev) =>
      prev.map((f, idx) =>
        pending.some((p) => p.index === idx)
          ? { ...f, status: 'uploading' as const, progress: 0 }
          : f
      )
    );

    await Promise.allSettled(
      pending.map(async ({ item, index }) => {
        try {
          const uploadResult = await uploadApi.uploadFile(item.file, {
            folder: 'scenes',
            visibility: 'public',
            onProgress: (progress) => {
              setUploadingFiles((prev) =>
                prev.map((f, idx) =>
                  idx === index ? { ...f, progress } : f
                )
              );
            },
          });

          await addSceneMutation.mutateAsync({
            tourId: createdTour.id,
            imageUrl: uploadResult.public_url,
          });

          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === index
                ? { ...f, status: 'completed' as const, progress: 100, url: uploadResult.public_url }
                : f
            )
          );
        } catch (err) {
          setUploadingFiles((prev) =>
            prev.map((f, idx) =>
              idx === index
                ? {
                    ...f,
                    status: 'error' as const,
                    error: err instanceof Error ? err.message : 'Upload failed',
                  }
                : f
            )
          );
        }
      })
    );

    // Refresh tour data
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOURS] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.TOUR, createdTour.id] });
  };

  const pendingCount = uploadingFiles.filter((f) => f.status === 'pending').length;
  const completedCount = uploadingFiles.filter((f) => f.status === 'completed').length;
  const isUploading = uploadingFiles.some((f) => f.status === 'uploading');

  const totalUploadBytes = uploadingFiles
    .filter((f) => f.status === 'pending' || f.status === 'uploading' || f.status === 'completed')
    .reduce((sum, f) => sum + f.file.size, 0);
  const uploadedBytes = uploadingFiles
    .filter((f) => f.status === 'pending' || f.status === 'uploading' || f.status === 'completed')
    .reduce((sum, f) => {
      if (f.status === 'completed') return sum + f.file.size;
      return sum + Math.round((f.progress / 100) * f.file.size);
    }, 0);
  const overallProgress = totalUploadBytes > 0 ? Math.round((uploadedBytes * 100) / totalUploadBytes) : 0;

  return (
    <div className="animate-fade-in mx-auto max-w-3xl space-y-6">
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
            Create AI Tour
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Upload panoramas and let AI build the tour preview with connected hotspots.
          </p>
        </div>
        <div className="ml-auto">
          <Button onClick={() => setShowAIWizard(true)}>
            <Sparkles className="h-4 w-4" />
            Open AI Builder
          </Button>
        </div>
      </div>

      <Card className="border-[var(--color-primary-200)] bg-[var(--color-primary-50)]/50">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">AI builder is the default flow</CardTitle>
            <CardDescription className="mt-1">
              It uploads the images, analyzes rooms, writes scene details, connects hotspots, and opens the tour preview.
            </CardDescription>
          </div>
          <Button onClick={() => setShowAIWizard(true)}>
            <Sparkles className="h-4 w-4" />
            Start AI Builder
          </Button>
        </CardContent>
      </Card>

      {/* Step 1: Tour Info */}
      {step === 'info' && (
        <Card>
          <CardHeader>
            <CardTitle>Manual Tour Information</CardTitle>
            <CardDescription>
              Use this only when you want to build a tour without the AI pipeline.
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
                <Button type="submit" isLoading={createMutation.isPending || updateTourMutation.isPending}>
                  {createdTour ? 'Save & Return to Upload' : 'Continue to Upload'}
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
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setStep('info')}>
                <ArrowLeft className="h-4 w-4" />
                Edit Info
              </Button>
              <Button variant="outline" onClick={() => navigate(`/tours/${createdTour.id}/edit`)}>
                Skip & Edit Later
              </Button>
            </div>
            <div className="flex items-center gap-4">
              {uploadingFiles.length > 0 && isUploading && (
                <div className="hidden w-40 flex-col gap-1 sm:flex">
                  <Progress value={overallProgress} className="h-1.5" />
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {overallProgress}%
                  </span>
                </div>
              )}
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

      <AITourWizard
        open={showAIWizard}
        onOpenChange={setShowAIWizard}
        onComplete={handleAIComplete}
      />
    </div>
  );
}
