import { useMemo } from "react";
import { detectDemoType, getEmbedUrl } from "@/lib/demoUtils";

// Hosts we can play on the page. Anything else (an arbitrary site) is not
// iframed: it may refuse framing, and it isn't a video player.
const EMBEDDABLE = new Set(["youtube", "vimeo", "loom", "googledrive"]);

/**
 * A project's demo video, played on the judging screen: direct files in a
 * <video>, YouTube / Vimeo / Loom / Drive in their embed player, and a
 * pointer to the new-tab link for anything else.
 */
export function DemoVideo({ url, title, onPlay }: { url: string; title: string; onPlay?: () => void }) {
  const { kind, src } = useMemo(() => {
    const type = detectDemoType(url);
    if (type === "video") return { kind: "file" as const, src: url };
    const embed = EMBEDDABLE.has(type) ? getEmbedUrl(url, type) : null;
    return embed ? { kind: "embed" as const, src: embed } : { kind: "none" as const, src: null };
  }, [url]);

  if (kind === "none") {
    return (
      <div className="aspect-video w-full max-w-3xl flex items-center justify-center p-4 text-center bg-panel-deep border border-hairline rounded-sm" data-testid="demo-video-fallback">
        <p className="text-[13px] text-body max-w-sm">
          This video can't play here (the host doesn't allow it). Open it in a new tab with the button below.
        </p>
      </div>
    );
  }
  return (
    <div className="aspect-video w-full max-w-3xl bg-panel-deep border border-hairline rounded-sm overflow-hidden" data-testid="demo-video">
      {kind === "file" ? (
        <video src={src} controls preload="metadata" playsInline onPlay={onPlay} className="w-full h-full" aria-label={`${title} demo video`} />
      ) : (
        <iframe
          src={src}
          title={`${title} demo video`}
          className="w-full h-full"
          allow="fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
        />
      )}
    </div>
  );
}
