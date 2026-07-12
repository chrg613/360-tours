import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Sparkles,
  Upload,
  X,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  Loader2,
  Brain,
  Navigation,
  FileText,
  Map,
  ImageIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Switch,
  Label,
  ScrollArea,
  Progress,
} from '@/components/ui';
import { cn } from '@/utils';
import { useToast } from '@/hooks';
import { AIJobStatus } from './AIJobStatus';
import { aiApi, toursApi } from '@/api';
import type { Tour, Scene } from '@/types';

interface AITourWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (tour: Tour, scenes: Scene[]) => void;
}

type WizardStep = 'upload' | 'details' | 'options' | 'processing' | 'review';

interface UploadedImage {
  id: string;
  file: File;
  preview: string;
}

export function AITourWizard({ open, onOpenChange, onComplete }: AITourWizardProps) {
  const { error: toastError } = useToast();
  const [step, setStep] = useState<WizardStep>('upload');
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState({
    auto_detect_rooms: true,
    spatial_navigation: true,
    auto_generate_descriptions: true,
  });
  const [useFloorPlan, setUseFloorPlan] = useState(false);
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [floorPlanPreview, setFloorPlanPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [result, setResult] = useState<{ tour?: Tour; scenes?: Scene[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const floorPlanInputRef = useRef<HTMLInputElement>(null);

  // Handle panorama image drop
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newImages = acceptedFiles.map((file) => ({
      id: `img_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      file,
      preview: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.webp'],
    },
    multiple: true,
  });

  const removeImage = (id: string) => {
    setImages((prev) => {
      const image = prev.find((img) => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };

  const handleFloorPlanChange = (file: File | null) => {
    if (floorPlanPreview) {
      URL.revokeObjectURL(floorPlanPreview);
    }
    if (file) {
      setFloorPlanFile(file);
      setFloorPlanPreview(URL.createObjectURL(file));
    } else {
      setFloorPlanFile(null);
      setFloorPlanPreview(null);
    }
  };

  const handleNext = () => {
    switch (step) {
      case 'upload':
        setStep('details');
        break;
      case 'details':
        // Options default to full AI pipeline (analysis + descriptions + connect).
        // Skip the options step so create-tour stays automatic after upload.
        handleStartGeneration();
        break;
      case 'options':
        handleStartGeneration();
        break;
      case 'review':
        handleComplete();
        break;
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'details':
        setStep('upload');
        break;
      case 'options':
        setStep('details');
        break;
      case 'processing':
        // Allow cancel only before a job has been accepted.
        if (!jobId) setStep('details');
        break;
    }
  };

  const handleStartGeneration = async () => {
    setStep('processing');
    setError(null);

    try {
      const response = await aiApi.generateTour(
        {
          images: images.map((img) => img.file),
          title: title || undefined,
          description: description || undefined,
          auto_detect_rooms: options.auto_detect_rooms,
          auto_place_hotspots: options.spatial_navigation,
          spatial: options.spatial_navigation,
          auto_generate_descriptions: options.auto_generate_descriptions,
        },
        setUploadProgress
      );
      setJobId(response.job.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start tour generation');
      setStep('options');
    }
  };

  const handleJobComplete = async (job: unknown, jobResult: unknown) => {
    setJobId(null);
    if (jobResult && typeof jobResult === 'object') {
      const data = jobResult as { tour_id?: string; tour?: Tour; scenes?: Scene[] };
      let tour = data.tour;
      let scenes = data.scenes;
      if (data.tour_id) {
        try {
          const [fetchedTour, fetchedScenes] = await Promise.all([
            toursApi.getTour(data.tour_id),
            toursApi.getScenes(data.tour_id),
          ]);
          tour = fetchedTour;
          scenes = fetchedScenes;
        } catch {
          // Keep job payload if the follow-up fetch fails.
        }
      }
      setResult({ tour, scenes });
      // Auto-open the navigable preview — no intermediate review gate.
      if (tour && scenes) {
        onComplete(tour, scenes);
        handleClose();
        return;
      }
      setStep('review');
    }
  };

  const handleJobError = (job: unknown, errorMessage: string) => {
    setJobId(null);
    setError(errorMessage);
    setStep('options');
    toastError(errorMessage, { title: 'Tour generation failed' });
  };

  const handleComplete = () => {
    if (result?.tour && result?.scenes) {
      onComplete(result.tour, result.scenes);
      handleClose();
    }
  };

  const handleClose = () => {
    // Cleanup object URLs
    images.forEach((img) => URL.revokeObjectURL(img.preview));
    if (floorPlanPreview) URL.revokeObjectURL(floorPlanPreview);
    setImages([]);
    setTitle('');
    setDescription('');
    setOptions({
      auto_detect_rooms: true,
      spatial_navigation: true,
      auto_generate_descriptions: true,
    });
    setUseFloorPlan(false);
    setFloorPlanFile(null);
    setFloorPlanPreview(null);
    setStep('upload');
    setJobId(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  const canProceed = () => {
    switch (step) {
      case 'upload':
        return images.length > 0;
      case 'details':
        return true;
      case 'options':
        return true;
      case 'review':
        return result?.tour && result?.scenes;
      default:
        return false;
    }
  };

  const getStepNumber = () => {
    // Options step is optional (auto-skipped); review is only a fallback if auto-open fails.
    const steps: WizardStep[] = ['upload', 'details', 'processing', 'review'];
    if (step === 'options') return 2;
    const idx = steps.indexOf(step);
    return idx >= 0 ? idx + 1 : 1;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--color-primary-500)]" />
            AI Tour Generation
          </DialogTitle>
          <DialogDescription>
            Create a complete virtual tour from your 360° images using AI.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          {['Upload', 'Details', 'AI Build', 'Preview'].map((label, index) => (
            <div key={label} className="flex items-center">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                  getStepNumber() > index + 1
                    ? 'bg-[var(--color-success-500)] text-white'
                    : getStepNumber() === index + 1
                    ? 'bg-[var(--color-primary-500)] text-white'
                    : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]'
                )}
              >
                {getStepNumber() > index + 1 ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              {index < 3 && (
                <div
                  className={cn(
                    'w-8 h-0.5 mx-1',
                    getStepNumber() > index + 1
                      ? 'bg-[var(--color-success-500)]'
                      : 'bg-[var(--color-border)]'
                  )}
                />
              )}
            </div>
          ))}
        </div>

        <ScrollArea className="flex-1 overflow-hidden">
          <div className="pr-1">
            {/* Step 1: Upload Images */}
            {step === 'upload' && (
              <div className="space-y-4">
                <div
                  {...getRootProps()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
                    isDragActive
                      ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                      : 'border-[var(--color-border)] hover:border-[var(--color-primary-300)]'
                  )}
                >
                  <input {...getInputProps()} />
                  <Upload className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-3" />
                  <p className="font-medium">
                    {isDragActive ? 'Drop your images here' : 'Drag & drop 360° images'}
                  </p>
                  <p className="text-sm text-[var(--color-text-muted)] mt-1">
                    or click to select files (JPG, PNG, WebP)
                  </p>
                </div>

                {images.length > 0 && (
                  <div>
                    <Label className="mb-2 block">
                      {images.length} image{images.length !== 1 ? 's' : ''} selected
                    </Label>
                    <div className="h-[200px] overflow-y-auto">
                      <div className="grid grid-cols-4 gap-2">
                        {images.map((image) => (
                          <div key={image.id} className="relative group">
                            <img
                              src={image.preview}
                              alt="Preview"
                              className="w-full h-20 object-cover rounded"
                            />
                            <button
                              onClick={() => removeImage(image.id)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Tour Details */}
            {step === 'details' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Tour Title (optional)</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Modern Downtown Apartment"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Leave blank to let AI generate a title based on your images
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description (optional)</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your property or space..."
                    rows={3}
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Add details to help AI understand your space better
                  </p>
                </div>

                {/* Preview of uploaded images */}
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <Label className="mb-2 block">Images to process</Label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {images.slice(0, 6).map((image) => (
                      <img
                        key={image.id}
                        src={image.preview}
                        alt="Preview"
                        className="w-16 h-12 object-cover rounded shrink-0"
                      />
                    ))}
                    {images.length > 6 && (
                      <div className="w-16 h-12 rounded bg-[var(--color-surface-elevated)] flex items-center justify-center shrink-0">
                        <span className="text-sm text-[var(--color-text-muted)]">
                          +{images.length - 6}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Floor Plan Upload */}
                <div className="pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Label>Include Floor Plan</Label>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        AI will match rooms to your panoramas
                      </p>
                    </div>
                    <Switch
                      checked={useFloorPlan}
                      onCheckedChange={(checked) => {
                        setUseFloorPlan(checked);
                        if (!checked) handleFloorPlanChange(null);
                      }}
                    />
                  </div>

                  {useFloorPlan && (
                    <div className="mt-3">
                      <input
                        ref={floorPlanInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          handleFloorPlanChange(file);
                        }}
                      />
                      {floorPlanPreview ? (
                        <div className="relative inline-block">
                          <img
                            src={floorPlanPreview}
                            alt="Floor plan preview"
                            className="h-32 rounded border border-[var(--color-border)] object-contain bg-[var(--color-surface-elevated)]"
                          />
                          <button
                            onClick={() => handleFloorPlanChange(null)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => floorPlanInputRef.current?.click()}
                          className={cn(
                            'w-full border-2 border-dashed rounded-lg p-4 text-center transition-colors',
                            'border-[var(--color-border)] hover:border-[var(--color-primary-300)]',
                            'text-[var(--color-text-muted)] text-sm'
                          )}
                        >
                          <Map className="h-6 w-6 mx-auto mb-1 opacity-60" />
                          Click to upload floor plan image
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: AI Options */}
            {step === 'options' && (
              <div className="space-y-1">
                {/* Option 1: Auto-Detect Room Types */}
                <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-start gap-3">
                    <Brain className="h-4 w-4 mt-0.5 text-[var(--color-primary-500)] shrink-0" />
                    <div>
                      <Label>Auto-Detect Room Types</Label>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        AI will identify and label each room automatically
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={options.auto_detect_rooms}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, auto_detect_rooms: checked }))
                    }
                  />
                </div>

                {/* Option 2: Smart Room Connection */}
                <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-start gap-3">
                    <Navigation className="h-4 w-4 mt-0.5 text-[var(--color-primary-500)] shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Label>Smart Room Connection</Label>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-success-100)] text-[var(--color-success-700)] font-semibold">
                          Recommended
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        AI detects doorways in each panorama and places navigation hotspots at the
                        exact doorway positions
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={options.spatial_navigation}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, spatial_navigation: checked }))
                    }
                  />
                </div>

                {/* Option 3: Generate Descriptions */}
                <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-[var(--color-primary-500)] shrink-0" />
                    <div>
                      <Label>Generate Descriptions</Label>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        AI will write descriptions for each scene
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={options.auto_generate_descriptions}
                    onCheckedChange={(checked) =>
                      setOptions((prev) => ({ ...prev, auto_generate_descriptions: checked }))
                    }
                  />
                </div>

                {error && (
                  <div className="p-3 rounded-md bg-[var(--color-error-50)] text-[var(--color-error-600)] text-sm flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Summary */}
                <div className="mt-4 p-4 rounded-lg bg-[var(--color-surface-elevated)]">
                  <h4 className="font-medium mb-2">Summary</h4>
                  <ul className="text-sm text-[var(--color-text-muted)] space-y-1">
                    <li>• {images.length} images to process</li>
                    {title && <li>• Title: {title}</li>}
                    <li>• Room detection: {options.auto_detect_rooms ? 'Enabled' : 'Disabled'}</li>
                    <li>
                      • Smart Room Connection:{' '}
                      {options.spatial_navigation ? 'Enabled (doorway detection)' : 'Disabled'}
                    </li>
                    <li>
                      • Descriptions: {options.auto_generate_descriptions ? 'Enabled' : 'Disabled'}
                    </li>
                    {useFloorPlan && floorPlanFile && <li>• Floor plan: {floorPlanFile.name}</li>}
                  </ul>
                </div>
              </div>
            )}

            {/* Step 4: Processing */}
            {step === 'processing' && (
              <div className="py-8">
                {uploadProgress < 100 && !jobId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary-500)]" />
                    </div>
                    <p className="text-center font-medium">Uploading images...</p>
                    <Progress value={uploadProgress} />
                    <p className="text-center text-sm text-[var(--color-text-muted)]">
                      {uploadProgress}% complete
                    </p>
                  </div>
                )}

                {jobId && (
                  <div className="space-y-3">
                    <p className="text-center font-medium flex items-center justify-center gap-2">
                      <Sparkles className="h-4 w-4 text-[var(--color-primary-500)]" />
                      AI analyzing panoramas...
                    </p>
                    <AIJobStatus
                      jobId={jobId}
                      onComplete={handleJobComplete}
                      onError={handleJobError}
                      showCancelButton={true}
                      onCancel={() => {
                        setJobId(null);
                        setStep('options');
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Step 5: Review */}
            {step === 'review' && result && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-[var(--color-success-50)] text-[var(--color-success-600)] flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-success-500)] flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Tour Generated Successfully!</p>
                    <p className="text-sm mt-0.5">
                      Created {result.scenes?.length || 0} scene
                      {result.scenes?.length !== 1 ? 's' : ''} with AI-generated content.
                    </p>
                  </div>
                </div>

                {result.tour && (
                  <div className="space-y-1">
                    <Label className="text-xs text-[var(--color-text-muted)]">Tour Title</Label>
                    <p className="font-semibold text-lg">{result.tour.title}</p>
                  </div>
                )}

                {result.scenes && result.scenes.length > 0 && (
                  <div>
                    <Label className="mb-2 block">
                      Generated Scenes ({result.scenes.length})
                    </Label>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {result.scenes.map((scene, index) => (
                        <div
                          key={scene.id}
                          className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-surface-elevated)]"
                        >
                          <div className="w-16 h-12 rounded overflow-hidden bg-[var(--color-surface)] shrink-0">
                            {scene.thumbnail_url || scene.image_url ? (
                              <img
                                src={scene.thumbnail_url || scene.image_url}
                                alt={scene.title || `Scene ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-4 w-4 text-[var(--color-text-muted)]" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {scene.title || `Scene ${index + 1}`}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                              {scene.metadata?.room_type &&
                                scene.metadata.room_type !== 'other' && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-primary-100)] text-[var(--color-primary-700)] font-medium capitalize">
                                    {(scene.metadata.room_type as string).replace(/_/g, ' ')}
                                  </span>
                                )}
                              {scene.hotspots && scene.hotspots.length > 0 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)] font-medium">
                                  {scene.hotspots.length} connection
                                  {scene.hotspots.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                            {scene.description && (
                              <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                                {scene.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4 pt-4 border-t border-[var(--color-border)]">
          {step !== 'processing' && (
            <>
              {step !== 'upload' && step !== 'review' && (
                <Button variant="outline" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              )}
              {step === 'upload' && (
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              )}
              <Button onClick={handleNext} disabled={!canProceed()}>
                {step === 'review' ? (
                  <>
                    <Check className="h-4 w-4" />
                    Complete
                  </>
                ) : step === 'options' ? (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate Tour
                  </>
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
