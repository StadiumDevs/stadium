import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Bell, Loader2 } from "lucide-react";
import { useWalletAuth } from "@/lib/auth/useWalletAuth";
import { api } from "@/lib/api";
import { validateEmail } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";

export function NotificationsCard({ connectedAddress }: { connectedAddress: string }) {
  const { toast } = useToast();
  const auth = useWalletAuth();

  const [loading, setLoading] = useState(true);
  const [emailSet, setEmailSet] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getWalletContact(connectedAddress, auth.account?.chain ?? 'substrate')
      .then((data) => {
        if (!active) return;
        setEmailSet(data.email_set);
        setNotificationsEnabled(data.notifications_enabled);
        setShowForm(!data.email_set);
      })
      .catch(() => {
        if (active) setShowForm(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [connectedAddress, auth.account?.chain]);

  // Only reachable from the confirmation view, which is gated on an email
  // already being on file — so this path intentionally skips email validation.
  const handleToggle = async (checked: boolean) => {
    setNotificationsEnabled(checked);
    setSubmitting(true);
    try {
      const authHeader = await auth.signAction("update-notifications");

      const res = await api.updateWalletContact(connectedAddress, { notificationsEnabled: checked }, authHeader);
      setNotificationsEnabled(res.notifications_enabled);
    } catch (e) {
      setNotificationsEnabled(!checked);
      const err = e as Error;
      toast({
        title: "Couldn't update notifications",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSave = async () => {
    setEmailError(null);
    const result = validateEmail(emailInput);
    if (!result.valid) {
      setEmailError(result.error ?? "invalid email");
      return;
    }

    setSubmitting(true);
    try {
      const authHeader = await auth.signAction("update-notifications");

      const res = await api.updateWalletContact(
        connectedAddress,
        { email: result.normalised, notificationsEnabled },
        authHeader,
      );
      setEmailSet(res.email_set);
      setNotificationsEnabled(res.notifications_enabled);
      setShowForm(false);
      setEmailInput("");
      toast({ title: "You'll get email about this project" });
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't save notification preferences",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
          <Bell className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
          <span className="label-hw text-display">·NOTIFICATIONS</span>
        </div>
        <div className="flex items-center gap-2 label-hw-dim">
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> LOADING…
        </div>
      </div>
    );
  }

  if (!emailSet || showForm) {
    return (
      <div className="panel p-4">
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
          <Bell className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
          <span className="label-hw text-display">·NOTIFICATIONS</span>
        </div>
        <div className="space-y-4">
          <p className="text-body text-sm">
            Want an email when something changes? Drop your address.
          </p>
          <div className="space-y-1">
            <Label htmlFor="notif-email" className="label-hw-dim">EMAIL ADDRESS</Label>
            <Input
              id="notif-email"
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              aria-invalid={emailError ? true : undefined}
              disabled={submitting}
              className="font-mono text-sm"
            />
            {emailError && <p className="label-hw text-destructive">·{emailError.toUpperCase()}</p>}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-toggle" className="label-hw text-display">
              NOTIFY ME ABOUT THIS PROJECT
            </Label>
            <Switch
              id="notif-toggle"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
              disabled={submitting}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-4 py-1.5 inline-flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> SAVING…
                </>
              ) : (
                "SAVE"
              )}
            </button>
            {emailSet && (
              <button
                type="button"
                onClick={() => { setShowForm(false); setEmailInput(""); setEmailError(null); }}
                disabled={submitting}
                className="font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
              >
                CANCEL
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-hairline-subtle">
        <Bell className="h-3.5 w-3.5 text-label-mid" aria-hidden="true" />
        <span className="label-hw text-display">·NOTIFICATIONS</span>
        <span className="led led-sm ml-1" aria-hidden="true" />
        <span className="label-hw-dim">EMAIL ON FILE</span>
      </div>
      <div className="space-y-3">
        <p className="text-body text-sm">You'll get email about this project.</p>
        <div className="flex items-center justify-between">
          <Label htmlFor="notif-toggle-set" className="label-hw text-display">
            NOTIFY ME ABOUT THIS PROJECT
          </Label>
          <Switch
            id="notif-toggle-set"
            checked={notificationsEnabled}
            onCheckedChange={handleToggle}
            disabled={submitting}
          />
        </div>
        <button
          type="button"
          onClick={() => { setShowForm(true); setEmailInput(""); setEmailError(null); }}
          disabled={submitting}
          className="label-hw-dim hover:text-display disabled:opacity-50"
        >
          UPDATE EMAIL ▸
        </button>
      </div>
    </div>
  );
}
