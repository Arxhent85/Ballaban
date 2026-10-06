/**
 * iPad Safari Home-Screen Installation Guide Modal (PWA Web-App)
 * Explains how to install "Ferienhaus-Planer" to the iPad home screen
 * to run in native full-screen mode without Safari address/tab bars.
 */

import React from 'react';
import {
  Share,
  PlusSquare,
  CheckCircle2,
  X,
  Maximize2,
  Sparkles,
  Smartphone,
} from 'lucide-react';

interface HomeScreenGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNeverShowAgain: () => void;
}

export const HomeScreenGuideModal: React.FC<HomeScreenGuideModalProps> = ({
  isOpen,
  onClose,
  onNeverShowAgain,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-lg w-full p-6 text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-150 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-stone-900 dark:text-white">
                Vollbild-Tipp • Ohne Safari-Leisten starten
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Für 100 % freie Zeichenfläche auf dem iPad
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Card */}
        <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed bg-stone-50 dark:bg-stone-850 p-3.5 rounded-2xl border border-stone-200/80 dark:border-stone-800">
          Safari auf dem iPad beschränkt den Browser-Vollbildmodus. Alle internen Leisten wurden für maximale Zeichenfläche ausgeblendet. Um auch die <strong>Safari-Adress- und Tableiste dauerhaft zu entfernen</strong>, füge die App einmalig zu deinem Home-Bildschirm hinzu:
        </p>

        {/* 3 Step Tutorial */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              1
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <Share className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>In Safari oben rechts auf das <strong>Teilen-Symbol</strong> tippen</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              2
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <PlusSquare className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Nach unten scrollen und <strong>„Zum Home-Bildschirm“</strong> wählen</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              3
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 dark:text-stone-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Mit <strong>„Hinzufügen“</strong> bestätigen</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-stone-500 dark:text-stone-400 leading-normal">
          ✨ Die App startet danach als eigenständige App (<strong>„Ferienhaus-Planer“</strong>) im echten Vollbildmodus und funktioniert auch komplett offline.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-stone-100 dark:border-stone-800">
          <button
            onClick={onNeverShowAgain}
            className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 font-medium cursor-pointer underline underline-offset-2"
          >
            Nicht mehr anzeigen
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md active:scale-95 transition-all cursor-pointer"
          >
            Verstanden ✓
          </button>
        </div>
      </div>
    </div>
  );
};
