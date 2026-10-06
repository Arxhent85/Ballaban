/**
 * CAD Preferences & Defaults Settings Modal
 * Configures central default values for new walls, windows, doors, rooms, grid, and plot setbacks.
 */

import React from 'react';
import { Settings, X, Check, Magnet, Sparkles } from 'lucide-react';
import { UnitType, ScaleType, Language, ProjectDefaults, SnapSettings } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitType;
  onUnitChange: (u: UnitType) => void;
  scale: ScaleType;
  onScaleChange: (sc: ScaleType) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  defaults?: ProjectDefaults;
  onUpdateDefaults?: (d: ProjectDefaults) => void;
  snapSettings?: SnapSettings;
  onSnapSettingsChange?: (s: SnapSettings) => void;
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  unit,
  onUnitChange,
  scale,
  onScaleChange,
  language,
  onLanguageChange,
  defaults,
  onUpdateDefaults,
  snapSettings,
  onSnapSettingsChange,
}) => {
  const t = getT(language);

  if (!isOpen) return null;

  const currentDefaults: ProjectDefaults = defaults || {
    exteriorWallThickness: 0.30,
    interiorWallThickness: 0.115,
    wallHeight: 2.50,
    roomHeight: 2.50,
    doorWidth: 0.885,
    doorHeight: 2.05,
    doorLintel: 2.05,
    windowWidth: 1.20,
    windowHeight: 1.25,
    windowParapet: 0.90,
    windowLintel: 2.15,
    gridSize: 0.25,
    unit: 'm',
    setback: 3.00,
  };

  const handleUpdate = (field: keyof ProjectDefaults, val: any) => {
    if (onUpdateDefaults) {
      onUpdateDefaults({
        ...currentDefaults,
        [field]: val,
      });
    }
  };

  const toggleSnap = (key: keyof SnapSettings) => {
    if (onSnapSettingsChange && snapSettings) {
      onSnapSettingsChange({
        ...snapSettings,
        [key]: !snapSettings[key],
      });
    }
  };

  const updateSnap = <K extends keyof SnapSettings>(key: K, val: SnapSettings[K]) => {
    if (onSnapSettingsChange && snapSettings) {
      onSnapSettingsChange({
        ...snapSettings,
        [key]: val,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-sm">CAD Programmeinstellungen & Standardwerte</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex flex-col gap-4 text-xs max-h-[75vh] overflow-y-auto">
          {/* General: Language & Units */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-3">
            <span className="font-semibold text-white">Allgemein & Raster</span>
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-slate-400">Sprache:</label>
                <select
                  value={language}
                  onChange={(e) => onLanguageChange(e.target.value as Language)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 mt-1 outline-none font-medium"
                >
                  <option value="de">Deutsch (DE)</option>
                  <option value="en">English (EN)</option>
                  <option value="sq">Shqip (SQ)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400">Maßeinheit:</label>
                <select
                  value={unit}
                  onChange={(e) => onUnitChange(e.target.value as UnitType)}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 mt-1 outline-none font-medium"
                >
                  <option value="m">Meter (m)</option>
                  <option value="cm">Zentimeter (cm)</option>
                  <option value="mm">Millimeter (mm)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-400">Rasterweite:</label>
                <select
                  value={snapSettings?.gridSize ?? 0.25}
                  onChange={(e) => {
                    const g = parseFloat(e.target.value);
                    if (onSnapSettingsChange && snapSettings) {
                      onSnapSettingsChange({ ...snapSettings, gridSize: g });
                    }
                    handleUpdate('gridSize', g);
                  }}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 mt-1 outline-none font-medium"
                >
                  <option value="0.05">5 cm</option>
                  <option value="0.10">10 cm</option>
                  <option value="0.25">25 cm</option>
                  <option value="0.50">50 cm</option>
                  <option value="1.00">1,0 m</option>
                </select>
              </div>
            </div>
          </div>

          {/* Snapping & Intelligent Guidelines Section */}
          {snapSettings && (
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Magnet className="w-4 h-4 text-amber-500" />
                  <span>Magnetisches Fangen & Intelligente Hilfslinien</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSnap('enabled')}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                    snapSettings.enabled
                      ? 'bg-amber-600 text-white hover:bg-amber-500'
                      : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {snapSettings.enabled ? 'Aktiviert' : 'Deaktiviert'}
                </button>
              </div>

              {/* Point snaps */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold text-slate-300">Fangpunkte:</span>
                <div className="grid grid-cols-3 gap-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.grid}
                      onChange={() => toggleSnap('grid')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Raster</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.wallEndpoints}
                      onChange={() => toggleSnap('wallEndpoints')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Endpunkte</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.wallMidpoints}
                      onChange={() => toggleSnap('wallMidpoints')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Mittelpunkte</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.intersections}
                      onChange={() => toggleSnap('intersections')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Schnittpunkte</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.perpendicular}
                      onChange={() => toggleSnap('perpendicular')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Lotpunkt (⟂)</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.divisionPoints}
                      onChange={() => toggleSnap('divisionPoints')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Drittel/Viertel</span>
                  </label>
                </div>
              </div>

              {/* Relationship guidelines */}
              <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-700/60">
                <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  Beziehungs-Hilfslinien:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.parallel}
                      onChange={() => toggleSnap('parallel')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Parallel (//)</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.rightAngle}
                      onChange={() => toggleSnap('rightAngle')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Rechtwinklig (90°/45°)</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.equalLength}
                      onChange={() => toggleSnap('equalLength')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Gleiche Wandlänge (=)</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.extensions}
                      onChange={() => toggleSnap('extensions')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Fluchtend / Verlängerung</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.alignment}
                      onChange={() => toggleSnap('alignment')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Achsen-Ausrichtung</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={snapSettings.equalSpacing}
                      onChange={() => toggleSnap('equalSpacing')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Gleiche Abstände</span>
                  </label>
                  <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer col-span-2">
                    <input
                      type="checkbox"
                      checked={snapSettings.offset}
                      onChange={() => toggleSnap('offset')}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Versatz-Fang (Parallelabstand)</span>
                  </label>
                </div>
              </div>

              {/* Sliders & Parameters */}
              <div className="grid grid-cols-3 gap-2.5 pt-2 border-t border-slate-700/60">
                <div>
                  <label className="text-slate-400">Fangradius (px):</label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="range"
                      min="8"
                      max="40"
                      step="2"
                      value={snapSettings.snapRadiusPx || 18}
                      onChange={(e) => updateSnap('snapRadiusPx', parseInt(e.target.value, 10))}
                      className="w-full accent-amber-500"
                    />
                    <span className="font-mono text-white text-[11px] w-6">{snapSettings.snapRadiusPx || 18}</span>
                  </div>
                </div>

                <div>
                  <label className="text-slate-400">Winkelschritt:</label>
                  <select
                    value={snapSettings.angleStepDeg || 15}
                    onChange={(e) => updateSnap('angleStepDeg', parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200 mt-1 outline-none font-medium"
                  >
                    <option value="5">5° (fein)</option>
                    <option value="15">15°</option>
                    <option value="30">30°</option>
                    <option value="45">45°</option>
                    <option value="90">90°</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400">Versatz-Abstand:</label>
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0.05"
                      value={snapSettings.offsetDistance ?? 2.50}
                      onChange={(e) => updateSnap('offsetDistance', Math.max(0.01, parseFloat(e.target.value) || 2.50))}
                      className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                    />
                    <span className="text-slate-500 font-mono">m</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Architectural Defaults: Walls & Heights */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-3">
            <span className="font-semibold text-white">Standard-Wände & Raumhöhen</span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400">Standard Außenwand:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={currentDefaults.exteriorWallThickness}
                    onChange={(e) => handleUpdate('exteriorWallThickness', parseFloat(e.target.value) || 0.3)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Standard Innenwand:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.005"
                    value={currentDefaults.interiorWallThickness}
                    onChange={(e) => handleUpdate('interiorWallThickness', parseFloat(e.target.value) || 0.115)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Standard Wandhöhe:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    value={currentDefaults.wallHeight}
                    onChange={(e) => handleUpdate('wallHeight', parseFloat(e.target.value) || 2.5)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Standard Raumhöhe:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    value={currentDefaults.roomHeight}
                    onChange={(e) => handleUpdate('roomHeight', parseFloat(e.target.value) || 2.5)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Architectural Defaults: Doors & Windows */}
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-3">
            <span className="font-semibold text-white">Standard-Türen & Fenster</span>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400">Türbreite:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.01"
                    value={currentDefaults.doorWidth}
                    onChange={(e) => handleUpdate('doorWidth', parseFloat(e.target.value) || 0.885)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Türhöhe (Sturz):</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    value={currentDefaults.doorHeight}
                    onChange={(e) => handleUpdate('doorHeight', parseFloat(e.target.value) || 2.05)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Fensterbreite:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    value={currentDefaults.windowWidth}
                    onChange={(e) => handleUpdate('windowWidth', parseFloat(e.target.value) || 1.20)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Fensterhöhe:</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    value={currentDefaults.windowHeight}
                    onChange={(e) => handleUpdate('windowHeight', parseFloat(e.target.value) || 1.25)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Brüstungshöhe (BRH):</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.05"
                    value={currentDefaults.windowParapet}
                    onChange={(e) => handleUpdate('windowParapet', parseFloat(e.target.value) || 0.90)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>

              <div>
                <label className="text-slate-400">Grenzabstand (Abstandsfläche):</label>
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="number"
                    step="0.5"
                    value={currentDefaults.setback}
                    onChange={(e) => handleUpdate('setback', parseFloat(e.target.value) || 3.0)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 font-mono text-white text-right"
                  />
                  <span className="text-slate-500 font-mono">m</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Einstellungen übernehmen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
