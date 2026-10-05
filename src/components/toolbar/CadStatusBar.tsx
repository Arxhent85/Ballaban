/**
 * Bottom Status Bar with Snapping, Coordinates, Selection Count, and Floating Zoom
 */

import React from 'react';
import {
  Grid,
  Magnet,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Split,
} from 'lucide-react';
import { Point2D, SnapSettings, UnitType, ScaleType, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import { formatDimension } from '../../utils/cadMath';

interface CadStatusBarProps {
  cursorPos: Point2D | null;
  hintText: string;
  zoom: number;
  onZoomChange: (z: number) => void;
  onZoomFit: () => void;
  snapSettings: SnapSettings;
  onSnapSettingsChange: (s: SnapSettings) => void;
  unit: UnitType;
  onUnitChange: (u: UnitType) => void;
  scale: ScaleType;
  onScaleChange: (sc: ScaleType) => void;
  language: Language;
  selectedCount: number;
}

export const CadStatusBar: React.FC<CadStatusBarProps> = ({
  cursorPos,
  hintText,
  zoom,
  onZoomChange,
  onZoomFit,
  snapSettings,
  onSnapSettingsChange,
  unit,
  onUnitChange,
  scale,
  onScaleChange,
  language,
  selectedCount,
}) => {
  const t = getT(language);

  const toggleSnap = (key: keyof SnapSettings) => {
    onSnapSettingsChange({
      ...snapSettings,
      [key]: !snapSettings[key],
    });
  };

  const zoomPct = Math.round((zoom / 55) * 100);

  return (
    <footer className="h-9 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 z-20 shrink-0 select-none overflow-x-auto no-scrollbar">
      {/* Left: Hint & Coordinates & Selection Count */}
      <div className="flex items-center gap-3 shrink-0">
        {cursorPos && (
          <div className="flex items-center gap-2 font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 tabular-nums">
            <span>
              X: <strong>{formatDimension(cursorPos.x, unit, 2)}</strong>
            </span>
            <span className="text-slate-400">|</span>
            <span>
              Y: <strong>{formatDimension(cursorPos.y, unit, 2)}</strong>
            </span>
          </div>
        )}

        {selectedCount > 0 && (
          <span className="px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-300 dark:border-amber-800">
            {selectedCount} {selectedCount === 1 ? 'Objekt ausgewählt' : 'Objekte ausgewählt'}
          </span>
        )}

        <div className="text-slate-500 dark:text-slate-400 font-medium truncate max-w-[280px] lg:max-w-[420px]" title={hintText}>
          {hintText}
        </div>
      </div>

      {/* Right: Snapping, Unit, Scale & Zoom Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Snap Toggles */}
        <div className="flex items-center gap-0.5 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
          <button
            onClick={() => toggleSnap('grid')}
            title="Raster-Fang"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              snapSettings.grid
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleSnap('wallEndpoints')}
            title="Wandenden fangen"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              snapSettings.wallEndpoints
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleSnap('wallMidpoints')}
            title="Wandmitten fangen"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              snapSettings.wallMidpoints
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <Split className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => toggleSnap('ortho')}
            title="Ortho-Modus (90° Winkel)"
            className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded transition-colors cursor-pointer ${
              snapSettings.ortho
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            ORTHO
          </button>
        </div>

        {/* Unit Selector */}
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as UnitType)}
          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono outline-none cursor-pointer"
        >
          <option value="m">Meter (m)</option>
          <option value="cm">Zentimeter (cm)</option>
          <option value="mm">Millimeter (mm)</option>
        </select>

        {/* Scale Selector */}
        <select
          value={scale}
          onChange={(e) => onScaleChange(e.target.value as ScaleType)}
          className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-mono outline-none cursor-pointer"
        >
          <option value="1:20">1:20</option>
          <option value="1:50">1:50</option>
          <option value="1:100">1:100</option>
        </select>

        {/* Floating Zoom Widget Controls */}
        <div className="flex items-center gap-1 pl-1 border-l border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onZoomChange(Math.max(12, zoom * 0.85))}
            title="Verkleinern"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span
            onClick={onZoomFit}
            title="Alles anzeigen (Zoom auf Plan)"
            className="font-mono text-[11px] text-slate-700 dark:text-slate-300 w-12 text-center cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 font-semibold"
          >
            {zoomPct}%
          </span>

          <button
            onClick={() => onZoomChange(Math.min(280, zoom * 1.2))}
            title="Vergrößern"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onZoomFit}
            title="Alles anzeigen (70 % Ansicht)"
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
