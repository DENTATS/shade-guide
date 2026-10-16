/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ColourStatistics, ReferenceShadeTab } from '../types/dental';
import { labToHex } from '../services/colourScience';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface ColourDistributionCardProps {
  stats: ColourStatistics;
  closestTabs?: Array<{
    shade: string;
    deltaE76: number;
    deltaE00: number;
    tab: ReferenceShadeTab;
  }>;
}

export const ColourDistributionCard: React.FC<ColourDistributionCardProps> = ({
  stats,
  closestTabs = [],
}) => {
  const meanHex = labToHex(stats.mean.L, stats.mean.a, stats.mean.b);
  const primaryTab = closestTabs[0];
  const primaryTabHex = primaryTab
    ? labToHex(primaryTab.tab.L, primaryTab.tab.a, primaryTab.tab.b)
    : '#e2d7c5';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5">
      {/* Header and Swatches */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <span>ROI Colour Space Analysis</span>
            <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
              CIE Standard D65 / 2° Observer
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Decoded via IEC 61966-2-1 piecewise sRGB transfer function into linear RGB and CIELAB
          </p>
        </div>

        {/* Visual Swatch Comparison */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/60">
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Captured ROI
            </span>
            <div
              className="w-14 h-12 rounded-lg border border-slate-300 shadow-inner flex items-end justify-center pb-1 text-[9px] font-mono font-medium text-slate-800"
              style={{ backgroundColor: meanHex }}
            >
              Mean
            </div>
            <span className="text-[10px] font-mono text-slate-600 mt-1">{meanHex}</span>
          </div>

          {primaryTab && (
            <>
              <div className="text-slate-400 font-bold text-xs">vs</div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Literature Ref ({primaryTab.shade})
                </span>
                <div
                  className="w-14 h-12 rounded-lg border border-slate-300 shadow-inner flex items-end justify-center pb-1 text-[9px] font-mono font-medium text-slate-800"
                  style={{ backgroundColor: primaryTabHex }}
                >
                  {primaryTab.shade}
                </div>
                <span className="text-[10px] font-mono text-slate-600 mt-1">
                  ΔE00 {primaryTab.deltaE00}
                </span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Numerical CIELAB Statistics Grid */}
      <div>
        <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
          <span>CIELAB Statistical Metrics</span>
          <span className="text-[11px] font-normal text-slate-500">
            Sampled valid pixels: <strong className="text-slate-800">{stats.pixelCount.toLocaleString()}</strong>
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-2 px-3">Channel</th>
                <th className="py-2 px-3">Mean (μ)</th>
                <th className="py-2 px-3">Median</th>
                <th className="py-2 px-3">Std Dev (σ)</th>
                <th className="py-2 px-3">IQR (p75 - p25)</th>
                <th className="py-2 px-3">10th Percentile</th>
                <th className="py-2 px-3">90th Percentile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-mono">
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-semibold text-slate-900 font-sans">
                  L* <span className="text-[10px] font-normal text-slate-500">(Lightness 0–100)</span>
                </td>
                <td className="py-2 px-3 font-bold text-teal-700">{stats.mean.L.toFixed(2)}</td>
                <td className="py-2 px-3">{stats.median.L.toFixed(2)}</td>
                <td className="py-2 px-3">±{stats.std.L.toFixed(2)}</td>
                <td className="py-2 px-3">{stats.iqr.L.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500">{stats.p10.L.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500">{stats.p90.L.toFixed(2)}</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-semibold text-slate-900 font-sans">
                  a* <span className="text-[10px] font-normal text-slate-500">(Green–Red)</span>
                </td>
                <td className="py-2 px-3 font-bold text-teal-700">{stats.mean.a.toFixed(2)}</td>
                <td className="py-2 px-3">{stats.median.a.toFixed(2)}</td>
                <td className="py-2 px-3">±{stats.std.a.toFixed(2)}</td>
                <td className="py-2 px-3">{stats.iqr.a.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500">{stats.p10.a.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500">{stats.p90.a.toFixed(2)}</td>
              </tr>
              <tr className="hover:bg-slate-50/50">
                <td className="py-2 px-3 font-semibold text-slate-900 font-sans">
                  b* <span className="text-[10px] font-normal text-slate-500">(Blue–Yellow)</span>
                </td>
                <td className="py-2 px-3 font-bold text-teal-700">{stats.mean.b.toFixed(2)}</td>
                <td className="py-2 px-3">{stats.median.b.toFixed(2)}</td>
                <td className="py-2 px-3">±{stats.std.b.toFixed(2)}</td>
                <td className="py-2 px-3">{stats.iqr.b.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500">{stats.p10.b.toFixed(2)}</td>
                <td className="py-2 px-3 text-slate-500">{stats.p90.b.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Sampling Quality & Glare Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          {stats.glareExclusionPercent < 5 ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          )}
          <div className="text-xs">
            <span className="font-semibold text-slate-800">
              Specular Glare: {stats.glareExclusionPercent}% pixels excluded
            </span>
            <p className="text-slate-500 text-[11px] mt-0.5">
              {stats.glareExclusionPercent < 5
                ? 'Minimal reflection artifacts detected inside ROI.'
                : 'Specular reflections present. Cross-polarising filter recommended.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
          <Info className="w-5 h-5 text-teal-600 shrink-0" />
          <div className="text-xs">
            <span className="font-semibold text-slate-800">
              Colour Gamut: sRGB D65 Standard
            </span>
            <p className="text-slate-500 text-[11px] mt-0.5">
              Uncalibrated smartphone sensors represent device-dependent RGB space.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
