import { useCallback, useEffect, useState } from "react";
import { api, USE_MOCK_DATA, type AdminAuthArg, type ApiTrackedSubmission } from "@/lib/api";
import { isEcosystem, type ProgramProfile } from "@/lib/programProfiles";
import { formatDay } from "@/lib/milestones";
import { useToast } from "@/hooks/use-toast";

type Counts = { answered: number; stillBuilding: number; total: number };
const count = (list: ApiTrackedSubmission[], day: number): Counts => {
  const answers = list.map((s) => s.details.checkIns.find((c) => c.day === day && c.answeredAt)).filter(Boolean);
  return { answered: answers.length, stillBuilding: answers.filter((a) => a?.stillBuilding).length, total: list.length };
};

/**
 * 14- and 30-day check-ins for every point person: a send button per check-in
 * (sent by hand; nothing is scheduled) and still-building counts, split between
 * the Ecosystem Prize winners and everyone else.
 */
export function CheckInsSection({
  profile,
  programSlug,
  getAuth,
}: {
  profile: ProgramProfile;
  programSlug: string;
  getAuth: () => Promise<AdminAuthArg>;
}) {
  const { toast } = useToast();
  const [subs, setSubs] = useState<ApiTrackedSubmission[]>([]);
  const [sent, setSent] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<number | null>(null);

  const load = useCallback(async () => {
    const r = await api.listTrackedSubmissions(programSlug, await getAuth());
    setSubs(r.data.submissions);
    setSent(r.data.checkInsSent);
  }, [getAuth, programSlug]);

  useEffect(() => {
    load().catch(() => setSubs([]));
  }, [load]);

  const backed = subs.filter(isEcosystem);
  const others = subs.filter((s) => !backed.includes(s));

  const send = async (day: number) => {
    if (sent[String(day)] && !window.confirm(`The ${day}-day check-in was already sent. Send it again to every point person?`)) return;
    setSending(day);
    try {
      const r = await api.sendCheckIns(programSlug, day, await getAuth());
      setSent((prev) => ({ ...prev, [String(day)]: r.data.sentAt }));
      toast({
        title: `${day}-day check-in sent`,
        description: USE_MOCK_DATA
          ? `Playground: would email ${r.data.recipients} point people.`
          : `Emailed ${r.data.recipients} point people.`,
      });
    } catch (e) {
      toast({ title: "Couldn't send check-in", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  const Cell = ({ c }: { c: Counts }) => (
    <span className="font-mono text-[12px] text-display">
      {c.stillBuilding} still building · {c.answered}/{c.total} answered
    </span>
  );

  return (
    <section className="panel p-4 mb-3 space-y-3" aria-label="Check-ins">
      <div className="label-hw text-display">·CHECK-INS</div>
      <p className="label-hw-dim normal-case">
        Every point person gets two questions: still building (yes/no) and one link to what they did since the hack. Sent by hand
        from here.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {profile.checkIns.map((ci) => {
          const sample = subs[0];
          return (
            <div key={ci.day} className="lcd p-3 space-y-2" data-testid={`checkin-${ci.day}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="label-hw text-display">{ci.day}-DAY · {formatDay(ci.date)?.toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => send(ci.day)}
                  disabled={sending === ci.day}
                  className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1.5"
                >
                  SEND {ci.day}-DAY CHECK-IN
                </button>
              </div>
              <div className="label-hw-dim">
                {sent[String(ci.day)] ? `SENT ${formatDay(sent[String(ci.day)])?.toUpperCase()}` : "NOT SENT YET"}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="label-hw-dim">ECOSYSTEM PRIZE WINNERS</span>
                  <Cell c={count(backed, ci.day)} />
                </div>
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="label-hw-dim">EVERYONE ELSE</span>
                  <Cell c={count(others, ci.day)} />
                </div>
              </div>
              {USE_MOCK_DATA && sample && (
                <a
                  href={`/programs/${programSlug}/check-in/${ci.day}?s=${encodeURIComponent(sample.id)}`}
                  className="font-mono text-[10px] tracking-[0.12em] text-display hover:underline"
                >
                  PREVIEW THE EMAILED FORM ▸
                </a>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
