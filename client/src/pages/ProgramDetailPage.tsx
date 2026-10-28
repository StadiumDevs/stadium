import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { ProjectExplorer } from "@/components/ProjectExplorer";
import { UnitCard } from "@/components/unit-card";
import { RotateCw } from "lucide-react";
import { ChainPicker } from "@/components/auth/ChainPicker";
import { getProvider } from "@/lib/auth/registry";
import {
  api,
  type ApiProgram,
  type ApiProgramSponsor,
  type ApiProgramProject,
  type ApiProject,
  type ApiProgramApplication,
  type ApiPublicResults,
  type ProgramContentSection,
  ApiError,
} from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { isAdmin } from "@/lib/constants";
import { ApplyToProgramModal } from "@/components/program/ApplyToProgramModal";
import { NonMemberApplyModal } from "@/components/program/NonMemberApplyModal";
import { SubmitProjectModal } from "@/components/program/SubmitProjectModal";
import { ProgramContent } from "@/components/program/ProgramContent";
import { TrackedProjectsSection } from "@/components/program/tracked/TrackedProjectsSection";
import { getProgramProfile } from "@/lib/programProfiles";
import type { ApiPublicSubmissions } from "@/lib/api";

const formatDateRange = (from?: string | null, to?: string | null) => {
  if (!from && !to) return null;
  const fmt = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }) : "—";
  return `${fmt(from)} → ${fmt(to)}`;
};

// One width for the header, the about panel and everything below it.
const PAGE_WIDTH = "max-w-6xl";

const PROGRAM_TYPE_LABEL: Record<ApiProgram["programType"], string> = {
  dogfooding: "DOGFOODING",
  pitch_off: "PITCH-OFF",
  hackathon: "HACKATHON",
  m2_incubator: "M2 INCUBATOR",
};

const ProgramDetailPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const auth = useWalletAuth();
  const connectedAddress = auth.account?.address ?? null;

  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [myProjects, setMyProjects] = useState<ApiProject[]>([]);
  const [myApplications, setMyApplications] = useState<ApiProgramApplication[]>([]);
  const [sponsors, setSponsors] = useState<ApiProgramSponsor[]>([]);
  const [projects, setProjects] = useState<ApiProgramProject[]>([]);
  const [entries, setEntries] = useState<ApiProject[]>([]);
  const [results, setResults] = useState<ApiPublicResults | null>(null);
  // Tracked programs (programProfiles.ts) list every submission live.
  const profile = getProgramProfile(slug);
  const [tracked, setTracked] = useState<ApiPublicSubmissions | null>(null);
  const [coverError, setCoverError] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [nonMemberOpen, setNonMemberOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  // Public results: search box over published submissions, and the collapsible
  // "about" panel (hackathon info) that sits below the projects once published.
  const [resultsQuery, setResultsQuery] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  // Admins can apply on behalf of any project (server-side `requireTeamMemberOrAdminByBodyProject`
  // accepts admins). Without this branch, the page would dead-end at "You need to be a team member"
  // even though the server would have let them through.
  const isUserAdmin = useMemo(
    () => isAdmin(connectedAddress ?? undefined, auth.chain),
    [connectedAddress, auth.chain],
  );
  const [allProjects, setAllProjects] = useState<ApiProject[]>([]);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    setError(null);
    api
      .getProgramBySlug(slug)
      .then((r) => { if (active) setProgram(r.data); })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
        else setError(e instanceof Error ? e.message : "Failed to load program");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  useEffect(() => {
    if (!connectedAddress) { setMyProjects([]); return; }
    let active = true;
    api
      .getProjectsByTeamWallet(connectedAddress)
      .then((r) => { if (active) setMyProjects(r.data); })
      .catch(() => { if (active) setMyProjects([]); });
    return () => { active = false; };
  }, [connectedAddress]);

  // Admins get the full project list so they can apply on behalf of any project.
  // Limit is generous; we expect <500 projects historically. Response shape is
  // `{ status, data: ApiProject[], meta }` per server/api/repositories/project.repository.js.
  useEffect(() => {
    if (!isUserAdmin) { setAllProjects([]); return; }
    let active = true;
    api
      .getProjects({ limit: 500 })
      .then((r: { data?: ApiProject[] }) => {
        if (!active) return;
        setAllProjects(Array.isArray(r?.data) ? r.data : []);
      })
      .catch(() => { if (active) setAllProjects([]); });
    return () => { active = false; };
  }, [isUserAdmin]);

  // The list the apply modal renders: admin sees everything, normal user sees their team's projects.
  const projectsForApply = useMemo(
    () => (isUserAdmin && allProjects.length > 0 ? allProjects : myProjects),
    [isUserAdmin, allProjects, myProjects],
  );

  // Load sponsors once we know the program exists.
  useEffect(() => {
    if (!slug || !program) { setSponsors([]); return; }
    let active = true;
    api
      .listProgramSponsors(slug)
      .then((r) => { if (active) setSponsors(r.data); })
      .catch(() => { if (active) setSponsors([]); });
    return () => { active = false; };
  }, [slug, program]);

  // Public, PII-free project aggregate (distinct projects + interest counts
  // derived from the program's signups). Empty for programs without submissions.
  useEffect(() => {
    if (!slug || !program) { setProjects([]); return; }
    let active = true;
    api
      .listProgramProjects(slug)
      .then((r) => { if (active) setProjects(r.data); })
      .catch(() => { if (active) setProjects([]); });
    return () => { active = false; };
  }, [slug, program]);

  // Public, PII-free submissions + winners. Returns published:false (and an
  // empty list) until a platform admin publishes the results.
  useEffect(() => {
    if (!slug || !program || profile) { setResults(null); return; }
    let active = true;
    api
      .getProgramResults(slug)
      .then((r) => { if (active) setResults(r.data); })
      .catch(() => { if (active) setResults(null); });
    return () => { active = false; };
  }, [slug, program, profile]);

  useEffect(() => {
    if (!slug || !program || !profile?.showSubmissionsLive) { setTracked(null); return; }
    let active = true;
    const load = () =>
      api
        .listPublicSubmissions(slug)
        .then((r) => { if (active) setTracked(r.data); })
        .catch(() => { if (active) setTracked(null); });
    load();
    // Pick up a project submitted from the modal (or another tab) without a reload.
    window.addEventListener("focus", load);
    return () => { active = false; window.removeEventListener("focus", load); };
  }, [slug, program, profile, submitOpen]);

  // Stadium project entries belonging to this program (hackathons etc.).
  // Server filters on hackathon_id, backfilled to match program slugs.
  useEffect(() => {
    if (!slug || !program) { setEntries([]); return; }
    let active = true;
    api
      .getProjects({ hackathonId: slug, limit: 500 })
      .then((r: { data?: ApiProject[] }) => {
        if (active) setEntries(Array.isArray(r?.data) ? r.data : []);
      })
      .catch(() => { if (active) setEntries([]); });
    return () => { active = false; };
  }, [slug, program]);

  const refetchApplications = useCallback(() => {
    if (!program || myProjects.length === 0) {
      setMyApplications([]);
      return;
    }
    let active = true;
    Promise.all(myProjects.map((p) => api.getApplicationsForProject(p.id).catch(() => null)))
      .then((results) => {
        if (!active) return;
        const flat: ApiProgramApplication[] = [];
        for (const r of results) if (r?.data) flat.push(...r.data);
        setMyApplications(flat.filter((a) => a.programId === program.id));
      });
    return () => { active = false; };
  }, [program, myProjects]);

  useEffect(() => { return refetchApplications(); }, [refetchApplications]);

  useEffect(() => {
    window.addEventListener("focus", refetchApplications);
    return () => window.removeEventListener("focus", refetchApplications);
  }, [refetchApplications]);

  const existingApplication = useMemo(() => myApplications[0] || null, [myApplications]);

  const handleApplied = (app: ApiProgramApplication) => {
    setMyApplications((prev) => [app, ...prev]);
  };

  const connectWallet = async () => {
    const providerLabel = getProvider(auth.chain)?.label || "Wallet";
    if (!auth.isAvailable) {
      toast({
        title: `${providerLabel} extension not detected`,
        description:
          "Install the wallet extension for your selected chain, then refresh and try again.",
        variant: "destructive",
      });
      return;
    }
    try {
      const found = await auth.connect();
      if (!found.length) {
        toast({
          title: `No accounts found in ${providerLabel}`,
          description: "Open your wallet, create or unlock an account, then try again.",
          variant: "destructive",
        });
        return;
      }
      auth.selectAccount(found[0]);
    } catch (e) {
      toast({
        title: "Couldn't connect wallet",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const applicationsRange = formatDateRange(program?.applicationsOpenAt, program?.applicationsCloseAt);
  const eventRange = formatDateRange(program?.eventStartsAt, program?.eventEndsAt);

  // Hackathons get a single consolidated key-info panel (cover image + date +
  // Luma sign-up + schedule) instead of the sponsors / how-to-apply / key-dates
  // boilerplate. Schedule rows come from the program's `schedule` content sections.
  const isHackathon = program?.programType === "hackathon";
  const scheduleRows = (program?.content ?? [])
    .filter((s): s is Extract<ProgramContentSection, { type: "schedule" }> => s.type === "schedule")
    .flatMap((s) => s.rows);

  // The about panel: cover image on the left, description and the event's
  // basic details on the right. Same template for every program type.
  const showCover = !!program?.coverImageUrl && !coverError;
  const infoRows: { label: string; value: string }[] = [
    ...(!isHackathon && applicationsRange ? [{ label: "APPLICATIONS", value: applicationsRange }] : []),
    ...(eventRange ? [{ label: isHackathon ? "DATE" : "EVENT", value: eventRange }] : []),
    ...(program?.location ? [{ label: "LOCATION", value: program.location }] : []),
    ...scheduleRows.map((r) => ({ label: r.time.toUpperCase(), value: r.label })),
  ];
  const hasAbout = showCover || !!program?.description || infoRows.length > 0 || !!program?.eventUrl;

  // Once a hackathon's results are published, flip the page: searchable projects
  // on top, hackathon info collapsed at the bottom.
  const isPublished = profile
    ? isHackathon && !!tracked?.published && tracked.submissions.length > 0
    : isHackathon && !!results?.published && results.submissions.length > 0;
  const filteredResults = (results?.submissions ?? []).filter((s) => {
    const q = resultsQuery.trim().toLowerCase();
    if (!q) return true;
    return [s.projectTitle, s.submitterName, s.projectBrief].some((v) => (v ?? "").toLowerCase().includes(q));
  });

  const RackButton = ({
    onClick, disabled, children,
  }: { onClick?: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:bg-panel-deep disabled:text-label-dim disabled:border-hairline disabled:cursor-not-allowed px-4 py-2"
    >
      {children}
    </button>
  );

  const renderApplyCta = () => {
    if (!program) return null;

    if (program.status !== "open") {
      return <RackButton disabled>APPLICATIONS CLOSED</RackButton>;
    }

    if (existingApplication) {
      return (
        <div className="lcd inline-flex items-center gap-2 px-3 py-2">
          <span className="led led-sm" aria-hidden="true" />
          <span className="label-hw text-display">APPLIED</span>
          <span className="label-hw-dim">·</span>
          <span className="label-hw text-display">{existingApplication.status.toUpperCase()}</span>
          <button
            type="button"
            onClick={refetchApplications}
            className="ml-2 text-label-mid hover:text-display"
            aria-label="Refresh application status"
          >
            <RotateCw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      );
    }

    if (!connectedAddress) {
      const providerLabel = getProvider(auth.chain)?.label || "Wallet";
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="label-hw-dim">CHAIN</span>
            <ChainPicker value={auth.chain} onChange={auth.setChain} />
          </div>
          <RackButton onClick={connectWallet} disabled={auth.isConnecting}>
            {auth.isConnecting ? "CONNECTING…" : "SIGN IN TO APPLY"}
          </RackButton>
          {!auth.isAvailable && (
            <p className="label-hw-dim">
              {providerLabel.toUpperCase()} EXTENSION NOT DETECTED. INSTALL IT, THEN REFRESH.
            </p>
          )}
        </div>
      );
    }

    if (projectsForApply.length === 0) {
      if (isUserAdmin) {
        // Admin signed in but the all-projects fetch is still pending or empty —
        // surface a soft loading state instead of the gate copy.
        return (
          <div className="space-y-1">
            <RackButton disabled>APPLY</RackButton>
            <p className="label-hw-dim">LOADING PROJECTS…</p>
          </div>
        );
      }
      return (
        <div className="space-y-1">
          <RackButton disabled>APPLY</RackButton>
          <p className="label-hw-dim">You need to be a team member on a Stadium project to apply.</p>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <RackButton onClick={() => setModalOpen(true)}>
          {isUserAdmin && myProjects.length === 0 ? "APPLY ON BEHALF OF…" : "APPLY WITH MY PROJECT"}
        </RackButton>
        {isUserAdmin && (
          <p className="label-hw-dim">ADMIN MODE: APPLY ON BEHALF OF ANY PROJECT</p>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            to="/programs"
            className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
          >
            ◂ BACK TO PROGRAMS
          </Link>
        </div>

        {loading ? (
          <div className="panel px-4 py-10 text-center label-hw-dim">Reading program…</div>
        ) : notFound ? (
          <div className="panel px-4 py-10 max-w-lg mx-auto text-center">
            <div className="label-hw text-display mb-2">·PROGRAM NOT FOUND</div>
            <p className="text-body mb-4">
              We couldn't find a program at that address. It may have been removed or renamed.
            </p>
            <Link
              to="/programs"
              className="inline-block font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
            >
              ◂ BACK TO PROGRAMS
            </Link>
          </div>
        ) : error ? (
          <div className="panel px-4 py-10 text-center">
            <div className="label-hw text-destructive mb-2">·ERROR</div>
            <p className="label-hw-dim">{error}</p>
          </div>
        ) : program ? (
          <>
          {/* Program header first on every program, then the about panel, both
              the same width as the sections below. */}
          <header className={`mb-6 mx-auto ${PAGE_WIDTH}`} data-testid="program-header">
            <div className="label-hw-dim mb-2">·PROGRAM / {PROGRAM_TYPE_LABEL[program.programType]}</div>
            <h1 className="font-display text-5xl md:text-6xl uppercase tracking-tight text-display leading-[0.95] mb-3">
              {program.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3">
              <div className="lcd inline-flex items-center gap-2 px-3 py-1.5">
                <span className={`led led-sm ${program.status === "open" ? "led-pulse" : ""}`} aria-hidden="true" />
                <span className="label-hw text-display">{program.status.toUpperCase()}</span>
              </div>
              {program.location && (
                <span className="label-hw-dim">{program.location.toUpperCase()}</span>
              )}
            </div>
          </header>
          {hasAbout && (
            <section className={`panel p-4 md:p-6 mb-4 mx-auto ${PAGE_WIDTH}`} data-testid="program-about">
              <div className="label-hw text-display mb-4">·ABOUT THIS {isHackathon ? "HACKATHON" : "PROGRAM"}</div>
              <div className={`grid grid-cols-1 gap-6 ${showCover ? "md:grid-cols-2" : ""}`}>
                {showCover && (
                  <img
                    src={program.coverImageUrl ?? undefined}
                    alt={`${program.name} event`}
                    onError={() => setCoverError(true)}
                    className="w-full aspect-video rounded-sm border border-hairline object-cover"
                    data-testid="program-cover"
                  />
                )}
                <div className="flex flex-col gap-4 min-w-0" data-testid="program-key-info">
                  {program.description && (
                    <p className="text-body text-base leading-relaxed whitespace-pre-line">{program.description}</p>
                  )}
                  {infoRows.length > 0 && (
                    <div className="space-y-2">
                      {infoRows.map((r, i) => (
                        <div key={i} className="flex items-baseline justify-between gap-3 border-b border-hairline-subtle pb-1.5 last:border-0">
                          <span className="label-hw-dim shrink-0">{r.label}</span>
                          <span className="font-mono text-[12px] text-display text-right">{r.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {program.eventUrl && (
                    <a
                      href={program.eventUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-start inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-2"
                    >
                      {isHackathon ? "SIGN UP ON LUMA ▸" : "EVENT PAGE ▸"}
                    </a>
                  )}
                </div>
              </div>
            </section>
          )}
          {/* Tracked programs: the wide project grid sits above the event info once
              results are published (the Bitrefill "flip"), below it until then. */}
          {profile && tracked && isPublished && (
            <div className={`${PAGE_WIDTH} mx-auto`}>
              <TrackedProjectsSection
                profile={profile}
                programSlug={program.slug}
                submissions={tracked.submissions}
                published={tracked.published}
              />
            </div>
          )}
          <article className={`${PAGE_WIDTH} mx-auto`}>

            {/* Published hackathon: searchable projects up top. */}
            {isPublished && !profile && (
              <section className="panel p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="label-hw text-display">·PROJECTS ({filteredResults.length})</div>
                  <input
                    type="search"
                    value={resultsQuery}
                    onChange={(e) => setResultsQuery(e.target.value)}
                    placeholder="Search projects…"
                    className="bg-panel-deep border border-hairline text-display placeholder:text-label-dim font-mono text-[12px] px-2 py-1.5 focus:outline-none focus:border-display w-full sm:w-56"
                  />
                </div>
                {filteredResults.length === 0 ? (
                  <p className="label-hw-dim">No projects match your search.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {filteredResults.map((s, i) => (
                      <UnitCard
                        key={`${s.projectTitle}-${i}`}
                        unitNumber={String(i + 1).padStart(3, "0")}
                        title={s.projectTitle}
                        author={s.submitterName}
                        description={s.projectBrief || ""}
                        track={s.prize ? s.prize.label : "Submission"}
                        isWinner={Boolean(s.prize)}
                        prize={s.prize ? `${s.prize.amount} ${s.prize.currency}` : undefined}
                        demoUrl={s.videoUrl}
                        githubUrl={s.githubUrl}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            {!isHackathon && <ProgramContent sections={program.content} />}

            {!isHackathon && sponsors.length > 0 && (
              <div className="panel p-4 mb-4">
                <div className="label-hw mb-3">·SPONSORS &amp; HOW TO APPLY</div>
                <div className="space-y-3">
                  {sponsors.map((s) => (
                    <div key={s.id} className="lcd p-3 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-display text-base tracking-tight text-display uppercase">{s.name}</span>
                        {typeof s.submissionTarget === "number" && s.submissionTarget > 0 && (
                          <span className="border border-hairline text-display bg-panel-deep px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase">
                            TARGET {s.submissionTarget}
                          </span>
                        )}
                        {s.targetProfiles.map((p) => (
                          <span
                            key={p}
                            className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                      {s.applicationInstructions && (
                        <p className="text-body text-sm leading-relaxed whitespace-pre-line">
                          {s.applicationInstructions}
                        </p>
                      )}
                      {s.applyUrl && (
                        <a
                          href={s.applyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-xs text-display hover:underline break-all"
                        >
                          {s.applyUrl} ▸
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {results?.published && results.submissions.length > 0 && !isPublished && (
              <div className="panel p-4 mb-4">
                <div className="label-hw mb-3">·RESULTS</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {results.submissions.map((s, i) => (
                    <UnitCard
                      key={`${s.projectTitle}-${i}`}
                      unitNumber={String(i + 1).padStart(3, "0")}
                      title={s.projectTitle}
                      author={s.submitterName}
                      description={s.projectBrief || ""}
                      track={s.prize ? s.prize.label : "Submission"}
                      isWinner={Boolean(s.prize)}
                      prize={s.prize ? `${s.prize.amount} ${s.prize.currency}` : undefined}
                      demoUrl={s.videoUrl}
                      githubUrl={s.githubUrl}
                    />
                  ))}
                </div>
              </div>
            )}

            {entries.length > 0 && (
              <div className="panel p-4 mb-4">
                <ProjectExplorer projects={entries} />
              </div>
            )}

            {entries.length === 0 && projects.length > 0 && (
              <div className="panel p-4 mb-4">
                <div className="label-hw mb-3">·PROJECTS</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {projects.map((p, i) => (
                    <div key={`${p.name}-${i}`} className="lcd p-3 space-y-2">
                      <div className="font-display text-base tracking-tight text-display uppercase leading-tight">
                        {p.name}
                      </div>
                      {p.description && (
                        <p className="text-body text-sm leading-relaxed line-clamp-4">
                          {p.description}
                        </p>
                      )}
                      {p.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.tags.map((t) => (
                            <span
                              key={t}
                              className="border border-hairline text-label-mid px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      {(p.repoUrl || p.docsUrl) && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {p.repoUrl && (
                            <a
                              href={p.repoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] text-display hover:underline break-all"
                            >
                              REPO ▸
                            </a>
                          )}
                          {p.docsUrl && (
                            <a
                              href={p.docsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-mono text-[11px] text-display hover:underline break-all"
                            >
                              DOCS ▸
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hackathon builder reference + submission requirements. Authored as
                ordered `content` sections so they render directly above the
                submit panel. Non-hackathon programs render their content higher up. */}
            {isHackathon && !isPublished && (
              <ProgramContent
                sections={program.content?.filter((s) => s.type !== "schedule")}
              />
            )}

            {/* Published hackathon: the rest of the event info (tracks, prizes,
                FAQ) collapsed below the projects. */}
            {isPublished && (program.content ?? []).some((c) => c.type !== "schedule") && (
              <section className="panel p-4 mb-4">
                <button
                  type="button"
                  onClick={() => setAboutOpen((v) => !v)}
                  aria-expanded={aboutOpen}
                  className="w-full flex items-center justify-between gap-2 text-left"
                >
                  <span className="label-hw text-display">·HACKATHON DETAILS</span>
                  <span className="label-hw-dim">{aboutOpen ? "HIDE ▴" : "SHOW ▾"}</span>
                </button>
                {aboutOpen && (
                  <div className="mt-3">
                    <ProgramContent sections={program.content?.filter((s) => s.type !== "schedule")} />
                  </div>
                )}
              </section>
            )}

            {program.programType === "hackathon" && !isPublished && (
              <div className="panel p-4">
                <div className="label-hw mb-3">·SUBMIT YOUR PROJECT</div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <RackButton
                    onClick={() => setSubmitOpen(true)}
                    disabled={program.status !== "open"}
                  >
                    SUBMIT A PROJECT ▸
                  </RackButton>
                  <p className="label-hw-dim sm:ml-2">
                    {program.status === "open"
                      ? "Only people who checked in at the door can submit, using the email they used on Luma."
                      : "Submissions are closed for this program."}
                  </p>
                </div>
              </div>
            )}

            {/* The legacy apply flow (past-winner / Stadium-team) is kept for
                non-hackathon programs (e.g. M2); hackathons use the submit flow above. */}
            {!isHackathon && (
              <div className="panel p-4">
                <div className="label-hw mb-3">·APPLY</div>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  {renderApplyCta()}
                  {!existingApplication && program.status === "open" && (
                    <p className="label-hw-dim sm:ml-2">
                      Applications open to past WebZero winners on a Stadium project team.
                    </p>
                  )}
                </div>
                {program.status === "open" && (
                  <div className="mt-3 pt-3 border-t border-hairline-subtle">
                    <button
                      type="button"
                      onClick={() => setNonMemberOpen(true)}
                      className="font-mono text-[11px] tracking-[0.08em] text-display hover:underline"
                    >
                      Don't have a Stadium project yet? Apply here ▸
                    </button>
                  </div>
                )}
              </div>
            )}

            {!isHackathon && connectedAddress && projectsForApply.length > 0 && (
              <ApplyToProgramModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                program={program}
                projects={projectsForApply}
                connectedAddress={connectedAddress}
                onApplied={handleApplied}
              />
            )}

            {!isHackathon && (
              <NonMemberApplyModal
                open={nonMemberOpen}
                onOpenChange={setNonMemberOpen}
                program={program}
              />
            )}

            <SubmitProjectModal
              open={submitOpen}
              onOpenChange={setSubmitOpen}
              program={program}
            />
          </article>
          {profile && tracked && !isPublished && (
            <div className={`${PAGE_WIDTH} mx-auto mt-4`}>
              <TrackedProjectsSection
                profile={profile}
                programSlug={program.slug}
                submissions={tracked.submissions}
                published={tracked.published}
              />
            </div>
          )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default ProgramDetailPage;
