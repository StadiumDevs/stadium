import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { api, type ApiPublicSubmission } from "@/lib/api";
import { getProgramProfile } from "@/lib/programProfiles";
import { useToast } from "@/hooks/use-toast";
import NotFound from "./NotFound";

/**
 * The page a point person lands on from a 14- or 30-day check-in email: two
 * questions, answer stored on the project with a date. `?s=` identifies the
 * project (a signed token in the real build).
 */
const ProgramCheckInPage = () => {
  const { slug, day } = useParams<{ slug: string; day: string }>();
  const [params] = useSearchParams();
  const submissionId = params.get("s") ?? "";
  const profile = getProgramProfile(slug);
  const dayNum = Number(day);
  const valid = !!profile && profile.checkIns.some((c) => c.day === dayNum);
  const { toast } = useToast();
  const [project, setProject] = useState<ApiPublicSubmission | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [stillBuilding, setStillBuilding] = useState<boolean | null>(null);
  const [link, setLink] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!slug || !valid) return;
    api
      .listPublicSubmissions(slug)
      .then((r) => setProject(r.data.submissions.find((s) => s.id === submissionId) ?? null))
      .catch(() => setProject(null))
      .finally(() => setLoaded(true));
  }, [slug, valid, submissionId]);

  if (!valid || (loaded && !project)) return <NotFound />;

  const submit = async () => {
    if (stillBuilding === null || !slug) return;
    if (link.trim() && !/^https?:\/\//i.test(link.trim())) {
      toast({ title: "The link must start with http:// or https://", variant: "destructive" });
      return;
    }
    await api.answerCheckIn(slug, submissionId, { day: dayNum, stillBuilding, link: link.trim() || null });
    setDone(true);
  };

  return (
    <div className="min-h-screen scanlines">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <div className="panel p-6 max-w-lg mx-auto space-y-4">
          <div className="label-hw-dim">·{dayNum}-DAY CHECK-IN</div>
          <h1 className="font-display text-3xl uppercase tracking-tight text-display leading-tight">
            {project?.projectTitle ?? "…"}
          </h1>
          {done ? (
            <>
              <p className="text-body">Thanks, that's recorded. You can close this page.</p>
              <Link to={`/programs/${slug}`} className="font-mono text-[10px] tracking-[0.14em] text-display hover:underline">
                ◂ BACK TO THE PROGRAM
              </Link>
            </>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="label-hw">STILL BUILDING?</legend>
                <div className="flex gap-2">
                  {[true, false].map((v) => (
                    <button
                      key={String(v)}
                      type="button"
                      aria-pressed={stillBuilding === v}
                      onClick={() => setStillBuilding(v)}
                      className={`font-mono text-[11px] tracking-[0.14em] border px-4 py-1.5 ${stillBuilding === v ? "border-display bg-display text-shell" : "border-hairline text-display"}`}
                    >
                      {v ? "YES" : "NO"}
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-1.5">
                <label htmlFor="ci-link" className="label-hw">ONE LINK TO WHAT YOU DID SINCE THE HACK</label>
                <input
                  id="ci-link"
                  placeholder="https://…"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  className="w-full bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5"
                />
              </div>
              <button
                type="button"
                onClick={submit}
                disabled={stillBuilding === null}
                className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell disabled:opacity-50 px-4 py-2"
              >
                SEND ▸
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default ProgramCheckInPage;
