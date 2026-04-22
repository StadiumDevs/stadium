import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProgramApplication } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const statusVariant = (status: ApiProgramApplication["status"]) => {
  switch (status) {
    case "accepted":
      return "default" as const;
    case "rejected":
    case "withdrawn":
      return "outline" as const;
    default:
      return "secondary" as const;
  }
};

const truncateAddress = (addr?: string | null) => {
  if (!addr) return "—";
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
};

export function ApplicationCard({
  application,
  programSlug,
  connectedAddress,
  onUpdated,
}: {
  application: ApiProgramApplication;
  programSlug: string;
  connectedAddress: string;
  onUpdated: (next: ApiProgramApplication) => void;
}) {
  const [working, setWorking] = useState<"accept" | "reject" | null>(null);
  const { toast } = useToast();

  const doUpdate = async (next: ApiProgramApplication["status"]) => {
    setWorking(next === "accepted" ? "accept" : "reject");
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
        statement: generateSiwsStatement({ action: "review-application" }),
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

      const res = await api.updateApplicationStatus(
        programSlug,
        application.id,
        { status: next },
        authHeader,
      );
      onUpdated(res.data);
      toast({ title: `Application ${next}` });
    } catch (e) {
      const err = e as Error;
      toast({
        title: "Couldn't update application",
        description: err?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setWorking(null);
    }
  };

  const focus =
    typeof application.applicationFields?.feedback_focus === "string"
      ? (application.applicationFields.feedback_focus as string)
      : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/m2-program/${application.projectId}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            {application.projectId}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
          <p className="mt-1 text-xs text-muted-foreground">
            Submitted by {truncateAddress(application.submittedBy)} ·{" "}
            {new Date(application.submittedAt).toLocaleDateString()}
          </p>
        </div>
        <Badge variant={statusVariant(application.status)}>{application.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {focus && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Feedback focus
            </p>
            <p className="mt-1 whitespace-pre-line text-sm">{focus}</p>
          </div>
        )}
        {application.reviewNotes && (
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Review notes
            </p>
            <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
              {application.reviewNotes}
            </p>
          </div>
        )}
        {application.status === "submitted" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              size="sm"
              onClick={() => doUpdate("accepted")}
              disabled={working !== null}
              className="gap-2"
            >
              {working === "accept" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => doUpdate("rejected")}
              disabled={working !== null}
              className="gap-2"
            >
              {working === "reject" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              Reject
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
