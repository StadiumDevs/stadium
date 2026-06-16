import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { detectDemoType, getEmbedUrl } from "@/lib/demoUtils";

/**
 * In-app demo preview for the judging flow: opens a project's video/demo link in
 * a modal (embedded iframe via demoUtils) so judges don't pile up browser tabs,
 * with an "open in new window" escape hatch. GitHub stays a plain new-tab link in
 * the caller (it refuses iframe embedding via X-Frame-Options).
 */
export function ProjectReviewModal({
  url,
  title,
  open,
  onOpenChange,
}: {
  url: string | null;
  title?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { isDirectVideo, embedUrl } = useMemo(() => {
    if (!url) return { isDirectVideo: false, embedUrl: null as string | null };
    const type = detectDemoType(url);
    return { isDirectVideo: type === "video", embedUrl: getEmbedUrl(url, type) };
  }, [url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm tracking-tight pr-8">
            {title || "PROJECT DEMO"}
          </DialogTitle>
        </DialogHeader>
        <div className="w-full aspect-video bg-panel-deep border border-hairline">
          {isDirectVideo && url ? (
            <video src={url} controls className="w-full h-full" />
          ) : embedUrl ? (
            <iframe
              src={embedUrl}
              title="Project demo"
              className="w-full h-full"
              allow="fullscreen; accelerometer; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex h-full items-center justify-center p-4 text-center">
              <p className="label-hw-dim">This link can't be previewed inline. Use "open in new window".</p>
            </div>
          )}
        </div>
        {url && (
          <div className="flex justify-end">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="label-hw-dim hover:text-display inline-flex items-center gap-1"
            >
              OPEN IN NEW WINDOW <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
