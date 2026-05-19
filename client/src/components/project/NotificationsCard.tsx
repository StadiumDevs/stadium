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
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" aria-hidden="true" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Loading…
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!emailSet || showForm) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5" aria-hidden="true" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Want an email when something changes? Drop your address.
          </p>
          <div className="space-y-1">
            <Label htmlFor="notif-email">Email address</Label>
            <Input
              id="notif-email"
              type="email"
              placeholder="you@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              aria-invalid={emailError ? true : undefined}
              disabled={submitting}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="notif-toggle" className="text-sm">
              Notify me about this project
            </Label>
            <Switch
              id="notif-toggle"
              checked={notificationsEnabled}
              onCheckedChange={setNotificationsEnabled}
              disabled={submitting}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={submitting} size="sm">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
            {emailSet && (
              <Button variant="ghost" size="sm" onClick={() => { setShowForm(false); setEmailInput(""); setEmailError(null); }} disabled={submitting}>
                Cancel
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Bell className="w-5 h-5" aria-hidden="true" />
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">You'll get email about this project</p>
        <div className="flex items-center justify-between">
          <Label htmlFor="notif-toggle-set" className="text-sm">
            Notify me about this project
          </Label>
          <Switch
            id="notif-toggle-set"
            checked={notificationsEnabled}
            onCheckedChange={handleToggle}
            disabled={submitting}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="px-0 text-sm"
          onClick={() => { setShowForm(true); setEmailInput(""); setEmailError(null); }}
          disabled={submitting}
        >
          Update email
        </Button>
      </CardContent>
    </Card>
  );
}
