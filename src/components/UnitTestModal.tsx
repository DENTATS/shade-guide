/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { runAllUnitTests, TestResult } from '../services/unitTests';
import { CheckCircle2, FlaskConical, Play, RotateCcw, XCircle, X } from 'lucide-react';

interface UnitTestModalProps {
  onClose: () => void;
}

export const UnitTestModal: React.FC<UnitTestModalProps> = ({ onClose }) => {
  const [results, setResults] = useState<TestResult[]>(() => runAllUnitTests());
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const handleRunTests = () => {
    setIsRunning(true);
    setTimeout(() => {
      const res = runAllUnitTests();
      setResults(res);
      setIsRunning(false);
    }, 50);
  };

  const totalPassed = results.filter((r) => r.passed).length;
  const allPassed = totalPassed === results.length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-400" />
            <div>
              <h2 className="text-sm font-bold">In-App Live Scientific Unit Test Suite</h2>
              <p className="text-[11px] text-slate-400">
                Automated validation of colour science algorithms, metrics, and SVM routines
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunTests}
              disabled={isRunning}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
              Re-run Tests
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

        {/* Summary Banner */}
        <div className={`p-4 border-b flex items-center justify-between ${
          allPassed ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
        }`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            {allPassed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-600" />
            )}
            <span>
              {allPassed
                ? `100% Passed: All ${results.length} Unit Tests Verified Successfully`
                : `${results.length - totalPassed} of ${results.length} Tests Failed`}
            </span>
          </div>
          <span className="text-[11px] font-mono font-medium">
            Total Execution Time: {results.reduce((acc, r) => acc + r.durationMs, 0).toFixed(1)} ms
          </span>
        </div>

        {/* Test List */}
        <div className="p-6 overflow-y-auto space-y-2.5 divide-y divide-slate-100">
          {results.map((test, idx) => (
            <div key={idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                    {test.category}
                  </span>
                  <span className="font-semibold text-slate-800">{test.name}</span>
                </div>
                {test.error && (
                  <div className="text-rose-700 font-mono text-[11px] pl-1 pt-1">
                    Error: {test.error}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] font-mono text-slate-400">{test.durationMs} ms</span>
                {test.passed ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    PASS
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                    FAIL
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
