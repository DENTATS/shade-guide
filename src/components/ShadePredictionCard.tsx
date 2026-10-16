/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PredictionResult } from '../types/dental';
import { labToHex } from '../services/colourScience';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Layers,
  ShieldAlert,
  Sparkles,
  XCircle,
} from 'lucide-react';

interface ShadePredictionCardProps {
  prediction: PredictionResult;
  sampleId?: string;
  onSaveToDataset?: () => void;
  canSave?: boolean;
}

export const ShadePredictionCard: React.FC<ShadePredictionCardProps> = ({
  prediction,
  sampleId,
  onSaveToDataset,
  canSave = false,
}) => {
  const { colorStats } = prediction;
  const sampleHex = labToHex(colorStats.mean.L, colorStats.mean.a, colorStats.mean.b);

  const bestLit = prediction.closestReferenceShades[0];
  const bestLitHex = bestLit
    ? labToHex(bestLit.tab.L, bestLit.tab.a, bestLit.tab.b)
    : '#ddd';

  const visualBaseline = prediction.visualBaselineShade;
  const hasVisualBaseline = Boolean(visualBaseline);
  const visualMatchesSvm = hasVisualBaseline && visualBaseline === prediction.predictedShade;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 space-y-6">
      {/* Top Banner: SVM Prediction */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 text-white">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-semibold tracking-wider text-teal-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5" /> Multiclass SVM Classification Output
            </span>
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              Model v{prediction.modelVersion}
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-extrabold text-white tracking-tight">
              Shade {prediction.predictedShade}
            </span>
            <span className="text-xs text-slate-300">
              Sample: <strong className="font-mono text-white">{sampleId || 'Current ROI'}</strong>
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Categorical shade prediction produced via RBF Support Vector Machine trained on scaled CIELAB features.
          </p>
        </div>

        {/* Visual Comparison Swatch */}
        <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-xl border border-slate-700 shrink-0">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
              ROI Colour
            </div>
            <div
              className="w-16 h-12 rounded-lg border border-slate-600 shadow-inner flex items-center justify-center text-[10px] font-mono text-slate-900 font-bold"
              style={{ backgroundColor: sampleHex }}
            >
              ROI
            </div>
          </div>

          {bestLit && (
            <div className="text-center">
              <div className="text-[10px] text-slate-400 uppercase font-semibold mb-1">
                Ref {bestLit.shade}
              </div>
              <div
                className="w-16 h-12 rounded-lg border border-slate-600 shadow-inner flex items-center justify-center text-[10px] font-mono text-slate-900 font-bold"
                style={{ backgroundColor: bestLitHex }}
              >
                Ref
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Out of Distribution or Reliability Warnings */}
      {prediction.isOOD && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1">
          <div className="flex items-center gap-2 font-semibold text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Out-of-Distribution Warning (Low Reliability)</span>
          </div>
          <p className="text-xs text-amber-700">
            {prediction.warnings.join(' ')}
          </p>
        </div>
      )}

      {/* Standardisation Warnings */}
      {prediction.standardisationFlags.length > 0 && (
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
          <div className="font-semibold text-slate-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Acquisition Standardisation Advisory:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-600 pl-1">
            {prediction.standardisationFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Comparison Grid: SVM vs Visual Baseline vs Colour Distance */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: SVM Classifier */}
        <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 space-y-2">
          <div className="text-xs font-semibold text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-600" />
            <span>Trained SVM Classifier</span>
          </div>
          <div className="text-2xl font-bold text-teal-800">
            {prediction.predictedShade}
          </div>
          <p className="text-[11px] text-teal-700">
            Non-linear boundary evaluated in standardized 12-dimensional feature space.
          </p>
        </div>

        {/* Card 2: Visual Baseline Comparison */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Visual Shade Baseline</span>
            {hasVisualBaseline && (
              visualMatchesSvm ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Concordant
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                  <XCircle className="w-3.5 h-3.5" /> Discrepant
                </span>
              )
            )}
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {hasVisualBaseline ? visualBaseline : 'Not recorded'}
          </div>
          <p className="text-[11px] text-slate-500">
            {hasVisualBaseline
              ? `Human visual observer recorded ${visualBaseline}. ${
                  visualMatchesSvm
                    ? 'Matches SVM prediction exactly.'
                    : `Differs from SVM prediction (${prediction.predictedShade}).`
                }`
              : 'Add visual shade baseline in standardisation checklist for comparison.'}
          </p>
        </div>

        {/* Card 3: Literature Distance Matching */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Secondary Ref Tab (ΔE00)</span>
          </div>
          <div className="text-2xl font-bold text-slate-800 flex items-baseline gap-2">
            <span>{bestLit?.shade || '—'}</span>
            {bestLit && (
              <span className="text-xs font-mono font-medium text-slate-500">
                (ΔE00 {bestLit.deltaE00})
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Ranked by CIEDE2000 distance against published spectrophotometric coordinates.
          </p>
        </div>
      </div>

      {/* Secondary Method: Literature Reference Tabs Ranked Table */}
      <div className="space-y-2 border-t border-slate-100 pt-4">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <span className="font-semibold text-slate-800">
            Secondary Literature Reference Distance Table (CIEDE2000 & CIE76)
          </span>
          <span className="text-[11px] text-slate-400">
            Distinct from SVM model (Literature values under D65)
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2 px-3">Rank</th>
                <th className="py-2 px-3">Shade Tab</th>
                <th className="py-2 px-3">CIEDE2000 (ΔE00)</th>
                <th className="py-2 px-3">CIE76 (ΔE*ab)</th>
                <th className="py-2 px-3">Tab Coordinates (L*, a*, b*)</th>
                <th className="py-2 px-3">Perceptibility / Acceptability</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {prediction.closestReferenceShades.map((item, idx) => {
                const isAcceptable = item.deltaE00 <= 1.8; // Paravina et al. 50:50% acceptability threshold ΔE00 ~ 1.8
                const isImperceptible = item.deltaE00 <= 0.8; // Perceptibility threshold ΔE00 ~ 0.8
                return (
                  <tr key={item.shade} className={idx === 0 ? 'bg-teal-50/30' : 'hover:bg-slate-50/50'}>
                    <td className="py-2 px-3 font-sans text-slate-500">#{idx + 1}</td>
                    <td className="py-2 px-3 font-bold text-slate-900 font-sans flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded border border-slate-300 inline-block"
                        style={{
                          backgroundColor: labToHex(item.tab.L, item.tab.a, item.tab.b),
                        }}
                      />
                      {item.shade}
                    </td>
                    <td className="py-2 px-3 font-bold text-teal-700">{item.deltaE00.toFixed(2)}</td>
                    <td className="py-2 px-3">{item.deltaE76.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-500">
                      L* {item.tab.L}, a* {item.tab.a}, b* {item.tab.b}
                    </td>
                    <td className="py-2 px-3 font-sans text-[11px]">
                      {isImperceptible ? (
                        <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded">
                          Imperceptible (ΔE00 ≤ 0.8)
                        </span>
                      ) : isAcceptable ? (
                        <span className="text-teal-700 font-medium bg-teal-50 px-1.5 py-0.5 rounded">
                          Clinically Acceptable (ΔE00 ≤ 1.8)
                        </span>
                      ) : (
                        <span className="text-slate-500">
                          Perceptible difference (ΔE00 &gt; 1.8)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save to Dataset CTA */}
      {canSave && onSaveToDataset && (
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Analysis completed at {new Date(prediction.evaluatedAt).toLocaleTimeString()}</span>
          </div>
          <button
            type="button"
            onClick={onSaveToDataset}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Add as Labelled Training Observation
          </button>
        </div>
      )}
    </div>
  );
};
