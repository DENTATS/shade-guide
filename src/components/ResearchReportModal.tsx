/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ModelValidationResults, TrainedModel } from '../types/dental';
import { Download, Printer, X, FileText, CheckCircle2 } from 'lucide-react';

interface ResearchReportModalProps {
  model: TrainedModel | null;
  metrics: ModelValidationResults | null;
  onClose: () => void;
}

export const ResearchReportModal: React.FC<ResearchReportModalProps> = ({
  model,
  metrics,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[92vh]">
        {/* Modal Action Bar (Hidden in print) */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-400" />
            <h2 className="text-base font-bold">Research Investigation Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Body */}
        <div className="p-8 sm:p-10 overflow-y-auto text-slate-800 space-y-6 print:p-0 print:overflow-visible text-xs leading-relaxed">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-4 space-y-1">
            <div className="text-[10px] uppercase font-bold tracking-widest text-teal-700">
              Technical & Scientific Research Report
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Digital Shade Guide: Smartphone-Based Dental Shade Classification
            </h1>
            <div className="text-slate-600 text-xs flex flex-wrap gap-x-4 gap-y-1 pt-1 font-mono">
              <span>Date: {new Date().toLocaleDateString()}</span>
              <span>Model Version: {model?.version || 'N/A'}</span>
              <span>Architecture: CIELAB + RBF-SVM</span>
              <span>Illuminant: CIE Standard D65 / 2°</span>
            </div>
          </div>

          {/* Section 1: Objective & Scope */}
          <section className="space-y-1.5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              1. Project Objective & Scope
            </h2>
            <p className="text-slate-700">
              This investigation evaluates the feasibility of automated dental shade classification using calibrated smartphone photographs. Rather than relying on heuristic RGB lookups or subjective visual inspection, the system implements standard piecewise sRGB decoding into linear RGB, transformation into device-independent CIE XYZ space under standard illuminant D65, derivation of CIE 1976 L*a*b* coordinates, statistical region-level feature extraction, and multiclass classification via Support Vector Machines (SVM).
            </p>
          </section>

          {/* Section 2: Acquisition & Standardisation */}
          <section className="space-y-1.5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              2. Standardisation Conditions & Optical Considerations
            </h2>
            <p className="text-slate-700">
              Dental enamel exhibits complex anisotropic scattering and strong surface specular reflections. The protocol stipulates:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 pl-2">
              <li>
                <strong>Cross-polarisation:</strong> Physical linear polarising filters are utilized to extinguish specular highlights at Brewster's angle, isolating true subsurface dentin/enamel chroma. Software cannot reliably synthesize missing colour data beneath saturated specularities.
              </li>
              <li>
                <strong>Illumination:</strong> 5500 K ring flash or diffused twin flash with CRI &gt; 95 to avoid metameric mismatch.
              </li>
              <li>
                <strong>Reference Targets:</strong> 18% neutral-grey cards verify channel gain balance; multi-patch charts provide chromatic adaptation anchors.
              </li>
              <li>
                <strong>Working Distance:</strong> Standardized macro distance of 15–25 cm with camera exposure and white balance locked to prevent sensor auto-tone distortion.
              </li>
            </ul>
          </section>

          {/* Section 3: Feature Extraction */}
          <section className="space-y-1.5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              3. Colour Science & Feature Vector Schema
            </h2>
            <p className="text-slate-700">
              The Region of Interest (ROI) is sampled across the middle-third body of the tooth crown. Each valid pixel undergoes:
            </p>
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
              <div>1. sRGB piecewise linearization: C_lin = C &le; 0.04045 ? C/12.92 : ((C+0.055)/1.055)^2.4</div>
              <div>2. D65 CIE XYZ transformation matrix: [X, Y, Z]^T = M_sRGB &times; [R_lin, G_lin, B_lin]^T</div>
              <div>3. Non-linear CIELAB mapping with reference white D65 (Xn=0.95047, Yn=1.00000, Zn=1.08883)</div>
              <div>4. 12-dimensional vector: [L_μ, a_μ, b_μ, L_σ, a_σ, b_σ, L_med, a_med, b_med, L_iqr, a_iqr, b_iqr]</div>
            </div>
          </section>

          {/* Section 4: SVM Configuration */}
          <section className="space-y-1.5">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
              4. Machine Learning Classifier Architecture
            </h2>
            <p className="text-slate-700">
              Classification is executed using a genuine multiclass libsvm solver (C-SVC) with an RBF kernel. Preprocessing parameters (Z-score mean and variance) are calculated <em>strictly</em> on the training partition and applied identically to test/prediction samples.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-[11px]">
              <div>Kernel: {model?.hyperparameters?.kernel || 'RBF'}</div>
              <div>Cost (C): {model?.hyperparameters?.cost ?? 10.0}</div>
              <div>Gamma (γ): {model?.hyperparameters?.gamma ?? 'auto (1/12)'}</div>
              <div>Total Classes: {model?.classLabels?.length ?? 0}</div>
            </div>
          </section>

          {/* Section 5: Validation Results */}
          {metrics && (
            <section className="space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-1">
                5. Empirical Validation Results (Held-Out Test Set)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Overall Accuracy</span>
                  <span className="text-lg font-bold text-slate-900">{(metrics.accuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Balanced Accuracy</span>
                  <span className="text-lg font-bold text-slate-900">{(metrics.balancedAccuracy * 100).toFixed(1)}%</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Macro F1-Score</span>
                  <span className="text-lg font-bold text-slate-900">{metrics.macroF1.toFixed(3)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block">Macro Specificity</span>
                  <span className="text-lg font-bold text-slate-900">{(metrics.macroSpecificity * 100).toFixed(1)}%</span>
                </div>
              </div>

              {/* Per class table */}
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-semibold text-slate-700">
                    <tr>
                      <th className="py-1.5 px-2">Class</th>
                      <th className="py-1.5 px-2">Support</th>
                      <th className="py-1.5 px-2">Precision</th>
                      <th className="py-1.5 px-2">Recall</th>
                      <th className="py-1.5 px-2">Specificity</th>
                      <th className="py-1.5 px-2">F1</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                    {metrics.perClass.map((c) => (
                      <tr key={c.label}>
                        <td className="py-1.5 px-2 font-bold font-sans">{c.label}</td>
                        <td className="py-1.5 px-2">{c.support}</td>
                        <td className="py-1.5 px-2">{c.precision !== null ? `${(c.precision * 100).toFixed(1)}%` : 'N/A'}</td>
                        <td className="py-1.5 px-2">{c.recall !== null ? `${(c.recall * 100).toFixed(1)}%` : 'N/A'}</td>
                        <td className="py-1.5 px-2">{c.specificity !== null ? `${(c.specificity * 100).toFixed(1)}%` : 'N/A'}</td>
                        <td className="py-1.5 px-2">{c.f1 !== null ? c.f1.toFixed(3) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 6: Limitations & Disclaimer */}
          <section className="space-y-1.5 pt-2 border-t border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              6. Scientific Limitations & Ethical Disclosures
            </h2>
            <p className="text-slate-600 text-[11px]">
              This software is designed as a research prototype and clinical decision-support reference. Results are influenced by illuminant spectrum, sensor Bayer filter spectral response curves, image compression, ROI boundary selection, and training dataset representation. Model predictions must not supersede professional clinical assessment. In vivo tooth translucency, surface texture, dehydration, and cervical-incisal chromatic gradients must be evaluated holistically by a qualified dental professional.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
