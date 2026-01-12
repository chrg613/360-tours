import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Info,
  Volume2,
  Play,
  Link,
  Code,
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
  Label,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui';
import { HotspotIconPicker, getIconByName, type HotspotIconConfig } from './HotspotIconPicker';
import { toursApi } from '@/api';
import { QUERY_KEYS } from '@/constants';
import { useToast } from '@/hooks/useToast';
import { cn } from '@/utils';
import type { Hotspot, HotspotType, Scene } from '@/types';

interface HotspotEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hotspot: Hotspot | null;
  sceneId: string;
  scenes: Scene[];
  mode: 'create' | 'edit';
  initialPosition?: { yaw: number; pitch: number };
}

const HOTSPOT_TYPE_INFO = {
  navigation: {
    icon: ArrowRight,
    label: 'Navigation',
    description: 'Link to another scene in the tour',
  },
  info: {
    icon: Info,
    label: 'Info',
    description: 'Display information text',
  },
  audio: {
    icon: Volume2,
    label: 'Audio',
    description: 'Play an audio clip',
  },
  video: {
    icon: Play,
    label: 'Video',
    description: 'Play a video',
  },
  link: {
    icon: Link,
    label: 'Link',
    description: 'Open an external URL',
  },
  custom: {
    icon: Code,
    label: 'Custom',
    description: 'Custom HTML content',
  },
};

