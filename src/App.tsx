/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Upload,
  Video,
  X,
} from 'lucide-react';

import {
  ColourStatistics,
  PredictionResult,
  RoiBounds,
  SampleObservation,
  StandardisationChecklist,
  SvmHyperparameters,
  TrainedModel,
} from './types/dental';
import {
  addSampleObservation,
  clearAllSamples,
  generateDemonstrationDataset,
  getSavedSamples,
  getSavedTrainedModel,
  removeSampleObservation,
  saveSamples,
  saveTrainedModel,
} from './services/datasetStore';
import {
  buildFeatureVector,
  extractColourFromCanvas,
} from './services/imageProcessing';
import {
  predictDentalShade,
  trainSvmClassifier,
} from './services/svmEngine';
import { rankReferenceShades } from './services/colourScience';
import { generateClinicalToothImage } from './services/sampleImages';

import { RoiCropper } from './components/RoiCropper';
import { ColourDistributionCard } from './components/ColourDistributionCard';
import { StandardisationCard } from './components/StandardisationCard';
import { ShadePredictionCard } from './components/ShadePredictionCard';
import { ValidationDashboard } from './components/ValidationDashboard';
import { DatasetManager } from './components/DatasetManager';
import { ModelTrainerCard } from './components/ModelTrainerCard';
import { ResearchReportModal } from './components/ResearchReportModal';
import { UnitTestModal } from './components/UnitTestModal';

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'analysis' | 'dataset' | 'training' | 'validation' | 'standardisation'
  >('dashboard');

  // Modals
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [showUnitTestModal, setShowUnitTestModal] = useState<boolean>(false);

  // Repository & Model state
  const [samples, setSamples] = useState<SampleObservation[]>([]);
  const [activeModel, setActiveModel] = useState<TrainedModel | null>(null);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingFeedback, setTrainingFeedback] = useState<string | null>(null);

  // Analysis / Capture state
  const [currentImageSrc, setCurrentImageSrc] = useState<string>('');
  const [isCapturingCamera, setIsCapturingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [extractedStats, setExtractedStats] = useState<ColourStatistics | null>(null);
  const [currentRoi, setCurrentRoi] = useState<RoiBounds | null>(null);
  const [isAnalyzingRoi, setIsAnalyzingRoi] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);

  // Recent analysis history
  const [recentAnalyses, setRecentAnalyses] = useState<
    Array<{
      id: string;
      shade: string;
      L: number;
      a: number;
      b: number;
      visualBaseline?: string;
      timestamp: string;
    }>
  >([]);

  // Active Standardisation Checklist for the current capture
  const [checklist, setChecklist] = useState<StandardisationChecklist>({
    deviceModel: 'Smartphone (Rear Camera)',
    distanceCm: 18,
    lightingCondition: 'ring_flash',
    crossPolarizedFilter: true,
    neutralGreyCardPresent: true,
    colourReferenceChartPresent: false,
    exposureLocked: 'yes',
    imageEdited: 'no',
    sampleType: 'natural_tooth',
    sampleId: `SMP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-001`,
    subjectId: 'SUBJ-01',
    toothNumber: '11 / #8',
    operator: 'Dental Researcher',
    acquisitionDate: new Date().toISOString().split('T')[0],
    referenceShade: 'A2',
    referenceMethod: 'spectrophotometer',
    visualBaselineShade: 'A2',
    notes: 'Smartphone dental photograph acquired under standardized cross-polarised illumination',
  });

  // Load initial dataset & model on mount
  useEffect(() => {
    const loadedSamples = getSavedSamples();
    setSamples(loadedSamples);

    let model = getSavedTrainedModel();
    if (!model && loadedSamples.length >= 4) {
      // Auto-train initial model from benchmark if no model exists
      try {
        const outcome = trainSvmClassifier(loadedSamples);
        saveTrainedModel(outcome.model);
        model = outcome.model;
      } catch (err) {
        console.warn('Initial model auto-train skipped:', err);
      }
    }
    setActiveModel(model);

    // Load initial clinical specimen
    const demoToothImg = generateClinicalToothImage('A2');
    setCurrentImageSrc(demoToothImg);
  }, []);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Start smartphone camera stream (prefer rear camera)
  const startCamera = async () => {
    setCameraError(null);
    setIsCapturingCamera(true);

    try {
      // Constraints preferring rear-facing camera on smartphones
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.error('Camera access failed:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera permission denied. Please allow camera access in your browser settings.'
          : `Camera error: ${err.message || 'Unable to access rear camera device.'}`
      );
      setIsCapturingCamera(false);
    }
  };

  // Capture frame from active video stream
  const captureFrame = () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    // Stop stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setIsCapturingCamera(false);
    setCurrentImageSrc(dataUrl);
    setExtractedStats(null);
    setPredictionResult(null);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCapturingCamera(false);
  };

  // File upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCurrentImageSrc(dataUrl);
        setExtractedStats(null);
        setPredictionResult(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Load a test specimen preset
  const handleLoadSpecimenPreset = (shade: string) => {
    const img = generateClinicalToothImage(shade);
    setCurrentImageSrc(img);
    setChecklist((prev) => ({
      ...prev,
      referenceShade: shade,
      visualBaselineShade: shade,
      sampleId: `SPECIMEN-${shade}-${Date.now().toString().slice(-4)}`,
    }));
    setExtractedStats(null);
    setPredictionResult(null);
  };

  // ROI Crop completion & feature analysis
  const handleCropComplete = (canvas: HTMLCanvasElement, roi: RoiBounds) => {
    setIsAnalyzingRoi(true);
    setCurrentRoi(roi);

    setTimeout(() => {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        setIsAnalyzingRoi(false);
        return;
      }

      // Extract colour statistics from ROI
      const stats = extractColourFromCanvas(ctx, roi, {
        excludeGlare: checklist.crossPolarizedFilter,
        glareThreshold: 248,
      });
      setExtractedStats(stats);

      // Construct feature vector
      const featureVector = buildFeatureVector(stats);

      // Create observation
      const sampleObs: SampleObservation = {
        id: checklist.sampleId || `SMP-${Date.now()}`,
        checklist,
        roi,
        stats,
        featureVector,
        createdAt: new Date().toISOString(),
      };

      // If active SVM model exists, evaluate prediction!
      if (activeModel) {
        try {
          const pred = predictDentalShade(sampleObs, activeModel);
          setPredictionResult(pred);

          // Record in recent analyses
          setRecentAnalyses((prev) => [
            {
              id: sampleObs.id,
              shade: pred.predictedShade,
              L: stats.mean.L,
              a: stats.mean.a,
              b: stats.mean.b,
              visualBaseline: checklist.visualBaselineShade,
              timestamp: new Date().toLocaleTimeString(),
            },
            ...prev.slice(0, 9),
          ]);
        } catch (err: any) {
          console.error('Prediction failed:', err);
        }
      }

      setIsAnalyzingRoi(false);
    }, 80);
  };

  // Add analyzed ROI to repository as training observation
  const handleSaveToDataset = () => {
    if (!extractedStats || !currentRoi) return;

    const featureVector = buildFeatureVector(extractedStats);
    const newSample: SampleObservation = {
      id: checklist.sampleId || `SMP-${Date.now()}`,
      checklist: { ...checklist },
      roi: currentRoi,
      stats: extractedStats,
      featureVector,
      createdAt: new Date().toISOString(),
    };

    addSampleObservation(newSample);
    setSamples((prev) => [newSample, ...prev]);

    // Increment sample ID for next capture
    setChecklist((prev) => ({
      ...prev,
      sampleId: `SMP-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${String(
        samples.length + 2
      ).padStart(3, '0')}`,
    }));

    setTrainingFeedback(`Sample ${newSample.id} added to dataset repository.`);
    setTimeout(() => setTrainingFeedback(null), 4000);
  };

  // Train SVM Model
  const handleTrainModel = (hp: SvmHyperparameters) => {
    setIsTraining(true);
    setTrainingFeedback(null);

    setTimeout(() => {
      try {
        const outcome = trainSvmClassifier(samples, { hyperparameters: hp });
        saveTrainedModel(outcome.model);
        setActiveModel(outcome.model);
        setIsTraining(false);
        setTrainingFeedback(
          `SVM model trained successfully (v${outcome.model.version}). Evaluated on ${
            outcome.validationMetrics?.testSampleCount || 0
          } held-out test samples with ${(
            (outcome.validationMetrics?.accuracy || 0) * 100
          ).toFixed(1)}% accuracy.`
        );
      } catch (err: any) {
        setIsTraining(false);
        setTrainingFeedback(`Training error: ${err.message || String(err)}`);
      }
    }, 150);
  };

  // Reset to literature benchmark dataset
  const handleResetBenchmark = () => {
    const demo = generateDemonstrationDataset();
    saveSamples(demo);
    setSamples(demo);
    try {
      const outcome = trainSvmClassifier(demo);
      saveTrainedModel(outcome.model);
      setActiveModel(outcome.model);
      setTrainingFeedback('Repository reset to 64 literature benchmark observations.');
    } catch (err) {
      console.warn(err);
    }
  };

  // Number of distinct shade classes
  const shadeClassesCount = new Set(samples.map((s) => s.checklist.referenceShade.trim())).size;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Clinical Research Navigation Bar */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* App Brand & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-extrabold text-slate-900 tracking-tight">
                    Digital Shade Guide
                  </h1>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
                    Research Prototype
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 hidden sm:block">
                  Smartphone Dental Shade Classification &bull; CIELAB &bull; Multiclass SVM
                </p>
              </div>
            </div>

            {/* Quick Actions (Unit Tests, Research Report) */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowUnitTestModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                title="Run in-app scientific unit test suite"
              >
                <FlaskConical className="w-3.5 h-3.5 text-teal-600" />
                <span className="hidden md:inline">Unit Tests</span>
              </button>

              <button
                type="button"
                onClick={() => setShowReportModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
                title="View and print publication-grade research report"
              >
                <FileText className="w-3.5 h-3.5 text-teal-300" />
                <span className="hidden md:inline">Research Report</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2 border-t border-slate-100 overflow-x-auto py-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
              { id: 'analysis', label: 'Capture & Analysis', icon: Camera },
              { id: 'dataset', label: `Dataset (${samples.length})`, icon: Database },
              { id: 'training', label: 'SVM Training', icon: BrainCircuit },
              { id: 'validation', label: 'Validation & Metrics', icon: Layers },
              { id: 'standardisation', label: 'Standardisation Guide', icon: HelpCircle },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-teal-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-teal-100' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Research & Ethical Disclaimer Banner */}
      <div className="bg-slate-900 text-slate-300 px-4 py-2 text-xs border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse shrink-0" />
            <span className="text-[11px] text-slate-300">
              <strong>Research Prototype Decision Support:</strong> Predictions are generated by a trained multiclass SVM from smartphone CIELAB coordinates. Not clinically validated for autonomous medical diagnosis.
            </span>
          </div>
          <div className="text-[11px] text-teal-400 font-mono shrink-0">
            D65 / 2° Observer &bull; Real libsvm-js Solver
          </div>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {trainingFeedback && (
        <div className="bg-teal-50 border-b border-teal-200 text-teal-900 px-4 py-2.5 text-xs text-center font-medium">
          {trainingFeedback}
        </div>
      )}

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Top Overview Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Labelled Samples
                </span>
                <div className="text-3xl font-extrabold text-slate-900">{samples.length}</div>
                <div className="text-[11px] text-slate-500">
                  {shadeClassesCount} distinct shade categories
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  SVM Classifier Status
                </span>
                <div className="text-3xl font-extrabold text-teal-700">
                  {activeModel ? `v${activeModel.version}` : 'Untrained'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeModel
                    ? `Trained on ${activeModel.sampleCount} samples`
                    : 'Requires reference samples'}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Validation Accuracy
                </span>
                <div className="text-3xl font-extrabold text-slate-900">
                  {activeModel?.validationMetrics
                    ? `${(activeModel.validationMetrics.accuracy * 100).toFixed(1)}%`
                    : 'N/A'}
                </div>
                <div className="text-[11px] text-slate-500">
                  {activeModel?.validationMetrics
                    ? `Balanced Acc: ${(activeModel.validationMetrics.balancedAccuracy * 100).toFixed(1)}%`
                    : 'Train model with test split'}
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Optical Protocol
                </span>
                <div className="text-xl font-bold text-slate-800 flex items-center gap-1.5 mt-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>Cross-Pol Ready</span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Glare filter & 18% grey card support
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-teal-900 to-slate-900 text-white shadow-lg space-y-4">
              <div className="space-y-1">
                <h2 className="text-lg font-bold">Clinical Shade Analysis & Investigation</h2>
                <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                  Capture or upload a smartphone dental photograph, interactively crop the tooth enamel ROI, extract CIELAB coordinates, and predict shade class using the trained multiclass SVM classifier.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('analysis')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Start New Shade Analysis
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('training')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <BrainCircuit className="w-4 h-4 text-teal-400" /> Configure & Train SVM
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('validation')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs border border-slate-700 transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-cyan-400" /> View Confusion Matrix
                </button>
              </div>
            </div>

            {/* Recent Analyses History Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Recent Shade Analyses</h3>
                  <p className="text-xs text-slate-500">
                    Session history of processed tooth ROIs and SVM classifications
                  </p>
                </div>
              </div>

              {recentAnalyses.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No recent analyses in this session. Head to &ldquo;Capture &amp; Analysis&rdquo; to process your first photograph.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Sample ID</th>
                        <th className="py-2.5 px-3">Predicted Shade</th>
                        <th className="py-2.5 px-3">Visual Baseline</th>
                        <th className="py-2.5 px-3">Agreement</th>
                        <th className="py-2.5 px-3">L* (Lightness)</th>
                        <th className="py-2.5 px-3">a* (Redness)</th>
                        <th className="py-2.5 px-3">b* (Yellowness)</th>
                        <th className="py-2.5 px-3">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-slate-800">
                      {recentAnalyses.map((item, idx) => {
                        const isMatch = item.visualBaseline && item.visualBaseline === item.shade;
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.id}</td>
                            <td className="py-2.5 px-3 font-bold text-teal-700 font-sans">{item.shade}</td>
                            <td className="py-2.5 px-3 font-sans text-slate-600">{item.visualBaseline || '—'}</td>
                            <td className="py-2.5 px-3 font-sans">
                              {item.visualBaseline ? (
                                isMatch ? (
                                  <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded text-[11px]">
                                    Match
                                  </span>
                                ) : (
                                  <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded text-[11px]">
                                    Differs
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-400 text-[11px]">N/A</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3">{item.L.toFixed(2)}</td>
                            <td className="py-2.5 px-3">{item.a.toFixed(2)}</td>
                            <td className="py-2.5 px-3">{item.b.toFixed(2)}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-sans">{item.timestamp}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CAPTURE AND SHADE ANALYSIS */}
        {activeTab === 'analysis' && (
          <div className="space-y-6">
            {/* Input Selection Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={isCapturingCamera}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <Camera className="w-4 h-4" /> Open Smartphone Camera
                </button>

                <label className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 text-slate-500" /> Upload Photograph
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Quick Specimen Presets */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400 font-medium text-[11px] mr-1 hidden sm:inline">
                  Specimen Presets:
                </span>
                {['A1', 'A2', 'A3', 'B1', 'C2'].map((shade) => (
                  <button
                    key={shade}
                    type="button"
                    onClick={() => handleLoadSpecimenPreset(shade)}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-700 font-mono text-xs font-medium text-slate-700 border border-slate-200 transition-colors"
                  >
                    {shade}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Camera Viewport if active */}
            {isCapturingCamera && (
              <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-700 p-4 space-y-4">
                <div className="flex items-center justify-between text-white text-xs">
                  <span className="flex items-center gap-2 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    Live Camera Feed (Preferring Rear Camera)
                  </span>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="relative w-full max-w-xl mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full max-h-[400px] object-contain"
                  />

                  {/* Positioning target guide */}
                  <div className="absolute border-2 border-teal-400/80 border-dashed rounded-lg w-40 h-52 pointer-events-none flex items-center justify-center text-teal-300 text-[10px] bg-teal-400/5">
                    Align target tooth here
                  </div>
                </div>

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={captureFrame}
                    className="px-6 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg transition-transform active:scale-95 cursor-pointer"
                  >
                    Capture Photograph
                  </button>
                </div>
              </div>
            )}

            {cameraError && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Interactive ROI Cropper */}
            {currentImageSrc && (
              <RoiCropper
                imageSrc={currentImageSrc}
                onCropComplete={handleCropComplete}
                isProcessing={isAnalyzingRoi}
              />
            )}

            {/* Standardisation Checklist Audit Card */}
            <StandardisationCard
              checklist={checklist}
              onChange={(updated) => setChecklist(updated)}
            />

            {/* Extracted CIELAB Statistics Card */}
            {extractedStats && (
              <ColourDistributionCard
                stats={extractedStats}
                closestTabs={predictionResult?.closestReferenceShades}
              />
            )}

            {/* Trained SVM Shade Prediction Card */}
            {predictionResult && (
              <ShadePredictionCard
                prediction={predictionResult}
                sampleId={checklist.sampleId}
                canSave={true}
                onSaveToDataset={handleSaveToDataset}
              />
            )}
          </div>
        )}

        {/* TAB 3: DATASET MANAGER */}
        {activeTab === 'dataset' && (
          <DatasetManager
            samples={samples}
            onAddSampleClick={() => setActiveTab('analysis')}
            onDeleteSample={(id) => {
              removeSampleObservation(id);
              setSamples((prev) => prev.filter((s) => s.id !== id));
            }}
            onImportSamples={(imported) => {
              const updated = [...imported, ...samples];
              saveSamples(updated);
              setSamples(updated);
            }}
            onResetBenchmark={handleResetBenchmark}
          />
        )}

        {/* TAB 4: SVM TRAINING */}
        {activeTab === 'training' && (
          <ModelTrainerCard
            samples={samples}
            activeModel={activeModel}
            onTrainModel={handleTrainModel}
            isTraining={isTraining}
          />
        )}

        {/* TAB 5: VALIDATION & METRICS */}
        {activeTab === 'validation' && (
          <ValidationDashboard
            model={activeModel}
            validationMetrics={activeModel?.validationMetrics || null}
          />
        )}

        {/* TAB 6: STANDARDISATION PROTOCOL GUIDE */}
        {activeTab === 'standardisation' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Dental Photographic Standardisation Protocol
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Scientific rationale for optical, geometric, and chromatic calibration in smartphone dental shade assessment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-700 leading-relaxed">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-teal-600" />
                  1. Cross-Polarisation vs. Specular Glare
                </h3>
                <p>
                  Enamel possesses a refractive index of approximately 1.62. When illuminated with direct flash, Fresnel reflection generates intense white specular reflections that completely mask underlying dentin chromaticity.
                </p>
                <p>
                  <strong>Physical accessory requirement:</strong> A physical linear polarising filter across the light source coupled orthogonally with an analyzer filter across the smartphone camera lens eliminates specular highlights through optical cross-polarisation. Software thresholding can exclude glare pixels from statistics, but cannot recover true underlying colour beneath saturated regions.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-600" />
                  2. Neutral-Grey vs. Multi-Patch Reference Targets
                </h3>
                <p>
                  An 18% neutral-grey card serves to verify channel gain balance (R=G=B) and estimate ambient exposure.
                </p>
                <p>
                  However, a neutral target alone does not calibrate spectral non-linearities across the entire colour gamut. For rigorous spectrophotometric agreement, multi-patch color charts with known CIELAB coordinates should be included in the frame for chromatic adaptation transform.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <BrainCircuit className="w-4 h-4 text-indigo-600" />
                  3. Color Space Transformations (sRGB &rarr; CIELAB)
                </h3>
                <p>
                  Smartphone cameras output non-linear gamma-encoded sRGB. Computing Euclidean distances directly on sRGB produces non-uniform chromatic errors.
                </p>
                <p>
                  This system linearizes pixel values via the IEC 61966-2-1 piecewise transfer function, maps linear RGB to CIE XYZ under standard illuminant D65, and derives perceptually uniform CIELAB coordinates (L*, a*, b*).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  4. Region of Interest (ROI) Tooth Thirds
                </h3>
                <p>
                  A natural human tooth crown exhibits a continuous chromatic gradient:
                </p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li><strong>Cervical third:</strong> Thinner enamel, higher chroma and yellowness (higher b*).</li>
                  <li><strong>Middle third (Body):</strong> Optimum balance of enamel and dentin; international standard reference zone for shade selection.</li>
                  <li><strong>Incisal third:</strong> Translucent enamel, bluish/opalescent halo (lower b*, higher L* translucency).</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200/80 py-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Digital Shade Guide &bull; Smartphone-based Dental Shade Classification Prototype
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>CIE Standard D65</span>
            <span>CIEDE2000 & CIE76</span>
            <span>Multiclass SVM (libsvm-js)</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showReportModal && (
        <ResearchReportModal
          model={activeModel}
          metrics={activeModel?.validationMetrics || null}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {showUnitTestModal && (
        <UnitTestModal onClose={() => setShowUnitTestModal(false)} />
      )}
    </div>
  );
}
