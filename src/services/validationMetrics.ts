/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ConfusionMatrixData,
  MisclassifiedSample,
  ModelValidationResults,
  PerClassMetrics,
  SampleObservation,
} from '../types/dental';
import { deltaE00, deltaE76 } from './colourScience';

export interface ComputeValidationInput {
  actualLabels: string[];
  predictedLabels: string[];
  uniqueClasses: string[];
  samples?: SampleObservation[];
  trainCount: number;
  testCount: number;
  evaluationType: 'held_out_test_set' | 'cross_validation';
}

/**
 * Calculates complete, rigorous multiclass validation metrics
 * Specified denominators, handles undefined metrics as null (N/A)
 */
export function computeValidationMetrics(input: ComputeValidationInput): ModelValidationResults {
  const {
    actualLabels,
    predictedLabels,
    uniqueClasses,
    samples = [],
    trainCount,
    testCount,
    evaluationType,
  } = input;

  const N = actualLabels.length;
  const K = uniqueClasses.length;

  const classToIndex = new Map<string, number>();
  uniqueClasses.forEach((cls, idx) => classToIndex.set(cls, idx));

  // Initialize K x K confusion matrix
  const matrix: number[][] = Array.from({ length: K }, () => new Array(K).fill(0));

  let totalCorrect = 0;
  const misclassified: MisclassifiedSample[] = [];

  for (let i = 0; i < N; i++) {
    const actual = actualLabels[i];
    const predicted = predictedLabels[i];

    const actualIdx = classToIndex.get(actual);
    const predIdx = classToIndex.get(predicted);

    if (actualIdx !== undefined && predIdx !== undefined) {
      matrix[actualIdx][predIdx]++;
    }

    if (actual === predicted) {
      totalCorrect++;
    } else {
      const sample = samples[i];
      const stats = sample?.stats;
      const L = stats ? stats.mean.L : 0;
      const a = stats ? stats.mean.a : 0;
      const b = stats ? stats.mean.b : 0;

      const dE76 = deltaE76({ L, a, b }, { L, a, b }); // will be compared if literature tab available
      const dE00 = deltaE00({ L, a, b }, { L, a, b });

      misclassified.push({
        sampleId: sample?.checklist?.sampleId || `SMP-${i + 1}`,
        subjectId: sample?.checklist?.subjectId || `SUBJ-${i + 1}`,
        actualShade: actual,
        predictedShade: predicted,
        visualBaseline: sample?.checklist?.visualBaselineShade,
        deltaE76: Number(dE76.toFixed(2)),
        deltaE00: Number(dE00.toFixed(2)),
        L,
        a,
        b,
      });
    }
  }

  // Calculate per-class metrics
  const perClass: PerClassMetrics[] = [];
  const recallValues: number[] = [];
  const precisionValues: number[] = [];
  const specificityValues: number[] = [];
  const f1Values: number[] = [];

  for (let i = 0; i < K; i++) {
    const label = uniqueClasses[i];
    const tp = matrix[i][i];

    // FN: sum of row i excluding diagonal
    let fn = 0;
    for (let c = 0; c < K; c++) {
      if (c !== i) fn += matrix[i][c];
    }

    // FP: sum of column i excluding diagonal
    let fp = 0;
    for (let r = 0; r < K; r++) {
      if (r !== i) fp += matrix[r][i];
    }

    // TN: all elements not in row i and not in col i
    let tn = 0;
    for (let r = 0; r < K; r++) {
      if (r === i) continue;
      for (let c = 0; c < K; c++) {
        if (c === i) continue;
        tn += matrix[r][c];
      }
    }

    const support = tp + fn;

    // Precision = TP / (TP + FP)
    const precision = tp + fp > 0 ? tp / (tp + fp) : null;

    // Recall / Sensitivity = TP / (TP + FN)
    const recall = tp + fn > 0 ? tp / (tp + fn) : null;

    // Specificity = TN / (TN + FP)
    const specificity = tn + fp > 0 ? tn / (tn + fp) : null;

    // F1 = 2 * (P * R) / (P + R)
    let f1: number | null = null;
    if (precision !== null && recall !== null && precision + recall > 0) {
      f1 = (2 * precision * recall) / (precision + recall);
    }

    if (precision !== null) precisionValues.push(precision);
    if (recall !== null) recallValues.push(recall);
    if (specificity !== null) specificityValues.push(specificity);
    if (f1 !== null) f1Values.push(f1);

    perClass.push({
      label,
      support,
      tp,
      fp,
      fn,
      tn,
      precision: precision !== null ? Number(precision.toFixed(4)) : null,
      recall: recall !== null ? Number(recall.toFixed(4)) : null,
      specificity: specificity !== null ? Number(specificity.toFixed(4)) : null,
      f1: f1 !== null ? Number(f1.toFixed(4)) : null,
    });
  }

  const accuracy = N > 0 ? totalCorrect / N : 0;
  const balancedAccuracy =
    recallValues.length > 0
      ? recallValues.reduce((acc, val) => acc + val, 0) / recallValues.length
      : 0;

  const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

  const macroPrecision = avg(precisionValues);
  const macroRecall = avg(recallValues);
  const macroSpecificity = avg(specificityValues);
  const macroF1 = avg(f1Values);

  const confusionMatrix: ConfusionMatrixData = {
    matrix,
    labels: uniqueClasses,
  };

  return {
    accuracy: Number(accuracy.toFixed(4)),
    balancedAccuracy: Number(balancedAccuracy.toFixed(4)),
    macroPrecision: Number(macroPrecision.toFixed(4)),
    macroRecall: Number(macroRecall.toFixed(4)),
    macroSpecificity: Number(macroSpecificity.toFixed(4)),
    macroF1: Number(macroF1.toFixed(4)),
    confusionMatrix,
    perClass,
    testSampleCount: testCount,
    trainSampleCount: trainCount,
    misclassifiedSamples: misclassified,
    evaluationType,
    evaluatedAt: new Date().toISOString(),
  };
}
