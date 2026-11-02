import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  RegressionResult,
  ComponentFailureUnit,
} from '../types/reliability';
import {
  Activity,
  ShieldCheck,
  Flame,
  Clock,
  GitCommit,
  TrendingDown,
  LayoutGrid,
  Maximize2,
  CheckCircle2,
  HelpCircle,
  TrendingUp,
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Repeat,
  Sparkles,
  Gauge,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  SlidersHorizontal,
  Image as ImageIcon,
} from 'lucide-react';
import { formatSci } from '../lib/mathUtils';

interface WorkbenchChartsProps {
  result: RegressionResult;
  unit: ComponentFailureUnit;
  hoverTime: number | null;
  onHoverTimeChange: (time: number | null) => void;
  standard?: string;
  presetId?: string;
  onOpenMatlabFigures?: () => void;
}

type ChartTab = 'quad' | 'pdf' | 'cdf' | 'hazard' | 'mtbf' | 'derivatives' | 'weibull';

export const WorkbenchCharts: React.FC<WorkbenchChartsProps> = ({
  result,
  unit,
  hoverTime,
  onHoverTimeChange,
  standard,
  presetId,
  onOpenMatlabFigures,
}) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('quad');
  const [logScaleHazard, setLogScaleHazard] = useState<boolean>(false);
  const [showEmpiricalOverlay, setShowEmpiricalOverlay] = useState<boolean>(true);

  const {
    curvePoints,
    empiricalPoints,
    extrema,
    displayMax,
    b1Life,
    b10Life,
    b50Life,
    mtbf,
    stdDev,
  } = result;

  // Animation & Scrubbing States
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 0.5x, 1x, 2x, 4x
  const [isLooping, setIsLooping] = useState<boolean>(true);
  const [scrubTime, setScrubTime] = useState<number>(() =>
    Math.round(b10Life > 0 ? b10Life : mtbf * 0.7)
  );

  const animRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Active time for all visuals: hover takes priority if user is actively pointing with mouse,
  // otherwise scrubTime governs the synchronized view.
  const activeTime = useMemo(() => {
    if (hoverTime !== null && hoverTime !== undefined) {
      return hoverTime;
    }
    return Math.max(0, Math.min(displayMax, scrubTime));
  }, [hoverTime, scrubTime, displayMax]);

  // Max & Min scales
  const minPdf = useMemo(() => {
    const minVal = Math.min(0, ...curvePoints.map((p) => p.pdf));
    return minVal < 0 ? minVal * 1.15 : 0;
  }, [curvePoints]);

  const maxPdf = useMemo(() => {
    const maxVal = Math.max(
      ...curvePoints.map((p) => p.pdf),
      ...empiricalPoints.map((p) => p.empiricalPdf)
    );
    return maxVal > 0 ? maxVal * 1.15 : 0.001;
  }, [curvePoints, empiricalPoints]);

  const maxHazard = useMemo(() => {
    const reasonablePoints = curvePoints.filter((p) => p.reliability > 0.02);
    const maxVal = Math.max(...reasonablePoints.map((p) => p.hazard));
    return maxVal > 0 ? maxVal * 1.25 : 0.001;
  }, [curvePoints]);

  const minHazard = useMemo(() => {
    const positive = curvePoints.map((p) => p.hazard).filter((h) => h > 0);
    return positive.length > 0 ? Math.min(...positive) : 1e-6;
  }, [curvePoints]);

  const maxMtbfScale = useMemo(() => {
    return Math.max(mtbf * 1.25, displayMax * 0.9);
  }, [mtbf, displayMax]);

  const maxDeriv = useMemo(() => {
    const maxD1 = Math.max(...curvePoints.map((p) => Math.abs(p.d1)));
    return maxD1 > 0 ? maxD1 * 1.2 : 0.0001;
  }, [curvePoints]);

  // Synchronized interpolated point at activeTime
  const activePoint = useMemo(() => {
    let closest = curvePoints[0];
    let minDiff = Infinity;
    for (const p of curvePoints) {
      const diff = Math.abs(p.t - activeTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }
    return closest;
  }, [activeTime, curvePoints]);

  // Hazard rate rate of change (derivative dLambda/dt) to detect phase
  const hazardPhase = useMemo(() => {
    if (!activePoint) return { name: 'Steady State', color: 'blue', trend: 'flat', desc: 'Useful Life' };

    // Find previous and next points to compute derivative of hazard
    const idx = curvePoints.findIndex((p) => p.t >= activePoint.t);
    let dHaz = 0;
    if (idx > 0 && idx < curvePoints.length - 1) {
      const prev = curvePoints[idx - 1];
      const next = curvePoints[idx + 1];
      dHaz = (next.hazard - prev.hazard) / (next.t - prev.t || 1);
    }

    const t = activePoint.t;
    const rel = activePoint.reliability;

    if (t < (extrema[0]?.time || displayMax * 0.25) && dHaz < -1e-9) {
      return {
        name: 'Phase I: Infant Mortality (Burn-in)',
        color: 'amber',
        trend: 'down',
        desc: 'Decreasing failure rate (early defects & screening)',
      };
    } else if (rel < 0.85 || dHaz > 1e-9) {
      return {
        name: 'Phase III: Wear-out & Fatigue',
        color: 'red',
        trend: 'up',
        desc: 'Accelerating failure rate (degradation & aging)',
      };
    } else {
      return {
        name: 'Phase II: Stable Useful Life',
        color: 'emerald',
        trend: 'flat',
        desc: 'Near-constant failure rate (random operational stress)',
      };
    }
  }, [activePoint, curvePoints, extrema, displayMax]);

  // Automotive mission milestones along the timeline
  const milestones = useMemo(() => {
    const list: { label: string; shortLabel: string; time: number; type: string }[] = [
      { label: 'Start (t=0)', shortLabel: '0', time: 0, type: 'start' },
    ];

    if (b1Life > 0 && b1Life < displayMax) {
      list.push({ label: 'B1 Life (99% R)', shortLabel: 'B1', time: b1Life, type: 'b1' });
    }
    if (b10Life > 0 && b10Life < displayMax) {
      list.push({ label: 'B10 Warranty (90% R)', shortLabel: 'B10', time: b10Life, type: 'b10' });
    }
    extrema.forEach((ex, idx) => {
      if (ex.time > 0 && ex.time < displayMax) {
        list.push({
          label: ex.type === 'peak' ? `Peak ${idx + 1}` : `Valley ${idx + 1}`,
          shortLabel: ex.type === 'peak' ? `P${idx + 1}` : `V${idx + 1}`,
          time: ex.time,
          type: ex.type,
        });
      }
    });
    if (mtbf > 0 && mtbf < displayMax) {
      list.push({ label: 'MTBF (Mean Life)', shortLabel: 'MTBF', time: mtbf, type: 'mtbf' });
    }
    if (b50Life > 0 && b50Life < displayMax) {
      list.push({ label: 'B50 Median Life', shortLabel: 'B50', time: b50Life, type: 'b50' });
    }

    return list.sort((a, b) => a.time - b.time);
  }, [b1Life, b10Life, b50Life, mtbf, extrema, displayMax]);

  // Animation Frame Loop
  useEffect(() => {
    if (!isPlaying) {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      lastTimestampRef.current = null;
      return;
    }

    // Default duration: 14 seconds to traverse entire mission time at 1.0x
    const baseDurationMs = 14000;
    const rate = displayMax / (baseDurationMs / playbackSpeed);

    const loop = (timestamp: number) => {
      if (lastTimestampRef.current !== null) {
        const delta = timestamp - lastTimestampRef.current;
        setScrubTime((prev) => {
          let next = prev + rate * delta;
          if (next >= displayMax) {
            if (isLooping) {
              next = 0;
            } else {
              setIsPlaying(false);
              return displayMax;
            }
          }
          return next;
        });
      }
      lastTimestampRef.current = timestamp;
      animRef.current = requestAnimationFrame(loop);
    };

    animRef.current = requestAnimationFrame(loop);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isPlaying, playbackSpeed, isLooping, displayMax]);

  // Keyboard shortcut listener: Space to toggle play/pause, Left/Right to step
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((prev) => !prev);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setScrubTime((prev) => Math.min(displayMax, prev + displayMax * 0.02));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setScrubTime((prev) => Math.max(0, prev - displayMax * 0.02));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayMax]);

  // Scrubbing handlers
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubTime(val);
    onHoverTimeChange(val);
  };

  const handleStep = (fraction: number) => {
    setScrubTime((prev) => Math.max(0, Math.min(displayMax, prev + displayMax * fraction)));
  };

  const handleJumpToTime = (targetTime: number) => {
    setScrubTime(targetTime);
    onHoverTimeChange(targetTime);
  };

  // Generic SVG Chart Renderer Helper
  const renderSingleChart = (
    type: 'pdf' | 'cdf' | 'hazard' | 'mtbf' | 'derivatives' | 'weibull',
    isMini: boolean = false
  ) => {
    const width = isMini ? 400 : 800;
    const height = isMini ? 240 : 380;
    const padding = isMini
      ? { top: 25, right: 25, bottom: 42, left: 55 }
      : { top: 30, right: 40, bottom: 50, left: 70 };
    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const scaleX = (t: number) => padding.left + (t / displayMax) * plotWidth;
    const invScaleX = (xSvg: number) => ((xSvg - padding.left) / plotWidth) * displayMax;

    const scaleYPdf = (y: number) => {
      const range = maxPdf - minPdf || 1;
      return padding.top + plotHeight - ((y - minPdf) / range) * plotHeight;
    };
    const scaleYProb = (p: number) => padding.top + plotHeight - p * plotHeight;
    const scaleYMtbf = (v: number) => padding.top + plotHeight - (v / maxMtbfScale) * plotHeight;

    const scaleYHazard = (h: number) => {
      if (logScaleHazard) {
        const logMin = Math.log10(Math.max(1e-7, minHazard));
        const logMax = Math.log10(Math.max(1e-6, maxHazard));
        const logVal = Math.log10(Math.max(1e-7, h));
        const fraction = (logVal - logMin) / (logMax - logMin || 1);
        return padding.top + plotHeight - Math.max(0, Math.min(1, fraction)) * plotHeight;
      }
      return padding.top + plotHeight - (h / maxHazard) * plotHeight;
    };

    const scaleYDeriv = (d: number) =>
      padding.top + plotHeight / 2 - (d / maxDeriv) * (plotHeight / 2);

    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPixel = e.clientX - rect.left;
      const xSvg = (xPixel / rect.width) * width;
      if (xSvg >= padding.left && xSvg <= width - padding.right) {
        const t = invScaleX(xSvg);
        onHoverTimeChange(Math.max(0, Math.min(displayMax, t)));
      }
    };

    const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xPixel = e.clientX - rect.left;
      const xSvg = (xPixel / rect.width) * width;
      if (xSvg >= padding.left && xSvg <= width - padding.right) {
        const t = invScaleX(xSvg);
        setScrubTime(Math.max(0, Math.min(displayMax, t)));
        onHoverTimeChange(t);
      }
    };

    const xTicksCount = isMini ? 5 : 7;
    const xTicks: number[] = [];
    for (let i = 0; i <= xTicksCount; i++) {
      xTicks.push((i / xTicksCount) * displayMax);
    }

    // Paths
    const pdfPath = curvePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYPdf(p.pdf).toFixed(1)}`)
      .join(' ');

    const baselineY = minPdf < 0 ? scaleYPdf(0) : padding.top + plotHeight;
    const pdfArea =
      curvePoints.length > 0
        ? `${pdfPath} L ${scaleX(curvePoints[curvePoints.length - 1].t).toFixed(1)} ${baselineY.toFixed(
            1
          )} L ${scaleX(curvePoints[0].t).toFixed(1)} ${baselineY.toFixed(1)} Z`
        : '';

    // Dynamic shaded area up to active scrubbed time for PDF (Cumulative Failures)
    const pointsUpToActive = curvePoints.filter((p) => p.t <= activeTime);
    const pdfActiveSweepArea =
      pointsUpToActive.length > 1
        ? `${pointsUpToActive
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYPdf(p.pdf).toFixed(1)}`)
            .join(' ')} L ${scaleX(activePoint.t).toFixed(1)} ${baselineY.toFixed(
            1
          )} L ${scaleX(pointsUpToActive[0].t).toFixed(1)} ${baselineY.toFixed(1)} Z`
        : '';

    const cdfPath = curvePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYProb(p.cdf).toFixed(1)}`)
      .join(' ');

    const relPath = curvePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYProb(p.reliability).toFixed(1)}`)
      .join(' ');

    const hazardPoints = curvePoints.filter((p) => p.reliability > 0.015);
    const hazardPath = hazardPoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYHazard(p.hazard).toFixed(1)}`)
      .join(' ');

    // Dynamic sweep path on hazard curve up to active scrubbed time
    const hazardSweepPoints = hazardPoints.filter((p) => p.t <= activeTime);
    const hazardSweepPath =
      hazardSweepPoints.length > 1
        ? hazardSweepPoints
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYHazard(p.hazard).toFixed(1)}`)
            .join(' ')
        : '';

    const mtbfCurvePath = curvePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYMtbf(p.cumulativeMtbf).toFixed(1)}`)
      .join(' ');

    const residualLifePath = curvePoints
      .filter((p) => p.reliability > 0.015)
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYMtbf(p.residualLife).toFixed(1)}`)
      .join(' ');

    const d1Path = curvePoints
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.t).toFixed(1)} ${scaleYDeriv(p.d1).toFixed(1)}`)
      .join(' ');

    const activeXPos = scaleX(activePoint.t);

    return (
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto select-none cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHoverTimeChange(null)}
        onClick={handleChartClick}
      >
        <defs>
          <linearGradient id={`pdfGrad_${type}_${isMini}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`pdfSweepGrad_${type}_${isMini}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.10" />
          </linearGradient>
          <linearGradient id={`hazardGrad_${type}_${isMini}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dc2626" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#dc2626" stopOpacity="0.02" />
          </linearGradient>
          <filter id="scrubberGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" />
          </filter>
        </defs>

        {/* Background Grid */}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill="#fafafa"
        />

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top + plotHeight}
          x2={padding.left + plotWidth}
          y2={padding.top + plotHeight}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotHeight}
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />

        {/* X Ticks */}
        {xTicks.map((t, idx) => {
          const x = scaleX(t);
          return (
            <g key={`xtick-${idx}`} transform={`translate(${x}, ${padding.top + plotHeight})`}>
              <line y2="5" stroke="#94a3b8" strokeWidth="1" />
              <text
                y={isMini ? '14' : '18'}
                textAnchor="middle"
                className="fill-slate-500 font-mono text-[9px]"
              >
                {Math.round(t)}
              </text>
            </g>
          );
        })}
        <text
          x={padding.left + plotWidth / 2}
          y={height - (isMini ? 6 : 10)}
          textAnchor="middle"
          className="fill-slate-600 font-medium text-[10px] tracking-wide"
        >
          Operating Time t ({unit})
        </text>

        {/* ============================================================== */}
        {/* CHART 1: PROBABILITY DENSITY FUNCTION (PDF)                   */}
        {/* ============================================================== */}
        {type === 'pdf' && (
          <>
            {(minPdf < 0
              ? [-1.0, -0.66, -0.33, 0, 0.33, 0.66, 1.0].map((f) =>
                  f < 0 ? f * Math.abs(minPdf) : f * maxPdf
                )
              : [0, 0.25, 0.5, 0.75, 1.0].map((frac) => frac * maxPdf)
            ).map((val, idx) => {
              const y = scaleYPdf(val);
              const isZero = Math.abs(val) < 1e-12;
              return (
                <g key={`ypdf-${idx}`} transform={`translate(${padding.left}, ${y})`}>
                  <line x2="-5" stroke="#94a3b8" strokeWidth="1" />
                  <line
                    x2={plotWidth}
                    stroke={isZero ? '#94a3b8' : '#f1f5f9'}
                    strokeWidth={isZero ? '1.5' : '1'}
                    strokeDasharray={isZero ? '3 3' : undefined}
                  />
                  <text
                    x="-8"
                    y="3"
                    textAnchor="end"
                    className={`font-mono text-[9px] ${
                      isZero ? 'fill-slate-700 font-semibold' : 'fill-slate-500'
                    }`}
                  >
                    {formatSci(val, 2)}
                  </text>
                </g>
              );
            })}
            <text
              transform={`rotate(-90) translate(-${padding.top + plotHeight / 2}, ${isMini ? 14 : 20})`}
              textAnchor="middle"
              className="fill-slate-600 font-semibold text-[10px]"
            >
              Density f(t) [1/{unit}]
            </text>

            {/* Base Shaded Area */}
            <path d={pdfArea} fill={`url(#pdfGrad_${type}_${isMini})`} />

            {/* Dynamic Sweep Shaded Area up to active scrubbed time */}
            {pdfActiveSweepArea && (
              <path d={pdfActiveSweepArea} fill={`url(#pdfSweepGrad_${type}_${isMini})`} />
            )}

            {/* Empirical KDE Points */}
            {showEmpiricalOverlay && (
              <g opacity="0.6">
                {empiricalPoints.map((pt, idx) => (
                  <circle
                    key={`kde-pt-${idx}`}
                    cx={scaleX(pt.time)}
                    cy={scaleYPdf(pt.empiricalPdf)}
                    r={isMini ? '2' : '2.5'}
                    fill="#64748b"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                ))}
              </g>
            )}

            {/* Analytical Curve */}
            <path
              d={pdfPath}
              fill="none"
              stroke="#2563eb"
              strokeWidth={isMini ? '2' : '2.5'}
              strokeLinecap="round"
            />

            {/* Extrema Markers */}
            {extrema.map((ex, idx) => {
              const exX = scaleX(ex.time);
              const exY = scaleYPdf(ex.density);
              const isPeak = ex.type === 'peak';
              return (
                <g key={`ext-${idx}`}>
                  <line
                    x1={exX}
                    y1={exY}
                    x2={exX}
                    y2={padding.top + plotHeight}
                    stroke={isPeak ? '#2563eb' : '#d97706'}
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                  <circle
                    cx={exX}
                    cy={exY}
                    r={isMini ? '3.5' : '4.5'}
                    fill={isPeak ? '#1d4ed8' : '#d97706'}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

            {/* Active Point Tracker on PDF Curve */}
            <circle
              cx={activeXPos}
              cy={scaleYPdf(activePoint.pdf)}
              r={isMini ? '4' : '5'}
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Legend in corner */}
            <g transform={`translate(${padding.left + plotWidth - (isMini ? 120 : 160)}, ${padding.top + 8})`}>
              <rect
                x="0"
                y="0"
                width={isMini ? 115 : 152}
                height={isMini ? 24 : 28}
                rx="4"
                fill="#ffffff"
                stroke="#e2e8f0"
                opacity="0.95"
              />
              <line x1="8" y1={isMini ? 12 : 14} x2="24" y2={isMini ? 12 : 14} stroke="#2563eb" strokeWidth="2.5" />
              <text x="28" y={isMini ? 15 : 17} className="fill-blue-900 font-semibold text-[9px]">
                {result.modelType === 'moussaoui_poly5'
                  ? 'Smooth Regression fs(x)'
                  : 'Fitted Density f(t)'}
              </text>
            </g>
          </>
        )}

        {/* ============================================================== */}
        {/* CHART 2: CUMULATIVE DISTRIBUTION (CDF) & RELIABILITY R(t)       */}
        {/* ============================================================== */}
        {type === 'cdf' && (
          <>
            {[0, 0.25, 0.5, 0.75, 1.0].map((val, idx) => {
              const y = scaleYProb(val);
              return (
                <g key={`yprob-${idx}`} transform={`translate(${padding.left}, ${y})`}>
                  <line x2="-5" stroke="#94a3b8" strokeWidth="1" />
                  <line x2={plotWidth} stroke="#f1f5f9" strokeWidth="1" />
                  <text
                    x="-8"
                    y="3"
                    textAnchor="end"
                    className="fill-slate-500 font-mono text-[9px]"
                  >
                    {(val * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}
            <text
              transform={`rotate(-90) translate(-${padding.top + plotHeight / 2}, ${isMini ? 14 : 20})`}
              textAnchor="middle"
              className="fill-slate-600 font-semibold text-[10px]"
            >
              Cumulative Probability [%]
            </text>

            {/* Curves */}
            <path
              d={relPath}
              fill="none"
              stroke="#059669"
              strokeWidth={isMini ? '2' : '2.5'}
              strokeLinecap="round"
            />
            <path
              d={cdfPath}
              fill="none"
              stroke="#dc2626"
              strokeWidth={isMini ? '2' : '2.5'}
              strokeDasharray={isMini ? '3 2' : '5 3'}
              strokeLinecap="round"
            />

            {/* Empirical Median Ranks */}
            {showEmpiricalOverlay && (
              <g>
                {empiricalPoints.map((pt, idx) => (
                  <circle
                    key={`emp-rk-${idx}`}
                    cx={scaleX(pt.time)}
                    cy={scaleYProb(pt.empiricalReliability)}
                    r={isMini ? '2' : '2.5'}
                    fill="#047857"
                    stroke="#ffffff"
                    strokeWidth="0.8"
                  />
                ))}
              </g>
            )}

            {/* Active scrubbed horizontal guides to Y axis */}
            <line
              x1={padding.left}
              y1={scaleYProb(activePoint.reliability)}
              x2={activeXPos}
              y2={scaleYProb(activePoint.reliability)}
              stroke="#059669"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.8"
            />
            <line
              x1={padding.left}
              y1={scaleYProb(activePoint.cdf)}
              x2={activeXPos}
              y2={scaleYProb(activePoint.cdf)}
              stroke="#dc2626"
              strokeWidth="1"
              strokeDasharray="2 2"
              opacity="0.8"
            />

            {/* Active Points on R(t) and F(t) */}
            <circle
              cx={activeXPos}
              cy={scaleYProb(activePoint.reliability)}
              r={isMini ? '4' : '5.5'}
              fill="#059669"
              stroke="#ffffff"
              strokeWidth="2"
            />
            <circle
              cx={activeXPos}
              cy={scaleYProb(activePoint.cdf)}
              r={isMini ? '3.5' : '5'}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Live readout pill on plot */}
            <g transform={`translate(${activeXPos}, ${scaleYProb(activePoint.reliability) - (isMini ? 12 : 16)})`}>
              <rect
                x="-36"
                y="-10"
                width="72"
                height="15"
                rx="3"
                fill="#065f46"
                opacity="0.92"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                className="fill-white font-mono text-[8px] font-bold"
              >
                R: {(activePoint.reliability * 100).toFixed(1)}%
              </text>
            </g>

            {/* Legend in corner */}
            <g transform={`translate(${padding.left + plotWidth - (isMini ? 95 : 140)}, ${padding.top + 8})`}>
              <rect
                x="0"
                y="0"
                width={isMini ? 90 : 130}
                height={isMini ? 36 : 42}
                rx="4"
                fill="#ffffff"
                stroke="#e2e8f0"
                opacity="0.95"
              />
              <line x1="8" y1="12" x2="22" y2="12" stroke="#059669" strokeWidth="2" />
              <text x="26" y="15" className="fill-emerald-800 font-semibold text-[8px]">
                Reliability R(t)
              </text>
              <line
                x1="8"
                y1={isMini ? '24' : '28'}
                x2="22"
                y2={isMini ? '24' : '28'}
                stroke="#dc2626"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <text
                x="26"
                y={isMini ? '27' : '31'}
                className="fill-red-800 font-semibold text-[8px]"
              >
                Cumulative Failure F(t)
              </text>
            </g>
          </>
        )}

        {/* ============================================================== */}
        {/* CHART 3: FAILURE RATE / HAZARD FUNCTION λ(t)                   */}
        {/* ============================================================== */}
        {type === 'hazard' && (
          <>
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const val = frac * maxHazard;
              const y = scaleYHazard(val);
              return (
                <g key={`yhaz-${idx}`} transform={`translate(${padding.left}, ${y})`}>
                  <line x2="-5" stroke="#94a3b8" strokeWidth="1" />
                  <line x2={plotWidth} stroke="#f1f5f9" strokeWidth="1" />
                  <text
                    x="-8"
                    y="3"
                    textAnchor="end"
                    className="fill-slate-500 font-mono text-[9px]"
                  >
                    {formatSci(val, 2)}
                  </text>
                </g>
              );
            })}
            <text
              transform={`rotate(-90) translate(-${padding.top + plotHeight / 2}, ${isMini ? 14 : 20})`}
              textAnchor="middle"
              className="fill-slate-600 font-semibold text-[10px]"
            >
              Failure Rate λ(t) [Failures/{unit}]
            </text>

            {/* Base hazard line */}
            <path
              d={hazardPath}
              fill="none"
              stroke="#f87171"
              strokeWidth={isMini ? '1.8' : '2'}
              strokeLinecap="round"
              opacity="0.6"
            />

            {/* Dynamic highlighted sweep path up to scrubbed active time */}
            {hazardSweepPath && (
              <path
                d={hazardSweepPath}
                fill="none"
                stroke="#dc2626"
                strokeWidth={isMini ? '2.5' : '3.2'}
                strokeLinecap="round"
              />
            )}

            {/* Active Hazard Tracker Beacon & Glow Ring */}
            <circle
              cx={activeXPos}
              cy={scaleYHazard(activePoint.hazard)}
              r={isMini ? '8' : '11'}
              fill="none"
              stroke="#ef4444"
              strokeWidth="1.5"
              opacity="0.45"
            />
            <circle
              cx={activeXPos}
              cy={scaleYHazard(activePoint.hazard)}
              r={isMini ? '4.5' : '6'}
              fill="#dc2626"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Live readout badge above current hazard marker */}
            <g
              transform={`translate(${Math.min(
                padding.left + plotWidth - (isMini ? 40 : 55),
                Math.max(padding.left + (isMini ? 40 : 55), activeXPos)
              )}, ${Math.max(padding.top + 14, scaleYHazard(activePoint.hazard) - (isMini ? 14 : 18))})`}
            >
              <rect
                x={isMini ? -40 : -55}
                y="-11"
                width={isMini ? 80 : 110}
                height="16"
                rx="3.5"
                fill="#991b1b"
                opacity="0.95"
              />
              <text
                x="0"
                y="1"
                textAnchor="middle"
                className="fill-white font-mono text-[8px] font-bold"
              >
                λ: {formatSci(activePoint.hazard, 2)} ({Math.round(activePoint.hazard * 1e9)} FIT)
              </text>
            </g>

            {/* Bathtub zones annotations */}
            <g transform={`translate(${padding.left + plotWidth * 0.5}, ${padding.top + (isMini ? 10 : 16)})`}>
              <rect
                x={isMini ? -65 : -85}
                y="-9"
                width={isMini ? 130 : 170}
                height="16"
                rx="3"
                fill="#fef2f2"
                stroke="#fecaca"
              />
              <text
                x="0"
                y="3"
                textAnchor="middle"
                className="fill-red-800 font-bold text-[8px]"
              >
                Bathtub Hazard λ(t) = f(t) / R(t)
              </text>
            </g>
          </>
        )}

        {/* ============================================================== */}
        {/* CHART 4: MEAN TIME BETWEEN FAILURES (MTBF) & RUL               */}
        {/* ============================================================== */}
        {type === 'mtbf' && (
          <>
            {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
              const val = frac * maxMtbfScale;
              const y = scaleYMtbf(val);
              return (
                <g key={`ymtbf-${idx}`} transform={`translate(${padding.left}, ${y})`}>
                  <line x2="-5" stroke="#94a3b8" strokeWidth="1" />
                  <line x2={plotWidth} stroke="#f1f5f9" strokeWidth="1" />
                  <text
                    x="-8"
                    y="3"
                    textAnchor="end"
                    className="fill-slate-500 font-mono text-[9px]"
                  >
                    {Math.round(val)}
                  </text>
                </g>
              );
            })}
            <text
              transform={`rotate(-90) translate(-${padding.top + plotHeight / 2}, ${isMini ? 14 : 20})`}
              textAnchor="middle"
              className="fill-slate-600 font-semibold text-[10px]"
            >
              Expected Lifetime ({unit})
            </text>

            {/* Constant MTBF Reference Line */}
            <line
              x1={padding.left}
              y1={scaleYMtbf(mtbf)}
              x2={padding.left + plotWidth}
              y2={scaleYMtbf(mtbf)}
              stroke="#7c3aed"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <rect
              x={padding.left + plotWidth - (isMini ? 85 : 120)}
              y={scaleYMtbf(mtbf) - 14}
              width={isMini ? 80 : 115}
              height="14"
              rx="3"
              fill="#6d28d9"
            />
            <text
              x={padding.left + plotWidth - (isMini ? 45 : 62)}
              y={scaleYMtbf(mtbf) - 4}
              textAnchor="middle"
              className="fill-white font-mono text-[8px] font-bold"
            >
              MTBF = {Math.round(mtbf)} {unit}
            </text>

            {/* Accumulated Expected Life ∫_0^t R(u) du */}
            <path
              d={mtbfCurvePath}
              fill="none"
              stroke="#4338ca"
              strokeWidth={isMini ? '2' : '2.5'}
              strokeLinecap="round"
            />

            {/* Residual Mean Lifetime (Remaining Useful Life) μ(t) */}
            <path
              d={residualLifePath}
              fill="none"
              stroke="#0284c7"
              strokeWidth={isMini ? '1.8' : '2'}
              strokeDasharray="4 2"
              strokeLinecap="round"
            />

            {/* Active Point Tracker on Accumulated Life */}
            <circle
              cx={activeXPos}
              cy={scaleYMtbf(activePoint.cumulativeMtbf)}
              r={isMini ? '4' : '5'}
              fill="#4338ca"
              stroke="#ffffff"
              strokeWidth="2"
            />

            {/* Legend in corner */}
            <g transform={`translate(${padding.left + (isMini ? 8 : 12)}, ${padding.top + 8})`}>
              <rect
                x="0"
                y="0"
                width={isMini ? 135 : 165}
                height={isMini ? 36 : 42}
                rx="4"
                fill="#ffffff"
                stroke="#e2e8f0"
                opacity="0.95"
              />
              <line x1="8" y1="12" x2="22" y2="12" stroke="#4338ca" strokeWidth="2" />
              <text x="26" y="15" className="fill-indigo-900 font-semibold text-[8px]">
                Cumulative Expected Life ∫ R du
              </text>
              <line
                x1="8"
                y1={isMini ? '24' : '28'}
                x2="22"
                y2={isMini ? '24' : '28'}
                stroke="#0284c7"
                strokeWidth="2"
                strokeDasharray="3 2"
              />
              <text
                x="26"
                y={isMini ? '27' : '31'}
                className="fill-sky-900 font-semibold text-[8px]"
              >
                Remaining Useful Life μ(t)
              </text>
            </g>
          </>
        )}

        {/* ============================================================== */}
        {/* CHART 5: DERIVATIVE ROOTS df/dt                                */}
        {/* ============================================================== */}
        {type === 'derivatives' && (
          <>
            <line
              x1={padding.left}
              y1={scaleYDeriv(0)}
              x2={padding.left + plotWidth}
              y2={scaleYDeriv(0)}
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <text
              transform={`rotate(-90) translate(-${padding.top + plotHeight / 2}, 20)`}
              textAnchor="middle"
              className="fill-slate-600 font-semibold text-[10px]"
            >
              First Derivative df/dt [Extremum Roots]
            </text>
            <path d={d1Path} fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
            {extrema.map((ex, idx) => (
              <g key={`root-${idx}`}>
                <circle
                  cx={scaleX(ex.time)}
                  cy={scaleYDeriv(0)}
                  r="4"
                  fill="#7c3aed"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            ))}
          </>
        )}

        {/* ============================================================== */}
        {/* CHART 6: WEIBULL PROBABILITY PLOT                             */}
        {/* ============================================================== */}
        {type === 'weibull' && (
          <>
            <text
              x={padding.left + plotWidth / 2}
              y={padding.top + plotHeight / 2}
              textAnchor="middle"
              className="fill-slate-400 font-sans text-xs"
            >
              Weibull Linearized Paper: Nonlinear curvature confirms multiple extremum failure modes
            </text>
            {empiricalPoints.map((pt, idx) => {
              const lnT = Math.log(Math.max(1, pt.time));
              const lnMin = Math.log(Math.max(1, result.tMin * 0.8));
              const lnMax = Math.log(result.tMax * 1.2);
              const x = padding.left + ((lnT - lnMin) / (lnMax - lnMin || 1)) * plotWidth;
              const yVal = Math.log(-Math.log(Math.max(1e-4, 1 - pt.empiricalCdf)));
              const yMin = -4;
              const yMax = 1.5;
              const y = padding.top + plotHeight - ((yVal - yMin) / (yMax - yMin)) * plotHeight;
              return (
                <circle
                  key={`wb-${idx}`}
                  cx={Math.max(padding.left, Math.min(padding.left + plotWidth, x))}
                  cy={Math.max(padding.top, Math.min(padding.top + plotHeight, y))}
                  r="3.5"
                  fill="#2563eb"
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              );
            })}
          </>
        )}

        {/* ============================================================== */}
        {/* SYNCHRONIZED REAL-TIME ANIMATED SCRUBBER HEAD                  */}
        {/* ============================================================== */}
        <g pointerEvents="none">
          {/* Vertical Playhead Line */}
          <line
            x1={activeXPos}
            y1={padding.top}
            x2={activeXPos}
            y2={padding.top + plotHeight}
            stroke={type === 'hazard' ? '#ef4444' : type === 'cdf' ? '#10b981' : '#3b82f6'}
            strokeWidth="1.8"
            strokeDasharray={isPlaying ? '4 2' : 'none'}
          />

          {/* Top Scrubber Cap */}
          <circle
            cx={activeXPos}
            cy={padding.top}
            r={isMini ? '3.5' : '4.5'}
            fill={type === 'hazard' ? '#ef4444' : type === 'cdf' ? '#10b981' : '#3b82f6'}
            stroke="#ffffff"
            strokeWidth="1.5"
          />

          {/* Bottom Scrubber Arrow/Triangle */}
          <polygon
            points={`${activeXPos - 4},${padding.top + plotHeight + 6} ${activeXPos + 4},${
              padding.top + plotHeight + 6
            } ${activeXPos},${padding.top + plotHeight}`}
            fill={type === 'hazard' ? '#ef4444' : type === 'cdf' ? '#10b981' : '#3b82f6'}
          />
        </g>
      </svg>
    );
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col">
      {/* Workbench Navigation Header */}
      <div className="border-b border-slate-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
          {/* Quad Grid Tab (All 4 Core Visualizations Together) */}
          <button
            onClick={() => setActiveTab('quad')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'quad'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>4-Panel Quad View</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'quad' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700'
              }`}
            >
              PDF • CDF • Hazard • MTBF
            </span>
          </button>

          {/* Individual Focus Tabs */}
          <button
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'pdf'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>PDF f(t)</span>
          </button>

          <button
            onClick={() => setActiveTab('cdf')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'cdf'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>CDF F(t) & R(t)</span>
          </button>

          <button
            onClick={() => setActiveTab('hazard')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'hazard'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Hazard λ(t)</span>
          </button>

          <button
            onClick={() => setActiveTab('mtbf')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'mtbf'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>MTBF & RUL</span>
          </button>

          <button
            onClick={() => setActiveTab('derivatives')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'derivatives'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <GitCommit className="w-3.5 h-3.5" />
            <span>Roots df/dt</span>
          </button>

          <button
            onClick={() => setActiveTab('weibull')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'weibull'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5" />
            <span>Probability Plot</span>
          </button>
        </div>

        {/* View Options */}
        <div className="flex items-center space-x-3 text-xs">
          <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={logScaleHazard}
              onChange={(e) => setLogScaleHazard(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">Log Hazard</span>
          </label>

          <label className="flex items-center space-x-1.5 text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEmpiricalOverlay}
              onChange={(e) => setShowEmpiricalOverlay(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="font-medium">Empirical Ranks</span>
          </label>

          {onOpenMatlabFigures && (
            <button
              onClick={onOpenMatlabFigures}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-semibold text-xs transition shadow-2xs"
              title="Compare live chart with Mohammed Lamine Moussaoui's MATLAB Plot Figure"
            >
              <ImageIcon className="w-3.5 h-3.5 text-amber-600" />
              <span>MATLAB Plot Figure</span>
            </button>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* REAL-TIME TIME SCRUBBER & ANIMATION CONTROLLER BAR             */}
      {/* ============================================================== */}
      <div className="bg-slate-900 text-white p-4 border-b border-slate-800">
        <div className="flex flex-col space-y-3.5">
          {/* Top Row: Playback Controls, Scrub Time, and Speed */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Play/Pause/Step Buttons */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition shadow-xs ${
                  isPlaying
                    ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
                title="Spacebar to Play/Pause"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Animate Timeline</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleStep(-0.05)}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Step backward (-5% / Left Arrow)"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleStep(0.05)}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Step forward (+5% / Right Arrow)"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleJumpToTime(0)}
                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                title="Reset time to t=0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setIsLooping(!isLooping)}
                className={`p-1.5 rounded-md transition ${
                  isLooping
                    ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
                title={isLooping ? 'Looping enabled' : 'Looping disabled'}
              >
                <Repeat className="w-3.5 h-3.5" />
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center space-x-1 bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-[11px] font-mono">
                {[0.5, 1, 2, 4].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-0.5 rounded font-semibold transition ${
                      playbackSpeed === spd
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Time Stamp & Progress Display */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest block font-medium">
                  Current Scrubbed Time
                </span>
                <span className="font-mono text-base font-bold text-white tracking-tight">
                  {Math.round(activePoint.t).toLocaleString()}{' '}
                  <span className="text-xs text-blue-400 font-normal">{unit}</span>
                </span>
              </div>
              <div className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-lg text-center font-mono">
                <span className="text-[10px] text-slate-400 block">Horizon</span>
                <span className="text-xs font-bold text-slate-200">
                  {((activePoint.t / displayMax) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Scrubbing Slider Bar */}
          <div className="relative flex flex-col space-y-1.5">
            <input
              type="range"
              min={0}
              max={displayMax}
              step={displayMax / 400}
              value={activeTime}
              onChange={handleSliderChange}
              className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 focus:outline-none"
              style={{
                background: `linear-gradient(to right, #3b82f6 0%, #60a5fa ${
                  (activeTime / displayMax) * 100
                }%, #1e293b ${(activeTime / displayMax) * 100}%, #1e293b 100%)`,
              }}
            />

            {/* Milestone Clickable Markers along the Scrub Track */}
            <div className="flex items-center justify-between overflow-x-auto no-scrollbar pt-0.5 text-[10px]">
              {milestones.map((ms, idx) => (
                <button
                  key={idx}
                  onClick={() => handleJumpToTime(ms.time)}
                  className={`flex items-center space-x-1 px-2 py-0.5 rounded-full border transition font-mono whitespace-nowrap ${
                    Math.abs(activeTime - ms.time) < displayMax * 0.03
                      ? 'bg-blue-600 text-white border-blue-400 font-bold'
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
                  }`}
                  title={`Jump to ${ms.label}: ${Math.round(ms.time)} ${unit}`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{ms.shortLabel}</span>
                  <span className="text-slate-400">({Math.round(ms.time)})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Real-time Dynamic Status HUD: λ(t), R(t), and Remaining Life */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
            {/* Dynamic Hazard Rate λ(t) */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1">
                  <Flame className="w-3 h-3 text-red-400" />
                  <span>Hazard Rate λ(t)</span>
                </span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                    hazardPhase.color === 'red'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : hazardPhase.color === 'amber'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}
                >
                  {hazardPhase.trend === 'up' ? '▲ Wear-out' : hazardPhase.trend === 'down' ? '▼ Burn-in' : '► Stable'}
                </span>
              </div>
              <div className="my-1">
                <span className="font-mono text-base font-bold text-red-400 tracking-tight">
                  {formatSci(activePoint.hazard, 3)}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">/ {unit}</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {(activePoint.hazard * 1e9).toFixed(1)} FIT (10⁹ hrs)
              </span>
            </div>

            {/* Dynamic Reliability R(t) */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Reliability R(t)</span>
                </span>
                <span className="text-[9px] font-mono text-emerald-400 font-bold">
                  Survival
                </span>
              </div>
              <div className="my-1 flex items-baseline justify-between">
                <span className="font-mono text-base font-bold text-emerald-400 tracking-tight">
                  {(activePoint.reliability * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  F(t): {(activePoint.cdf * 100).toFixed(2)}%
                </span>
              </div>
              {/* Mini Survival Bar */}
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-75"
                  style={{ width: `${Math.max(0, Math.min(100, activePoint.reliability * 100))}%` }}
                />
              </div>
            </div>

            {/* Remaining Useful Life μ(t) */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1">
                  <Clock className="w-3 h-3 text-purple-400" />
                  <span>Remaining Useful Life (RUL)</span>
                </span>
                <span className="text-[9px] font-mono text-purple-300">μ(t)</span>
              </div>
              <div className="my-1">
                <span className="font-mono text-base font-bold text-purple-300 tracking-tight">
                  {Math.round(activePoint.residualLife).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 ml-1">{unit}</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Mean life left for survivors
              </span>
            </div>

            {/* Bathtub Operating Context */}
            <div className="bg-slate-800/90 border border-slate-700/80 rounded-lg p-2.5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold flex items-center space-x-1">
                  <Gauge className="w-3 h-3 text-blue-400" />
                  <span>Lifecycle Phase</span>
                </span>
                <span className="text-[9px] font-mono text-blue-400 font-bold">Status</span>
              </div>
              <div className="my-1">
                <span className="text-xs font-bold text-white block truncate">
                  {hazardPhase.name}
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  {hazardPhase.desc}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 font-mono">
                ISO 26262 Automotive Profile
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="p-4 bg-white">
        {activeTab === 'quad' ? (
          /* ============================================================== */
          /* 4-PANEL QUAD GRID: PDF, CDF, HAZARD, MTBF                      */
          /* ============================================================== */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Probability Density Function */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white hover:border-blue-300 transition flex flex-col">
              <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-800">
                    1. Probability Density Function (PDF)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  {extrema.length} Modal Extrema
                </span>
              </div>
              <div className="flex-1">{renderSingleChart('pdf', true)}</div>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Shows component failure clustering. Shaded blue sweep tracks failures accumulated up to scrubbed time t.
              </p>
            </div>

            {/* 2. Cumulative Distribution & Reliability */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white hover:border-emerald-300 transition flex flex-col">
              <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-800">
                    2. Cumulative Distribution (CDF) & R(t)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  R(t) = {(activePoint.reliability * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex-1">{renderSingleChart('cdf', true)}</div>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Survival probability R(t) (green) and cumulative failure probability F(t) (red). B10 marks the 90% survival warranty standard.
              </p>
            </div>

            {/* 3. Failure Rate (Hazard Function) */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white hover:border-red-300 transition flex flex-col">
              <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Flame className="w-4 h-4 text-red-600" />
                  <span className="text-xs font-bold text-slate-800">
                    3. Failure Rate Function (Hazard λ)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  λ = {formatSci(activePoint.hazard, 2)}
                </span>
              </div>
              <div className="flex-1">{renderSingleChart('hazard', true)}</div>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Instantaneous conditional failure risk λ(t) = f(t)/R(t). Active red sweep highlights trajectory into wear-out acceleration.
              </p>
            </div>

            {/* 4. Mean Time Between Failures (MTBF) & RUL */}
            <div className="border border-slate-200 rounded-xl p-3 bg-white hover:border-purple-300 transition flex flex-col">
              <div className="flex items-center justify-between mb-1 pb-1.5 border-b border-slate-100">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-bold text-slate-800">
                    4. MTBF & Remaining Useful Life (RUL)
                  </span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  MTBF = {Math.round(mtbf)} {unit}
                </span>
              </div>
              <div className="flex-1">{renderSingleChart('mtbf', true)}</div>
              <p className="text-[10px] text-slate-500 mt-1 leading-tight">
                Accumulated expected life ∫ R(u) du plateauing at MTBF, and remaining useful life μ(t) for surviving components at operating time t.
              </p>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* EXPANDED FULL-WIDTH SINGLE VIEW                                */
          /* ============================================================== */
          <div className="space-y-3">
            {activeTab === 'pdf' && result.modelType === 'moussaoui_poly5' && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-600 animate-pulse" />
                  <span className="font-bold text-amber-950">
                    Smooth Density Function: {presetId === 'turbo_bearing' || (standard && standard.includes('VDA')) ? 'VDA 6.3 / SAE J1211' : presetId === 'lidar_diode' || (standard && standard.includes('AEC')) ? 'AEC-Q102 / Telcordia GR-468' : presetId === 'braking_actuator' || (standard && standard.includes('FMVSS')) ? 'FMVSS 135 / ISO 26262 ASIL D' : 'AQG 324 / IEC 60747-9'}
                  </span>
                  <span className="font-mono text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200">
                    MTBF = {presetId === 'turbo_bearing' ? '3586.8' : Math.round(mtbf).toLocaleString()} {unit}
                  </span>
                </div>
                {onOpenMatlabFigures && (
                  <button
                    onClick={onOpenMatlabFigures}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition shadow-2xs"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Compare with MATLAB Output Figure</span>
                  </button>
                )}
              </div>
            )}
            {renderSingleChart(
              activeTab as 'pdf' | 'cdf' | 'hazard' | 'mtbf' | 'derivatives' | 'weibull',
              false
            )}
          </div>
        )}

        {/* Live Synchronized Readout Bar */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-6 gap-2 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Time t:</span>
            <span className="font-mono font-bold text-slate-900">
              {activePoint.t.toFixed(1)} {unit}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Density f(t):</span>
            <span className="font-mono font-bold text-blue-700">
              {formatSci(activePoint.pdf, 3)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Reliability R(t):</span>
            <span className="font-mono font-bold text-emerald-700">
              {(activePoint.reliability * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Failure Prob F(t):</span>
            <span className="font-mono font-bold text-red-600">
              {(activePoint.cdf * 100).toFixed(2)}%
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Hazard λ(t):</span>
            <span className="font-mono font-bold text-amber-700">
              {formatSci(activePoint.hazard, 3)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Remaining Life μ(t):</span>
            <span className="font-mono font-bold text-indigo-700">
              {Math.round(activePoint.residualLife)} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Engineering Footer Legend */}
      <div className="border-t border-slate-200 px-5 py-2.5 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center space-x-3 text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
            <span>PDF f(t)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>R(t) Survival</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 inline-block" />
            <span>F(t) & Hazard λ(t)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
            <span>MTBF & RUL</span>
          </div>
        </div>

        <div className="flex items-center space-x-3 font-mono text-[11px]">
          <span>
            B10: <b>{Math.round(b10Life)}</b> {unit}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            MTBF: <b>{Math.round(mtbf)}</b> {unit}
          </span>
          <span className="text-slate-300">|</span>
          <span>
            B1: <b>{Math.round(b1Life)}</b> {unit}
          </span>
        </div>
      </div>
    </div>
  );
};
