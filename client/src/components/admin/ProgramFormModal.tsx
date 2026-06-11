import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProgram } from "@/lib/api";
import { DEFAULT_PRIZE_TIERS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

type PrizeTierRow = { amount: string; currency: string; label: string };
const tierRowsFromProgram = (program: ApiProgram | null): PrizeTierRow[] => {
  const tiers = program?.prizeTiers?.length ? program.prizeTiers : DEFAULT_PRIZE_TIERS;
  return tiers.map((t) => ({ amount: String(t.amount), currency: t.currency, label: t.label }));
};

const PROGRAM_TYPES: Array<{ value: ApiProgram["programType"]; label: string }> = [
  { value: "dogfooding", label: "Dogfooding" },
  { value: "pitch_off", label: "Pitch Off" },
  { value: "hackathon", label: "Hackathon" },
  { value: "m2_incubator", label: "M2 Incubator" },
];

const STATUSES: Array<{ value: ApiProgram["status"]; label: string }> = [
  { value: "draft", label: "Draft" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "completed", label: "Completed" },
];

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const slugify = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);

/** Convert ISO datetime → local-datetime-input value (yyyy-MM-ddThh:mm). */
const isoToLocal = (iso?: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
};
const localToIso = (v: string) => (v ? new Date(v).toISOString() : null);

