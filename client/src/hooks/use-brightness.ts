import { useEffect, useState, useCallback } from 'react';
import { computePalette, applyPalette, scanlineOpacity } from '@/lib/brightness';
import { solarBrightness, phaseLabel } from '@/lib/solar';

type Mode = 'auto' | 'manual';
const STORAGE_KEY = 'stadium-brightness';
const TICK_INTERVAL_MS = 60_000;

interface StoredState {
  mode: Mode;
  manualValue: number | null;
}

function readStored(): StoredState {
  if (typeof window === 'undefined') return { mode: 'auto', manualValue: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { mode: 'auto', manualValue: null };
    const parsed = JSON.parse(raw);
    if (parsed.mode !== 'auto' && parsed.mode !== 'manual') {
      return { mode: 'auto', manualValue: null };
    }
    return parsed;
  } catch {
    return { mode: 'auto', manualValue: null };
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

  const applyToDOM = useCallback((b: number) => {
    applyPalette(computePalette(b));
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--scanline-opacity', String(scanlineOpacity(b)));
    }
  }, []);

  // Apply on mount and whenever brightness changes
  useEffect(() => {
    applyToDOM(brightness);
  }, [brightness, applyToDOM]);

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
    const next: StoredState = { mode: 'manual', manualValue: clamped };
    setState(next);
    writeStored(next);
    setBrightnessValue(clamped);
  }, []);

  const setAuto = useCallback(() => {
    const next: StoredState = { mode: 'auto', manualValue: null };
    setState(next);
    writeStored(next);
    setBrightnessValue(solarBrightness());
    setPhase(phaseLabel());
  }, []);

  return {
    brightness,
    mode: state.mode,
    phase,
    solarTarget: solarBrightness(),
    setBrightness,
    setAuto,
  };
}
