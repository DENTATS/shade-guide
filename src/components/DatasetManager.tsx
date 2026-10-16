/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { SampleObservation } from '../types/dental';
import {
  exportSamplesToCsv,
  importSamplesFromCsv,
} from '../services/datasetStore';
import { labToHex } from '../services/colourScience';
import {
  Download,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';

interface DatasetManagerProps {
  samples: SampleObservation[];
  onAddSampleClick: () => void;
  onDeleteSample: (id: string) => void;
  onImportSamples: (newSamples: SampleObservation[]) => void;
  onResetBenchmark: () => void;
  onSelectSample?: (sample: SampleObservation) => void;
}

export const DatasetManager: React.FC<DatasetManagerProps> = ({
  samples,
  onAddSampleClick,
  onDeleteSample,
  onImportSamples,
  onResetBenchmark,
  onSelectSample,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedShadeFilter, setSelectedShadeFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [importStatus, setImportStatus] = useState<{ count?: number; errors?: string[] } | null>(
    null
  );

  // Distinct shade classes in dataset
  const uniqueShades = Array.from(new Set(samples.map((s) => s.checklist.referenceShade))).sort();

  // Filtered samples
  const filteredSamples = samples.filter((s) => {
    const matchesSearch =
      searchTerm === '' ||
      s.checklist.sampleId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.checklist.subjectId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.checklist.deviceModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.checklist.referenceShade.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesShade =
      selectedShadeFilter === 'all' || s.checklist.referenceShade === selectedShadeFilter;

    const matchesType =
      selectedTypeFilter === 'all' || s.checklist.sampleType === selectedTypeFilter;

    return matchesSearch && matchesShade && matchesType;
  });

  const handleCsvExport = () => {
    const csv = exportSamplesToCsv(samples);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dental_shade_dataset_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const { imported, errors } = importSamplesFromCsv(text);
      setImportStatus({ count: imported.length, errors });

      if (imported.length > 0) {
        onImportSamples(imported);
      }
    };
    reader.readAsText(file);
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Training Dataset Repository</span>
            <span className="text-xs font-mono font-medium bg-teal-50 text-teal-700 px-2.5 py-0.5 rounded-full border border-teal-200">
              {samples.length} observations
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Labelled dental colour observations with standardized CIELAB feature vectors and metadata
          </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onAddSampleClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Training Sample
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" /> Import CSV
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleCsvImport}
            accept=".csv,text/csv"
            className="hidden"
          />

          <button
            type="button"
            onClick={handleCsvExport}
            disabled={samples.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
          </button>

          <button
            type="button"
            onClick={onResetBenchmark}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="Reset to Literature Benchmark Dataset"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CSV Import Feedback Alert */}
      {importStatus && (
        <div className="p-3.5 rounded-xl border text-xs space-y-1 bg-slate-50 border-slate-200">
          <div className="font-semibold text-slate-800 flex items-center justify-between">
            <span>Import Status: {importStatus.count} valid samples imported</span>
            <button
              type="button"
              onClick={() => setImportStatus(null)}
              className="text-slate-400 hover:text-slate-600 font-bold"
            >
              ✕
            </button>
          </div>
          {importStatus.errors && importStatus.errors.length > 0 && (
            <ul className="text-amber-700 list-disc list-inside space-y-0.5">
              {importStatus.errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Sample ID, Subject, Shade, Device..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={selectedShadeFilter}
            onChange={(e) => setSelectedShadeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">All Shades ({uniqueShades.length})</option>
            {uniqueShades.map((shade) => (
              <option key={shade} value={shade}>
                Shade {shade}
              </option>
            ))}
          </select>

          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
          >
            <option value="all">All Sample Types</option>
            <option value="natural_tooth">Natural Tooth</option>
            <option value="shade_tab">Shade Tab</option>
            <option value="dental_material">Material / Composite</option>
          </select>
        </div>
      </div>

      {/* Dataset Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="py-2.5 px-3">Sample ID</th>
              <th className="py-2.5 px-3">Swatch</th>
              <th className="py-2.5 px-3">Shade Label</th>
              <th className="py-2.5 px-3">Subject</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">L* (mean ± σ)</th>
              <th className="py-2.5 px-3">a* (mean ± σ)</th>
              <th className="py-2.5 px-3">b* (mean ± σ)</th>
              <th className="py-2.5 px-3">Hardware / Light</th>
              <th className="py-2.5 px-3">Filter / Card</th>
              <th className="py-2.5 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-800">
            {filteredSamples.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400">
                  No matching samples found in repository.
                </td>
              </tr>
            ) : (
              filteredSamples.map((sample) => {
                const cl = sample.checklist;
                const st = sample.stats;
                const hex = labToHex(st.mean.L, st.mean.a, st.mean.b);

                return (
                  <tr
                    key={sample.id}
                    onClick={() => onSelectSample && onSelectSample(sample)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                  >
                    <td className="py-2 px-3 font-mono font-medium text-slate-900">
                      {cl.sampleId}
                    </td>
                    <td className="py-2 px-3">
                      <div
                        className="w-6 h-6 rounded-md border border-slate-300 shadow-xs"
                        style={{ backgroundColor: hex }}
                        title={`L*: ${st.mean.L}, a*: ${st.mean.a}, b*: ${st.mean.b}`}
                      />
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 font-sans">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800 border border-slate-200">
                        {cl.referenceShade}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">
                      {cl.subjectId}
                    </td>
                    <td className="py-2 px-3 capitalize text-slate-600">
                      {cl.sampleType.replace('_', ' ')}
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {st.mean.L.toFixed(1)} <span className="text-slate-400">±{st.std.L.toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {st.mean.a.toFixed(1)} <span className="text-slate-400">±{st.std.a.toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-3 font-mono">
                      {st.mean.b.toFixed(1)} <span className="text-slate-400">±{st.std.b.toFixed(1)}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-600 text-[11px]">
                      <div className="font-medium text-slate-800">{cl.deviceModel || 'Smartphone'}</div>
                      <div className="text-slate-400">{cl.lightingCondition.replace('_', ' ')}</div>
                    </td>
                    <td className="py-2 px-3 text-[11px]">
                      <div className="flex items-center gap-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            cl.crossPolarizedFilter ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={cl.crossPolarizedFilter ? 'Cross-polarised' : 'No cross-polariser'}
                        />
                        <span className="text-slate-600">
                          {cl.crossPolarizedFilter ? 'Cross-pol' : 'Standard'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSample(sample.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                        title="Delete observation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
