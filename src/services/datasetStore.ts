/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SampleObservation,
  StandardisationChecklist,
  TrainedModel,
} from '../types/dental';
import {
  labToHex,
  VITA_CLASSICAL_REFERENCE_TABS,
} from './colourScience';
import { buildFeatureVector, FEATURE_NAMES } from './imageProcessing';

const SAMPLES_STORAGE_KEY = 'digital_shade_guide_samples_v1';
const MODEL_STORAGE_KEY = 'digital_shade_guide_active_model_v1';

/**
 * Creates synthetic demonstration samples for initial calibration and research UI exploration.
 * Clearly tagged as demonstration samples.
 */
export function generateDemonstrationDataset(): SampleObservation[] {
  const samples: SampleObservation[] = [];
  const devices = ['iPhone 15 Pro', 'Samsung Galaxy S24 Ultra', 'Google Pixel 8 Pro'];
  const lightings = ['ring_flash', 'twin_flash', 'operatory_led'] as const;

  let counter = 1;

  for (const tab of VITA_CLASSICAL_REFERENCE_TABS) {
    // Generate 4 controlled observations per shade tab with slight natural optical scatter
    const repetitions = 4;
    for (let r = 0; r < repetitions; r++) {
      const subjectId = `DEMO-SUBJ-${String(counter % 12 + 1).padStart(2, '0')}`;
      const sampleId = `DEMO-SMP-${String(counter).padStart(3, '0')}`;
      const device = devices[r % devices.length];
      const lighting = lightings[r % lightings.length];

      // Small realistic perturbations around spectrophotometric literature values
      const dL = (Math.sin(counter * 1.7) * 0.8) + (r * 0.2 - 0.3);
      const da = (Math.cos(counter * 2.1) * 0.4) + (r * 0.1 - 0.15);
      const db = (Math.sin(counter * 3.3) * 0.7) + (r * 0.25 - 0.2);

      const meanL = Number((tab.L + dL).toFixed(2));
      const meanA = Number((tab.a + da).toFixed(2));
      const meanB = Number((tab.b + db).toFixed(2));

      const stdL = Number((1.2 + Math.abs(Math.sin(counter)) * 0.5).toFixed(2));
      const stdA = Number((0.6 + Math.abs(Math.cos(counter)) * 0.3).toFixed(2));
      const stdB = Number((0.9 + Math.abs(Math.sin(counter + 1)) * 0.4).toFixed(2));

      const stats = {
        mean: {
          L: meanL,
          a: meanA,
          b: meanB,
        },
        rgbMean: {
          r: 220,
          g: 200,
          b: 170,
        },
        median: {
          L: meanL,
          a: meanA,
          b: meanB,
        },
        std: {
          L: stdL,
          a: stdA,
          b: stdB,
        },
        rgbStd: {
          r: 3.5,
          g: 3.2,
          b: 3.0,
        },
        p10: { L: meanL - 1.3 * stdL, a: meanA - 1.3 * stdA, b: meanB - 1.3 * stdB },
        p25: { L: meanL - 0.67 * stdL, a: meanA - 0.67 * stdA, b: meanB - 0.67 * stdB },
        p75: { L: meanL + 0.67 * stdL, a: meanA + 0.67 * stdA, b: meanB + 0.67 * stdB },
        p90: { L: meanL + 1.3 * stdL, a: meanA + 1.3 * stdA, b: meanB + 1.3 * stdB },
        iqr: {
          L: Number((1.35 * stdL).toFixed(2)),
          a: Number((1.35 * stdA).toFixed(2)),
          b: Number((1.35 * stdB).toFixed(2)),
        },
        pixelCount: 1450 + (counter % 300),
        glareExclusionPercent: Number((1.2 + (counter % 4) * 0.6).toFixed(1)),
        sampledPoints: [
          { L: meanL, a: meanA, b: meanB, hex: labToHex(meanL, meanA, meanB) },
        ],
      };

      const checklist: StandardisationChecklist = {
        deviceModel: device,
        distanceCm: 18,
        lightingCondition: lighting,
        crossPolarizedFilter: true,
        neutralGreyCardPresent: true,
        colourReferenceChartPresent: r % 2 === 0,
        exposureLocked: 'yes',
        imageEdited: 'no',
        sampleType: r % 2 === 0 ? 'shade_tab' : 'natural_tooth',
        sampleId,
        subjectId,
        toothNumber: '11 / #8',
        operator: 'Dr. Dental Researcher',
        acquisitionDate: '2026-10-10',
        referenceShade: tab.shade,
        referenceMethod: 'spectrophotometer',
        visualBaselineShade: tab.shade,
        notes: 'Demonstration sample generated from literature spectrophotometric bounds for initial SVM training',
      };

      const featureVector = buildFeatureVector(stats);

      samples.push({
        id: sampleId,
        checklist,
        roi: { x: 100, y: 100, width: 120, height: 160 },
        stats,
        featureVector,
        createdAt: new Date(Date.now() - (64 - counter) * 3600000).toISOString(),
      });

      counter++;
    }
  }

  return samples;
}

