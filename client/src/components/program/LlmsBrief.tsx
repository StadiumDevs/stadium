import { useEffect, useState } from "react";
import { llmsGuideUrl, llmsPath, llmsTrackFiles, llmsTrackPath, llmsTrackPrompt } from "@/lib/llms/llmsPrograms";

const btn =
  "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5";

/**
 * "For AI coding agents": one self-contained brief per track, and the prompt to
 * paste into a coding agent (it saves the brief as AGENTS.md in the new repo).
 * Mirrors the program's llms.txt index.
 */
export function LlmsBrief({ slug, className = "" }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const tracks = llmsTrackFiles(slug);
  const guideUrl = llmsGuideUrl(slug);
  const origin = window.location.origin;

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className={`w-full border border-hairline bg-panel-deep p-3 md:p-4 space-y-3 ${className}`} data-testid="program-llms">
      <div className="space-y-1">
        <div className="label-hw text-display">·FOR AI CODING AGENTS</div>
        <p className="text-body text-[13px] leading-relaxed">
          Load only your track's brief: each one is self-contained (rules, what to submit, how it's judged, the stack). Paste
          the prompt into your coding agent: it saves the brief as AGENTS.md in your new repo, so it reads it locally instead
          of fetching it every turn. Entering both tracks? Load both.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tracks.map((t) => {
          const path = llmsTrackPath(slug, t.id);
          const prompt = llmsTrackPrompt(t, origin, slug);
          return (
            <div key={t.id} className="border border-hairline-subtle p-3 space-y-2" data-testid={`llms-track-${t.id}`}>
              <div className="label-hw-dim">{t.label.toUpperCase()}</div>
              <code className="block font-mono text-[11px] text-body break-words" data-testid={`llms-${t.id}-prompt`}>
                {prompt}
              </code>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => copy(`${t.id}:prompt`, prompt)}
                  className={`${btn} border-display bg-display text-shell hover:bg-display-dim`}
                  data-testid={`llms-${t.id}-copy-prompt`}
                  aria-live="polite"
                >
                  {copied === `${t.id}:prompt` ? "COPIED ✓" : "COPY AGENT PROMPT"}
                </button>
                <a
                  href={path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${btn} border-hairline text-display hover:bg-panel-mid`}
                  data-testid={`llms-${t.id}-link`}
                >
                  {t.short} LLMS.TXT ↗
                </a>
                <button
                  type="button"
                  onClick={() => copy(t.id, `${origin}${path}`)}
                  className={`${btn} border-hairline text-display hover:bg-panel-mid`}
                  data-testid={`llms-${t.id}-copy`}
                >
                  {copied === t.id ? "COPIED ✓" : "COPY LINK"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {guideUrl && (
          <a
            href={guideUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] tracking-[0.14em] text-display hover:text-label-mid underline"
            data-testid="llms-guide-link"
          >
            HOW TO USE THESE FILES ↗
          </a>
        )}
        <a
          href={llmsPath(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[10px] tracking-[0.14em] text-label-mid hover:text-display underline"
          data-testid="llms-link"
        >
          EVENT INDEX · LLMS.TXT ↗
        </a>
      </div>
    </div>
  );
}
