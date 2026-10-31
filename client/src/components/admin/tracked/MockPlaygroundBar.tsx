import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, USE_MOCK_DATA, type ApiProgram } from "@/lib/api";
import type { ProgramJudge } from "@/lib/programProfiles";
import { useToast } from "@/hooks/use-toast";

const STATUSES: ApiProgram["status"][] = ["draft", "open", "closed", "completed"];

/**
 * Mock mode only: switch the playground program's status to preview each state,
 * open any judge's space as if from their emailed sign-in link (new tab, so
 * several judges can score side by side), and wipe + re-seed the fixture.
 * Never rendered against a real API.
 */
export function MockPlaygroundBar({
  program,
  onProgramChange,
}: {
  program: ApiProgram;
  onProgramChange: (p: ApiProgram) => void;
}) {
  const { toast } = useToast();
  const [judges, setJudges] = useState<ProgramJudge[]>([]);
  useEffect(() => {
    if (!USE_MOCK_DATA) return;
    api.listTrackJudges(program.slug, undefined).then((r) => setJudges(r.data)).catch(() => setJudges([]));
  }, [program.slug]);
  if (!USE_MOCK_DATA) return null;

  const setStatus = async (status: ApiProgram["status"]) => {
    const r = await api.updateProgram(program.slug, { status }, "");
    onProgramChange(r.data);
  };

  const reset = async () => {
    if (!window.confirm("Reset the playground? This wipes every score, prize and change and re-seeds the mock data.")) return;
    await api.resetMockPlayground(program.slug);
    toast({ title: "Playground re-seeded" });
    window.location.reload();
  };

  return (
    <div className="panel px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2 border-dashed" data-testid="playground-bar">
      <span className="label-hw text-display">·PLAYGROUND (MOCK DATA)</span>
      <span className="label-hw-dim">STATUS</span>
      {STATUSES.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => setStatus(s)}
          aria-pressed={program.status === s}
          className={`font-mono text-[10px] tracking-[0.12em] border px-2.5 py-1 ${program.status === s ? "border-display bg-display text-shell" : "border-hairline text-display hover:bg-panel-deep"}`}
        >
          {s.toUpperCase()}
        </button>
      ))}
      <a
        href={`/programs/${program.slug}?preview=before`}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
        data-testid="preview-before-link"
      >
        PREVIEW: BEFORE THE HACK ↗
      </a>
      <div className="flex-1" />
      <button type="button" onClick={reset} className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5">
        RESET PLAYGROUND
      </button>
      {judges.length > 0 && (
        <div className="w-full flex flex-wrap items-center gap-1.5 pt-1" data-testid="open-as-judge">
          <span className="label-hw-dim">OPEN AS JUDGE (STANDS IN FOR THEIR EMAIL LINK)</span>
          {judges.map((j) => (
            <Link
              key={j.email}
              to={`/admin/programs/${program.slug}?judge=${encodeURIComponent(j.email)}`}
              target="_blank"
              rel="noopener"
              className="font-mono text-[10px] tracking-[0.12em] border border-hairline text-display hover:bg-panel-deep px-2.5 py-1"
            >
              {j.name.toUpperCase()} ▸
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
