/**
 * CadToolOptionsFlyout.tsx
 * 
 * Docked Tool Options Flyout (TEIL 3: Wandmenü & Werkzeugoptionen Neu)
 * Replaces the intrusive floating top-center HUD with a sleek, non-blocking
 * flyout docked beside the toolbar.
 * 
 * Features:
 * - Collapsible into a compact chip ("Außenwand · 30 cm · 2,50 m")
 * - Auto-collapses when drawing starts so canvas is 100% unobstructed
 * - Exterior / Interior wall toggle with custom architectural pictograms
 * - Direct thickness input + Stepper (± 0.5 cm) + Quick chips (11.5, 17.5, 24, 30, 36.5 cm)
 * - Interactive elevation diagram with draggable start & end height handles (touch & mouse)
 * - Start / End height numeric inputs with "Anfang = Ende" lock toggle
 * - Swap button (Start ↔ Ende)
 * - Height presets ("Gerade 2,50m", "Gerade hoch 2,80m", "Schräg +1,00m", "Schräg +2,00m", "Giebelwand")
 * - "Als Standard für neue Wände speichern" button
 * - Support for other tools: Doors, Windows, Stairs, Furniture, Dimensions
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Lock,
  Unlock,
  ArrowLeftRight,
  Sliders,
  Check,
  DoorOpen,
  AppWindow,
  Ruler,
  Armchair,
  Layers,
  Sparkles,
  Bookmark,
  RotateCw,
} from 'lucide-react';
import { CadTool, ProjectDefaults, Language } from '../../types/cad';
import { formatGermanNumber } from '../../utils/cadMath';
import { getT } from '../../i18n/translations';

interface CadToolOptionsFlyoutProps {
  activeTool: CadTool;
  wallMode: 'exterior' | 'interior';
  onWallModeChange: (mode: 'exterior' | 'interior') => void;
  wallThicknessM: number;
  onWallThicknessChange: (thicknessM: number) => void;
  wallStartHeight: number;
  onWallStartHeightChange: (h: number) => void;
  wallEndHeight: number;
  onWallEndHeightChange: (h: number) => void;
  isLockWallHeights: boolean;
  onLockWallHeightsChange: (locked: boolean) => void;
  onSaveAsDefaultWalls?: () => void;

  // Door options
  doorWidthM?: number;
  onDoorWidthChange?: (w: number) => void;
  doorHinge?: 'left' | 'right';
  onDoorHingeChange?: (h: 'left' | 'right') => void;

  // Window options
  windowWidthM?: number;
  onWindowWidthChange?: (w: number) => void;
  windowSillHeightM?: number;
  onWindowSillHeightChange?: (h: number) => void;

  // Drawing state
  isDrawingActive: boolean;
  leftHandedMode?: boolean;
  isPortrait?: boolean;
  language: Language;
}

export const CadToolOptionsFlyout: React.FC<CadToolOptionsFlyoutProps> = ({
  activeTool,
  wallMode,
  onWallModeChange,
  wallThicknessM,
  onWallThicknessChange,
  wallStartHeight,
  onWallStartHeightChange,
  wallEndHeight,
  onWallEndHeightChange,
  isLockWallHeights,
  onLockWallHeightsChange,
  onSaveAsDefaultWalls,
  doorWidthM = 0.90,
  onDoorWidthChange,
  doorHinge = 'left',
  onDoorHingeChange,
  windowWidthM = 1.20,
  onWindowWidthChange,
  windowSillHeightM = 0.90,
  onWindowSillHeightChange,
  isDrawingActive,
  leftHandedMode = false,
  isPortrait = false,
  language,
}) => {
  const t = getT(language);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Auto-collapse when user starts drawing on canvas
  useEffect(() => {
    if (isDrawingActive) {
      setIsCollapsed(true);
    }
  }, [isDrawingActive]);

  // Elevation drag state
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<'start' | 'end' | null>(null);

  const handlePointerDownHandle = (handle: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setDraggingHandle(handle);
  };

  const handlePointerMoveHandle = (e: React.PointerEvent) => {
    if (!draggingHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const relY = e.clientY - rect.top;
    // Map Y: top (10px) = 5.0m, bottom (80px) = 1.0m
    const minH = 1.0;
    const maxH = 5.0;
    const topY = 12;
    const botY = 78;
    const clampedY = Math.max(topY, Math.min(botY, relY));
    const factor = (botY - clampedY) / (botY - topY);
    const newH = Math.round((minH + factor * (maxH - minH)) * 20) / 20; // 0.05m steps

    if (draggingHandle === 'start') {
      onWallStartHeightChange(newH);
      if (isLockWallHeights) {
        onWallEndHeightChange(newH);
      }
    } else {
      onWallEndHeightChange(newH);
      if (isLockWallHeights) {
        onWallStartHeightChange(newH);
      }
    }
  };

  const handlePointerUpHandle = (e: React.PointerEvent) => {
    if (draggingHandle) {
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
      setDraggingHandle(null);
    }
  };

  // Only show for tools that have customizable properties
  const isSupportedTool = ['wall', 'rect_room', 'door', 'window', 'dimension', 'stairs', 'furniture'].includes(activeTool);
  if (!isSupportedTool) return null;

  // Swap wall heights
  const handleSwapHeights = () => {
    const tmp = wallStartHeight;
    onWallStartHeightChange(wallEndHeight);
    onWallEndHeightChange(tmp);
  };

  // Stepper helper
  const handleThicknessStep = (deltaCm: number) => {
    const curCm = Math.round(wallThicknessM * 1000) / 10;
    const nextCm = Math.max(5, Math.min(60, curCm + deltaCm));
    onWallThicknessChange(Math.round(nextCm * 10) / 1000);
  };

  // Preset setter
  const applyHeightPreset = (start: number, end: number) => {
    onWallStartHeightChange(start);
    onWallEndHeightChange(end);
    onLockWallHeightsChange(Math.abs(start - end) < 0.01);
  };

  const handleSaveDefaults = () => {
    if (onSaveAsDefaultWalls) {
      onSaveAsDefaultWalls();
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  // Summary chip text
  const getSummaryChipText = () => {
    if (activeTool === 'wall' || activeTool === 'rect_room') {
      const typeLabel = wallMode === 'exterior' ? 'Außenwand' : 'Innenwand';
      const thickLabel = `${formatGermanNumber(wallThicknessM * 100, 1)} cm`;
      const heightLabel = isLockWallHeights || Math.abs(wallStartHeight - wallEndHeight) < 0.01
        ? `${formatGermanNumber(wallStartHeight, 2)} m`
        : `${formatGermanNumber(wallStartHeight, 2)} → ${formatGermanNumber(wallEndHeight, 2)} m`;
      return `${typeLabel} · ${thickLabel} · ${heightLabel}`;
    }
    if (activeTool === 'door') {
      return `Innentür · ${formatGermanNumber(doorWidthM * 100, 0)} cm · DIN ${doorHinge === 'left' ? 'L' : 'R'}`;
    }
    if (activeTool === 'window') {
      return `Fenster · ${formatGermanNumber(windowWidthM * 100, 0)} cm · BRH ${formatGermanNumber(windowSillHeightM, 2)} m`;
    }
    if (activeTool === 'dimension') {
      return 'Bemaßungsmessung (Meter & Zentimeter)';
    }
    if (activeTool === 'furniture') {
      return 'Möblierung & Sanitärobjekte';
    }
    return 'Werkzeug-Optionen';
  };

  // Render collapsed chip
  if (isCollapsed) {
    return (
      <div
        className={`fixed z-30 transition-all ${
          isPortrait
            ? 'bottom-16 left-1/2 -translate-x-1/2'
            : leftHandedMode
            ? 'top-16 right-16'
            : 'top-16 left-16'
        }`}
      >
        <button
          onClick={() => setIsCollapsed(false)}
          title="Werkzeug-Optionen öffnen"
          className="flex items-center gap-2 px-3 py-1.5 bg-stone-900/95 dark:bg-stone-900/95 text-stone-100 hover:text-white border border-stone-700/80 rounded-full shadow-xl backdrop-blur-md text-xs font-medium cursor-pointer transition-transform hover:scale-105 active:scale-95"
        >
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="tabular-nums font-sans">{getSummaryChipText()}</span>
          <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
        </button>
      </div>
    );
  }

  // Diagram math for Wall Elevation
  const diagMinH = 1.0;
  const diagMaxH = 5.0;
  const diagTopY = 12;
  const diagBotY = 78;
  const getYForH = (h: number) => {
    const factor = (h - diagMinH) / (diagMaxH - diagMinH);
    return diagBotY - factor * (diagBotY - diagTopY);
  };
  const startY = getYForH(wallStartHeight);
  const endY = getYForH(wallEndHeight);

  return (
    <div
      className={`fixed z-30 transition-all ${
        isPortrait
          ? 'bottom-16 left-3 right-3 max-w-md mx-auto'
          : leftHandedMode
          ? 'top-16 right-16 w-80'
          : 'top-16 left-16 w-80'
      }`}
    >
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl p-3.5 text-stone-800 dark:text-stone-100 flex flex-col gap-3 select-none">
        {/* Header with Title and Collapse Button */}
        <div className="flex items-center justify-between pb-2 border-b border-stone-100 dark:border-stone-800/80">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              {activeTool === 'wall' || activeTool === 'rect_room' ? (
                <Sliders className="w-3.5 h-3.5" />
              ) : activeTool === 'door' ? (
                <DoorOpen className="w-3.5 h-3.5" />
              ) : activeTool === 'window' ? (
                <AppWindow className="w-3.5 h-3.5" />
              ) : (
                <Ruler className="w-3.5 h-3.5" />
              )}
            </div>
            <span className="font-semibold text-xs text-stone-900 dark:text-white">
              {activeTool === 'wall' || activeTool === 'rect_room'
                ? 'Wand-Einstellungen'
                : activeTool === 'door'
                ? 'Tür-Optionen'
                : activeTool === 'window'
                ? 'Fenster-Optionen'
                : 'Werkzeug-Optionen'}
            </span>
          </div>

          <button
            onClick={() => setIsCollapsed(true)}
            title="Einklappen (auf Chip verkleinern)"
            className="flex items-center gap-1 text-[11px] font-medium text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 px-1.5 py-0.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer"
          >
            <span>Minimieren</span>
            <ChevronUp className="w-3 h-3" />
          </button>
        </div>

        {/* 1. WALL & ROOM TOOL OPTIONS */}
        {(activeTool === 'wall' || activeTool === 'rect_room') && (
          <div className="flex flex-col gap-3 text-xs">
            {/* Wandtyp: Außenwand (dick, gedämmt) vs. Innenwand (dünn) */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                Wandtyp
              </span>
              <div className="grid grid-cols-2 gap-2">
                {/* Exterior Wall */}
                <button
                  type="button"
                  onClick={() => onWallModeChange('exterior')}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                    wallMode === 'exterior'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-stone-900 dark:text-white shadow-sm ring-1 ring-amber-500/50'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {/* Exterior wall pictogram: thick with hatch */}
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="4" width="18" height="16" rx="2" className="fill-stone-300 dark:fill-stone-700 stroke-stone-600 dark:stroke-stone-400" strokeWidth="1.5" />
                    <line x1="3" y1="9" x2="21" y2="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-amber-500" />
                    <line x1="3" y1="15" x2="21" y2="15" stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-amber-500" />
                  </svg>
                  <div>
                    <div className="font-bold text-xs">Außenwand</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400">Gedämmt, tragend</div>
                  </div>
                </button>

                {/* Interior Wall */}
                <button
                  type="button"
                  onClick={() => onWallModeChange('interior')}
                  className={`p-2 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                    wallMode === 'interior'
                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-stone-900 dark:text-white shadow-sm ring-1 ring-amber-500/50'
                      : 'border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/60 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {/* Interior wall pictogram: thin single line */}
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24" fill="none">
                    <rect x="7" y="4" width="10" height="16" rx="1.5" className="fill-stone-200 dark:fill-stone-800 stroke-stone-500 dark:stroke-stone-400" strokeWidth="1.5" />
                    <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="1.5" className="text-stone-400" />
                  </svg>
                  <div>
                    <div className="font-bold text-xs">Innenwand</div>
                    <div className="text-[10px] text-stone-500 dark:text-stone-400">Dünn, Trennwand</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Wandstärke: Direkteingabe + Stepper (± 0.5 cm) + Quick Chips */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  Wandstärke
                </span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                  {formatGermanNumber(wallThicknessM * 100, 1)} cm
                </span>
              </div>

              {/* Stepper + Input */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleThicknessStep(-0.5)}
                  title="-0,5 cm"
                  className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 font-bold text-sm flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                >
                  −
                </button>

                <div className="flex-1 flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 px-2.5 py-1.5 rounded-lg border border-stone-200 dark:border-stone-700/80">
                  <input
                    type="number"
                    step="0.5"
                    min="5"
                    max="60"
                    value={Math.round(wallThicknessM * 1000) / 10}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value);
                      if (!isNaN(v) && v > 0) onWallThicknessChange(v / 100);
                    }}
                    className="w-full bg-transparent text-center font-mono font-bold text-xs text-stone-900 dark:text-white outline-none tabular-nums"
                  />
                  <span className="text-[11px] text-stone-400 font-medium">cm</span>
                </div>

                <button
                  type="button"
                  onClick={() => handleThicknessStep(0.5)}
                  title="+0,5 cm"
                  className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 font-bold text-sm flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                >
                  +
                </button>
              </div>

              {/* Quick thickness chips */}
              <div className="flex items-center gap-1 mt-0.5 overflow-x-auto pb-0.5">
                {[0.115, 0.175, 0.24, 0.30, 0.365].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onWallThicknessChange(val)}
                    className={`flex-1 py-1 rounded-md text-[10px] font-mono font-semibold transition-colors cursor-pointer text-center whitespace-nowrap ${
                      Math.abs(wallThicknessM - val) < 0.005
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    {formatGermanNumber(val * 100, 1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Wandhöhe: Interaktive Ansichts-Grafik mit ziehbaren Griffen */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-stone-100 dark:border-stone-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                  Wandhöhe (Ansicht / Gefälle)
                </span>
                <span className="text-[10px] text-stone-400">
                  {Math.abs(wallEndHeight - wallStartHeight) > 0.02
                    ? `${wallEndHeight > wallStartHeight ? '↗ +' : '↘ '}${formatGermanNumber(Math.abs(wallEndHeight - wallStartHeight), 2)} m Gefälle`
                    : 'Gerade Wand'}
                </span>
              </div>

              {/* SVG Elevation Drawing with Drag Handles */}
              <div className="relative bg-stone-50 dark:bg-stone-950/60 rounded-xl p-2 border border-stone-200 dark:border-stone-800">
                <svg
                  ref={svgRef}
                  className="w-full h-24 touch-none select-none"
                  viewBox="0 0 240 90"
                  onPointerMove={handlePointerMoveHandle}
                  onPointerUp={handlePointerUpHandle}
                >
                  {/* Grid / Guide lines */}
                  <line x1="20" y1="78" x2="220" y2="78" stroke="currentColor" strokeWidth="1.5" className="text-stone-300 dark:text-stone-700" />
                  <text x="12" y="81" className="text-[8px] fill-stone-400 font-mono">0m</text>
                  <line x1="20" y1="45" x2="220" y2="45" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 3" className="text-stone-300/60 dark:text-stone-800" />
                  <text x="8" y="48" className="text-[8px] fill-stone-400 font-mono">2,5m</text>
                  <line x1="20" y1="12" x2="220" y2="12" stroke="currentColor" strokeWidth="0.7" strokeDasharray="3 3" className="text-stone-300/60 dark:text-stone-800" />
                  <text x="8" y="15" className="text-[8px] fill-stone-400 font-mono">5m</text>

                  {/* Wall Polygon */}
                  <polygon
                    points={`50,78 50,${startY} 190,${endY} 190,78`}
                    className="fill-amber-500/20 stroke-amber-500"
                    strokeWidth="2"
                  />

                  {/* Hatch / pattern lines inside wall */}
                  <line x1="85" y1="78" x2="85" y2={startY + (endY - startY) * (35 / 140)} stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-amber-500/40" />
                  <line x1="120" y1="78" x2="120" y2={startY + (endY - startY) * (70 / 140)} stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-amber-500/40" />
                  <line x1="155" y1="78" x2="155" y2={startY + (endY - startY) * (105 / 140)} stroke="currentColor" strokeWidth="1" strokeDasharray="2 2" className="text-amber-500/40" />

                  {/* Left Column Handle (Start Height) */}
                  <g
                    className="cursor-ns-resize"
                    onPointerDown={(e) => handlePointerDownHandle('start', e)}
                  >
                    <circle cx="50" cy={startY} r="8" className="fill-white dark:fill-stone-900 stroke-amber-500" strokeWidth="2.5" />
                    <circle cx="50" cy={startY} r="3" className="fill-amber-500" />
                  </g>
                  <text x="50" y={Math.max(10, startY - 11)} textAnchor="middle" className="text-[10px] font-mono font-bold fill-amber-600 dark:fill-amber-400">
                    {formatGermanNumber(wallStartHeight, 2)}m
                  </text>
                  <text x="50" y="88" textAnchor="middle" className="text-[8px] fill-stone-400 uppercase font-semibold">
                    Start
                  </text>

                  {/* Right Column Handle (End Height) */}
                  <g
                    className="cursor-ns-resize"
                    onPointerDown={(e) => handlePointerDownHandle('end', e)}
                  >
                    <circle cx="190" cy={endY} r="8" className="fill-white dark:fill-stone-900 stroke-amber-500" strokeWidth="2.5" />
                    <circle cx="190" cy={endY} r="3" className="fill-amber-500" />
                  </g>
                  <text x="190" y={Math.max(10, endY - 11)} textAnchor="middle" className="text-[10px] font-mono font-bold fill-amber-600 dark:fill-amber-400">
                    {formatGermanNumber(wallEndHeight, 2)}m
                  </text>
                  <text x="190" y="88" textAnchor="middle" className="text-[8px] fill-stone-400 uppercase font-semibold">
                    Ende
                  </text>
                </svg>

                <div className="text-[9px] text-center text-stone-400 mt-0.5">
                  Tipp: Punkte vertikal ziehen, um Höhen direkt anzupassen
                </div>
              </div>

              {/* Number Inputs + Lock + Swap */}
              <div className="flex items-center gap-1.5 mt-1">
                {/* Start Height */}
                <div className="flex-1 flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700/80">
                  <span className="text-[10px] text-stone-400 font-semibold">Start:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="6.0"
                    value={wallStartHeight}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 2.5;
                      onWallStartHeightChange(v);
                      if (isLockWallHeights) onWallEndHeightChange(v);
                    }}
                    className="w-full bg-transparent text-center font-mono font-bold text-xs text-stone-900 dark:text-white outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-stone-400 font-medium">m</span>
                </div>

                {/* Lock button */}
                <button
                  type="button"
                  onClick={() => onLockWallHeightsChange(!isLockWallHeights)}
                  title={isLockWallHeights ? 'Höhen gekoppelt (Start = Ende). Klicken zum Entkoppeln' : 'Höhen getrennt. Klicken zum Koppeln'}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    isLockWallHeights
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500/60 text-amber-600 dark:text-amber-400'
                      : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200'
                  }`}
                >
                  {isLockWallHeights ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>

                {/* Swap button */}
                <button
                  type="button"
                  onClick={handleSwapHeights}
                  title="Start- und Endhöhe tauschen"
                  className="p-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700 cursor-pointer transition-colors"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                </button>

                {/* End Height */}
                <div className="flex-1 flex items-center gap-1 bg-stone-100 dark:bg-stone-800/80 px-2 py-1 rounded-lg border border-stone-200 dark:border-stone-700/80">
                  <span className="text-[10px] text-stone-400 font-semibold">Ende:</span>
                  <input
                    type="number"
                    step="0.05"
                    min="1.0"
                    max="6.0"
                    value={wallEndHeight}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value) || 2.5;
                      onWallEndHeightChange(v);
                      if (isLockWallHeights) onWallStartHeightChange(v);
                    }}
                    className="w-full bg-transparent text-center font-mono font-bold text-xs text-stone-900 dark:text-white outline-none tabular-nums"
                  />
                  <span className="text-[10px] text-stone-400 font-medium">m</span>
                </div>
              </div>

              {/* Height Presets */}
              <div className="flex flex-col gap-1 mt-1">
                <span className="text-[10px] text-stone-400 font-medium">Höhen-Vorlagen:</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => applyHeightPreset(2.50, 2.50)}
                    className={`px-1.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer text-center ${
                      wallStartHeight === 2.5 && wallEndHeight === 2.5
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    Gerade 2,50m
                  </button>

                  <button
                    type="button"
                    onClick={() => applyHeightPreset(2.80, 2.80)}
                    className={`px-1.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer text-center ${
                      wallStartHeight === 2.8 && wallEndHeight === 2.8
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    Gerade 2,80m
                  </button>

                  <button
                    type="button"
                    onClick={() => applyHeightPreset(2.50, 3.50)}
                    className={`px-1.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer text-center ${
                      wallStartHeight === 2.5 && wallEndHeight === 3.5
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    Schräg +1,00m
                  </button>

                  <button
                    type="button"
                    onClick={() => applyHeightPreset(2.50, 4.50)}
                    className={`px-1.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer text-center ${
                      wallStartHeight === 2.5 && wallEndHeight === 4.5
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    Schräg +2,00m
                  </button>

                  <button
                    type="button"
                    onClick={() => applyHeightPreset(2.50, 4.20)}
                    className={`px-1.5 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer text-center col-span-2 ${
                      wallStartHeight === 2.5 && wallEndHeight === 4.2
                        ? 'bg-amber-600 text-white font-bold'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-750'
                    }`}
                  >
                    Giebelwand 2,50 → 4,20m
                  </button>
                </div>
              </div>

              {/* Save as default for new walls */}
              <button
                type="button"
                onClick={handleSaveDefaults}
                className="mt-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-medium text-[11px] transition-colors cursor-pointer"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Als Standard gespeichert!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5 text-amber-500" />
                    <span>Als Standard für neue Wände speichern</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* 2. DOOR TOOL OPTIONS */}
        {activeTool === 'door' && (
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Türbreite</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatGermanNumber(doorWidthM * 100, 0)} cm
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[0.75, 0.80, 0.90, 1.00].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onDoorWidthChange && onDoorWidthChange(w)}
                  className={`py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer text-center ${
                    Math.abs(doorWidthM - w) < 0.01
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {formatGermanNumber(w * 100, 0)} cm
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1 pt-1 border-t border-stone-100 dark:border-stone-800">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Türanschlag</span>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => onDoorHingeChange && onDoorHingeChange('left')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-colors cursor-pointer text-center ${
                    doorHinge === 'left'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  DIN Links (L)
                </button>
                <button
                  type="button"
                  onClick={() => onDoorHingeChange && onDoorHingeChange('right')}
                  className={`py-1.5 px-2 rounded-lg font-medium text-xs transition-colors cursor-pointer text-center ${
                    doorHinge === 'right'
                      ? 'bg-amber-600 text-white font-bold'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  DIN Rechts (R)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 3. WINDOW TOOL OPTIONS */}
        {activeTool === 'window' && (
          <div className="flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Fensterbreite</span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                {formatGermanNumber(windowWidthM * 100, 0)} cm
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              {[0.80, 1.00, 1.20, 1.50].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => onWindowWidthChange && onWindowWidthChange(w)}
                  className={`py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer text-center ${
                    Math.abs(windowWidthM - w) < 0.01
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                  }`}
                >
                  {formatGermanNumber(w * 100, 0)} cm
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-1 pt-1 border-t border-stone-100 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-stone-500 dark:text-stone-400">Brüstungshöhe (BRH)</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatGermanNumber(windowSillHeightM, 2)} m
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[0.00, 0.80, 0.90].map((brh) => (
                  <button
                    key={brh}
                    type="button"
                    onClick={() => onWindowSillHeightChange && onWindowSillHeightChange(brh)}
                    className={`py-1 rounded text-xs font-mono font-semibold transition-colors cursor-pointer text-center ${
                      Math.abs(windowSillHeightM - brh) < 0.01
                        ? 'bg-amber-600 text-white'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400'
                    }`}
                  >
                    {brh === 0 ? 'Bodentief' : `${formatGermanNumber(brh, 2)} m`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. OTHER TOOLS (FURNITURE, DIMENSIONS, ETC) */}
        {activeTool === 'dimension' && (
          <div className="text-xs text-stone-600 dark:text-stone-400 flex flex-col gap-1.5">
            <p>Klicke auf zwei Wandpunkte oder Kanten, um eine automatische Bemaßungslinie mit Maßkette zu erzeugen.</p>
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              Maßangaben in deutscher Norm (Meter / cm).
            </div>
          </div>
        )}

        {activeTool === 'furniture' && (
          <div className="text-xs text-stone-600 dark:text-stone-400 flex flex-col gap-2">
            <p>Wähle ein Objekt aus dem Katalog und platziere es mit Klick oder Berührung im Grundriss.</p>
            <div className="text-[11px] text-stone-500">
              Drehung per Doppel-Tipp oder im Eigenschaften-Menü.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
