import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, X, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiProgramSponsor, ApiError } from "@/lib/api";

const SUGGESTED_PROFILES = ["developer", "designer", "marketer", "artist", "researcher", "founder"];

interface SponsorDraft {
  name: string;
  submissionTarget: string; // string for the <input type="number">
  targetProfiles: string[];
  applicationInstructions: string;
  followUpNotes: string;
  applyUrl: string;
}

const emptyDraft: SponsorDraft = {
  name: "",
  submissionTarget: "",
  targetProfiles: [],
  applicationInstructions: "",
  followUpNotes: "",
  applyUrl: "",
};

const draftFromSponsor = (s: ApiProgramSponsor): SponsorDraft => ({
  name: s.name,
  submissionTarget: typeof s.submissionTarget === "number" ? String(s.submissionTarget) : "",
  targetProfiles: s.targetProfiles,
  applicationInstructions: s.applicationInstructions || "",
  followUpNotes: s.followUpNotes || "",
  applyUrl: s.applyUrl || "",
});

const payloadFromDraft = (d: SponsorDraft) => ({
  name: d.name.trim(),
  submissionTarget: d.submissionTarget.trim() ? Number(d.submissionTarget) : null,
  targetProfiles: d.targetProfiles,
  applicationInstructions: d.applicationInstructions.trim() || null,
  followUpNotes: d.followUpNotes.trim() || null,
  applyUrl: d.applyUrl.trim() || null,
});

