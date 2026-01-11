/**
 * Embed Code Generator Utility
 * Generates iframe and JavaScript embed codes for tours
 */

export interface EmbedOptions {
  width?: number | string;
  height?: number | string;
  autoplay?: boolean;
  showNavbar?: boolean;
  enableFullscreen?: boolean;
  enableVR?: boolean;
  startSceneId?: string;
  autoRotate?: boolean;
  branding?: boolean;
}

const DEFAULT_OPTIONS: Required<EmbedOptions> = {
  width: '100%',
  height: 500,
  autoplay: true,
  showNavbar: true,
  enableFullscreen: true,
  enableVR: true,
  startSceneId: '',
  autoRotate: false,
  branding: true,
};

/**
 * Get the base URL for embedding
 */
function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  // Fallback for SSR or tests
  return import.meta.env.VITE_APP_URL || 'https://360viewer.360ghar.com';
}

/**
 * Build query parameters from options
 */
function buildQueryParams(options: EmbedOptions): string {
  const params = new URLSearchParams();

  if (options.startSceneId) {
    params.set('scene', options.startSceneId);
  }
  if (options.autoplay === false) {
    params.set('autoplay', '0');
  }
  if (options.showNavbar === false) {
    params.set('navbar', '0');
  }
  if (options.enableFullscreen === false) {
    params.set('fullscreen', '0');
  }
  if (options.enableVR === false) {
    params.set('vr', '0');
  }
  if (options.autoRotate) {
    params.set('rotate', '1');
  }
  if (options.branding === false) {
    params.set('branding', '0');
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Format dimension value (number to px, string as-is)
 */
function formatDimension(value: number | string): string {
  return typeof value === 'number' ? `${value}px` : value;
}

/**
 * Generate the embed URL for a tour
 */
export function generateEmbedUrl(tourId: string, options: EmbedOptions = {}): string {
  const baseUrl = getBaseUrl();
  const queryParams = buildQueryParams(options);
  return `${baseUrl}/embed/${tourId}${queryParams}`;
}

/**
 * Generate an iframe embed code
 */
export function generateIframeCode(tourId: string, options: EmbedOptions = {}): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const embedUrl = generateEmbedUrl(tourId, mergedOptions);
  const width = formatDimension(mergedOptions.width);
  const height = formatDimension(mergedOptions.height);

  return `<iframe
  src="${embedUrl}"
  width="${width}"
  height="${height}"
  frameborder="0"
  allow="fullscreen; vr; xr; accelerometer; gyroscope"
  allowfullscreen
  loading="lazy"
  style="border: none; border-radius: 8px;"
></iframe>`;
}

/**
 * Generate a JavaScript SDK embed code
 */
export function generateJsCode(tourId: string, options: EmbedOptions = {}): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const configJson = JSON.stringify(
    {
      tourId,
      width: mergedOptions.width,
      height: mergedOptions.height,
      autoplay: mergedOptions.autoplay,
      navbar: mergedOptions.showNavbar,
      fullscreen: mergedOptions.enableFullscreen,
      vr: mergedOptions.enableVR,
      startScene: mergedOptions.startSceneId || undefined,
      autoRotate: mergedOptions.autoRotate,
      branding: mergedOptions.branding,
    },
    null,
    2
  );

  return `<!-- 360 Viewer Embed -->
<div id="viewer-${tourId}"></div>
<script src="${getBaseUrl()}/embed.js"></script>
<script>
  Viewer360.create('#viewer-${tourId}', ${configJson});
</script>`;
}

/**
 * Generate a responsive embed code
 */
export function generateResponsiveCode(tourId: string, options: EmbedOptions = {}): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const embedUrl = generateEmbedUrl(tourId, mergedOptions);

  return `<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%; border-radius: 8px;">
  <iframe
    src="${embedUrl}"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    allow="fullscreen; vr; xr; accelerometer; gyroscope"
    allowfullscreen
    loading="lazy"
  ></iframe>
</div>`;
}

/**
 * Generate shareable link for a tour
 */
export function generateShareUrl(tourId: string, options: EmbedOptions = {}): string {
  const baseUrl = getBaseUrl();
  const queryParams = buildQueryParams(options);
  return `${baseUrl}/view/${tourId}${queryParams}`;
}

/**
 * Generate social sharing links
 */
export interface SocialShareLinks {
  facebook: string;
  twitter: string;
  linkedin: string;
  whatsapp: string;
  email: string;
}

export function generateSocialShareLinks(
  tourId: string,
  title: string,
  description?: string
): SocialShareLinks {
  const shareUrl = encodeURIComponent(generateShareUrl(tourId));
  const shareTitle = encodeURIComponent(title);
  const shareDescription = encodeURIComponent(description || `Check out this virtual tour: ${title}`);

  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    twitter: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    whatsapp: `https://wa.me/?text=${shareTitle}%20${shareUrl}`,
    email: `mailto:?subject=${shareTitle}&body=${shareDescription}%0A%0A${shareUrl}`,
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        return true;
      } finally {
        document.body.removeChild(textArea);
      }
    }
  } catch {
    console.error('Failed to copy to clipboard');
    return false;
  }
}
