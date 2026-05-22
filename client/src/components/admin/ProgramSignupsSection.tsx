import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Upload, Loader2, Trash2, FileText, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  api,
  type ApiProgramSignup,
  type ProgramSignupImportSummary,
  ApiError,
} from "@/lib/api";

const formatDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
};

const truncateAddress = (addr?: string | null) => {
  if (!addr) return "—";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

interface Props {
  programSlug: string;
  signAuthHeader: () => Promise<import("@/lib/api").AdminAuthArg>;
}

export function ProgramSignupsSection({ programSlug, signAuthHeader }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [signups, setSignups] = useState<ApiProgramSignup[]>([]);
  const [lastImportedAt, setLastImportedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [csvText, setCsvText] = useState<string | null>(null);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ProgramSignupImportSummary | null>(null);

  const load = useCallback(() => {
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const authHeader = await signAuthHeader();
        const r = await api.listProgramSignups(programSlug, authHeader);
        if (active) {
          setSignups(r.data);
          setLastImportedAt(r.meta?.lastImportedAt ?? null);
        }
      } catch (e) {
        if (active) {
          toast({
            title: "Couldn't load signups",
            description: e instanceof Error ? e.message : "Unknown error",
            variant: "destructive",
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [programSlug, signAuthHeader, toast]);

  useEffect(() => {
    const cleanup = load();
    return cleanup;
  }, [load]);

  const onFile = (file: File | null) => {
    setPreview(null);
    if (!file) {
      setCsvText(null);
      setCsvFileName(null);
      return;
    }
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => {
      toast({ title: "Couldn't read file", variant: "destructive" });
      setCsvText(null);
    };
    reader.readAsText(file);
  };

  const clearFile = () => {
    setCsvText(null);
    setCsvFileName(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePreview = async () => {
    if (!csvText) return;
    setPlanning(true);
    try {
      const authHeader = await signAuthHeader();
      const r = await api.importProgramSignups(programSlug, csvText, { dryRun: true }, authHeader);
      setPreview(r.data);
    } catch (e) {
      toast({
        title: "Couldn't preview import",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setPlanning(false);
    }
  };

  const handleCommit = async () => {
    if (!csvText) return;
    setCommitting(true);
    try {
      const authHeader = await signAuthHeader();
      const r = await api.importProgramSignups(programSlug, csvText, { dryRun: false }, authHeader);
      toast({ title: `Imported ${r.data.inserted.length} new signups` });
      setSignups((prev) => [...r.data.inserted, ...prev]);
      clearFile();
    } catch (e) {
      toast({
        title: "Couldn't import signups",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCommitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this signup? This cannot be undone.")) return;
    setBusyId(id);
    try {
      const authHeader = await signAuthHeader();
      await api.deleteProgramSignup(programSlug, id, authHeader);
      setSignups((prev) => prev.filter((s) => s.id !== id));
      toast({ title: "Signup removed" });
    } catch (e) {
      toast({
        title: "Couldn't remove signup",
        description: e instanceof ApiError ? e.message : (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setBusyId(null);
    }
  };

  const signupCount = useMemo(() => signups.length, [signups]);

  // Staleness: render "X days ago" off lastImportedAt; nudge yellow once it
  // crosses STALE_DAYS so the admin knows to pull a fresh CSV from Luma.
  const STALE_DAYS = 7;
  const daysSinceImport = useMemo(() => {
    if (!lastImportedAt) return null;
    const ms = Date.now() - new Date(lastImportedAt).getTime();
    if (!Number.isFinite(ms) || ms < 0) return null;
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }, [lastImportedAt]);
  const isStale = daysSinceImport !== null && daysSinceImport >= STALE_DAYS;
  const lastImportedLabel = (() => {
    if (!lastImportedAt) return "NEVER IMPORTED";
    if (daysSinceImport === 0) return "LAST IMPORTED TODAY";
    if (daysSinceImport === 1) return "LAST IMPORTED 1 DAY AGO";
    return `LAST IMPORTED ${daysSinceImport} DAYS AGO`;
  })();

  return (
    <div className="panel p-4 mb-3">
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-hairline-subtle">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="label-hw text-display">·SIGNUPS</span>
          <span className="lcd px-2 py-[1px] font-mono text-[10px] text-display tabular-nums">
            {signupCount}
          </span>
          <span className={isStale ? "label-hw text-amber-500" : "label-hw-dim"}>
            ·{lastImportedLabel}
          </span>
        </div>
        <span className="label-hw-dim">LUMA CSV IMPORT</span>
      </div>

      {isStale && (
        <div className="lcd p-3 mb-3 border border-amber-500/40">
          <p className="label-hw text-amber-500">
            ·LUMA MAY HAVE NEW SIGNUPS. PULL A FRESH CSV AND RE-IMPORT.
          </p>
        </div>
      )}

      {/* CSV picker + preview / commit */}
      <div className="lcd p-3 space-y-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => onFile(e.target.files?.[0] || null)}
            disabled={planning || committing}
            className="hidden"
            id="signups-csv-input"
          />
          <label
            htmlFor="signups-csv-input"
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-3 py-1.5 cursor-pointer"
          >
            <FileText className="h-3 w-3" />
            CHOOSE CSV
          </label>
          {csvFileName && (
            <span className="label-hw-dim inline-flex items-center gap-1 max-w-[40ch] truncate">
              ·{csvFileName.toUpperCase()}
              <button
                type="button"
                onClick={clearFile}
                aria-label="Clear file"
                className="text-label-mid hover:text-display ml-1"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handlePreview}
            disabled={!csvText || planning || committing}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            {planning ? (<><Loader2 className="h-3 w-3 animate-spin" /> PREVIEWING…</>) : "PREVIEW"}
          </button>
          <button
            type="button"
            onClick={handleCommit}
            disabled={!csvText || !preview || preview.newCount === 0 || committing}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:bg-panel-deep disabled:text-label-dim disabled:border-hairline disabled:cursor-not-allowed px-4 py-1.5"
          >
            {committing ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" /> IMPORTING…
              </>
            ) : (
              <>
                <Upload className="h-3 w-3" />
                IMPORT {preview && preview.newCount > 0 ? `(${preview.newCount})` : ""} ▸
              </>
            )}
          </button>
        </div>
        {!csvText && (
          <p className="label-hw-dim">
            IMPORT A LUMA OR TYPEFORM/TALLY CSV. RECOGNIZED: NAME, EMAIL OR TELEGRAM, WALLET, REGISTERED-AT.
            EVERY OTHER COLUMN IS KEPT AND SHOWN UNDER ·DETAILS (ADMIN-ONLY); THE PUBLIC PAGE SHOWS ONLY
            PROJECT DETAILS + CONTRIBUTOR NAMES.
          </p>
        )}
        {preview && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div>
              <div className="label-hw-dim">PARSED</div>
              <div className="font-mono text-[14px] text-display tabular-nums">{preview.totalParsed}</div>
            </div>
            <div>
              <div className="label-hw-dim">NEW</div>
              <div className="font-mono text-[14px] text-led tabular-nums">{preview.newCount}</div>
            </div>
            <div>
              <div className="label-hw-dim">DUPLICATES</div>
              <div className="font-mono text-[14px] text-label-mid tabular-nums">{preview.duplicates}</div>
            </div>
            <div>
              <div className="label-hw-dim">SKIPPED (NO EMAIL)</div>
              <div className="font-mono text-[14px] text-label-mid tabular-nums">{preview.skippedNoEmail}</div>
            </div>
          </div>
        )}
        {preview && preview.newPreview.length > 0 && (
          <div className="pt-2">
            <div className="label-hw-dim mb-1">·SAMPLE (FIRST 5 NEW)</div>
            <ul className="font-mono text-[11px] space-y-0.5">
              {preview.newPreview.map((r, i) => (
                <li key={i} className="text-body">
                  {r.email}{r.name ? ` · ${r.name}` : ""}{r.wallet ? ` · ${truncateAddress(r.wallet)}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Existing list */}
      {loading ? (
        <div className="flex items-center gap-2 label-hw-dim py-4">
          <Loader2 className="h-3 w-3 animate-spin" /> LOADING SIGNUPS…
        </div>
      ) : signups.length === 0 ? (
        <p className="text-body text-sm">No signups yet. Import a Luma CSV above to populate.</p>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between label-hw-dim">
            <span>·NAME · CONTACT · WALLET</span>
            <span>REGISTERED</span>
          </div>
          {signups.map((s) => {
            // The public page shows only project details + contributor names.
            // Everything else from the submission (Telegram contact, prompt,
            // dates, etc.) is admin-only and lives in raw_row — surfaced here.
            const rawEntries = s.rawRow
              ? Object.entries(s.rawRow).filter(([, v]) => v != null && String(v).trim() !== "")
              : [];
            const isSurrogate = /@telegram\.imported$/i.test(s.email);
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className="lcd px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(expanded ? null : s.id)}
                    aria-expanded={expanded}
                    className="min-w-0 flex-1 text-left group"
                  >
                    <div className="font-mono text-[12px] text-display truncate">
                      {(s.name || "—").toUpperCase()}
                    </div>
                    <div className="label-hw-dim truncate">
                      {isSurrogate ? "TELEGRAM IMPORT" : s.email}
                      {s.wallet ? ` · ${truncateAddress(s.wallet)}` : ""}
                      {rawEntries.length > 0 ? ` · ${expanded ? "HIDE" : "DETAILS ▾"}` : ""}
                    </div>
                  </button>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono text-[10px] text-label-mid tabular-nums">
                      {formatDate(s.registeredAt).toUpperCase()}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(s.id)}
                      disabled={busyId === s.id}
                      aria-label="Remove signup"
                      className="inline-flex items-center justify-center border border-hairline text-label-mid hover:text-destructive hover:border-destructive hover:bg-panel-deep disabled:opacity-50 w-7 h-7"
                    >
                      {busyId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {expanded && rawEntries.length > 0 && (
                  <dl className="mt-2 pt-2 border-t border-hairline-subtle space-y-1.5">
                    {rawEntries.map(([k, v]) => (
                      <div key={k} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-x-3">
                        <dt className="label-hw-dim sm:text-right break-words">{k}</dt>
                        <dd className="text-body text-[12px] whitespace-pre-line break-words">
                          {String(v)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
