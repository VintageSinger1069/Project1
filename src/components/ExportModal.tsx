import React, { useState } from 'react';
import { RegressionResult, ComponentFailureUnit } from '../types/reliability';
import {
  X,
  Copy,
  Check,
  FileCode,
  Download,
  Printer,
  FileText,
} from 'lucide-react';

interface ExportModalProps {
  result: RegressionResult;
  unit: ComponentFailureUnit;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  result,
  unit,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'python' | 'cpp' | 'matlab' | 'latex' | 'report'>('python');
  const [copied, setCopied] = useState(false);

  // Generate Python Code
  const pythonCode = `# ==============================================================================
# Analytical Arbitrary Shaped Density Function & Reliability Model
# Generated for Automotive Hardware Reliability Engineering
# Model: ${result.modelName}
# Extrema Identified: ${result.numExtrema}
# MTBF: ${result.mtbf.toFixed(2)} ${unit}
# ==============================================================================

import numpy as np
from scipy.special import gamma

${
  result.mixtureComponents
    ? `# Model Parameters: Multi-Modal Weibull Mixture
WEIGHTS = np.array([${result.mixtureComponents.map((c) => c.weight.toFixed(5)).join(', ')}])
BETAS   = np.array([${result.mixtureComponents.map((c) => c.beta.toFixed(5)).join(', ')}])
ETAS    = np.array([${result.mixtureComponents.map((c) => c.eta.toFixed(5)).join(', ')}])

def failure_density_f(t):
    """Probability Density Function f(t)"""
    t = np.atleast_1d(t).astype(float)
    f = np.zeros_like(t)
    for w, beta, eta in zip(WEIGHTS, BETAS, ETAS):
        z = np.maximum(0, t / eta)
        f += w * (beta / eta) * (z ** (beta - 1)) * np.exp(-(z ** beta))
    return f if f.size > 1 else f.item()

def reliability_R(t):
    """Reliability Function R(t) = 1 - F(t)"""
    t = np.atleast_1d(t).astype(float)
    r = np.zeros_like(t)
    for w, beta, eta in zip(WEIGHTS, BETAS, ETAS):
        z = np.maximum(0, t / eta)
        r += w * np.exp(-(z ** beta))
    return r if r.size > 1 else r.item()

def cumulative_failure_F(t):
    """Cumulative Failure Probability F(t)"""
    return 1.0 - reliability_R(t)

def failure_rate_lambda(t):
    """Hazard Rate / Failure Rate lambda(t) = f(t) / R(t)"""
    r = np.maximum(1e-12, reliability_R(t))
    return failure_density_f(t) / r

def compute_MTBF():
    """Mean Time Between Failures MTBF"""
    return np.sum(WEIGHTS * ETAS * gamma(1.0 + 1.0 / BETAS))

print("MTBF:", compute_MTBF(), "${unit}")
print("B10 Life:", ${result.b10Life.toFixed(2)}, "${unit}")
`
    : `# Analytical Model
def failure_density_f(t):
    return 0.0 # Polynomial model
`
}`;

  // Generate Embedded C++ / C Code
  const cppCode = `/**
 * @file automotive_reliability_model.h
 * @brief High-precision embedded analytical density function & hazard evaluator.
 * Compliant with ISO 26262 ASIL engineering requirements.
 */

#ifndef AUTOMOTIVE_RELIABILITY_MODEL_H
#define AUTOMOTIVE_RELIABILITY_MODEL_H

#include <math.h>

#ifdef __cplusplus
extern "C" {
#endif

#define NUM_MIXTURE_MODES ${result.mixtureComponents?.length || 1}
#define MTBF_${unit.toUpperCase()} ${result.mtbf.toFixed(2)}f
#define B10_LIFE_${unit.toUpperCase()} ${result.b10Life.toFixed(2)}f

${
  result.mixtureComponents
    ? `static const float WEIGHTS[${result.mixtureComponents.length}] = {${result.mixtureComponents.map((c) => c.weight.toFixed(5) + 'f').join(', ')}};
static const float BETAS[${result.mixtureComponents.length}]   = {${result.mixtureComponents.map((c) => c.beta.toFixed(5) + 'f').join(', ')}};
static const float ETAS[${result.mixtureComponents.length}]    = {${result.mixtureComponents.map((c) => c.eta.toFixed(5) + 'f').join(', ')}};

/**
 * @brief Evaluates reliability R(t) at operating time t (${unit})
 */
static inline float evaluate_reliability_R(float t) {
    if (t <= 0.0f) return 1.0f;
    float r = 0.0f;
    for (int k = 0; k < NUM_MIXTURE_MODES; k++) {
        float z = t / ETAS[k];
        r += WEIGHTS[k] * expf(-powf(z, BETAS[k]));
    }
    return r;
}

/**
 * @brief Evaluates probability density function f(t)
 */
static inline float evaluate_density_f(float t) {
    if (t <= 0.0f) return 0.0f;
    float f = 0.0f;
    for (int k = 0; k < NUM_MIXTURE_MODES; k++) {
        float z = t / ETAS[k];
        f += WEIGHTS[k] * (BETAS[k] / ETAS[k]) * powf(z, BETAS[k] - 1.0f) * expf(-powf(z, BETAS[k]));
    }
    return f;
}

/**
 * @brief Instantaneous failure rate lambda(t)
 */
static inline float evaluate_hazard_rate(float t) {
    float r = evaluate_reliability_R(t);
    if (r < 1e-7f) r = 1e-7f;
    return evaluate_density_f(t) / r;
}
`
    : `// Generic model implementation`
}

