/**
 * Help and Keyboard Shortcuts Reference Dialog
 */

import React from 'react';
import { HelpCircle, X, Keyboard, MousePointer, Compass } from 'lucide-react';
import { Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface HelpDialogProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose, language }) => {
  const t = getT(language);

  if (!isOpen) return null;

  const shortcuts = [
    { key: 'V', desc: 'Auswahl-Werkzeug aktivieren' },
    { key: 'W', desc: 'Wand zeichnen (Polygonzug)' },
    { key: 'R', desc: 'Rechteckraum mit 4 Wänden' },
    { key: 'N', desc: 'Wand per Maßeingabe-Dialog' },
    { key: 'D', desc: 'Tür auf Wand platzieren' },
    { key: 'F', desc: 'Fenster in Wand einsetzen' },
    { key: 'T', desc: 'Treppe einfügen' },
    { key: 'M', desc: 'Möbel- & Ausstattungskatalog öffnen' },
    { key: 'B', desc: 'Bemaßung setzen' },
    { key: 'A', desc: 'Textbeschriftung hinzufügen' },
    { key: 'S / F3', desc: 'Magnetisches Fangen an / aus' },
    { key: 'Tab', desc: 'Nächsten Fangpunkt wählen (Zyklus)' },
    { key: 'Alt', desc: 'Gedrückt halten: Fangen übergehen' },
    { key: 'Shift', desc: 'Winkel sperren / Ortho (0°, 45°, 90°)' },
    { key: 'Leertaste', desc: 'Gedrückt halten zum Verschieben / Pan' },
    { key: 'Entf / Backspace', desc: 'Ausgewähltes Bauteil löschen' },
    { key: 'Esc', desc: 'Laufende Aktion oder Auswahl abbrechen' },
    { key: 'Strg + Z', desc: 'Letzten Schritt rückgängig machen' },
    { key: 'Strg + Y', desc: 'Schritt wiederholen' },
    { key: 'Strg + S', desc: 'Projekt als Datei speichern' },
    { key: 'Pfeiltasten', desc: 'Auswahl um 1 cm verschieben (mit Shift: 10 cm)' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full max-h-[85vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-sm">Tastenkürzel & Bedienungshilfe</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-5 overflow-y-auto flex flex-col gap-4 text-xs">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-2">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <MousePointer className="w-4 h-4" />
              Maus- & Fanghilfen-Gesten
            </span>
            <ul className="text-slate-300 space-y-1 list-disc list-inside text-[11px]">
              <li><strong>Intelligentes Fangen:</strong> Rastet an Endpunkten, Mitten, Lotfußpunkten (⟂), Parallelen (//) und gleichen Längen ein.</li>
              <li><strong>Tab-Taste:</strong> Schaltet bei mehreren nahen Fangpunkten zum nächsten Kandidaten um.</li>
              <li><strong>Alt-Taste:</strong> Hält man Alt gedrückt, wird das Fangen kurzzeitig deaktiviert für freies Zeichnen.</li>
              <li><strong>Wand zeichnen:</strong> Klicke Startpunkt, tippe die Länge direkt ein und drücke Enter!</li>
              <li><strong>Mausrad / Pan:</strong> Stufenloser Zoom auf Mausposition; Mittlere Maustaste oder Leertaste + Ziehen zum Verschieben.</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {shortcuts.map((sc, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 rounded bg-slate-950/40 border border-slate-800/80"
              >
                <span className="text-slate-300 text-[11px]">{sc.desc}</span>
                <kbd className="px-2 py-0.5 rounded bg-slate-800 text-emerald-300 font-mono text-[10px] font-semibold border border-slate-700">
                  {sc.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
