import { useEffect, useState } from "react";
import { llmsPath, llmsTrackFiles, llmsTrackPath } from "@/lib/llms/llmsPrograms";

const btn =
  "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5";

/**
 * "For AI assistants": the program's llms.txt files, one brief per track, so a
 * builder can hand their assistant exactly their track's rules, stack and judging.
 */
export function LlmsBrief({ slug, className = "" }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const tracks = llmsTrackFiles(slug);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async (id: string, path: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(id);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div
      className={`w-full border border-hairline bg-panel-deep p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-6 ${className}`}
      data-testid="program-llms"
    >
      <div className="space-y-1 min-w-0 md:flex-1">
        <div className="label-hw text-display">·FOR AI ASSISTANTS</div>
        <p className="text-body text-[13px] leading-relaxed">
          Give your AI assistant your track's brief: rules, what to submit, how it's judged and the developer resources.
          Entering both tracks? Give it both.
        </p>
      </div>
      <div className="flex flex-col gap-2 md:items-end md:shrink-0">
        {tracks.map((t) => {
          const path = llmsTrackPath(slug, t.id);
          return (
            <div key={t.id} className="flex flex-wrap items-center gap-2" data-testid={`llms-track-${t.id}`}>
              <a
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn} border-display bg-display text-shell hover:bg-display-dim`}
                data-testid={`llms-${t.id}-link`}
                title={t.label}
              >
                {t.short} · LLMS-{t.id.toUpperCase()}.TXT ↗
              </a>
              <button
                type="button"
                onClick={() => copy(t.id, path)}
                className={`${btn} border-hairline text-display hover:bg-panel-mid`}
                data-testid={`llms-${t.id}-copy`}
                aria-live="polite"
              >
                {copied === t.id ? "COPIED ✓" : "COPY LINK"}
              </button>
            </div>
          );
        })}
        <a
          href={llmsPath(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] tracking-[0.14em] text-label-mid hover:text-display underline"
          data-testid="llms-link"
        >
          INDEX · LLMS.TXT ↗
        </a>
      </div>
    </div>
  );
}
