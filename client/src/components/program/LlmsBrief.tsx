import { useEffect, useState } from "react";
import { llmsFullPath, llmsPath } from "@/lib/llms/llmsPrograms";

const btn =
  "inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] border px-3 py-1.5";

/**
 * "For AI assistants": the program's generated llms.txt files, so a builder can
 * hand their assistant the whole brief (tracks, rules, judging, dev resources).
 */
export function LlmsBrief({ slug, className = "" }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${llmsFullPath(slug)}`;

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
    } catch {
      setCopied(false);
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
          Give your AI assistant the brief: tracks, themes, what to submit, how it's judged and the developer resources,
          in one file.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 md:justify-end md:shrink-0">
        <a
          href={llmsFullPath(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border-display bg-display text-shell hover:bg-display-dim`}
          data-testid="llms-full-link"
        >
          LLMS-FULL.TXT ↗
        </a>
        <a
          href={llmsPath(slug)}
          target="_blank"
          rel="noopener noreferrer"
          className={`${btn} border-hairline text-display hover:bg-panel-mid`}
          data-testid="llms-link"
        >
          LLMS.TXT ↗
        </a>
        <button
          type="button"
          onClick={copy}
          className={`${btn} border-hairline text-display hover:bg-panel-mid`}
          data-testid="llms-copy"
          aria-live="polite"
        >
          {copied ? "COPIED ✓" : "COPY LINK"}
        </button>
      </div>
    </div>
  );
}
