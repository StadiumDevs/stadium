import { HandCoins } from "lucide-react";
import type { ApiFundingSignal } from "@/lib/api";

const typeLabel = (t?: ApiFundingSignal["fundingType"]) => {
  switch (t) {
    case "grant":
      return "A GRANT";
    case "bounty":
      return "A BOUNTY";
    case "pre_seed":
      return "PRE-SEED";
    case "seed":
      return "SEED";
    case "other":
      return "FUNDING";
    default:
      return "FUNDING";
  }
};

export function FundingSignalBadge({ signal }: { signal: ApiFundingSignal | null }) {
  if (!signal || !signal.isSeeking) return null;

  const label = typeLabel(signal.fundingType);
  const hint = signal.amountRange ? ` · ${signal.amountRange.toUpperCase()}` : "";

  return (
    <div className="space-y-1">
      <span className="inline-flex items-center gap-1.5 border border-display bg-panel-deep text-display px-2 py-[2px] font-mono text-[10px] tracking-[0.12em] uppercase">
        <HandCoins className="h-3 w-3" aria-hidden="true" />
        LOOKING FOR {label}{hint}
        <span className="led led-sm ml-0.5" aria-hidden="true" />
      </span>
      {signal.description && (
        <p className="text-sm text-body">{signal.description}</p>
      )}
    </div>
  );
}
