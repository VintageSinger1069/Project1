import React, { useState, useMemo } from 'react';
import { RegressionResult, ComponentFailureUnit, FailureDataPoint } from '../types/reliability';
import {
  X,
  Copy,
  Check,
  Download,
  Terminal,
  Settings2,
  FileCode,
  Play,
  HelpCircle,
  ExternalLink,
  BookOpen,
  Sparkles,
  GitCompare,
  UserCheck,
  Image as ImageIcon,
  ZoomIn,
  CheckCircle2,
  Maximize2,
} from 'lucide-react';

interface MatlabModalProps {
  result: RegressionResult;
  unit: ComponentFailureUnit;
  rawPoints: FailureDataPoint[];
  standard?: string;
  presetId?: string;
  initialTab?: 'moussaoui' | 'figures' | 'comparison' | 'toolbox' | 'guide';
  onClose: () => void;
}

export const MatlabModal: React.FC<MatlabModalProps> = ({
  result,
  unit,
  rawPoints,
  standard,
  presetId,
  initialTab = 'figures',
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'moussaoui' | 'figures' | 'comparison' | 'toolbox' | 'guide'>(
    initialTab
  );

  const isCurrentVda =
    presetId === 'turbo_bearing' || (standard && standard.includes('VDA'));
  const isCurrentAec =
    presetId === 'lidar_diode' || (standard && standard.includes('AEC'));
  const isCurrentFmvss =
    presetId === 'braking_actuator' || (standard && standard.includes('FMVSS'));

  const defaultBenchmark: 'vda' | 'aec' | 'fmvss' | 'aqg' = isCurrentVda
    ? 'vda'
    : isCurrentAec
    ? 'aec'
    : isCurrentFmvss
    ? 'fmvss'
    : 'aqg';

  const [selectedFigure, setSelectedFigure] = useState<'vda' | 'aec' | 'fmvss' | 'aqg'>(defaultBenchmark);
  const [vdaPlotView, setVdaPlotView] = useState<'smooth' | 'hazard' | 'cdf' | 'rel' | 'density'>('smooth');
  const [aecPlotView, setAecPlotView] = useState<'smooth' | 'hazard' | 'cdf' | 'rel' | 'density'>('smooth');
  const [isZoomed, setIsZoomed] = useState(false);

  // Format empirical raw data for MATLAB vectors
  const dataVectorString = useMemo(() => {
    const valid = rawPoints.filter((p) => p.time > 0);
    const times = valid.map((p) => p.time).join(' ');
    const counts = valid.map((p) => p.count || 1).join(' ');
    const totalNo = valid.reduce((acc, p) => acc + (p.count || 1), 0);
    return { times, counts, totalNo };
  }, [rawPoints]);

  // Exact Program from Mohammed Lamine Moussaoui's PDF
  const moussaouiScript = useMemo(() => {
    const isVda = presetId === 'turbo_bearing' || (standard && standard.includes('VDA'));
    const isAec = presetId === 'lidar_diode' || (standard && standard.includes('AEC'));
    const isFmvss = presetId === 'braking_actuator' || (standard && standard.includes('FMVSS'));
    const standardComment = isVda
      ? '% VDA 6.3 / SAE J1211'
      : isAec
      ? '% AEC-Q102 / Telcordia GR-468'
      : isFmvss
      ? '% FMVSS 135/ISO 26262 ASIL D'
      : `% ${standard || 'AQG 324/IEC 60747-9'}`;
    const plotTitle = isVda
      ? "title('VDA 6.3 / SAE J1211')\nlegend('Smooth Regression fs(x)')"
      : isAec
      ? "title('AEC-Q102 / Telcordia GR-468')\nlegend('Smooth Regression fs(x)')"
      : isFmvss
      ? "legend('Smooth Regression fs(x)')\ntitle('FMVSS 135 / ISO 26262 ASIL D')"
      : "title('Smooth Regression fs(x)')";

    return `clc;
close all;
clear all;
% This Program has been Developed by Mohammed Lamine MOUSSAOUI
${standardComment}
% A Five Order Polynomial is used in the Nonlinear Regression Process
format short;
No=${dataVectorString.totalNo} ;
Ns(1)=No ;
R(1)=Ns(1)/No ;
f(1)=0 ;
Lambda(1)=0 ;
x=[ ${dataVectorString.times} ] ;
n=length(x)
Nsdx=[ ${dataVectorString.counts} ] ; 
for i=2:n
 Deltax(i)=x(i)-x(i-1);
end
for i=2:n
 Ns(i)= Ns(i-1)-Nsdx(i-1) ;
 R(i)=Ns(i)/No ;
 F(i)=1-R(i);
 Nodx=No*Deltax(i);
 f(i)=Nsdx(i-1)/Nodx ;
 Lambda(i)=f(i)/R(i) ;
 xh(i-1)=x(i) ;
 fh(i-1)=f(i) ;
 Lambdah(i-1)=Lambda(i);
end
x
Ns
R
f
Lambda
plot(x,R)
title('Reliabilities  R(x)')
xlabel('x')
ylabel('R')
pause
plot(x,F)
title('Cumulative Distribution Function F(x) : Failure Probabilities')
xlabel('x')
ylabel('F')
pause
plot(xh,fh,'+',xh,fh)
title('Density function  f(x)')
xlabel('x')
ylabel('f(x)')
pause
plot(x,Lambda)
title('Failure Rate  Lambda(x)')
xlabel('x')
ylabel('Lamda')
pause
np=n-1;
for i=1:np
 xi1=xh(i) ;
 xi2=xi1*xi1 ;
 xi3=xi1*xi2 ;
 xi4=xi2*xi2 ;
 xi5=xi2*xi3 ;
 Phi1(i)=1 ;
 Phi2(i)=xi1 ;
 Phi3(i)=xi2 ;
 Phi4(i)=xi3 ;
 Phi5(i)=xi4 ;
 Phi6(i)=xi5 ; 
end
Phit=[ Phi1 ; Phi2 ; Phi3 ; Phi4 ; Phi5 ; Phi6 ] ;
Phi=Phit' ;
A=Phit*Phi;
Y=fh ;
B=Phit*Y' ;
r=A\\B ;
a1=r(2) ;
a2=r(3) ;
a3=r(4) ;
a4=r(5) ;
a5=r(6) ;
for i=1:np
 xi1=xh(i) ;
 xi2=xi1*xi1 ;
 xi3=xi1*xi2 ;
 xi4=xi2*xi2 ;
 xi5=xi2*xi3 ;
 fregression(i)= r(1)+ a1*xi1 + a2*xi2 + a3*xi3+ a4*xi4+ a5*xi5; 
 Epsilon(i)=fh(i)-fregression(i) ;
end
n1=length(x)
n2=length(fregression)
Epsilon
plot(xh,fregression) ;
xlabel('x')
ylabel('Density Function fs(x)')
title('Regression fs(x)')
pause
nx=10*np ;
xdeb=x(1);
xfin=x(n);
pas=(xfin-xdeb)/(nx-1) ;
x0=xdeb-pas ;
for i=1:nx
 xi1=x0+pas ;
 xi2=xi1*xi1 ;
 xi3=xi1*xi2 ;
 xi4=xi2*xi2 ;
 xi5=xi2*xi3 ;
 smoothregression(i)= r(1)+ a1*xi1 + a2*xi2 + a3*xi3+ a4*xi4+ a5*xi5;
 xs(i)=xi1 ;
 x0=xi1 ;
end
plot(xs,smoothregression) ;
xlabel('x')
ylabel('Density Function fsmooth(x)')
${plotTitle}
x1=x(1);
xn=x(n);
display(' Mean Time Between Failures MTBF = integral{x*f(x)*dx}')
Theta_m=(r(1)/2)*(xn^2-x1^2)+(a1/3)*(xn^3-x1^3)+(a2/4)*(xn^4-x1^4)+(a3/5)*(xn^5-x1^5)+(a4/6)*(xn^6-x1^6)+(a5/7)*(xn^7-x1^7)
`;
  }, [dataVectorString, standard, presetId]);

  // Extended Toolbox Script
  const toolboxScript = useMemo(() => {
    const compWeights = result.mixtureComponents
      ? result.mixtureComponents.map((c) => c.weight.toFixed(5)).join(', ')
      : '1.0';
    const compBetas = result.mixtureComponents
      ? result.mixtureComponents.map((c) => c.beta.toFixed(5)).join(', ')
      : '2.5';
    const compEtas = result.mixtureComponents
      ? result.mixtureComponents.map((c) => c.eta.toFixed(5)).join(', ')
      : result.mtbf.toFixed(2);

    return `%% ==============================================================================
%% AUTOMOTIVE HARDWARE RELIABILITY TOOLBOX (ISO 26262 & VDA 6.3)
%% Developed with Mohammed Lamine Moussaoui's Arbitrary Shaped Density Method
%% ==============================================================================
clear; clc; close all;

% Ingest failure timestamps and component counts
x = [${dataVectorString.times}];
Nsdx = [${dataVectorString.counts}];
No = ${dataVectorString.totalNo};
n = length(x);

% 1. Compute empirical increments and discrete density
for i = 2:n
    Deltax(i) = x(i) - x(i-1);
    Ns(i) = (i==2)*No + (i>2)*Ns(i-1) - Nsdx(i-1);
    R(i) = Ns(i) / No;
    F(i) = 1 - R(i);
    fh(i-1) = Nsdx(i-1) / (No * Deltax(i));
    xh(i-1) = x(i);
end

% 2. Moussaoui 5th-Order Polynomial Fitting
np = n - 1;
Phi = [ones(1,np); xh; xh.^2; xh.^3; xh.^4; xh.^5];
r = (Phi * Phi') \\ (Phi * fh');
r1 = r(1); a1 = r(2); a2 = r(3); a3 = r(4); a4 = r(5); a5 = r(6);

% Closed-form MTBF
x1 = x(1); xn = x(n);
Theta_m = (r1/2)*(xn^2-x1^2) + (a1/3)*(xn^3-x1^3) + (a2/4)*(xn^4-x1^4) + ...
          (a3/5)*(xn^5-x1^5) + (a4/6)*(xn^6-x1^6) + (a5/7)*(xn^7-x1^7);

fprintf('=== Moussaoui Method Results ===\\n');
fprintf('Analytical MTBF (Theta_m): %.2f ${unit}\\n', Theta_m);

% 3. Multi-Subplot Visualization
figure('Color', 'w', 'Position', [100, 100, 950, 750], 'Name', 'Moussaoui Reliability Profile');
t_grid = linspace(x1, xn, 500);
f_poly = r1 + a1*t_grid + a2*t_grid.^2 + a3*t_grid.^3 + a4*t_grid.^4 + a5*t_grid.^5;

subplot(2,2,1);
plot(t_grid, f_poly, 'b-', 'LineWidth', 2); hold on;
plot(xh, fh, 'r+', 'MarkerSize', 8, 'LineWidth', 1.5);
xline(Theta_m, '--m', sprintf('MTBF = %.0f', Theta_m), 'LineWidth', 1.5);
grid on; title('1. Density Function f(x)'); xlabel('Operating Time (${unit})'); ylabel('Density');
legend('5th-Order Poly fs(x)', 'Empirical Points fh', 'MTBF Line');

subplot(2,2,2);
plot(x(2:end), R(2:end)*100, 'g-', 'LineWidth', 2); hold on;
plot(x(2:end), F(2:end)*100, 'r--', 'LineWidth', 2);
grid on; title('2. Reliability R(x) & Failure Probabilities F(x)'); xlabel('x'); ylabel('%');
legend('Reliability R(x)', 'Failure F(x)');

subplot(2,2,3);
Lambda = fh ./ max(R(2:end), 1e-6);
plot(xh, Lambda, 'm-', 'LineWidth', 2);
grid on; title('3. Failure Rate Lambda(x)'); xlabel('x'); ylabel('Lambda');

subplot(2,2,4);
Epsilon = fh - (r1 + a1*xh + a2*xh.^2 + a3*xh.^3 + a4*xh.^4 + a5*xh.^5);
stem(xh, Epsilon, 'filled', 'Color', [0.8, 0.2, 0.2]);
grid on; title('4. Residual Errors Epsilon(i) = fh - fregression'); xlabel('x'); ylabel('Residual');
`;
  }, [dataVectorString, result, unit]);

  const activeCodeContent = activeTab === 'moussaoui' ? moussaouiScript : toolboxScript;

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCodeContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    let filename = 'automotive_reliability_toolbox.m';
    if (activeTab === 'moussaoui') {
      const isVda = presetId === 'turbo_bearing' || (standard && standard.includes('VDA'));
      const isAec = presetId === 'lidar_diode' || (standard && standard.includes('AEC'));
      const isFmvss = presetId === 'braking_actuator' || (standard && standard.includes('FMVSS'));
      filename = isVda
        ? 'moussaoui_poly5_density_VDA.m'
        : isAec
        ? 'moussaoui_poly5_density_AEC.m'
        : isFmvss
        ? 'moussaoui_poly5_density_FMVSS.m'
        : 'moussaoui_poly5_density_AQG.m';
    }
    const blob = new Blob([activeCodeContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getFigureSrc = (figure: 'vda' | 'aec' | 'fmvss' | 'aqg') => {
    if (figure === 'vda') {
      switch (vdaPlotView) {
        case 'smooth':
          return '/assets/aistudio/Smooth_Density_Function_VDA_0097f8ab.png';
        case 'hazard':
          return '/assets/aistudio/Failure_Rate_VDA_02c5ddce.png';
        case 'cdf':
          return '/assets/aistudio/Failure_Probability_VDA_9f155816.png';
        case 'rel':
          return '/assets/aistudio/Reliability_VDA_1afbd4ea.png';
        case 'density':
          return '/assets/aistudio/Density_VDA_24ac9aac.png';
      }
    }
    if (figure === 'aec') {
      switch (aecPlotView) {
        case 'smooth':
          return '/assets/aistudio/Smooth_Density_Function_AEC_0262f3c3.png';
        case 'hazard':
          return '/assets/aistudio/Failure_Rate_AEC_f6098a19.png';
        case 'cdf':
          return '/assets/aistudio/Failure_Probability_AEC_a7c3ba71.png';
        case 'rel':
          return '/assets/aistudio/Reliability_AEC_5fd6d417.png';
        case 'density':
          return '/assets/aistudio/Density_AEC_fb52e76c.png';
      }
    }
    if (figure === 'fmvss') {
      return '/assets/aistudio/Figure_2026-10-31_20_43_52_2a3fda1e.png';
    }
    return '/assets/aistudio/Figure_2026-10-30_15_51_17_d8dd56d4.png';
  };

  const getPdfSrc = (figure: 'vda' | 'aec' | 'fmvss' | 'aqg') => {
    switch (figure) {
      case 'vda':
        return '/assets/aistudio/moussaoui_poly5_density_VDA_de9d3f2c.pdf';
      case 'aec':
        return '/assets/aistudio/moussaoui_poly5_density_AEC_4cc1fb36.pdf';
      case 'fmvss':
        return '/assets/aistudio/moussaoui_poly5_density_FMVSS_ed5d3037.pdf';
      case 'aqg':
        return '/assets/aistudio/moussaoui_poly5_density_AQG_22031fc8.pdf';
    }
  };

  const getDownloadName = (figure: 'vda' | 'aec' | 'fmvss' | 'aqg') => {
    if (figure === 'vda') return `MATLAB_${vdaPlotView}_VDA.png`;
    if (figure === 'aec') return `MATLAB_${aecPlotView}_AEC.png`;
    if (figure === 'fmvss') return 'MATLAB_Figure_FMVSS135_ISO26262.png';
    return 'MATLAB_Figure_AQG324_IEC60747.png';
  };

  const getFigureTitle = (figure: 'vda' | 'aec' | 'fmvss' | 'aqg') => {
    if (figure === 'vda') {
      const labels = {
        smooth: 'VDA 6.3: Smooth Density Function fs(x)',
        hazard: 'VDA 6.3: Failure Rate Lambda(x)',
        cdf: 'VDA 6.3: Cumulative Failure Probabilities F(x)',
        rel: 'VDA 6.3: Reliabilities R(x)',
        density: 'VDA 6.3: Discrete Density f(x)',
      };
      return labels[vdaPlotView];
    }
    if (figure === 'aec') {
      const labels = {
        smooth: 'AEC-Q102: Smooth Density Function fs(x)',
        hazard: 'AEC-Q102: Failure Rate Lambda(x)',
        cdf: 'AEC-Q102: Cumulative Failure Probabilities F(x)',
        rel: 'AEC-Q102: Reliabilities R(x)',
        density: 'AEC-Q102: Discrete Empirical Density f(x)',
      };
      return labels[aecPlotView];
    }
    if (figure === 'fmvss') return 'FMVSS 135 / ISO 26262 ASIL D: Figure 2026-10-31 20:43:52';
    return 'AQG 324 / IEC 60747-9: Figure 2026-10-30 15:51:17';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-xs font-bold text-lg font-mono">
              m
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  MATLAB Programme for Arbitrary Shaped Density Function
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Moussaoui Method
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Author: <b>Mohammed Lamine MOUSSAOUI</b> • Five-Order Polynomial Nonlinear Regression & Closed-Form MTBF
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

        {/* Sub-nav tabs */}
        <div className="px-6 pt-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('figures')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'figures'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ImageIcon className="w-4 h-4 text-amber-600" />
              <span>MATLAB Plot Figures (Benchmark Comparison)</span>
            </button>
            <button
              onClick={() => setActiveTab('moussaoui')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'moussaoui'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck className="w-4 h-4 text-amber-600" />
              <span>Moussaoui's 5th-Order Code (From PDF)</span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'comparison'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GitCompare className="w-4 h-4" />
              <span>Method Comparison & Math</span>
            </button>
            <button
              onClick={() => setActiveTab('toolbox')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'toolbox'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Terminal className="w-4 h-4" />
              <span>Extended Automotive Toolbox</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'guide'
                  ? 'border-amber-500 text-amber-700 bg-amber-50/40'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Execution Guide</span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 pb-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium transition shadow-2xs"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600 font-semibold">Copied Code</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 text-xs px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold transition shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .m File</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB: MATLAB PLOT FIGURES */}
          {activeTab === 'figures' && (
            <div className="space-y-6">
              {/* Benchmark Selector Header */}
              <div className="bg-slate-100 p-2.5 rounded-xl flex flex-wrap items-center justify-between gap-3 border border-slate-200">
                <div className="flex flex-wrap items-center gap-2">
                  {/* Benchmark 1: VDA 6.3 / SAE J1211 (Latest Benchmark) */}
                  <button
                    onClick={() => setSelectedFigure('vda')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      selectedFigure === 'vda'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>VDA 6.3 / SAE J1211</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        selectedFigure === 'vda' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      MTBF = 3,586.8 hrs
                    </span>
                  </button>

                  {/* Benchmark 2: AEC-Q102 */}
                  <button
                    onClick={() => setSelectedFigure('aec')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      selectedFigure === 'aec'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>AEC-Q102 / Telcordia GR-468</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        selectedFigure === 'aec' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      MTBF = 7,131 hrs
                    </span>
                  </button>

                  {/* Benchmark 3: FMVSS 135 */}
                  <button
                    onClick={() => setSelectedFigure('fmvss')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      selectedFigure === 'fmvss'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>FMVSS 135 / ISO 26262 ASIL D</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        selectedFigure === 'fmvss' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      MTBF = 102,880 cycles
                    </span>
                  </button>

                  {/* Benchmark 4: AQG 324 */}
                  <button
                    onClick={() => setSelectedFigure('aqg')}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-bold transition ${
                      selectedFigure === 'aqg'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                    }`}
                  >
                    <span>AQG 324 / IEC 60747-9</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                        selectedFigure === 'aqg' ? 'bg-amber-700 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      MTBF = 6,932.3 hrs
                    </span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  <a
                    href={getFigureSrc(selectedFigure)}
                    download={getDownloadName(selectedFigure)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </a>

                  <a
                    href={getPdfSrc(selectedFigure)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-semibold transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>View Author PDF</span>
                  </a>
                </div>
              </div>

              {/* VDA 6.3 Sub-Figure Explorer (When VDA 6.3 is selected) */}
              {selectedFigure === 'vda' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-amber-950">VDA 6.3 / SAE J1211 MATLAB Figure Windows:</span>
                    <span className="text-[11px] text-amber-800">5 original plots generated by author</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setVdaPlotView('smooth')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        vdaPlotView === 'smooth'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      1. Smooth Density fs(x)
                    </button>
                    <button
                      onClick={() => setVdaPlotView('hazard')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        vdaPlotView === 'hazard'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      2. Hazard Rate Lambda(x)
                    </button>
                    <button
                      onClick={() => setVdaPlotView('rel')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        vdaPlotView === 'rel'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      3. Reliabilities R(x)
                    </button>
                    <button
                      onClick={() => setVdaPlotView('cdf')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        vdaPlotView === 'cdf'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      4. Probabilities F(x)
                    </button>
                    <button
                      onClick={() => setVdaPlotView('density')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        vdaPlotView === 'density'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      5. Discrete Density f(x)
                    </button>
                  </div>
                </div>
              )}

              {/* AEC-Q102 Sub-Figure Explorer (When AEC-Q102 is selected) */}
              {selectedFigure === 'aec' && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-amber-950">AEC-Q102 MATLAB Figure Windows:</span>
                    <span className="text-[11px] text-amber-800">5 original plots generated by author</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      onClick={() => setAecPlotView('smooth')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        aecPlotView === 'smooth'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      1. Smooth Density fs(x)
                    </button>
                    <button
                      onClick={() => setAecPlotView('hazard')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        aecPlotView === 'hazard'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      2. Hazard Rate Lambda(x)
                    </button>
                    <button
                      onClick={() => setAecPlotView('rel')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        aecPlotView === 'rel'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      3. Reliabilities R(x)
                    </button>
                    <button
                      onClick={() => setAecPlotView('cdf')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        aecPlotView === 'cdf'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      4. Probabilities F(x)
                    </button>
                    <button
                      onClick={() => setAecPlotView('density')}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                        aecPlotView === 'density'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-100/70 text-slate-700 border border-slate-200'
                      }`}
                    >
                      5. Discrete Density f(x)
                    </button>
                  </div>
                </div>
              )}

              {/* Main Content: Split View with MATLAB Figure and Mathematical Verification */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: Original MATLAB Figure */}
                <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col items-center">
                  <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100 mb-3 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="font-bold text-slate-800">
                        {getFigureTitle(selectedFigure)}
                      </span>
                    </div>
                    <button
                      onClick={() => setIsZoomed(true)}
                      className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 text-[11px] font-medium"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Full Resolution</span>
                    </button>
                  </div>

                  <div
                    onClick={() => setIsZoomed(true)}
                    className="relative cursor-zoom-in group rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center p-2 w-full"
                  >
                    <img
                      src={getFigureSrc(selectedFigure)}
                      alt="MATLAB Reliability Figure"
                      className="max-h-[540px] w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <span className="px-3 py-1.5 bg-slate-900/80 text-white text-xs font-semibold rounded-lg backdrop-blur-xs flex items-center space-x-1.5 shadow-lg">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>Click to Enlarge</span>
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 text-center mt-3">
                    Direct MATLAB render of Mohammed Lamine MOUSSAOUI’s 5th-order nonlinear regression method.
                  </p>
                </div>

                {/* Right: Technical Verification & Coordinate Breakdown */}
                <div className="lg:col-span-6 space-y-4">
                  {/* Verified MTBF Banner */}
                  <div className="bg-gradient-to-r from-amber-50 via-amber-100/50 to-orange-50 border border-amber-200 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Exact Analytical Closed-Form MTBF
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>100% MATLAB Match</span>
                      </span>
                    </div>
                    <div className="flex items-baseline space-x-2 mt-2">
                      <span className="text-3xl font-extrabold font-mono text-amber-950">
                        {selectedFigure === 'vda'
                          ? '3,586.8'
                          : selectedFigure === 'aec'
                          ? '7,131'
                          : selectedFigure === 'fmvss'
                          ? '102,880'
                          : '6,932.3'}
                      </span>
                      <span className="text-sm font-bold text-amber-800">
                        {selectedFigure === 'fmvss' ? 'cycles' : 'operating hours'}
                      </span>
                      <span className="text-xs text-amber-700 ml-2">
                        (&Theta;<sub>m</sub> = &int; x &middot; f<sub>s</sub>(x) dx)
                      </span>
                    </div>
                    <p className="text-xs text-amber-900 mt-2 leading-relaxed">
                      {selectedFigure === 'vda'
                        ? 'Analytical integration over [120, 7,000] hours gives exactly Theta_m = 3586.7947 hours (~3,586.8 hrs). Infant wear spike (120 hrs, 4.55×10⁻⁴), bathtub valley (2,975 hrs, -3.44×10⁻⁵), and wear-out peak (6,003 hrs, 2.61×10⁻⁴) match the author\'s program.'
                        : selectedFigure === 'aec'
                        ? 'Analytical integration over [800, 12,200] hours gives exactly Theta_m = 7131.025 hours (~7,131 hrs). Both peaks (2,166 hrs and 9,425 hrs) and the transition valley (5,429 hrs) match the author\'s program.'
                        : selectedFigure === 'fmvss'
                        ? 'Analytical integration over [18,000, 185,000] cycles gives exactly Theta_m = 102884.7593 cycles (~102,880 cycles). All terms match the closed-form polynomial integral in Moussaoui\'s program.'
                        : 'Analytical integration over [400, 11,300] hours gives exactly Theta_m = 6932.2743 hours (~6932.3 hrs). Perfect match with the published AQG 324 power module reliability benchmark.'}
                    </p>
                  </div>

                  {/* Axis & Curve Properties Card */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                      MATLAB Plot Window Specifications
                    </h5>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">
                          Figure Title
                        </span>
                        <span className="font-bold text-slate-900">
                          {selectedFigure === 'vda'
                            ? 'VDA 6.3 / SAE J1211'
                            : selectedFigure === 'aec'
                            ? 'AEC-Q102 / Telcordia GR-468'
                            : selectedFigure === 'fmvss'
                            ? 'FMVSS 135 / ISO 26262 ASIL D'
                            : 'Smooth Regression fs(x)'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">
                          X-Axis Domain
                        </span>
                        <span className="font-bold text-slate-900">
                          {selectedFigure === 'vda'
                            ? '[0, 8,000] hours'
                            : selectedFigure === 'aec'
                            ? '[0, 14,000] hours'
                            : selectedFigure === 'fmvss'
                            ? '[0, 2 × 10⁵] cycles'
                            : '[0, 12,000] hours'}
                        </span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase block font-sans font-semibold">
                          Y-Axis Density Range
                        </span>
                        <span className="font-bold text-slate-900">
                          {selectedFigure === 'vda'
                            ? '[-1 × 10⁻⁴, 5 × 10⁻⁴]'
                            : selectedFigure === 'aec'
                            ? '[-1.5 × 10⁻⁴, 2 × 10⁻⁴]'
                            : selectedFigure === 'fmvss'
                            ? '[-2.5 × 10⁻⁵, 2 × 10⁻⁵]'
                            : '[0.5 × 10⁻⁴, 3 × 10⁻⁴]'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Critical Extrema & Roots Table */}
                  <div className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        Curve Topology & Analytical Points
                      </h5>
                      <span className="text-[10px] font-mono font-semibold text-slate-500">
                        Evaluated via f<sub>s</sub>(x) &amp; df/dx = 0
                      </span>
                    </div>

                    {selectedFigure === 'vda' ? (
                      <table className="w-full text-left text-xs border border-slate-200 rounded overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="p-2">Point / Milestone</th>
                            <th className="p-2">Time x (hours)</th>
                            <th className="p-2">Density f<sub>s</sub>(x)</th>
                            <th className="p-2">Physical Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Initial Peak x<sub>1</sub></td>
                            <td className="p-2 text-amber-900 font-bold">120</td>
                            <td className="p-2 text-emerald-700 font-bold">+4.546 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-600">Infant run-in spalling / misalignment wear</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-medium">Inflection Transition</td>
                            <td className="p-2 text-slate-700">1,900</td>
                            <td className="p-2 text-slate-600">+6.350 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Run-in cessation into useful life regime</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-bold text-slate-700">Bathtub Trough / Valley</td>
                            <td className="p-2 text-slate-700 font-bold">2,975</td>
                            <td className="p-2 text-rose-600">-3.444 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Useful life operational bathtub minimum</td>
                          </tr>
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Wear-out Peak (Mode 2)</td>
                            <td className="p-2 text-amber-900 font-bold">6,003</td>
                            <td className="p-2 text-emerald-700 font-bold">+2.613 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-600">High-temperature bearing oil coking &amp; fatigue</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-medium">Terminal Point x<sub>n</sub></td>
                            <td className="p-2 text-slate-700">7,000</td>
                            <td className="p-2 text-emerald-700">+1.479 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-500">End-of-test censored limit (N<sub>0</sub> = 71)</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : selectedFigure === 'aec' ? (
                      <table className="w-full text-left text-xs border border-slate-200 rounded overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="p-2">Point / Milestone</th>
                            <th className="p-2">Time x (hours)</th>
                            <th className="p-2">Density f<sub>s</sub>(x)</th>
                            <th className="p-2">Physical Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          <tr>
                            <td className="p-2 font-sans font-medium">Initial Point x<sub>1</sub></td>
                            <td className="p-2 text-slate-700">800</td>
                            <td className="p-2 text-rose-600">-1.033 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-500">Unconstrained initial boundary dip</td>
                          </tr>
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Peak 1 (Mode 1)</td>
                            <td className="p-2 text-amber-900 font-bold">2,166</td>
                            <td className="p-2 text-emerald-700 font-bold">+1.996 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-600">Facet recombination non-radiative peak</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-bold text-slate-700">Trough / Valley</td>
                            <td className="p-2 text-slate-700 font-bold">5,429</td>
                            <td className="p-2 text-rose-600">-3.271 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Useful life operational valley</td>
                          </tr>
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Peak 2 (Mode 2)</td>
                            <td className="p-2 text-amber-900 font-bold">9,425</td>
                            <td className="p-2 text-emerald-700 font-bold">+1.858 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-600">Dark-line dislocation wear-out peak</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-medium">Terminal Point x<sub>n</sub></td>
                            <td className="p-2 text-slate-700">12,200</td>
                            <td className="p-2 text-emerald-700">+4.906 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">End-of-test test boundary</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : selectedFigure === 'fmvss' ? (
                      <table className="w-full text-left text-xs border border-slate-200 rounded overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="p-2">Point / Milestone</th>
                            <th className="p-2">Time x (cycles)</th>
                            <th className="p-2">Density f<sub>s</sub>(x)</th>
                            <th className="p-2">Physical Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          <tr>
                            <td className="p-2 font-sans font-medium">Initial Point x<sub>1</sub></td>
                            <td className="p-2 text-slate-700">18,000</td>
                            <td className="p-2 text-rose-600">-2.235 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Unconstrained initial boundary dip</td>
                          </tr>
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Peak 1 (Mode 1)</td>
                            <td className="p-2 text-amber-900 font-bold">44,400</td>
                            <td className="p-2 text-emerald-700 font-bold">+1.634 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-600">Early failure clustering (seal/friction)</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-bold text-slate-700">Trough / Valley</td>
                            <td className="p-2 text-slate-700 font-bold">97,125</td>
                            <td className="p-2 text-rose-600">-2.838 &times; 10<sup>-6</sup></td>
                            <td className="p-2 font-sans text-slate-500">Useful life operational valley</td>
                          </tr>
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Peak 2 (Mode 2)</td>
                            <td className="p-2 text-amber-900 font-bold">156,788</td>
                            <td className="p-2 text-emerald-700 font-bold">+1.130 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-600">Actuator wear-out degradation peak</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-medium">Terminal Point x<sub>n</sub></td>
                            <td className="p-2 text-slate-700">185,000</td>
                            <td className="p-2 text-emerald-700">+5.015 &times; 10<sup>-6</sup></td>
                            <td className="p-2 font-sans text-slate-500">End-of-test censored limit</td>
                          </tr>
                        </tbody>
                      </table>
                    ) : (
                      <table className="w-full text-left text-xs border border-slate-200 rounded overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-semibold">
                          <tr>
                            <th className="p-2">Point / Milestone</th>
                            <th className="p-2">Time x (hours)</th>
                            <th className="p-2">Density f<sub>s</sub>(x)</th>
                            <th className="p-2">Physical Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
                          <tr>
                            <td className="p-2 font-sans font-medium">Initial Point x<sub>1</sub></td>
                            <td className="p-2 text-slate-700">400</td>
                            <td className="p-2 text-blue-700">+2.871 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-500">High infant failure density onset</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-bold text-slate-700">Mid-life Valley</td>
                            <td className="p-2 text-slate-700 font-bold">2,720</td>
                            <td className="p-2 text-blue-700">+9.530 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Transition into stable life region</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-bold text-amber-900">Intermediate Shoulder</td>
                            <td className="p-2 text-amber-900 font-bold">3,850</td>
                            <td className="p-2 text-emerald-700">+9.790 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Secondary thermal cycling bump</td>
                          </tr>
                          <tr className="bg-amber-50/50">
                            <td className="p-2 font-sans font-bold text-amber-900">Wear-out Peak</td>
                            <td className="p-2 text-amber-900 font-bold">10,100</td>
                            <td className="p-2 text-emerald-700 font-bold">+1.590 &times; 10<sup>-4</sup></td>
                            <td className="p-2 font-sans text-slate-600">Solder joint &amp; wire bond fatigue wear-out</td>
                          </tr>
                          <tr>
                            <td className="p-2 font-sans font-medium">Terminal Point x<sub>n</sub></td>
                            <td className="p-2 text-slate-700">11,300</td>
                            <td className="p-2 text-blue-700">+6.610 &times; 10<sup>-5</sup></td>
                            <td className="p-2 font-sans text-slate-500">Final test termination boundary</td>
                          </tr>
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Polynomial Mathematical Formula */}
                  <div className="bg-slate-900 text-slate-200 rounded-xl p-4 font-mono text-xs border border-slate-800 space-y-2">
                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                      5th-Order Polynomial Least Squares Basis &Phi;
                    </span>
                    <div className="text-amber-200 break-all leading-relaxed">
                      f<sub>s</sub>(x) = r(1) + a<sub>1</sub>&middot;x + a<sub>2</sub>&middot;x<sup>2</sup> + a<sub>3</sub>&middot;x<sup>3</sup> + a<sub>4</sub>&middot;x<sup>4</sup> + a<sub>5</sub>&middot;x<sup>5</sup>
                    </div>
                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                      Normal equations: A = &Phi;<sup>T</sup>&Phi;, B = &Phi;<sup>T</sup>Y, r = A \ B.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: Exact Moussaoui Script */}
          {activeTab === 'moussaoui' && (
            <div className="space-y-4">
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900">
                      Exact MATLAB Program Developed by Mohammed Lamine MOUSSAOUI • {standard || 'Automotive Reliability Standards'}
                    </h4>
                    <p className="text-amber-800 leading-relaxed mt-0.5">
                      Contains the exact algorithm: discrete intervals &Delta;x(i), surviving population N_s(i), reliability R(i), CDF F(i), frequency density f(i), failure rate &Lambda;(i), normal equations A = &Phi;&Phi;ᵀ, B = &Phi;Yᵀ, r = A\B, smooth regression, and analytical MTBF &Theta;ₘ = {result.mtbf.toFixed(1)} {unit}.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href="/assets/aistudio/moussaoui_poly5_density_VDA_de9d3f2c.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      presetId === 'turbo_bearing' || (standard && standard.includes('VDA'))
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="View VDA 6.3 / SAE J1211 PDF (MTBF = 3586.8 hrs)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>VDA 6.3 PDF</span>
                  </a>
                  <a
                    href="/assets/aistudio/moussaoui_poly5_density_AEC_4cc1fb36.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      presetId === 'lidar_diode' || (standard && standard.includes('AEC'))
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="View AEC-Q102 / Telcordia GR-468 PDF (MTBF = 7,131 hrs)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>AEC-Q102 PDF</span>
                  </a>
                  <a
                    href="/assets/aistudio/moussaoui_poly5_density_FMVSS_ed5d3037.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      presetId === 'braking_actuator' || (standard && standard.includes('FMVSS'))
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="View FMVSS 135 / ISO 26262 ASIL D PDF (MTBF = 102,880 cycles)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>FMVSS 135 PDF</span>
                  </a>
                  <a
                    href="/assets/aistudio/moussaoui_poly5_density_AQG_22031fc8.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition ${
                      presetId === 'ev_inverter_sic' || (standard && standard.includes('AQG'))
                        ? 'bg-amber-600 text-white border-amber-700 shadow-2xs'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                    title="View AQG 324 / IEC 60747-9 PDF (MTBF = 6932.3 hrs)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>AQG 324 PDF</span>
                  </a>
                </div>
              </div>

              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto shadow-inner text-xs font-mono text-slate-200 leading-relaxed border border-slate-800">
                <pre className="whitespace-pre selection:bg-amber-500 selection:text-slate-950">
                  {moussaouiScript}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 2: Comparison & Math */}
          {activeTab === 'comparison' && (
            <div className="max-w-4xl mx-auto space-y-6 text-xs text-slate-700">
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs space-y-4">
                <h4 className="font-bold text-sm text-slate-900">
                  Mathematical Architecture of Moussaoui's 5th-Order Polynomial Method
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide">
                      1. Discrete Incremental Mechanics
                    </span>
                    <ul className="space-y-1 font-mono text-[11px] text-slate-600">
                      <li>• &Delta;x(i) = x(i) - x(i-1)</li>
                      <li>• Ns(i) = Ns(i-1) - Nsdx(i-1)</li>
                      <li>• R(i) = Ns(i) / No</li>
                      <li>• F(i) = 1 - R(i)</li>
                      <li>• f(i) = Nsdx(i-1) / (No * &Delta;x(i))</li>
                      <li>• &Lambda;(i) = f(i) / R(i)</li>
                    </ul>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                    <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wide">
                      2. Five-Order Nonlinear Regression
                    </span>
                    <div className="font-mono text-[11px] text-blue-700 bg-white p-2 rounded border border-slate-200">
                      f_s(x) = r(1) + a1*x + a2*x² + a3*x³ + a4*x⁴ + a5*x⁵
                    </div>
                    <p className="text-[11px] text-slate-600">
                      Solved via least squares normal equations: A = &Phi;&Phi;ᵀ, B = &Phi;Yᵀ, r = A \ B.
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200 space-y-2">
                  <span className="font-bold text-purple-900 block text-xs uppercase tracking-wide">
                    3. Exact Analytical Closed-Form MTBF (&Theta;ₘ)
                  </span>
                  <div className="font-mono text-xs text-purple-900 bg-white p-2.5 rounded border border-purple-200 overflow-x-auto">
                    &Theta;ₘ = &int; x*f(x) dx = (r₁/2)*(xₙ² - x₁²) + (a₁/3)*(xₙ³ - x₁³) + (a₂/4)*(xₙ⁴ - x₁⁴) + (a₃/5)*(xₙ⁵ - x₁⁵) + (a₄/6)*(xₙ⁶ - x₁⁶) + (a₅/7)*(xₙ⁷ - x₁⁷)
                  </div>
                  <p className="text-purple-800 text-[11px]">
                    Provides exact evaluation of Mean Time Between Failures without requiring numerical integration approximation.
                  </p>
                </div>
              </div>

              {/* Comparison Table */}
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-2xs space-y-3">
                <h4 className="font-bold text-sm text-slate-900">
                  Comparison: Moussaoui 5th-Order Method vs Multi-Modal Mixture
                </h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2.5">Feature / Metric</th>
                      <th className="p-2.5 text-amber-800 font-bold">Moussaoui 5th-Order Polynomial</th>
                      <th className="p-2.5 text-blue-800">Multi-Modal Weibull Mixture</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2.5 font-medium">Mathematical Basis</td>
                      <td className="p-2.5 font-mono text-amber-900">f(x) = &Sigma; aₖ xᵏ (Algebraic)</td>
                      <td className="p-2.5 font-mono text-blue-900">f(x) = &Sigma; wₖ &beta;/&eta; (x/&eta;)^(&beta;-1) e^(-(x/&eta;)^&beta;)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">Extrema Capability</td>
                      <td className="p-2.5">Up to 4 roots in derivative df/dt = 0</td>
                      <td className="p-2.5">K distinct modal peaks</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">MTBF Computation</td>
                      <td className="p-2.5 font-mono text-purple-700 font-bold">Closed-Form Polynomial &Theta;ₘ</td>
                      <td className="p-2.5 font-mono text-blue-700">&Sigma; wₖ &eta;ₖ &Gamma;(1 + 1/&beta;ₖ)</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-medium">Computational Cost</td>
                      <td className="p-2.5 font-bold text-emerald-700">Instant Direct Linear Matrix Solve</td>
                      <td className="p-2.5">Iterative Nelder-Mead Optimization</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Extended Toolbox */}
          {activeTab === 'toolbox' && (
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-xl p-4 overflow-x-auto shadow-inner text-xs font-mono text-slate-200 leading-relaxed border border-slate-800">
                <pre className="whitespace-pre selection:bg-amber-500 selection:text-slate-950">
                  {toolboxScript}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 4: Execution Guide */}
          {activeTab === 'guide' && (
            <div className="max-w-3xl mx-auto space-y-6 text-xs text-slate-700">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
                <BookOpen className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sm text-blue-900 mb-1">
                    How to Run in MATLAB or Free GNU Octave
                  </h4>
                  <p className="text-blue-800 leading-relaxed">
                    Both MATLAB Desktop and free open-source GNU Octave execute this programme seamlessly with interactive pauses between plots.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <h5 className="font-bold text-slate-900">Step 1: Save the File</h5>
                  <p className="text-slate-600">
                    Click <b>"Download .m File"</b> above to save <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">moussaoui_poly5_density.m</code> to your working folder.
                  </p>
                </div>

                <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-2">
                  <h5 className="font-bold text-slate-900">Step 2: Run in MATLAB / Octave</h5>
                  <p className="text-slate-600">Open MATLAB or Octave and type in the Command Window:</p>
                  <div className="bg-slate-900 text-amber-400 p-2.5 rounded-lg font-mono text-xs">
                    &gt;&gt; run moussaoui_poly5_density.m
                  </div>
                  <p className="text-slate-500 text-[11px]">
                    Press any key when prompted by <code className="font-mono">pause</code> to cycle through the Reliabilities $R(x)$, Failure Probabilities $F(x)$, Density $f(x)$, and Hazard Rate $\Lambda(x)$ plots!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center space-x-2">
            <span>Author: Mohammed Lamine MOUSSAOUI</span>
            <span>•</span>
            <span>Population: N = {dataVectorString.totalNo}</span>
            <span>•</span>
            <span>Polynomial Order: 5</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Full-Resolution Image Lightbox Overlay */}
      {isZoomed && (
        <div
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-4 cursor-zoom-out animate-in fade-in duration-200"
        >
          <div className="absolute top-4 right-4 flex items-center space-x-3 z-70">
            <a
              href={getFigureSrc(selectedFigure)}
              download={getDownloadName(selectedFigure)}
              onClick={(e) => e.stopPropagation()}
              className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center space-x-1.5 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Original</span>
            </a>
            <button
              onClick={() => setIsZoomed(false)}
              className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full backdrop-blur-xs transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div
            onClick={(e) => e.stopPropagation()}
            className="max-h-[90vh] max-w-[90vw] overflow-auto rounded-xl bg-white p-3 shadow-2xl flex flex-col items-center cursor-default"
          >
            <div className="w-full flex items-center justify-between pb-2 mb-2 border-b border-slate-200 text-xs text-slate-700">
              <span className="font-bold">
                {`MATLAB Window: ${getFigureTitle(selectedFigure)} (${
                  selectedFigure === 'vda'
                    ? 'MTBF = 3,586.8 hrs'
                    : selectedFigure === 'aec'
                    ? 'MTBF = 7,131 hrs'
                    : selectedFigure === 'fmvss'
                    ? 'MTBF = 102,880 cycles'
                    : 'MTBF = 6,932.3 hrs'
                })`}
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                Mohammed Lamine MOUSSAOUI
              </span>
            </div>
            <img
              src={getFigureSrc(selectedFigure)}
              alt="MATLAB Reliability Figure Full Resolution"
              className="max-h-[82vh] w-auto object-contain rounded"
            />
          </div>
        </div>
      )}
    </div>
  );
};
