/**
 * Project Templates Selector Modal
 */

import React from 'react';
import { Sparkles, X, Check, Building, Trees, Home, Square } from 'lucide-react';
import { CadProject, Language } from '../../types/cad';
import {
  createHolidayHouse6x8Template,
  createTinyHouseTemplate,
  createLogCabinTemplate,
  createEmptyProject,
} from '../../utils/templates';
import { getT } from '../../i18n/translations';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (proj: CadProject) => void;
  language: Language;
}

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectProject,
  language,
}) => {
  const t = getT(language);

  if (!isOpen) return null;

  const templateCards = [
    {
      title: 'Gemütliches Ferienhaus (6x8 m)',
      desc: 'Skandinavisches Holzferienhaus mit Wohn-Essbereich, offener Küche, Schlafzimmer, Duschbad und überdachter Terrasse.',
      icon: <Home className="w-6 h-6 text-amber-400" />,
      creator: createHolidayHouse6x8Template,
      recommended: true,
    },
    {
      title: 'Modernes Tiny House (7.5x3 m)',
      desc: 'Kompaktes Raumwunder auf Trailer-Fahrgestell mit Schlafloft, Schiebetür, integrierter Küchenzeile und Bad.',
      icon: <Building className="w-6 h-6 text-emerald-400" />,
      creator: createTinyHouseTemplate,
    },
    {
      title: 'Rustikale Blockhütte mit Kamin',
      desc: 'Naturstamm-Blockbohlenhaus mit offenem Kamin/Schwedenofen, Massivholzwänden und Schindeldach.',
      icon: <Trees className="w-6 h-6 text-orange-400" />,
      creator: createLogCabinTemplate,
    },
    {
      title: 'Leerer Plan (Neustart)',
      desc: 'Leere, unbegrenzte Zeichenfläche für eigene individuelle Entwürfe von Grund auf.',
      icon: <Square className="w-6 h-6 text-slate-400" />,
      creator: createEmptyProject,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-sm">Bauplan-Vorlagen für Ferienhäuser</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Templates Grid */}
        <div className="p-5 flex flex-col gap-3 max-h-[75vh] overflow-y-auto text-xs">
          {templateCards.map((tc, idx) => (
            <div
              key={idx}
              onClick={() => {
                onSelectProject(tc.creator());
                onClose();
              }}
              className="p-4 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 hover:border-emerald-500 cursor-pointer flex items-start gap-4 transition-all group shadow-sm"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                {tc.icon}
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white text-sm group-hover:text-emerald-300 transition-colors">
                    {tc.title}
                  </h3>
                  {tc.recommended && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                      Beliebt
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-1 leading-relaxed">{tc.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-slate-400 hover:text-white text-xs">
            Abbrechen
          </button>
        </div>
      </div>
    </div>
  );
};
