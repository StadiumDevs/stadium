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
  label: string;          // shown in the picker, e.g. "RACK" or "WEBZERO"
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

// ── WebZero ("WEBZERO") — paper / poster ─────────────────────────────────
// Cream paper, ink type. Vermillion + teal as panel tint accents. Lime LED.
// At dark the page is "ink with paper text"; at light it's a printed poster.
const WEBZERO: Palette = {
  key: 'webzero',
  label: 'WEBZERO',
  led: [68, 76, 55], // lime
  anchors: {
    dark: {
      shell:           [  0,  0,  4],   // ink
      panelLight:      [ 11, 12, 10],   // vermillion-tinted dark panel
      panelMid:        [ 11,  8,  8],
      panelDark:       [  0,  0,  4],
      panelDeep:       [  0,  0,  2],
      hairline:        [168, 25, 22],   // teal hairline
      hairlineSubtle:  [168, 18, 14],
      display:         [ 40, 50, 91],   // cream type
      displayDim:      [ 40, 35, 78],
      body:            [ 40, 15, 65],
      labelMid:        [ 40, 35, 78],
      labelDim:        [ 11, 30, 50],   // vermillion stamp dim
    },
    dusk: {
      shell:           [ 20, 30, 35],
      panelLight:      [ 20, 25, 42],
      panelMid:        [ 20, 22, 38],
      panelDark:       [ 20, 18, 32],
      panelDeep:       [ 20, 15, 28],
      hairline:        [168, 30, 50],
      hairlineSubtle:  [168, 22, 42],
      display:         [ 40, 45, 90],
      displayDim:      [ 40, 30, 78],
      body:            [ 40, 18, 70],
      labelMid:        [ 40, 30, 78],
      labelDim:        [ 11, 40, 55],
    },
    dawn: {
      shell:           [ 30, 40, 75],
      panelLight:      [ 35, 50, 88],
      panelMid:        [ 35, 45, 84],
      panelDark:       [ 30, 30, 70],
      panelDeep:       [ 30, 28, 65],
      hairline:        [168, 32, 55],
      hairlineSubtle:  [168, 25, 65],
      display:         [  0,  0, 12],
      displayDim:      [  0,  0, 22],
      body:            [  0,  0, 32],
      labelMid:        [  0,  0, 22],
      labelDim:        [ 11, 45, 42],
    },
    light: {
      shell:           [ 40, 50, 91],   // cream paper
      panelLight:      [ 40, 60, 96],
      panelMid:        [ 40, 55, 93],
      panelDark:       [ 40, 40, 85],
      panelDeep:       [ 40, 35, 80],
      hairline:        [168, 35, 45],   // teal hairline
      hairlineSubtle:  [168, 25, 68],
      display:         [  0,  0,  4],   // ink
      displayDim:      [  0,  0, 18],
      body:            [  0,  0, 30],
      labelMid:        [  0,  0, 18],
      labelDim:        [ 11, 50, 38],   // vermillion stamp dim
    },
  },
};

export const PALETTES: Palette[] = [GRAYSCALE, WEBZERO];
export const DEFAULT_PALETTE_KEY = 'grayscale';

export function getPalette(key: string): Palette {
  return PALETTES.find((p) => p.key === key) ?? GRAYSCALE;
}
