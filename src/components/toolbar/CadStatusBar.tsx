/**
 * Bottom Status Bar with Snapping, Coordinates, Selection Count, and Floating Zoom
 * Features comprehensive "Fangen & Hilfslinien" popover menu with live toggles
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Grid,
  Magnet,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Crosshair,
  Split,
  Sliders,
  ChevronUp,
  X,
  Check,
  Equal,
  Sparkles,
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
  const [showSnapPopover, setShowSnapPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!showSnapPopover) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setShowSnapPopover(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showSnapPopover]);

  const toggleSnap = (key: keyof SnapSettings) => {
    onSnapSettingsChange({
      ...snapSettings,
      [key]: !snapSettings[key],
    });
  };

  const updateSnapField = <K extends keyof SnapSettings>(key: K, val: SnapSettings[K]) => {
    onSnapSettingsChange({
      ...snapSettings,
      [key]: val,
    });
  };

  const zoomPct = Math.round((zoom / 55) * 100);

  const activeGuidesCount = [
    snapSettings.wallEndpoints,
    snapSettings.wallMidpoints,
    snapSettings.intersections,
    snapSettings.perpendicular,
    snapSettings.parallel,
    snapSettings.rightAngle,
    snapSettings.equalLength,
    snapSettings.extensions,
    snapSettings.alignment,
    snapSettings.equalSpacing,
    snapSettings.offset,
  ].filter(Boolean).length;

  return (
    <footer className="relative h-9 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 z-20 shrink-0 select-none overflow-x-auto no-scrollbar">
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

      {/* Right: Snapping Popover Trigger, Unit, Scale & Zoom Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Quick Snapping Controls + Popover Trigger */}
        <div className="flex items-center gap-1 bg-stone-100 dark:bg-stone-800 p-0.5 rounded-lg border border-stone-200 dark:border-stone-700">
          {/* Quick Grid Snap */}
          <button
            onClick={() => toggleSnap('grid')}
            title="Raster-Fang (G)"
            className={`p-1 rounded text-xs transition-colors cursor-pointer ${
              snapSettings.grid
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Master Snapping & Intelligent Guidelines Popover Button */}
          <button
            ref={triggerRef}
            onClick={() => setShowSnapPopover(!showSnapPopover)}
            title="Fangen & Intelligente Hilfslinien konfigurieren (Taste: S)"
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
              snapSettings.enabled
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                : 'bg-stone-200 dark:bg-stone-700 text-stone-500 line-through hover:opacity-90'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fangen & Hilfen</span>
            <span className="text-[10px] px-1 rounded bg-black/20 font-mono">
              {snapSettings.enabled ? activeGuidesCount : 'AUS'}
            </span>
            <ChevronUp className={`w-3 h-3 transition-transform ${showSnapPopover ? 'rotate-180' : ''}`} />
          </button>

          {/* Quick Ortho mode */}
          <button
            onClick={() => toggleSnap('ortho')}
            title="Ortho-Modus (90° Winkel, Shift)"
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

      {/* POPOVER: Fangen & Intelligente Hilfslinien */}
      {showSnapPopover && (
        <div
          ref={popoverRef}
          className="absolute bottom-11 right-6 w-96 max-h-[82vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-slate-800 dark:text-slate-100 flex flex-col gap-3.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
        >
          {/* Header & Master Switch */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Magnet className="w-4 h-4 text-amber-500" />
              <span className="font-bold text-xs">Fangen & Hilfslinien</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSnap('enabled')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                  snapSettings.enabled
                    ? 'bg-amber-600 text-white hover:bg-amber-500'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                title="Schnelltaste: S oder F3"
              >
                <span>{snapSettings.enabled ? 'Aktiv' : 'Inaktiv'}</span>
                <kbd className="px-1 text-[9px] bg-black/20 rounded font-mono font-normal">S</kbd>
              </button>
              <button
                onClick={() => setShowSnapPopover(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Section 1: Beziehungs-Hilfslinien */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Beziehungs-Hilfslinien (Live)
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.parallel}
                  onChange={() => toggleSnap('parallel')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Parallel (//)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.rightAngle}
                  onChange={() => toggleSnap('rightAngle')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Rechtwinklig (90°/45°)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.equalLength}
                  onChange={() => toggleSnap('equalLength')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Gleiche Länge (=)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.extensions}
                  onChange={() => toggleSnap('extensions')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Fluchtend (Verlängerung)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.alignment}
                  onChange={() => toggleSnap('alignment')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Ausrichtung an Achsen</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.equalSpacing}
                  onChange={() => toggleSnap('equalSpacing')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Gleiche Abstände</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={snapSettings.offset}
                  onChange={() => toggleSnap('offset')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-medium">Versatz-Fang (Parallelabstand)</span>
              </label>
            </div>
          </div>

          {/* Section 2: Magnetische Fangpunkte */}
          <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Magnetische Fangpunkte
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.grid}
                  onChange={() => toggleSnap('grid')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Raster</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.wallEndpoints}
                  onChange={() => toggleSnap('wallEndpoints')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Endpunkte & Ecken</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.wallMidpoints}
                  onChange={() => toggleSnap('wallMidpoints')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Mittelpunkte</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.intersections}
                  onChange={() => toggleSnap('intersections')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Schnittpunkte</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.perpendicular}
                  onChange={() => toggleSnap('perpendicular')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Lotpunkt (senkrecht)</span>
              </label>

              <label className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={snapSettings.divisionPoints}
                  onChange={() => toggleSnap('divisionPoints')}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Drittel- & Viertelpunkte</span>
              </label>
            </div>
          </div>

          {/* Section 3: Parameter & Schieberegler */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Fangradius:</span>
              <div className="flex items-center gap-2 font-mono">
                <input
                  type="range"
                  min="8"
                  max="40"
                  step="2"
                  value={snapSettings.snapRadiusPx || 18}
                  onChange={(e) => updateSnapField('snapRadiusPx', parseInt(e.target.value, 10))}
                  className="w-24 accent-amber-500 cursor-pointer"
                />
                <span className="w-10 text-right font-bold">{snapSettings.snapRadiusPx || 18} px</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Winkelschritte:</span>
              <select
                value={snapSettings.angleStepDeg || 15}
                onChange={(e) => updateSnapField('angleStepDeg', parseInt(e.target.value, 10))}
                className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-0.5 font-mono text-[11px]"
              >
                <option value="5">5° (Fein)</option>
                <option value="15">15° (Standard)</option>
                <option value="30">30°</option>
                <option value="45">45°</option>
                <option value="90">90° (Ortho)</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Versatz-Abstand:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  step="0.05"
                  min="0.05"
                  value={snapSettings.offsetDistance ?? 2.50}
                  onChange={(e) => updateSnapField('offsetDistance', Math.max(0.01, parseFloat(e.target.value) || 2.50))}
                  className="w-16 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 font-mono text-right text-[11px]"
                />
                <span className="font-mono text-slate-400">m</span>
              </div>
            </div>
          </div>

          {/* Footer Shortcuts hint */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/40 p-2 rounded-lg">
            <span>
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold">Tab</kbd> Fangpunkt wechseln
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold">Alt</kbd> Ohne Fangen
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-slate-200 dark:bg-slate-800 rounded font-mono font-bold">Shift</kbd> Winkel sperren
            </span>
          </div>
        </div>
      )}
    </footer>
  );
};
