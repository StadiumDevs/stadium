import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { api, ApiError, USE_MOCK_DATA, type ApiProgram, type ApiPublicSubmission } from "@/lib/api";
import { getProgramProfile, isEcosystem } from "@/lib/programProfiles";
import { MilestoneProgress } from "@/components/program/tracked/MilestoneProgress";
import { SubmissionDetails } from "@/components/program/tracked/SubmissionDetails";
import { formatPrize, prizeEntries } from "@/lib/trackedDisplay";
import { useToast } from "@/hooks/use-toast";
import { useSocialAuth } from "@/lib/auth/useSocialAuth";
import NotFound from "./NotFound";

/**
 * A winning project's own page (tracked programs only). Non-winners have no
 * page: the API returns 404 and this renders NotFound, so cards never link here.
 */
const ProgramWinnerPage = () => {
  const { slug, submissionId } = useParams<{ slug: string; submissionId: string }>();
  const profile = getProgramProfile(slug);
  const { toast } = useToast();
  const [program, setProgram] = useState<ApiProgram | null>(null);
  const [entry, setEntry] = useState<ApiPublicSubmission | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [editing, setEditing] = useState(false);
  const [sentence, setSentence] = useState("");
  const [deliveryLink, setDeliveryLink] = useState("");
  // The point person edits with their email verified (sign-in link); the
  // server checks it matches the submission's email.
  const social = useSocialAuth();
  const [verifyEmail, setVerifyEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);
  const canEdit = USE_MOCK_DATA || !!social.token;

  const load = () => {
    if (!slug || !submissionId || !profile) {
      setState("missing");
      return;
    }
    Promise.all([api.getProgramBySlug(slug), api.getPublicWinner(slug, submissionId)])
      .then(([p, w]) => {
        setProgram(p.data);
        setEntry(w.data);
        setState("ok");
      })
      .catch((e: unknown) => {
        if (e instanceof ApiError && e.status === 404) setState("missing");
        else setState("missing");
      });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [slug, submissionId]);

  if (state === "missing" || !profile) return <NotFound />;
  if (state === "loading" || !entry || !program) {
    return (
      <div className="min-h-screen scanlines">
        <Navigation />
        <main className="container mx-auto px-4 py-6">
          <div className="panel px-4 py-10 text-center label-hw-dim">Reading project…</div>
        </main>
      </div>
    );
  }

  const prizes = prizeEntries(entry);
  const milestone = isEcosystem(entry) ? entry.details.milestone : null;

  const saveBuilderEdit = async () => {
    if (!slug || !submissionId) return;
    if (deliveryLink.trim() && !/^https?:\/\//i.test(deliveryLink.trim())) {
      toast({ title: "Delivery link must start with http:// or https://", variant: "destructive" });
      return;
    }
    try {
      await api.updateSubmissionMilestone(
        slug,
        submissionId,
        { sentence: sentence.trim(), deliveryLink: deliveryLink.trim() || null },
        null,
        { verifiedToken: social.token },
      );
    } catch (e) {
      toast({ title: "Couldn't update the milestone", description: (e as Error).message, variant: "destructive" });
      return;
    }
    setEditing(false);
    toast({ title: "Milestone updated" });
    load();
  };

  return (
    <div className="min-h-screen scanlines">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Link to={`/programs/${program.slug}`} className="label-hw-dim hover:text-display inline-flex items-center gap-1">
            ◂ BACK TO {program.name.toUpperCase()}
          </Link>
        </div>
        <article className="max-w-3xl mx-auto space-y-4">
          <header>
            <div className="label-hw-dim mb-2">·{program.name.toUpperCase()} / WINNER</div>
            <h1 className="font-display text-4xl md:text-5xl uppercase tracking-tight text-display leading-[0.95] mb-3 break-words">
              {entry.projectTitle}
            </h1>
            <p className="text-body text-base leading-relaxed">{entry.details.pitch}</p>
          </header>

          <section className="panel p-4 space-y-2">
            <div className="label-hw">·PRIZE</div>
            {prizes.map(([t, p]) => (
              <div key={t} className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body text-sm">{p.label}</span>
                <span className="font-mono text-sm font-bold text-display">{formatPrize(p)}</span>
              </div>
            ))}
            {isEcosystem(entry) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-body text-sm">{profile.milestone.flagLabel}: partner + 30-day milestone</span>
                <span className="font-mono text-sm font-bold text-display">
                  +${profile.milestone.payoutAmount} ON COMPLETION
                </span>
              </div>
            )}
            <p className="label-hw-dim normal-case">
              Paid to the point person{entry.details.anonymous ? "" : `, ${entry.submitterName}`}.
            </p>
          </section>

          {milestone && (
            <section className="panel p-4 space-y-3">
              <MilestoneProgress profile={profile} milestone={milestone} />
              <div className="border-t border-hairline-subtle pt-3">
                  {!canEdit ? (
                    <div className="space-y-2" data-testid="milestone-verify">
                      <div className="label-hw-dim">POINT PERSON: EDIT YOUR MILESTONE</div>
                      {linkSent ? (
                        <p className="label-hw-dim normal-case">Check your inbox: open the sign-in link to come back here and edit.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="email"
                            aria-label="The email you submitted with"
                            placeholder="The email you submitted with"
                            value={verifyEmail}
                            onChange={(e) => setVerifyEmail(e.target.value)}
                            className="flex-1 min-w-[200px] bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await social.signInWithEmail(verifyEmail, window.location.href);
                                setLinkSent(true);
                              } catch (e) {
                                toast({ title: "Couldn't send the sign-in link", description: (e as Error).message, variant: "destructive" });
                              }
                            }}
                            disabled={!verifyEmail.trim()}
                            className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell disabled:opacity-50 px-3 py-1.5"
                          >
                            SEND ME A SIGN-IN LINK ▸
                          </button>
                        </div>
                      )}
                    </div>
                  ) : editing ? (
                    <div className="space-y-2">
                      <div className="label-hw-dim">BUILDER: UPDATE MILESTONE</div>
                      <textarea
                        aria-label="Milestone sentence"
                        rows={2}
                        value={sentence}
                        onChange={(e) => setSentence(e.target.value)}
                        className="w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5"
                      />
                      <input
                        aria-label="Delivery link"
                        placeholder="Public link to the delivered milestone"
                        value={deliveryLink}
                        onChange={(e) => setDeliveryLink(e.target.value)}
                        className="w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5"
                      />
                      <div className="flex gap-2">
                        <button type="button" onClick={saveBuilderEdit} className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell px-3 py-1.5">
                          SAVE
                        </button>
                        <button type="button" onClick={() => setEditing(false)} className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display px-3 py-1.5">
                          CANCEL
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSentence(milestone.sentence);
                        setDeliveryLink(milestone.deliveryLink ?? "");
                        setEditing(true);
                      }}
                      className="font-mono text-[10px] tracking-[0.14em] text-display hover:underline"
                    >
                      BUILDER: EDIT MILESTONE ▸
                    </button>
                  )}
                  {USE_MOCK_DATA && (
                    <p className="label-hw-dim normal-case mt-2">
                      Playground: no sign-in needed. On the live site the point person verifies their email first.
                    </p>
                  )}
                </div>
            </section>
          )}

          <section className="panel p-4">
            <div className="label-hw mb-2">·FULL DETAILS</div>
            <SubmissionDetails profile={profile} submission={entry} />
          </section>
        </article>
      </main>
    </div>
  );
};

export default ProgramWinnerPage;
