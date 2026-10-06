/**
 * Touch Gesture Guide & iPad PWA Home-Screen Tutorial Modal
 */

import React from 'react';
import {
  X,
  Smartphone,
  RotateCcw,
  RotateCw,
  Move,
  Maximize2,
  Sparkles,
  Pencil,
  Copy,
  Search,
  Share,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';

interface TouchGestureHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TouchGestureHelpModal: React.FC<TouchGestureHelpModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-stone-900 dark:text-stone-100 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-850/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-stone-900 dark:text-white">
                iPad & Gesten-Steuerung (wie in Procreate)
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Natürliche Bedienung mit Finger, Apple Pencil und Gesten
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-800 dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Scrollable */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-stone-700 dark:text-stone-300">
          {/* Section 1: Gesten-Übersicht */}
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <span>👆</span>
              <span>Mehrfinger-Gesten auf der Arbeitsfläche</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 font-bold flex items-center justify-center shrink-0 text-xs">
                  2👆
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white">Verschieben & Zoomen (Pinch)</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Mit 2 Fingern stufenlos verschieben und zoomen. Schneller Quick-Pinch passt den Plan sofort ein.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-500 font-bold flex items-center justify-center shrink-0 text-xs">
                  2👆↺
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white">Ansicht drehen</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Mit 2 Fingern drehen. Rastet bei Norden und 90° magnetisch ein.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-500/15 text-purple-500 font-bold flex items-center justify-center shrink-0 text-xs">
                  2👆T
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white">Zweifinger-Tipp: Rückgängig</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    2 Finger kurz auftippen für Undo. Gedrückt halten für schnelles wiederholtes Rückgängig.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-500 font-bold flex items-center justify-center shrink-0 text-xs">
                  3👆T
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white">Dreifinger-Tipp: Wiederholen</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    3 Finger kurz auftippen für Redo. Gedrückt halten für schnelles Wiederholen.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-500 font-bold flex items-center justify-center shrink-0 text-xs">
                  4👆T
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white">Vierfinger-Tipp: Fokusmodus</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Blendet alle Leisten aus für 100% freie Arbeitsfläche. Erneuter 4-Finger-Tipp bringt die Leisten zurück.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-500 font-bold flex items-center justify-center shrink-0 text-xs">
                  3👆↓
                </div>
                <div>
                  <h4 className="font-semibold text-stone-900 dark:text-white">Dreifinger-Wischen nach unten</h4>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5">
                    Öffnet das Schnellmenü für Kopieren, Ausschneiden, Einfügen und Duplizieren.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: QuickShape & Apple Pencil */}
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <Pencil className="w-4 h-4 text-amber-500" />
              <span>Apple Pencil & QuickShape (Schnellform)</span>
            </h3>

            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-semibold text-stone-900 dark:text-white">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Form zeichnen und kurz halten (QuickShape)</span>
              </div>
              <p className="text-[11px] text-stone-600 dark:text-stone-300 leading-relaxed">
                Zeichnen Sie mit Stift oder Finger eine grobe Linie, ein Rechteck oder einen Kreis und halten Sie am Strichende kurz inne: Die Zeichnung schnappt automatisch in eine millimetergenaue gerade Wand, einen rechteckigen Raum oder eine Rundung ein!
              </p>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                • Zweiter Finger bricht Zeichnung sofort sauber ab und navigiert, ohne dass versehentliche Wände entstehen.
                <br />
                • Handballen werden bei aktivem Apple Pencil automatisch ignoriert.
              </div>
            </div>
          </div>

          {/* Section 3: PWA Add to Home Screen Tutorial */}
          <div>
            <h3 className="font-bold text-sm text-stone-900 dark:text-white mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-500" />
              <span>Als App auf dem iPad-Home-Bildschirm installieren</span>
            </h3>

            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-stone-700/60 flex flex-col gap-2.5">
              <p className="text-[11px] leading-relaxed text-stone-600 dark:text-stone-300">
                Für das beste Erlebnis ohne Safari-Adressleiste und im echten Vollbild:
              </p>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-stone-700 dark:text-stone-200 font-medium">
                <li>
                  In Safari oben rechts auf das <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-stone-200 dark:bg-stone-700 font-semibold"><Share className="w-3 h-3" /> Teilen-Symbol</span> tippen.
                </li>
                <li>
                  Im Menü nach unten scrollen und auf <span className="font-semibold text-amber-600 dark:text-amber-400">„Zum Home-Bildschirm“</span> tippen.
                </li>
                <li>
                  Oben rechts auf <span className="font-semibold text-amber-600 dark:text-amber-400">„Hinzufügen“</span> tippen.
                </li>
              </ol>
              <p className="text-[10px] text-stone-400 mt-1">
                ✓ Die App startet danach mit eigenem App-Symbol wie eine native App und funktioniert dank Offline-Cache auch ohne Internet.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-850/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer active:scale-95 transition-all"
          >
            Verstanden & Loslegen
          </button>
        </div>
      </div>
    </div>
  );
};
