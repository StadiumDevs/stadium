import { cn } from "@/lib/utils";

interface HardwareToggleProps<T extends string> {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function HardwareToggle<T extends string>({
  options,
  value,
  onChange,
  className,
}: HardwareToggleProps<T>) {
  return (
    <div className={cn("flex", className)} role="tablist">
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] border border-hairline transition-colors duration-150",
              i > 0 && "border-l-0",
              active
                ? "bg-display text-shell font-bold"
                : "bg-panel-deep text-label-dim hover:text-display"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