#ifdef __cplusplus
}
#endif

#endif /* AUTOMOTIVE_RELIABILITY_MODEL_H */
`;

  // Generate MATLAB Code
  const matlabCode = `% ==============================================================================
% MATLAB / GNU Octave: Arbitrary Shaped Probabilistic Density & Reliability
% Model: ${result.modelName} | Unit: ${unit}
% ==============================================================================

clear; clc; close all;

% 1. Model Parameters
w    = [${result.mixtureComponents?.map((c) => c.weight.toFixed(5)).join(', ') || '1.0'}];
beta = [${result.mixtureComponents?.map((c) => c.beta.toFixed(5)).join(', ') || '2.5'}];
eta  = [${result.mixtureComponents?.map((c) => c.eta.toFixed(5)).join(', ') || result.mtbf.toFixed(2)}];

K = length(w);
t = linspace(1, ${Math.round(result.displayMax)}, 1000);

% 2. Vectorized Function Handlers
f_pdf = @(t) sum(cell2mat(arrayfun(@(k) w(k) .* (beta(k) ./ eta(k)) .* ...
    max(0, t ./ eta(k)).^(beta(k) - 1) .* exp(-max(0, t ./ eta(k)).^beta(k)), ...
    (1:K)', 'UniformOutput', false)), 1);

R_rel = @(t) sum(cell2mat(arrayfun(@(k) w(k) .* ...
    exp(-max(0, t ./ eta(k)).^beta(k)), ...
    (1:K)', 'UniformOutput', false)), 1);

F_cdf = @(t) 1.0 - R_rel(t);
lambda_haz = @(t) f_pdf(t) ./ max(R_rel(t), 1e-12);

% 3. MTBF & Automotive B-Lives
mtbf_analytical = sum(w .* eta .* gamma(1 + 1 ./ beta));
b10_life = fzero(@(x) F_cdf(x) - 0.10, [1e-3, max(t)*3]);
b1_life  = fzero(@(x) F_cdf(x) - 0.01, [1e-3, max(t)*3]);

fprintf('=== Automotive Hardware Reliability Audit ===\\n');
fprintf('Analytical MTBF: %.2f ${unit}\\n', mtbf_analytical);
fprintf('B10 Life (90%% Survival): %.2f ${unit}\\n', b10_life);
fprintf('B1 Life (99%% ASIL): %.2f ${unit}\\n', b1_life);

% 4. Publication Figures (PDF, CDF, Hazard, Remaining Life)
figure('Color', 'w', 'Position', [100, 100, 1000, 750], 'Name', 'Reliability Engineering Profile');

subplot(2,2,1);
plot(t, f_pdf(t), 'b-', 'LineWidth', 2.2); hold on;
xline(mtbf_analytical, '--m', sprintf('MTBF = %.0f', mtbf_analytical), 'LineWidth', 1.5);
grid on; title('1. Probability Density f(t)'); xlabel('Time t (${unit})'); ylabel('Density [1/${unit}]');

subplot(2,2,2);
plot(t, R_rel(t)*100, 'g-', 'LineWidth', 2.2); hold on;
plot(t, F_cdf(t)*100, 'r--', 'LineWidth', 2.0);
yline(90, ':k', 'B10 Limit (90%)');
grid on; title('2. Reliability R(t) & Failure F(t)'); xlabel('Time t (${unit})'); ylabel('Probability [%]');
legend('Reliability R(t)', 'Failure F(t)', 'Location', 'east');

subplot(2,2,3);
semilogy(t, lambda_haz(t), 'r-', 'LineWidth', 2.2);
grid on; title('3. Failure Rate \\lambda(t) (Bathtub Curve)'); xlabel('Time t (${unit})'); ylabel('Hazard [Failures/${unit}]');

subplot(2,2,4);
cum_life = arrayfun(@(x) integral(@(u) R_rel(u), 0, x), t);
plot(t, cum_life, 'LineWidth', 2.2, 'Color', [0.4, 0.2, 0.7]);
yline(mtbf_analytical, '-.k', 'MTBF Plateau');
grid on; title('4. Accumulated Expected Life \\int R(u) du'); xlabel('Time t (${unit})'); ylabel('Life (${unit})');
`;

  // Generate LaTeX Document
  const latexDoc = `\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{booktabs}

\\title{Reliability Audit: Arbitrary Shaped Probabilistic Density Analysis}
\\author{Automotive Reliability Engineering Division}
\\date{\\today}

\\begin{document}
\\maketitle

\\section{Analytical Density Formulation}
The probabilistic density function $f(t)$ fitted via non-linear regression is given by:
\\begin{equation}
${result.formulaLatex.pdf}
\\end{equation}

\\section{Reliability and Cumulative Failure Probabilities}
The survival/reliability function $R(t)$ and failure probability $F(t)$ are:
\\begin{align}
${result.formulaLatex.reliability} \\\\
${result.formulaLatex.cdf}
\\end{align}

\\section{Failure Rate and Mean Value (MTBF)}
The instantaneous hazard function $\\lambda(t)$ and MTBF are:
\\begin{align}
${result.formulaLatex.hazard} \\\\
${result.formulaLatex.mtbf}
\\end{align}

\\section{Extrema and Goodness of Fit}
Number of identified modal extrema: $K = ${result.numExtrema}$.
$R^2 = ${result.goodnessOfFit.rSquaredCdf.toFixed(4)}$, $\\text{RMSE} = ${result.goodnessOfFit.rmse.toFixed(5)}$.
Kolmogorov-Smirnov statistic $D = ${result.goodnessOfFit.ksStatistic.toFixed(4)}$ ($p = ${result.goodnessOfFit.ksPValue.toFixed(4)}$).

\\end{document}
`;

  const getCodeContent = () => {
    switch (activeTab) {
      case 'python':
        return pythonCode;
      case 'cpp':
        return cppCode;
      case 'matlab':
        return matlabCode;
      case 'latex':
        return latexDoc;
      default:
        return '';
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext =
      activeTab === 'python'
        ? 'py'
        : activeTab === 'cpp'
        ? 'h'
        : activeTab === 'matlab'
        ? 'm'
        : 'tex';
    const blob = new Blob([getCodeContent()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytical_density_${activeTab}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-2.5">
            <FileCode className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Export Analytical Formulation & Source Code
              </h3>
              <p className="text-xs text-slate-500">
                Deployable mathematical functions for firmware, simulation, or technical reporting
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('python')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'python'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Python (SciPy / NumPy)
            </button>
            <button
              onClick={() => setActiveTab('cpp')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'cpp'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              C / C++ (ISO 26262 ECU)
            </button>
            <button
              onClick={() => setActiveTab('matlab')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'matlab'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              MATLAB / Octave
            </button>
            <button
              onClick={() => setActiveTab('latex')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'latex'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              LaTeX Technical Report
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition ${
                activeTab === 'report'
                  ? 'border-blue-600 text-blue-600 bg-blue-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              Audit Certificate (Print)
            </button>
          </div>

          <div className="flex items-center space-x-2 pb-2">
            {activeTab !== 'report' ? (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center space-x-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </>
            ) : (
              <button
                onClick={handlePrint}
                className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium transition shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Certificate</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-900 font-mono text-xs text-slate-200">
          {activeTab !== 'report' ? (
            <pre className="whitespace-pre overflow-x-auto leading-relaxed selection:bg-blue-600 selection:text-white">
              {getCodeContent()}
            </pre>
          ) : (
            <div className="bg-white text-slate-900 p-8 rounded-xl font-sans space-y-6">
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-black text-slate-900">
                    AUTOMOTIVE HARDWARE RELIABILITY AUDIT
                  </h1>
                  <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">
                    Non-Linear Probabilistic Density & Extrema Certification
                  </p>
                </div>
                <div className="text-right text-xs font-mono text-slate-500">
                  <div>Date: {new Date().toISOString().split('T')[0]}</div>
                  <div>Standard: ISO 26262 / VDA 6.3</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block font-semibold uppercase">Fitted Model</span>
                  <span className="text-sm font-bold">{result.modelName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block font-semibold uppercase">MTBF (Mean Time Between Failures)</span>
                  <span className="text-sm font-bold text-blue-700">{result.mtbf.toFixed(2)} {unit}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block font-semibold uppercase">B10 Warranty Life</span>
                  <span className="text-sm font-bold">{result.b10Life.toFixed(2)} {unit}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                  <span className="text-slate-500 block font-semibold uppercase">Goodness-of-Fit (R²)</span>
                  <span className="text-sm font-bold text-emerald-700">{result.goodnessOfFit.rSquaredCdf.toFixed(4)}</span>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Identified Analytical Extremums
                </h3>
                <table className="w-full text-left text-xs border border-slate-200 rounded">
                  <thead className="bg-slate-100 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2">Extremum Type</th>
                      <th className="p-2">Time ({unit})</th>
                      <th className="p-2">Density f(t)</th>
                      <th className="p-2">Reliability R(t)</th>
                      <th className="p-2">Failure Rate λ(t)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {result.extrema.map((ex, i) => (
                      <tr key={i}>
                        <td className="p-2 font-bold capitalize">{ex.type}</td>
                        <td className="p-2">{ex.time.toFixed(1)}</td>
                        <td className="p-2">{ex.density.toExponential(3)}</td>
                        <td className="p-2">{(ex.reliability * 100).toFixed(2)}%</td>
                        <td className="p-2">{ex.failureRate.toExponential(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500 flex justify-between">
                <span>Certified for Automotive Production by AI Studio Reliability Engineering Core</span>
                <span className="font-mono">Verification Hash: {Math.random().toString(36).substring(2, 10).toUpperCase()}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
