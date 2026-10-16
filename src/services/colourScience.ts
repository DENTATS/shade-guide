/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LabColor, ReferenceShadeTab, RgbColor } from '../types/dental';

// CIE Standard Illuminant D65, 2-degree standard observer reference white point
export const D65_WHITE = {
  Xn: 0.95047,
  Yn: 1.00000,
  Zn: 1.08883,
};

/**
 * Standard piecewise sRGB companding -> linear RGB (IEC 61966-2-1:1999)
 */
export function sRgbToLinear(c: number): number {
  const norm = Math.max(0, Math.min(255, c)) / 255;
  if (norm <= 0.04045) {
    return norm / 12.92;
  }
  return Math.pow((norm + 0.055) / 1.055, 2.4);
}

/**
 * Inverse linear RGB -> sRGB companded (0..255)
 */
export function linearToSRgb(cLin: number): number {
  let val: number;
  if (cLin <= 0.0031308) {
    val = 12.92 * cLin;
  } else {
    val = 1.055 * Math.pow(cLin, 1 / 2.4) - 0.055;
  }
  return Math.round(Math.max(0, Math.min(1, val)) * 255);
}

/**
 * Converts sRGB [0..255] to CIE XYZ under D65
 */
export function sRgbToXyz(r: number, g: number, b: number): { X: number; Y: number; Z: number } {
  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);

  // sRGB D65 transformation matrix
  const X = 0.4124564 * rLin + 0.3575761 * gLin + 0.1804375 * bLin;
  const Y = 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin;
  const Z = 0.0193339 * rLin + 0.1191920 * gLin + 0.9503041 * bLin;

  return { X, Y, Z };
}

/**
 * Converts CIE XYZ to CIELAB (L*, a*, b*) under D65
 */
export function xyzToLab(X: number, Y: number, Z: number): LabColor {
  const xr = X / D65_WHITE.Xn;
  const yr = Y / D65_WHITE.Yn;
  const zr = Z / D65_WHITE.Zn;

  const delta = 6 / 29;
  const deltaCubed = delta * delta * delta; // ~0.00885645
  const factor = (1 / 3) * Math.pow(29 / 6, 2); // ~7.787037

  const fx = xr > deltaCubed ? Math.cbrt(xr) : factor * xr + 4 / 29;
  const fy = yr > deltaCubed ? Math.cbrt(yr) : factor * yr + 4 / 29;
  const fz = zr > deltaCubed ? Math.cbrt(zr) : factor * zr + 4 / 29;

  const L = 116 * fy - 16;
  const a = 500 * (fx - fy);
  const b = 200 * (fy - fz);

  return { L, a, b };
}

/**
 * Direct conversion from sRGB [0..255] to CIELAB (L*, a*, b*)
 */
export function sRgbToLab(r: number, g: number, b: number): LabColor {
  const { X, Y, Z } = sRgbToXyz(r, g, b);
  return xyzToLab(X, Y, Z);
}

/**
 * Converts CIELAB (L*, a*, b*) back to sRGB [0..255]
 */
export function labToRgb(L: number, a: number, b: number): RgbColor {
  const fy = (L + 16) / 116;
  const fx = a / 500 + fy;
  const fz = fy - b / 200;

  const delta = 6 / 29;
  const deltaSquared = delta * delta;

  const xr = fx > delta ? fx * fx * fx : 3 * deltaSquared * (fx - 4 / 29);
  const yr = L > 8.0 ? Math.pow((L + 16) / 116, 3) : L * (3 / 116) * deltaSquared;
  const zr = fz > delta ? fz * fz * fz : 3 * deltaSquared * (fz - 4 / 29);

  const X = xr * D65_WHITE.Xn;
  const Y = yr * D65_WHITE.Yn;
  const Z = zr * D65_WHITE.Zn;

  // Inverse sRGB matrix
  const rLin = 3.2404542 * X - 1.5371385 * Y - 0.4985314 * Z;
  const gLin = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
  const bLin = 0.0556434 * X - 0.2040259 * Y + 1.0572252 * Z;

  return {
    r: linearToSRgb(rLin),
    g: linearToSRgb(gLin),
    b: linearToSRgb(bLin),
  };
}

/**
 * Converts Lab color to Hex string format #RRGGBB
 */
