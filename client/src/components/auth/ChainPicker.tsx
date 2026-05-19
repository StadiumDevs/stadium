/**
 * Segmented control for choosing which wallet ecosystem to sign in with.
 */

import type { Chain } from "@/lib/auth/types";
import { ALL_CHAINS, getProvider } from "@/lib/auth/registry";
import { cn } from "@/lib/utils";

interface ChainPickerProps {
  value: Chain;
  onChange: (chain: Chain) => void;
  className?: string;
}

export function ChainPicker({ value, onChange, className }: ChainPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Sign-in chain"
      className={cn(
        "inline-flex gap-1 rounded-lg border border-border p-1",
        className,
      )}
    >
      {ALL_CHAINS.map((chain) => {
        const provider = getProvider(chain);
        const selected = value === chain;
        return (
          <button
            key={chain}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(chain)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              selected
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {provider?.label ?? chain}
          </button>
        );
      })}
    </div>
  );
}
