/**
 * Brightness palette computer.
 *
 * The dial controls a single 0–100 value; this module maps that, given a
 * Palette (see lib/palettes.ts), to the twelve surface/text tokens — each as a
 * full H/S/L triplet so any colour palette (not just grayscale) can drive the
 * dial.
 *
 * Below the 50% threshold: backgrounds rise from `dark` → `dusk` with text in
 * the bright role. At/above 50%: roles invert — backgrounds rise from `dawn` →
 * `light` with text in the dark role. The threshold is a hard snap (text-role
 * inversion can't be smoothly interpolated through a mid-gray without breaking
 * WCAG contrast) but each anchor pair is interpolated smoothly across it.
 */

import type { HSL, Palette, PaletteAnchor } from './palettes';

const INVERSION_THRESHOLD = 50;

export type ComputedTokens = Record<keyof PaletteAnchor, HSL>;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

function lerpHSL(a: HSL, b: HSL, t: number): HSL {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function lerpAnchor(a: PaletteAnchor, b: PaletteAnchor, t: number): ComputedTokens {
  const out = {} as ComputedTokens;
  (Object.keys(a) as (keyof PaletteAnchor)[]).forEach((key) => {
    out[key] = lerpHSL(a[key], b[key], t);
  });
  return out;
}

export function computePalette(brightness: number, palette: Palette): ComputedTokens {
  const t = brightness / 100;
  const inverted = brightness >= INVERSION_THRESHOLD;

  if (!inverted) {
    const k = t / (INVERSION_THRESHOLD / 100);
    return lerpAnchor(palette.anchors.dark, palette.anchors.dusk, k);
  }

  const k = (t - INVERSION_THRESHOLD / 100) / (1 - INVERSION_THRESHOLD / 100);
  return lerpAnchor(palette.anchors.dawn, palette.anchors.light, k);
}

function format(hsl: HSL): string {
  return `${Math.round(hsl[0])} ${Math.round(hsl[1])}% ${hsl[2].toFixed(1)}%`;
}

export function applyPalette(tokens: ComputedTokens, palette: Palette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const set = (key: string, value: HSL) => root.style.setProperty(key, format(value));

  set('--shell', tokens.shell);
  set('--panel-light', tokens.panelLight);
  set('--panel-mid', tokens.panelMid);
  set('--panel-dark', tokens.panelDark);
  set('--panel-deep', tokens.panelDeep);
  set('--hairline', tokens.hairline);
  set('--hairline-subtle', tokens.hairlineSubtle);
  set('--display', tokens.display);
  set('--display-dim', tokens.displayDim);
  set('--body', tokens.body);
  set('--label-mid', tokens.labelMid);
  set('--label-dim', tokens.labelDim);

  // The LED accent is constant per palette — set it alongside surface tokens
  // so a palette switch immediately reflects in the LED dots.
  set('--led', palette.led);
}

export function scanlineOpacity(brightness: number): number {
  // Scanlines disappear above ~40% brightness — physical CRTs don't show them in daylight.
  return Math.max(0, 1 - (brightness / 100) * 2.5);
}

export { INVERSION_THRESHOLD };