export function labToHex(L: number, a: number, b: number): string {
  const { r, g, b: blue } = labToRgb(L, a, b);
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(blue)}`;
}

/**
 * CIE76 Delta E (*ab) colour difference
 * Euclidean distance in CIELAB space
 */
export function deltaE76(c1: LabColor, c2: LabColor): number {
  const dL = c1.L - c2.L;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * CIEDE2000 Delta E (00) colour difference
 * Verified implementation according to Sharma, Wu, and Dalal (2005)
 * Parametric weighting factors: kL = 1, kC = 1, kH = 1
 */
export function deltaE00(
  c1: LabColor,
  c2: LabColor,
  kL: number = 1.0,
  kC: number = 1.0,
  kH: number = 1.0
): number {
  const L1 = c1.L;
  const a1 = c1.a;
  const b1 = c1.b;

  const L2 = c2.L;
  const a2 = c2.a;
  const b2 = c2.b;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const C_bar = (C1 + C2) / 2;

  const C_bar7 = Math.pow(C_bar, 7);
  const twentyFive7 = 6103515625; // 25^7
  const G = 0.5 * (1 - Math.sqrt(C_bar7 / (C_bar7 + twentyFive7)));

  const a1_prime = (1 + G) * a1;
  const a2_prime = (1 + G) * a2;

  const C1_prime = Math.sqrt(a1_prime * a1_prime + b1 * b1);
  const C2_prime = Math.sqrt(a2_prime * a2_prime + b2 * b2);

  // Hue angle in degrees [0, 360)
  const computeHue = (a_p: number, b_p: number): number => {
    if (a_p === 0 && b_p === 0) return 0;
    const deg = Math.atan2(b_p, a_p) * RAD_TO_DEG;
    return deg >= 0 ? deg : deg + 360;
  };

  const h1_prime = computeHue(a1_prime, b1);
  const h2_prime = computeHue(a2_prime, b2);

  const delta_L_prime = L2 - L1;
  const delta_C_prime = C2_prime - C1_prime;

  // Delta h'
  let delta_h_prime = 0;
  if (C1_prime * C2_prime !== 0) {
    const diff = h2_prime - h1_prime;
    if (Math.abs(diff) <= 180) {
      delta_h_prime = diff;
    } else if (diff > 180) {
      delta_h_prime = diff - 360;
    } else {
      delta_h_prime = diff + 360;
    }
  }

  const delta_H_prime =
    2 *
    Math.sqrt(C1_prime * C2_prime) *
    Math.sin((delta_h_prime / 2) * DEG_TO_RAD);

  const L_bar_prime = (L1 + L2) / 2;
  const C_bar_prime = (C1_prime + C2_prime) / 2;

  // Mean hue angle h_bar_prime
  let h_bar_prime = 0;
  if (C1_prime * C2_prime !== 0) {
    const diff = Math.abs(h1_prime - h2_prime);
    const sum = h1_prime + h2_prime;
    if (diff <= 180) {
      h_bar_prime = sum / 2;
    } else if (sum < 360) {
      h_bar_prime = (sum + 360) / 2;
    } else {
      h_bar_prime = (sum - 360) / 2;
    }
  } else {
    h_bar_prime = h1_prime + h2_prime;
  }

  const T =
    1 -
    0.17 * Math.cos((h_bar_prime - 30) * DEG_TO_RAD) +
    0.24 * Math.cos(2 * h_bar_prime * DEG_TO_RAD) +
    0.32 * Math.cos((3 * h_bar_prime + 6) * DEG_TO_RAD) -
    0.2 * Math.cos((4 * h_bar_prime - 63) * DEG_TO_RAD);

  const delta_theta =
    30 *
    Math.exp(
      -Math.pow((h_bar_prime - 275) / 25, 2)
    );

  const C_bar_prime7 = Math.pow(C_bar_prime, 7);
  const R_C = 2 * Math.sqrt(C_bar_prime7 / (C_bar_prime7 + twentyFive7));

  const L_term = Math.pow(L_bar_prime - 50, 2);
  const S_L = 1 + (0.015 * L_term) / Math.sqrt(20 + L_term);
  const S_C = 1 + 0.045 * C_bar_prime;
  const S_H = 1 + 0.015 * C_bar_prime * T;

  const R_T = -Math.sin(2 * delta_theta * DEG_TO_RAD) * R_C;

  const termL = delta_L_prime / (kL * S_L);
  const termC = delta_C_prime / (kC * S_C);
  const termH = delta_H_prime / (kH * S_H);

  const deltaE = Math.sqrt(
    termL * termL +
      termC * termC +
      termH * termH +
      R_T * termC * termH
  );

  return deltaE;
}

/**
 * Standard literature reference values for VITA Classical shade tabs
 * Reference: Paravina et al., Hassel et al., Kim et al.
 * Measured under D65 / 2° observer, specular component included (SCI).
 */
export const VITA_CLASSICAL_REFERENCE_TABS: ReferenceShadeTab[] = [
  { shade: 'A1', L: 78.4, a: 1.3, b: 14.8, group: 'A', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'A2', L: 75.8, a: 2.0, b: 17.5, group: 'A', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'A3', L: 74.2, a: 2.8, b: 20.1, group: 'A', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'A3.5', L: 71.0, a: 3.6, b: 22.4, group: 'A', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'A4', L: 66.8, a: 4.2, b: 23.5, group: 'A', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'B1', L: 79.5, a: 0.5, b: 13.0, group: 'B', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'B2', L: 77.2, a: 1.1, b: 17.0, group: 'B', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'B3', L: 73.1, a: 2.2, b: 21.6, group: 'B', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'B4', L: 70.8, a: 2.9, b: 23.8, group: 'B', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'C1', L: 74.5, a: 0.8, b: 12.2, group: 'C', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'C2', L: 71.9, a: 1.6, b: 15.8, group: 'C', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'C3', L: 68.2, a: 2.0, b: 17.6, group: 'C', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'C4', L: 64.5, a: 2.4, b: 19.5, group: 'C', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'D2', L: 75.2, a: 0.9, b: 14.1, group: 'D', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'D3', L: 72.5, a: 1.8, b: 18.2, group: 'D', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
  { shade: 'D4', L: 71.0, a: 2.2, b: 19.8, group: 'D', literatureSource: 'Hassel et al. / Paravina et al. (D65/2°)' },
];

/**
 * Finds reference shade tabs ranked by CIEDE2000 colour distance
 */
export function rankReferenceShades(sampleLab: LabColor): Array<{
  shade: string;
  deltaE76: number;
  deltaE00: number;
  tab: ReferenceShadeTab;
}> {
  return VITA_CLASSICAL_REFERENCE_TABS.map((tab) => {
    const tabLab: LabColor = { L: tab.L, a: tab.a, b: tab.b };
    return {
      shade: tab.shade,
      deltaE76: Number(deltaE76(sampleLab, tabLab).toFixed(2)),
      deltaE00: Number(deltaE00(sampleLab, tabLab).toFixed(2)),
      tab,
    };
  }).sort((a, b) => a.deltaE00 - b.deltaE00);
}
