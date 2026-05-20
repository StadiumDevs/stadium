import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { web3Enable, web3Accounts, web3FromSource } from "@polkadot/extension-dapp";
import { SiwsMessage } from "@talismn/siws";
import { generateSiwsStatement } from "@/lib/siwsUtils";
import { api, type ApiProgramApplication } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

const statusBadge = (status: ApiProgramApplication["status"]) => {
  const base =
    "inline-flex items-center px-2 py-[1px] font-mono text-[10px] tracking-[0.12em] uppercase";
  switch (status) {
    case "accepted":
      return `${base} border border-display bg-display text-shell`;
    case "rejected":
    case "withdrawn":
      return `${base} border border-hairline text-label-mid`;
    default:
      return `${base} border border-hairline text-display bg-panel-deep`;
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
    <div className="panel p-4">
      <div className="flex flex-row items-start justify-between gap-3 pb-3 border-b border-hairline-subtle">
        <div className="min-w-0">
          <Link
            to={`/m2-program/${application.projectId}`}
            className="inline-flex items-center gap-1 font-mono text-sm text-display hover:underline break-all"
          >
            {application.projectId}
            <ExternalLink className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
          </Link>
          <p className="mt-1 label-hw-dim">
            SUBMITTED BY {truncateAddress(application.submittedBy).toUpperCase()} ·{" "}
            {new Date(application.submittedAt).toLocaleDateString().toUpperCase()}
          </p>
        </div>
        <span className={statusBadge(application.status)}>{application.status}</span>
      </div>
      <div className="space-y-3 pt-3">
        {focus && (
          <div>
            <p className="label-hw-dim">·FEEDBACK FOCUS</p>
            <p className="mt-1 whitespace-pre-line text-sm text-body">{focus}</p>
          </div>
        )}
        {application.reviewNotes && (
          <div>
            <p className="label-hw-dim">·REVIEW NOTES</p>
            <p className="mt-1 whitespace-pre-line text-sm text-body">
              {application.reviewNotes}
            </p>
          </div>
        )}
        {application.status === "submitted" && (
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => doUpdate("accepted")}
              disabled={working !== null}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-display bg-display text-shell hover:bg-display-dim disabled:opacity-50 px-3 py-1.5"
            >
              {working === "accept" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
              )}
              ACCEPT
            </button>
            <button
              type="button"
              onClick={() => doUpdate("rejected")}
              disabled={working !== null}
              className="inline-flex items-center gap-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline text-display hover:bg-panel-deep disabled:opacity-50 px-3 py-1.5"
            >
              {working === "reject" ? (
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
              ) : (
                <XCircle className="h-3 w-3" aria-hidden="true" />
              )}
              REJECT
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