function ProfileChips({
  value, onChange, disabled,
}: { value: string[]; onChange: (next: string[]) => void; disabled?: boolean }) {
  const toggle = (p: string) => {
    onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  };
  return (
    <div className="flex flex-wrap gap-1.5">
      {SUGGESTED_PROFILES.map((p) => {
        const on = value.includes(p);
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            disabled={disabled}
            className={
              on
                ? "font-mono text-[10px] tracking-[0.12em] uppercase border border-display bg-display text-shell px-2 py-[2px]"
                : "font-mono text-[10px] tracking-[0.12em] uppercase border border-hairline text-label-mid hover:text-display hover:bg-panel-deep px-2 py-[2px]"
            }
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}

function SponsorForm({
  draft, setDraft, busy,
}: { draft: SponsorDraft; setDraft: (d: SponsorDraft) => void; busy: boolean }) {
  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="label-hw-dim">·SPONSOR NAME *</Label>
          <Input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Bitrefill"
            disabled={busy}
            className="font-mono text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="label-hw-dim">·SUBMISSION TARGET (#)</Label>
          <Input
            type="number"
            min={0}
            value={draft.submissionTarget}
            onChange={(e) => setDraft({ ...draft, submissionTarget: e.target.value })}
            placeholder="10"
            disabled={busy}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="label-hw-dim">·TARGET BUILDER PROFILES</Label>
        <ProfileChips
          value={draft.targetProfiles}
          onChange={(next) => setDraft({ ...draft, targetProfiles: next })}
          disabled={busy}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="label-hw-dim">·HOW TO APPLY (INSTRUCTIONS)</Label>
        <Textarea
          rows={3}
          value={draft.applicationInstructions}
          onChange={(e) => setDraft({ ...draft, applicationInstructions: e.target.value })}
          placeholder="Send a 1-paragraph pitch to apply@example.com with your wallet address and a repo link."
          disabled={busy}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="label-hw-dim">·APPLY URL (OPTIONAL)</Label>
        <Input
          type="url"
          value={draft.applyUrl}
          onChange={(e) => setDraft({ ...draft, applyUrl: e.target.value })}
          placeholder="https://sponsor.com/apply"
          disabled={busy}
          className="font-mono text-sm"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="label-hw-dim">·POST-EVENT FOLLOW-UPS</Label>
        <Textarea
          rows={2}
          value={draft.followUpNotes}
          onChange={(e) => setDraft({ ...draft, followUpNotes: e.target.value })}
          placeholder="Send 1-week recap email; confirm winning team has KYC docs ready."
          disabled={busy}
          className="font-mono text-sm"
        />
      </div>
    </div>
  );
}

export function ProgramSponsorsSection({
  programSlug,
  signAuthHeader,
}: {
  programSlug: string;
  signAuthHeader: () => Promise<string>;
}) {
  const { toast } = useToast();
  const [sponsors, setSponsors] = useState<ApiProgramSponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SponsorDraft>>({});
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<SponsorDraft>(emptyDraft);
  const [createBusy, setCreateBusy] = useState(false);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    api
      .listProgramSponsors(programSlug)
      .then((r) => {
        if (!active) return;
        setSponsors(r.data);
        const next: Record<string, SponsorDraft> = {};
        for (const s of r.data) next[s.id] = draftFromSponsor(s);
        setDrafts(next);
      })
      .catch((e: unknown) => {
        if (!active) return;
        toast({
          title: "Couldn't load sponsors",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [programSlug, toast]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const handleSave = async (id: string) => {
    const draft = drafts[id];
    if (!draft || !draft.name.trim()) {
      toast({ title: "Sponsor name is required", variant: "destructive" });
      return;
    }
    setBusyId(id);
    try {
      const authHeader = await signAuthHeader();
      const res = await api.updateProgramSponsor(programSlug, id, payloadFromDraft(draft), authHeader);
      setSponsors((prev) => prev.map((s) => (s.id === id ? res.data : s)));
      toast({ title: "Sponsor updated" });
    } catch (e) {
      toast({
        title: "Couldn't update sponsor",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this sponsor? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const authHeader = await signAuthHeader();
      await api.deleteProgramSponsor(programSlug, id, authHeader);
      setSponsors((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Sponsor removed" });
    } catch (e) {
      toast({
        title: "Couldn't remove sponsor",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleCreate = async () => {
    if (!createDraft.name.trim()) {
      toast({ title: "Sponsor name is required", variant: "destructive" });
      return;
    }
    setCreateBusy(true);
    try {
      const authHeader = await signAuthHeader();
      const res = await api.createProgramSponsor(programSlug, payloadFromDraft(createDraft), authHeader);
      setSponsors((prev) => [...prev, res.data]);
      setDrafts((prev) => ({ ...prev, [res.data.id]: draftFromSponsor(res.data) }));
      setCreateDraft(emptyDraft);
      setCreating(false);
      toast({ title: "Sponsor added" });
    } catch (e) {
      toast({
        title: "Couldn't add sponsor",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCreateBusy(false);
    }
  };

  return (
    <div className="panel p-4 mb-3">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline-subtle">
        <span className="label-hw text-display">·SPONSORS &amp; GOALS</span>
        {!creating && (
          <button
            type="button"
            onClick={() => { setCreating(true); setCreateDraft(emptyDraft); }}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim px-3 py-1.5"
          >
            <Plus className="h-3 w-3" />
            ADD SPONSOR
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-4">
          <Loader2 className="h-3 w-3 animate-spin" /> LOADING SPONSORS…
        </div>
      ) : (
        <div className="space-y-3">
          {creating && (
            <div className="lcd p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="label-hw text-display">·NEW SPONSOR</span>
                <button
                  type="button"
                  onClick={() => { setCreating(false); setCreateDraft(emptyDraft); }}
                  className="text-label-mid hover:text-display"
                  aria-label="Cancel new sponsor"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <SponsorForm draft={createDraft} setDraft={setCreateDraft} busy={createBusy} />
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => { setCreating(false); setCreateDraft(emptyDraft); }}
                  disabled={createBusy}
                  className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={createBusy}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
                >
                  {createBusy ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" /> SAVING…
                    </>
                  ) : (
                    "SAVE SPONSOR ▸"
                  )}
                </button>
              </div>
            </div>
          )}

          {sponsors.length === 0 && !creating ? (
            <p className="text-body text-sm">
              No sponsors yet. Add one to track goals and the post-event follow-ups for this program.
            </p>
          ) : (
            sponsors.map((s) => {
              const draft = drafts[s.id];
              const busy = busyId === s.id;
              if (!draft) return null;
              return (
                <div key={s.id} className="lcd p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="label-hw text-display">·{s.name.toUpperCase()}</span>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] border border-hairline text-label-mid hover:text-destructive hover:border-destructive hover:bg-panel-deep disabled:opacity-50 px-2.5 py-1"
                      aria-label="Remove sponsor"
                    >
                      <Trash2 className="h-3 w-3" />
                      REMOVE
                    </button>
                  </div>
                  <SponsorForm
                    draft={draft}
                    setDraft={(d) => setDrafts((prev) => ({ ...prev, [s.id]: d }))}
                    busy={busy}
                  />
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleSave(s.id)}
                      disabled={busy}
                      className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5"
                    >
                      {busy ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" /> SAVING…
                        </>
                      ) : (
                        "SAVE CHANGES"
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
