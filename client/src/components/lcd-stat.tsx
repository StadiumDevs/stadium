import { cn } from "@/lib/utils";

interface LCDStatProps {
  value: string | number;
  label: string;
  size?: "sm" | "md" | "lg";
  showLED?: boolean;
  pulse?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "text-[22px]",
  md: "text-[32px]",
  lg: "text-[68px]",
} as const;

export function LCDStat({
  value,
  label,
  size = "md",
  showLED = false,
  pulse = false,
  className,
}: LCDStatProps) {
  return (
    <div className={cn("lcd p-4 flex flex-col items-center justify-center", className)}>
      <div className={cn("lcd-readout leading-none", SIZE_CLASSES[size])}>{value}</div>
      <div className="label-hw-dim mt-2 text-center">·{label.toUpperCase()}</div>
      {showLED && (
        <span
          className={cn("led led-sm mt-2", pulse && "led-pulse")}
          aria-label={`${label} active`}
        />
      )}
    </div>
  );
}