/**
 * Loads all saved samples from local persistence.
 * Initializes with demonstration data if storage is completely empty.
 */
export function getSavedSamples(): SampleObservation[] {
  try {
    const raw = localStorage.getItem(SAMPLES_STORAGE_KEY);
    if (!raw) {
      const demo = generateDemonstrationDataset();
      saveSamples(demo);
      return demo;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to read samples from storage:', err);
    return [];
  }
}

/**
 * Saves samples array to local storage
 */
export function saveSamples(samples: SampleObservation[]): void {
  try {
    localStorage.setItem(SAMPLES_STORAGE_KEY, JSON.stringify(samples));
  } catch (err) {
    console.error('Failed to save samples to storage:', err);
  }
}

/**
 * Adds a new sample observation
 */
export function addSampleObservation(sample: SampleObservation): void {
  const current = getSavedSamples();
  const updated = [sample, ...current];
  saveSamples(updated);
}

/**
 * Removes a sample by ID
 */
export function removeSampleObservation(id: string): void {
  const current = getSavedSamples();
  const updated = current.filter((s) => s.id !== id);
  saveSamples(updated);
}

/**
 * Clears all dataset samples
 */
export function clearAllSamples(): void {
  localStorage.removeItem(SAMPLES_STORAGE_KEY);
}

/**
 * Gets the active trained SVM model
 */
export function getSavedTrainedModel(): TrainedModel | null {
  try {
    const raw = localStorage.getItem(MODEL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrainedModel;
  } catch (err) {
    console.error('Failed to load trained model:', err);
    return null;
  }
}

/**
 * Saves trained model to local storage
 */
export function saveTrainedModel(model: TrainedModel): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(model));
  } catch (err) {
    console.error('Failed to save trained model:', err);
  }
}

/**
 * Deletes trained model
 */
export function deleteTrainedModel(): void {
  localStorage.removeItem(MODEL_STORAGE_KEY);
}

/**
 * Exports samples to a standardized CSV string
 */
