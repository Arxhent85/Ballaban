/**
 * Left CAD Tool Palette (Modern, Grouped, Clean Iconography)
 */

import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  PenTool,
  Square,
  Binary,
  DoorOpen,
  AppWindow,
  Armchair,
  Ruler,
  Type,
  Eraser,
  SplitSquareVertical,
  Minus,
  Circle,
  Pencil,
  ChevronRight,
  Lasso,
  Compass,
} from 'lucide-react';
import { CadTool, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

const StairsIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 20 4 15 9 15 9 10 14 10 14 5 19 5 19 20" />
  </svg>
);

interface CadToolbarProps {
  activeTool: CadTool;
  onSelectTool: (t: CadTool) => void;
  language: Language;
  onOpenFurnitureCatalog: () => void;
  onOpenWallNumericModal: () => void;
}

export const CadToolbar: React.FC<CadToolbarProps> = ({
  activeTool,
  onSelectTool,
  language,
  onOpenFurnitureCatalog,
  onOpenWallNumericModal,
}) => {
  const t = getT(language);
  const [showWallSubmenu, setShowWallSubmenu] = useState(false);
  const [showShapesSubmenu, setShowShapesSubmenu] = useState(false);

  return (
    <aside className="w-13 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-2 z-20 shrink-0 select-none shadow-sm">
      <div className="flex flex-col gap-1 w-full px-1.5">
        {/* GROUP 1: Selection & Pan */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('select')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'select'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <MousePointer className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Auswahl</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">V</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('hand')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'hand'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Hand className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Verschieben (Pan)</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">H</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1" />

        {/* GROUP 2: Wall & Room */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('wall')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'wall' || activeTool === 'rect_room'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <PenTool className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Wand zeichnen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">W</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('rect_room')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'rect_room'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Square className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Rechteckraum (4 Wände)</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">R</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('plot')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'plot'
                ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Compass className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Grundstück & Baugrenzen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">G</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1" />

        {/* GROUP 3: Doors, Windows, Stairs */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('door')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'door'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <DoorOpen className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Tür einsetzen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">D</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('window')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'window'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <AppWindow className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Fenster einsetzen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">F</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('stairs')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'stairs'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <StairsIcon className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Treppe</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">T</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1" />

        {/* GROUP 4: Furniture & Catalog */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => {
              onSelectTool('furniture');
              onOpenFurnitureCatalog();
            }}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'furniture'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Armchair className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Möbel-Bibliothek</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">M</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1" />

        {/* GROUP 5: Dimensions, Text, Shapes */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('dimension')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'dimension'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Ruler className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Bemaßung</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">B</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('text')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'text'
                ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
            }`}
          >
            <Type className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Textbeschriftung</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">A</kbd>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1" />

        {/* GROUP 6: Eraser */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('eraser')}
            className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
              activeTool === 'eraser'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
            }`}
          >
            <Eraser className="w-4 h-4" />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Löschen / Radierer</span>
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">Entf</kbd>
          </div>
        </div>
      </div>
    </aside>
  );
};
