import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProjectUpdate } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const BODY_MIN = 1;
const BODY_MAX = 2000;

// Mirrors server validateSimpleUrl: accepts www / http / https prefixes.
const isSimpleUrl = (v: string) =>
  !v || v.startsWith("www") || v.startsWith("http://") || v.startsWith("https://");

export function PostUpdateModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
  connectedAddress,
  onPosted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  projectId: string;
  projectTitle: string;
  connectedAddress: string;
  onPosted: (update: ApiProjectUpdate) => void;
}) {
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const reset = () => {
    setBody("");
    setLinkUrl("");
    setBodyError(null);
    setLinkError(null);
    setSubmitting(false);
  };

  const validate = (): boolean => {
    let ok = true;
    const trimmed = body.trim();
    if (trimmed.length < BODY_MIN) {
      setBodyError("Body can't be empty.");
      ok = false;
    } else if (trimmed.length > BODY_MAX) {
      setBodyError(`Body must be ${BODY_MAX} characters or fewer (currently ${trimmed.length}).`);
      ok = false;
    } else {
      setBodyError(null);
    }

    const trimmedLink = linkUrl.trim();
    if (trimmedLink && !isSimpleUrl(trimmedLink)) {
      setLinkError("Link must start with http, https, or www.");
      ok = false;
    } else {
      setLinkError(null);
    }

    return ok;
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
        statement: generateSiwsStatement({ action: "post-update", projectTitle }),
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

      const res = await api.postProjectUpdate(
        projectId,
        { body: body.trim(), linkUrl: linkUrl.trim() || null },
        authHeader,
      );
      onPosted(res.data);
      toast({ title: "Update posted" });
      reset();
      onOpenChange(false);
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't post update",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) {
          if (!v) reset();
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight">POST AN UPDATE</DialogTitle>
          <DialogDescription className="text-body">
            Share what's shipped, what's changed, or what you're asking for. Updates are visible to
            anyone viewing your project page.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="post-update-body" className="label-hw-dim">·UPDATE</Label>
            <Textarea
              id="post-update-body"
              rows={6}
              maxLength={BODY_MAX + 100 /* allow a little overflow so the error fires */}
              placeholder="What happened this week?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              aria-invalid={bodyError ? true : undefined}
              aria-describedby="post-update-body-error post-update-body-count"
              className="font-mono text-sm"
            />
            <div className="flex items-center justify-between">
              <span id="post-update-body-error" className="label-hw text-destructive">
                {bodyError ? `·${bodyError.toUpperCase()}` : ""}
              </span>
              <span
                id="post-update-body-count"
                className={
                  body.trim().length > BODY_MAX ? "label-hw text-destructive" : "label-hw-dim"
                }
              >
                {body.trim().length} / {BODY_MAX}
              </span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="post-update-link" className="label-hw-dim">·LINK (OPTIONAL)</Label>
            <Input
              id="post-update-link"
              type="url"
              placeholder="https://…"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              aria-invalid={linkError ? true : undefined}
              aria-describedby="post-update-link-error"
              className="font-mono text-sm"
            />
            {linkError && (
              <p id="post-update-link-error" className="label-hw text-destructive">
                ·{linkError.toUpperCase()}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <button
            type="button"
            onClick={() => {
              if (!submitting) {
                reset();
                onOpenChange(false);
              }
            }}
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
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> POSTING…
              </>
            ) : (
              "POST UPDATE ▸"
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
