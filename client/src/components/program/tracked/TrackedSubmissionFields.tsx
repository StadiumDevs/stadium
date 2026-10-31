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

/**
 * Extra submission fields for a tracked program (tracks, themes, txid, next milestone, feedback, anonymity).
 * `invalid` holds the ids of fields to mark red (see validateTrackedForm).
 */
export function TrackedSubmissionFields({
  profile,
  value: f,
  onChange,
  invalid = new Set<string>(),
}: {
  profile: ProgramProfile;
  value: TrackedFormState;
  onChange: (next: TrackedFormState) => void;
  invalid?: Set<string>;
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

      {privacy && (
        <fieldset id="trk-themes" tabIndex={-1} className="space-y-2" aria-invalid={bad("trk-themes") || undefined}>
          <legend className={"label-hw-dim" + invalidText(bad("trk-themes"))}>THEMES (PRIVACY)<RequiredMark /></legend>
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
        {f.team.map((m, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-2">
            <Input id={`trk-team-${i}-name`} aria-label={`Teammate ${i + 1} name`} aria-invalid={bad(`trk-team-${i}-name`) || undefined} placeholder="Name" value={m.name} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className={"font-mono text-sm" + invalidBorder(bad(`trk-team-${i}-name`))} />
            <Input aria-label={`Teammate ${i + 1} email`} placeholder="Email" type="email" value={m.email} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, email: e.target.value } : x)))} className="font-mono text-sm" />
            <Input aria-label={`Teammate ${i + 1} role`} placeholder="Role" value={m.role} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, role: e.target.value } : x)))} className="font-mono text-sm" />
            <button type="button" onClick={() => set("team", f.team.filter((_, j) => j !== i))} className="font-mono text-[10px] tracking-[0.12em] text-label-mid hover:text-display px-2">
              REMOVE
            </button>
          </div>
        ))}
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
          <Label htmlFor="trk-txid" className={"label-hw-dim" + invalidText(bad("trk-txid"))}>TESTNET TRANSACTION ID<RequiredMark show={needsTxid(profile, f.track)} /></Label>
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
