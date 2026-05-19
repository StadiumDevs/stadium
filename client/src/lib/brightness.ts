/**
 * Brightness palette computer.
 *
 * All values are HSL lightness percentages (S=0 throughout — grayscale only).
 * The dial controls a single 0–100 value; this module maps that to 12 token lightnesses.
 *
 * Below the 50% threshold: text stays light, backgrounds rise from near-black toward dusk.
 * Above 50%: roles invert — backgrounds rise from dawn-gray to bright white, text drops to near-black.
 * The threshold is a hard snap (text role inversion can't be smoothly interpolated through mid-gray
 * without breaking WCAG contrast) but the surface colors continue smoothly across it.
 */

const BASE_DARK = {
  shell: 4,
  panelLight: 10,
  panelMid: 8,
  panelDark: 4,
  panelDeep: 2,
  hairline: 16,
  hairlineSubtle: 10,
  display: 98,
  displayDim: 87,
  body: 67,
  labelMid: 87,
  labelDim: 53,
} as const;

const DUSK = {
  shell: 35,
  panelLight: 42,
  panelMid: 38,
  panelDark: 32,
  panelDeep: 28,
  hairline: 52,
  hairlineSubtle: 44,
  display: 92,
  displayDim: 80,
  body: 72,
  labelMid: 80,
  labelDim: 60,
} as const;

const DAWN = {
  shell: 78,
  panelLight: 88,
  panelMid: 84,
  panelDark: 72,
  panelDeep: 68,
  hairline: 58,
  hairlineSubtle: 64,
  display: 12,
  displayDim: 22,
  body: 30,
  labelMid: 22,
  labelDim: 42,
} as const;

const BASE_LIGHT = {
  shell: 96,
  panelLight: 100,
  panelMid: 98,
  panelDark: 90,
  panelDeep: 85,
  hairline: 70,
  hairlineSubtle: 78,
  display: 4,
  displayDim: 14,
  body: 24,
  labelMid: 14,
  labelDim: 36,
} as const;

const INVERSION_THRESHOLD = 50;

type Palette = typeof BASE_DARK;

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export function computePalette(brightness: number): Palette {
  const t = brightness / 100;
  const inverted = brightness >= INVERSION_THRESHOLD;

  if (!inverted) {
    const k = t / (INVERSION_THRESHOLD / 100);
    const out = {} as Palette;
    (Object.keys(BASE_DARK) as (keyof Palette)[]).forEach((key) => {
      out[key] = lerp(BASE_DARK[key], DUSK[key], k);
    });
    return out;
  } else {
    const k = (t - INVERSION_THRESHOLD / 100) / (1 - INVERSION_THRESHOLD / 100);
    const out = {} as Palette;
    (Object.keys(DAWN) as (keyof Palette)[]).forEach((key) => {
      out[key] = lerp(DAWN[key], BASE_LIGHT[key], k);
    });
    return out;
  }
}

export function applyPalette(palette: Palette): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.style.setProperty('--shell', `0 0% ${palette.shell}%`);
  root.style.setProperty('--panel-light', `0 0% ${palette.panelLight}%`);
  root.style.setProperty('--panel-mid', `0 0% ${palette.panelMid}%`);
  root.style.setProperty('--panel-dark', `0 0% ${palette.panelDark}%`);
  root.style.setProperty('--panel-deep', `0 0% ${palette.panelDeep}%`);
  root.style.setProperty('--hairline', `0 0% ${palette.hairline}%`);
  root.style.setProperty('--hairline-subtle', `0 0% ${palette.hairlineSubtle}%`);
  root.style.setProperty('--display', `0 0% ${palette.display}%`);
  root.style.setProperty('--display-dim', `0 0% ${palette.displayDim}%`);
  root.style.setProperty('--body', `0 0% ${palette.body}%`);
  root.style.setProperty('--label-mid', `0 0% ${palette.labelMid}%`);
  root.style.setProperty('--label-dim', `0 0% ${palette.labelDim}%`);
}

export function scanlineOpacity(brightness: number): number {
  // Scanlines disappear above 40% brightness — physical CRTs don't show them in daylight.
  return Math.max(0, 1 - (brightness / 100) * 2.5);
}

export { INVERSION_THRESHOLD };
