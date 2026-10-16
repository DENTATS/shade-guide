/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  SampleObservation,
  SvmHyperparameters,
  TrainedModel,
} from '../types/dental';
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock,
  Cpu,
  Layers,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface ModelTrainerCardProps {
  samples: SampleObservation[];
  activeModel: TrainedModel | null;
  onTrainModel: (hp: SvmHyperparameters) => void;
  isTraining: boolean;
}

export const ModelTrainerCard: React.FC<ModelTrainerCardProps> = ({
  samples,
  activeModel,
  onTrainModel,
  isTraining,
}) => {
  const [kernel, setKernel] = useState<'RBF' | 'LINEAR' | 'POLYNOMIAL'>('RBF');
  const [cost, setCost] = useState<number>(10.0);
  const [gammaMode, setGammaMode] = useState<'auto' | 'custom'>('auto');
  const [customGamma, setCustomGamma] = useState<number>(0.083); // 1/12
  const [degree, setDegree] = useState<number>(3);
  const [testSplitRatio, setTestSplitRatio] = useState<number>(0.25);

  const uniqueClasses = Array.from(new Set(samples.map((s) => s.checklist.referenceShade.trim())));

  const handleStartTraining = () => {
    const hp: SvmHyperparameters = {
      kernel,
      cost,
      gamma: gammaMode === 'auto' ? 'auto' : customGamma,
      degree: kernel === 'POLYNOMIAL' ? degree : undefined,
      probabilityEstimates: false,
      testSplitRatio,
      kFold: 5,
    };
    onTrainModel(hp);
  };

  const hasEnoughSamples = samples.length >= 4 && uniqueClasses.length >= 2;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-teal-600" />
            <span>Support Vector Machine (SVM) Classifier Training Engine</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Genuine multiclass libsvm solver with RBF kernel and Z-score feature scaling computed exclusively on training data
          </p>
        </div>

        {/* Current Status Badge */}
        <div>
          {activeModel ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Model Ready (v{activeModel.version})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> Model Not Trained
            </span>
          )}
        </div>
      </div>

      {/* Dataset Readiness Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
        <div>
          <span className="text-slate-500">Repository Samples</span>
          <div className="text-lg font-bold text-slate-900">{samples.length}</div>
        </div>
        <div>
          <span className="text-slate-500">Distinct Shade Classes</span>
          <div className="text-lg font-bold text-teal-700">{uniqueClasses.length}</div>
        </div>
        <div>
          <span className="text-slate-500">Feature Dimensions</span>
          <div className="text-lg font-bold text-slate-900">12 (CIELAB stats)</div>
        </div>
        <div>
          <span className="text-slate-500">Held-Out Test Ratio</span>
          <div className="text-lg font-bold text-slate-900">{Math.round(testSplitRatio * 100)}%</div>
        </div>
      </div>

      {!hasEnoughSamples && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-semibold">Insufficient training data:</strong> SVM training requires at least 4 observations across at least 2 distinct shade categories. Please add labelled samples in the Dataset Manager or load the literature benchmark.
          </div>
        </div>
      )}

      {/* Hyperparameter Controls */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-teal-600" />
          <span>SVM Hyperparameter Configuration</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Kernel Type */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Kernel Function</span>
              <span className="text-[10px] text-teal-700 font-mono">Recommended: RBF</span>
            </label>
            <select
              value={kernel}
              onChange={(e) => setKernel(e.target.value as any)}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white"
            >
              <option value="RBF">Radial Basis Function (RBF / Gaussian)</option>
              <option value="LINEAR">Linear (Hyperplane in CIELAB)</option>
              <option value="POLYNOMIAL">Polynomial</option>
            </select>
            <p className="text-[11px] text-slate-500">
              RBF handles non-linear optical boundaries in the perceptually non-uniform tooth colour space.
            </p>
          </div>

          {/* Cost Parameter C */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Cost Parameter (C): {cost}</span>
              <span className="text-[10px] text-slate-500 font-mono">Slack penalty</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="50"
              step="0.5"
              value={cost}
              onChange={(e) => setCost(parseFloat(e.target.value))}
              className="w-full accent-teal-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.1 (Smooth margin)</span>
              <span>10.0 (Balanced)</span>
              <span>50.0 (Strict fit)</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Trades off margin width against training classification errors.
            </p>
          </div>

          {/* Gamma Parameter */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>RBF Gamma (γ)</span>
              <span className="text-[10px] text-slate-500 font-mono">
                {gammaMode === 'auto' ? '1 / D (0.083)' : customGamma}
              </span>
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setGammaMode('auto')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  gammaMode === 'auto'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Auto (1/12)
              </button>
              <button
                type="button"
                onClick={() => setGammaMode('custom')}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  gammaMode === 'custom'
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Custom
              </button>
              {gammaMode === 'custom' && (
                <input
                  type="number"
                  step="0.01"
                  min="0.001"
                  max="5"
                  value={customGamma}
                  onChange={(e) => setCustomGamma(parseFloat(e.target.value))}
                  className="w-20 text-xs px-2 py-1 rounded border border-slate-300"
                />
              )}
            </div>
            <p className="text-[11px] text-slate-500">
              Defines the sphere of influence for individual support vectors in feature space.
            </p>
          </div>

          {/* Test Split Ratio */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-800 flex items-center justify-between">
              <span>Validation Held-Out Split: {Math.round(testSplitRatio * 100)}%</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.4"
              step="0.05"
              value={testSplitRatio}
              onChange={(e) => setTestSplitRatio(parseFloat(e.target.value))}
              className="w-full accent-teal-600"
            />
            <p className="text-[11px] text-slate-500">
              Split grouped by subject to prevent data leakage between repeated patient images.
            </p>
          </div>
        </div>
      </div>

      {/* Active Model Summary Card if available */}
      {activeModel && (
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-800 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-600" />
              <span>Active Model Artifact Details</span>
            </span>
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-3 h-3" /> {new Date(activeModel.createdAt).toLocaleDateString()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500">Version ID</span>
              <div className="font-mono font-medium text-slate-800">{activeModel.version}</div>
            </div>
            <div>
              <span className="text-slate-500">Trained Classes ({activeModel.classLabels.length})</span>
              <div className="font-mono text-slate-800 truncate" title={activeModel.classLabels.join(', ')}>
                {activeModel.classLabels.join(', ')}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Validation Accuracy</span>
              <div className="font-bold text-teal-700">
                {activeModel.validationMetrics
                  ? `${(activeModel.validationMetrics.accuracy * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
            <div>
              <span className="text-slate-500">Balanced Accuracy</span>
              <div className="font-bold text-cyan-700">
                {activeModel.validationMetrics
                  ? `${(activeModel.validationMetrics.balancedAccuracy * 100).toFixed(1)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Train CTA */}
      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={handleStartTraining}
          disabled={!hasEnoughSamples || isTraining}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 active:scale-[0.98] text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50 text-sm cursor-pointer"
        >
          {isTraining ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Training Multiclass SVM Solver...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-teal-200" />
              {activeModel ? 'Re-Train Multiclass SVM' : 'Train Multiclass SVM'}
            </>
          )}
        </button>
      </div>
    </div>
  );
};
