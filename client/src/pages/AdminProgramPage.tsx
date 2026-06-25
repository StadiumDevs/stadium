import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { HardwareToggle } from "@/components/hardware-toggle";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { useSocialAuth } from "@/lib/auth/useSocialAuth";
import { isAdmin as checkIsAdmin, ADMIN_ADDRESSES } from "@/lib/constants";
import {
  api,
  type ApiProgram,
  type ApiProgramApplication,
  ApiError,
} from "@/lib/api";
import { ApplicationCard } from "@/components/admin/ApplicationCard";
import { ProgramAdminsSection } from "@/components/admin/ProgramAdminsSection";
import { ProgramJudgingSection } from "@/components/admin/ProgramJudgingSection";
import { ProgramStatsHeader } from "@/components/admin/ProgramStatsHeader";
import { ProgramFormModal } from "@/components/admin/ProgramFormModal";
import { ProgramSponsorsSection } from "@/components/admin/ProgramSponsorsSection";
import { ProgramSignupsSection } from "@/components/admin/ProgramSignupsSection";
import { LumaGuestsSection } from "@/components/admin/LumaGuestsSection";
import { ProgramAuditLogSection } from "@/components/admin/ProgramAuditLogSection";
import { ProgramResultsSummarySection } from "@/components/admin/ProgramResultsSummarySection";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Filter = ApiProgramApplication["status"] | "all";

const FILTER_OPTIONS: { value: Filter; label: string }[] = [
  { value: "submitted", label: "SUBMITTED" },
  { value: "accepted", label: "ACCEPTED" },
  { value: "rejected", label: "REJECTED" },
  { value: "withdrawn", label: "WITHDRAWN" },
  { value: "all", label: "ALL" },
];

const PROGRAM_TYPE_LABEL: Record<ApiProgram["programType"], string> = {
  dogfooding: "DOGFOODING",
  pitch_off: "PITCH-OFF",
  hackathon: "HACKATHON",
  m2_incubator: "M2 INCUBATOR",
};

const AdminProgramPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const auth = useWalletAuth();
  const connectedAddress = auth.account?.address ?? null;
  // Phase 3 #95: a global admin matches `ADMIN_ADDRESSES`; a per-program
  // admin matches `program_admins` for THIS program. Both can reach the
  // page; only global admins see the add/remove controls.
  const isGlobalAdmin = checkIsAdmin(connectedAddress ?? undefined, auth.account?.chain);
  const [isProgramAdmin, setIsProgramAdmin] = useState(false);
  const isAdminWallet = isGlobalAdmin || isProgramAdmin;

  // Admin-action auth: hand each section the same `getAdminBearerHeaders`
  // callback. First call signs once and exchanges via /api/admin/session for
  // a short-lived bearer; subsequent calls in this tab hit the cache and
  // return the bearer headers with zero wallet prompts. Stable across
  // renders because `getAdminBearerHeaders` is memoized against `account`.
  const { getAdminBearerHeaders } = auth;
  const getAdminAuth = useCallback(() => getAdminBearerHeaders(), [getAdminBearerHeaders]);

  // Social (email magic link) auth — a parallel, view-only path. An invited
  // email admin signs in here and reads their program; the server gates access
  // on program_admin_emails. Wallet auth always takes precedence when present.
  const social = useSocialAuth();
  // An email session resolves to a role-scoped surface: judges can only score
  // (canJudge); admins additionally get the read surface (canViewAdmin). Neither
  // can reach another event — the server gates every call by program + grant.
  const [socialCanJudge, setSocialCanJudge] = useState(false);
  const [socialCanViewAdmin, setSocialCanViewAdmin] = useState(false);
  const [socialProbing, setSocialProbing] = useState(false);
  const [socialError, setSocialError] = useState<string | null>(null);
  const [socialEmailInput, setSocialEmailInput] = useState("");
  const [sendingLink, setSendingLink] = useState(false);
  const [linkSent, setLinkSent] = useState(false);

  // Auth for the judging section when signed in by email: send the Supabase
  // token so requireProgramJudge resolves the judge/admin grant.
  const socialToken = social.token;
  const getJudgeAuth = useCallback(
    async () => ({ "x-supabase-token": socialToken ?? "" }),
    [socialToken],
  );

  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [applications, setApplications] = useState<ApiProgramApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [filter, setFilter] = useState<Filter>("submitted");
  const [editOpen, setEditOpen] = useState(false);
  const [adminsReload, setAdminsReload] = useState(0);
  // Viewing the program needs no signature. The wallet-admin sections each sign
  // an admin-action message when they load their data, so we defer mounting them
  // behind an explicit unlock — one click, one signature (the concurrent section
  // loads dedup to a single wallet popup) — instead of prompting on page view.
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [errorData, setErrorData] = useState<{
    walletAddresses: string[];
    expectedAddresses: string[];
  } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let active = true;
    setLoading(true);
    setNotFound(false);
    api
      .getProgramBySlug(slug)
      .then((r) => { if (active) setProgram(r.data); })
      .catch((e: unknown) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [slug]);

  const loadApplications = async () => {
    if (!slug || !connectedAddress || !isAdminWallet) return;
    try {
      const authHeader = await getAdminAuth();
      const res = await api.listProgramApplications(slug, authHeader);
      setApplications(res.data);
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't load applications",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const sendMagicLink = async () => {
    const email = socialEmailInput.trim();
    if (!email) return;
    setSendingLink(true);
    try {
      await social.signInWithEmail(email, window.location.href);
      setLinkSent(true);
      toast({ title: "Check your inbox", description: `We sent a sign-in link to ${email}.` });
    } catch (e) {
      toast({
        title: "Couldn't send sign-in link",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSendingLink(false);
    }
  };

  // After a social session appears (e.g. returning from the magic link), probe
  // what this email is allowed to do on THIS program: scoring (judge or admin)
  // and/or the admin read surface (admin only). Each probe is independently
  // gated server-side, so the UI only shows what the server already permits.
  useEffect(() => {
    if (!slug || !program || isAdminWallet || !social.isAuthed || !social.token) {
      setSocialCanJudge(false);
      setSocialCanViewAdmin(false);
      return;
    }
    let active = true;
    setSocialProbing(true);
    setSocialError(null);
    const headers = { "x-supabase-token": social.token };
    Promise.allSettled([
      api.listSubmissions(slug, headers),
      api.listProgramApplications(slug, headers),
    ])
      .then(([judgeRes, adminRes]) => {
        if (!active) return;
        const canJudge = judgeRes.status === "fulfilled";
        const canViewAdmin = adminRes.status === "fulfilled";
        setSocialCanJudge(canJudge);
        setSocialCanViewAdmin(canViewAdmin);
        if (adminRes.status === "fulfilled") setApplications(adminRes.value.data);
        if (!canJudge && !canViewAdmin) {
          setSocialError(`${social.email ?? "This email"} is not invited to this program.`);
        }
      })
      .finally(() => { if (active) setSocialProbing(false); });
    return () => { active = false; };
  }, [slug, program, isAdminWallet, social.isAuthed, social.token, social.email]);

  const refreshSocial = async () => {
    if (!slug || !social.token || !socialCanViewAdmin) return;
    try {
      const res = await api.listProgramApplications(slug, { "x-supabase-token": social.token });
      setApplications(res.data);
    } catch (e) {
      toast({
        title: "Couldn't refresh",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const connectWallet = async () => {
    if (!slug) return;
    setErrorData(null);
    try {
      const found = await auth.connect();
      const globalAdmin = found.find((a) => checkIsAdmin(a.address, a.chain));

      // Global admin shortcut — no server probe needed.
      if (globalAdmin) {
        auth.selectAccount(globalAdmin);
        setIsProgramAdmin(false);
        return;
      }

      // Phase 3 #95: probe the program-scoped admins endpoint with the first
      // available account. A 200 means the wallet is listed in program_admins
      // for THIS program; a 403 means it's not authorized here.
      const candidate = found[0];
      if (!candidate) {
        setErrorData({
          walletAddresses: [],
          expectedAddresses: ADMIN_ADDRESSES.filter((e) => e.chain === auth.chain).map((e) => e.address),
        });
        return;
      }
      auth.selectAccount(candidate);
      try {
        // First call also primes the admin session cache: signs once,
        // exchanges via /api/admin/session, caches the bearer for later.
        const authHeader = await auth.getAdminBearerHeaders();
        await api.listProgramAdmins(slug, authHeader);
        setIsProgramAdmin(true);
      } catch (probeErr) {
        if (probeErr instanceof ApiError && probeErr.status === 403) {
          setErrorData({
            walletAddresses: found.map((a) => a.address),
            expectedAddresses: ADMIN_ADDRESSES.filter((e) => e.chain === auth.chain).map((e) => e.address),
          });
          auth.disconnect();
          return;
        }
        throw probeErr;
      }
    } catch (e) {
      toast({
        title: "Couldn't connect wallet",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    }
  };

  const filtered = filter === "all" ? applications : applications.filter((a) => a.status === filter);

  const handleUpdated = (next: ApiProgramApplication) => {
    setApplications((prev) => prev.map((a) => (a.id === next.id ? next : a)));
  };

  return (
    <div className="min-h-screen scanlines">
      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link
            to="/admin"
            className="label-hw-dim hover:text-display transition-colors duration-150 inline-flex items-center gap-1"
          >
            ◂ BACK TO ADMIN
          </Link>
        </div>

        {loading ? (
          <div className="panel px-4 py-10 text-center label-hw-dim">Reading program…</div>
        ) : notFound ? (
          <div className="panel px-4 py-10 max-w-lg mx-auto text-center">
            <div className="label-hw text-display mb-2">·PROGRAM NOT FOUND</div>
            <Link
              to="/admin"
              className="inline-block mt-3 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
            >
              ◂ BACK TO ADMIN
            </Link>
          </div>
        ) : program ? (
          <>
            <header className="mb-6">
              <div className="flex items-start justify-between gap-3">
                <div className="label-hw-dim mb-2">·ADMIN / PROGRAM / {PROGRAM_TYPE_LABEL[program.programType]}</div>
                {(isAdminWallet || socialCanViewAdmin) && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
                  >
                    EDIT ▸
                  </button>
                )}
              </div>
              <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight text-display leading-[0.95] mb-3">
                {program.name}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <div className="lcd inline-flex items-center gap-2 px-3 py-1.5">
                  <span className={cn("led led-sm", program.status === "open" && "led-pulse")} aria-hidden="true" />
                  <span className="label-hw text-display">{program.status.toUpperCase()}</span>
                </div>
                {program.location && <span className="label-hw-dim">{program.location.toUpperCase()}</span>}
              </div>
            </header>

            {editOpen && (isAdminWallet || socialCanViewAdmin) && (
              <ProgramFormModal
                open={editOpen}
                onOpenChange={(v) => {
                  setEditOpen(v);
                  if (!v) setAdminsReload((n) => n + 1); // refresh the read-only list
                }}
                program={program}
                onSaved={(p) => setProgram(p)}
                signAuthHeader={isAdminWallet ? getAdminAuth : getJudgeAuth}
                isGlobalAdmin={isAdminWallet && isGlobalAdmin}
              />
            )}

            {isAdminWallet ? (
              !adminUnlocked ? (
                <div className="panel px-4 py-10 text-center mb-3">
                  <div className="label-hw text-display mb-2">·ADMIN DATA LOCKED</div>
                  <p className="label-hw-dim mb-4 max-w-prose mx-auto">
                    Viewing this program needs no signature. Load the admin data
                    (guests, judging, stats) to manage it; this signs an admin-action
                    message once.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAdminUnlocked(true)}
                    className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-4 py-1.5"
                  >
                    LOAD ADMIN DATA ▸
                  </button>
                </div>
              ) : (
              <>
                <ProgramStatsHeader
                  programSlug={program.slug}
                  getAuth={getAdminAuth}
                  eventEndsAt={program.eventEndsAt}
                />

                {program.status === "completed" && (
                  <ProgramResultsSummarySection
                    program={program}
                    getAuth={getAdminAuth}
                  />
                )}

                <ProgramAdminsSection
                  programSlug={program.slug}
                  signAuthHeader={getAdminAuth}
                  reloadToken={adminsReload}
                />

                <ProgramJudgingSection
                  programSlug={program.slug}
                  getAuth={getAdminAuth}
                  signPublishAction={() => auth.signAction("publish-results")}
                  canSelectWinners={isGlobalAdmin}
                  prizeTiers={program.prizeTiers}
                  resultsPublishedAt={program.resultsPublishedAt}
                  onPublishedChange={(at) => setProgram((p) => (p ? { ...p, resultsPublishedAt: at } : p))}
                />

                {program.programType !== "hackathon" && (
                  <ProgramSponsorsSection
                    programSlug={program.slug}
                    signAuthHeader={getAdminAuth}
                  />
                )}

                {program.programType === "hackathon" ? (
                  <LumaGuestsSection
                    program={program}
                    signAuthHeader={getAdminAuth}
                    onProgramChange={(patch) => setProgram((p) => (p ? { ...p, ...patch } : p))}
                  />
                ) : (
                  <ProgramSignupsSection
                    programSlug={program.slug}
                    signAuthHeader={getAdminAuth}
                  />
                )}

                {program.programType !== "hackathon" && (
                  <ProgramAuditLogSection
                    programSlug={program.slug}
                    signAuthHeader={getAdminAuth}
                  />
                )}
                {/* Legacy program-applications surface — not used by hackathons
                    (their intake is the public submit flow + judging panel). */}
                {program.programType !== "hackathon" && (
                  <>
                    <div className="panel px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2">
                      <HardwareToggle
                        options={FILTER_OPTIONS}
                        value={filter}
                        onChange={setFilter}
                      />
                      <div className="flex-1" />
                      <button
                        type="button"
                        onClick={loadApplications}
                        className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
                      >
                        LOAD / REFRESH
                      </button>
                    </div>

                    {applications.length === 0 ? (
                      <div className="panel px-4 py-10 text-center">
                        <div className="label-hw text-display mb-2">·NO APPLICATIONS LOADED</div>
                        <p className="label-hw-dim">
                          Click LOAD / REFRESH to fetch applications (signs an admin-action message).
                        </p>
                      </div>
                    ) : filtered.length === 0 ? (
                      <div className="panel px-4 py-10 text-center">
                        <div className="label-hw text-display mb-2">·NO MATCHES</div>
                        <p className="label-hw-dim">No applications match the current filter.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filtered.map((a) => (
                          <ApplicationCard
                            key={a.id}
                            application={a}
                            programSlug={program.slug}
                            signAuthHeader={getAdminAuth}
                            onUpdated={handleUpdated}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
              )
            ) : socialCanJudge || socialCanViewAdmin ? (
              <>
                <div className="panel px-3 py-2.5 mb-3 flex flex-wrap items-center gap-2">
                  <span className="lcd inline-flex items-center gap-2 px-3 py-1.5">
                    <span className="led led-sm" aria-hidden="true" />
                    <span className="label-hw text-display">{socialCanViewAdmin ? "ADMIN" : "JUDGE"}</span>
                  </span>
                  <span className="label-hw-dim truncate min-w-0">{social.email}</span>
                  <div className="flex-1" />
                  {socialCanViewAdmin && (
                    <>
                      <HardwareToggle options={FILTER_OPTIONS} value={filter} onChange={setFilter} />
                      <button
                        type="button"
                        onClick={refreshSocial}
                        className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
                      >
                        REFRESH
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => social.signOut()}
                    className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-label-dim hover:text-display px-3 py-1.5"
                  >
                    SIGN OUT
                  </button>
                </div>

                <ProgramStatsHeader
                  programSlug={program.slug}
                  getAuth={getJudgeAuth}
                  eventEndsAt={program.eventEndsAt}
                />

                {/* Email admins can run the lighter organizer actions (guests
                    import, sponsors, program edit). Winners/payouts stay wallet. */}
                {socialCanViewAdmin && (
                  <>
                    <ProgramAdminsSection
                      programSlug={program.slug}
                      signAuthHeader={getJudgeAuth}
                      reloadToken={adminsReload}
                    />
                    {program.programType !== "hackathon" && (
                      <ProgramSponsorsSection programSlug={program.slug} signAuthHeader={getJudgeAuth} />
                    )}
                    {program.programType === "hackathon" ? (
                      <LumaGuestsSection
                        program={program}
                        signAuthHeader={getJudgeAuth}
                        onProgramChange={(patch) => setProgram((p) => (p ? { ...p, ...patch } : p))}
                      />
                    ) : (
                      <ProgramSignupsSection
                        programSlug={program.slug}
                        signAuthHeader={getJudgeAuth}
                      />
                    )}
                  </>
                )}

                {/* Judges + admins both score; judges see ONLY this. Email
                    sessions are never platform admins, so no winner selection. */}
                {socialCanJudge && (
                  <ProgramJudgingSection
                    programSlug={program.slug}
                    getAuth={getJudgeAuth}
                    prizeTiers={program.prizeTiers}
                    resultsPublishedAt={program.resultsPublishedAt}
                  />
                )}

                {/* Applicant data is admin-only — never shown to judges. */}
                {socialCanViewAdmin &&
                  (filtered.length === 0 ? (
                    <div className="panel px-4 py-10 text-center">
                      <div className="label-hw text-display mb-2">·NO APPLICATIONS</div>
                      <p className="label-hw-dim">No applications match the current filter.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((a) => (
                        <ApplicationCard
                          key={a.id}
                          application={a}
                          programSlug={program.slug}
                          signAuthHeader={getJudgeAuth}
                          onUpdated={handleUpdated}
                        />
                      ))}
                    </div>
                  ))}
              </>
            ) : (
              <div className="panel p-6 space-y-5">
                <div>
                  <div className="label-hw text-display mb-3">·SIGN IN TO ADMINISTER</div>
                  <p className="text-body text-sm mb-4">
                    Connect a global or per-program admin wallet, or sign in with the email you were invited with.
                  </p>
                  <button
                    type="button"
                    onClick={connectWallet}
                    disabled={auth.isConnecting}
                    className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
                  >
                    {auth.isConnecting ? "CONNECTING…" : "CONNECT ADMIN WALLET"}
                  </button>
                  {errorData && (
                    <div className="mt-4 lcd p-3 space-y-2">
                      <div className="label-hw text-destructive">·NOT AN ADMIN</div>
                      {errorData.walletAddresses.length > 0 && (
                        <div>
                          <div className="label-hw-dim mb-1">Your wallet addresses:</div>
                          <ul className="space-y-1">
                            {errorData.walletAddresses.map((a, i) => (
                              <li key={i} className="font-mono text-[11px] text-body break-all">{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-hairline pt-5">
                  <div className="label-hw text-display mb-2">·SIGN IN WITH EMAIL</div>
                  {!social.isAvailable ? (
                    <p className="label-hw-dim">Email sign-in isn't configured in this environment.</p>
                  ) : socialProbing ? (
                    <div className="flex items-center gap-2 label-hw-dim">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> CHECKING ACCESS…
                    </div>
                  ) : social.isAuthed ? (
                    <div className="lcd p-3 space-y-2">
                      <div className="label-hw text-destructive">·NOT AUTHORIZED</div>
                      <p className="label-hw-dim">
                        {socialError ?? `${social.email} is not an admin for this program.`}
                      </p>
                      <button
                        type="button"
                        onClick={() => social.signOut()}
                        className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5"
                      >
                        SIGN OUT
                      </button>
                    </div>
                  ) : linkSent ? (
                    <p className="label-hw-dim">Check your inbox for a one-time sign-in link.</p>
                  ) : (
                    <div className="flex flex-col gap-2 md:flex-row">
                      <input
                        type="email"
                        placeholder="you@email.com"
                        value={socialEmailInput}
                        onChange={(e) => setSocialEmailInput(e.target.value)}
                        className="md:flex-1 font-mono text-[12px] bg-panel-deep border border-hairline text-display px-2 py-1.5 focus:outline-none focus:border-display"
                      />
                      <button
                        type="button"
                        onClick={sendMagicLink}
                        disabled={sendingLink || !socialEmailInput.trim()}
                        className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-2"
                      >
                        {sendingLink ? "SENDING…" : "EMAIL ME A LINK"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  );
};

export default AdminProgramPage;
