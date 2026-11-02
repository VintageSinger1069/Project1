import React, { useState } from 'react';
import { FailureDataPoint, ComponentFailureUnit } from '../types/reliability';
import {
  Plus,
  Trash2,
  Upload,
  ArrowUpDown,
  FileSpreadsheet,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface DataTableProps {
  data: FailureDataPoint[];
  onChange: (newData: FailureDataPoint[]) => void;
  unit: ComponentFailureUnit;
  onUnitChange: (newUnit: ComponentFailureUnit) => void;
}

export const DataTable: React.FC<DataTableProps> = ({
  data,
  onChange,
  unit,
  onUnitChange,
}) => {
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Add a new row
  const handleAddRow = () => {
    const maxTime = data.length > 0 ? Math.max(...data.map((d) => d.time)) : 1000;
    const newPoint: FailureDataPoint = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      time: Math.round(maxTime + 200),
      count: 1,
    };
    onChange([...data, newPoint]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    if (data.length <= 4) {
      alert('A minimum of 4 data points is required for non-linear regression.');
      return;
    }
    onChange(data.filter((d) => d.id !== id));
  };

  // Update row
  const handleUpdateRow = (id: string, field: keyof FailureDataPoint, value: any) => {
    onChange(
      data.map((d) => {
        if (d.id === id) {
          return { ...d, [field]: value };
        }
        return d;
      })
    );
  };

  // Sort rows ascending
  const handleSortAsc = () => {
    const sorted = [...data].sort((a, b) => a.time - b.time);
    onChange(sorted);
  };

  // Parse pasted CSV/TSV data
  const handleApplyPaste = () => {
    setPasteError(null);
    if (!pasteText.trim()) {
      setPasteError('Please paste some data lines.');
      return;
    }

    try {
      const lines = pasteText
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      const parsed: FailureDataPoint[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Split by tab, comma, semicolon or whitespace
        const parts = line.split(/[,\t;]|\s+/).filter((p) => p.trim().length > 0);
        if (parts.length === 0) continue;

        // Skip headers if first line has non-numeric time
        const timeVal = parseFloat(parts[0]);
        if (isNaN(timeVal)) {
          if (i === 0) continue;
          throw new Error(`Row ${i + 1}: Invalid time value "${parts[0]}"`);
        }

        const countVal = parts.length > 1 ? parseInt(parts[1], 10) : 1;
        const note = parts.slice(2).join(' ') || undefined;

        parsed.push({
          id: `p_import_${i}_${Date.now()}`,
          time: Math.abs(timeVal),
          count: isNaN(countVal) || countVal < 1 ? 1 : countVal,
          notes: note,
        });
      }

      if (parsed.length < 4) {
        throw new Error('Please provide at least 4 valid failure data points.');
      }

      parsed.sort((a, b) => a.time - b.time);
      onChange(parsed);
      setShowPasteModal(false);
      setPasteText('');
    } catch (err: any) {
      setPasteError(err.message || 'Failed to parse data.');
    }
  };

  // Calculate quick stats
  const totalCount = data.reduce((acc, d) => acc + (d.count || 1), 0);
  const minTime = data.length > 0 ? Math.min(...data.map((d) => d.time)) : 0;
  const maxTime = data.length > 0 ? Math.max(...data.map((d) => d.time)) : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden flex flex-col h-full">
      {/* Table Toolbar */}
      <div className="border-b border-slate-200 px-4 py-3 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <FileSpreadsheet className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Failure Population Data
          </h3>
          <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-blue-50 text-blue-700 font-semibold border border-blue-200">
            N = {totalCount} units
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Unit selector */}
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as ComponentFailureUnit)}
            className="text-xs font-medium bg-white border border-slate-200 text-slate-700 rounded-md px-2 py-1 focus:ring-1 focus:ring-blue-500"
          >
            <option value="hours">Hours (hrs)</option>
            <option value="cycles">Cycles</option>
            <option value="km">Kilometers (km)</option>
            <option value="miles">Miles (mi)</option>
            <option value="megarevs">Mega-Revolutions</option>
          </select>

          <button
            onClick={() => setShowPasteModal(true)}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-md font-medium transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Paste / CSV</span>
          </button>

          <button
            onClick={handleSortAsc}
            title="Sort data ascending by failure time"
            className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleAddRow}
            className="flex items-center space-x-1 text-xs px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Point</span>
          </button>
        </div>
      </div>

      {/* Scrollable Data Rows */}
      <div className="overflow-y-auto max-h-[360px] divide-y divide-slate-100 flex-1">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/50 text-slate-500 text-[11px] font-semibold sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 w-12 text-center">#</th>
              <th className="px-3 py-2">Failure Time ({unit})</th>
              <th className="px-3 py-2 w-20 text-center">Count</th>
              <th className="px-3 py-2">Failure Mode / Engineering Notes</th>
              <th className="px-2 py-2 w-10 text-center"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item, idx) => (
              <tr key={item.id} className="hover:bg-blue-50/30 transition group">
                <td className="px-3 py-1.5 text-center font-mono text-slate-400 text-[11px]">
                  {idx + 1}
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={item.time}
                    onChange={(e) =>
                      handleUpdateRow(item.id, 'time', parseFloat(e.target.value) || 0)
                    }
                    className="w-full font-mono text-xs font-semibold text-slate-900 bg-transparent border-0 border-b border-transparent focus:border-blue-500 focus:ring-0 p-0.5"
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <input
                    type="number"
                    min="1"
                    max="10000"
                    value={item.count || 1}
                    onChange={(e) =>
                      handleUpdateRow(item.id, 'count', parseInt(e.target.value, 10) || 1)
                    }
                    className="w-14 text-center font-mono text-xs font-semibold text-slate-700 bg-slate-50 rounded border border-slate-200 focus:border-blue-500 focus:ring-0 p-0.5"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    type="text"
                    placeholder="e.g. Solder creep, Gate breakdown"
                    value={item.notes || ''}
                    onChange={(e) => handleUpdateRow(item.id, 'notes', e.target.value)}
                    className="w-full text-xs text-slate-600 placeholder-slate-300 bg-transparent border-0 focus:ring-0 p-0.5"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
                  <button
                    onClick={() => handleDeleteRow(item.id)}
                    className="text-slate-300 hover:text-red-600 transition p-1 rounded opacity-0 group-hover:opacity-100"
                    title="Remove point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Stats */}
      <div className="border-t border-slate-200 px-4 py-2 bg-slate-50/50 flex items-center justify-between text-[11px] text-slate-500">
        <div>
          Min: <span className="font-mono font-semibold text-slate-700">{minTime}</span> | Max:{' '}
          <span className="font-mono font-semibold text-slate-700">{maxTime}</span> {unit}
        </div>
        <div className="flex items-center space-x-1 text-slate-400">
          <span>Nonlinear regression targets empirical median ranks</span>
        </div>
      </div>

      {/* Paste / CSV Upload Modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-slate-900 text-sm">
                  Import Failure Population Data
                </h3>
              </div>
              <button
                onClick={() => setShowPasteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold px-2 py-1 rounded"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Paste failure logs from Excel, CSV, or text. Supported formats:
              <br />
              <code className="text-blue-700 bg-blue-50 px-1 py-0.5 rounded font-mono text-[11px]">
                Time [tab/comma] Count [tab/comma] Failure Mode Notes
              </code>
            </p>

            {pasteError && (
              <div className="flex items-center space-x-2 text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pasteError}</span>
              </div>
            )}

            <textarea
              rows={8}
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Example:&#10;1200, 2, Voiding&#10;1450, 8, Solder peak&#10;3800, 2, Steady phase&#10;7200, 15, Creep wearout"
              className="w-full font-mono text-xs border border-slate-300 rounded-lg p-3 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowPasteModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                Close
              </button>
              <button
                onClick={handleApplyPaste}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition shadow-xs"
              >
                Parse & Fit Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
