/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  FailureDataPoint,
  ComponentFailureUnit,
  ModelType,
  RegressionResult,
} from './types/reliability';
import { AUTOMOTIVE_PRESETS } from './lib/presets';
import { fitArbitraryDensity } from './lib/reliabilityEngine';
import { WorkbenchCharts } from './components/WorkbenchCharts';
import { DataTable } from './components/DataTable';
import { MathFormula } from './components/MathFormula';
import { MissionCalculator } from './components/MissionCalculator';
import { ExportModal } from './components/ExportModal';
import { MatlabModal } from './components/MatlabModal';

import {
  Activity,
  Layers,
  Sparkles,
  ShieldCheck,
  FileCode2,
  Clock,
  Gauge,
  HelpCircle,
  RotateCcw,
  Sliders,
  Cpu,
  Car,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Terminal,
  Image as ImageIcon,
} from 'lucide-react';

export default function App() {
  // Current active preset (Default to verified AEC-Q102 benchmark)
  const defaultPreset =
    AUTOMOTIVE_PRESETS.find((p) => p.id === 'lidar_diode') || AUTOMOTIVE_PRESETS[0];

  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultPreset.id);

  // Failure dataset
  const [dataPoints, setDataPoints] = useState<FailureDataPoint[]>(() => [
    ...defaultPreset.data,
  ]);
  const [unit, setUnit] = useState<ComponentFailureUnit>(defaultPreset.unit);

  // Regression Model Parameters
  const [modelType, setModelType] = useState<ModelType>(defaultPreset.recommendedModel);
  const [extremaCount, setExtremaCount] = useState<number>(defaultPreset.recommendedExtrema);

  // Synchronized Hover Cursor on Charts
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Export & MATLAB Modal states
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [showMatlabModal, setShowMatlabModal] = useState<boolean>(false);
  const [matlabModalTab, setMatlabModalTab] = useState<'moussaoui' | 'figures'>('figures');

  // Active Preset Metadata
  const currentPreset = useMemo(() => {
    return (
      AUTOMOTIVE_PRESETS.find((p) => p.id === selectedPresetId) || AUTOMOTIVE_PRESETS[0]
    );
  }, [selectedPresetId]);

  // Compute Regression Result
  const regressionResult = useMemo<RegressionResult | null>(() => {
    try {
      return fitArbitraryDensity(dataPoints, modelType, extremaCount);
    } catch (err) {
      console.error('Regression error:', err);
      return null;
    }
  }, [dataPoints, modelType, extremaCount]);

  // Load Preset
  const handleSelectPreset = (presetId: string) => {
    const preset = AUTOMOTIVE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setDataPoints([...preset.data]);
    setUnit(preset.unit);
    setModelType(preset.recommendedModel);
    setExtremaCount(preset.recommendedExtrema);
  };

  // Reset to original preset values
  const handleResetCurrentPreset = () => {
    handleSelectPreset(selectedPresetId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Engineering Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3 flex flex-wrap items-center justify-between gap-4">
            {/* Title & Domain Header */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold text-slate-900 tracking-tight">
                    Arbitrary Shaped Density Function
                  </h1>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Automotive Grade
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Nonlinear Probabilistic Density Estimation with Multiple Extremums & MTBF
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  setMatlabModalTab('figures');
                  setShowMatlabModal(true);
                }}
                disabled={!regressionResult}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shadow-xs disabled:opacity-50"
                title="View original MATLAB benchmark figures (VDA 6.3, AEC-Q102, FMVSS 135 & AQG 324)"
              >
                <ImageIcon className="w-4 h-4" />
                <span>MATLAB Figures</span>
              </button>

              <button
                onClick={() => {
                  setMatlabModalTab('moussaoui');
                  setShowMatlabModal(true);
                }}
                disabled={!regressionResult}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg transition shadow-xs disabled:opacity-50"
              >
                <Terminal className="w-4 h-4" />
                <span>MATLAB Suite (.m)</span>
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                disabled={!regressionResult}
                className="flex items-center space-x-1.5 text-xs font-semibold px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition shadow-xs disabled:opacity-50"
              >
                <FileCode2 className="w-4 h-4" />
                <span>Export Code & Report</span>
              </button>
            </div>
          </div>

          {/* Quick-Load Automotive Benchmark Presets */}
          <div className="py-2.5 border-t border-slate-100 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap mr-1 flex items-center">
              <Car className="w-3.5 h-3.5 mr-1 text-slate-500" /> Presets:
            </span>
            {AUTOMOTIVE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset.id)}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition font-medium flex items-center space-x-1.5 ${
                  selectedPresetId === preset.id
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 hover:bg-slate-200/70 text-slate-700'
                }`}
              >
                <span>{preset.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    selectedPresetId === preset.id
                      ? 'bg-slate-700 text-slate-200'
                      : 'bg-white text-slate-500 border border-slate-200'
                  }`}
                >
                  {preset.recommendedExtrema} Modes
                </span>
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Workbench Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full flex flex-col space-y-6">
        {/* Preset Context Card */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                {currentPreset.componentType}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-medium text-slate-600">
                {currentPreset.standard}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed max-w-4xl">
              {currentPreset.description}
            </p>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center shrink-0">
            <button
              onClick={handleResetCurrentPreset}
              title="Reset data to preset defaults"
              className="flex items-center space-x-1 text-xs px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg border border-slate-200 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Preset</span>
            </button>
          </div>
        </section>

        {/* Regression Controls Bar */}
        <section className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
          {/* Model Formulation */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nonlinear Model Formulation
            </label>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value as ModelType)}
              className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
            >
              <option value="moussaoui_poly5">
                ★ Moussaoui 5th-Order Polynomial Method (PDF Program)
              </option>
              <option value="multimodal_mixture">
                Multimodal Mixture (Automotive Weibull Mixture)
              </option>
              <option value="log_polynomial">
                Log-Polynomial Arbitrary Density (Maximum Entropy)
              </option>
              <option value="generalized_bathtub">
                Generalized Bathtub Hazard (Hjorth / Extension)
              </option>
            </select>
          </div>

          {/* Extrema Target */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Target Extremum Modes (Peaks / Troughs)
            </label>
            <div className="flex items-center space-x-2">
              <select
                value={extremaCount}
                onChange={(e) => setExtremaCount(parseInt(e.target.value, 10))}
                className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500"
              >
                <option value={0}>Auto-Detect Prominent Extrema (KDE Roots)</option>
                <option value={1}>1 Extremum (Unimodal Distribution)</option>
                <option value={2}>2 Extremums (Bimodal: Infant + Wear-out)</option>
                <option value={3}>3 Extremums (Trimodal: Multi-failure)</option>
                <option value={4}>4 Extremums (Complex Arbitrary Shape)</option>
              </select>
            </div>
          </div>

          {/* Convergence Status */}
          <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 block font-medium">Solver Convergence</span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800">
                  Converged (Tolerance: 10⁻⁸)
                </span>
              </div>
            </div>
            {regressionResult && (
              <div className="text-right">
                <span className="text-[11px] text-slate-500 block font-medium">Goodness R²</span>
                <span className="text-xs font-mono font-bold text-blue-700">
                  {regressionResult.goodnessOfFit.rSquaredCdf.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </section>

        {/* Reliability Engineering Metric KPI Cards */}
        {regressionResult && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {/* MTBF */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Mean Value (MTBF)
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  {Math.round(regressionResult.mtbf).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">{unit}</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                σ = {Math.round(regressionResult.stdDev)} {unit}
              </span>
            </div>

            {/* B10 Life */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  B10 Warranty Life
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  90% R(t)
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-blue-700">
                  {Math.round(regressionResult.b10Life).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">{unit}</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                Automotive warranty limit
              </span>
            </div>

            {/* B1 Life */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                  B1 Life (ASIL Baseline)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  99% R(t)
                </span>
              </div>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-emerald-700">
                  {Math.round(regressionResult.b1Life).toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">{unit}</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                1% fleet failure milestone
              </span>
            </div>

            {/* Identified Extrema */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Extrema Identified
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-purple-700">
                  {regressionResult.extrema.length}
                </span>
                <span className="text-xs text-slate-500 font-medium">Roots df/dt = 0</span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1">
                {regressionResult.extrema.filter((e) => e.type === 'peak').length} Peak(s),{' '}
                {regressionResult.extrema.filter((e) => e.type === 'valley').length} Valley(s)
              </span>
            </div>

            {/* K-S Test & RMSE */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Kolmogorov-Smirnov Test
              </span>
              <div className="flex items-baseline space-x-1.5 mt-1">
                <span className="text-2xl font-bold font-mono text-slate-900">
                  p = {regressionResult.goodnessOfFit.ksPValue.toFixed(3)}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block mt-1 font-mono">
                RMSE = {regressionResult.goodnessOfFit.rmse.toFixed(4)}
              </span>
            </div>
          </section>
        )}

        {/* Visual Workbench & Data Inspector Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Visual Workbench (Left 2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            {regressionResult && (
              <WorkbenchCharts
                result={regressionResult}
                unit={unit}
                hoverTime={hoverTime}
                onHoverTimeChange={setHoverTime}
                standard={currentPreset.standard}
                presetId={currentPreset.id}
                onOpenMatlabFigures={() => {
                  setMatlabModalTab('figures');
                  setShowMatlabModal(true);
                }}
              />
            )}

            {/* Analytical Mathematical Formulation KaTeX Panels */}
            {regressionResult && (
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <div>
                      <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                        Analytical Mathematical Expressions
                      </h3>
                      <p className="text-xs text-slate-500">
                        Exact algebraic representations obtained via nonlinear regression
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowMatlabModal(true)}
                      className="flex items-center space-x-1 text-xs px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition font-medium"
                    >
                      <Terminal className="w-3.5 h-3.5 text-amber-600" />
                      <span>MATLAB Script</span>
                    </button>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {regressionResult.modelName}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  <MathFormula
                    title="1. Probability Density Function f(t)"
                    badge="Analytical PDF"
                    latex={regressionResult.formulaLatex.pdf}
                    plaintext={regressionResult.formulaText.pdf}
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <MathFormula
                      title="2. Survival / Reliability Function R(t)"
                      badge="R(t) = 1 - F(t)"
                      latex={regressionResult.formulaLatex.reliability}
                      plaintext={regressionResult.formulaText.reliability}
                    />

                    <MathFormula
                      title="3. Cumulative Failure Probability F(t)"
                      badge="F(t) = ∫ f(u) du"
                      latex={regressionResult.formulaLatex.cdf}
                      plaintext={regressionResult.formulaText.cdf}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <MathFormula
                      title="4. Failure Rate / Hazard Function λ(t)"
                      badge="λ(t) = f(t) / R(t)"
                      latex={regressionResult.formulaLatex.hazard}
                      plaintext={regressionResult.formulaText.hazard}
                    />

                    <MathFormula
                      title="5. Mean Time Between Failures (MTBF)"
                      badge="E[T] = ∫ R(t) dt"
                      latex={regressionResult.formulaLatex.mtbf}
                      plaintext={regressionResult.formulaText.mtbf}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Mission Profile & Fleet Reliability Calculator */}
            {regressionResult && (
              <MissionCalculator result={regressionResult} unit={unit} />
            )}
          </div>

          {/* Right Column: Editable Data Table & Identified Extrema Breakdown */}
          <div className="space-y-6">
            <DataTable
              data={dataPoints}
              onChange={setDataPoints}
              unit={unit}
              onUnitChange={setUnit}
            />

            {/* Identified Analytical Extrema Table */}
            {regressionResult && regressionResult.extrema.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-3">
                  <Activity className="w-4 h-4 text-purple-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Identified Analytical Extrema
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {regressionResult.extrema.map((ex, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100/60 transition text-xs"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide ${
                            ex.type === 'peak'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ex.type === 'peak' ? '★ Modal Peak' : '▼ Valley / Minimum'}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          t* = {Math.round(ex.time)} {unit}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mb-2">{ex.description}</p>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[10px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                        <div>
                          <span className="block text-[9px] text-slate-400">DENSITY f(t*)</span>
                          <span className="font-semibold text-slate-800">
                            {ex.density.toExponential(2)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">RELIABILITY</span>
                          <span className="font-semibold text-emerald-700">
                            {(ex.reliability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-slate-400">HAZARD λ(t*)</span>
                          <span className="font-semibold text-red-600">
                            {ex.failureRate.toExponential(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weibull Mixture Component Decomposition */}
            {regressionResult && regressionResult.mixtureComponents && (
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-3">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Mixture Component Parameters
                  </h3>
                </div>

                <div className="space-y-2 text-xs">
                  {regressionResult.mixtureComponents.map((comp) => (
                    <div
                      key={comp.index}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-800">{comp.name}</span>
                        <span className="font-mono text-[11px] font-bold text-blue-600">
                          w = {(comp.weight * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-slate-600">
                        <div>
                          Shape β: <b>{comp.beta.toFixed(2)}</b>
                        </div>
                        <div>
                          Scale η: <b>{Math.round(comp.eta)}</b>
                        </div>
                        <div>
                          MTBF: <b>{Math.round(comp.mtbf)}</b>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Export Modal */}
      {showExportModal && regressionResult && (
        <ExportModal
          result={regressionResult}
          unit={unit}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* MATLAB Reliability Toolbox Modal */}
      {showMatlabModal && regressionResult && (
        <MatlabModal
          result={regressionResult}
          unit={unit}
          rawPoints={dataPoints}
          standard={currentPreset.standard}
          presetId={currentPreset.id}
          initialTab={matlabModalTab}
          onClose={() => setShowMatlabModal(false)}
        />
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-2 no-print">
        <div className="flex items-center space-x-2">
          <span>Arbitrary Shaped Density Function Engineering Tool</span>
          <span>•</span>
          <span>VDA 6.3 / ISO 26262 ASIL Qualification Standard</span>
        </div>
        <div className="font-mono text-[11px] text-slate-400">
          Nonlinear Regression & Quadrature Core • High-Precision Analytics
        </div>
      </footer>
    </div>
  );
}
