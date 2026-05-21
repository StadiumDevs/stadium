import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Volume2, VolumeX } from "lucide-react";
import { useBrightness } from "@/hooks/use-brightness";
import { HardwareToggle } from "@/components/hardware-toggle";
import { solarBrightness } from "@/lib/solar";
import { cn } from "@/lib/utils";

interface BrightnessRackProps {
  className?: string;
}

// --- SoundCloud Widget API integration ---

interface SCWidget {
  bind(event: string, cb: () => void): void;
  play(): void;
  pause(): void;
  setVolume(volume: number): void;
}

interface SCNamespace {
  Widget: ((iframe: HTMLIFrameElement) => SCWidget) & {
    Events: { READY: string };
  };
}

declare global {
  interface Window {
    SC?: SCNamespace;
  }
}

const SC_WIDGET_SCRIPT = "https://w.soundcloud.com/player/api.js";
const SC_PROFILE_URL = "https://soundcloud.com/pommeshdrms";
const SC_IFRAME_SRC =
  `https://w.soundcloud.com/player/?url=${encodeURIComponent(SC_PROFILE_URL)}` +
  "&auto_play=false&hide_related=true&show_comments=false&show_user=false" +
  "&show_reposts=false&show_teaser=false&visual=false&buying=false" +
  "&sharing=false&download=false&show_artwork=false";

let scScriptPromise: Promise<void> | null = null;
function loadSoundCloudWidget(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.SC) return Promise.resolve();
  if (scScriptPromise) return scScriptPromise;
  scScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SC_WIDGET_SCRIPT}"]`,
    );
    if (existing) {
      if (window.SC) return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("SC script failed")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = SC_WIDGET_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("SC script failed"));
    document.head.appendChild(script);
  });
  return scScriptPromise;
}

// 4-hour clock ticks plotted at the brightness % the solar curve would produce
// for that hour today. Computed once per session — positions don't drift within a
// day at human-visible resolution.
function buildHourTicks(): Array<{ hour: number; brightness: number; label: string }> {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  return [0, 4, 8, 12, 16, 20].map((h) => {
    const d = new Date(base);
    d.setHours(h);
    return {
      hour: h,
      brightness: solarBrightness(d),
      label: `${String(h).padStart(2, "0")}h`,
    };
  });
}

