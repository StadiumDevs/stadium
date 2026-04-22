import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
import { Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProgram } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
  const [applicationsOpenAt, setApplicationsOpenAt] = useState("");
  const [applicationsCloseAt, setApplicationsCloseAt] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
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
      setApplicationsOpenAt(isoToLocal(program.applicationsOpenAt));
      setApplicationsCloseAt(isoToLocal(program.applicationsCloseAt));
      setEventStartsAt(isoToLocal(program.eventStartsAt));
      setEventEndsAt(isoToLocal(program.eventEndsAt));
    } else {
      setName("");
      setSlug("");
      setSlugEdited(false);
      setProgramType("dogfooding");
      setStatus("draft");
      setDescription("");
      setLocation("");
      setMaxApplicants("");
      setApplicationsOpenAt("");
      setApplicationsCloseAt("");
      setEventStartsAt("");
      setEventEndsAt("");
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
        applicationsOpenAt: localToIso(applicationsOpenAt),
        applicationsCloseAt: localToIso(applicationsCloseAt),
        eventStartsAt: localToIso(eventStartsAt),
        eventEndsAt: localToIso(eventEndsAt),
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
          <DialogTitle>{editing ? "Edit program" : "Create program"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the program metadata."
              : "Set up a new program. Applications open once the status is Open."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="pf-name">Name</Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={errors.name ? true : undefined}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="pf-slug">Slug</Label>
            <Input
              id="pf-slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              aria-invalid={errors.slug ? true : undefined}
              disabled={editing}
            />
            {errors.slug && <p className="text-xs text-destructive">{errors.slug}</p>}
            {editing && (
              <p className="text-xs text-muted-foreground">
                Slug can't be changed after creation in this flow.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-type">Type</Label>
            <Select
              value={programType}
              onValueChange={(v) => setProgramType(v as ApiProgram["programType"])}
            >
              <SelectTrigger id="pf-type">
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

          <div className="space-y-1">
            <Label htmlFor="pf-status">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ApiProgram["status"])}>
              <SelectTrigger id="pf-status">
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

          <div className="sm:col-span-2 space-y-1">
            <Label htmlFor="pf-description">Description</Label>
            <Textarea
              id="pf-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-applications-open">Applications open at</Label>
            <Input
              id="pf-applications-open"
              type="datetime-local"
              value={applicationsOpenAt}
              onChange={(e) => setApplicationsOpenAt(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-applications-close">Applications close at</Label>
            <Input
              id="pf-applications-close"
              type="datetime-local"
              value={applicationsCloseAt}
              onChange={(e) => setApplicationsCloseAt(e.target.value)}
              aria-invalid={errors.applicationsCloseAt ? true : undefined}
            />
            {errors.applicationsCloseAt && (
              <p className="text-xs text-destructive">{errors.applicationsCloseAt}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-event-starts">Event starts at</Label>
            <Input
              id="pf-event-starts"
              type="datetime-local"
              value={eventStartsAt}
              onChange={(e) => setEventStartsAt(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-event-ends">Event ends at</Label>
            <Input
              id="pf-event-ends"
              type="datetime-local"
              value={eventEndsAt}
              onChange={(e) => setEventEndsAt(e.target.value)}
              aria-invalid={errors.eventEndsAt ? true : undefined}
            />
            {errors.eventEndsAt && <p className="text-xs text-destructive">{errors.eventEndsAt}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-location">Location</Label>
            <Input
              id="pf-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pf-max">Max applicants (optional)</Label>
            <Input
              id="pf-max"
              type="number"
              min={1}
              value={maxApplicants}
              onChange={(e) => setMaxApplicants(e.target.value)}
              aria-invalid={errors.maxApplicants ? true : undefined}
            />
            {errors.maxApplicants && (
              <p className="text-xs text-destructive">{errors.maxApplicants}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Saving…
              </>
            ) : editing ? (
              "Save"
            ) : (
              "Create program"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
