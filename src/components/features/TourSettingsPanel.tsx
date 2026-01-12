import { useState, useEffect, useCallback } from 'react';
import { Copy, Check, Code2, Globe, Palette, Navigation, Settings2, Smartphone, Glasses, Map, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Slider,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Label,
  Badge,
} from '@/components/ui';
import { cn } from '@/utils';
import type { Tour, TourSettings, Scene, FloorPlan, FloorPlanResponse, FloorPlanCreateInput } from '@/types';
import {
  generateIframeCode,
  generateResponsiveCode,
  generateShareUrl,
  copyToClipboard,
  type EmbedOptions,
} from '@/utils/embedCode';
import { FloorPlanEditor } from './FloorPlanEditor';
import { toursApi } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { useToast } from '@/hooks/useToast';

interface TourSettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tour: Tour;
  scenes: Scene[];
  onSave: (settings: Partial<Tour>) => void;
  isLoading?: boolean;
}

export function TourSettingsPanel({
  open,
  onOpenChange,
  tour,
  scenes,
  onSave,
  isLoading = false,
}: TourSettingsPanelProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch floor plans from API
  const {
    data: apiFloorPlans = [],
    isLoading: isLoadingFloorPlans,
  } = useQuery({
    queryKey: [QUERY_KEYS.FLOOR_PLANS, tour.id],
    queryFn: () => toursApi.getFloorPlans(tour.id),
    enabled: open,
  });

  // Local state for form
  const [title, setTitle] = useState(tour.title);
  const [description, setDescription] = useState(tour.description || '');
  const [isPublic, setIsPublic] = useState(tour.is_public);
  const [settings, setSettings] = useState<TourSettings>(tour.settings || {
    auto_rotate: false,
    auto_rotate_speed: 1,
    show_navbar: true,
    enable_fullscreen: true,
    enable_vr: true,
    enable_gyroscope: true,
    gyroscope_auto_start: false,
  });

  // Floor plan saving state
  const [isSavingFloorPlans, setIsSavingFloorPlans] = useState(false);

  // Embed options state
  const [embedOptions, setEmbedOptions] = useState<EmbedOptions>({
    width: '100%',
    height: 500,
    autoplay: true,
    showNavbar: true,
    enableFullscreen: true,
    enableVR: true,
    startSceneId: '',
    autoRotate: settings.auto_rotate,
    branding: true,
  });

  // Copy states
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFloorPlanEditor, setShowFloorPlanEditor] = useState(false);

  // Reset state when tour changes
  useEffect(() => {
    setTitle(tour.title);
    setDescription(tour.description || '');
    setIsPublic(tour.is_public);
    setSettings(tour.settings || {
      auto_rotate: false,
      auto_rotate_speed: 1,
      show_navbar: true,
      enable_fullscreen: true,
      enable_vr: true,
      enable_gyroscope: true,
      gyroscope_auto_start: false,
    });
  }, [tour]);

  const handleSave = () => {
    onSave({
      title,
      description: description || undefined,
      is_public: isPublic,
      settings,
    });
  };

  const handleCopyEmbed = async () => {
    const code = generateIframeCode(tour.id, embedOptions);
    const success = await copyToClipboard(code);
    if (success) {
      setCopiedEmbed(true);
      setTimeout(() => setCopiedEmbed(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    const link = generateShareUrl(tour.id);
    const success = await copyToClipboard(link);
    if (success) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const updateSettings = (updates: Partial<TourSettings>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  /**
   * Sync floor plans with backend API.
   * - New floor plans (local IDs starting with 'fp_') are created
   * - Existing floor plans are updated
   * - Removed floor plans are deleted
   */
  const handleSaveFloorPlans = async (floorPlans: FloorPlan[]) => {
    setIsSavingFloorPlans(true);

    try {
      // Get IDs of floor plans in the new list
      const newFloorPlanIds = new Set(floorPlans.map(fp => fp.id));
      const existingFloorPlanIds = new Set(apiFloorPlans.map(fp => fp.id));

      // Delete floor plans that were removed
      const deletedFloorPlans = apiFloorPlans.filter(fp => !newFloorPlanIds.has(fp.id));
      for (const fp of deletedFloorPlans) {
        await toursApi.deleteFloorPlan(tour.id, fp.id);
      }

      // Create or update floor plans
      for (const fp of floorPlans) {
        // Check if this is a new floor plan (local ID starts with 'fp_')
        const isNewFloorPlan = fp.id.startsWith('fp_') || !existingFloorPlanIds.has(fp.id);

        if (isNewFloorPlan) {
          // Create new floor plan
          const createData: FloorPlanCreateInput = {
            name: fp.name,
            image_url: fp.image_url,
            floor_number: fp.floor_number,
            markers: fp.markers,
          };
          await toursApi.createFloorPlan(tour.id, createData);
        } else {
          // Update existing floor plan
          await toursApi.updateFloorPlan(tour.id, fp.id, {
            name: fp.name,
            image_url: fp.image_url,
            floor_number: fp.floor_number,
            markers: fp.markers,
          });
        }
      }

      // Invalidate query to refresh the list
      await queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.FLOOR_PLANS, tour.id] });

      toast('success', 'Floor plans have been updated successfully.', {
        title: 'Floor plans saved',
      });

      setShowFloorPlanEditor(false);
    } catch (error) {
      console.error('Failed to save floor plans:', error);
      toast('error', 'Failed to save floor plans. Please try again.', {
        title: 'Error saving floor plans',
      });
    } finally {
      setIsSavingFloorPlans(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Tour Settings
          </DialogTitle>
          <DialogDescription>
            Configure tour settings, viewer options, and embed settings.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="general" className="gap-1.5">
              <Globe className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="viewer" className="gap-1.5">
              <Navigation className="h-4 w-4" />
              Viewer
            </TabsTrigger>
            <TabsTrigger value="floorplan" className="gap-1.5">
              <Map className="h-4 w-4" />
              Floor Plan
            </TabsTrigger>
            <TabsTrigger value="branding" className="gap-1.5">
              <Palette className="h-4 w-4" />
              Branding
            </TabsTrigger>
            <TabsTrigger value="embed" className="gap-1.5">
              <Code2 className="h-4 w-4" />
              Embed
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {/* General Tab */}
            <TabsContent value="general" className="m-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter tour title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter tour description"
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="public">Public Tour</Label>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Allow anyone with the link to view this tour
                  </p>
                </div>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {scenes.length > 0 && (
                <div className="space-y-2">
                  <Label>Starting Scene</Label>
                  <Select
                    value={settings.initial_scene_id || ''}
                    onValueChange={(value) =>
                      updateSettings({ initial_scene_id: value || undefined })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="First scene (default)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">First scene (default)</SelectItem>
                      {scenes.map((scene) => (
                        <SelectItem key={scene.id} value={scene.id}>
                          {scene.title || `Scene ${scene.order_index + 1}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </TabsContent>

            {/* Viewer Tab */}
            <TabsContent value="viewer" className="m-0 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="auto-rotate">Auto-Rotate</Label>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Automatically rotate the view when idle
                  </p>
                </div>
                <Switch
                  id="auto-rotate"
                  checked={settings.auto_rotate}
                  onCheckedChange={(checked) =>
                    updateSettings({ auto_rotate: checked })
                  }
                />
              </div>

              {settings.auto_rotate && (
                <div className="pl-4 border-l-2 border-[var(--color-border)]">
                  <Slider
                    label="Rotation Speed"
                    value={settings.auto_rotate_speed || 1}
                    min={0.1}
                    max={5}
                    step={0.1}
                    showValue
                    onValueChange={(value) =>
                      updateSettings({ auto_rotate_speed: value })
                    }
                  />
                </div>
              )}

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="navbar">Show Navigation Bar</Label>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Display the bottom navigation bar
                  </p>
                </div>
                <Switch
                  id="navbar"
                  checked={settings.show_navbar}
                  onCheckedChange={(checked) =>
                    updateSettings({ show_navbar: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="fullscreen">Enable Fullscreen</Label>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Allow viewers to enter fullscreen mode
                  </p>
                </div>
                <Switch
                  id="fullscreen"
                  checked={settings.enable_fullscreen}
                  onCheckedChange={(checked) =>
                    updateSettings({ enable_fullscreen: checked })
                  }
                />
              </div>

              {/* VR/Immersive Settings Section */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h4 className="text-sm font-medium flex items-center gap-2 mb-4">
                  <Glasses className="h-4 w-4" />
                  VR & Immersive Settings
                </h4>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label htmlFor="vr">Enable VR Mode</Label>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Allow VR headset viewing (Cardboard/WebXR)
                      </p>
                    </div>
                    <Switch
                      id="vr"
                      checked={settings.enable_vr}
                      onCheckedChange={(checked) =>
                        updateSettings({ enable_vr: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between py-2">
                    <div>
                      <Label htmlFor="gyroscope" className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4" />
                        Enable Gyroscope
                      </Label>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Allow device motion control on mobile
                      </p>
                    </div>
                    <Switch
                      id="gyroscope"
                      checked={settings.enable_gyroscope !== false}
                      onCheckedChange={(checked) =>
                        updateSettings({ enable_gyroscope: checked })
                      }
                    />
                  </div>

                  {settings.enable_gyroscope !== false && (
                    <div className="pl-4 border-l-2 border-[var(--color-border)]">
                      <div className="flex items-center justify-between py-2">
                        <div>
                          <Label htmlFor="gyro-auto">Auto-Start Gyroscope</Label>
                          <p className="text-sm text-[var(--color-text-muted)]">
                            Automatically enable on mobile devices
                          </p>
                        </div>
                        <Switch
                          id="gyro-auto"
                          checked={settings.gyroscope_auto_start === true}
                          onCheckedChange={(checked) =>
                            updateSettings({ gyroscope_auto_start: checked })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Floor Plan Tab */}
            <TabsContent value="floorplan" className="m-0 space-y-4">
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium flex items-center gap-2">
                      <Map className="h-4 w-4" />
                      Floor Plans
                    </h4>
                    <p className="text-sm text-[var(--color-text-muted)] mt-1">
                      Add floor plan images with scene markers for easy navigation.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFloorPlanEditor(true)}
                    disabled={isLoadingFloorPlans}
                  >
                    {apiFloorPlans.length > 0 ? 'Edit Floor Plans' : 'Add Floor Plan'}
                  </Button>
                </div>

                {isLoadingFloorPlans ? (
                  <div className="mt-4 flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
                  </div>
                ) : apiFloorPlans.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {apiFloorPlans.map((fp) => (
                      <div
                        key={fp.id}
                        className="flex items-center gap-3 rounded-lg bg-[var(--color-surface-elevated)] p-3"
                      >
                        <div className="w-16 h-12 rounded overflow-hidden bg-[var(--color-surface)]">
                          <img
                            src={fp.image_url}
                            alt={fp.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{fp.name}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Floor {fp.floor_number} • {fp.markers.length} marker{fp.markers.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {fp.markers.length} scenes
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-center py-8 rounded-lg border-2 border-dashed border-[var(--color-border)]">
                    <Map className="h-10 w-10 mx-auto text-[var(--color-text-muted)] mb-2" />
                    <p className="text-sm text-[var(--color-text-muted)]">
                      No floor plans added yet
                    </p>
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => setShowFloorPlanEditor(true)}
                      className="mt-2"
                    >
                      Add your first floor plan
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Branding Tab */}
            <TabsContent value="branding" className="m-0 space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="watermark">Show Watermark</Label>
                  <p className="text-sm text-[var(--color-text-muted)]">
                    Display 360 Viewer branding
                  </p>
                </div>
                <Switch
                  id="watermark"
                  checked={settings.branding?.show_watermark !== false}
                  onCheckedChange={(checked) =>
                    updateSettings({
                      branding: {
                        ...settings.branding,
                        show_watermark: checked,
                      },
                    })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo-url">Custom Logo URL</Label>
                <Input
                  id="logo-url"
                  value={settings.branding?.logo_url || ''}
                  onChange={(e) =>
                    updateSettings({
                      branding: {
                        ...settings.branding,
                        logo_url: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="https://example.com/logo.png"
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Recommended size: 200x50 pixels. PNG or SVG format.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="primary-color">Primary Color</Label>
                <div className="flex gap-2">
                  <Input
                    id="primary-color"
                    type="color"
                    value={settings.branding?.primary_color || '#FF5733'}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...settings.branding,
                          primary_color: e.target.value,
                        },
                      })
                    }
                    className="w-16 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={settings.branding?.primary_color || '#FF5733'}
                    onChange={(e) =>
                      updateSettings({
                        branding: {
                          ...settings.branding,
                          primary_color: e.target.value,
                        },
                      })
                    }
                    placeholder="#FF5733"
                    className="flex-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Embed Tab */}
            <TabsContent value="embed" className="m-0 space-y-4">
              {/* Share Link */}
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={generateShareUrl(tour.id)}
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? (
                      <Check className="h-4 w-4 text-[var(--color-success-500)]" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Embed Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="embed-width">Width</Label>
                  <Input
                    id="embed-width"
                    value={embedOptions.width}
                    onChange={(e) =>
                      setEmbedOptions((prev) => ({
                        ...prev,
                        width: e.target.value,
                      }))
                    }
                    placeholder="100% or 800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="embed-height">Height</Label>
                  <Input
                    id="embed-height"
                    type="number"
                    value={
                      typeof embedOptions.height === 'number'
                        ? embedOptions.height
                        : 500
                    }
                    onChange={(e) =>
                      setEmbedOptions((prev) => ({
                        ...prev,
                        height: parseInt(e.target.value) || 500,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <Label htmlFor="embed-branding">Show Branding</Label>
                <Switch
                  id="embed-branding"
                  checked={embedOptions.branding !== false}
                  onCheckedChange={(checked) =>
                    setEmbedOptions((prev) => ({
                      ...prev,
                      branding: checked,
                    }))
                  }
                />
              </div>

              {/* Embed Code */}
              <div className="space-y-2">
                <Label>Embed Code</Label>
                <div className="relative">
                  <Textarea
                    readOnly
                    value={generateIframeCode(tour.id, embedOptions)}
                    className="font-mono text-xs min-h-[120px] resize-none"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute right-2 top-2"
                    onClick={handleCopyEmbed}
                  >
                    {copiedEmbed ? (
                      <>
                        <Check className="h-3 w-3" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-[var(--color-text-muted)]">
                  Paste this code into your website's HTML to embed the tour.
                </p>
              </div>

              {/* Responsive Embed */}
              <div className="space-y-2">
                <Label>Responsive Embed</Label>
                <Textarea
                  readOnly
                  value={generateResponsiveCode(tour.id, embedOptions)}
                  className="font-mono text-xs min-h-[100px] resize-none"
                />
                <p className="text-xs text-[var(--color-text-muted)]">
                  Use this code for a responsive 16:9 aspect ratio embed.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} isLoading={isLoading}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Floor Plan Editor Modal */}
      <FloorPlanEditor
        open={showFloorPlanEditor}
        onOpenChange={setShowFloorPlanEditor}
        floorPlans={apiFloorPlans}
        scenes={scenes}
        onSave={handleSaveFloorPlans}
        isLoading={isSavingFloorPlans}
      />
    </Dialog>
  );
}
