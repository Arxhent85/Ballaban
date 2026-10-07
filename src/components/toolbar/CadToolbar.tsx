/**
 * Left CAD Tool Palette (Modern, Grouped, Clean Iconography)
 */

import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  PenTool,
  Square,
  Scissors,
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
  Home,
  Sparkles,
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
  onOpenRoofModal?: () => void;
  onOpenAiImport?: () => void;
  leftHandedMode?: boolean;
  isFullscreen?: boolean;
}

export const CadToolbar: React.FC<CadToolbarProps> = ({
  activeTool,
  onSelectTool,
  language,
  onOpenFurnitureCatalog,
  onOpenWallNumericModal,
  onOpenRoofModal,
  onOpenAiImport,
  leftHandedMode = false,
  isFullscreen = false,
}) => {
  const t = getT(language);
  const [showWallSubmenu, setShowWallSubmenu] = useState(false);
  const [showShapesSubmenu, setShowShapesSubmenu] = useState(false);

  const btnClass = (isActive: boolean) =>
    `w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-stone-900 text-amber-400 dark:bg-stone-100 dark:text-stone-900 shadow-sm border border-amber-500/60 font-semibold'
        : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800'
    }`;

  const iconClass = 'w-5 h-5 md:w-4 md:h-4';

  return (
    <aside
      className={`w-14 md:w-13 ${
        leftHandedMode ? 'border-l order-last' : 'border-r'
      } border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center py-2 z-20 shrink-0 select-none shadow-sm transition-all`}
    >
      <div className="flex flex-col gap-1.5 md:gap-1 w-full px-1.5 items-center">
        {/* GROUP 1: Selection & Pan */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('select')}
            className={btnClass(activeTool === 'select')}
          >
            <MousePointer className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Auswahl</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">V</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('hand')}
            className={btnClass(activeTool === 'hand')}
          >
            <Hand className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Verschieben (Pan)</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">H</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1 w-full" />

        {/* GROUP 2: Wall & Room */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('wall')}
            className={btnClass(activeTool === 'wall' || activeTool === 'rect_room')}
          >
            <PenTool className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Wand zeichnen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">W</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('rect_room')}
            className={btnClass(activeTool === 'rect_room')}
          >
            <Square className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Rechteckraum (4 Wände)</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">R</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('split')}
            className={btnClass(activeTool === 'split')}
          >
            <Scissors className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Wand trennen (Schere)</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">C</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('plot')}
            className={
              activeTool === 'plot'
                ? 'w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40 font-semibold cursor-pointer'
                : btnClass(false)
            }
          >
            <Compass className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Grundstück & Baugrenzen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">G</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onOpenRoofModal?.()}
            className={btnClass(false)}
          >
            <Home className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Dach-Modul & Einstellungen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">U</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1 w-full" />

        {/* GROUP 3: Doors, Windows, Stairs */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('door')}
            className={btnClass(activeTool === 'door')}
          >
            <DoorOpen className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Tür einsetzen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">D</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('window')}
            className={btnClass(activeTool === 'window')}
          >
            <AppWindow className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Fenster einsetzen</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">F</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('stairs')}
            className={btnClass(activeTool === 'stairs')}
          >
            <StairsIcon className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Treppe</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">T</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1 w-full" />

        {/* GROUP 4: Furniture & Catalog */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => {
              onSelectTool('furniture');
              onOpenFurnitureCatalog();
            }}
            className={btnClass(activeTool === 'furniture')}
          >
            <Armchair className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Möbel-Bibliothek</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">M</kbd>
          </div>
        </div>

        <div className="h-px bg-stone-200 dark:bg-stone-800 my-1 mx-1 w-full" />

        {/* GROUP 5: Dimensions, Text, Shapes */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('dimension')}
            className={btnClass(activeTool === 'dimension')}
          >
            <Ruler className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Bemaßung</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">B</kbd>
          </div>
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('text')}
            className={btnClass(activeTool === 'text')}
          >
            <Type className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Textbeschriftung</span>
            <kbd className="px-1 py-0.5 rounded bg-stone-800 text-[10px] text-stone-300 font-mono">A</kbd>
          </div>
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800 my-1 mx-1 w-full" />

        {/* GROUP 6: Eraser */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('eraser')}
            className={`w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
            }`}
          >
            <Eraser className={iconClass} />
          </button>
          <div className="absolute left-12 px-2 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
            <span>Löschen / Radierer</span>
            <kbd className="px-1 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">Entf</kbd>
          </div>
        </div>

        {/* GROUP 7: KI-Plan-Import */}
        {onOpenAiImport && (
          <>
            <div className="h-px bg-amber-500/30 my-1 mx-1 w-full" />
            <div className="relative group flex items-center justify-center">
              <button
                onClick={onOpenAiImport}
                title="Skizze oder Bauplan mit Gemini KI importieren"
                className="w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 hover:text-amber-400 border border-amber-500/40 shadow-xs active:scale-95"
              >
                <Sparkles className={iconClass} />
              </button>
              <div className="absolute left-12 px-2 py-1 bg-stone-900 text-white text-xs rounded-md shadow-lg pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-1.5">
                <span>KI-Plan-Import (Skizze)</span>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
