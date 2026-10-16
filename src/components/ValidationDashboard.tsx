/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ModelValidationResults, TrainedModel } from '../types/dental';
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Download,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

interface ValidationDashboardProps {
  model: TrainedModel | null;
  validationMetrics: ModelValidationResults | null;
}

export const ValidationDashboard: React.FC<ValidationDashboardProps> = ({
  model,
  validationMetrics,
}) => {
  const [selectedCell, setSelectedCell] = useState<{
    actual: string;
    predicted: string;
    count: number;
  } | null>(null);

  if (!model) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          Model Not Trained — Add Labelled Reference Samples
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Train the Support Vector Machine with labelled dental shade observations to generate independent test-set evaluation metrics and confusion matrices.
        </p>
      </div>
    );
  }

  if (!validationMetrics) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-slate-800">
          No Held-out Validation Partition Available
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          All {model.sampleCount} samples were utilized for model training. To evaluate generalization performance without data leakage, configure a test split ratio (e.g. 25%) or provide additional independent test specimens.
        </p>
      </div>
    );
  }

  const {
    accuracy,
    balancedAccuracy,
    macroPrecision,
    macroRecall,
    macroSpecificity,
    macroF1,
    confusionMatrix,
    perClass,
    trainSampleCount,
    testSampleCount,
    misclassifiedSamples,
  } = validationMetrics;

  const labels = confusionMatrix.labels;
  const matrix = confusionMatrix.matrix;

  // Max value in matrix for heatmap scaling
  let maxCount = 1;
  for (let r = 0; r < matrix.length; r++) {
    for (let c = 0; c < matrix[r].length; c++) {
      if (matrix[r][c] > maxCount) maxCount = matrix[r][c];
    }
  }

  // Export validation summary to CSV
  const handleExportValidationCsv = () => {
    const lines = [
      'Digital Shade Guide - Research Validation Metrics',
      `Model Version,${model.version}`,
      `Evaluation Type,${validationMetrics.evaluationType}`,
      `Training Samples,${trainSampleCount}`,
      `Independent Test Samples,${testSampleCount}`,
      `Overall Accuracy,${(accuracy * 100).toFixed(2)}%`,
      `Balanced Accuracy,${(balancedAccuracy * 100).toFixed(2)}%`,
      `Macro Precision,${(macroPrecision * 100).toFixed(2)}%`,
      `Macro Recall,${(macroRecall * 100).toFixed(2)}%`,
      `Macro Specificity,${(macroSpecificity * 100).toFixed(2)}%`,
      `Macro F1-Score,${macroF1.toFixed(4)}`,
      '',
      'Per-Class Metrics',
      'Shade,Support,TP,FP,FN,TN,Precision,Recall/Sensitivity,Specificity,F1-Score',
      ...perClass.map(
        (c) =>
          `${c.label},${c.support},${c.tp},${c.fp},${c.fn},${c.tn},${c.precision !== null ? (c.precision * 100).toFixed(2) + '%' : 'N/A'},${c.recall !== null ? (c.recall * 100).toFixed(2) + '%' : 'N/A'},${c.specificity !== null ? (c.specificity * 100).toFixed(2) + '%' : 'N/A'},${c.f1 !== null ? c.f1.toFixed(4) : 'N/A'}`
      ),
      '',
      'Misclassified Observations',
      'Sample ID,Subject ID,Reference Shade,SVM Predicted,Visual Baseline,Delta E00,Delta E76,L*,a*,b*',
      ...misclassifiedSamples.map(
        (m) =>
          `"${m.sampleId}","${m.subjectId}","${m.actualShade}","${m.predictedShade}","${m.visualBaseline || ''}",${m.deltaE00},${m.deltaE76},${m.L},${m.a},${m.b}`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `digital_shade_validation_${model.version}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Overall Accuracy</span>
            <TrendingUp className="w-4 h-4 text-teal-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {(accuracy * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Formula: Σ TP / N (n={testSampleCount} test samples)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Balanced Accuracy</span>
            <BarChart3 className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {(balancedAccuracy * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            Formula: 1/K · Σ Recall_k (unweighted class mean)
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Macro F1-Score</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {macroF1.toFixed(3)}
          </div>
          <div className="text-[11px] text-slate-500">
            Harmonic mean of Macro Precision & Recall
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Macro Specificity</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {(macroSpecificity * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500">
            One-vs-Rest calculation: TN / (TN + FP)
          </div>
        </div>
      </div>

      {/* Confusion Matrix Heatmap Section */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>Multiclass Confusion Matrix Heatmap</span>
              <span className="text-xs font-mono bg-teal-50 text-teal-700 px-2 py-0.5 rounded border border-teal-200">
                {labels.length} × {labels.length} Classes
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Vertical axis: Ground Truth Reference Shade. Horizontal axis: SVM Predicted Shade.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportValidationCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Validation CSV
          </button>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto p-2">
          <div className="inline-block min-w-full">
            {/* Top axis label */}
            <div className="text-center text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
              Predicted Shade Category (SVM) &rarr;
            </div>

            <div className="flex">
              {/* Left axis label */}
              <div className="flex items-center justify-center pr-2">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider -rotate-90 whitespace-nowrap">
                  Actual Reference Shade &rarr;
                </span>
              </div>

              {/* Matrix Table */}
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100 border-b border-slate-300">
                      <th className="p-2 border-r border-slate-300 bg-slate-200 font-bold text-slate-700">
                        Ref \ Pred
                      </th>
                      {labels.map((lbl) => (
                        <th key={lbl} className="p-2 text-center font-bold text-slate-800 border-r border-slate-200 min-w-[36px]">
                          {lbl}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {labels.map((rowLabel, rIdx) => (
                      <tr key={rowLabel} className="border-b border-slate-200">
                        <td className="p-2 font-bold text-slate-800 bg-slate-100 border-r border-slate-300 text-center">
                          {rowLabel}
                        </td>
                        {labels.map((colLabel, cIdx) => {
                          const count = matrix[rIdx][cIdx];
                          const isDiagonal = rIdx === cIdx;
                          const intensity = count > 0 ? count / maxCount : 0;

                          // Heatmap styling: diagonal is green/teal, off-diagonal errors are amber/red
                          let cellBg = 'bg-white';
                          let cellText = 'text-slate-400';

                          if (count > 0) {
                            if (isDiagonal) {
                              cellBg = intensity > 0.6 ? 'bg-teal-600' : intensity > 0.3 ? 'bg-teal-500' : 'bg-teal-400';
                              cellText = 'text-white font-bold';
                            } else {
                              cellBg = 'bg-rose-500';
                              cellText = 'text-white font-bold';
                            }
                          }

                          return (
                            <td
                              key={colLabel}
                              onClick={() =>
                                setSelectedCell({ actual: rowLabel, predicted: colLabel, count })
                              }
                              className={`p-2 text-center border-r border-slate-200 cursor-pointer transition-transform hover:scale-110 shadow-xs ${cellBg} ${cellText}`}
                              title={`Actual: ${rowLabel}, Predicted: ${colLabel}, Count: ${count}`}
                            >
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {selectedCell && (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 flex items-center justify-between">
            <span>
              Cell Inspection: Actual <strong>{selectedCell.actual}</strong> &rarr; Predicted <strong>{selectedCell.predicted}</strong>: <strong>{selectedCell.count} sample(s)</strong>
              {selectedCell.actual === selectedCell.predicted ? ' (Correct prediction)' : ' (Misclassification)'}
            </span>
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Per-Class Metrics Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Per-Class Classification Metrics</h3>
            <p className="text-xs text-slate-500">
              Evaluated with documented One-versus-Rest denominators. Undefined metrics reported as N/A.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2.5 px-3">Class</th>
                <th className="py-2.5 px-3">Support (N)</th>
                <th className="py-2.5 px-3">TP</th>
                <th className="py-2.5 px-3">FP</th>
                <th className="py-2.5 px-3">FN</th>
                <th className="py-2.5 px-3">TN</th>
                <th className="py-2.5 px-3">Precision (PPV)</th>
                <th className="py-2.5 px-3">Sensitivity (Recall)</th>
                <th className="py-2.5 px-3">Specificity (OvR)</th>
                <th className="py-2.5 px-3">F1-Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
              {perClass.map((cls) => (
                <tr key={cls.label} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-sans font-bold text-slate-900">{cls.label}</td>
                  <td className="py-2.5 px-3">{cls.support}</td>
                  <td className="py-2.5 px-3 text-emerald-700 font-semibold">{cls.tp}</td>
                  <td className="py-2.5 px-3 text-rose-700">{cls.fp}</td>
                  <td className="py-2.5 px-3 text-amber-700">{cls.fn}</td>
                  <td className="py-2.5 px-3 text-slate-500">{cls.tn}</td>
                  <td className="py-2.5 px-3">
                    {cls.precision !== null ? `${(cls.precision * 100).toFixed(1)}%` : <span className="text-slate-400 font-sans">N/A</span>}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-teal-800">
                    {cls.recall !== null ? `${(cls.recall * 100).toFixed(1)}%` : <span className="text-slate-400 font-sans">N/A</span>}
                  </td>
                  <td className="py-2.5 px-3">
                    {cls.specificity !== null ? `${(cls.specificity * 100).toFixed(1)}%` : <span className="text-slate-400 font-sans">N/A</span>}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-indigo-700">
                    {cls.f1 !== null ? cls.f1.toFixed(3) : <span className="text-slate-400 font-sans">N/A</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Misclassified Samples Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <span>Misclassified Observations Audit</span>
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                {misclassifiedSamples.length} case(s)
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Discrepant predictions inspected against reference ground truth and visual baseline
            </p>
          </div>
        </div>

        {misclassifiedSamples.length === 0 ? (
          <div className="p-6 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-600" />
            No misclassified cases in the held-out test partition (100% test accuracy).
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="py-2 px-3">Sample ID</th>
                  <th className="py-2 px-3">Subject ID</th>
                  <th className="py-2 px-3">Actual Reference Shade</th>
                  <th className="py-2 px-3">SVM Predicted Shade</th>
                  <th className="py-2 px-3">Visual Baseline</th>
                  <th className="py-2 px-3">Discrepancy (ΔE00)</th>
                  <th className="py-2 px-3">Measured CIELAB (L*, a*, b*)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                {misclassifiedSamples.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{m.sampleId}</td>
                    <td className="py-2 px-3 text-slate-600">{m.subjectId}</td>
                    <td className="py-2 px-3 font-bold text-emerald-800 font-sans">{m.actualShade}</td>
                    <td className="py-2 px-3 font-bold text-rose-700 font-sans">{m.predictedShade}</td>
                    <td className="py-2 px-3 text-slate-600 font-sans">{m.visualBaseline || '—'}</td>
                    <td className="py-2 px-3 font-bold text-amber-700">{m.deltaE00.toFixed(2)}</td>
                    <td className="py-2 px-3 text-slate-500">
                      L* {m.L.toFixed(1)}, a* {m.a.toFixed(1)}, b* {m.b.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Experimental Validation Note */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-3 text-xs text-slate-600">
        <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-800">Methodological Disclosure:</span> Metrics are computed strictly on non-overlapping held-out test partitions or stratified cross-validation folds. Illustrative synthetic demonstration samples are tagged and must be substituted with clinical spectrophotometer-verified specimens before clinical validation is claimed.
        </div>
      </div>
    </div>
  );
};
