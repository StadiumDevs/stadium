import { Badge } from "@/components/ui/badge";
import { HandCoins } from "lucide-react";
import type { ApiFundingSignal } from "@/lib/api";

const typeLabel = (t?: ApiFundingSignal["fundingType"]) => {
  switch (t) {
    case "grant":
      return "a grant";
    case "bounty":
      return "a bounty";
    case "pre_seed":
      return "pre-seed";
    case "seed":
      return "seed";
    case "other":
      return "funding";
    default:
      return "funding";
  }
};

export function FundingSignalBadge({ signal }: { signal: ApiFundingSignal | null }) {
  if (!signal || !signal.isSeeking) return null;

  const label = typeLabel(signal.fundingType);
  const hint = signal.amountRange ? ` · ${signal.amountRange}` : "";

  return (
    <div className="space-y-1">
      <Badge variant="secondary" className="gap-1.5">
        <HandCoins className="h-3.5 w-3.5" aria-hidden="true" />
        Looking for {label}{hint}
      </Badge>
      {signal.description && (
        <p className="text-sm text-muted-foreground">{signal.description}</p>
      )}
    </div>
  );
}