export function HotspotEditorModal({
  open,
  onOpenChange,
  hotspot,
  sceneId,
  scenes,
  mode,
  initialPosition = { yaw: 0, pitch: 0 },
}: HotspotEditorModalProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Form state
  const [type, setType] = useState<HotspotType>('navigation');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [targetSceneId, setTargetSceneId] = useState('');
  const [position, setPosition] = useState(initialPosition);
  const [iconConfig, setIconConfig] = useState<HotspotIconConfig>({
    iconName: 'arrow-right',
    iconColor: '#FF5733',
    iconSize: 32,
  });

  // Content-specific state
  const [audioUrl, setAudioUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkNewTab, setLinkNewTab] = useState(true);
  const [customHtml, setCustomHtml] = useState('');

  // Reset form when modal opens/closes or hotspot changes
  useEffect(() => {
    if (open && hotspot && mode === 'edit') {
      setType(hotspot.type);
      setTitle(hotspot.title || '');
      setDescription(hotspot.description || '');
      setTargetSceneId(hotspot.target_scene_id || '');
      setPosition(hotspot.position);
      setIconConfig({
        iconName: hotspot.icon_name || 'arrow-right',
        iconColor: hotspot.icon_color || '#FF5733',
        iconSize: hotspot.icon_size || 32,
      });
      setAudioUrl((hotspot.content?.audio_url as string) || '');
      setVideoUrl((hotspot.content?.video_url as string) || '');
      setLinkUrl((hotspot.content?.link_url as string) || '');
      setLinkNewTab(hotspot.content?.link_new_tab !== false);
      setCustomHtml((hotspot.content?.custom_html as string) || '');
    } else if (open && mode === 'create') {
      setType('navigation');
      setTitle('');
      setDescription('');
      setTargetSceneId('');
      setPosition(initialPosition);
      setIconConfig({
        iconName: 'arrow-right',
        iconColor: '#FF5733',
        iconSize: 32,
      });
      setAudioUrl('');
      setVideoUrl('');
      setLinkUrl('');
      setLinkNewTab(true);
      setCustomHtml('');
    }
  }, [open, hotspot, mode, initialPosition]);

  // Update icon based on type
  useEffect(() => {
    const typeIcons: Record<HotspotType, string> = {
      navigation: 'arrow-right',
      info: 'info',
      audio: 'volume-2',
      video: 'play',
      link: 'link',
      custom: 'code',
    };
    if (!hotspot) {
      setIconConfig((prev) => ({
        ...prev,
        iconName: typeIcons[type] || 'info',
      }));
    }
  }, [type, hotspot]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof toursApi.createHotspot>[1]) =>
      toursApi.createHotspot(sceneId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENES] });
      toast('success', 'The hotspot has been added to the scene.', { title: 'Hotspot created' });
      onOpenChange(false);
    },
    onError: () => {
      toast('error', 'Something went wrong. Please try again.', { title: 'Failed to create hotspot' });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Hotspot> }) =>
      toursApi.updateHotspot(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.SCENES] });
      toast('success', 'Your changes have been saved.', { title: 'Hotspot updated' });
      onOpenChange(false);
    },
    onError: () => {
      toast('error', 'Something went wrong. Please try again.', { title: 'Failed to update hotspot' });
    },
  });

  const handleSubmit = () => {
    // Build content object based on type
    const content: Record<string, unknown> = {};
    if (type === 'audio' && audioUrl) content.audio_url = audioUrl;
    if (type === 'video' && videoUrl) content.video_url = videoUrl;
    if (type === 'link' && linkUrl) {
      content.link_url = linkUrl;
      content.link_new_tab = linkNewTab;
    }
    if (type === 'custom' && customHtml) content.custom_html = customHtml;

    const data = {
      type,
      position,
      title: title || undefined,
      description: description || undefined,
      target_scene_id: type === 'navigation' ? targetSceneId || undefined : undefined,
      icon_name: iconConfig.iconName,
      icon_color: iconConfig.iconColor,
      icon_size: iconConfig.iconSize,
      content: Object.keys(content).length > 0 ? content : undefined,
    };

    if (mode === 'create') {
      createMutation.mutate(data as Parameters<typeof toursApi.createHotspot>[1]);
    } else if (hotspot) {
      updateMutation.mutate({ id: hotspot.id, data });
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const CurrentIcon = getIconByName(iconConfig.iconName);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add Hotspot' : 'Edit Hotspot'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new interactive hotspot for this scene.'
              : 'Modify the hotspot settings and content.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Hotspot Type</Label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(HOTSPOT_TYPE_INFO) as [HotspotType, typeof HOTSPOT_TYPE_INFO.navigation][]).map(
                ([key, info]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-lg border p-3 transition-colors',
                      type === key
                        ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)]'
                        : 'border-[var(--color-border)] hover:bg-[var(--color-surface)]'
                    )}
                  >
                    <info.icon className="h-5 w-5" />
                    <span className="text-xs font-medium">{info.label}</span>
                  </button>
                )
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)]">
              {HOTSPOT_TYPE_INFO[type].description}
            </p>
          </div>

          {/* Basic Info */}
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="content" className="flex-1">
                Content
              </TabsTrigger>
              <TabsTrigger value="appearance" className="flex-1">
                Appearance
              </TabsTrigger>
              <TabsTrigger value="position" className="flex-1">
                Position
              </TabsTrigger>
            </TabsList>

            {/* Content Tab */}
            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter hotspot title"
                />
              </div>

              {/* Type-specific content */}
              {type === 'navigation' && (
                <div className="space-y-2">
                  <Label>Target Scene</Label>
                  <Select value={targetSceneId} onValueChange={setTargetSceneId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a scene" />
                    </SelectTrigger>
                    <SelectContent>
                      {scenes
                        .filter((s) => s.id !== sceneId)
                        .map((scene) => (
                          <SelectItem key={scene.id} value={scene.id}>
                            {scene.title || `Scene ${scene.order_index + 1}`}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {type === 'info' && (
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter information to display"
                    rows={4}
                  />
                </div>
              )}

              {type === 'audio' && (
                <div className="space-y-2">
                  <Label htmlFor="audio-url">Audio URL</Label>
                  <Input
                    id="audio-url"
                    value={audioUrl}
                    onChange={(e) => setAudioUrl(e.target.value)}
                    placeholder="https://example.com/audio.mp3"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Enter a direct link to an MP3 or other audio file.
                  </p>
                </div>
              )}

              {type === 'video' && (
                <div className="space-y-2">
                  <Label htmlFor="video-url">Video URL</Label>
                  <Input
                    id="video-url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://youtube.com/watch?v=... or video file URL"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Supports YouTube, Vimeo, or direct video file links.
                  </p>
                </div>
              )}

              {type === 'link' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="link-url">Link URL</Label>
                    <Input
                      id="link-url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="link-new-tab">Open in new tab</Label>
                    <Switch
                      id="link-new-tab"
                      checked={linkNewTab}
                      onCheckedChange={setLinkNewTab}
                    />
                  </div>
                </>
              )}

              {type === 'custom' && (
                <div className="space-y-2">
                  <Label htmlFor="custom-html">Custom HTML</Label>
                  <Textarea
                    id="custom-html"
                    value={customHtml}
                    onChange={(e) => setCustomHtml(e.target.value)}
                    placeholder="<div>Your custom content...</div>"
                    rows={6}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Enter custom HTML that will be rendered when the hotspot is clicked.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Icon Settings</Label>
                <HotspotIconPicker
                  value={iconConfig}
                  onChange={setIconConfig}
                  trigger={
                    <Button variant="outline" className="w-full justify-start gap-3">
                      <div
                        className="flex h-8 w-8 items-center justify-center rounded-full"
                        style={{ backgroundColor: iconConfig.iconColor }}
                      >
                        <CurrentIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col items-start">
                        <span className="text-sm">Customize Icon</span>
                        <span className="text-xs text-[var(--color-text-muted)]">
                          {iconConfig.iconName} • {iconConfig.iconSize}px
                        </span>
                      </div>
                    </Button>
                  }
                />
              </div>

              {/* Preview */}
              <div className="rounded-lg border border-[var(--color-border)] p-4">
                <p className="text-xs font-medium text-[var(--color-text-muted)] mb-3">
                  Preview
                </p>
                <div className="flex items-center justify-center bg-[var(--color-surface)] rounded-lg p-8">
                  <div
                    className="flex items-center justify-center rounded-full shadow-lg"
                    style={{
                      backgroundColor: iconConfig.iconColor,
                      width: iconConfig.iconSize,
                      height: iconConfig.iconSize,
                    }}
                  >
                    <CurrentIcon
                      className="text-white"
                      style={{
                        width: iconConfig.iconSize * 0.5,
                        height: iconConfig.iconSize * 0.5,
                      }}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Position Tab */}
            <TabsContent value="position" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="yaw">Yaw (Horizontal)</Label>
                  <Input
                    id="yaw"
                    type="number"
                    step="0.1"
                    value={position.yaw}
                    onChange={(e) =>
                      setPosition((p) => ({ ...p, yaw: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    -180° to 180°
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pitch">Pitch (Vertical)</Label>
                  <Input
                    id="pitch"
                    type="number"
                    step="0.1"
                    value={position.pitch}
                    onChange={(e) =>
                      setPosition((p) => ({ ...p, pitch: parseFloat(e.target.value) || 0 }))
                    }
                  />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    -90° to 90°
                  </p>
                </div>
              </div>
              <p className="text-sm text-[var(--color-text-muted)]">
                Tip: You can also click on the panorama to set the hotspot position
                interactively.
              </p>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="border-t border-[var(--color-border)] pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading}>
            {mode === 'create' ? 'Add Hotspot' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
