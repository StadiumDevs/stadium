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
import { Loader2 } from "lucide-react";
import { api, type ApiProgram } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const PITCH_MAX = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NonMemberApplyModal({
  open,
  onOpenChange,
  program,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  program: ApiProgram;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wallet, setWallet] = useState("");
  const [pitch, setPitch] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setWallet("");
      setPitch("");
      setCompany("");
      setError(null);
    }
  }, [open]);

  const validate = (): string | null => {
    if (!name.trim()) return "Your name is required.";
    if (!EMAIL_RE.test(email.trim())) return "A valid email is required.";
    if (!pitch.trim()) return "Tell us briefly what you're building.";
    if (pitch.trim().length > PITCH_MAX) return `Pitch must be ${PITCH_MAX} characters or fewer.`;
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.submitNonMemberApplication(program.slug, {
        name: name.trim(),
        email: email.trim(),
        walletAddress: wallet.trim() || undefined,
        pitch: pitch.trim(),
        company,
      });
      toast({ title: "Application sent", description: "We'll be in touch by email." });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Couldn't send application",
        description: (e as Error)?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (submitting ? null : onOpenChange(v))}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">
            APPLY TO {program.name.toUpperCase()}
          </DialogTitle>
          <DialogDescription className="text-body">
            Don't have a Stadium project yet? Send your details and we'll get you set up.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="nm-name" className="label-hw-dim">NAME</Label>
            <Input id="nm-name" value={name} onChange={(e) => setName(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-email" className="label-hw-dim">EMAIL</Label>
            <Input id="nm-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-wallet" className="label-hw-dim">WALLET (OPTIONAL)</Label>
            <Input id="nm-wallet" value={wallet} onChange={(e) => setWallet(e.target.value)} className="font-mono text-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nm-pitch" className="label-hw-dim">WHAT ARE YOU BUILDING?</Label>
            <Textarea
              id="nm-pitch"
              rows={5}
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              placeholder="A few sentences on your project and why you'd like to join."
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span className="label-hw text-destructive">{error ? `·${error.toUpperCase()}` : ""}</span>
              <span className={pitch.trim().length > PITCH_MAX ? "label-hw text-destructive" : "label-hw-dim"}>
                {pitch.trim().length} / {PITCH_MAX}
              </span>
            </div>
          </div>
          {/* Honeypot — hidden from users; bots fill it and get silently dropped. */}
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className="hidden"
          />
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => (submitting ? null : onOpenChange(false))}
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
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> SENDING…
              </>
            ) : (
              "SEND APPLICATION ▸"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
