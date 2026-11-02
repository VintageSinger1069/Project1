import React, { useState } from 'react';
import { RegressionResult, ComponentFailureUnit } from '../types/reliability';
import {
  Car,
  Gauge,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Calendar,
  Calculator,
} from 'lucide-react';
import { formatSci } from '../lib/mathUtils';

interface MissionCalculatorProps {
  result: RegressionResult;
  unit: ComponentFailureUnit;
}

export const MissionCalculator: React.FC<MissionCalculatorProps> = ({
  result,
  unit,
}) => {
  // Default target mission time near B10
  const [missionTime, setMissionTime] = useState<number>(() => {
    return Math.round(result.b10Life || result.mtbf * 0.7);
  });
  const [fleetSize, setFleetSize] = useState<number>(100000);

  // Evaluate model at missionTime
  const evaluateAtTime = (t: number) => {
    // Binary or linear lookup in fine curve points or calculate directly
    if (t <= 0) return { r: 1.0, f: 0.0, haz: 0.0, pdf: 0.0 };

    if (result.mixtureComponents) {
      let fVal = 0;
      let rVal = 0;
      let pdfVal = 0;
      for (const c of result.mixtureComponents) {
        const z = t / c.eta;
        const term = Math.pow(z, c.beta);
        const expTerm = Math.exp(-term);
        fVal += c.weight * (1 - expTerm);
        rVal += c.weight * expTerm;
        pdfVal += c.weight * (c.beta / c.eta) * Math.pow(z, c.beta - 1) * expTerm;
      }
      const haz = rVal > 1e-6 ? pdfVal / rVal : pdfVal / 1e-6;
      return { r: rVal, f: fVal, haz, pdf: pdfVal };
    }

    // Fallback: interpolate from curve points
    const pts = result.curvePoints;
    let closest = pts[0];
    let minD = Infinity;
    for (const p of pts) {
      const d = Math.abs(p.t - t);
      if (d < minD) {
        minD = d;
        closest = p;
      }
    }
    return {
      r: closest.reliability,
      f: closest.cdf,
      haz: closest.hazard,
      pdf: closest.pdf,
    };
  };

  const metrics = evaluateAtTime(missionTime);
  const expectedFailures = Math.round(metrics.f * fleetSize);
  const fitRate = metrics.haz * 1e9; // Failures in Time (10^9 component hours)

  // ISO 26262 ASIL assessment
  let asilStatus: {
    level: string;
    badgeColor: string;
    note: string;
  };

  if (fitRate <= 10) {
    asilStatus = {
      level: 'ASIL D Target Met (FIT ≤ 10)',
      badgeColor: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      note: 'Meets stringent ISO 26262 Part 5 random hardware target for powertrain/steering.',
    };
  } else if (fitRate <= 100) {
    asilStatus = {
      level: 'ASIL B/C Target Met (FIT ≤ 100)',
      badgeColor: 'bg-blue-50 text-blue-800 border-blue-200',
      note: 'Meets ISO 26262 random hardware metrics for body, lighting, and general chassis control.',
    };
  } else {
    asilStatus = {
      level: 'Quality Management (QM) / High FIT',
      badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
      note: 'Exceeds standard automotive safety targets. Consider redundancy or burn-in screening.',
    };
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Car className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Automotive Mission Profile & Fleet Reliability Calculator
          </h3>
        </div>
        <span className="text-[11px] font-medium text-slate-500">
          ISO 26262 / VDA 6.3 Standards
        </span>
      </div>

      {/* Target Mission Inputs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Target Mission Profile Time ({unit})
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              value={missionTime}
              onChange={(e) => setMissionTime(Math.max(1, parseFloat(e.target.value) || 1))}
              className="w-full font-mono text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
            <button
              onClick={() => setMissionTime(Math.round(result.b10Life))}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-2 rounded-lg border border-blue-200 whitespace-nowrap transition"
            >
              Set B10 ({Math.round(result.b10Life)})
            </button>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            Typical automotive target: 8,000 hrs / 250,000 km / 15 years.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Vehicle Fleet Size
          </label>
          <input
            type="number"
            min="100"
            step="1000"
            value={fleetSize}
            onChange={(e) => setFleetSize(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="w-full font-mono text-sm font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 focus:ring-1 focus:ring-blue-500 focus:bg-white"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Component population installed across manufactured vehicles.
          </p>
        </div>
      </div>

      {/* KPI Display Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[11px] text-slate-500 block font-medium">Mission Reliability</span>
          <span className="text-xl font-bold font-mono text-emerald-700">
            {(metrics.r * 100).toFixed(3)}%
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">R(t = {missionTime})</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[11px] text-slate-500 block font-medium">Failure Probability</span>
          <span className="text-xl font-bold font-mono text-red-600">
            {(metrics.f * 100).toFixed(3)}%
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">F(t = {missionTime})</span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[11px] text-slate-500 block font-medium">Expected Fleet Failures</span>
          <span className="text-xl font-bold font-mono text-slate-900">
            {expectedFailures.toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            out of {fleetSize.toLocaleString()} cars
          </span>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
          <span className="text-[11px] text-slate-500 block font-medium">Instantaneous FIT Rate</span>
          <span className="text-xl font-bold font-mono text-blue-700">
            {fitRate < 1000 ? fitRate.toFixed(1) : fitRate.toExponential(2)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">Failures per 10⁹ hours</span>
        </div>
      </div>

      {/* ASIL Target & Safety Compliance Note */}
      <div className={`p-3 rounded-lg border flex items-start space-x-3 ${asilStatus.badgeColor}`}>
        <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold">{asilStatus.level}: </span>
          <span>{asilStatus.note}</span>
        </div>
      </div>
    </div>
  );
};
