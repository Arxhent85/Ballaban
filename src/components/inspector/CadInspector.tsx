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
}

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

  return (
    <aside className="w-76 border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex flex-col z-20 shrink-0 select-none overflow-hidden shadow-sm text-stone-800 dark:text-stone-200">
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

                {/* Wall Thickness Custom Input */}
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Individuelle Stärke:</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      step="0.01"
                      min="0.05"
                      max="1.0"
                      value={selectedWall.thickness}
                      onChange={(e) => onUpdateWall({ ...selectedWall, thickness: parseFloat(e.target.value) || 0.1 })}
                      className="w-18 bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                    />
                    <span className="text-stone-400 font-mono">m</span>
                  </div>
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
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="8.0"
                        value={selectedWall.height || 2.50}
                        onChange={(e) => onUpdateWall({ ...selectedWall, height: parseFloat(e.target.value) || 2.5 })}
                        className="w-18 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                      />
                      <span className="text-stone-400 font-mono">m</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-stone-500">Ende (Endhöhe):</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.05"
                        min="1.0"
                        max="8.0"
                        value={selectedWall.endHeight ?? selectedWall.height ?? 2.50}
                        onChange={(e) => onUpdateWall({ ...selectedWall, endHeight: parseFloat(e.target.value) || 2.5 })}
                        className="w-18 bg-white dark:bg-stone-900 border border-stone-300 dark:border-stone-700 rounded px-2 py-0.5 text-right font-mono font-semibold"
                      />
                      <span className="text-stone-400 font-mono">m</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pt-1 border-t border-stone-200 dark:border-stone-700">
                    <button
                      onClick={() => onUpdateWall({ ...selectedWall, endHeight: selectedWall.height })}
                      className="flex-1 py-0.5 text-[10px] bg-stone-200 dark:bg-stone-700 hover:bg-stone-300 dark:hover:bg-stone-600 rounded text-stone-700 dark:text-stone-200 cursor-pointer"
                    >
                      Waagerecht (gleich hoch)
                    </button>
                    <button
                      onClick={() => onUpdateWall({ ...selectedWall, endHeight: (selectedWall.height || 2.5) + 1.0 })}
                      className="flex-1 py-0.5 text-[10px] bg-amber-100 dark:bg-amber-950 hover:bg-amber-200 text-amber-800 dark:text-amber-300 rounded font-medium cursor-pointer"
                    >
                      +1.0m Anstieg ↗
                    </button>
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

            {/* EMPTY STATE: PLOT (GRUNDSTÜCK) & PLAN OVERVIEW */}
            {!selectedWall && !selectedDoor && !selectedWindow && !selectedRoom && !selectedFurniture && !isMultiSelect && (
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
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-stone-800 dark:text-white text-xs">Zeichenebenen</span>
            <div className="flex flex-col gap-1 border border-stone-200 dark:border-stone-800 rounded-lg p-1 bg-stone-50 dark:bg-stone-850">
              {layers.map((l) => (
                <div
                  key={l.id}
                  onClick={() => onToggleLayer(l.id)}
                  className="flex items-center justify-between px-2.5 py-1.5 rounded-md hover:bg-stone-200/60 dark:hover:bg-stone-800 cursor-pointer text-xs"
                >
                  <span className="text-stone-700 dark:text-stone-300 font-medium">{l.name}</span>
                  <div className="flex items-center gap-2">
                    {l.visible ? (
                      <Eye className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-stone-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
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
