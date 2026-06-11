import { useEffect, useState } from "react";
import { api, type AdminAuthArg, type ApiProgramStats } from "@/lib/api";
import { LCDStat } from "@/components/lcd-stat";

// Compact, human countdown to the submission-portal close (the program's event
// end). Returns the display string plus the exact remaining minutes for a tooltip.
function formatRemaining(eventEndsAt?: string | null, nowMs?: number): { text: string; minutes: number | null } {
  if (!eventEndsAt) return { text: "—", minutes: null };
  const end = new Date(eventEndsAt).getTime();
  if (Number.isNaN(end)) return { text: "—", minutes: null };
  const diffMs = end - (nowMs ?? Date.now());
  if (diffMs <= 0) return { text: "CLOSED", minutes: 0 };
  const minutes = Math.floor(diffMs / 60000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return { text: `${days}d ${hours}h`, minutes };
  if (hours > 0) return { text: `${hours}h ${mins}m`, minutes };
  return { text: `${mins}m`, minutes };
}

/**
 * Key-info bar at the top of the program admin/judge view: confirmed
 * participants (Luma signups), projects submitted so far, and a live countdown
 * to the submission portal close (the program's event end). Display-only.
 */
export function ProgramStatsHeader({
  programSlug,
  getAuth,
  eventEndsAt,
}: {
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
  eventEndsAt?: string | null;
}) {
  const [stats, setStats] = useState<ApiProgramStats | null>(null);
  // Tick once a minute so the countdown stays current without a busy loop.
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const auth = await getAuth();
        const res = await api.getProgramStats(programSlug, auth);
        if (active) setStats(res.data);
      } catch {
        if (active) setStats(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [programSlug, getAuth]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 60000);
    return () => clearInterval(id);
  }, []);

  const remaining = formatRemaining(eventEndsAt, nowMs);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
      <LCDStat size="sm" value={stats ? stats.confirmedParticipants : "—"} label="Confirmed participants" />
      <LCDStat size="sm" value={stats ? stats.submissionsCount : "—"} label="Projects submitted" />
      <div title={remaining.minutes != null ? `${remaining.minutes} minutes remaining` : undefined}>
        <LCDStat size="sm" value={remaining.text} label="Submissions close in" />
      </div>
    </div>
  );
}