export function exportSamplesToCsv(samples: SampleObservation[]): string {
  const headers = [
    'sample_id',
    'subject_id',
    'shade_label',
    'sample_type',
    'device_model',
    'distance_cm',
    'lighting',
    'cross_polarized',
    'grey_card_present',
    'exposure_locked',
    'reference_method',
    'visual_baseline',
    'operator',
    'acquisition_date',
    ...FEATURE_NAMES,
    'pixel_count',
    'glare_percent',
    'notes',
  ];

  const rows = samples.map((s) => {
    const cl = s.checklist;
    const st = s.stats;
    return [
      `"${cl.sampleId || s.id}"`,
      `"${cl.subjectId || ''}"`,
      `"${cl.referenceShade}"`,
      `"${cl.sampleType}"`,
      `"${cl.deviceModel || ''}"`,
      cl.distanceCm,
      `"${cl.lightingCondition}"`,
      cl.crossPolarizedFilter ? 'yes' : 'no',
      cl.neutralGreyCardPresent ? 'yes' : 'no',
      `"${cl.exposureLocked}"`,
      `"${cl.referenceMethod}"`,
      `"${cl.visualBaselineShade || ''}"`,
      `"${cl.operator || ''}"`,
      `"${cl.acquisitionDate || ''}"`,
      st.mean.L,
      st.mean.a,
      st.mean.b,
      st.std.L,
      st.std.a,
      st.std.b,
      st.median.L,
      st.median.a,
      st.median.b,
      st.iqr.L,
      st.iqr.a,
      st.iqr.b,
      st.pixelCount,
      st.glareExclusionPercent,
      `"${(cl.notes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Imports and validates a CSV file containing shade observations
 */
export function importSamplesFromCsv(csvText: string): {
  imported: SampleObservation[];
  errors: string[];
} {
  const lines = csvText.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  const imported: SampleObservation[] = [];

  if (lines.length < 2) {
    return { imported: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  // Parse header
  const headerLine = lines[0];
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, '').toLowerCase());

  const getCol = (name: string): number => headers.indexOf(name.toLowerCase());

  const sampleIdIdx = getCol('sample_id');
  const shadeIdx = getCol('shade_label');
  const lMeanIdx = getCol('l_mean');
  const aMeanIdx = getCol('a_mean');
  const bMeanIdx = getCol('b_mean');

  if (shadeIdx === -1 || lMeanIdx === -1 || aMeanIdx === -1 || bMeanIdx === -1) {
    return {
      imported: [],
      errors: [
        'Required columns missing. Expected at least: shade_label, L_mean, a_mean, b_mean',
      ],
    };
  }

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (row.length < 4) {
      errors.push(`Row ${i + 1}: Insufficient column count.`);
      continue;
    }

    const shade = row[shadeIdx];
    if (!shade) {
      errors.push(`Row ${i + 1}: Missing shade_label.`);
      continue;
    }

    const L_mean = parseFloat(row[lMeanIdx]);
    const a_mean = parseFloat(row[aMeanIdx]);
    const b_mean = parseFloat(row[bMeanIdx]);

    if (isNaN(L_mean) || isNaN(a_mean) || isNaN(b_mean)) {
      errors.push(`Row ${i + 1}: Non-numeric CIELAB values (L=${row[lMeanIdx]}, a=${row[aMeanIdx]}, b=${row[bMeanIdx]}).`);
      continue;
    }

    const sampleId = sampleIdIdx !== -1 && row[sampleIdIdx] ? row[sampleIdIdx] : `IMP-${Date.now()}-${i}`;
    const subjectId = getCol('subject_id') !== -1 ? row[getCol('subject_id')] : `SUBJ-${i}`;
    const deviceModel = getCol('device_model') !== -1 ? row[getCol('device_model')] : 'Unknown Smartphone';
    const visualBaseline = getCol('visual_baseline') !== -1 ? row[getCol('visual_baseline')] : undefined;

    const L_std = getCol('l_std') !== -1 && !isNaN(parseFloat(row[getCol('l_std')])) ? parseFloat(row[getCol('l_std')]) : 1.2;
    const a_std = getCol('a_std') !== -1 && !isNaN(parseFloat(row[getCol('a_std')])) ? parseFloat(row[getCol('a_std')]) : 0.6;
    const b_std = getCol('b_std') !== -1 && !isNaN(parseFloat(row[getCol('b_std')])) ? parseFloat(row[getCol('b_std')]) : 0.9;

    const L_med = getCol('l_median') !== -1 && !isNaN(parseFloat(row[getCol('l_median')])) ? parseFloat(row[getCol('l_median')]) : L_mean;
    const a_med = getCol('a_median') !== -1 && !isNaN(parseFloat(row[getCol('a_median')])) ? parseFloat(row[getCol('a_median')]) : a_mean;
    const b_med = getCol('b_median') !== -1 && !isNaN(parseFloat(row[getCol('b_median')])) ? parseFloat(row[getCol('b_median')]) : b_mean;

    const L_iqr = getCol('l_iqr') !== -1 && !isNaN(parseFloat(row[getCol('l_iqr')])) ? parseFloat(row[getCol('l_iqr')]) : L_std * 1.35;
    const a_iqr = getCol('a_iqr') !== -1 && !isNaN(parseFloat(row[getCol('a_iqr')])) ? parseFloat(row[getCol('a_iqr')]) : a_std * 1.35;
    const b_iqr = getCol('b_iqr') !== -1 && !isNaN(parseFloat(row[getCol('b_iqr')])) ? parseFloat(row[getCol('b_iqr')]) : b_std * 1.35;

    const stats = {
      mean: { L: L_mean, a: a_mean, b: b_mean },
      rgbMean: { r: 215, g: 195, b: 165 },
      median: { L: L_med, a: a_med, b: b_med },
      std: { L: L_std, a: a_std, b: b_std },
      rgbStd: { r: 3, g: 3, b: 3 },
      p10: { L: L_mean - 1.3 * L_std, a: a_mean - 1.3 * a_std, b: b_mean - 1.3 * b_std },
      p25: { L: L_mean - 0.67 * L_std, a: a_mean - 0.67 * a_std, b: b_mean - 0.67 * b_std },
      p75: { L: L_mean + 0.67 * L_std, a: a_mean + 0.67 * a_std, b: b_mean + 0.67 * b_std },
      p90: { L: L_mean + 1.3 * L_std, a: a_mean + 1.3 * a_std, b: b_mean + 1.3 * b_std },
      iqr: { L: L_iqr, a: a_iqr, b: b_iqr },
      pixelCount: 1200,
      glareExclusionPercent: 1.0,
      sampledPoints: [{ L: L_mean, a: a_mean, b: b_mean, hex: labToHex(L_mean, a_mean, b_mean) }],
    };

    const checklist: StandardisationChecklist = {
      deviceModel,
      distanceCm: 18,
      lightingCondition: 'ring_flash',
      crossPolarizedFilter: true,
      neutralGreyCardPresent: true,
      colourReferenceChartPresent: false,
      exposureLocked: 'yes',
      imageEdited: 'no',
      sampleType: 'natural_tooth',
      sampleId,
      subjectId,
      toothNumber: '11',
      operator: 'Imported Operator',
      acquisitionDate: new Date().toISOString().split('T')[0],
      referenceShade: shade,
      referenceMethod: 'spectrophotometer',
      visualBaselineShade: visualBaseline,
      notes: 'Imported via research CSV dataset manager',
    };

    const featureVector = buildFeatureVector(stats);

    imported.push({
      id: sampleId,
      checklist,
      roi: { x: 0, y: 0, width: 100, height: 100 },
      stats,
      featureVector,
      createdAt: new Date().toISOString(),
    });
  }

  return { imported, errors };
}
