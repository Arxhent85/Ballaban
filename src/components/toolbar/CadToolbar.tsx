/**
 * Left CAD Tool Palette (Apple Pro & Adobe Studio Grade)
 * Clean, focused, high-precision dark aesthetic with electric blue accents.
 */

import React, { useState } from 'react';
import {
  MousePointer,
  Hand,
  PenTool,
  Square,
  Scissors,
  DoorOpen,
  AppWindow,
  Armchair,
  Ruler,
  Type,
  Eraser,
  Compass,
  Home,
  Image as ImageIcon,
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
  onInsertUnderlayImage?: (file: File) => void;
  leftHandedMode?: boolean;
  isFullscreen?: boolean;
}

export const CadToolbar: React.FC<CadToolbarProps> = ({
  activeTool,
  onSelectTool,
  language,
  onOpenFurnitureCatalog,
  onOpenRoofModal,
  onInsertUnderlayImage,
  leftHandedMode = false,
}) => {
  const t = getT(language);

  const btnClass = (isActive: boolean) =>
    `w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/50 font-bold scale-[1.03]'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/80 active:scale-95'
    }`;

  const iconClass = 'w-5 h-5 md:w-4 md:h-4';

  const Tooltip = ({ label, shortcut }: { label: string; shortcut?: string }) => (
    <div className="absolute left-13 px-2.5 py-1.5 bg-slate-950/95 backdrop-blur-md border border-slate-800 text-slate-100 text-xs rounded-xl shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2">
      <span className="font-medium">{label}</span>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono font-bold border border-slate-700/60">
          {shortcut}
        </kbd>
      )}
    </div>
  );

  return (
    <aside
      className={`w-14 md:w-13 ${
        leftHandedMode ? 'border-l order-last' : 'border-r'
      } border-slate-800/80 bg-slate-900/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col items-center py-2.5 z-20 shrink-0 select-none shadow-md transition-all`}
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
          <Tooltip label="Auswahl" shortcut="V" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('hand')}
            className={btnClass(activeTool === 'hand')}
          >
            <Hand className={iconClass} />
          </button>
          <Tooltip label="Verschieben (Pan)" shortcut="H" />
        </div>

        <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />

        {/* GROUP 2: Wall & Room */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('wall')}
            className={btnClass(activeTool === 'wall')}
          >
            <PenTool className={iconClass} />
          </button>
          <Tooltip label="Wand zeichnen" shortcut="W" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('rect_room')}
            className={btnClass(activeTool === 'rect_room')}
          >
            <Square className={iconClass} />
          </button>
          <Tooltip label="Rechteckraum (4 Wände)" shortcut="R" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('split')}
            className={btnClass(activeTool === 'split')}
          >
            <Scissors className={iconClass} />
          </button>
          <Tooltip label="Wand trennen (Schere)" shortcut="C" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('plot')}
            className={btnClass(activeTool === 'plot')}
          >
            <Compass className={iconClass} />
          </button>
          <Tooltip label="Grundstück & Baugrenzen" shortcut="G" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onOpenRoofModal?.()}
            className={btnClass(false)}
          >
            <Home className={iconClass} />
          </button>
          <Tooltip label="Dach-Modul & Einstellungen" shortcut="U" />
        </div>

        <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />

        {/* GROUP 3: Doors, Windows, Stairs */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('door')}
            className={btnClass(activeTool === 'door')}
          >
            <DoorOpen className={iconClass} />
          </button>
          <Tooltip label="Tür einsetzen" shortcut="D" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('window')}
            className={btnClass(activeTool === 'window')}
          >
            <AppWindow className={iconClass} />
          </button>
          <Tooltip label="Fenster einsetzen" shortcut="F" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('stairs')}
            className={btnClass(activeTool === 'stairs')}
          >
            <StairsIcon className={iconClass} />
          </button>
          <Tooltip label="Treppe" shortcut="T" />
        </div>

        <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />

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
          <Tooltip label="Möbel-Bibliothek" shortcut="M" />
        </div>

        <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />

        {/* GROUP 5: Dimensions, Measure, Text */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('measure')}
            className={btnClass(activeTool === 'measure')}
          >
            <svg
              className={iconClass}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 13a4 4 0 1 0 8 0 4 4 0 0 0-8 0z" />
              <path d="M11 13h10" />
              <path d="M14 10v6" />
              <path d="M18 10v6" />
              <path d="M21 10v6" />
            </svg>
          </button>
          <Tooltip label="Maßband (Quick Measure)" shortcut="M" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('dimension')}
            className={btnClass(activeTool === 'dimension')}
          >
            <Ruler className={iconClass} />
          </button>
          <Tooltip label="Bemaßung" shortcut="B" />
        </div>

        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('text')}
            className={btnClass(activeTool === 'text')}
          >
            <Type className={iconClass} />
          </button>
          <Tooltip label="Textbeschriftung" shortcut="A" />
        </div>

        <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />

        {/* GROUP 6: Eraser */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('eraser')}
            className={`w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              activeTool === 'eraser'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-500/30 ring-1 ring-rose-400/50 font-bold scale-[1.03]'
                : 'text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 active:scale-95'
            }`}
          >
            <Eraser className={iconClass} />
          </button>
          <Tooltip label="Löschen / Radierer" shortcut="Entf" />
        </div>

        {/* GROUP 7: Plan-Vorlage einfügen (ohne KI) */}
        {onInsertUnderlayImage && (
          <>
            <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />
            <div className="relative group flex items-center justify-center">
              <label
                title="Plan, Foto oder PDF als Vorlage zum Nachzeichnen einfügen"
                className="w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 shadow-xs active:scale-95 relative overflow-hidden"
              >
                <input
                  type="file"
                  accept="image/*,application/pdf,.pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onInsertUnderlayImage(file);
                    e.target.value = '';
                  }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer',
                  }}
                />
                <ImageIcon className={`${iconClass} pointer-events-none`} />
              </label>
              <Tooltip label="Vorlage einfügen (Nachzeichnen)" />
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
