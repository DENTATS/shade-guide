/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  LightingCondition,
  ReferenceMethod,
  SampleType,
  StandardisationChecklist,
  TriState,
} from '../types/dental';
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  FileSpreadsheet,
  ShieldAlert,
  Sliders,
  User,
} from 'lucide-react';
import { evaluateStandardisation } from '../services/imageProcessing';

interface StandardisationCardProps {
  checklist: StandardisationChecklist;
  onChange: (checklist: StandardisationChecklist) => void;
  readOnly?: boolean;
}

export const StandardisationCard: React.FC<StandardisationCardProps> = ({
  checklist,
  onChange,
  readOnly = false,
}) => {
  const flags = evaluateStandardisation(checklist);

  const updateField = <K extends keyof StandardisationChecklist>(
    key: K,
    val: StandardisationChecklist[K]
  ) => {
    if (readOnly) return;
    onChange({
      ...checklist,
      [key]: val,
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-teal-600" />
            <span>Dental Photographic Standardisation Checklist</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            ISO / Dental Colour Research standard protocol for smartphone shade acquisition
          </p>
        </div>

        {/* Audit Flag Badge */}
        <div>
          {flags.length === 0 ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Standard Protocol Compliant
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5" /> {flags.length} Standardisation Flag(s)
            </span>
          )}
        </div>
      </div>

      {/* Flag Alerts if any */}
      {flags.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/70 rounded-xl p-3.5 space-y-1.5">
          <div className="text-xs font-semibold text-amber-800 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-600" />
            <span>Acquisition Quality Warnings:</span>
          </div>
          <ul className="text-xs text-amber-700 list-disc list-inside space-y-0.5 pl-1">
            {flags.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Checklist Form Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Sample Identification */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700 flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400" />
            Sample ID (Anonymised)
          </label>
          <input
            type="text"
            value={checklist.sampleId}
            disabled={readOnly}
            onChange={(e) => updateField('sampleId', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50 disabled:opacity-75"
            placeholder="e.g. SMP-2026-001"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700 flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-400" />
            Subject ID / Specimen ID
          </label>
          <input
            type="text"
            value={checklist.subjectId}
            disabled={readOnly}
            onChange={(e) => updateField('subjectId', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50/50 disabled:opacity-75"
            placeholder="e.g. SUBJ-04"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Sample Type</label>
          <select
            value={checklist.sampleType}
            disabled={readOnly}
            onChange={(e) => updateField('sampleType', e.target.value as SampleType)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:opacity-75"
          >
            <option value="natural_tooth">Natural Tooth Enamel</option>
            <option value="shade_tab">Shade Guide Reference Tab</option>
            <option value="dental_material">Restorative / Composite Material</option>
          </select>
        </div>

        {/* Smartphone Hardware & Distance */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700 flex items-center gap-1">
            <Camera className="w-3.5 h-3.5 text-slate-400" />
            Smartphone Make & Model
          </label>
          <input
            type="text"
            value={checklist.deviceModel}
            disabled={readOnly}
            onChange={(e) => updateField('deviceModel', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:opacity-75"
            placeholder="e.g. iPhone 15 Pro Max"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Distance to Subject (cm)</label>
          <input
            type="number"
            min={5}
            max={100}
            value={checklist.distanceCm}
            disabled={readOnly}
            onChange={(e) => updateField('distanceCm', Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:opacity-75"
          />
          <span className="text-[10px] text-slate-400">Standard macro range: 15–25 cm</span>
        </div>

        {/* Lighting Method */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Illumination Method</label>
          <select
            value={checklist.lightingCondition}
            disabled={readOnly}
            onChange={(e) => updateField('lightingCondition', e.target.value as LightingCondition)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:opacity-75"
          >
            <option value="ring_flash">Dental Ring Flash / Ring Light (5500K CRI&gt;95)</option>
            <option value="twin_flash">Bilateral Twin Flash with Diffusers</option>
            <option value="operatory_led">Dental Operatory LED Overhead</option>
            <option value="ambient_daylight">North-Facing Natural Daylight</option>
            <option value="studio_diffused">Calibrated Light Box / Studio Diffused</option>
          </select>
        </div>

        {/* Optical & Physical Calibrators */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="font-semibold text-slate-800">Physical Optical Filters</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.crossPolarizedFilter}
              disabled={readOnly}
              onChange={(e) => updateField('crossPolarizedFilter', e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-slate-700 font-medium">Cross-polarising filter used</span>
          </label>
          <p className="text-[11px] text-slate-500">
            Physical linear polariser eliminates specular reflections from wet tooth enamel.
          </p>
        </div>

        <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="font-semibold text-slate-800">Colour Reference Targets</div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={checklist.neutralGreyCardPresent}
              disabled={readOnly}
              onChange={(e) => updateField('neutralGreyCardPresent', e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-slate-700 font-medium">18% Neutral-grey card in frame</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input
              type="checkbox"
              checked={checklist.colourReferenceChartPresent}
              disabled={readOnly}
              onChange={(e) => updateField('colourReferenceChartPresent', e.target.checked)}
              className="rounded text-teal-600 focus:ring-teal-500"
            />
            <span className="text-slate-700 font-medium">Multi-patch color chart present</span>
          </label>
        </div>

        {/* Camera Software Locks */}
        <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <div className="font-semibold text-slate-800">Camera Controls</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Exposure / WB Locked:</span>
            <select
              value={checklist.exposureLocked}
              disabled={readOnly}
              onChange={(e) => updateField('exposureLocked', e.target.value as TriState)}
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
            >
              <option value="yes">Yes (Locked)</option>
              <option value="no">No (Auto)</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Post-processing / Filters:</span>
            <select
              value={checklist.imageEdited}
              disabled={readOnly}
              onChange={(e) => updateField('imageEdited', e.target.value as TriState)}
              className="text-xs px-2 py-1 rounded border border-slate-300 bg-white"
            >
              <option value="no">No (Raw / Unedited)</option>
              <option value="yes">Yes (Edited)</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>
        </div>

        {/* Reference Shade & Ground Truth */}
        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Reference Shade Label (if known)</label>
          <input
            type="text"
            value={checklist.referenceShade}
            disabled={readOnly}
            onChange={(e) => updateField('referenceShade', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white font-mono font-bold text-slate-800"
            placeholder="e.g. A2, A3, B1"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Reference Ground Truth Method</label>
          <select
            value={checklist.referenceMethod}
            disabled={readOnly}
            onChange={(e) => updateField('referenceMethod', e.target.value as ReferenceMethod)}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white disabled:opacity-75"
          >
            <option value="spectrophotometer">Contact Spectrophotometer (e.g. VITA Easyshade)</option>
            <option value="shade_guide_visual_consensus">Multi-Observer Visual Consensus</option>
            <option value="digital_shade_analyzer">Laboratory Bench Spectroradiometer</option>
            <option value="tab_label">Manufacturer Physical Shade Tab Inscription</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="font-semibold text-slate-700">Visual Baseline Shade (Human Observer)</label>
          <input
            type="text"
            value={checklist.visualBaselineShade || ''}
            disabled={readOnly}
            onChange={(e) => updateField('visualBaselineShade', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white font-mono text-slate-800"
            placeholder="Optional chairside clinician shade"
          />
        </div>
      </div>
    </div>
  );
};
