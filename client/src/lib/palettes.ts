/**
 * Palette registry. Each palette defines four brightness anchors (dark, dusk,
 * dawn, light) for every surface/text token, plus a single LED accent color.
 * The brightness controller lerps H/S/L between anchors — so the dial math
 * works with any palette, not just grayscale.
 *
 * A new palette just needs to add an entry below. The shape is fixed.
 */

export type HSL = readonly [number, number, number]; // [hue, saturation, lightness]

export interface PaletteAnchor {
  shell: HSL;
  panelLight: HSL;
  panelMid: HSL;
  panelDark: HSL;
  panelDeep: HSL;
  hairline: HSL;
  hairlineSubtle: HSL;
  display: HSL;
  displayDim: HSL;
  body: HSL;
  labelMid: HSL;
  labelDim: HSL;
}

export interface Palette {
  key: string;
  label: string;          // shown in the picker, e.g. "RACK"
  led: HSL;               // accent color — constant across brightness
  anchors: {
    dark: PaletteAnchor;  // brightness = 0
    dusk: PaletteAnchor;  // brightness just below the inversion threshold
    dawn: PaletteAnchor;  // brightness just above the inversion threshold
    light: PaletteAnchor; // brightness = 100
  };
}

// ── Grayscale ("RACK") — the spec's hardware rack ────────────────────────
// All anchors are H=0, S=0, lightness-only. LED is the original spec green.
const GRAYSCALE: Palette = {
  key: 'grayscale',
  label: 'RACK',
  led: [142, 71, 58],
  anchors: {
    dark: {
      shell:           [0, 0,  4],
      panelLight:      [0, 0, 10],
      panelMid:        [0, 0,  8],
      panelDark:       [0, 0,  4],
      panelDeep:       [0, 0,  2],
      hairline:        [0, 0, 16],
      hairlineSubtle:  [0, 0, 10],
      display:         [0, 0, 98],
      displayDim:      [0, 0, 87],
      body:            [0, 0, 67],
      labelMid:        [0, 0, 87],
      labelDim:        [0, 0, 53],
    },
    dusk: {
      shell:           [0, 0, 35],
      panelLight:      [0, 0, 42],
      panelMid:        [0, 0, 38],
      panelDark:       [0, 0, 32],
      panelDeep:       [0, 0, 28],
      hairline:        [0, 0, 52],
      hairlineSubtle:  [0, 0, 44],
      display:         [0, 0, 92],
      displayDim:      [0, 0, 80],
      body:            [0, 0, 72],
      labelMid:        [0, 0, 80],
      labelDim:        [0, 0, 60],
    },
    dawn: {
      shell:           [0, 0, 78],
      panelLight:      [0, 0, 88],
      panelMid:        [0, 0, 84],
      panelDark:       [0, 0, 72],
      panelDeep:       [0, 0, 68],
      hairline:        [0, 0, 58],
      hairlineSubtle:  [0, 0, 64],
      display:         [0, 0, 12],
      displayDim:      [0, 0, 22],
      body:            [0, 0, 30],
      labelMid:        [0, 0, 22],
      labelDim:        [0, 0, 42],
    },
    light: {
      shell:           [0, 0,  96],
      panelLight:      [0, 0, 100],
      panelMid:        [0, 0,  98],
      panelDark:       [0, 0,  90],
      panelDeep:       [0, 0,  85],
      hairline:        [0, 0,  70],
      hairlineSubtle:  [0, 0,  78],
      display:         [0, 0,   4],
      displayDim:      [0, 0,  14],
      body:            [0, 0,  24],
      labelMid:        [0, 0,  14],
      labelDim:        [0, 0,  36],
    },
  },
};

// Grayscale only. A stored key for a removed palette (e.g. 'webzero', whose
// picker went with the top-bar dropdown) falls back to GRAYSCALE in getPalette.
export const PALETTES: Palette[] = [GRAYSCALE];
export const DEFAULT_PALETTE_KEY = 'grayscale';

export function getPalette(key: string): Palette {
  return PALETTES.find((p) => p.key === key) ?? GRAYSCALE;
}
