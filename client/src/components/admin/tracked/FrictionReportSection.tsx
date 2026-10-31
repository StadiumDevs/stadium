import { useEffect, useState } from "react";
import { api, type AdminAuthArg } from "@/lib/api";
import type { ProgramProfile } from "@/lib/programProfiles";
import { buildFeedbackCsv, builderFeedback, downloadCsv, type FeedbackItem } from "@/lib/trackedCsv";

/**
 * Builder feedback: the free-text "what slowed you down" answers from the
 * submission form, newest first, with project and track. A search box filters
 * by word (e.g. "faucet"); the CSV goes to the teams who can fix things.
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
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    getAuth()
      .then((auth) => api.listTrackedSubmissions(programSlug, auth))
      .then((r) => setItems(builderFeedback(profile, r.data.submissions)))
      .catch(() => setItems([]));
  }, [getAuth, programSlug, profile]);

  const q = query.trim().toLowerCase();
  const shown = q ? items.filter((i) => `${i.note} ${i.projectTitle}`.toLowerCase().includes(q)) : items;

  return (
    <section className="panel p-4 mb-3 space-y-3" aria-label="Builder feedback">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="label-hw text-display">·BUILDER FEEDBACK ({items.length})</div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search, e.g. faucet"
            aria-label="Search feedback"
            className="bg-panel-deep border border-hairline text-display placeholder:text-label-dim font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-display w-48"
          />
          <button
            type="button"
            onClick={() => downloadCsv(`${programSlug}-builder-feedback.csv`, buildFeedbackCsv(items))}
            disabled={items.length === 0}
            className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            EXPORT CSV
          </button>
        </div>
      </div>
      <p className="label-hw-dim normal-case">
        Optional, not scored: what slowed builders down, in their own words, from the submission form.
      </p>
      {shown.length === 0 ? (
        <p className="label-hw-dim">{q ? "No feedback matches your search." : "No feedback yet."}</p>
      ) : (
        <ul className="space-y-1.5" data-testid="feedback-list">
          {shown.map((i) => (
            <li key={`${i.projectTitle}-${i.submittedAt}`} className="lcd p-3 text-[13px]" data-testid="feedback-item">
              <div className="label-hw-dim">
                {i.projectTitle.toUpperCase()} · {i.track}
              </div>
              <p className="text-body leading-relaxed">{i.note}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
