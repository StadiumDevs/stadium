import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { SubmissionTrack } from "@/lib/api";
import type { ProgramProfile } from "@/lib/programProfiles";
import { isApp, PITCH_MAX, type TrackedFormState } from "./trackedForm";

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Extra submission fields for a tracked program (tracks, themes, txid, next milestone, friction, anonymity). */
export function TrackedSubmissionFields({
  profile,
  value: f,
  onChange,
}: {
  profile: ProgramProfile;
  value: TrackedFormState;
  onChange: (next: TrackedFormState) => void;
}) {
  const set = <K extends keyof TrackedFormState>(k: K, v: TrackedFormState[K]) => onChange({ ...f, [k]: v });
  const privacy = !!f.track && f.track !== "agentic";

  return (
    <div className="space-y-4 border-t border-hairline-subtle pt-4">
      <fieldset className="space-y-2">
        <legend className="label-hw-dim">TRACK</legend>
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
        <fieldset className="space-y-2">
          <legend className="label-hw-dim">THEMES (PRIVACY)</legend>
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
          <Label htmlFor="trk-pitch" className="label-hw-dim">ONE-LINE PITCH: WHAT IT DOES AND FOR WHOM</Label>
          <span className="label-hw-dim">{f.pitch.trim().length}/{PITCH_MAX}</span>
        </div>
        <Input id="trk-pitch" maxLength={PITCH_MAX} value={f.pitch} onChange={(e) => set("pitch", e.target.value)} className="font-mono text-sm" />
      </div>

      <fieldset className="space-y-2">
        <legend className="label-hw-dim">TEAMMATES (OPTIONAL)</legend>
        {f.team.map((m, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_100px_auto] gap-2">
            <Input aria-label={`Teammate ${i + 1} name`} placeholder="Name" value={m.name} onChange={(e) => set("team", f.team.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="font-mono text-sm" />
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

      <fieldset className="space-y-2">
        <legend className="label-hw-dim">WHAT IS IT?</legend>
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
        <Label htmlFor="trk-url" className="label-hw-dim">PUBLIC URL {isApp(f.appType) ? "" : "(APPS ONLY)"}</Label>
        <Input id="trk-url" placeholder="https://…" value={f.publicUrl} onChange={(e) => set("publicUrl", e.target.value)} className="font-mono text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trk-len" className="label-hw-dim">DEMO VIDEO LENGTH (2:00 MAX)</Label>
        <Input id="trk-len" placeholder="1:54" value={f.demoVideoLength} onChange={(e) => set("demoVideoLength", e.target.value)} className="font-mono text-sm" />
        {privacy && !isApp(f.appType) && f.appType && (
          <p className="label-hw-dim normal-case">For non-apps the video must show it working with Zcash.</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trk-tech" className="label-hw-dim">EVERY TECHNOLOGY USED (COMMA-SEPARATED)</Label>
        <Input id="trk-tech" placeholder="WebZjs, lightwalletd, Next.js" value={f.technologies} onChange={(e) => set("technologies", e.target.value)} className="font-mono text-sm" />
      </div>

      {privacy && (
        <div className="space-y-1.5">
          <Label htmlFor="trk-txid" className="label-hw-dim">TESTNET TRANSACTION ID</Label>
          <Input id="trk-txid" placeholder="One shielded (Orchard) testnet txid your project created" value={f.testnetTxid} onChange={(e) => set("testnetTxid", e.target.value)} className="font-mono text-sm" />
          <p className="label-hw-dim normal-case">
            Stadium checks it exists and is shielded. A failed check never blocks your submission; amounts and memos stay private.
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="trk-next" className="label-hw-dim">NEXT MILESTONE FOR THE 30 DAYS, AND WHO IT HELPS</Label>
        <Textarea id="trk-next" rows={2} value={f.nextStep} onChange={(e) => set("nextStep", e.target.value)} className="font-mono text-sm" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="trk-next-links" className="label-hw-dim">LINKS TO ANYTHING ALREADY STARTED (OPTIONAL)</Label>
        <Textarea
          id="trk-next-links"
          rows={2}
          placeholder="An upstream PR, an issue, a partner thread… one per line"
          value={f.nextStepLinks}
          onChange={(e) => set("nextStepLinks", e.target.value)}
          className="font-mono text-sm"
        />
      </div>

      <fieldset className="space-y-2">
        <legend className="label-hw-dim">FRICTION NOTES (OPTIONAL, NOT SCORED)</legend>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {profile.frictionAreas.map((a) => (
            <div key={a} className="flex items-center gap-2">
              <Checkbox id={`fr-${a}`} checked={f.frictionAreas.includes(a)} onCheckedChange={() => set("frictionAreas", toggle(f.frictionAreas, a))} />
              <label htmlFor={`fr-${a}`} className="text-body text-sm cursor-pointer">{a}</label>
            </div>
          ))}
        </div>
        <Textarea
          aria-label="Friction notes"
          rows={3}
          placeholder="What slowed you down? It goes to the teams who can fix it."
          value={f.frictionNotes}
          onChange={(e) => set("frictionNotes", e.target.value)}
          className="font-mono text-sm"
        />
      </fieldset>
    </div>
  );
}
