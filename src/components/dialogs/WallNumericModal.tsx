/**
 * Direct Numerical Wall Creation Modal
 */

import React, { useState } from 'react';
import { Binary, X, Check } from 'lucide-react';
import { Wall, Point2D, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface WallNumericModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWall: (w: Wall) => void;
  language: Language;
}

export const WallNumericModal: React.FC<WallNumericModalProps> = ({
  isOpen,
  onClose,
  onAddWall,
  language,
}) => {
  const t = getT(language);

  const [startX, setStartX] = useState(2.0);
  const [startY, setStartY] = useState(2.0);
  const [lengthM, setLengthM] = useState(5.0);
  const [angleDeg, setAngleDeg] = useState(0);
  const [isExterior, setIsExterior] = useState(true);
  const [thicknessM, setThicknessM] = useState(0.30);
  const [heightM, setHeightM] = useState(2.60);

  if (!isOpen) return null;

  const handleCreate = () => {
    const rad = (angleDeg * Math.PI) / 180;
    const endX = startX + Math.cos(rad) * lengthM;
    const endY = startY + Math.sin(rad) * lengthM;

    const wall: Wall = {
      id: 'w_' + Date.now(),
      start: { x: startX, y: startY },
      end: { x: endX, y: endY },
      thickness: thicknessM,
      height: heightM,
      isExterior,
      material: isExterior ? 'timber' : 'drywall',
      referenceLine: 'center',
    };

    onAddWall(wall);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Binary className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-sm">Wand per Maßeingabe erstellen</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex flex-col gap-3 text-xs">
          {/* Start Point */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400">Startpunkt X (m):</label>
              <input
                type="number"
                step="0.1"
                value={startX}
                onChange={(e) => setStartX(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-slate-400">Startpunkt Y (m):</label>
              <input
                type="number"
                step="0.1"
                value={startY}
                onChange={(e) => setStartY(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono mt-1"
              />
            </div>
          </div>

          {/* Length and Angle */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-slate-400 font-semibold text-emerald-400">Wandlänge (m):</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={lengthM}
                onChange={(e) => setLengthM(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-emerald-500 rounded px-2.5 py-1 text-white font-mono font-bold text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-slate-400">Winkel (°):</label>
              <select
                value={angleDeg}
                onChange={(e) => setAngleDeg(parseFloat(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-white mt-1 outline-none"
              >
                <option value="0">0° (nach rechts / horizontal)</option>
                <option value="90">90° (nach unten / vertikal)</option>
                <option value="180">180° (nach links)</option>
                <option value="270">270° (nach oben)</option>
                <option value="45">45° (schräg)</option>
                <option value="135">135°</option>
              </select>
            </div>
          </div>

          {/* Wall Thickness & Type */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-slate-400">Wanddicke (m):</label>
              <input
                type="number"
                step="0.01"
                value={thicknessM}
                onChange={(e) => setThicknessM(parseFloat(e.target.value) || 0.3)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono mt-1"
              />
            </div>
            <div>
              <label className="text-slate-400">Wandhöhe (m):</label>
              <input
                type="number"
                step="0.05"
                value={heightM}
                onChange={(e) => setHeightM(parseFloat(e.target.value) || 2.6)}
                className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1 text-white font-mono mt-1"
              />
            </div>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setIsExterior(true);
                setThicknessM(0.30);
              }}
              className={`flex-1 py-1.5 rounded-lg border text-center transition-colors ${
                isExterior
                  ? 'bg-emerald-600 border-emerald-500 text-white font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              Außenwand (30 cm)
            </button>
            <button
              onClick={() => {
                setIsExterior(false);
                setThicknessM(0.115);
              }}
              className={`flex-1 py-1.5 rounded-lg border text-center transition-colors ${
                !isExterior
                  ? 'bg-emerald-600 border-emerald-500 text-white font-semibold'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              Innenwand (11.5 cm)
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button onClick={onClose} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs">
            Abbrechen
          </button>
          <button
            onClick={handleCreate}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            <span>Wand einfügen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
