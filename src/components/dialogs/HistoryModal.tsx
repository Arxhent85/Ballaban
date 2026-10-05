/**
 * History & Undo/Redo Stack Inspector Modal
 */

import React from 'react';
import { GitBranch, X, RotateCcw, Clock } from 'lucide-react';
import { Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyLength: number;
  currentIndex: number;
  onJumpToIndex: (idx: number) => void;
  language: Language;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  historyLength,
  currentIndex,
  onJumpToIndex,
  language,
}) => {
  const t = getT(language);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-sm">Änderungsverlauf ({historyLength} Schritte)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* History list */}
        <div className="p-4 max-h-80 overflow-y-auto flex flex-col gap-1.5 text-xs">
          {Array.from({ length: historyLength }).map((_, idx) => {
            const isCurrent = idx === currentIndex;
            return (
              <div
                key={idx}
                onClick={() => onJumpToIndex(idx)}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  isCurrent
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Schritt #{idx + 1} {isCurrent && '(Aktueller Stand)'}</span>
                </div>
                {isCurrent && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono">
                    Aktiv
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-slate-400 hover:text-white text-xs">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
