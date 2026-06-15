import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Trash2, Plus, Check, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api, type ApiProgram, type ApiProgramSignup, type AdminAuthArg, ApiError } from "@/lib/api";

interface Props {
  program: ApiProgram;
  signAuthHeader: () => Promise<AdminAuthArg>;
  /** Reflect saved event id / sync state back into the parent program state. */
  onProgramChange?: (patch: Partial<ApiProgram>) => void;
}

const relativeTime = (iso?: string | null) => {
  if (!iso) return "NEVER";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "JUST NOW";
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "JUST NOW";
  if (mins < 60) return `${mins} MIN AGO`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} HR AGO`;
  return `${Math.floor(hrs / 24)} DAY AGO`;
};

const errMessage = (e: unknown) =>
  e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error";

// Admin guest panel for Luma-gated programs. Replaces the CSV uploader: the
// checked-in list is pulled from the Luma API on demand, with a manual single
// email add as the event-day fallback.
export function LumaGuestsSection({ program, signAuthHeader, onProgramChange }: Props) {
  const { toast } = useToast();
  const slug = program.slug;

  const [eventId, setEventId] = useState(program.lumaEventId ?? "");
  const [savingEventId, setSavingEventId] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [lumaCount, setLumaCount] = useState<number | null>(null);
  const [manual, setManual] = useState<ApiProgramSignup[]>([]);
  const [loading, setLoading] = useState(true);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const auth = await signAuthHeader();
        const r = await api.listProgramSignups(slug, auth);
        if (!active) return;
        setLumaCount(r.data.filter((s) => s.source === "luma_api").length);
        setManual(r.data.filter((s) => s.source === "manual"));
      } catch (e) {
        if (active) toast({ title: "Couldn't load guests", description: errMessage(e), variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [slug, signAuthHeader, toast]);

  useEffect(() => load(), [load]);

  const hasEventId = Boolean(program.lumaEventId);
  const eventIdDirty = eventId.trim() !== (program.lumaEventId ?? "");

  const status = program.lastGuestSyncStatus;
  const statusBad = typeof status === "string" && (status.startsWith("error") || status === "truncated" || status === "empty_guard");

  const saveEventId = async () => {
    setSavingEventId(true);
    try {
      const auth = await signAuthHeader();
      const r = await api.updateProgram(slug, { lumaEventId: eventId.trim() || null }, auth);
      onProgramChange?.({ lumaEventId: r.data.lumaEventId ?? null });
      toast({ title: "Luma event id saved" });
    } catch (e) {
      toast({ title: "Couldn't save event id", description: errMessage(e), variant: "destructive" });
    } finally {
      setSavingEventId(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    try {
      const auth = await signAuthHeader();
      const r = await api.syncProgramGuests(slug, auth);
      setLumaCount(r.data.checkedInCount);
      onProgramChange?.({ lastGuestSyncAt: r.data.syncedAt, lastGuestSyncStatus: r.data.syncStatus });
      if (r.data.syncStatus === "ok") {
        toast({ title: `Synced ${r.data.checkedInCount} checked-in guests` });
      } else {
        toast({
          title: "Sync returned a warning",
          description: `Status: ${r.data.syncStatus}. Last good list kept.`,
          variant: "destructive",
        });
      }
    } catch (e) {
      toast({ title: "Sync failed", description: errMessage(e), variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const addManual = async () => {
    const email = newEmail.trim();
    if (!email) return;
    setAdding(true);
    try {
      const auth = await signAuthHeader();
      const r = await api.addProgramSignup(slug, { email, name: newName.trim() || null }, auth);
      setManual((prev) => [r.data, ...prev.filter((m) => m.id !== r.data.id)]);
      setNewEmail("");
      setNewName("");
      toast({ title: `Added ${r.data.email}` });
    } catch (e) {
      toast({ title: "Couldn't add email", description: errMessage(e), variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const removeManual = async (id: string) => {
    setBusyId(id);
    try {
      const auth = await signAuthHeader();
      await api.deleteProgramSignup(slug, id, auth);
      setManual((prev) => prev.filter((m) => m.id !== id));
      toast({ title: "Removed" });
    } catch (e) {
      toast({ title: "Couldn't remove", description: errMessage(e), variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const countLabel = useMemo(() => (lumaCount === null ? "…" : String(lumaCount)), [lumaCount]);

  return (
    <div className="panel p-4 mb-3">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline-subtle">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="label-hw text-display">·LUMA-APPROVED GUESTS</span>
          <span className="lcd px-2 py-[1px] font-mono text-[10px] text-display tabular-nums" title="Checked-in guests synced from Luma">
            {countLabel} CHECKED-IN
          </span>
          <span className={statusBad ? "label-hw text-amber-500" : "label-hw-dim"}>
            ·SYNCED {relativeTime(program.lastGuestSyncAt)}
            {statusBad ? ` (${status})` : ""}
          </span>
        </div>
        <span className="label-hw-dim">LUMA API</span>
      </div>

      {/* Luma event id */}
      <div className="lcd p-3 mb-3 space-y-2">
        <label htmlFor="luma-event-id" className="label-hw-dim block">
          ·LUMA EVENT ID
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <input
            id="luma-event-id"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="evt-XXXXXXXXXXXX"
            className="flex-1 min-w-[220px] bg-panel-deep border border-hairline px-2 py-1.5 font-mono text-[12px] text-display placeholder:text-label-dim"
          />
          <button
            type="button"
            onClick={saveEventId}
            disabled={!eventIdDirty || savingEventId}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:bg-panel-deep disabled:text-label-dim disabled:border-hairline px-3 py-1.5"
          >
            {savingEventId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            SAVE
          </button>
          <button
            type="button"
            onClick={syncNow}
            disabled={!hasEventId || syncing}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            SYNC NOW
          </button>
        </div>
        <p className="label-hw-dim">
          THE CHECKED-IN GUEST LIST IS PULLED FROM LUMA. SUBMISSIONS ALSO TRIGGER A SYNC AUTOMATICALLY.
          {!hasEventId ? " SET AN EVENT ID TO ACTIVATE THE GATE." : ""}
        </p>
      </div>

      {/* Manual fallback add */}
      <div className="lcd p-3 mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-3 w-3 text-label-mid" />
          <span className="label-hw-dim">·MANUAL ADD (FALLBACK)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            type="email"
            placeholder="email@checked-in.com"
            className="flex-1 min-w-[200px] bg-panel-deep border border-hairline px-2 py-1.5 font-mono text-[12px] text-display placeholder:text-label-dim"
          />
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="name (optional)"
            className="w-[160px] bg-panel-deep border border-hairline px-2 py-1.5 font-mono text-[12px] text-display placeholder:text-label-dim"
          />
          <button
            type="button"
            onClick={addManual}
            disabled={!newEmail.trim() || adding}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            {adding ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
            ADD
          </button>
        </div>
        <p className="label-hw-dim">
          USE FOR ATTENDEES LUMA CAN'T COVER (CHECKED IN ON ANOTHER DEVICE, REGISTERED WITH A DIFFERENT EMAIL).
        </p>
      </div>

      {/* Manual entries list (Luma-synced rows are not listed to minimize stored PII on screen) */}
      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-2">
          <Loader2 className="h-3 w-3 animate-spin" /> LOADING…
        </div>
      ) : manual.length === 0 ? (
        <p className="label-hw-dim">·NO MANUAL ENTRIES.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="label-hw-dim">·MANUAL ENTRIES ({manual.length})</div>
          {manual.map((m) => (
            <div key={m.id} className="lcd px-3 py-2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[12px] text-display truncate">{m.email}</div>
                {m.name ? <div className="label-hw-dim truncate">{m.name}</div> : null}
              </div>
              <button
                type="button"
                onClick={() => removeManual(m.id)}
                disabled={busyId === m.id}
                aria-label="Remove manual entry"
                className="inline-flex items-center justify-center border border-hairline text-label-mid hover:text-destructive hover:border-destructive hover:bg-panel-deep disabled:opacity-50 w-7 h-7 flex-shrink-0"
              >
                {busyId === m.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
