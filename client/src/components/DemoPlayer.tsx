import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink, Loader2, AlertCircle } from 'lucide-react';
import { detectDemoType, getEmbedUrl, type DemoType } from '@/lib/demoUtils';
import { cn } from '@/lib/utils';

interface DemoPlayerProps {
  demoUrl: string;
  title: string;
  className?: string;
}

export function DemoPlayer({ demoUrl, title, className }: DemoPlayerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoType, setDemoType] = useState<DemoType>('external');
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!demoUrl) {
      setDemoType('external');
      setEmbedUrl(null);
      setIsLoading(false);
      return;
    }

    const type = detectDemoType(demoUrl);
    const embed = getEmbedUrl(demoUrl, type);

    setDemoType(type);
    setEmbedUrl(embed);
    setIsLoading(false);
    setError(null);
  }, [demoUrl]);

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    // Force re-render by resetting state
    setTimeout(() => setIsLoading(false), 100);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    setError(null);
  };

  const handleVideoError = () => {
    setIsLoading(false);
    setError('Failed to load video');
  };

  // Loading state
  if (isLoading) {
    return (
      <div
        className={cn(
          'aspect-video flex items-center justify-center bg-muted rounded-lg border border-border/50',
          className
        )}
      >
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={cn(
          'aspect-video flex flex-col items-center justify-center bg-muted/50 rounded-lg border border-border/50 p-4',
          className
        )}
      >
        <AlertCircle className="w-12 h-12 text-destructive mb-2" />
        <p className="text-sm text-muted-foreground mb-2">{error}</p>
        <Button variant="ghost" size="sm" onClick={handleRetry} className="mt-2">
          Try Again
        </Button>
      </div>
    );
  }

  // YouTube player
  if (demoType === 'youtube' && embedUrl) {
    return (
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden border border-border/50 bg-black',
          className
        )}
      >
        <iframe
          src={embedUrl}
          title={`${title} - YouTube Demo`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          onLoad={handleIframeLoad}
          loading="lazy"
        />
      </div>
    );
  }

  // Vimeo player
  if (demoType === 'vimeo' && embedUrl) {
    return (
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden border border-border/50 bg-black',
          className
        )}
      >
        <iframe
          src={embedUrl}
          title={`${title} - Vimeo Demo`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          onLoad={handleIframeLoad}
          loading="lazy"
        />
      </div>
    );
  }

  // Loom player
  if (demoType === 'loom' && embedUrl) {
    return (
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden border border-border/50 bg-black',
          className
        )}
      >
        <iframe
          src={embedUrl}
          title={`${title} - Loom Demo`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          onLoad={handleIframeLoad}
          loading="lazy"
        />
      </div>
    );
  }

  // Google Drive player
  if (demoType === 'googledrive' && embedUrl) {
    return (
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden border border-border/50 bg-black',
          className
        )}
      >
        <iframe
          src={embedUrl}
          title={`${title} - Google Drive Demo`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
          onLoad={handleIframeLoad}
          loading="lazy"
        />
      </div>
    );
  }

  // Direct video player (HTML5)
  if (demoType === 'video' && embedUrl) {
    return (
      <div
        className={cn(
          'relative aspect-video rounded-lg overflow-hidden border border-border/50 bg-muted',
          className
        )}
      >
        <video
          src={embedUrl}
          controls
          preload="metadata"
          className="w-full h-full object-contain bg-black"
          onError={handleVideoError}
          onLoadedData={() => setIsLoading(false)}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    );
  }

  // Web app iframe
  if (demoType === 'webapp' && embedUrl) {
    return (
      <div
        className={cn(
          'relative rounded-lg overflow-hidden border border-border/50 bg-muted',
          className
        )}
      >
        {/* Height responsive: 400px mobile, 500px tablet, 600px desktop */}
        <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
            <iframe
              src={embedUrl}
              title={`${title} - Web Application`}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
              className="absolute inset-0 w-full h-full"
              onLoad={handleIframeLoad}
              loading="lazy"
            />
        </div>

        {/* Option to open in new tab */}
        <div className="absolute top-2 right-2 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(embedUrl, '_blank', 'noopener,noreferrer')}
            className="gap-2 shadow-lg"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Open in New Tab</span>
            <span className="sm:hidden">Open</span>
          </Button>
        </div>
      </div>
    );
  }

  // External link fallback - try to embed if it's a valid URL, otherwise show button
  const isWebUrl = demoUrl && demoUrl.match(/^https?:\/\//i);
  
  if (isWebUrl && embedUrl) {
    // Try to embed as webapp even if detected as external
    return (
      <div
        className={cn(
          'relative rounded-lg overflow-hidden border border-border/50 bg-muted',
          className
        )}
      >
        <div className="relative w-full h-[400px] md:h-[500px] lg:h-[600px]">
          <iframe
            src={embedUrl}
            title={`${title} - Web Application`}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            className="absolute inset-0 w-full h-full"
            onLoad={handleIframeLoad}
            loading="lazy"
          />
        </div>

        <div className="absolute top-2 right-2 z-10">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => window.open(embedUrl, '_blank', 'noopener,noreferrer')}
            className="gap-2 shadow-lg"
          >
            <ExternalLink className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Open in New Tab</span>
            <span className="sm:hidden">Open</span>
          </Button>
        </div>
      </div>
    );
  }

  // Fallback for non-embeddable links (mailto:, tel:, etc.)
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 border border-border/50 rounded-lg bg-muted/50',
        className
      )}
    >
      <ExternalLink className="w-12 h-12 text-muted-foreground mb-4" aria-hidden="true" />
      <p className="text-sm text-muted-foreground mb-4 text-center">
        Demo available at external link
      </p>
      <Button
        onClick={() => window.open(demoUrl, '_blank', 'noopener,noreferrer')}
        className="gap-2"
      >
        <ExternalLink className="w-4 h-4" aria-hidden="true" />
        View Demo
      </Button>
    </div>
  );
}