export function BrightnessRack({ className }: BrightnessRackProps) {
  const {
    brightness, mode, phase, paletteKey, palettes, solarTarget, collapsed,
    setBrightness, setAuto, setPalette, setCollapsed,
  } = useBrightness();

  // Once the user touches anything (slider, AUTO toggle, palette), collapse
  // automatically. After that, expand/collapse is entirely user-driven via the
  // chevron. We watch the persisted state via a ref so subsequent restores
  // from localStorage don't re-trigger this.
  const hasAutoCollapsedRef = useRef(false);
  const lastStateRef = useRef({ brightness, mode, paletteKey });
  useEffect(() => {
    const prev = lastStateRef.current;
    const changed =
      prev.brightness !== brightness ||
      prev.mode !== mode ||
      prev.paletteKey !== paletteKey;
    lastStateRef.current = { brightness, mode, paletteKey };
    if (changed && !collapsed && !hasAutoCollapsedRef.current) {
      hasAutoCollapsedRef.current = true;
      setCollapsed(true);
    }
  }, [brightness, mode, paletteKey, collapsed, setCollapsed]);

  // --- SoundCloud audio: muted-by-default autoplay through the profile ---
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<SCWidget | null>(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadSoundCloudWidget()
      .then(() => {
        if (cancelled || !iframeRef.current || !window.SC) return;
        const widget = window.SC.Widget(iframeRef.current);
        widgetRef.current = widget;
        widget.bind(window.SC.Widget.Events.READY, () => {
          widget.setVolume(0);
          widget.play();
        });
      })
      .catch(() => {
        // Network-blocked or offline — leave audio inert; UI still works.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleAudio = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      const widget = widgetRef.current;
      if (widget) {
        widget.setVolume(next ? 0 : 100);
        widget.play();
      }
      return next;
    });
  }, []);

  const hourTicks = useMemo(() => buildHourTicks(), []);
  const activePalette = palettes.find((p) => p.key === paletteKey);

  // Hidden SoundCloud iframe — always mounted (outside collapsed/expanded branches)
  // so audio survives the rack's auto-collapse after the first brightness/AUTO/palette
  // interaction. Visually inert: 1×1, transparent, no pointer events.
  const audioIframe = (
    <iframe
      ref={iframeRef}
      src={SC_IFRAME_SRC}
      title="SoundCloud audio player (pommeshdrms)"
      aria-hidden="true"
      tabIndex={-1}
      allow="autoplay; encrypted-media"
      className="absolute pointer-events-none opacity-0 w-px h-px overflow-hidden"
    />
  );

  // Collapsed: a single compact strip showing current state with an expand chevron.
  if (collapsed) {
    return (
      <>
        {audioIframe}
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Expand brightness controls"
          aria-expanded={false}
          className={cn(
            "panel px-3 py-1.5 w-full flex items-center gap-3 text-left",
            "hover:bg-panel-deep transition-colors duration-150 group",
            className,
          )}
        >
          <span className="label-hw text-display">BRIGHTNESS</span>
          <span className="font-mono text-[12px] text-display tabular-nums">
            {brightness}%
          </span>
          <span className="label-hw-dim">·</span>
          <span className="label-hw-dim">{mode === "auto" ? `${phase} · AUTO` : "MANUAL"}</span>
          {activePalette && (
            <>
              <span className="label-hw-dim">·</span>
              <span className="label-hw-dim uppercase">{activePalette.label}</span>
            </>
          )}
          <ChevronDown
            className="h-3.5 w-3.5 text-label-mid ml-auto group-hover:text-display transition-colors duration-150"
            aria-hidden="true"
          />
        </button>
      </>
    );
  }

  return (
    <>
      {audioIframe}
      <div className={cn("panel px-4 py-3", className)}>
        <div className="flex items-center gap-4">
          <span className="label-hw min-w-[78px]">BRIGHTNESS</span>

          <div className="flex-1 relative">
            <div className="relative h-[18px]">
              {/* Track */}
              <div className="absolute top-[7px] left-0 right-0 h-1 bg-panel-deep border border-hairline" />

              {/* Hour ticks — every 4h plotted at its solar-brightness position */}
              {hourTicks.map((t) => (
                <div
                  key={t.hour}
                  className="absolute top-[3px] w-px h-2 bg-hairline pointer-events-none"
                  style={{ left: `calc(${t.brightness}% - 0.5px)` }}
                  aria-hidden="true"
                />
              ))}

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

            {/* Hour labels — same horizontal positions as the ticks above */}
            <div className="relative h-[10px] mt-1">
              {hourTicks.map((t) => (
                <span
                  key={t.hour}
                  className="absolute label-hw-dim text-[8px] -translate-x-1/2 tabular-nums"
                  style={{ left: `${t.brightness}%` }}
                >
                  {t.label}
                </span>
              ))}
            </div>

            <div className="flex justify-between mt-0.5 label-hw-dim text-[8px]">
              <span>NIGHT</span>
              <span>DAWN</span>
              <span>DAY</span>
              <span>NOON</span>
            </div>
          </div>

          <div className="lcd px-3 py-1 min-w-[56px] text-center font-mono text-[13px] font-bold text-display tabular-nums">
            {brightness}%
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(true)}
            aria-label="Collapse brightness controls"
            aria-expanded={true}
            className="lcd p-1 hover:bg-panel-deep transition-colors duration-150 group"
          >
            <ChevronUp
              className="h-3.5 w-3.5 text-label-mid group-hover:text-display transition-colors duration-150"
              aria-hidden="true"
            />
          </button>
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

        {/* Audio — artist credit + external links + mute toggle */}
        <div className="flex items-center gap-3 mt-2 pt-2 border-t border-hairline-subtle">
          <span className="label-hw min-w-[78px]">AUDIO</span>
          <span className="font-mono text-[11px] text-display tabular-nums">
            pommeshdrms
          </span>
          <span className="flex-1" />
          <a
            href="https://soundcloud.com/pommeshdrms"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="pommeshdrms on SoundCloud (opens in new tab)"
            title="pommeshdrms on SoundCloud"
            className="lcd px-2 py-1 label-hw-dim hover:text-display transition-colors duration-200"
          >
            SC
          </a>
          <a
            href="https://www.instagram.com/pommes_hdrms"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="pommes_hdrms on Instagram (opens in new tab)"
            title="pommes_hdrms on Instagram"
            className="lcd px-2 py-1 label-hw-dim hover:text-display transition-colors duration-200"
          >
            IG
          </a>
          <button
            type="button"
            onClick={toggleAudio}
            aria-label={muted ? "Unmute audio" : "Mute audio"}
            aria-pressed={!muted}
            title={muted ? "Unmute audio" : "Mute audio"}
            className="lcd p-1 hover:bg-panel-deep transition-colors duration-150 group"
          >
            {muted ? (
              <VolumeX
                className="h-3.5 w-3.5 text-label-mid group-hover:text-display transition-colors duration-150"
                aria-hidden="true"
              />
            ) : (
              <Volume2
                className="h-3.5 w-3.5 text-display transition-colors duration-150"
                aria-hidden="true"
              />
            )}
          </button>
        </div>
      </div>
    </>
  );
}
