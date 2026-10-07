/**
 * Right Properties Inspector & Element Editor
 * Supports:
 * - Single element editing (Walls, Doors, Windows, Stairs, Roofs, Rooms, Furniture)
 * - Multi-selection batch editing (Wall thickness, height, material, and exterior/interior for ALL selected walls simultaneously)
 * - Free wall height & room height adjustment (DIN standards / individual rooms)
 * - Window & door sill / lintel / parapet heights
 * - Plot boundary, setbacks, buildable area, and live GRZ/GFZ compliance checker
 * - Architectural catalog & Layer manager
 */

import React, { useState, useMemo } from 'react';
import {
  Trash2,
  Copy,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  Layers,
  Info,
  Sliders,
  Check,
  Armchair,
  Tag,
  Plus,
  Search,
  Eye,
  EyeOff,
  Compass,
  AlertTriangle,
  Home,
  Lock,
  Unlock,
  Image as ImageIcon,
  Crop,
  Sun,
  Contrast,
  RotateCcw,
} from 'lucide-react';
import {
  SelectionState,
  Wall,
  Door,
  Window,
  Stair,
  Roof,
  Room,
  Furniture,
  LayerState,
  UnitType,
  Language,
  InspectorTab,
  WallMaterial,
  PlotBoundary,
  BackgroundImage,
} from '../../types/cad';
import { formatDimension, distance, calculatePlotMetrics } from '../../utils/cadMath';
import { FURNITURE_CATALOG } from '../../utils/furnitureLibrary';
import { getT } from '../../i18n/translations';

interface CadInspectorProps {
  selection: SelectionState;
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  roofs: Roof[];
  rooms: Room[];
  furniture: Furniture[];
  layers: LayerState[];
  unit: UnitType;
  language: Language;
  onUpdateWall: (w: Wall) => void;
  onUpdateDoor: (d: Door) => void;
  onUpdateWindow: (win: Window) => void;
  onUpdateStair: (st: Stair) => void;
  onUpdateRoof: (rf: Roof) => void;
  onUpdateRoom: (rm: Room) => void;
  onUpdateFurniture: (f: Furniture) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onRotateSelected: (deg: number) => void;
  onToggleLayer: (layerId: string) => void;
  onAddFurniture: (f: Furniture) => void;
  onEditRoom: (r: Room) => void;
  onBatchUpdateWalls?: (updates: Partial<Wall>) => void;
  plot?: PlotBoundary;
  onUpdatePlot?: (plot: PlotBoundary) => void;
  floorsCount?: number;
  onOpenRoofModal?: () => void;
  isDrawerMode?: boolean;
  isOpenDrawer?: boolean;
  onCloseDrawer?: () => void;
  bottomSheetDetent?: 'peek' | 'half' | 'full';
  onBottomSheetDetentChange?: (detent: 'peek' | 'half' | 'full') => void;
  backgroundImage?: BackgroundImage;
  onUpdateBackgroundImage?: (bg?: BackgroundImage) => void;
  onToggleLockLayer?: (layerId: string) => void;
  onOpenUnderlayCrop?: () => void;
  onInsertUnderlayImage?: (file: File) => void;
}

export const TouchStepperInput: React.FC<{
  value: number;
  step: number;
  min?: number;
  max?: number;
  unitLabel?: string;
  onChange: (val: number) => void;
}> = ({ value, step, min = 0, max = 100, unitLabel = 'm', onChange }) => {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(min, Math.round((value - step) * 100) / 100))}
        className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center font-bold text-sm text-stone-700 dark:text-stone-200 select-none cursor-pointer"
        title={`- ${step}${unitLabel}`}
      >
        -
      </button>
      <input
        type="number"
        step={step}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || min)}
        className="w-16 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-1.5 py-0.5 text-right font-mono font-semibold text-xs"
      />
      <span className="text-stone-400 font-mono text-xs">{unitLabel}</span>
      <button
        onClick={() => onChange(Math.min(max, Math.round((value + step) * 100) / 100))}
        className="w-7 h-7 rounded-md bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 flex items-center justify-center font-bold text-sm text-stone-700 dark:text-stone-200 select-none cursor-pointer"
        title={`+ ${step}${unitLabel}`}
      >
        +
      </button>
    </div>
  );
};

