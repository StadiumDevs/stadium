import { useEffect, useState, useCallback } from 'react';
import { computePalette, applyPalette, scanlineOpacity } from '@/lib/brightness';
import { solarBrightness, phaseLabel } from '@/lib/solar';
import { DEFAULT_PALETTE_KEY, getPalette, PALETTES } from '@/lib/palettes';

type Mode = 'auto' | 'manual';
const STORAGE_KEY = 'stadium-brightness';
const TICK_INTERVAL_MS = 60_000;

interface StoredState {
  mode: Mode;
  manualValue: number | null;
  paletteKey: string;
  collapsed: boolean;
}

// Below this viewport width we treat the device as "mobile-ish" and default
// the brightness rack to its compact strip — otherwise the full panel eats
// ~170px of vertical space on every page load, which felt invasive.
const MOBILE_BREAKPOINT_PX = 640;

function isMobileViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < MOBILE_BREAKPOINT_PX;
}

function readStored(): StoredState {
  const defaults: StoredState = {
    mode: 'auto',
    manualValue: null,
    paletteKey: DEFAULT_PALETTE_KEY,
    // Default to collapsed on mobile viewports; users can expand explicitly.
    collapsed: isMobileViewport(),
  };
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw);
    if (parsed.mode !== 'auto' && parsed.mode !== 'manual') return defaults;
    return {
      mode: parsed.mode,
      manualValue: typeof parsed.manualValue === 'number' ? parsed.manualValue : null,
      paletteKey: typeof parsed.paletteKey === 'string' ? parsed.paletteKey : DEFAULT_PALETTE_KEY,
      // Honor a stored collapsed=true; if the user never set one, fall back
      // to the mobile-viewport default so first-time mobile loads aren't
      // dominated by the brightness panel.
      collapsed:
        typeof parsed.collapsed === 'boolean' ? parsed.collapsed : isMobileViewport(),
    };
  } catch {
    return defaults;
  }
}

function writeStored(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* localStorage unavailable — silent fail */ }
}

export function useBrightness() {
  const [state, setState] = useState<StoredState>(readStored);
  const [brightness, setBrightnessValue] = useState<number>(() => {
    const stored = readStored();
    if (stored.mode === 'manual' && stored.manualValue !== null) return stored.manualValue;
    return solarBrightness();
  });
  const [phase, setPhase] = useState<string>(phaseLabel());

  const applyToDOM = useCallback((b: number, paletteKey: string) => {
    const palette = getPalette(paletteKey);
    applyPalette(computePalette(b, palette), palette);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--scanline-opacity', String(scanlineOpacity(b)));
    }
  }, []);

  // Apply on mount and whenever brightness OR palette changes
  useEffect(() => {
    applyToDOM(brightness, state.paletteKey);
  }, [brightness, state.paletteKey, applyToDOM]);

  // Auto-mode tick — re-read clock every minute
  useEffect(() => {
    if (state.mode !== 'auto') return;

    const tick = () => {
      setBrightnessValue(solarBrightness());
      setPhase(phaseLabel());
    };

    tick();
    const interval = setInterval(tick, TICK_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [state.mode]);

  const setBrightness = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    setState((prev) => {
      const next: StoredState = { ...prev, mode: 'manual', manualValue: clamped };
      writeStored(next);
      return next;
    });
    setBrightnessValue(clamped);
  }, []);

  const setAuto = useCallback(() => {
    setState((prev) => {
      const next: StoredState = { ...prev, mode: 'auto', manualValue: null };
      writeStored(next);
      return next;
    });
    setBrightnessValue(solarBrightness());
    setPhase(phaseLabel());
  }, []);

  const setPalette = useCallback((paletteKey: string) => {
    setState((prev) => {
      const next: StoredState = { ...prev, paletteKey };
      writeStored(next);
      return next;
    });
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    setState((prev) => {
      if (prev.collapsed === collapsed) return prev;
      const next: StoredState = { ...prev, collapsed };
      writeStored(next);
      return next;
    });
  }, []);

  return {
    brightness,
    mode: state.mode,
    phase,
    paletteKey: state.paletteKey,
    palettes: PALETTES,
    solarTarget: solarBrightness(),
    collapsed: state.collapsed,
    setBrightness,
    setAuto,
    setPalette,
    setCollapsed,
  };
}
