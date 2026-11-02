import React, { useMemo, useState } from 'react';
import katex from 'katex';
import { Copy, Check, Code } from 'lucide-react';

interface MathFormulaProps {
  latex: string;
  plaintext?: string;
  title?: string;
  badge?: string;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  latex,
  plaintext,
  title,
  badge,
  className = '',
}) => {
  const [copied, setCopied] = useState(false);
  const [showPlain, setShowPlain] = useState(false);

  const html = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return `<pre class="font-mono text-sm">${plaintext || latex}</pre>`;
    }
  }, [latex, plaintext]);

  const handleCopy = () => {
    const textToCopy = showPlain && plaintext ? plaintext : latex;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`relative bg-white border border-slate-200 rounded-xl p-4 shadow-xs transition hover:border-blue-300 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {title && <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</span>}
          {badge && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {badge}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1.5">
          {plaintext && (
            <button
              onClick={() => setShowPlain(!showPlain)}
              title={showPlain ? 'View rendered LaTeX' : 'View plaintext formula'}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition"
            >
              <Code className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={handleCopy}
            title="Copy formula"
            className="flex items-center space-x-1 text-xs px-2 py-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-medium text-[11px]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span className="text-[11px]">Copy {showPlain ? 'Code' : 'LaTeX'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showPlain && plaintext ? (
        <div className="bg-slate-900 text-emerald-400 p-3 rounded-lg font-mono text-xs overflow-x-auto whitespace-pre leading-relaxed">
          {plaintext}
        </div>
      ) : (
        <div
          className="overflow-x-auto py-2 text-slate-900 katex-container"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
};
