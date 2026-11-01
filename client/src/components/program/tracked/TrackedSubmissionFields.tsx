import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SubmissionTrack } from "@/lib/api";
import type { ProgramProfile } from "@/lib/programProfiles";
import { RequiredMark } from "../RequiredMark";
import {
  BITREFILL_FEEDBACK_MAX,
  invalidBorder,
  invalidText,
  isApp,
  judgesAgentic,
  needsTxid,
  PITCH_MAX,
  PRIVACY_NOTE_MAX,
  type TrackedFormState,
} from "./trackedForm";

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Teammate edit access on the team rows (drafts on Stadium). */
export type TeamEditAccess = {
  /** The point person manages access; a teammate only sees it. */
  canManage: boolean;
  /** Emails that can edit (lowercased). */
  editors: string[];
  /** Email being granted or removed right now. */
  busy: string | null;
  /** Per-email error (e.g. not checked in on Luma). */
  errors: Record<string, string>;
  onChange: (email: string, grant: boolean) => void;
  /** The point person's own email (already can edit). */
  ownerEmail: string;
};

/**
 * Extra submission fields for a tracked program (tracks, themes, txid, next milestone, feedback, anonymity).
 * `invalid` holds the ids of fields to mark red (see validateTrackedForm).
 */
export function TrackedSubmissionFields({
  profile,
  value: f,
  onChange,
  invalid = new Set<string>(),
  editAccess,
}: {
  profile: ProgramProfile;
  value: TrackedFormState;
  onChange: (next: TrackedFormState) => void;
  invalid?: Set<string>;
  editAccess?: TeamEditAccess;
}) {
  const set = <K extends keyof TrackedFormState>(k: K, v: TrackedFormState[K]) => onChange({ ...f, [k]: v });
  const privacy = !!f.track && f.track !== "agentic";
  const agentic = judgesAgentic(f.track);
  const bad = (id: string) => invalid.has(id);

  return (
    <div className="space-y-4 border-t border-hairline-subtle pt-4">
      <fieldset id="trk-track" tabIndex={-1} className="space-y-2" aria-invalid={bad("trk-track") || undefined}>
        <legend className={"label-hw-dim" + invalidText(bad("trk-track"))}>TRACK<RequiredMark /></legend>
        <RadioGroup value={f.track} onValueChange={(v) => set("track", v as SubmissionTrack)}>
          {profile.tracks.map((t) => (
            <div key={t.id} className="flex items-center gap-2">
              <RadioGroupItem id={`trk-${t.id}`} value={t.id} />
              <label htmlFor={`trk-${t.id}`} className="text-body text-sm cursor-pointer">{t.label}</label>
            </div>
          ))}
          {profile.allowBothTracks && (
            <div className="flex items-center gap-2">
              <RadioGroupItem id="trk-both" value="both" />
              <label htmlFor="trk-both" className="text-body text-sm cursor-pointer">Both tracks</label>
            </div>
          )}
        </RadioGroup>
      </fieldset>

      {f.track && (
        <div className="border border-hairline-subtle bg-panel-deep p-3 space-y-2" data-testid="track-requirements">
          <div className="label-hw-dim">WHAT {f.track === "both" ? "BOTH TRACKS NEED" : "THIS TRACK NEEDS"}</div>
          <div className={f.track === "both" ? "grid grid-cols-1 sm:grid-cols-2 gap-3" : ""}>
            {privacy && (
              <div data-testid="track-requirements-privacy">
                <div className="label-hw text-display text-[10px]">PRIVACY TRACK</div>
                <ul className="list-disc pl-5 text-body text-[12px] leading-relaxed">
                  <li>Themes</li>
                  <li>One shielded testnet transaction ID</li>
                  <li>Privacy and trust note</li>
                  <li>Public URL if it's an app</li>
                  <li>Demo video (optional, strongly preferred)</li>
                </ul>
              </div>
            )}
            {agentic && (
              <div data-testid="track-requirements-agentic">
                <div className="label-hw text-display text-[10px]">AGENTIC COMMERCE TRACK</div>
                <ul className="list-disc pl-5 text-body text-[12px] leading-relaxed">
                  <li>Demo video or a live link showing the agent make a purchase (required)</li>
                  <li>Bitrefill feedback: what worked, what didn't</li>
                  <li>Repo README with the demo URL</li>
                </ul>
              </div>
            )}
          </div>
          {f.track === "both" && (
            <p className="label-hw-dim normal-case">
              One submission covers both tracks. Each track's judges see their own track's fields and score them with their own rubric.
              The demo video is required because Agentic Commerce needs it.
            </p>
          )}
        </div>
      )}

      {privacy && (
        <fieldset id="trk-themes" tabIndex={-1} className="space-y-2" aria-invalid={bad("trk-themes") || undefined}>
          <legend className={"label-hw-dim" + invalidText(bad("trk-themes"))}>THEMES (PRIVACY TRACK)<RequiredMark /></legend>
          {profile.themes.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <Checkbox id={`thm-${t}`} checked={f.themes.includes(t)} onCheckedChange={() => set("themes", toggle(f.themes, t))} />
              <label htmlFor={`thm-${t}`} className="text-body text-sm cursor-pointer">{t}</label>
            </div>
          ))}
        </fieldset>
      )}

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between">
          <Label htmlFor="trk-pitch" className={"label-hw-dim" + invalidText(bad("trk-pitch"))}>ONE-LINE PITCH: WHAT IT DOES AND FOR WHOM<RequiredMark /></Label>
          <span className="label-hw-dim">{f.pitch.trim().length}/{PITCH_MAX}</span>
        </div>
        <Input id="trk-pitch" maxLength={PITCH_MAX} value={f.pitch} onChange={(e) => set("pitch", e.target.value)} aria-invalid={bad("trk-pitch") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-pitch"))} />
      </div>

      <fieldset className="space-y-2">
        <legend className="label-hw-dim">TEAMMATES (OPTIONAL)</legend>
        {editAccess && (
          <p className="label-hw-dim normal-case">
            {editAccess.canManage
              ? "Give a teammate edit access and they can open and update this submission with their own email. Their email must be checked in on Luma."
              : "The point person decides who can edit."}
          </p>
        )}
        {f.team.map((m, i) => {
          const email = m.email.trim().toLowerCase();
          const canEdit = !!email && (editAccess?.editors.includes(email) ?? false);
          const showAccess = !!editAccess && EMAIL_RE.test(email) && email !== editAccess.ownerEmail.trim().toLowerCase();
          const busy = editAccess?.busy === email;
          const accessError = email ? editAccess?.errors[email] : "";
          return (
          <div key={i} className="space-y-1" data-testid={`team-row-${i}`}>
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-2">
            <Input id={`trk-team-${i}-name`} aria-label={`Teammate ${i + 1} name`} aria-invalid={bad(`trk-team-${i}-name`) || undefined} placeholder="Name" value={m.name} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={"font-mono text-sm" + invalidBorder(bad(`trk-team-${i}-name`))} />
            <Input aria-label={`Teammate ${i + 1} email`} placeholder="Email" type="email" value={m.email} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} className="font-mono text-sm" />
            <Input aria-label={`Teammate ${i + 1} role`} placeholder="Role" value={m.role} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} className="font-mono text-sm" />
            <button type="button" onClick={() => set("team", f.team.filter((_, j) => j !== i))} className="font-mono text-[10px] tracking-[0.12em] text-label-mid hover:text-display px-2">
              REMOVE
            </button>
          </div>
          {showAccess && (
            <div className="flex flex-wrap items-center gap-2 pl-0.5">
              {canEdit ? (
                <>
                  <span className="label-hw text-led" data-testid={`can-edit-${i}`}>✓ CAN EDIT</span>
                  {editAccess.canManage && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => editAccess.onChange(email, false)}
                      className="font-mono text-[10px] tracking-[0.12em] text-label-mid hover:text-display underline disabled:opacity-50"
                      data-testid={`revoke-edit-${i}`}
                    >
                      REMOVE ACCESS
                    </button>
                  )}
                </>
              ) : editAccess.canManage ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => editAccess.onChange(email, true)}
                  className="font-mono text-[10px] tracking-[0.12em] border border-hairline text-display hover:bg-panel-deep px-2.5 py-1 disabled:opacity-50"
                  data-testid={`grant-edit-${i}`}
                >
                  {busy ? "CHECKING LUMA…" : "GIVE EDIT ACCESS"}
                </button>
              ) : null}
              {accessError && (
                <span className="label-hw text-destructive normal-case" role="alert" data-testid={`edit-error-${i}`}>
                  {accessError}
                </span>
              )}
            </div>
          )}
          </div>
          );
        })}
        <button type="button" onClick={() => set("team", [...f.team, { name: "", email: "", role: "" }])} className="font-mono text-[10px] tracking-[0.12em] text-display hover:underline">
          + ADD TEAMMATE
        </button>
        <div className="flex items-start gap-2 pt-1">
          <Checkbox id="trk-anon" checked={f.anonymous} onCheckedChange={(v) => set("anonymous", v === true)} className="mt-0.5" />
          <label htmlFor="trk-anon" className="text-body text-sm cursor-pointer">
            I want to be anonymous: hide my name and my teammates' names on the public page. Admins can still see them.
          </label>
        </div>
      </fieldset>

      <fieldset id="trk-apptype" tabIndex={-1} className="space-y-2" aria-invalid={bad("trk-apptype") || undefined}>
        <legend className={"label-hw-dim" + invalidText(bad("trk-apptype"))}>WHAT IS IT?<RequiredMark /></legend>
        <RadioGroup value={f.appType} onValueChange={(v) => set("appType", v)} className="grid grid-cols-2 gap-1.5">
          {profile.appTypes.map((t) => (
            <div key={t} className="flex items-center gap-2">
              <RadioGroupItem id={`app-${t}`} value={t} />
              <label htmlFor={`app-${t}`} className="text-body text-sm cursor-pointer">{t}</label>
            </div>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="trk-url" className={"label-hw-dim" + invalidText(bad("trk-url"))}>
          {isApp(f.appType) ? "PUBLIC URL" : "PUBLIC URL (APPS ONLY)"}<RequiredMark show={isApp(f.appType)} />
        </Label>
        <Input id="trk-url" placeholder="https://…" value={f.publicUrl} onChange={(e) => set("publicUrl", e.target.value)} aria-invalid={bad("trk-url") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-url"))} />
        {privacy && !isApp(f.appType) && f.appType && (
          <p className="label-hw-dim normal-case">For non-apps the video must show it working with Zcash.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trk-tech" className={"label-hw-dim" + invalidText(bad("trk-tech"))}>TECHNOLOGIES USED (COMMA-SEPARATED)<RequiredMark /></Label>
        <Input id="trk-tech" placeholder="WebZjs, lightwalletd, Next.js" value={f.technologies} onChange={(e) => set("technologies", e.target.value)} aria-invalid={bad("trk-tech") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-tech"))} />
      </div>

      {privacy && (
        <div className="space-y-1.5">
          <Label htmlFor="trk-txid" className={"label-hw-dim" + invalidText(bad("trk-txid"))}>TESTNET TRANSACTION ID (PRIVACY TRACK)<RequiredMark show={needsTxid(profile, f.track)} /></Label>
          <Input id="trk-txid" placeholder="One shielded testnet txid your project created" value={f.testnetTxid} onChange={(e) => set("testnetTxid", e.target.value)} aria-invalid={bad("trk-txid") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-txid"))} />
          <p className="label-hw-dim normal-case">
            Stadium checks it exists and is shielded. A failed check never blocks your submission; amounts and memos stay private.
          </p>
        </div>
      )}

      {privacy && (
        <div className="space-y-1.5" data-testid="privacy-note-field">
          <div className="flex items-baseline justify-between">
            <Label htmlFor="trk-privacy-note" className={"label-hw-dim" + invalidText(bad("trk-privacy-note"))}>PRIVACY AND TRUST NOTE (JUDGES SCORE PRIVATE FROM THIS)<RequiredMark /></Label>
            <span className="label-hw-dim">{f.privacyNote.trim().length}/{PRIVACY_NOTE_MAX}</span>
          </div>
          <div className="label-hw-dim normal-case space-y-0.5">
            <p>A few honest lines beat a vague claim. Answer four questions:</p>
            <ol className="list-decimal pl-5">
              <li>What stays private? (e.g. amounts, sender and receiver are shielded on-chain)</li>
              <li>What does your app reveal, and to whom? (e.g. your server stores emails next to order ids; the light-wallet server sees the user's IP)</li>
              <li>What do users have to trust? Name each party: your server, a hosted light-wallet server, a payment processor, an AI model provider, you as the operator.</li>
              <li>What would you fix next?</li>
            </ol>
            <p>Self-custody alone isn't a privacy design. Naming a gap doesn't cost points; leaving one out does.</p>
          </div>
          <Textarea
            id="trk-privacy-note"
            rows={5}
            maxLength={PRIVACY_NOTE_MAX}
            value={f.privacyNote}
            onChange={(e) => set("privacyNote", e.target.value)}
            aria-invalid={bad("trk-privacy-note") || undefined}
            className={"font-mono text-sm" + invalidBorder(bad("trk-privacy-note"))}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="trk-next" className={"label-hw-dim" + invalidText(bad("trk-next"))}>WHAT IS YOUR NEXT 30-DAY MILESTONE FOR CONTINUING THIS PROJECT?<RequiredMark /></Label>
        <Textarea id="trk-next" rows={2} value={f.nextStep} onChange={(e) => set("nextStep", e.target.value)} aria-invalid={bad("trk-next") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-next"))} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trk-next-links" className={"label-hw-dim" + invalidText(bad("trk-next-links"))}>LINKS TO ANYTHING ALREADY STARTED (OPTIONAL)</Label>
        <Textarea
          id="trk-next-links"
          rows={2}
          placeholder="An upstream PR, an issue, a partner thread… one per line"
          value={f.nextStepLinks}
          onChange={(e) => set("nextStepLinks", e.target.value)}
          aria-invalid={bad("trk-next-links") || undefined}
          className={"font-mono text-sm" + invalidBorder(bad("trk-next-links"))}
        />
      </div>

      {agentic && (
        <fieldset className="space-y-2 border-t border-hairline-subtle pt-4" data-testid="bitrefill-feedback-field">
          <legend className="label-hw-dim">BITREFILL FEEDBACK (REQUIRED FOR AGENTIC COMMERCE)<RequiredMark /></legend>
          <p className="label-hw-dim normal-case">Goes to Bitrefill, not the public page. The most useful feedback wins $100.</p>
          <div className="space-y-1.5">
            <Label htmlFor="trk-bf-worked" className={"label-hw-dim" + invalidText(bad("trk-bf-worked"))}>WHAT WORKED WITH BITREFILL?<RequiredMark /></Label>
            <Textarea id="trk-bf-worked" rows={2} maxLength={BITREFILL_FEEDBACK_MAX} value={f.bitrefillWorked} onChange={(e) => set("bitrefillWorked", e.target.value)} aria-invalid={bad("trk-bf-worked") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-bf-worked"))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trk-bf-didnt" className={"label-hw-dim" + invalidText(bad("trk-bf-didnt"))}>WHAT DIDN'T?<RequiredMark /></Label>
            <Textarea id="trk-bf-didnt" rows={2} maxLength={BITREFILL_FEEDBACK_MAX} value={f.bitrefillDidnt} onChange={(e) => set("bitrefillDidnt", e.target.value)} aria-invalid={bad("trk-bf-didnt") || undefined} className={"font-mono text-sm" + invalidBorder(bad("trk-bf-didnt"))} />
          </div>
        </fieldset>
      )}

      <div className="space-y-1.5 border-t border-hairline-subtle pt-4">
        <Label htmlFor="trk-feedback" className="label-hw-dim">FEEDBACK FOR THE ZCASH TEAMS (OPTIONAL, NOT SCORED)</Label>
        <p className="label-hw-dim normal-case">
          What slowed you down or broke? Say which tool (for example the faucet, a wallet, an SDK, a node, the docs) and what
          happened. It goes straight to the teams who can fix it.
        </p>
        <Textarea
          id="trk-feedback"
          rows={3}
          maxLength={2000}
          placeholder="The testnet faucet was down for 3 hours; the WebZjs docs don't say how to set the memo."
          value={f.frictionNotes}
          onChange={(e) => set("frictionNotes", e.target.value)}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}
