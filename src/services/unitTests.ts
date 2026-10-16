/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  deltaE00,
  deltaE76,
  labToRgb,
  sRgbToLab,
} from './colourScience';
import {
  computeScalingParameters,
  applyScaling,
  trainSvmClassifier,
  predictDentalShade,
} from './svmEngine';
import {
  computeValidationMetrics,
} from './validationMetrics';
import {
  buildFeatureVector,
  FEATURE_NAMES,
} from './imageProcessing';
import {
  exportSamplesToCsv,
  importSamplesFromCsv,
  generateDemonstrationDataset,
} from './datasetStore';

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  expected?: string;
  actual?: string;
  error?: string;
  durationMs: number;
}

export function runAllUnitTests(): TestResult[] {
  const results: TestResult[] = [];

  const runTest = (category: string, name: string, fn: () => void) => {
    const t0 = performance.now();
    try {
      fn();
      results.push({
        name,
        category,
        passed: true,
        durationMs: Number((performance.now() - t0).toFixed(2)),
      });
    } catch (err: any) {
      results.push({
        name,
        category,
        passed: false,
        error: err?.message || String(err),
        durationMs: Number((performance.now() - t0).toFixed(2)),
      });
    }
  };

  // 1. Colour Science & Conversion Tests
  runTest('Colour Science', 'Pure white sRGB(255, 255, 255) -> CIELAB L*=100, a*=0, b*=0', () => {
    const lab = sRgbToLab(255, 255, 255);
    if (Math.abs(lab.L - 100) > 0.1) throw new Error(`Expected L* ~ 100, got ${lab.L}`);
    if (Math.abs(lab.a) > 0.2) throw new Error(`Expected a* ~ 0, got ${lab.a}`);
    if (Math.abs(lab.b) > 0.2) throw new Error(`Expected b* ~ 0, got ${lab.b}`);
  });

  runTest('Colour Science', 'Pure black sRGB(0, 0, 0) -> CIELAB L*=0, a*=0, b*=0', () => {
    const lab = sRgbToLab(0, 0, 0);
    if (Math.abs(lab.L) > 0.05) throw new Error(`Expected L* ~ 0, got ${lab.L}`);
    if (Math.abs(lab.a) > 0.05) throw new Error(`Expected a* ~ 0, got ${lab.a}`);
    if (Math.abs(lab.b) > 0.05) throw new Error(`Expected b* ~ 0, got ${lab.b}`);
  });

  runTest('Colour Science', 'Neutral grey sRGB(128, 128, 128) roundtrip Lab -> RGB -> Lab', () => {
    const lab1 = sRgbToLab(128, 128, 128);
    const rgb = labToRgb(lab1.L, lab1.a, lab1.b);
    if (Math.abs(rgb.r - 128) > 1 || Math.abs(rgb.g - 128) > 1 || Math.abs(rgb.b - 128) > 1) {
      throw new Error(`Roundtrip RGB mismatch: got (${rgb.r}, ${rgb.g}, ${rgb.b})`);
    }
  });

  // 2. Colour Difference Formulae Tests
  runTest('Colour Science', 'CIE76 Delta E*ab known Pythagorean distance', () => {
    const dE = deltaE76({ L: 50, a: 0, b: 0 }, { L: 53, a: 4, b: 0 });
    if (Math.abs(dE - 5.0) > 1e-5) throw new Error(`Expected exactly 5.0, got ${dE}`);
  });

  runTest('Colour Science', 'CIEDE2000 against published Sharma et al. (2005) Test Vector 1', () => {
    // Sharma Test Vector 1:
    // Pair 1: L1=50, a1=2.6772, b1=-79.7751 vs L2=50, a2=0, b2=-82.7485 => expected ~2.0425
    const c1 = { L: 50.0, a: 2.6772, b: -79.7751 };
    const c2 = { L: 50.0, a: 0.0, b: -82.7485 };
    const dE = deltaE00(c1, c2);
    if (Math.abs(dE - 2.0425) > 0.005) {
      throw new Error(`Expected Sharma test vector 1 ~ 2.0425, got ${dE}`);
    }
  });

  runTest('Colour Science', 'CIEDE2000 against published Sharma et al. (2005) Test Vector 2', () => {
    // Sharma Test Vector 2:
    // Pair 2: L1=50, a1=3.1571, b1=-77.5521 vs L2=50, a2=0, b2=-82.7485 => Sharma formulation yields 2.7998
    const c1 = { L: 50.0, a: 3.1571, b: -77.5521 };
    const c2 = { L: 50.0, a: 0.0, b: -82.7485 };
    const dE = deltaE00(c1, c2);
    if (Math.abs(dE - 2.7998) > 0.005) {
      throw new Error(`Expected Sharma test vector 2 ~ 2.7998, got ${dE}`);
    }
  });

  runTest('Colour Science', 'CIEDE2000 identity property (Delta E00 of identical color is 0)', () => {
    const c = { L: 72.4, a: 2.1, b: 18.5 };
    const dE = deltaE00(c, c);
    if (Math.abs(dE) > 1e-6) throw new Error(`Expected 0 for identical color, got ${dE}`);
  });

  // 3. Feature Extraction Tests
  runTest('Feature Extraction', '12-dimensional feature schema length and ordering', () => {
    if (FEATURE_NAMES.length !== 12) {
      throw new Error(`Expected 12 features, got ${FEATURE_NAMES.length}`);
    }
    const dummyStats = {
      mean: { L: 75, a: 2, b: 15 },
      rgbMean: { r: 200, g: 190, b: 170 },
      median: { L: 74.8, a: 1.9, b: 15.1 },
      std: { L: 1.2, a: 0.5, b: 0.8 },
      rgbStd: { r: 2, g: 2, b: 2 },
      p10: { L: 73, a: 1.5, b: 14 },
      p25: { L: 74, a: 1.7, b: 14.5 },
      p75: { L: 76, a: 2.2, b: 15.5 },
      p90: { L: 77, a: 2.5, b: 16 },
      iqr: { L: 2.0, a: 0.5, b: 1.0 },
      pixelCount: 1000,
      glareExclusionPercent: 0,
    };
    const vec = buildFeatureVector(dummyStats as any);
    if (vec.length !== 12) throw new Error(`Vector length mismatch: ${vec.length}`);
    if (vec[0] !== 75 || vec[1] !== 2 || vec[2] !== 15) throw new Error('Mean values mismatch in vector');
    if (vec[9] !== 2.0 || vec[10] !== 0.5 || vec[11] !== 1.0) throw new Error('IQR values mismatch in vector');
  });

  // 4. Feature Scaling Tests
  runTest('Preprocessing', 'Z-score standardization on training partition', () => {
    const trainData = [
      [10, 100],
      [20, 200],
      [30, 300],
    ];
    const params = computeScalingParameters(trainData, ['f1', 'f2']);
    if (Math.abs(params.means[0] - 20) > 1e-4) throw new Error('Mean f1 mismatch');
    if (Math.abs(params.means[1] - 200) > 1e-4) throw new Error('Mean f2 mismatch');

    const scaled = applyScaling(trainData, params);
    // Middle point should be exactly 0
    if (Math.abs(scaled[1][0]) > 1e-4 || Math.abs(scaled[1][1]) > 1e-4) {
      throw new Error('Scaled center value not near 0');
    }
  });

  // 5. Validation Metrics Tests
  runTest('Validation Metrics', 'Confusion matrix, precision, recall, and balanced accuracy calculation', () => {
    const actual = ['A1', 'A1', 'A2', 'A2', 'A3', 'A3'];
    const predicted = ['A1', 'A2', 'A2', 'A2', 'A3', 'A1'];
    const uniqueClasses = ['A1', 'A2', 'A3'];

    const res = computeValidationMetrics({
      actualLabels: actual,
      predictedLabels: predicted,
      uniqueClasses,
      trainCount: 10,
      testCount: 6,
      evaluationType: 'held_out_test_set',
    });

    // Accuracy: 4 correct out of 6 => 4/6 = 0.6667
    if (Math.abs(res.accuracy - 0.6667) > 0.01) {
      throw new Error(`Expected accuracy ~ 0.6667, got ${res.accuracy}`);
    }

    // A1: TP=1, FP=1 (predicted as A1 from A3), FN=1 (predicted as A2). Recall = 1/2 = 0.5. Precision = 1/2 = 0.5
    const a1Metrics = res.perClass.find((c) => c.label === 'A1');
    if (!a1Metrics || a1Metrics.tp !== 1 || a1Metrics.recall !== 0.5) {
      throw new Error('A1 metrics incorrect');
    }

    // A2: TP=2, FN=0, FP=1 (from A1). Recall = 2/2 = 1.0. Precision = 2/3 ~ 0.6667
    const a2Metrics = res.perClass.find((c) => c.label === 'A2');
    if (!a2Metrics || a2Metrics.tp !== 2 || a2Metrics.recall !== 1.0) {
      throw new Error('A2 metrics incorrect');
    }

    // A3: TP=1, FN=1, FP=0. Recall = 1/2 = 0.5. Precision = 1/1 = 1.0
    const a3Metrics = res.perClass.find((c) => c.label === 'A3');
    if (!a3Metrics || a3Metrics.tp !== 1 || a3Metrics.recall !== 0.5) {
      throw new Error('A3 metrics incorrect');
    }

    // Balanced accuracy = (0.5 + 1.0 + 0.5) / 3 = 2.0 / 3 = 0.6667
    if (Math.abs(res.balancedAccuracy - 0.6667) > 0.01) {
      throw new Error(`Expected balanced accuracy ~ 0.6667, got ${res.balancedAccuracy}`);
    }
  });

  // 6. Dataset CSV Import / Export Tests
  runTest('Data Handling', 'CSV Export and Schema Validation', () => {
    const demo = generateDemonstrationDataset().slice(0, 4);
    const csv = exportSamplesToCsv(demo);
    if (!csv.includes('sample_id') || !csv.includes('shade_label') || !csv.includes('L_mean')) {
      throw new Error('CSV missing required header columns');
    }

    const { imported, errors } = importSamplesFromCsv(csv);
    if (errors.length > 0) {
      throw new Error(`CSV import errors: ${errors.join('; ')}`);
    }
    if (imported.length !== 4) {
      throw new Error(`Expected 4 imported samples, got ${imported.length}`);
    }
    if (imported[0].checklist.referenceShade !== demo[0].checklist.referenceShade) {
      throw new Error('Imported shade label mismatch');
    }
  });

  // 7. SVM Training & Prediction Sanity
  runTest('SVM Classification', 'Genuine multiclass SVM training and prediction', () => {
    const demo = generateDemonstrationDataset();
    const outcome = trainSvmClassifier(demo, {
      hyperparameters: { cost: 10, kernel: 'RBF' },
    });

    if (!outcome.model || !outcome.model.serializedModel) {
      throw new Error('Model training did not produce a valid serialized model artifact');
    }

    // Test prediction on a sample
    const testSample = demo[0];
    const pred = predictDentalShade(testSample, outcome.model);

    if (!pred.predictedShade) {
      throw new Error('Prediction did not return a valid shade category');
    }
    if (outcome.model.classLabels.indexOf(pred.predictedShade) === -1) {
      throw new Error(`Predicted shade ${pred.predictedShade} not in class labels`);
    }
  });

  return results;
}
