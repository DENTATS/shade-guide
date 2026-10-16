/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import svmAsm from 'libsvm-js/asm.js';
import {
  ModelValidationResults,
  PredictionResult,
  SampleObservation,
  ScalingParameters,
  SvmHyperparameters,
  TrainedModel,
} from '../types/dental';
import { rankReferenceShades } from './colourScience';
import { FEATURE_NAMES } from './imageProcessing';
import { computeValidationMetrics } from './validationMetrics';

// Kernel mappings for libsvm
const KERNEL_MAP = {
  LINEAR: 0,
  POLYNOMIAL: 1,
  RBF: 2,
};

/**
 * Calculates scaling parameters (mean and standard deviation) strictly from training data
 */
export function computeScalingParameters(
  trainingVectors: number[][],
  featureNames: string[] = FEATURE_NAMES
): ScalingParameters {
  const numFeatures = featureNames.length;
  const numSamples = trainingVectors.length;

  const means: number[] = new Array(numFeatures).fill(0);
  const stds: number[] = new Array(numFeatures).fill(0);

  for (let j = 0; j < numFeatures; j++) {
    let sum = 0;
    for (let i = 0; i < numSamples; i++) {
      sum += trainingVectors[i][j];
    }
    means[j] = sum / numSamples;

    let varSum = 0;
    for (let i = 0; i < numSamples; i++) {
      varSum += Math.pow(trainingVectors[i][j] - means[j], 2);
    }
    const std = Math.sqrt(varSum / numSamples);
    stds[j] = std > 1e-7 ? std : 1.0; // avoid divide by zero
  }

  return { means, stds, featureNames };
}

/**
 * Applies saved Z-score scaling parameters to feature vectors
 */
export function applyScaling(vectors: number[][], params: ScalingParameters): number[][] {
  return vectors.map((vec) =>
    vec.map((val, idx) => {
      const mean = params.means[idx] ?? 0;
      const std = params.stds[idx] ?? 1;
      return (val - mean) / std;
    })
  );
}

/**
 * Applies saved scaling to a single feature vector
 */
export function applyScalingSingle(vec: number[], params: ScalingParameters): number[] {
  return vec.map((val, idx) => {
    const mean = params.means[idx] ?? 0;
    const std = params.stds[idx] ?? 1;
    return (val - mean) / std;
  });
}

export interface TrainSvmOptions {
  hyperparameters?: Partial<SvmHyperparameters>;
  datasetId?: string;
}

export interface TrainingOutcome {
  model: TrainedModel;
  svmInstance: any;
  validationMetrics: ModelValidationResults | null;
  warningMessages: string[];
}

/**
 * Trains a genuine multiclass SVM classifier using libsvm-js
 */
