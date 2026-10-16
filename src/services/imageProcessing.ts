/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ColourStatistics,
  LabColor,
  RoiBounds,
  StandardisationChecklist,
} from '../types/dental';
import { labToHex, sRgbToLab } from './colourScience';

export interface RoiExtractionOptions {
  excludeGlare?: boolean;
  glareThreshold?: number; // 0..255 (default 248)
  sampleStep?: number; // 1 for all pixels, or 2 for high-res fast sampling
}

/**
 * Calculates a specific percentile from a pre-sorted numeric array
 */
function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Extracts and calculates comprehensive CIELAB & RGB statistics from a specified ROI
 */
export function extractColourFromCanvas(
  ctx: CanvasRenderingContext2D,
  roi: RoiBounds,
  options: RoiExtractionOptions = {}
): ColourStatistics {
  const { excludeGlare = true, glareThreshold = 248, sampleStep = 1 } = options;

  const rx = Math.max(0, Math.floor(roi.x));
  const ry = Math.max(0, Math.floor(roi.y));
  const rw = Math.max(1, Math.floor(roi.width));
  const rh = Math.max(1, Math.floor(roi.height));

  const imgData = ctx.getImageData(rx, ry, rw, rh);
  const data = imgData.data;

  const validLabs: LabColor[] = [];
  const validRgbs: Array<{ r: number; g: number; b: number }> = [];

  let totalSampled = 0;
  let glareCount = 0;

  for (let y = 0; y < rh; y += sampleStep) {
    for (let x = 0; x < rw; x += sampleStep) {
      const idx = (y * rw + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      // Exclude transparent pixels
      if (a < 50) continue;

      totalSampled++;

      // Specular glare detection
      const isGlare = r >= glareThreshold && g >= glareThreshold && b >= glareThreshold;
      if (isGlare) {
        glareCount++;
        if (excludeGlare) {
          continue;
        }
      }

      const lab = sRgbToLab(r, g, b);
      validLabs.push(lab);
      validRgbs.push({ r, g, b });
    }
  }

  // Fallback if all pixels were filtered as glare or transparent
  if (validLabs.length === 0) {
    const fallbackLab = sRgbToLab(200, 185, 160);
    return {
      mean: { L: fallbackLab.L, a: fallbackLab.a, b: fallbackLab.b },
      rgbMean: { r: 200, g: 185, b: 160 },
      median: { L: fallbackLab.L, a: fallbackLab.a, b: fallbackLab.b },
      std: { L: 0, a: 0, b: 0 },
      rgbStd: { r: 0, g: 0, b: 0 },
      p10: { L: fallbackLab.L, a: fallbackLab.a, b: fallbackLab.b },
      p25: { L: fallbackLab.L, a: fallbackLab.a, b: fallbackLab.b },
      p75: { L: fallbackLab.L, a: fallbackLab.a, b: fallbackLab.b },
      p90: { L: fallbackLab.L, a: fallbackLab.a, b: fallbackLab.b },
      iqr: { L: 0, a: 0, b: 0 },
      pixelCount: 0,
      glareExclusionPercent: 100,
    };
  }

  const N = validLabs.length;
  let sumL = 0,
    sumA = 0,
    sumB = 0;
  let sumR = 0,
    sumG = 0,
    sumBlue = 0;

  for (let i = 0; i < N; i++) {
    const lab = validLabs[i];
    const rgb = validRgbs[i];
    sumL += lab.L;
    sumA += lab.a;
    sumB += lab.b;
    sumR += rgb.r;
    sumG += rgb.g;
    sumBlue += rgb.b;
  }

  const meanL = sumL / N;
  const meanA = sumA / N;
  const meanB = sumB / N;
  const meanR = sumR / N;
  const meanG = sumG / N;
  const meanBlue = sumBlue / N;

  let varL = 0,
    varA = 0,
    varB = 0;
  let varR = 0,
    varG = 0,
    varBlue = 0;

  for (let i = 0; i < N; i++) {
    varL += Math.pow(validLabs[i].L - meanL, 2);
    varA += Math.pow(validLabs[i].a - meanA, 2);
    varB += Math.pow(validLabs[i].b - meanB, 2);
    varR += Math.pow(validRgbs[i].r - meanR, 2);
    varG += Math.pow(validRgbs[i].g - meanG, 2);
    varBlue += Math.pow(validRgbs[i].b - meanBlue, 2);
  }

  const stdL = Math.sqrt(varL / N);
  const stdA = Math.sqrt(varA / N);
  const stdB = Math.sqrt(varB / N);
  const stdR = Math.sqrt(varR / N);
  const stdG = Math.sqrt(varG / N);
  const stdBlue = Math.sqrt(varBlue / N);

  // Extract arrays and sort for percentiles
  const Ls: number[] = validLabs.map((l) => l.L).sort((a, b) => a - b);
  const As: number[] = validLabs.map((l) => l.a).sort((a, b) => a - b);
  const Bs: number[] = validLabs.map((l) => l.b).sort((a, b) => a - b);

  const p10 = {
    L: calculatePercentile(Ls, 10),
    a: calculatePercentile(As, 10),
    b: calculatePercentile(Bs, 10),
  };
  const p25 = {
    L: calculatePercentile(Ls, 25),
    a: calculatePercentile(As, 25),
    b: calculatePercentile(Bs, 25),
  };
  const median = {
    L: calculatePercentile(Ls, 50),
    a: calculatePercentile(As, 50),
    b: calculatePercentile(Bs, 50),
  };
  const p75 = {
    L: calculatePercentile(Ls, 75),
    a: calculatePercentile(As, 75),
    b: calculatePercentile(Bs, 75),
  };
  const p90 = {
    L: calculatePercentile(Ls, 90),
    a: calculatePercentile(As, 90),
    b: calculatePercentile(Bs, 90),
  };

  const iqr = {
    L: p75.L - p25.L,
    a: p75.a - p25.a,
    b: p75.b - p25.b,
  };

  const glareExclusionPercent = totalSampled > 0 ? (glareCount / totalSampled) * 100 : 0;

  // Subsample 40 points for visual scatter
  const sampledPoints: Array<{ L: number; a: number; b: number; hex: string }> = [];
  const sampleStride = Math.max(1, Math.floor(N / 40));
  for (let i = 0; i < N && sampledPoints.length < 40; i += sampleStride) {
    sampledPoints.push({
      L: validLabs[i].L,
      a: validLabs[i].a,
      b: validLabs[i].b,
      hex: labToHex(validLabs[i].L, validLabs[i].a, validLabs[i].b),
    });
  }

  // Construct histogram bins for L*, a*, b* (10 bins each)
  const buildHist = (arr: number[], min: number, max: number, bins: number = 10) => {
    const counts = new Array(bins).fill(0);
    const range = Math.max(0.001, max - min);
    for (let i = 0; i < arr.length; i++) {
      const idx = Math.min(bins - 1, Math.max(0, Math.floor(((arr[i] - min) / range) * bins)));
      counts[idx]++;
    }
    return counts;
  };

  const histogramLab = {
    L: buildHist(Ls, 50, 95, 10),
    a: buildHist(As, -5, 15, 10),
    b: buildHist(Bs, 5, 35, 10),
  };

  return {
    mean: {
      L: Number(meanL.toFixed(3)),
      a: Number(meanA.toFixed(3)),
      b: Number(meanB.toFixed(3)),
    },
    rgbMean: {
      r: Number(meanR.toFixed(1)),
      g: Number(meanG.toFixed(1)),
      b: Number(meanBlue.toFixed(1)),
    },
    median: {
      L: Number(median.L.toFixed(3)),
      a: Number(median.a.toFixed(3)),
      b: Number(median.b.toFixed(3)),
    },
    std: {
      L: Number(stdL.toFixed(3)),
      a: Number(stdA.toFixed(3)),
      b: Number(stdB.toFixed(3)),
    },
    rgbStd: {
      r: Number(stdR.toFixed(2)),
      g: Number(stdG.toFixed(2)),
      b: Number(stdBlue.toFixed(2)),
    },
    p10: {
      L: Number(p10.L.toFixed(3)),
      a: Number(p10.a.toFixed(3)),
      b: Number(p10.b.toFixed(3)),
    },
    p25: {
      L: Number(p25.L.toFixed(3)),
      a: Number(p25.a.toFixed(3)),
      b: Number(p25.b.toFixed(3)),
    },
    p75: {
      L: Number(p75.L.toFixed(3)),
      a: Number(p75.a.toFixed(3)),
      b: Number(p75.b.toFixed(3)),
    },
    p90: {
      L: Number(p90.L.toFixed(3)),
      a: Number(p90.a.toFixed(3)),
      b: Number(p90.b.toFixed(3)),
    },
    iqr: {
      L: Number(iqr.L.toFixed(3)),
      a: Number(iqr.a.toFixed(3)),
      b: Number(iqr.b.toFixed(3)),
    },
    pixelCount: N,
    glareExclusionPercent: Number(glareExclusionPercent.toFixed(1)),
    histogramLab,
    sampledPoints,
  };
}

/**
 * Standard feature names for 12-dimensional statistical CIELAB vector
 */
export const FEATURE_NAMES: string[] = [
  'L_mean',
  'a_mean',
  'b_mean',
  'L_std',
  'a_std',
  'b_std',
  'L_median',
  'a_median',
  'b_median',
  'L_iqr',
  'a_iqr',
  'b_iqr',
];

/**
 * Builds standard 12-dimensional numerical feature vector from ColourStatistics
 */
export function buildFeatureVector(stats: ColourStatistics): number[] {
  return [
    stats.mean.L,
    stats.mean.a,
    stats.mean.b,
    stats.std.L,
    stats.std.a,
    stats.std.b,
    stats.median.L,
    stats.median.a,
    stats.median.b,
    stats.iqr.L,
    stats.iqr.a,
    stats.iqr.b,
  ];
}

/**
 * Evaluates standardisation checklist and produces warning flags
 */
export function evaluateStandardisation(
  checklist: StandardisationChecklist,
  stats?: ColourStatistics
): string[] {
  const flags: string[] = [];

  if (!checklist.crossPolarizedFilter) {
    flags.push('No cross-polarising filter — specular highlights and enamel reflections may introduce chromatic error');
  }

  if (!checklist.neutralGreyCardPresent && !checklist.colourReferenceChartPresent) {
    flags.push('No neutral-grey card or colour reference chart present for white-balance verification');
  }

  if (checklist.exposureLocked !== 'yes') {
    flags.push('Smartphone camera exposure / white-balance lock was not confirmed');
  }

  if (checklist.imageEdited === 'yes') {
    flags.push('Image has been edited or post-processed — tone mapping may distort colour values');
  }

  if (checklist.distanceCm < 10 || checklist.distanceCm > 35) {
    flags.push(`Non-standard working distance (${checklist.distanceCm} cm). Standard dental macro range is 15–25 cm`);
  }

  if (stats && stats.pixelCount < 100) {
    flags.push('Selected ROI contains fewer than 100 valid pixels — region may be too small for stable statistics');
  }

  if (stats && stats.glareExclusionPercent > 10) {
    flags.push(`High specular glare detected (${stats.glareExclusionPercent}% pixels excluded) — consider re-angling`);
  }

  return flags;
}
