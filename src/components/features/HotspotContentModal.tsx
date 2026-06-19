import { useState, useRef, useEffect } from 'react';
import { ExternalLink, Volume2, VolumeX, Play, Pause } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui';
import { Button } from '@/components/ui';
import { VideoPlayer } from './VideoPlayer';
import { parseVideoUrl, buildVideoEmbedUrl } from '@/utils/videoUrl';
import type { Hotspot } from '@/types';

interface HotspotContentModalProps {
  hotspot: Hotspot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional controlled mute state for audio hotspots. */
  muted?: boolean;
  /** Optional callback invoked when the internal mute toggle changes. */
  onMutedChange?: (muted: boolean) => void;
}

export function HotspotContentModal({
  hotspot,
  open,
  onOpenChange,
  muted,
  onMutedChange,
}: HotspotContentModalProps) {
  if (!hotspot) return null;

  const handleClose = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {hotspot.title || getDefaultTitle(hotspot.type)}
          </DialogTitle>
          <DialogClose />
        </DialogHeader>

        <div className="mt-4">
          {hotspot.type === 'info' && <InfoContent hotspot={hotspot} />}
          {hotspot.type === 'audio' && (
            <AudioContent hotspot={hotspot} muted={muted} onMutedChange={onMutedChange} />
          )}
          {hotspot.type === 'video' && <VideoContent hotspot={hotspot} />}
          {hotspot.type === 'link' && <LinkContent hotspot={hotspot} onClose={handleClose} />}
          {hotspot.type === 'custom' && <CustomContent hotspot={hotspot} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getDefaultTitle(type: string): string {
  switch (type) {
    case 'info':
      return 'Information';
    case 'audio':
      return 'Audio';
    case 'video':
      return 'Video';
    case 'link':
      return 'External Link';
    case 'custom':
      return 'Content';
    default:
      return 'Details';
  }
}

function InfoContent({ hotspot }: { hotspot: Hotspot }) {
  const content = hotspot.content as {
    html?: string;
    text?: string;
    image_url?: string;
  } | null;

  const displayText = content?.text || hotspot.description;

  return (
    <div className="space-y-4">
      {/* Image */}
      {content?.image_url && (
        <div className="rounded-lg overflow-hidden">
          <img
            src={content.image_url}
            alt={hotspot.title || 'Info image'}
            className="w-full h-auto max-h-80 object-contain"
          />
        </div>
      )}

      {/* HTML content */}
      {content?.html && (
        <SandboxedHtml html={content.html} />
      )}

      {/* Text content */}
      {displayText && !content?.html && (
        <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">
          {displayText}
        </p>
      )}

      {/* Fallback if no content */}
      {!displayText && !content?.html && !content?.image_url && (
        <p className="text-[var(--color-text-muted)] italic">
          No additional information available.
        </p>
      )}
    </div>
  );
}

function AudioContent({
  hotspot,
  muted: controlledMuted,
  onMutedChange,
}: {
  hotspot: Hotspot;
  muted?: boolean;
  onMutedChange?: (muted: boolean) => void;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [internalMuted, setInternalMuted] = useState(false);

  const isControlled = controlledMuted !== undefined;
  const isMuted = isControlled ? (controlledMuted as boolean) : internalMuted;

  const setIsMutedState = (next: boolean) => {
    if (onMutedChange) onMutedChange(next);
    if (!isControlled) setInternalMuted(next);
  };

  // Keep the audio element in sync with the (possibly controlled) mute state.
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const content = hotspot.content as {
    audio_url?: string;
    autoplay?: boolean;
  } | null;

  const audioUrl = content?.audio_url;

  useEffect(() => {
    if (audioRef.current && content?.autoplay) {
      audioRef.current.play().catch(() => {
        // Autoplay blocked by browser
      });
    }
  }, [content?.autoplay]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) {
    return (
      <p className="text-[var(--color-text-muted)] italic">
        No audio file configured.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hotspot.description && (
        <p className="text-[var(--color-text-secondary)]">{hotspot.description}</p>
      )}

      <div className="rounded-lg bg-[var(--color-surface-elevated)] p-4">
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <Button
            variant="default"
            size="icon"
            onClick={togglePlay}
            className="shrink-0"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5 ml-0.5" />
            )}
          </Button>

          {/* Progress */}
          <div className="flex-1 space-y-1">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 bg-[var(--color-border)] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[var(--color-primary-500)] [&::-webkit-slider-thumb]:rounded-full"
            />
            <div className="flex justify-between text-xs text-[var(--color-text-muted)]">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          {/* Mute */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              if (audioRef.current) {
                const next = !isMuted;
                audioRef.current.muted = next;
                setIsMutedState(next);
              }
            }}
          >
            {isMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function VideoContent({ hotspot }: { hotspot: Hotspot }) {
  const content = hotspot.content as {
    video_url?: string;
    youtube_id?: string;
    vimeo_id?: string;
    autoplay?: boolean;
    poster?: string;
    poster_url?: string;
  } | null;

  // Build parsed video URL from stored IDs or raw URL
  let videoUrl = content?.video_url;
  let isEmbed = false;

  if (content?.youtube_id) {
    videoUrl = buildVideoEmbedUrl({ youtubeId: content.youtube_id }, { autoplay: content.autoplay });
    isEmbed = true;
  } else if (content?.vimeo_id) {
    videoUrl = buildVideoEmbedUrl({ vimeoId: content.vimeo_id }, { autoplay: content.autoplay });
    isEmbed = true;
  } else if (videoUrl) {
    const parsed = parseVideoUrl(videoUrl);
    if (parsed.youtubeId || parsed.vimeoId) {
      videoUrl = buildVideoEmbedUrl(parsed, { autoplay: content?.autoplay });
      isEmbed = true;
    }
  }

  if (!videoUrl) {
    return (
      <p className="text-[var(--color-text-muted)] italic">
        No video configured.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hotspot.description && (
        <p className="text-[var(--color-text-secondary)]">{hotspot.description}</p>
      )}

      <div className="aspect-video rounded-lg overflow-hidden bg-black">
        {isEmbed ? (
          <iframe
            src={videoUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <VideoPlayer
            src={videoUrl}
            poster={content?.poster_url || content?.poster}
            autoPlay={content?.autoplay}
          />
        )}
      </div>
    </div>
  );
}

function LinkContent({ hotspot, onClose }: { hotspot: Hotspot; onClose: () => void }) {
  const content = hotspot.content as {
    url?: string;
    target?: '_blank' | '_self';
    label?: string;
    link_url?: string;
    link_new_tab?: boolean;
  } | null;

  const url = content?.url || content?.link_url;
  const target =
    content?.target || (content?.link_new_tab === false ? '_self' : '_blank');
  const label = content?.label || url || 'Open link';

  const handleOpenLink = () => {
    if (url) {
      window.open(url, target);
      onClose();
    }
  };

  if (!url) {
    return (
      <p className="text-[var(--color-text-muted)] italic">
        No link configured.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {hotspot.description && (
        <p className="text-[var(--color-text-secondary)]">{hotspot.description}</p>
      )}

      <div className="rounded-lg bg-[var(--color-surface-elevated)] p-4">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">
          External Link:
        </p>
        <p className="text-[var(--color-primary-600)] font-medium truncate mb-4">
          {url}
        </p>
        <Button onClick={handleOpenLink} className="w-full">
          <ExternalLink className="h-4 w-4 mr-2" />
          {label}
        </Button>
      </div>
    </div>
  );
}

function CustomContent({ hotspot }: { hotspot: Hotspot }) {
  const content = hotspot.content as {
    html?: string;
    custom_html?: string;
    component?: string;
  } | null;

  const htmlContent = content?.html || content?.custom_html;

  return (
    <div className="space-y-4">
      {hotspot.description && (
        <p className="text-[var(--color-text-secondary)]">{hotspot.description}</p>
      )}

      {htmlContent ? (
        <SandboxedHtml html={htmlContent} />
      ) : (
        <p className="text-[var(--color-text-muted)] italic">
          No custom content configured.
        </p>
      )}
    </div>
  );
}

function SandboxedHtml({ html }: { html: string }) {
  const srcDoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <base target="_blank" />
    <style>
      body { margin: 0; padding: 12px; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji"; }
      img { max-width: 100%; height: auto; }
    </style>
  </head>
  <body>${html}</body>
</html>`;

  return (
    <iframe
      title="Hotspot content"
      sandbox="allow-popups"
      srcDoc={srcDoc}
      className="h-80 w-full rounded-lg border border-[var(--color-border)] bg-white"
    />
  );
}
