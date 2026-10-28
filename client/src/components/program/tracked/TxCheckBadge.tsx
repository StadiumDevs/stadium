import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ApiTxCheck } from "@/lib/api";
import { TX_CHECK_TOOLTIP } from "@/lib/txCheck";
import { cn } from "@/lib/utils";

const LABEL: Record<ApiTxCheck["status"] | "pending", string> = {
  verified: "VERIFIED ON TESTNET",
  not_found: "NOT FOUND / NOT SHIELDED",
  not_shielded: "NOT FOUND / NOT SHIELDED",
  could_not_check: "COULD NOT CHECK",
  pending: "CHECKING…",
};

const DETAIL: Record<ApiTxCheck["status"] | "pending", string> = {
  verified: "The transaction exists on testnet and has Orchard actions.",
  not_found: "No transaction with this id was found on testnet.",
  not_shielded: "The transaction exists but has no Orchard actions.",
  could_not_check: "Testnet servers didn't answer after several tries. This is not a failure; an admin can re-check.",
  pending: "The check runs after submission and never blocks it.",
};

/**
 * Testnet transaction check result. Information for judges, never a rejection.
 */
export function TxCheckBadge({ check, className }: { check: ApiTxCheck | null; className?: string }) {
  const status = check?.status ?? "pending";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          data-tx-status={status}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-[2px] font-mono text-[9px] font-bold tracking-[0.12em] border whitespace-nowrap",
            status === "verified" && "bg-display text-shell border-display",
            (status === "not_found" || status === "not_shielded") && "border-destructive text-destructive",
            (status === "could_not_check" || status === "pending") && "border-hairline text-label-mid",
            className,
          )}
        >
          <span className={cn("led led-sm", status === "verified" ? "" : "opacity-40")} aria-hidden="true" />
          {LABEL[status]}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">
        <p className="mb-1">{DETAIL[status]}</p>
        <p className="text-muted-foreground">{TX_CHECK_TOOLTIP}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** The txid itself, linked to a public testnet explorer when the program has one. */
export function TxidLink({ txid, explorerUrl }: { txid: string; explorerUrl?: (txid: string) => string }) {
  if (!explorerUrl) return <span className="font-mono text-[11px] text-label-mid break-all">{txid}</span>;
  return (
    <a
      href={explorerUrl(txid)}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="txid-link"
      className="font-mono text-[11px] text-label-mid hover:text-display underline underline-offset-2 break-all"
    >
      {txid} <span className="text-display no-underline whitespace-nowrap">▸ EXPLORER</span>
    </a>
  );
}
