import { useBrightness } from "@/hooks/use-brightness";
import { HardwareToggle } from "@/components/hardware-toggle";
import { cn } from "@/lib/utils";

interface BrightnessRackProps {
  className?: string;
}

export function BrightnessRack({ className }: BrightnessRackProps) {
  const {
    brightness, mode, phase, paletteKey, palettes, solarTarget,
    setBrightness, setAuto, setPalette,
  } = useBrightness();

  return (
    <div className={cn("panel px-4 py-3", className)}>
      <div className="flex items-center gap-4">
        <span className="label-hw min-w-[78px]">BRIGHTNESS</span>

        <div className="flex-1 relative">
          <div className="relative h-[18px]">
            {/* Track */}
            <div className="absolute top-[7px] left-0 right-0 h-1 bg-panel-deep border border-hairline" />

            {/* Solar tick — shows where AUTO would place the dial */}
            <div
              className="absolute top-0 w-[2px] h-[18px] bg-led pointer-events-none transition-all duration-1000 ease-out"
              style={{
                left: `calc(${solarTarget}% - 1px)`,
                boxShadow: '0 0 4px hsl(var(--led))',
              }}
              aria-hidden="true"
            />

            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={brightness}
              aria-label="Display brightness"
              aria-valuenow={brightness}
              aria-valuemin={0}
              aria-valuemax={100}
              onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
              className={cn(
                "absolute inset-0 w-full h-[18px] bg-transparent appearance-none cursor-ew-resize z-10",
                "[&::-webkit-slider-thumb]:appearance-none",
                "[&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:h-[18px]",
                "[&::-webkit-slider-thumb]:bg-gradient-to-b [&::-webkit-slider-thumb]:from-[#DDDDDD] [&::-webkit-slider-thumb]:to-[#888888]",
                "[&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black",
                "[&::-webkit-slider-thumb]:cursor-ew-resize",
                "[&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:h-[18px]",
                "[&::-moz-range-thumb]:bg-[linear-gradient(180deg,#DDDDDD_0%,#888888_100%)]",
                "[&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black",
                "[&::-moz-range-thumb]:rounded-none [&::-moz-range-thumb]:cursor-ew-resize"
              )}
            />
          </div>

          <div className="flex justify-between mt-1 label-hw-dim text-[8px]">
            <span>NIGHT</span>
            <span>DAWN</span>
            <span>DAY</span>
            <span>NOON</span>
          </div>
        </div>

        <div className="lcd px-3 py-1 min-w-[56px] text-center font-mono text-[13px] font-bold text-display tabular-nums">
          {brightness}%
        </div>
      </div>

      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-hairline-subtle">
        <button
          type="button"
          onClick={() => (mode === 'auto' ? setBrightness(brightness) : setAuto())}
          role="switch"
          aria-checked={mode === 'auto'}
          className="flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-led"
        >
          <div
            className={cn(
              "relative w-7 h-[14px] border border-black transition-colors duration-200",
              mode === 'auto' ? "bg-led" : "bg-hairline"
            )}
          >
            <div
              className={cn(
                "absolute top-0 w-3 h-3 bg-gradient-to-b from-white to-[#888888] border border-black transition-all duration-200",
                mode === 'auto' ? "left-[14px]" : "left-0"
              )}
            />
          </div>
          <span className="label-hw">AUTO</span>
        </button>

        <span className="label-hw-dim flex-1" aria-live="polite">
          {mode === 'auto'
            ? `${phase.toLowerCase()} · target ${solarTarget}%`
            : `manual · sun at ${solarTarget}%`}
        </span>

        {mode === 'manual' && (
          <button
            type="button"
            onClick={setAuto}
            className="lcd px-3 py-1 label-hw-dim hover:text-display transition-colors duration-200"
          >
            RESYNC
          </button>
        )}
      </div>

      {/* Palette picker — last row, separated from brightness controls */}
      <div className="flex items-center gap-3 mt-2 pt-2 border-t border-hairline-subtle">
        <span className="label-hw min-w-[78px]">PALETTE</span>
        <HardwareToggle
          options={palettes.map((p) => ({ value: p.key, label: p.label }))}
          value={paletteKey}
          onChange={setPalette}
        />
      </div>
    </div>
  );
}
