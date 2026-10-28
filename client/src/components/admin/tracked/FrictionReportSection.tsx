import { useEffect, useState } from "react";
import { api, type AdminAuthArg } from "@/lib/api";
import type { ProgramProfile } from "@/lib/programProfiles";
import { buildFrictionCsv, downloadCsv, groupFriction, type FrictionGroup } from "@/lib/trackedCsv";

/**
 * Friction report: optional builder notes grouped by area, with project and
 * track. The raw report promised to the grant committee (CSV export).
 */
export function FrictionReportSection({
  profile,
  programSlug,
  getAuth,
}: {
  profile: ProgramProfile;
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
}) {
  const [groups, setGroups] = useState<FrictionGroup[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    getAuth()
      .then((auth) => api.listTrackedSubmissions(programSlug, auth))
      .then((r) => setGroups(groupFriction(profile, r.data.submissions)))
      .catch(() => setGroups([]));
  }, [getAuth, programSlug, profile]);

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <section className="panel p-4 mb-3 space-y-3" aria-label="Friction report">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label-hw text-display">·FRICTION REPORT ({total} NOTES)</div>
        <button
          type="button"
          onClick={() => downloadCsv(`${programSlug}-friction.csv`, buildFrictionCsv(groups))}
          disabled={total === 0}
          className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
        >
          EXPORT CSV
        </button>
      </div>
      <p className="label-hw-dim normal-case">Grouped by the area builders tagged. A note with two tags appears under both.</p>
      <ul className="space-y-1.5">
        {groups.map((g) => (
          <li key={g.area} className="lcd">
            <button
              type="button"
              onClick={() => setOpen(open === g.area ? null : g.area)}
              aria-expanded={open === g.area}
              className="w-full text-left p-3 flex items-center justify-between gap-2"
            >
              <span className="label-hw text-display">{g.area.toUpperCase()}</span>
              <span className="label-hw-dim">{g.items.length} ▾</span>
            </button>
            {open === g.area && (
              <ul className="border-t border-hairline-subtle p-3 space-y-2">
                {g.items.map((i) => (
                  <li key={`${g.area}-${i.projectTitle}`} className="text-[13px]">
                    <div className="label-hw-dim">
                      {i.projectTitle.toUpperCase()} · {i.track}
                    </div>
                    <p className="text-body leading-relaxed">{i.notes}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
