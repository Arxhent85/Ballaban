/**
 * Architectural Roof Configuration Modal (Dach-Modul)
 * Fully customizable roof geometry, pitch angle, overhang, materials, chimney, and skylights.
 */

import React, { useState } from 'react';
import {
  X,
  Check,
  Trash2,
  Sliders,
  Sparkles,
  Info,
} from 'lucide-react';
import { Roof, RoofType, Wall, Floor, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface RoofConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  roof: Roof | null;
  walls: Wall[];
  onSaveRoof: (roof: Roof | null) => void;
  language: Language;
}

export const RoofConfigModal: React.FC<RoofConfigModalProps> = ({
  isOpen,
  onClose,
  roof,
  walls,
  onSaveRoof,
  language,
}) => {
  const t = getT(language);

  // Calculate building envelope from walls
  const buildingBounds = React.useMemo(() => {
    const extWalls = walls.filter((w) => w.isExterior);
    const targetWalls = extWalls.length > 0 ? extWalls : walls;
    if (targetWalls.length === 0) {
      return { minX: 2, maxX: 10, minY: 2, maxY: 8, width: 8, depth: 6, maxH: 2.6 };
    }
    const minX = Math.min(...targetWalls.flatMap((w) => [w.start.x, w.end.x]));
    const maxX = Math.max(...targetWalls.flatMap((w) => [w.start.x, w.end.x]));
    const minY = Math.min(...targetWalls.flatMap((w) => [w.start.y, w.end.y]));
    const maxY = Math.max(...targetWalls.flatMap((w) => [w.start.y, w.end.y]));
    const maxH = Math.max(...targetWalls.map((w) => Math.max(w.height, w.endHeight ?? w.height)), 2.5);
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(1, maxX - minX),
      depth: Math.max(1, maxY - minY),
      maxH,
    };
  }, [walls]);

  // Initial roof state
  const [roofType, setRoofType] = useState<RoofType>(roof?.type || 'gable');
  const [pitchDegrees, setPitchDegrees] = useState<number>(roof?.pitchDegrees ?? 35);
  const [overhang, setOverhang] = useState<number>(roof?.overhang ?? 0.40);
  const [ridgeDirection, setRidgeDirection] = useState<'horizontal' | 'vertical'>(
    roof?.ridgeDirection || (buildingBounds.width >= buildingBounds.depth ? 'horizontal' : 'vertical')
  );
  const [baseHeight, setBaseHeight] = useState<number>(roof?.baseHeight ?? buildingBounds.maxH);
  const [material, setMaterial] = useState<Roof['material']>(roof?.material || 'tiles_anthracite');
  const [hasChimney, setHasChimney] = useState<boolean>(roof?.hasChimney ?? false);
  const [skylightsCount, setSkylightsCount] = useState<number>(roof?.skylightsCount ?? 0);

  // Height calculated from pitch and span
  const roofHeight = React.useMemo(() => {
    if (roofType === 'flat') return 0.35; // Attika height
    const span = ridgeDirection === 'horizontal' ? buildingBounds.depth : buildingBounds.width;
    const halfSpan = span / 2;
    const rad = (pitchDegrees * Math.PI) / 180;
    return Math.max(0.5, Math.round(halfSpan * Math.tan(rad) * 100) / 100);
  }, [roofType, pitchDegrees, ridgeDirection, buildingBounds]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updatedRoof: Roof = {
      id: roof?.id || 'roof_' + Date.now(),
      type: roofType,
      pitchDegrees: roofType === 'flat' ? 0 : pitchDegrees,
      overhang: roofType === 'flat' ? 0.15 : overhang,
      ridgeDirection,
      height: roofHeight,
      baseHeight,
      material,
      hasChimney,
      chimneyPosition: roof?.chimneyPosition || {
        x: buildingBounds.minX + buildingBounds.width * 0.7,
        y: buildingBounds.minY + buildingBounds.depth * 0.5,
      },
      chimneyHeight: 1.2,
      skylightsCount,
      customBounds: {
        minX: buildingBounds.minX,
        maxX: buildingBounds.maxX,
        minY: buildingBounds.minY,
        maxY: buildingBounds.maxY,
      },
    };
    onSaveRoof(updatedRoof);
    onClose();
  };

  const handleDelete = () => {
    onSaveRoof(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col text-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Dach-Modul & Überdachung</h2>
              <p className="text-[11px] text-slate-400">
                Gebäude-Außenmaße: {buildingBounds.width.toFixed(2)} m × {buildingBounds.depth.toFixed(2)} m (Traufe: {baseHeight.toFixed(2)} m)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* 1. Dachform Auswahl */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Dachform wählen:</span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                { type: 'gable' as RoofType, label: 'Satteldach', desc: 'Klassisch 2-flächig' },
                { type: 'shed' as RoofType, label: 'Pultdach', desc: 'Modern 1-flächig' },
                { type: 'hip' as RoofType, label: 'Walmdach', desc: '4-seitig geneigt' },
                { type: 'flat' as RoofType, label: 'Flachdach', desc: 'Mit Attika' },
                { type: 'tent' as RoofType, label: 'Zeltdach', desc: 'Pyramidenförmig' },
              ].map((rf) => (
                <button
                  key={rf.type}
                  type="button"
                  onClick={() => {
                    setRoofType(rf.type);
                    if (rf.type === 'flat') setPitchDegrees(0);
                    else if (pitchDegrees === 0) setPitchDegrees(35);
                  }}
                  className={`p-2.5 rounded-xl border flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
                    roofType === rf.type
                      ? 'bg-amber-600/20 border-amber-500 text-white shadow-sm ring-1 ring-amber-500/50'
                      : 'bg-slate-800/60 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="font-bold text-[11px]">{rf.label}</span>
                  <span className="text-[9px] text-slate-400">{rf.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Dachgeometrie & Maße */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 flex flex-col gap-3">
            <span className="font-semibold text-white flex items-center justify-between">
              <span>Geometrie & Dimensionen</span>
              <span className="text-[11px] font-mono text-amber-400">
                Firsthöhe: +{roofHeight.toFixed(2)} m (Gesamt: {(baseHeight + roofHeight).toFixed(2)} m)
              </span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Dachneigung */}
              {roofType !== 'flat' && (
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">Dachneigung (Winkel):</span>
                    <span className="font-mono font-bold text-amber-400">{pitchDegrees}°</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="1"
                    value={pitchDegrees}
                    onChange={(e) => setPitchDegrees(parseInt(e.target.value, 10))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>15° (flach)</span>
                    <span>35° (mittel)</span>
                    <span>50° (steil)</span>
                  </div>
                </div>
              )}

              {/* Dachüberstand */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Dachüberstand (Traufe & Giebel):</span>
                  <span className="font-mono font-bold text-amber-400">{overhang.toFixed(2)} m</span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="1.00"
                  step="0.05"
                  value={overhang}
                  onChange={(e) => setOverhang(parseFloat(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>10 cm (bündig)</span>
                  <span>40 cm (Standard)</span>
                  <span>100 cm (Vordach)</span>
                </div>
              </div>

              {/* Traufhöhe / Kniestock */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-300">Traufhöhe (Wandoberkante):</span>
                <div className="flex items-center gap-1 font-mono">
                  <input
                    type="number"
                    step="0.05"
                    min="1.50"
                    max="6.00"
                    value={baseHeight}
                    onChange={(e) => setBaseHeight(parseFloat(e.target.value) || 2.6)}
                    className="w-20 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right text-white font-bold"
                  />
                  <span className="text-slate-400">m</span>
                </div>
              </div>

              {/* Firstrichtung */}
              {roofType === 'gable' && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-slate-300">Firstverlauf:</span>
                  <select
                    value={ridgeDirection}
                    onChange={(e) => setRidgeDirection(e.target.value as any)}
                    className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none font-medium"
                  >
                    <option value="horizontal">Längsfirst (Ost-West)</option>
                    <option value="vertical">Querfirst (Nord-Süd)</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* 3. Dacheindeckung & Material */}
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-slate-200">Dacheindeckung & Material:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'tiles_anthracite', label: 'Dachsteine Anthrazit', color: '#1e293b' },
                { id: 'tiles_red', label: 'Tondachziegel Ziegelrot', color: '#991b1b' },
                { id: 'slate', label: 'Naturschiefer Anthrazit', color: '#334155' },
                { id: 'metal_sheet', label: 'Stehfalzblech Titanzink', color: '#64748b' },
                { id: 'green_roof', label: 'Extensiv begrünt (Gründach)', color: '#166534' },
              ].map((mat) => (
                <button
                  key={mat.id}
                  type="button"
                  onClick={() => setMaterial(mat.id as any)}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 transition-colors cursor-pointer ${
                    material === mat.id
                      ? 'bg-slate-800 border-amber-500 text-white ring-1 ring-amber-500/40 font-semibold'
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/20 shadow-xs"
                    style={{ backgroundColor: mat.color }}
                  />
                  <span className="text-[11px] truncate text-left">{mat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Zubehör: Kamin & Dachfenster */}
          <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 flex items-center justify-between gap-4">
            <label className="flex items-center gap-2 cursor-pointer text-slate-200 font-medium">
              <input
                type="checkbox"
                checked={hasChimney}
                onChange={(e) => setHasChimney(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
              />
              <span>Kamin / Schornstein einsetzen</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-400">Dachfenster (Velux):</span>
              <select
                value={skylightsCount}
                onChange={(e) => setSkylightsCount(parseInt(e.target.value, 10))}
                className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 outline-none font-bold"
              >
                <option value="0">Keine</option>
                <option value="1">1 Fenster</option>
                <option value="2">2 Fenster</option>
                <option value="4">4 Fenster</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <div>
            {roof && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg bg-red-950/60 border border-red-800/80 hover:bg-red-900 text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Dach komplett entfernen</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Dach auf Haus anwenden</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