export function ProgramFormModal({
  open,
  onOpenChange,
  program,
  connectedAddress,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When provided, the modal is in edit mode for this program. Otherwise create mode. */
  program: ApiProgram | null;
  connectedAddress: string;
  onSaved: (program: ApiProgram) => void;
}) {
  const editing = Boolean(program);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [programType, setProgramType] = useState<ApiProgram["programType"]>("dogfooding");
  const [status, setStatus] = useState<ApiProgram["status"]>("draft");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [maxApplicants, setMaxApplicants] = useState("");
  const [eventUrl, setEventUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [applicationsOpenAt, setApplicationsOpenAt] = useState("");
  const [applicationsCloseAt, setApplicationsCloseAt] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [prizeTierRows, setPrizeTierRows] = useState<PrizeTierRow[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;
    if (program) {
      setName(program.name);
      setSlug(program.slug);
      setSlugEdited(true);
      setProgramType(program.programType);
      setStatus(program.status);
      setDescription(program.description || "");
      setLocation(program.location || "");
      setMaxApplicants(program.maxApplicants ? String(program.maxApplicants) : "");
      setEventUrl(program.eventUrl || "");
      setCoverImageUrl(program.coverImageUrl || "");
      setApplicationsOpenAt(isoToLocal(program.applicationsOpenAt));
      setApplicationsCloseAt(isoToLocal(program.applicationsCloseAt));
      setEventStartsAt(isoToLocal(program.eventStartsAt));
      setEventEndsAt(isoToLocal(program.eventEndsAt));
      setPrizeTierRows(tierRowsFromProgram(program));
    } else {
      setName("");
      setSlug("");
      setSlugEdited(false);
      setProgramType("dogfooding");
      setStatus("draft");
      setDescription("");
      setLocation("");
      setMaxApplicants("");
      setEventUrl("");
      setCoverImageUrl("");
      setApplicationsOpenAt("");
      setApplicationsCloseAt("");
      setEventStartsAt("");
      setEventEndsAt("");
      setPrizeTierRows(tierRowsFromProgram(null));
    }
    setErrors({});
  }, [open, program]);

  useEffect(() => {
    if (!slugEdited) setSlug(slugify(name));
  }, [name, slugEdited]);

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Name is required.";
    if (name.length > 200) e.name = "Name must be 200 characters or fewer.";
    if (!SLUG_RE.test(slug) || slug.length > 100) {
      e.slug = "Slug must be lowercase letters, numbers, and hyphens.";
    }
    if (maxApplicants) {
      const n = Number(maxApplicants);
      if (!Number.isInteger(n) || n < 1) e.maxApplicants = "Must be a positive integer.";
    }
    if (eventUrl.trim() && !/^https?:\/\//i.test(eventUrl.trim())) {
      e.eventUrl = "Must start with http:// or https://";
    }
    if (coverImageUrl.trim() && !/^https?:\/\//i.test(coverImageUrl.trim())) {
      e.coverImageUrl = "Must start with http:// or https://";
    }
    if (applicationsOpenAt && applicationsCloseAt) {
      if (new Date(applicationsOpenAt).getTime() >= new Date(applicationsCloseAt).getTime()) {
        e.applicationsCloseAt = "Close date must be after open date.";
      }
    }
    if (eventStartsAt && eventEndsAt) {
      if (new Date(eventStartsAt).getTime() > new Date(eventEndsAt).getTime()) {
        e.eventEndsAt = "End date must be on or after start date.";
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      await web3Enable("Stadium");
      const accounts = await web3Accounts();
      const account = accounts.find((a) => a.address === connectedAddress) || accounts[0];
      if (!account) throw new Error("No wallet account found");

      const siws = new SiwsMessage({
        domain: window.location.hostname,
        uri: window.location.origin,
        address: account.address,
        nonce: Math.random().toString(36).slice(2),
        statement: generateSiwsStatement({
          action: editing ? "update-program" : "create-program",
        }),
      });
      const injector = await web3FromSource(account.meta.source);
      const signed = (await siws.sign(injector)) as unknown as { signature: string; message?: string };
      const messageStr =
        typeof signed.message === "string" && signed.message
          ? signed.message
          : (siws as unknown as { toString: () => string }).toString();
      const authHeader = btoa(
        JSON.stringify({ message: messageStr, signature: signed.signature, address: account.address }),
      );

      const payload: Partial<ApiProgram> & {
        name: string;
        slug: string;
        programType: ApiProgram["programType"];
        status: ApiProgram["status"];
      } = {
        name: name.trim(),
        slug: slug.trim(),
        programType,
        status,
        description: description.trim() || null,
        location: location.trim() || null,
        maxApplicants: maxApplicants ? Number(maxApplicants) : null,
        eventUrl: eventUrl.trim() || null,
        coverImageUrl: coverImageUrl.trim() || null,
        applicationsOpenAt: localToIso(applicationsOpenAt),
        applicationsCloseAt: localToIso(applicationsCloseAt),
        eventStartsAt: localToIso(eventStartsAt),
        eventEndsAt: localToIso(eventEndsAt),
        // Keep only well-formed tiers (positive integer amount + a currency).
        prizeTiers: prizeTierRows
          .map((r) => ({ amount: Number(r.amount), currency: r.currency.trim(), label: r.label.trim() }))
          .filter((t) => Number.isInteger(t.amount) && t.amount > 0 && t.currency),
      };

      const res = editing
        ? await api.updateProgram(program!.slug, payload, authHeader)
        : await api.createProgram(payload, authHeader);
      onSaved(res.data);
      toast({ title: editing ? "Program updated" : "Program created" });
      onOpenChange(false);
    } catch (e) {
      const err = e as Error & { status?: number };
      toast({
        title: editing ? "Couldn't update program" : "Couldn't create program",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            {editing ? "EDIT PROGRAM" : "CREATE PROGRAM"}
          </DialogTitle>
          <DialogDescription className="text-body">
            {editing
              ? "Update the program metadata."
              : "Set up a new program. Applications open once the status is Open."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="pf-name" className="label-hw-dim">·NAME</Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
              className="font-mono text-sm"
            />
            {errors.name && <p className="label-hw text-destructive">·{errors.name.toUpperCase()}</p>}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="pf-slug" className="label-hw-dim">·SLUG</Label>
            <Input
              id="pf-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              aria-invalid={errors.slug ? true : undefined}
              disabled={editing}
              className="font-mono text-sm"
            />
            {errors.slug && <p className="label-hw text-destructive">·{errors.slug.toUpperCase()}</p>}
            {editing && (
              <p className="label-hw-dim">SLUG CAN'T BE CHANGED AFTER CREATION IN THIS FLOW.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-type" className="label-hw-dim">·TYPE</Label>
            <Select
              value={programType}
              onValueChange={(v) => setProgramType(v as ApiProgram["programType"])}
            >
              <SelectTrigger id="pf-type" className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-status" className="label-hw-dim">·STATUS</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApiProgram["status"])}>
              <SelectTrigger id="pf-status" className="font-mono text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="pf-description" className="label-hw-dim">·DESCRIPTION</Label>
            <Textarea
              id="pf-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-applications-open" className="label-hw-dim">·APPLICATIONS OPEN AT</Label>
            <Input
              id="pf-applications-open"
              type="datetime-local"
              value={applicationsOpenAt}
              onChange={(e) => setApplicationsOpenAt(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-applications-close" className="label-hw-dim">·APPLICATIONS CLOSE AT</Label>
            <Input
              id="pf-applications-close"
              type="datetime-local"
              value={applicationsCloseAt}
              onChange={(e) => setApplicationsCloseAt(e.target.value)}
              aria-invalid={errors.applicationsCloseAt ? true : undefined}
              className="font-mono text-sm"
            />
            {errors.applicationsCloseAt && (
              <p className="label-hw text-destructive">·{errors.applicationsCloseAt.toUpperCase()}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-event-starts" className="label-hw-dim">·EVENT STARTS AT</Label>
            <Input
              id="pf-event-starts"
              type="datetime-local"
              value={eventStartsAt}
              onChange={(e) => setEventStartsAt(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-event-ends" className="label-hw-dim">·EVENT ENDS AT</Label>
            <Input
              id="pf-event-ends"
              type="datetime-local"
              value={eventEndsAt}
              onChange={(e) => setEventEndsAt(e.target.value)}
              aria-invalid={errors.eventEndsAt ? true : undefined}
              className="font-mono text-sm"
            />
            {errors.eventEndsAt && (
              <p className="label-hw text-destructive">·{errors.eventEndsAt.toUpperCase()}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-location" className="label-hw-dim">·LOCATION</Label>
            <Input
              id="pf-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="font-mono text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="pf-max" className="label-hw-dim">·MAX APPLICANTS (OPTIONAL)</Label>
            <Input
              id="pf-max"
              type="number"
              min={1}
              value={maxApplicants}
              onChange={(e) => setMaxApplicants(e.target.value)}
              aria-invalid={errors.maxApplicants ? true : undefined}
              className="font-mono text-sm"
            />
            {errors.maxApplicants && (
              <p className="label-hw text-destructive">·{errors.maxApplicants.toUpperCase()}</p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="pf-event-url" className="label-hw-dim">·EVENT URL (LUMA / SIGN-UP PAGE)</Label>
            <Input
              id="pf-event-url"
              type="url"
              placeholder="https://lu.ma/your-event"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              aria-invalid={errors.eventUrl ? true : undefined}
              className="font-mono text-sm"
            />
            {errors.eventUrl && (
              <p className="label-hw text-destructive">·{errors.eventUrl.toUpperCase()}</p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="pf-cover" className="label-hw-dim">·COVER IMAGE URL (PUBLIC PAGE BANNER)</Label>
            <Input
              id="pf-cover"
              type="url"
              placeholder="https://…/cover.png"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              aria-invalid={errors.coverImageUrl ? true : undefined}
              className="font-mono text-sm"
            />
            {errors.coverImageUrl && (
              <p className="label-hw text-destructive">·{errors.coverImageUrl.toUpperCase()}</p>
            )}
          </div>

          {programType === "hackathon" && (
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <Label className="label-hw-dim">·PRIZE TIERS (WINNER SELECTION)</Label>
                <button
                  type="button"
                  onClick={() => setPrizeTierRows((rows) => [...rows, { amount: "", currency: "EUR", label: "" }])}
                  className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep px-2 py-1 inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" aria-hidden="true" /> ADD TIER
                </button>
              </div>
              <p className="label-hw-dim">Prizes a platform admin can award to winners after judging. Default: Bitrefill EUR giftcards.</p>
              {prizeTierRows.map((row, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    placeholder="500"
                    aria-label={`Prize ${i + 1} amount`}
                    value={row.amount}
                    onChange={(e) =>
                      setPrizeTierRows((rows) => rows.map((r, j) => (j === i ? { ...r, amount: e.target.value } : r)))
                    }
                    className="font-mono text-sm w-24"
                  />
                  <Input
                    placeholder="EUR"
                    aria-label={`Prize ${i + 1} currency`}
                    value={row.currency}
                    onChange={(e) =>
                      setPrizeTierRows((rows) => rows.map((r, j) => (j === i ? { ...r, currency: e.target.value } : r)))
                    }
                    className="font-mono text-sm w-20"
                  />
                  <Input
                    placeholder="Bitrefill giftcard"
                    aria-label={`Prize ${i + 1} label`}
                    value={row.label}
                    onChange={(e) =>
                      setPrizeTierRows((rows) => rows.map((r, j) => (j === i ? { ...r, label: e.target.value } : r)))
                    }
                    className="font-mono text-sm flex-1"
                  />
                  <button
                    type="button"
                    aria-label={`Remove prize ${i + 1}`}
                    onClick={() => setPrizeTierRows((rows) => rows.filter((_, j) => j !== i))}
                    className="border border-hairline text-display hover:bg-panel-deep p-1.5"
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
          >
            CANCEL
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
          >
            {submitting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> SAVING…
              </>
            ) : editing ? (
              "SAVE"
            ) : (
              "CREATE PROGRAM ▸"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
