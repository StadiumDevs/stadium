import { useEffect, useState } from "react";
import { api, USE_MOCK_DATA, type AdminAuthArg, type ApiResultsFeedbackAggregate } from "@/lib/api";
import { EXPERIENCE_RATING_CATEGORIES, RATING_MAX } from "@/lib/experienceRatings";

type Ratings = NonNullable<ApiResultsFeedbackAggregate["ratings"]>;

/**
 * Admin: the builders' event ratings (given when they submit), averaged per
 * category. Shown for every program once anyone has rated; hidden until then.
 */
export function ExperienceRatingsSection({
  programSlug,
  getAuth,
}: {
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
}) {
  const [ratings, setRatings] = useState<Ratings | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    // Mock mode ignores the auth header: skip the wallet signing call.
    const authPromise: Promise<AdminAuthArg> = USE_MOCK_DATA ? Promise.resolve({} as AdminAuthArg) : getAuth();
    authPromise
      .then((authHeader) => api.getFeedbackAggregate(programSlug, authHeader))
      .then((r) => {
        if (active) setRatings(r.data.ratings ?? {});
      })
      .catch(() => {
        // Degrade quietly: the section stays hidden.
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // getAuth is a stable memoised ref, excluded on purpose to run once per program.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programSlug, refreshTick]);

  const rated = EXPERIENCE_RATING_CATEGORIES.filter(({ id }) => (ratings?.[id]?.count ?? 0) > 0);
  if (rated.length === 0) return null;
  const responses = Math.max(...rated.map(({ id }) => ratings?.[id]?.count ?? 0));

  return (
    <div className="panel px-3 py-2.5 mb-3">
      <div className="flex items-center justify-between mb-3">
        <div className="label-hw text-display">
          ·EVENT RATINGS ({responses} builder{responses !== 1 ? "s" : ""})
        </div>
        <button
          type="button"
          onClick={() => setRefreshTick((n) => n + 1)}
          disabled={loading}
          className="label-hw-dim hover:text-display text-[10px] tracking-widest disabled:opacity-40"
        >
          {loading ? "LOADING…" : "↺ REFRESH"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
        {rated.map(({ id, label }) => {
          const { avg, count } = ratings?.[id] ?? { avg: 0, count: 0 };
          return (
            <div key={id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <span className="label-hw-dim">{label.toUpperCase()}</span>
                <span className="label-hw text-display shrink-0">
                  {avg.toFixed(1)} / {RATING_MAX}
                  <span className="label-hw-dim"> · {count}</span>
                </span>
              </div>
              <div
                className="h-2 bg-panel-deep"
                role="meter"
                aria-label={`${label}: ${avg.toFixed(1)} out of ${RATING_MAX}`}
                aria-valuemin={0}
                aria-valuemax={RATING_MAX}
                aria-valuenow={avg}
              >
                <div className="h-full bg-display" style={{ width: `${Math.round((avg / RATING_MAX) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
