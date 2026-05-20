import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { LCDStat } from "@/components/lcd-stat";
import { MilestoneTrack } from "@/components/milestone-track";
import { InputBus } from "@/components/input-bus";
import { HardwareToggle } from "@/components/hardware-toggle";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiProject } from "@/lib/api";
import { addressInList } from "@/lib/addressUtils";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { cn } from "@/lib/utils";

type Status = "building" | "under_review" | "completed";

interface Team {
  id: string;
  unitNumber: string;
  title: string;
  author: string;
  status: Status;
  teamMembers: { name?: string; walletAddress?: string }[];
  completedMilestones: number;
  currentMilestone: number | null;
  prize?: string;
  completionDate?: string;
}

// Map the M2 status to a fixed milestone-track shape — the schema has no
// per-project milestone breakdown today, so status implies the position.
function milestonesFor(status?: Status): { completed: number; current: number | null } {
  if (status === "completed") return { completed: 5, current: null };
  if (status === "under_review") return { completed: 4, current: 5 };
  if (status === "building") return { completed: 2, current: 3 };
  return { completed: 0, current: null };
}

type ViewFilter = "all" | "mine";
type StatusFilter = "all" | "building" | "review" | "graduate";

const M2ProgramPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useWalletAuth();
  const connectedAddress = auth.account?.address ?? null;

  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<ViewFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Load main-track winners (M2 program is main-track only).
  useEffect(() => {
    let cancelled = false;
    api
      .getProjects({
        winnersOnly: true,
        mainTrackOnly: true,
        sortBy: "updatedAt",
        sortOrder: "desc",
        limit: 1000,
      })
      .then((response) => {
        if (cancelled) return;
        setProjects(Array.isArray(response?.data) ? response.data : []);
      })
      .catch((error) => {
        if (cancelled) return;
        const err = error as Error;
        toast({
          title: "Error",
          description: err?.message || "Failed to load projects.",
          variant: "destructive",
        });
        setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [toast]);

  // Map ApiProject -> Team for the rack rows; preserve a stable unit number
  // by index in the filtered list.
  const toTeam = useCallback((p: ApiProject, idx: number): Team => {
    const status = (p.m2Status ?? "building") as Status;
    const m = milestonesFor(status);
    const prizeAmount = p.bountyPrize?.[0]?.amount;
    return {
      id: p.id,
      unitNumber: String(idx + 1).padStart(3, "0"),
      title: p.projectName,
      author: p.teamMembers?.[0]?.name || "Unknown",
      status,
      teamMembers: p.teamMembers || [],
      completedMilestones: m.completed,
      currentMilestone: m.current,
      prize: prizeAmount ? `$${prizeAmount.toLocaleString()}` : undefined,
      completionDate: p.completionDate,
    };
  }, []);

  const filtered = useMemo(() => {
    const matches = projects.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const inTitle = p.projectName.toLowerCase().includes(q);
        const inDesc = p.description?.toLowerCase().includes(q);
        const inMember = p.teamMembers?.some((m) => m.name?.toLowerCase().includes(q));
        if (!inTitle && !inDesc && !inMember) return false;
      }
      if (view === "mine") {
        if (!connectedAddress) return false;
        if (!addressInList(connectedAddress, p.teamMembers || [], auth.account?.chain)) return false;
      }
      if (statusFilter === "building" && p.m2Status !== "building") return false;
      if (statusFilter === "review" && p.m2Status !== "under_review") return false;
      if (statusFilter === "graduate" && p.m2Status !== "completed") return false;
      return true;
    });
    return matches.map((p, i) => toTeam(p, i));
  }, [projects, search, view, statusFilter, connectedAddress, auth.account?.chain, toTeam]);

  const byStatus = (s: Status) => filtered.filter((t) => t.status === s);
  const buildingTeams = byStatus("building");
  const reviewTeams = byStatus("under_review");
  const graduateTeams = useMemo(
    () =>
      filtered
        .filter((t) => t.status === "completed")
        .sort((a, b) => {
          const dA = a.completionDate ? new Date(a.completionDate).getTime() : 0;
          const dB = b.completionDate ? new Date(b.completionDate).getTime() : 0;
          return dB - dA;
        }),
    [filtered]
  );

  // Counters off the unfiltered cohort — the LCDs show program totals,
  // not what the current filter happens to display.
  const totals = useMemo(() => {
    const b = projects.filter((p) => p.m2Status === "building").length;
    const r = projects.filter((p) => p.m2Status === "under_review").length;
    const g = projects.filter((p) => p.m2Status === "completed").length;
    return { b, r, g };
  }, [projects]);

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <div className="label-hw-dim mb-2">·M2 INCUBATOR / PROGRAM OVERVIEW</div>
          <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight text-display leading-[0.95] mb-2">
            M2 Program
          </h1>
          <p className="text-[13px] text-body leading-relaxed max-w-2xl">
            Six-week incubator for hackathon winners. Teams confirm milestone plans, get matched with mentors, and ship.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <LCDStat
            value={loading ? "—" : String(totals.b).padStart(2, "0")}
            label="Building · Wk 1-4"
            size="md"
            showLED
          />
          <LCDStat
            value={loading ? "—" : String(totals.r).padStart(2, "0")}
            label="Under Review · Wk 5-6"
            size="md"
            showLED
            pulse
          />
          <LCDStat
            value={loading ? "—" : String(totals.g).padStart(2, "0")}
            label="Graduates"
            size="md"
            showLED
          />
        </div>

        <div className="panel px-3 py-2.5 mb-2 flex flex-wrap items-center gap-2">
          <InputBus
            value={search}
            onChange={setSearch}
            placeholder="search teams or units..."
            kbdHint="⌘K"
            className="flex-1 min-w-[200px]"
          />
          <HardwareToggle
            options={[
              { value: "all", label: "ALL" },
              { value: "mine", label: "MINE" },
            ]}
            value={view}
            onChange={setView}
          />
          <HardwareToggle
            options={[
              { value: "all", label: "ALL" },
              { value: "building", label: "BUILDING" },
              { value: "review", label: "REVIEW" },
              { value: "graduate", label: "GRAD" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
          />
        </div>

        {loading ? (
          <M2Rack title="LOADING" subtitle="" count={0}>
            <div className="px-4 py-6 label-hw-dim">Reading directory…</div>
          </M2Rack>
        ) : (
          <>
            {reviewTeams.length > 0 && (
              <M2Rack title="UNDER REVIEW" subtitle="Week 5-6" count={reviewTeams.length} pulse>
                {reviewTeams.map((t) => (
                  <M2Row key={t.id} team={t} onClick={() => navigate(`/m2-program/${t.id}`)} />
                ))}
              </M2Rack>
            )}

            {buildingTeams.length > 0 && (
              <M2Rack title="BUILDING" subtitle="Week 1-4" count={buildingTeams.length}>
                {buildingTeams.map((t) => (
                  <M2Row key={t.id} team={t} onClick={() => navigate(`/m2-program/${t.id}`)} />
                ))}
              </M2Rack>
            )}

            {graduateTeams.length > 0 && (
              <M2Rack title="GRADUATES" subtitle="Completed" count={graduateTeams.length}>
                {graduateTeams.map((t) => (
                  <M2Row key={t.id} team={t} onClick={() => navigate(`/m2-program/${t.id}`)} />
                ))}
              </M2Rack>
            )}

            {filtered.length === 0 && (
              <div className="panel px-4 py-10 text-center">
                <div className="label-hw text-display mb-2">·NO UNITS MATCH</div>
                <p className="label-hw-dim">
                  {view === "mine" && !connectedAddress
                    ? "Connect a wallet to see your teams."
                    : "Adjust the search or filters."}
                </p>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

function M2Rack({
  title,
  subtitle,
  count,
  pulse,
  children,
}: {
  title: string;
  subtitle: string;
  count: number;
  pulse?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="panel mb-3">
      <div className="px-4 py-2.5 bg-shell border-b border-hairline-subtle flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={cn("led led-sm", pulse && "led-pulse")} aria-hidden="true" />
          <span className="label-hw text-display">▸ {title}</span>
          <span className="label-hw-dim">
            {String(count).padStart(2, "0")} {count === 1 ? "TEAM" : "TEAMS"}
          </span>
        </div>
        {subtitle && <span className="label-hw-dim">{subtitle.toUpperCase()}</span>}
      </div>

      <div className="hidden md:grid grid-cols-[32px_1fr_220px_90px_70px] gap-2 px-4 py-2 bg-shell border-b border-hairline-subtle">
        <div />
        <div className="label-hw-dim">UNIT / TEAM</div>
        <div className="label-hw-dim">MILESTONES</div>
        <div className="label-hw-dim">PRIZE</div>
        <div />
      </div>

      <div>{children}</div>
    </div>
  );
}

function M2Row({ team, onClick }: { team: Team; onClick: () => void }) {
  const isGraduate = team.status === "completed";
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full grid grid-cols-[32px_1fr_220px_90px_70px] gap-2 items-center px-4 py-3 border-b border-hairline-subtle last:border-b-0 hover:bg-panel-light/30 transition-colors duration-150 text-left"
    >
      <div className="flex items-center justify-center">
        {isGraduate ? (
          <span className="font-mono text-sm text-display">✓</span>
        ) : (
          <span className={cn("led led-sm", team.status === "under_review" && "led-pulse")} aria-hidden="true" />
        )}
      </div>

      <div>
        <div className="label-hw-dim mb-0.5">UNIT {team.unitNumber}</div>
        <div className="font-display text-base uppercase tracking-tight text-display leading-tight">
          {team.title}
        </div>
        <div className="label-hw-dim mt-0.5">BY {team.author.toUpperCase()}</div>
      </div>

      <div>
        <MilestoneTrack
          completed={team.completedMilestones}
          current={team.currentMilestone}
        />
      </div>

      <div className="font-mono text-sm font-bold text-display tabular-nums">
        {team.prize ?? <span className="text-label-dim">—</span>}
      </div>

      <div className="text-right label-hw-dim">OPEN ▸</div>
    </button>
  );
}

export default M2ProgramPage;