export function trainSvmClassifier(
  samples: SampleObservation[],
  options: TrainSvmOptions = {}
): TrainingOutcome {
  const warningMessages: string[] = [];

  if (samples.length < 4) {
    throw new Error(
      `Insufficient training samples: provided ${samples.length}, minimum required is 4.`
    );
  }

  // Verify numerical integrity
  for (const s of samples) {
    if (!s.featureVector || s.featureVector.length !== FEATURE_NAMES.length) {
      throw new Error(`Sample ${s.id} is missing a valid 12-dimensional feature vector.`);
    }
    for (const val of s.featureVector) {
      if (!Number.isFinite(val)) {
        throw new Error(`Sample ${s.id} contains non-finite numerical feature: ${val}`);
      }
    }
  }

  // Get distinct classes
  const labelSet = new Set<string>();
  samples.forEach((s) => labelSet.add(s.checklist.referenceShade.trim()));
  const classLabels = Array.from(labelSet).sort();

  if (classLabels.length < 2) {
    throw new Error(
      `Multiclass classification requires at least 2 distinct shade categories (found only: ${classLabels.join(', ')}).`
    );
  }

  // Warn if any class has very small support (< 3)
  const classCounts = new Map<string, number>();
  samples.forEach((s) => {
    const lbl = s.checklist.referenceShade.trim();
    classCounts.set(lbl, (classCounts.get(lbl) || 0) + 1);
  });

  classCounts.forEach((count, cls) => {
    if (count < 3) {
      warningMessages.push(`Shade class "${cls}" has only ${count} sample(s). Recommend >= 5 samples per shade class for stable margins.`);
    }
  });

  const hp: SvmHyperparameters = {
    kernel: options.hyperparameters?.kernel || 'RBF',
    cost: options.hyperparameters?.cost ?? 10.0,
    gamma: options.hyperparameters?.gamma ?? 'auto',
    degree: options.hyperparameters?.degree ?? 3,
    probabilityEstimates: false, // libsvm C++ sigmoid fitting can block on small class counts; predictOne is deterministic
    testSplitRatio: options.hyperparameters?.testSplitRatio ?? 0.25,
    kFold: options.hyperparameters?.kFold ?? 5,
  };

  // Grouped / Stratified splitting to prevent subject data leakage
  // If subjects are provided, group by subjectId
  const subjectGroups = new Map<string, SampleObservation[]>();
  samples.forEach((s) => {
    const subj = s.checklist.subjectId || s.id;
    const list = subjectGroups.get(subj) || [];
    list.push(s);
    subjectGroups.set(subj, list);
  });

  const trainSamples: SampleObservation[] = [];
  const testSamples: SampleObservation[] = [];

  // Group split
  const subjects = Array.from(subjectGroups.keys());
  // Shuffle deterministically
  subjects.sort((a, b) => a.localeCompare(b));

  if (subjects.length >= 4 && hp.testSplitRatio > 0) {
    // If multiple subjects, assign ~testSplitRatio of subjects to test set
    const testSubjCount = Math.max(1, Math.floor(subjects.length * hp.testSplitRatio));
    const testSubjectSet = new Set(subjects.slice(0, testSubjCount));

    for (const [subj, subjSamples] of subjectGroups.entries()) {
      if (testSubjectSet.has(subj)) {
        testSamples.push(...subjSamples);
      } else {
        trainSamples.push(...subjSamples);
      }
    }

    // Ensure all training classes have at least 1 sample in train set
    const trainClassSet = new Set(trainSamples.map((s) => s.checklist.referenceShade.trim()));
    if (trainClassSet.size < classLabels.length) {
      // Revert to stratified random split across samples to preserve all classes in training
      trainSamples.length = 0;
      testSamples.length = 0;
      const classMap = new Map<string, SampleObservation[]>();
      samples.forEach((s) => {
        const cls = s.checklist.referenceShade.trim();
        const list = classMap.get(cls) || [];
        list.push(s);
        classMap.set(cls, list);
      });

      for (const [, clsSamples] of classMap.entries()) {
        if (clsSamples.length === 1) {
          trainSamples.push(clsSamples[0]);
        } else {
          const splitIdx = Math.max(1, Math.floor(clsSamples.length * (1 - hp.testSplitRatio)));
          trainSamples.push(...clsSamples.slice(0, splitIdx));
          testSamples.push(...clsSamples.slice(splitIdx));
        }
      }
    }
  } else {
    // Small dataset: train on all, hold out stratified 1 sample per class if count > 1
    const classMap = new Map<string, SampleObservation[]>();
    samples.forEach((s) => {
      const cls = s.checklist.referenceShade.trim();
      const list = classMap.get(cls) || [];
      list.push(s);
      classMap.set(cls, list);
    });

    for (const [, clsSamples] of classMap.entries()) {
      if (clsSamples.length > 2) {
        testSamples.push(clsSamples[clsSamples.length - 1]);
        trainSamples.push(...clsSamples.slice(0, clsSamples.length - 1));
      } else {
        trainSamples.push(...clsSamples);
      }
    }
  }

  // Compute scaling exclusively on trainSamples
  const trainVectors = trainSamples.map((s) => s.featureVector);
  const scalingParams = computeScalingParameters(trainVectors, FEATURE_NAMES);
  const scaledTrainVectors = applyScaling(trainVectors, scalingParams);

  // Map class labels to 0..K-1
  const labelToId = new Map<string, number>();
  classLabels.forEach((label, idx) => labelToId.set(label, idx));

  const trainLabelsNumeric = trainSamples.map((s) =>
    labelToId.get(s.checklist.referenceShade.trim())!
  );

  // Configure libsvm
  const SVM = svmAsm;
  const numFeatures = FEATURE_NAMES.length;
  const gammaVal =
    hp.gamma === 'auto' || typeof hp.gamma !== 'number'
      ? 1 / numFeatures
      : hp.gamma;

  const svmConfig: any = {
    kernel: KERNEL_MAP[hp.kernel] ?? KERNEL_MAP.RBF,
    type: 0, // C_SVC
    cost: hp.cost,
    gamma: gammaVal,
    quiet: true,
  };

  if (hp.kernel === 'POLYNOMIAL' && hp.degree) {
    svmConfig.degree = hp.degree;
  }

  const svmInstance = new SVM(svmConfig);
  svmInstance.train(scaledTrainVectors, trainLabelsNumeric);

  // Evaluate on held-out test partition if available
  let validationMetrics: ModelValidationResults | null = null;
  if (testSamples.length > 0) {
    const testVectors = testSamples.map((s) => s.featureVector);
    const scaledTestVectors = applyScaling(testVectors, scalingParams);
    const predictedNumeric = svmInstance.predict(scaledTestVectors);

    const actualLabels = testSamples.map((s) => s.checklist.referenceShade.trim());
    const predictedLabels = predictedNumeric.map((id: number) => classLabels[id] || 'Unknown');

    validationMetrics = computeValidationMetrics({
      actualLabels,
      predictedLabels,
      uniqueClasses: classLabels,
      samples: testSamples,
      trainCount: trainSamples.length,
      testCount: testSamples.length,
      evaluationType: 'held_out_test_set',
    });
  }

  const serializedModel = svmInstance.serializeModel();

  const modelId = `svm-model-${Date.now()}`;
  const trainedModel: TrainedModel = {
    id: modelId,
    version: `1.0.${Date.now().toString().slice(-4)}`,
    createdAt: new Date().toISOString(),
    hyperparameters: hp,
    classLabels,
    scalingParams,
    serializedModel,
    datasetId: options.datasetId || 'default-dataset',
    sampleCount: samples.length,
    validationMetrics,
    featureNames: FEATURE_NAMES,
  };

  return {
    model: trainedModel,
    svmInstance,
    validationMetrics,
    warningMessages,
  };
}

