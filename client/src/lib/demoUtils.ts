export type DemoType = 'youtube' | 'vimeo' | 'loom' | 'googledrive' | 'video' | 'webapp' | 'external';

/**
 * Detects the type of demo from a URL
 */
export function detectDemoType(url: string): DemoType {
  if (!url) return 'external';

  // YouTube: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return 'youtube';
  }

  // Vimeo: vimeo.com/
  if (url.includes('vimeo.com')) {
    return 'vimeo';
  }

  // Loom: loom.com/share/ or loom.com/embed/
  if (url.includes('loom.com')) {
    return 'loom';
  }

  // Google Drive: drive.google.com/file/d/
  if (url.includes('drive.google.com')) {
    return 'googledrive';
  }

  // Direct video files
  if (url.match(/\.(mp4|webm|ogg|mov)$/i)) {
    return 'video';
  }

  // Web apps - any URL that starts with http/https and isn't a video file or known video platform
  // This includes custom domains, hosting platforms, and any other web application
  if (url.match(/^https?:\/\//i)) {
    return 'webapp';
  }

  // Default: external link (for non-http URLs like mailto:, tel:, etc.)
  return 'external';
}

/**
 * Extracts YouTube video ID from various URL formats
 */
export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/v\/([^?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extracts Vimeo video ID from URL
 */
export function extractVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * Extracts Loom video ID from URL
 */
export function extractLoomId(url: string): string | null {
  // Match patterns like:
  // - loom.com/share/video-id
  // - loom.com/embed/video-id
  // - www.loom.com/share/video-id
  const match = url.match(/loom\.com\/(?:share|embed)\/([^/?]+)/);
  return match ? match[1] : null;
}

/**
 * Extracts Google Drive file ID from URL
 */
export function extractGoogleDriveId(url: string): string | null {
  // Match patterns like:
  // - drive.google.com/file/d/{file-id}/view
  // - drive.google.com/open?id={file-id}
  // - drive.google.com/file/d/{file-id}/preview
  const patterns = [
    /drive\.google\.com\/file\/d\/([^/?]+)/,
    /drive\.google\.com\/open\?id=([^&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Gets the embed URL for a given demo URL and type
 */
export function getEmbedUrl(url: string, type: DemoType): string | null {
  switch (type) {
    case 'youtube': {
      const ytId = extractYouTubeId(url);
      return ytId ? `https://www.youtube.com/embed/${ytId}` : null;
    }

    case 'vimeo': {
      const vimeoId = extractVimeoId(url);
      return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null;
    }

    case 'loom': {
      const loomId = extractLoomId(url);
      return loomId ? `https://www.loom.com/embed/${loomId}` : null;
    }

    case 'googledrive': {
      const driveId = extractGoogleDriveId(url);
      return driveId ? `https://drive.google.com/file/d/${driveId}/preview` : null;
    }

    case 'video':
      return url; // Direct video URL

    case 'webapp':
      return url; // Use as-is in iframe

    case 'external':
      // For external links that are still valid URLs, try to embed them
      if (url.match(/^https?:\/\//i)) {
        return url;
      }
      return null;

    default:
      return null;
  }
}

