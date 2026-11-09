import { useMemo } from "react";
import { api } from "@/lib/api";
import type { ProgramStats } from "@/lib/programStats";
import { renderStatsLlms, STATS_LLMS_FORMAT } from "@/lib/statsLlms";
import { useToast } from "@/hooks/use-toast";

const btn = "font-mono text-[10px] tracking-[0.12em] border border-hairline text-display px-2.5 py-1 hover:bg-panel-deep";

/**
 * The stats page as llms.txt for an agent: OPEN the hosted file (the API URL,
 * production only), DOWNLOAD or COPY the same text built from this snapshot.
 * Versioned and timestamped; public data only, no emails.
 */
export function StatsLlmsButtons({ program, stats, publishedAt }: { program: { name: string; slug: string }; stats: ProgramStats; publishedAt: string }) {
  const { toast } = useToast();
  const text = useMemo(
    () => renderStatsLlms({ program, stats, publishedAt, url: `${window.location.origin}/programs/${program.slug}/stats` }),
    [program, stats, publishedAt],
  );
  const hosted = api.getProgramStatsLlmsUrl(program.slug);
  const fileName = `${program.slug}-stats-llms-${publishedAt.slice(0, 10)}.txt`;

  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "llms.txt copied", description: "Paste it into your agent." });
    } catch {
      toast({ title: "Couldn't copy", description: "Use DOWNLOAD instead.", variant: "destructive" });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3" data-testid="stats-llms">
      <span className="label-hw-dim" title={`${STATS_LLMS_FORMAT} · snapshot ${publishedAt}`}>
        LLMS.TXT FOR AGENTS
      </span>
      {hosted && (
        <a href={hosted} target="_blank" rel="noreferrer" className={btn} data-testid="stats-llms-open">
          OPEN ↗
        </a>
      )}
      <button type="button" onClick={download} className={btn} data-testid="stats-llms-download">
        DOWNLOAD
      </button>
      <button type="button" onClick={copy} className={btn} data-testid="stats-llms-copy">
        COPY
      </button>
    </div>
  );
}