/**
 * In-memory cache for deserialized SVM instances
 */
const modelCache = new Map<string, any>();

export function getOrLoadSvmInstance(model: TrainedModel): any {
  if (modelCache.has(model.id)) {
    return modelCache.get(model.id);
  }
  const SVM = svmAsm;
  const instance = SVM.load(model.serializedModel);
  modelCache.set(model.id, instance);
  return instance;
}

/**
 * Predicts the shade category for a new observation using a trained SVM model
 */
export function predictDentalShade(
  sample: SampleObservation,
  model: TrainedModel,
  trainingCentroids?: Map<string, number[]>
): PredictionResult {
  const svm = getOrLoadSvmInstance(model);

  // Apply saved scaling
  const scaledVector = applyScalingSingle(sample.featureVector, model.scalingParams);

  // Predict class index
  const predNumeric = svm.predictOne(scaledVector);
  const predictedShade = model.classLabels[predNumeric] || 'Unknown';

  // Calculate Out-of-Distribution (OOD) distance
  // Compute normalized Euclidean distance from centroid of predicted class if known
  let minCentroidDist = 0;
  let isOOD = false;
  const warnings: string[] = [];

  if (trainingCentroids && trainingCentroids.has(predictedShade)) {
    const centroid = trainingCentroids.get(predictedShade)!;
    let sumSq = 0;
    for (let i = 0; i < scaledVector.length; i++) {
      sumSq += Math.pow(scaledVector[i] - centroid[i], 2);
    }
    minCentroidDist = Number(Math.sqrt(sumSq).toFixed(2));
    // Threshold in normalized space (12 dims, 3.5 std dev threshold)
    if (minCentroidDist > 4.5) {
      isOOD = true;
      warnings.push(
        `Feature vector distance (${minCentroidDist}) is high relative to the training distribution. Prediction reliability is low.`
      );
    }
  }

  // Standardisation checklist warnings
  const standardisationFlags: string[] = [];
  if (!sample.checklist.crossPolarizedFilter) {
    standardisationFlags.push('Acquired without cross-polarising filter');
  }
  if (!sample.checklist.neutralGreyCardPresent && !sample.checklist.colourReferenceChartPresent) {
    standardisationFlags.push('No neutral-grey or colour chart reference');
  }
  if (sample.checklist.exposureLocked !== 'yes') {
    standardisationFlags.push('Exposure / white-balance lock not confirmed');
  }

  // Rank against literature reference tabs (secondary method)
  const meanLab = {
    L: sample.stats.mean.L,
    a: sample.stats.mean.a,
    b: sample.stats.mean.b,
  };
  const rankedLiterature = rankReferenceShades(meanLab).slice(0, 4);

  // Visual baseline check
  const visualBaseline = sample.checklist.visualBaselineShade;
  const visualBaselineMatch = visualBaseline ? visualBaseline === predictedShade : undefined;

  return {
    predictedShade,
    isOOD,
    oodDistance: minCentroidDist,
    warnings,
    colorStats: sample.stats,
    standardisationFlags,
    visualBaselineShade: visualBaseline,
    visualBaselineMatch,
    modelVersion: model.version,
    closestReferenceShades: rankedLiterature,
    evaluatedAt: new Date().toISOString(),
  };
}
