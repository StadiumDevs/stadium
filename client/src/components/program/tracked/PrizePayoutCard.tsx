import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, USE_MOCK_DATA } from "@/lib/api";
import { AWARD_DUE_TEXT, networkLabel, type MyPayout, type PayoutDetailsInput } from "@/lib/payouts";
import { countryName } from "@/lib/countries";
import { useToast } from "@/hooks/use-toast";
import { PayoutDetailsForm } from "./PayoutDetailsForm";

const btn = "font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell disabled:opacity-50 px-3 py-1.5";

/**
 * The winning point person's payout card on their project page: sign in with
 * the email they submitted with, then send their payout details and follow
 * each award's payment (with the transaction link once paid).
 * Opened from the payout email (?payout=1), which scrolls here.
 */
export function PrizePayoutCard({
  slug,
  submissionId,
  verifiedToken,
  signedInEmail,
  signInWithEmail,
}: {
  slug: string;
  submissionId: string;
  verifiedToken: string | null;
  signedInEmail: string | null;
  signInWithEmail: (email: string, redirectTo?: string) => Promise<void>;
}) {
  const { toast } = useToast();
  const ref = useRef<HTMLElement>(null);
  const signedIn = USE_MOCK_DATA || !!verifiedToken;
  const [data, setData] = useState<MyPayout | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ok" | "not-you" | "none">("idle");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [linkSent, setLinkSent] = useState(false);

  const load = useCallback(async () => {
    if (!signedIn) return;
    setState("loading");
    try {
      const d = await api.getMyPayout(slug, submissionId, verifiedToken);
      setData(d);
      setState("ok");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) setState("not-you");
      else setState("none");
    }
  }, [signedIn, slug, submissionId, verifiedToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("payout") === "1") ref.current?.scrollIntoView({ block: "start" });
  }, [state]);

  const save = async (input: PayoutDetailsInput) => {
    setSaving(true);
    try {
      const d = await api.saveMyPayout(slug, submissionId, input, verifiedToken);
      setData(d);
      setEditing(false);
      toast({ title: "Payout details received", description: "We'll email you the transaction link when your prize is paid." });
    } catch (e) {
      toast({ title: "Couldn't save your payout details", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (state === "none") return null;

  return (
    <section ref={ref} className="panel p-4 space-y-3 scroll-mt-40" data-testid="prize-payout" aria-label="Prize payout">
      <div className="label-hw text-display">·PRIZE PAYOUT</div>

      {!signedIn ? (
        <div className="space-y-2" data-testid="payout-verify">
          <p className="label-hw-dim normal-case">
            Point person: sign in with the email you submitted with to send your payout details (legal name, country of tax residence, and
            your wallet address and network).
          </p>
          {linkSent ? (
            <p className="label-hw-dim normal-case">Check your inbox: open the sign-in link to come back here.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input
                type="email"
                aria-label="The email you submitted with"
                placeholder="The email you submitted with"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-[200px] bg-panel-deep border border-hairline text-display font-mono text-[12px] px-2 py-1.5"
              />
              <button
                type="button"
                className={btn}
                disabled={!email.trim()}
                onClick={async () => {
                  try {
                    const url = new URL(window.location.href);
                    url.searchParams.set("payout", "1");
                    await signInWithEmail(email, url.toString());
                    setLinkSent(true);
                  } catch (e) {
                    toast({ title: "Couldn't send the sign-in link", description: (e as Error).message, variant: "destructive" });
                  }
                }}
              >
                SEND ME A SIGN-IN LINK ▸
              </button>
            </div>
          )}
        </div>
      ) : state === "not-you" ? (
        <p className="label-hw-dim normal-case" data-testid="payout-not-you">
          {signedInEmail ? `You're signed in as ${signedInEmail}. ` : ""}Only the point person can send payout details: sign in with the email
          the project was submitted with.
        </p>
      ) : state !== "ok" || !data ? (
        <p className="label-hw-dim">Reading your payout…</p>
      ) : (
        <>
          <ul className="space-y-1.5" data-testid="payout-awards">
            {data.awards.map((a) => (
              <li key={a.award} className="flex flex-wrap items-center justify-between gap-2 text-sm" data-testid="payout-award" data-award={a.award}>
                <span className="text-body">
                  {a.label} · <span className="font-mono text-display">{a.amount} {a.currency}</span>
                </span>
                <span className="label-hw-dim normal-case">
                  {!a.payable ? (
                    `Paid by ${a.paidBy}`
                  ) : a.payment ? (
                    <a href={a.payment.txUrl ?? undefined} target="_blank" rel="noreferrer" className="text-display underline" data-testid="payout-paid-link">
                      Paid {a.payment.paidAt.slice(0, 10)}: see transaction ↗
                    </a>
                  ) : a.due === "now" ? (
                    data.details ? "Details received: paid within 14 days" : "Waiting for your details"
                  ) : (
                    AWARD_DUE_TEXT[a.due]
                  )}
                </span>
              </li>
            ))}
          </ul>

          {data.details && !editing ? (
            <div className="border-t border-hairline-subtle pt-3 space-y-1" data-testid="payout-details-summary">
              <div className="label-hw-dim">YOUR PAYOUT DETAILS</div>
              <p className="text-[13px] text-body">
                {data.details.legalName} · {countryName(data.details.taxCountry)}
              </p>
              <p className="text-[13px] text-body font-mono break-all">
                {networkLabel(data.details.network)}: {data.details.address}
              </p>
              {data.locked ? (
                <p className="label-hw-dim normal-case">A payment has been sent to these details. Reply to the payout email to change them.</p>
              ) : (
                <button type="button" onClick={() => setEditing(true)} className="font-mono text-[10px] tracking-[0.14em] text-display hover:underline">
                  EDIT PAYOUT DETAILS ▸
                </button>
              )}
            </div>
          ) : (
            <div className="border-t border-hairline-subtle pt-3 space-y-2">
              <p className="label-hw-dim normal-case">
                Send your details{data.deadline ? ` by ${new Date(`${data.deadline}T12:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}` : ""}.
                Paid only to you, in your own name, in {data.currency}. ID documents are never collected here: if your country requires them
                we'll ask by email.
              </p>
              <PayoutDetailsForm
                networks={data.networks}
                currency={data.currency}
                initial={data.details}
                saving={saving}
                onSave={save}
                onCancel={data.details ? () => setEditing(false) : undefined}
              />
            </div>
          )}
          {USE_MOCK_DATA && <p className="label-hw-dim normal-case">Playground: no sign-in needed. On the live site the point person verifies their email first.</p>}
        </>
      )}
    </section>
  );
}
