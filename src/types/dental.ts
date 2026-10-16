/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShadeSystem = 'VITA_CLASSICAL' | 'VITA_3D_MASTER' | 'CUSTOM';

export type LightingCondition =
  | 'ring_flash'
  | 'twin_flash'
  | 'operatory_led'
  | 'ambient_daylight'
  | 'studio_diffused';

export type TriState = 'yes' | 'no' | 'unknown';

export type SampleType = 'natural_tooth' | 'shade_tab' | 'dental_material';

export type ReferenceMethod =
  | 'spectrophotometer'
  | 'shade_guide_visual_consensus'
  | 'digital_shade_analyzer'
  | 'tab_label';

export interface StandardisationChecklist {
  deviceModel: string;
  distanceCm: number;
  lightingCondition: LightingCondition;
  crossPolarizedFilter: boolean;
  neutralGreyCardPresent: boolean;
  colourReferenceChartPresent: boolean;
  exposureLocked: TriState;
  imageEdited: TriState;
  sampleType: SampleType;
  sampleId: string;
  subjectId: string;
  toothNumber: string;
  operator: string;
  acquisitionDate: string;
  referenceShade: string;
  referenceMethod: ReferenceMethod;
  visualBaselineShade?: string;
  notes?: string;
}

export interface LabColor {
  L: number;
  a: number;
  b: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface ColourStatistics {
  mean: { L: number; a: number; b: number };
  rgbMean: { r: number; g: number; b: number };
  median: { L: number; a: number; b: number };
  std: { L: number; a: number; b: number };
  rgbStd: { r: number; g: number; b: number };
  p10: { L: number; a: number; b: number };
  p25: { L: number; a: number; b: number };
  p75: { L: number; a: number; b: number };
  p90: { L: number; a: number; b: number };
  iqr: { L: number; a: number; b: number };
  pixelCount: number;
  glareExclusionPercent: number;
  histogramLab?: {
    L: number[];
    a: number[];
    b: number[];
  };
  sampledPoints?: Array<{ L: number; a: number; b: number; hex: string }>;
}

export interface RoiBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SampleObservation {
  id: string;
  checklist: StandardisationChecklist;
  roi: RoiBounds;
  imageDataUrl?: string; // thumbnail
  stats: ColourStatistics;
  featureVector: number[];
  createdAt: string;
  isValidationSample?: boolean;
}

export interface SvmHyperparameters {
  kernel: 'RBF' | 'LINEAR' | 'POLYNOMIAL';
  cost: number; // C
  gamma: number | 'auto';
  degree?: number;
  probabilityEstimates: boolean;
  testSplitRatio: number; // e.g. 0.25
  kFold: number; // e.g. 5
}

export interface ScalingParameters {
  means: number[];
  stds: number[];
  featureNames: string[];
}

export interface ConfusionMatrixData {
  matrix: number[][]; // rows: true class, cols: predicted class
  labels: string[];
}

export interface PerClassMetrics {
  label: string;
  support: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
  precision: number | null; // null if tp + fp == 0
  recall: number | null; // null if tp + fn == 0
  specificity: number | null; // null if tn + fp == 0
  f1: number | null;
}

export interface MisclassifiedSample {
  sampleId: string;
  subjectId: string;
  actualShade: string;
  predictedShade: string;
  visualBaseline?: string;
  deltaE76: number;
  deltaE00: number;
  L: number;
  a: number;
  b: number;
}

export interface ModelValidationResults {
  accuracy: number;
  balancedAccuracy: number;
  macroPrecision: number;
  macroRecall: number;
  macroSpecificity: number;
  macroF1: number;
  confusionMatrix: ConfusionMatrixData;
  perClass: PerClassMetrics[];
  testSampleCount: number;
  trainSampleCount: number;
  misclassifiedSamples: MisclassifiedSample[];
  evaluationType: 'held_out_test_set' | 'cross_validation';
  evaluatedAt: string;
}

export interface TrainedModel {
  id: string;
  version: string;
  createdAt: string;
  hyperparameters: SvmHyperparameters;
  classLabels: string[]; // mapped shade labels
  scalingParams: ScalingParameters;
  serializedModel: string;
  datasetId: string;
  sampleCount: number;
  validationMetrics: ModelValidationResults | null;
  featureNames: string[];
}

export interface ReferenceShadeTab {
  shade: string;
  L: number;
  a: number;
  b: number;
  group: string; // 'A', 'B', 'C', 'D'
  literatureSource: string;
  notes?: string;
}

export interface PredictionResult {
  predictedShade: string;
  probabilities?: Array<{ shade: string; probability: number }>;
  isOOD: boolean;
  oodDistance: number;
  warnings: string[];
  colorStats: ColourStatistics;
  standardisationFlags: string[];
  visualBaselineShade?: string;
  visualBaselineMatch?: boolean;
  modelVersion: string;
  closestReferenceShades: Array<{
    shade: string;
    deltaE76: number;
    deltaE00: number;
    tab: ReferenceShadeTab;
  }>;
  evaluatedAt: string;
}