export const CadInspector: React.FC<CadInspectorProps> = ({
  selection,
  walls,
  doors,
  windows,
  stairs,
  roofs,
  rooms,
  furniture,
  layers,
  unit,
  language,
  onUpdateWall,
  onUpdateDoor,
  onUpdateWindow,
  onUpdateStair,
  onUpdateRoof,
  onUpdateRoom,
  onUpdateFurniture,
  onDeleteSelected,
  onDuplicateSelected,
  onRotateSelected,
  onToggleLayer,
  onAddFurniture,
  onEditRoom,
  onBatchUpdateWalls,
  plot,
  onUpdatePlot,
  floorsCount = 1,
  onOpenRoofModal,
  isDrawerMode = false,
  isOpenDrawer = true,
  onCloseDrawer,
  bottomSheetDetent = 'half',
  onBottomSheetDetentChange,
  backgroundImage,
  onUpdateBackgroundImage,
  onToggleLockLayer,
  onOpenUnderlayCrop,
  onInsertUnderlayImage,
}) => {
  const t = getT(language);
  const [activeTab, setActiveTab] = useState<InspectorTab>('properties');
  const [libSearch, setLibSearch] = useState('');
  const [libCategory, setLibCategory] = useState<string>('all');

  const selectedCount = selection.ids.length;
  const isMultiSelect = selectedCount > 1;

  // Selected walls for multi-selection
  const selectedWalls = useMemo(() => {
    return walls.filter((w) => selection.ids.includes(w.id));
  }, [walls, selection.ids]);

  // Single-selected items (direct ID lookup ensures robustness)
  const singleId = selection.ids.length === 1 ? selection.ids[0] : null;
  const selectedWall = !isMultiSelect && singleId ? walls.find((w) => w.id === singleId) || null : null;
  const selectedDoor = !isMultiSelect && singleId ? doors.find((d) => d.id === singleId) || null : null;
  const selectedWindow = !isMultiSelect && singleId ? windows.find((w) => w.id === singleId) || null : null;
  const selectedRoom = !isMultiSelect && singleId ? rooms.find((r) => r.id === singleId) || null : null;
  const selectedFurniture = !isMultiSelect && singleId ? furniture.find((f) => f.id === singleId) || null : null;
  const selectedRoof = !isMultiSelect
    ? (singleId ? roofs.find((r) => r.id === singleId) || null : (selection.type === 'roof' ? roofs[0] || null : null))
    : (selection.type === 'roof' ? roofs[0] || null : null);

  // Filtered library items
  const filteredCatalog = FURNITURE_CATALOG.filter((item) => {
    const matchesCat = libCategory === 'all' || item.category === libCategory;
    const matchesSearch = libSearch.trim() === '' || item.name.toLowerCase().includes(libSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Calculate plot stats
  const plotStats = useMemo(() => {
    if (!plot) return null;
    return calculatePlotMetrics(plot, walls, floorsCount);
  }, [plot, walls, floorsCount]);

  // Find matching opposite parallel wall for height synchronization
  const matchingOppositeWall = useMemo<{ wall: Wall; isOppositeDir: boolean; dist: number } | null>(() => {
    if (!selectedWall) return null;
    const dx1 = selectedWall.end.x - selectedWall.start.x;
    const dy1 = selectedWall.end.y - selectedWall.start.y;
    const len1 = Math.hypot(dx1, dy1) || 1;
    const ux1 = dx1 / len1;
    const uy1 = dy1 / len1;

    let best: { wall: Wall; isOppositeDir: boolean; dist: number } | null = null;
    let minD = Infinity;

    walls.forEach((other) => {
      if (other.id === selectedWall.id) return;
      const dx2 = other.end.x - other.start.x;
      const dy2 = other.end.y - other.start.y;
      const len2 = Math.hypot(dx2, dy2) || 1;
      const ux2 = dx2 / len2;
      const uy2 = dy2 / len2;

      const dot = ux1 * ux2 + uy1 * uy2;
      if (Math.abs(Math.abs(dot) - 1) < 0.08) {
        const mid1 = { x: (selectedWall.start.x + selectedWall.end.x) / 2, y: (selectedWall.start.y + selectedWall.end.y) / 2 };
        const mid2 = { x: (other.start.x + other.end.x) / 2, y: (other.start.y + other.end.y) / 2 };
        const dist = Math.hypot(mid1.x - mid2.x, mid1.y - mid2.y);
        if (dist > 0.4 && dist < minD) {
          minD = dist;
          best = { wall: other, isOppositeDir: dot < 0, dist };
        }
      }
    });
    return best;
  }, [selectedWall, walls]);

  const handleAdaptWallToOpposite = () => {
    if (!selectedWall || !matchingOppositeWall) return;
    const opp = matchingOppositeWall.wall;
    const h1 = opp.height ?? 2.50;
    const h2 = opp.endHeight ?? h1;
    onUpdateWall({
      ...selectedWall,
      height: matchingOppositeWall.isOppositeDir ? h2 : h1,
      endHeight: matchingOppositeWall.isOppositeDir ? h1 : h2,
    });
  };

  const handleSwapSelectedWallHeights = () => {
    if (!selectedWall) return;
    const currentH1 = selectedWall.height || 2.50;
    const currentH2 = selectedWall.endHeight ?? currentH1;
    onUpdateWall({
      ...selectedWall,
      height: currentH2,
      endHeight: currentH1,
    });
  };

  if (isDrawerMode && !isOpenDrawer) return null;

  return (
    <aside
      className={
        isDrawerMode
          ? `fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shadow-2xl rounded-t-2xl flex flex-col select-none transition-all duration-200 safe-bottom overflow-hidden text-stone-800 dark:text-stone-200 ${
              bottomSheetDetent === 'peek'
                ? 'h-24'
                : bottomSheetDetent === 'half'
                ? 'h-[48vh]'
                : 'h-[85vh]'
            }`
          : 'w-76 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col z-20 shrink-0 select-none overflow-hidden shadow-sm text-stone-800 dark:text-stone-200'
      }
    >
      {/* Tablet Bottom Sheet Header with Detent Pills */}
      {isDrawerMode && (
        <div className="flex items-center justify-between px-4 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-850 shrink-0 select-none">
          <div
            className="w-12 h-1.5 bg-stone-300 dark:bg-stone-600 rounded-full mx-auto cursor-pointer"
            onClick={() => {
              const next = bottomSheetDetent === 'peek' ? 'half' : bottomSheetDetent === 'half' ? 'full' : 'peek';
              onBottomSheetDetentChange?.(next);
            }}
          />
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onBottomSheetDetentChange?.('peek')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                bottomSheetDetent === 'peek' ? 'bg-amber-500 text-white' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Klein
            </button>
            <button
              onClick={() => onBottomSheetDetentChange?.('half')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                bottomSheetDetent === 'half' ? 'bg-amber-500 text-white' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Halb
            </button>
            <button
              onClick={() => onBottomSheetDetentChange?.('full')}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                bottomSheetDetent === 'full' ? 'bg-amber-500 text-white' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              Voll
            </button>
            {onCloseDrawer && (
              <button
                onClick={onCloseDrawer}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 font-bold ml-1 cursor-pointer"
                title="Schließen"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* 4 Tabs Header */}
      <div className="flex border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 p-1">
        <button
          onClick={() => setActiveTab('properties')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'properties'
              ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Eigenschaften</span>
        </button>

        <button
          onClick={() => setActiveTab('library')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
          }`}
        >
          <Armchair className="w-3.5 h-3.5" />
          <span>Bibliothek</span>
        </button>

        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'layers'
              ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Ebenen</span>
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1 transition-all cursor-pointer ${
            activeTab === 'rooms'
              ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm'
              : 'text-stone-500 hover:text-stone-800 dark:hover:text-white'
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Räume</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
        {/* ================= TAB 1: EIGENSCHAFTEN ================= */}
        {activeTab === 'properties' && (
          <>
            {/* MULTI-SELECTION BATCH EDITING */}
            {isMultiSelect && (
              <div className="flex flex-col gap-3">
                <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg p-3 flex flex-col gap-1">
                  <span className="font-semibold text-amber-800 dark:text-amber-300">
                    Mehrfachauswahl ({selectedCount} Objekte)
                  </span>
                  <span className="text-[11px] text-stone-500 dark:text-stone-400">
                    {selectedWalls.length > 0
                      ? `${selectedWalls.length} Wände ausgewählt – Stärke und Höhe gemeinsam ändern`
                      : 'Gemeinsam verschieben, drehen, duplizieren oder löschen.'}
                  </span>
                </div>

                {/* Batch Actions: Duplicate, Rotate, Delete */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={onDuplicateSelected}
                    className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg flex flex-col items-center gap-1 font-medium text-stone-700 dark:text-stone-200 cursor-pointer"
                  >
                    <Copy className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Duplizieren</span>
                  </button>

                  <button
                    onClick={() => onRotateSelected(90)}
                    className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg flex flex-col items-center gap-1 font-medium text-stone-700 dark:text-stone-200 cursor-pointer"
                  >
                    <RotateCw className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>90° Drehen</span>
                  </button>

                  <button
                    onClick={onDeleteSelected}
                    className="p-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg flex flex-col items-center gap-1 font-medium text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Löschen</span>
                  </button>
                </div>

                {/* Batch Wall Property Controls */}
                {selectedWalls.length > 0 && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-stone-200 dark:border-stone-800">
                    <span className="font-semibold text-stone-800 dark:text-white">
                      Gemeinsame Wand-Eigenschaften ({selectedWalls.length} Wände)
                    </span>

                    {/* Quick Wall Thickness Presets */}
                    <div>
                      <span className="text-stone-500 text-[11px]">Wandstärke für alle {selectedWalls.length} Wände:</span>
                      <div className="grid grid-cols-2 gap-1.5 mt-1">
                        <button
                          onClick={() => onBatchUpdateWalls && onBatchUpdateWalls({ thickness: 0.30, isExterior: true })}
                          className="py-1 px-2 rounded bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 font-medium text-center border border-stone-200 dark:border-stone-700 cursor-pointer"
                        >
                          Außen (30 cm)
                        </button>
                        <button
                          onClick={() => onBatchUpdateWalls && onBatchUpdateWalls({ thickness: 0.24, isExterior: true })}
                          className="py-1 px-2 rounded bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 font-medium text-center border border-stone-200 dark:border-stone-700 cursor-pointer"
                        >
                          Außen (24 cm)
                        </button>
                        <button
                          onClick={() => onBatchUpdateWalls && onBatchUpdateWalls({ thickness: 0.175, isExterior: false })}
                          className="py-1 px-2 rounded bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 font-medium text-center border border-stone-200 dark:border-stone-700 cursor-pointer"
                        >
                          Tragend (17,5 cm)
                        </button>
                        <button
                          onClick={() => onBatchUpdateWalls && onBatchUpdateWalls({ thickness: 0.115, isExterior: false })}
                          className="py-1 px-2 rounded bg-stone-100 dark:bg-stone-800 hover:bg-amber-50 dark:hover:bg-amber-950 hover:text-amber-600 font-medium text-center border border-stone-200 dark:border-stone-700 cursor-pointer"
                        >
                          Innen (11,5 cm)
                        </button>
                      </div>
                    </div>

                    {/* Wall Start and End Heights for all selected walls */}
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Anfangshöhe (Start):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            placeholder="2.50"
                            defaultValue={selectedWalls[0]?.height || 2.50}
                            onChange={(e) => {
                              const h = parseFloat(e.target.value);
                              if (!isNaN(h) && h > 0 && onBatchUpdateWalls) {
                                onBatchUpdateWalls({ height: h });
                              }
                            }}
                            className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                          />
                          <span className="text-stone-400 font-mono">m</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-stone-500">Endhöhe (Ende):</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.05"
                            placeholder="2.50"
                            defaultValue={selectedWalls[0]?.endHeight ?? selectedWalls[0]?.height ?? 2.50}
                            onChange={(e) => {
                              const h = parseFloat(e.target.value);
                              if (!isNaN(h) && h > 0 && onBatchUpdateWalls) {
                                onBatchUpdateWalls({ endHeight: h });
                              }
                            }}
                            className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                          />
                          <span className="text-stone-400 font-mono">m</span>
                        </div>
                      </div>
                    </div>

                    {/* Material for all */}
                    <div className="flex flex-col gap-1">
                      <span className="text-stone-500">Material für alle:</span>
                      <select
                        onChange={(e) => onBatchUpdateWalls && onBatchUpdateWalls({ material: e.target.value as WallMaterial })}
                        className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-1 outline-none font-medium"
                      >
                        <option value="timber">Holzständerbauweise (Holz)</option>
                        <option value="brick">Ziegelmauerwerk</option>
                        <option value="concrete">Stahlbeton</option>
                        <option value="drywall">Trockenbau</option>
                        <option value="log">Massivholz / Blockbohle</option>
                        <option value="glass">Glaswand</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SINGLE: WALL PROPERTIES */}
            {selectedWall && (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                  <span>Wand</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800">
                    {selectedWall.isExterior ? 'Außenwand' : 'Innenwand'}
                  </span>
                </div>

                {/* Wall Type switcher */}
                <div className="grid grid-cols-2 gap-1 bg-stone-100 dark:bg-stone-800 p-1 rounded-lg">
                  <button
                    onClick={() => onUpdateWall({ ...selectedWall, isExterior: true, thickness: 0.30 })}
                    className={`py-1 rounded text-center font-medium transition-colors cursor-pointer ${
                      selectedWall.isExterior ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm font-semibold' : 'text-stone-500'
                    }`}
                  >
                    Außen (30 cm)
                  </button>
                  <button
                    onClick={() => onUpdateWall({ ...selectedWall, isExterior: false, thickness: 0.115 })}
                    className={`py-1 rounded text-center font-medium transition-colors cursor-pointer ${
                      !selectedWall.isExterior ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm font-semibold' : 'text-stone-500'
                    }`}
                  >
                    Innen (11,5 cm)
                  </button>
                </div>

                {/* Quick Thickness Presets */}
                <div>
                  <span className="text-stone-500 text-[11px]">Wandstärke-Schnellwahl:</span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {[
                      { label: '11,5 cm', val: 0.115, ext: false },
                      { label: '17,5 cm', val: 0.175, ext: false },
                      { label: '24,0 cm', val: 0.24, ext: true },
                      { label: '30,0 cm', val: 0.30, ext: true },
                      { label: '36,5 cm', val: 0.365, ext: true },
                      { label: '40,0 cm', val: 0.40, ext: true },
                    ].map((pre) => (
                      <button
                        key={pre.label}
                        onClick={() => onUpdateWall({ ...selectedWall, thickness: pre.val, isExterior: pre.ext })}
                        className={`py-1 px-1 rounded text-[11px] font-medium border text-center transition-colors cursor-pointer ${
                          Math.abs(selectedWall.thickness - pre.val) < 0.005
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                        }`}
                      >
                        {pre.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Wall Length */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Länge:</span>
                  <span className="font-mono font-bold text-stone-900 dark:text-white">
                    {formatDimension(distance(selectedWall.start, selectedWall.end), unit, 2)}
                  </span>
                </div>

                {/* Wall Thickness Custom Input with Touch Stepper */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Individuelle Stärke:</span>
                  <TouchStepperInput
                    value={selectedWall.thickness}
                    step={0.01}
                    min={0.05}
                    max={1.0}
                    unitLabel="m"
                    onChange={(val) => onUpdateWall({ ...selectedWall, thickness: val })}
                  />
                </div>

                {/* Frei wählbare Wandhöhen: Anfangshöhe & Endhöhe */}
                <div className="bg-stone-50 dark:bg-stone-800/60 p-2.5 rounded-lg border border-stone-200 dark:border-stone-700 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800 dark:text-stone-200 text-[11px]">Wandhöhe (licht)</span>
                    {selectedWall.endHeight && Math.abs(selectedWall.endHeight - selectedWall.height) > 0.02 && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold font-mono">
                        ↗ {selectedWall.endHeight > selectedWall.height ? '+' : ''}{(selectedWall.endHeight - selectedWall.height).toFixed(2)}m Steigung
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Start (Anfang):</span>
                    <TouchStepperInput
                      value={selectedWall.height || 2.50}
                      step={0.05}
                      min={1.0}
                      max={8.0}
                      unitLabel="m"
                      onChange={(val) => onUpdateWall({ ...selectedWall, height: val })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Ende (Endhöhe):</span>
                    <TouchStepperInput
                      value={selectedWall.endHeight ?? selectedWall.height ?? 2.50}
                      step={0.05}
                      min={1.0}
                      max={8.0}
                      unitLabel="m"
                      onChange={(val) => onUpdateWall({ ...selectedWall, endHeight: val })}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 pt-1.5 border-t border-stone-200 dark:border-stone-700">
                    {/* Quick horizontal / slope toggles */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateWall({ ...selectedWall, endHeight: selectedWall.height })}
                        className="flex-1 py-1 text-[10px] bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 rounded text-stone-700 dark:text-stone-200 cursor-pointer font-medium"
                      >
                        Waagerecht (gerade)
                      </button>
                      <button
                        onClick={handleSwapSelectedWallHeights}
                        title="Start- und Endhöhe umkehren (Richtung tauschen)"
                        className="px-2 py-1 text-[10px] bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 rounded text-stone-700 dark:text-stone-200 cursor-pointer font-medium"
                      >
                        ⇄ Umkehren
                      </button>
                    </div>

                    {/* Presets: 2,50m -> 4,50m (user's exact example) */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onUpdateWall({ ...selectedWall, height: 2.50, endHeight: 4.50 })}
                        className="flex-1 py-1 text-[10px] bg-amber-100 dark:bg-amber-950/80 hover:bg-amber-200 dark:hover:bg-amber-900/80 text-amber-900 dark:text-amber-300 rounded font-semibold border border-amber-300 dark:border-amber-800 cursor-pointer"
                      >
                        2,50m → 4,50m (Pultwand)
                      </button>
                      <button
                        onClick={() => onUpdateWall({ ...selectedWall, height: 2.50, endHeight: 3.50 })}
                        className="flex-1 py-1 text-[10px] bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-300 rounded cursor-pointer"
                      >
                        2,50m → 3,50m
                      </button>
                    </div>

                    {/* Magnetische Anpassung an gegenüberliegende Wand */}
                    {matchingOppositeWall && (
                      <button
                        onClick={handleAdaptWallToOpposite}
                        title={`Höhen der gegenüberliegenden Wand (${(matchingOppositeWall.wall.height || 2.5).toFixed(2)}m → ${(matchingOppositeWall.wall.endHeight ?? matchingOppositeWall.wall.height ?? 2.5).toFixed(2)}m) übernehmen`}
                        className="w-full py-1.5 px-2 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-400 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 rounded-lg text-[10px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs text-center"
                      >
                        <span>📐</span>
                        <span>An Wand gegenüber anpassen ({(matchingOppositeWall.wall.height || 2.5).toFixed(2)}m → {(matchingOppositeWall.wall.endHeight ?? matchingOppositeWall.wall.height ?? 2.5).toFixed(2)}m)</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Material */}
                <div className="flex flex-col gap-1">
                  <span className="text-stone-500">Material / Aufbau:</span>
                  <select
                    value={selectedWall.material}
                    onChange={(e) => onUpdateWall({ ...selectedWall, material: e.target.value as WallMaterial })}
                    className="bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-1 outline-none font-medium"
                  >
                    <option value="timber">Holzständerbauweise (Holz)</option>
                    <option value="brick">Ziegelmauerwerk</option>
                    <option value="concrete">Stahlbeton</option>
                    <option value="drywall">Trockenbau</option>
                    <option value="log">Massivholz / Blockbohle</option>
                    <option value="glass">Glaswand</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={onDuplicateSelected}
                    className="flex-1 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg flex items-center justify-center gap-1 font-medium cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Duplizieren</span>
                  </button>
                  <button
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SINGLE: DOOR PROPERTIES */}
            {selectedDoor && (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                  <span>Tür</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                    {selectedDoor.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-500 text-[11px]">Breite:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedDoor.width}
                        onChange={(e) => onUpdateDoor({ ...selectedDoor, width: parseFloat(e.target.value) || 0.885 })}
                        className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-stone-400 font-mono">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[11px]">Höhe:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedDoor.height}
                        onChange={(e) => onUpdateDoor({ ...selectedDoor, height: parseFloat(e.target.value) || 2.05 })}
                        className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-stone-400 font-mono">m</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-[11px]">Sturzhöhe (STH):</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      value={selectedDoor.lintelHeight || selectedDoor.height}
                      onChange={(e) => onUpdateDoor({ ...selectedDoor, lintelHeight: parseFloat(e.target.value) || 2.05 })}
                      className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono"
                    />
                    <span className="text-stone-400 font-mono">m</span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 pt-1">
                  <span className="text-stone-500 text-[11px]">Aufschlag & Richtung:</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        onUpdateDoor({
                          ...selectedDoor,
                          swingDirection: selectedDoor.swingDirection === 'left' ? 'right' : 'left',
                        })
                      }
                      className="flex-1 py-1.5 px-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg flex items-center justify-center gap-1 font-medium cursor-pointer"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{selectedDoor.swingDirection === 'left' ? 'DIN Links' : 'DIN Rechts'}</span>
                    </button>

                    <button
                      onClick={() =>
                        onUpdateDoor({
                          ...selectedDoor,
                          openDirection: selectedDoor.openDirection === 'inside' ? 'outside' : 'inside',
                        })
                      }
                      className="flex-1 py-1.5 px-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg flex items-center justify-center gap-1 font-medium cursor-pointer"
                    >
                      <FlipVertical className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>{selectedDoor.openDirection === 'inside' ? 'Innen' : 'Außen'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SINGLE: WINDOW PROPERTIES */}
            {selectedWindow && (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                  <span>Fenster</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold">
                    {selectedWindow.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[11px]">Breite:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedWindow.width}
                        onChange={(e) => onUpdateWindow({ ...selectedWindow, width: parseFloat(e.target.value) || 1.0 })}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-slate-400 font-mono">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Höhe:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedWindow.height}
                        onChange={(e) => onUpdateWindow({ ...selectedWindow, height: parseFloat(e.target.value) || 1.25 })}
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-slate-400 font-mono">m</span>
                    </div>
                  </div>
                </div>

                {/* Parapet & Lintel */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500 text-[11px]">Brüstung (BRH):</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedWindow.parapetHeight}
                        onChange={(e) =>
                          onUpdateWindow({ ...selectedWindow, parapetHeight: parseFloat(e.target.value) || 0.9 })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-slate-400 font-mono">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px]">Sturzhöhe (STH):</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedWindow.lintelHeight || (selectedWindow.parapetHeight + selectedWindow.height)}
                        onChange={(e) =>
                          onUpdateWindow({ ...selectedWindow, lintelHeight: parseFloat(e.target.value) || 2.15 })
                        }
                        className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                      />
                      <span className="text-slate-400 font-mono">m</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SINGLE: ROOM PROPERTIES */}
            {selectedRoom && (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                  <span>Raum</span>
                  <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                    {selectedRoom.areaM2.toFixed(1)} m²
                  </span>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px]">Raumbezeichnung:</span>
                  <input
                    type="text"
                    value={selectedRoom.name}
                    onChange={(e) => onUpdateRoom({ ...selectedRoom, name: e.target.value })}
                    className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-1 font-medium mt-0.5"
                  />
                </div>

                {/* Frei wählbare Raumhöhe */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Lichte Raumhöhe:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      min="1.8"
                      max="6.0"
                      value={selectedRoom.height || 2.50}
                      onChange={(e) => onUpdateRoom({ ...selectedRoom, height: parseFloat(e.target.value) || 2.5 })}
                      className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                    />
                    <span className="text-stone-400 font-mono">m</span>
                  </div>
                </div>

                <div>
                  <span className="text-stone-500 text-[11px]">Bodenbelag:</span>
                  <select
                    value={selectedRoom.floorFinish}
                    onChange={(e) => onUpdateRoom({ ...selectedRoom, floorFinish: e.target.value as any })}
                    className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-1 font-medium mt-0.5 outline-none"
                  >
                    <option value="parquet">Parkett / Holzdielen</option>
                    <option value="tiles">Fliesen / Keramik</option>
                    <option value="laminate">Laminat</option>
                    <option value="carpet">Teppichboden</option>
                    <option value="concrete">Sichtestrich / Beton</option>
                    <option value="terrace_stone">Terrassenbelag Naturstein</option>
                  </select>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SINGLE: FURNITURE PROPERTIES */}
            {selectedFurniture && (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="flex items-center gap-1.5">
                    <Armchair className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>{selectedFurniture.name}</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800 capitalize">
                    {selectedFurniture.category}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-stone-500 text-[11px]">Breite:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedFurniture.width}
                        onChange={(e) => onUpdateFurniture({ ...selectedFurniture, width: parseFloat(e.target.value) || 0.5 })}
                        className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-stone-400 font-mono">m</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-stone-500 text-[11px]">Tiefe:</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <input
                        type="number"
                        step="0.05"
                        value={selectedFurniture.depth}
                        onChange={(e) => onUpdateFurniture({ ...selectedFurniture, depth: parseFloat(e.target.value) || 0.5 })}
                        className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono"
                      />
                      <span className="text-stone-400 font-mono">m</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-[11px]">Drehung:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="15"
                      value={selectedFurniture.rotation}
                      onChange={(e) => onUpdateFurniture({ ...selectedFurniture, rotation: (parseInt(e.target.value, 10) || 0) % 360 })}
                      className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono"
                    />
                    <span className="text-stone-400 font-mono">°</span>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600 dark:text-red-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* SINGLE: ROOF PROPERTIES */}
            {selectedRoof && (
              <div className="flex flex-col gap-3">
                <div className="font-semibold text-stone-900 dark:text-white flex items-center justify-between pb-1 border-b border-stone-200 dark:border-stone-800">
                  <span className="flex items-center gap-1.5">
                    <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Dach</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800 capitalize">
                    {selectedRoof.type}
                  </span>
                </div>

                {/* Roof Type Quick Switcher */}
                <div>
                  <span className="text-stone-500 text-[11px]">Dachform:</span>
                  <select
                    value={selectedRoof.type}
                    onChange={(e) => onUpdateRoof({ ...selectedRoof, type: e.target.value as any })}
                    className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-1 font-medium mt-0.5 outline-none"
                  >
                    <option value="gable">Satteldach</option>
                    <option value="shed">Pultdach</option>
                    <option value="hip">Walmdach</option>
                    <option value="flat">Flachdach (Attika)</option>
                    <option value="mansard">Zeltdach</option>
                  </select>
                </div>

                {/* Pitch Slider */}
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-stone-500 text-[11px]">Dachneigung (Winkel):</span>
                    <span className="font-mono font-bold text-stone-900 dark:text-white">{selectedRoof.pitchDegrees}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    step="1"
                    value={selectedRoof.pitchDegrees}
                    onChange={(e) => onUpdateRoof({ ...selectedRoof, pitchDegrees: parseInt(e.target.value, 10) || 0 })}
                    className="w-full accent-amber-600"
                  />
                </div>

                {/* Overhang */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-[11px]">Dachüberstand:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1.5"
                      value={selectedRoof.overhang}
                      onChange={(e) => onUpdateRoof({ ...selectedRoof, overhang: parseFloat(e.target.value) || 0 })}
                      className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                    />
                    <span className="text-stone-400 font-mono">m</span>
                  </div>
                </div>

                {/* Base Height (Traufhöhe / Kniestock) */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500 text-[11px]">Traufhöhe / Kniestock:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="6.0"
                      value={selectedRoof.baseHeight ?? 2.80}
                      onChange={(e) => onUpdateRoof({ ...selectedRoof, baseHeight: parseFloat(e.target.value) || 2.80 })}
                      className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                    />
                    <span className="text-stone-400 font-mono">m</span>
                  </div>
                </div>

                {/* Material */}
                <div>
                  <span className="text-stone-500 text-[11px]">Dacheindeckung:</span>
                  <select
                    value={selectedRoof.material || 'tiles_red'}
                    onChange={(e) => onUpdateRoof({ ...selectedRoof, material: e.target.value as any })}
                    className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-1 font-medium mt-0.5 outline-none"
                  >
                    <option value="tiles_red">Dachziegel Rot</option>
                    <option value="tiles_anthracite">Dachziegel Anthrazit</option>
                    <option value="slate">Schiefer Natur</option>
                    <option value="metal_sheet">Stehfalzblech Zink</option>
                    <option value="green_roof">Gründach extensiv</option>
                  </select>
                </div>

                {/* Chimney Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-stone-500 text-[11px]">Schornstein / Kamin:</span>
                  <input
                    type="checkbox"
                    checked={selectedRoof.hasChimney}
                    onChange={(e) => onUpdateRoof({ ...selectedRoof, hasChimney: e.target.checked })}
                    className="rounded text-amber-600 accent-amber-600"
                  />
                </div>

                {/* Full Modal button */}
                {onOpenRoofModal && (
                  <button
                    onClick={onOpenRoofModal}
                    className="w-full py-2 px-3 mt-1 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm text-xs"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Im Dach-Modul bearbeiten</span>
                  </button>
                )}

                <div className="flex justify-end pt-1">
                  <button
                    onClick={onDeleteSelected}
                    className="p-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900 rounded-lg text-red-600 dark:text-red-400 cursor-pointer flex items-center gap-1"
                    title="Dach entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Dach entfernen</span>
                  </button>
                </div>
              </div>
            )}

            {/* EMPTY STATE: PLOT (GRUNDSTÜCK), ROOF & PLAN OVERVIEW */}
            {!selectedWall && !selectedDoor && !selectedWindow && !selectedRoom && !selectedFurniture && !selectedRoof && !isMultiSelect && (
              <div className="flex flex-col gap-3">
                {/* 1. Grundstück & Baugrenzen Einstellungen */}
                {plot && (
                  <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700/60 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        <span>Grundstück & Baurecht</span>
                      </span>
                      <label className="flex items-center gap-1 text-[11px] text-stone-500 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={plot.enabled}
                          onChange={(e) => onUpdatePlot && onUpdatePlot({ ...plot, enabled: e.target.checked })}
                          className="rounded text-amber-600"
                        />
                        <span>Aktiv</span>
                      </label>
                    </div>

                    {plot.enabled && (
                      <div className="flex flex-col gap-2 pt-1 border-t border-stone-200 dark:border-stone-700/60">
                        {/* Custom Polygon Points Status if drawn */}
                        {plot.points && plot.points.length >= 3 && (
                          <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center justify-between">
                            <span>Freies Grundstück: {plot.points.length} Grenzpunkte</span>
                            <button
                              onClick={() => {
                                if (onUpdatePlot) {
                                  onUpdatePlot({
                                    ...plot,
                                    points: undefined,
                                    width: 20.0,
                                    depth: 30.0,
                                  });
                                }
                              }}
                              className="px-1.5 py-0.5 rounded bg-white dark:bg-stone-900 text-[10px] font-semibold text-stone-700 dark:text-stone-300 hover:text-amber-600 cursor-pointer"
                            >
                              Als Rechteck
                            </button>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-stone-500 text-[10px]">Breite:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                value={plot.width}
                                onChange={(e) => onUpdatePlot && onUpdatePlot({ ...plot, width: parseFloat(e.target.value) || 20 })}
                                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-1.5 py-0.5 text-right font-mono"
                              />
                              <span className="text-stone-400">m</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-stone-500 text-[10px]">Tiefe:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                value={plot.depth}
                                onChange={(e) => onUpdatePlot && onUpdatePlot({ ...plot, depth: parseFloat(e.target.value) || 25 })}
                                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-1.5 py-0.5 text-right font-mono"
                              />
                              <span className="text-stone-400">m</span>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-stone-500 text-[10px]">Grenzabstand:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.5"
                                value={plot.setback}
                                onChange={(e) => onUpdatePlot && onUpdatePlot({ ...plot, setback: parseFloat(e.target.value) || 3 })}
                                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-1.5 py-0.5 text-right font-mono"
                              />
                              <span className="text-stone-400">m</span>
                            </div>
                          </div>
                          <div>
                            <span className="text-stone-500 text-[10px]">Sockelhöhe:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.05"
                                value={plot.groundElevation ?? 0.30}
                                onChange={(e) => onUpdatePlot && onUpdatePlot({ ...plot, groundElevation: parseFloat(e.target.value) || 0.3 })}
                                className="w-full bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-1.5 py-0.5 text-right font-mono"
                              />
                              <span className="text-stone-400">m</span>
                            </div>
                          </div>
                        </div>

                        {/* GRZ / GFZ Evaluation */}
                        {plotStats && (
                          <div className="bg-white dark:bg-stone-900 p-2 rounded-lg border border-stone-200 dark:border-stone-700 flex flex-col gap-1 text-[11px] font-mono mt-1">
                            <div className="flex justify-between items-center">
                              <span>Grundstück:</span>
                              <span className="font-bold">{plotStats.plotArea} m²</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>Grundfläche (Haus):</span>
                              <span className="font-bold text-amber-600 dark:text-amber-400">{plotStats.footprintArea} m²</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 border-t border-stone-100 dark:border-stone-800">
                              <span>GRZ (Ist / Max):</span>
                              <span className={`font-bold ${plotStats.isGrzValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {plotStats.actualGRZ} / {plot.maxGRZ} {plotStats.isGrzValid ? '✓ Zulässig' : '✗ Zu hoch'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span>GFZ (Ist / Max):</span>
                              <span className={`font-bold ${plotStats.isGfzValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                                {plotStats.actualGFZ} / {plot.maxGFZ} {plotStats.isGfzValid ? '✓ Zulässig' : '✗ Zu hoch'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Remove / Delete Plot Button */}
                        <button
                          onClick={() => {
                            if (onUpdatePlot) {
                              onUpdatePlot({
                                ...plot,
                                enabled: false,
                                points: undefined,
                              });
                            }
                          }}
                          className="w-full mt-2 py-1.5 px-3 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-semibold text-xs border border-red-200 dark:border-red-900/60 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Grundstück entfernen (Quadrat löschen)</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Plan Stats Overview */}
                <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700/60 flex flex-col gap-2">
                  <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    <span>Plan-Übersicht</span>
                  </span>
                  <div className="flex flex-col gap-1 text-[11px] text-stone-600 dark:text-stone-400 font-mono">
                    <div className="flex justify-between">
                      <span>Wände gesamt:</span>
                      <span className="font-bold text-stone-900 dark:text-white">{walls.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Türen & Fenster:</span>
                      <span className="font-bold text-stone-900 dark:text-white">{doors.length + windows.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Räume & Zonen:</span>
                      <span className="font-bold text-stone-900 dark:text-white">{rooms.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Möbelstücke:</span>
                      <span className="font-bold text-stone-900 dark:text-white">{furniture.length}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Dach & Bedachung Modul */}
                <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-xl border border-stone-200 dark:border-stone-700/60 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                      <Home className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      <span>Dach & Bedachung</span>
                    </span>
                    {roofs.length > 0 ? (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-semibold">
                        Aktiv ({roofs[0].type})
                      </span>
                    ) : (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400">
                        Kein Dach
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-600 dark:text-stone-400">
                    {roofs.length > 0
                      ? `Neigung: ${roofs[0].pitchDegrees}°, Überstand: ${(roofs[0].overhang || 0.4).toFixed(2)}m, Material: ${roofs[0].material || 'tiles_red'}`
                      : 'Erstelle ein passgenaues Sattel-, Pult-, Walm-, Flach- oder Zeltdach direkt auf die Außenwände deines Hauses.'}
                  </p>
                  {onOpenRoofModal && (
                    <button
                      onClick={onOpenRoofModal}
                      className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-stone-950 font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer text-xs shadow-sm"
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>{roofs.length > 0 ? 'Dach im Dach-Modul bearbeiten' : 'Neues Dach aufsetzen'}</span>
                    </button>
                  )}
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-stone-700 dark:text-stone-300 leading-relaxed">
                  <strong className="text-amber-800 dark:text-amber-300">Tipp zur Mehrfachauswahl:</strong>
                  <br />
                  Ziehe auf freier Fläche einen Auswahlrahmen auf. Von links nach rechts (blau) wählt umschlossene Objekte; von rechts nach links (grün gestrichelt) wählt alle berührten Objekte!
                </div>
              </div>
            )}
          </>
        )}

        {/* ================= TAB 2: BIBLIOTHEK ================= */}
        {activeTab === 'library' && (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Möbel suchen..."
                value={libSearch}
                onChange={(e) => setLibSearch(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs outline-none"
              />
            </div>

            <div className="flex flex-col gap-2 max-h-[68vh] overflow-y-auto pr-1">
              {filteredCatalog.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onAddFurniture({
                      id: 'furn_' + Date.now(),
                      name: item.name,
                      category: item.category,
                      type: item.id,
                      x: 6.0,
                      y: 4.5,
                      width: item.width,
                      depth: item.depth,
                      height: item.height,
                      rotation: 0,
                      iconType: item.iconType,
                    });
                  }}
                  className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 hover:border-amber-500 bg-white dark:bg-stone-850 cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div>
                    <div className="font-semibold text-stone-800 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-stone-400 font-mono mt-0.5">
                      {(item.width * 100).toFixed(0)} × {(item.depth * 100).toFixed(0)} cm
                    </div>
                  </div>
                  <button className="p-1 rounded bg-stone-100 dark:bg-stone-800 group-hover:bg-amber-600 group-hover:text-white text-stone-600 dark:text-stone-300 transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================= TAB 3: EBENEN ================= */}
        {activeTab === 'layers' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-stone-800 dark:text-white text-xs">Zeichenebenen</span>
                <span className="text-[10px] text-stone-400 font-mono">{layers.length} Ebenen</span>
              </div>

              <div className="flex flex-col gap-1 border border-stone-200 dark:border-stone-800 rounded-lg p-1 bg-stone-50 dark:bg-stone-850">
                {layers.map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-xs ${
                      l.id === 'underlay'
                        ? 'bg-amber-500/10 border border-amber-500/30 font-medium'
                        : 'hover:bg-stone-200/60 dark:hover:bg-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {l.id === 'underlay' ? (
                        <ImageIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : (
                        <Layers className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      )}
                      <span className="text-stone-700 dark:text-stone-200 truncate">{l.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Lock Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLockLayer?.(l.id);
                        }}
                        className={`p-1 rounded hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors ${
                          l.locked ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-stone-400'
                        }`}
                        title={l.locked ? 'Ebene entsperren' : 'Ebene sperren'}
                      >
                        {l.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                      </button>

                      {/* Visibility Toggle */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleLayer(l.id);
                        }}
                        className="p-1 rounded hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
                        title={l.visible ? 'Ebene ausblenden' : 'Ebene einblenden'}
                      >
                        {l.visible ? (
                          <Eye className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5 text-stone-400" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION: PLAN-VORLAGE (HINTERGRUND) KONTROLLEN */}
            {backgroundImage && backgroundImage.url ? (
              <div className="flex flex-col gap-3 p-3 bg-white dark:bg-stone-900 border border-amber-500/30 rounded-xl shadow-xs">
                {/* Header with lock status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-stone-800 dark:text-white">Plan-Vorlage</div>
                      <div className="text-[10px] text-stone-400">Hintergrundbild zum Nachzeichnen</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (onUpdateBackgroundImage) {
                        onUpdateBackgroundImage({
                          ...backgroundImage,
                          locked: !backgroundImage.locked,
                        });
                      }
                      if (onToggleLockLayer) {
                        onToggleLockLayer('underlay');
                      }
                    }}
                    className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
                      backgroundImage.locked
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
                        : 'bg-amber-500 text-white shadow-xs'
                    }`}
                    title={backgroundImage.locked ? 'Vorlage entsperren (erlaubt Verschieben & Skalieren)' : 'Vorlage sperren (fixiert Position)'}
                  >
                    {backgroundImage.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{backgroundImage.locked ? 'Gesperrt' : 'Bearbeitbar'}</span>
                  </button>
                </div>

                {/* Quick Action Buttons: Zuschneiden, 90° Drehen, Löschen */}
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <button
                    onClick={() => onOpenUnderlayCrop?.()}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-200 transition-colors"
                    title="Ausschnitt zuschneiden"
                  >
                    <Crop className="w-3.5 h-3.5 text-amber-500" />
                    <span>Zuschneiden</span>
                  </button>

                  <button
                    onClick={() => {
                      if (onUpdateBackgroundImage) {
                        const curRot = backgroundImage.rotationDeg || 0;
                        onUpdateBackgroundImage({
                          ...backgroundImage,
                          rotationDeg: (curRot + 90) % 360,
                        });
                      }
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg text-xs font-medium text-stone-700 dark:text-stone-200 transition-colors"
                    title="90° im Uhrzeigersinn drehen"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-blue-500" />
                    <span>90° Drehen</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm('Möchtest du die Plan-Vorlage entfernen?')) {
                        onUpdateBackgroundImage?.(undefined);
                      }
                    }}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 transition-colors"
                    title="Vorlage entfernen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Entfernen</span>
                  </button>
                </div>

                {/* BILD-ANPASSUNG: Kontrast & Helligkeit & Transparenz */}
                <div className="border-t border-stone-200 dark:border-stone-800 pt-2 flex flex-col gap-2.5">
                  <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Darstellung & Filter</span>

                  {/* Kontrast Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                        <Contrast className="w-3.5 h-3.5 text-amber-500" />
                        <span>Kontrast</span>
                      </span>
                      <span className="font-mono text-stone-500 font-semibold">{backgroundImage.contrast ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={220}
                      step={5}
                      value={backgroundImage.contrast ?? 100}
                      onChange={(e) => {
                        onUpdateBackgroundImage?.({
                          ...backgroundImage,
                          contrast: parseInt(e.target.value, 10),
                        });
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Helligkeit Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Helligkeit</span>
                      </span>
                      <span className="font-mono text-stone-500 font-semibold">{backgroundImage.brightness ?? 100}%</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={200}
                      step={5}
                      value={backgroundImage.brightness ?? 100}
                      onChange={(e) => {
                        onUpdateBackgroundImage?.({
                          ...backgroundImage,
                          brightness: parseInt(e.target.value, 10),
                        });
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Transparenz Slider */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1 text-stone-600 dark:text-stone-400">
                        <Eye className="w-3.5 h-3.5 text-amber-500" />
                        <span>Deckkraft</span>
                      </span>
                      <span className="font-mono text-stone-500 font-semibold">{Math.round((backgroundImage.opacity ?? 0.5) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={Math.round((backgroundImage.opacity ?? 0.5) * 100)}
                      onChange={(e) => {
                        onUpdateBackgroundImage?.({
                          ...backgroundImage,
                          opacity: parseInt(e.target.value, 10) / 100,
                        });
                      }}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none"
                    />
                  </div>

                  {/* Skizzen-Modus & Invertieren Toggles */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      onClick={() => {
                        onUpdateBackgroundImage?.({
                          ...backgroundImage,
                          sketchMode: !backgroundImage.sketchMode,
                        });
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        backgroundImage.sketchMode
                          ? 'bg-stone-800 text-white border-stone-700 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span>S/W Skizze</span>
                      {backgroundImage.sketchMode && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>

                    <button
                      onClick={() => {
                        onUpdateBackgroundImage?.({
                          ...backgroundImage,
                          inverted: !backgroundImage.inverted,
                        });
                      }}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-medium border flex items-center justify-center gap-1.5 transition-colors ${
                        backgroundImage.inverted
                          ? 'bg-stone-800 text-white border-stone-700 shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      <span>Invertieren</span>
                      {backgroundImage.inverted && <Check className="w-3 h-3 text-emerald-400" />}
                    </button>
                  </div>
                </div>

                {/* MAßE & SKALIERUNG */}
                <div className="border-t border-stone-200 dark:border-stone-800 pt-2 flex flex-col gap-2">
                  <span className="text-[11px] font-semibold text-stone-600 dark:text-stone-300">Reale Maße im Plan</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-stone-400 font-medium">Breite (m)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0.5}
                        max={100}
                        value={Math.round((backgroundImage.widthM || 10) * 100) / 100}
                        onChange={(e) => {
                          const newW = Math.max(0.5, parseFloat(e.target.value) || 10);
                          const currentW = backgroundImage.widthM || 10;
                          const currentH = backgroundImage.heightM || 8;
                          const ratio = currentH / currentW;
                          onUpdateBackgroundImage?.({
                            ...backgroundImage,
                            widthM: newW,
                            heightM: Math.round(newW * ratio * 100) / 100,
                          });
                        }}
                        className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-mono font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-stone-400 font-medium">Höhe (m)</label>
                      <input
                        type="number"
                        step={0.1}
                        min={0.5}
                        max={100}
                        value={Math.round((backgroundImage.heightM || 8) * 100) / 100}
                        onChange={(e) => {
                          const newH = Math.max(0.5, parseFloat(e.target.value) || 8);
                          const currentW = backgroundImage.widthM || 10;
                          const currentH = backgroundImage.heightM || 8;
                          const ratio = currentW / currentH;
                          onUpdateBackgroundImage?.({
                            ...backgroundImage,
                            heightM: newH,
                            widthM: Math.round(newH * ratio * 100) / 100,
                          });
                        }}
                        className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-2 py-1 text-xs font-mono font-semibold"
                      />
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-400 leading-normal bg-stone-50 dark:bg-stone-850 p-2 rounded-lg border border-stone-200 dark:border-stone-800">
                    💡 Tipp: Bei entsperrter Vorlage kannst du die Ecken direkt im 2D-Plan anfassen, oder die 2-Punkt-Kalibrierung im Plan-HUD nutzen.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2 p-3 bg-stone-50 dark:bg-stone-850 border border-dashed border-stone-300 dark:border-stone-700 rounded-xl text-center">
                <ImageIcon className="w-6 h-6 text-stone-400 mx-auto" />
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">Keine Vorlage geladen</span>
                <p className="text-[10px] text-stone-400">
                  Lade ein Bild oder Foto als Hintergrundebene, um Grundrisse präzise nachzuzeichnen.
                </p>
                <label className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors shadow-xs">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Bild als Vorlage wählen...</span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onInsertUnderlayImage) {
                        onInsertUnderlayImage(file);
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: RÄUME ================= */}
        {activeTab === 'rooms' && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-stone-800 dark:text-white text-xs">Erkannte Räume</span>
              <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-bold">
                {rooms.reduce((acc, r) => acc + r.areaM2, 0).toFixed(1)} m² Netto
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {rooms.map((r) => (
                <div
                  key={r.id}
                  onDoubleClick={() => onEditRoom(r)}
                  className="p-2.5 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between cursor-pointer hover:border-amber-500 transition-colors"
                >
                  <div>
                    <div className="font-semibold text-stone-800 dark:text-white">{r.name}</div>
                    <div className="text-[11px] text-stone-400 mt-0.5">
                      h = {(r.height || 2.5).toFixed(2)} m · {r.floorFinish}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {r.areaM2.toFixed(1)} m²
                    </div>
                    <div className="text-[10px] text-stone-400">{r.perimeterM.toFixed(1)} m Umfang</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
