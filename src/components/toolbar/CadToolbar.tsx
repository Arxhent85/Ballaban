/**
 * Left CAD Tool Palette (Apple Pro & Adobe Studio Grade)
 * Clean, focused, high-precision dark aesthetic with electric blue accents.
 * 
 * Reorganized per user specification:
 * 1. Auswahl (Select)
 * 2. Verschieben (Pan / Hand)
 * 3. Grundstückslinien (Plot)
 * 4. Wände (Wall) - Räume entfernt
 * 5. Ausschneidwerkzeug (Split / Schere)
 * 6. Dach (Roof / Dach-Modul)
 * 7. Türen (Door)
 * 8. Fenster (Window)
 * 9. Treppen (Stairs)
 * 10. Möbel (Furniture)
 * 11. Maßband (Measure)
 * 12. Bemaßung (Dimension)
 * 13. Text (Annotation)
 * 14. Radierer / Teil-Löschwerkzeug (Eraser)
 * 15. Plan-Vorlage (Underlay)
 * 16. Setup & Aktionen (Vollbild, Einpassen, Export, Einstellungen)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  MousePointer,
  Hand,
  PenTool,
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
  Sliders,
  Maximize2,
  Maximize,
  Minimize,
  Download,
  Settings,
  Layers,
  X,
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
  onZoomFit?: () => void;
  onToggleFullscreen?: () => void;
  onOpenExportDialog?: () => void;
  onToggleUnderlayHud?: () => void;
  isUnderlayHudOpen?: boolean;
  onOpenSettings?: () => void;
}

export const CadToolbar: React.FC<CadToolbarProps> = ({
  activeTool,
  onSelectTool,
  language,
  onOpenFurnitureCatalog,
  onOpenRoofModal,
  onInsertUnderlayImage,
  leftHandedMode = false,
  isFullscreen = false,
  onZoomFit,
  onToggleFullscreen,
  onOpenExportDialog,
  onToggleUnderlayHud,
  isUnderlayHudOpen = false,
  onOpenSettings,
}) => {
  const t = getT(language);
  const [showSetupMenu, setShowSetupMenu] = useState(false);
  const setupMenuRef = useRef<HTMLDivElement>(null);

  // Close setup flyout on outside click
  useEffect(() => {
    if (!showSetupMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (setupMenuRef.current && !setupMenuRef.current.contains(e.target as Node)) {
        setShowSetupMenu(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [showSetupMenu]);

  const btnClass = (isActive: boolean) =>
    `w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer select-none ${
      isActive
        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400/50 font-bold scale-[1.03]'
        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 active:scale-95'
    }`;

  const iconClass = 'w-5 h-5 md:w-4 md:h-4';

  const Tooltip = ({ label, shortcut }: { label: string; shortcut?: string }) => (
    <div
      className={`absolute ${
        leftHandedMode ? 'right-13' : 'left-13'
      } px-2.5 py-1.5 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded-xl shadow-2xl pointer-events-none whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center gap-2`}
    >
      <span className="font-medium">{label}</span>
      {shortcut && (
        <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-700 dark:text-slate-300 font-mono font-bold border border-slate-200 dark:border-slate-700/60">
          {shortcut}
        </kbd>
      )}
    </div>
  );

  return (
    <aside
      className={`w-14 md:w-13 ${
        leftHandedMode ? 'border-l order-last' : 'border-r'
      } border-slate-200 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col items-center py-2 z-20 shrink-0 select-none shadow-sm transition-all overflow-y-auto no-scrollbar`}
    >
      <div className="flex flex-col gap-1 md:gap-0.5 w-full px-1.5 items-center">
        {/* 1. AUSWAHL (Select) */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('select')}
            className={btnClass(activeTool === 'select')}
          >
            <MousePointer className={iconClass} />
          </button>
          <Tooltip label="Auswahl" shortcut="V" />
        </div>

        {/* 2. VERSCHIEBEN (Pan) */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('hand')}
            className={btnClass(activeTool === 'hand')}
          >
            <Hand className={iconClass} />
          </button>
          <Tooltip label="Verschieben (Pan)" shortcut="H" />
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1 mx-1 w-full" />

        {/* 3. GRUNDSTÜCKSLINIEN (Plot) - 3. Stelle */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('plot')}
            className={btnClass(activeTool === 'plot')}
          >
            <Compass className={iconClass} />
          </button>
          <Tooltip label="Grundstückslinien & Baugrenzen" shortcut="G" />
        </div>

        {/* 4. WÄNDE (Wall) - 4. Stelle */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('wall')}
            className={btnClass(activeTool === 'wall')}
          >
            <PenTool className={iconClass} />
          </button>
          <Tooltip label="Wände zeichnen" shortcut="W" />
        </div>

        {/* 5. AUSSCHNEIDWERKZEUG (Split / Schere) - 5. Stelle */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('split')}
            className={btnClass(activeTool === 'split')}
          >
            <Scissors className={iconClass} />
          </button>
          <Tooltip label="Ausschneiden / Trennen (Schere)" shortcut="C" />
        </div>

        {/* 6. DACH (Roof / Dach-Modul) - 6. Stelle */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onOpenRoofModal?.()}
            className={btnClass(false)}
          >
            <Home className={iconClass} />
          </button>
          <Tooltip label="Dach-Modul (11 Formen & Höhen)" shortcut="U" />
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1 mx-1 w-full" />

        {/* 7. TÜREN (Doors) */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('door')}
            className={btnClass(activeTool === 'door')}
          >
            <DoorOpen className={iconClass} />
          </button>
          <Tooltip label="Türen einsetzen" shortcut="D" />
        </div>

        {/* 8. FENSTER (Windows) */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('window')}
            className={btnClass(activeTool === 'window')}
          >
            <AppWindow className={iconClass} />
          </button>
          <Tooltip label="Fenster einsetzen" shortcut="F" />
        </div>

        {/* 9. TREPPEN (Stairs) */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('stairs')}
            className={btnClass(activeTool === 'stairs')}
          >
            <StairsIcon className={iconClass} />
          </button>
          <Tooltip label="Treppen" shortcut="T" />
        </div>

        <div className="h-px bg-slate-800/80 my-1 mx-1 w-full" />

        {/* 10. MÖBEL (Furniture Catalog) */}
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

        {/* 11. MAßBAND (Quick Measure) */}
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
          <Tooltip label="Maßband (Messen)" shortcut="Q" />
        </div>

        {/* 12. BEMAßUNG (Dimension Line) */}
        <div className="relative group flex items-center justify-center">
          <button
            onClick={() => onSelectTool('dimension')}
            className={btnClass(activeTool === 'dimension')}
          >
            <Ruler className={iconClass} />
          </button>
          <Tooltip label="Bemaßung" shortcut="B" />
        </div>

        {/* 13. TEXT / BESCHRIFTUNG (Text) */}
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

        {/* 14. RADIERER (Eraser / Teil-Löschwerkzeug wie bei Paint) */}
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
          <Tooltip label="Radierer (Wandteile wegradieren wie bei Paint)" shortcut="Entf" />
        </div>

        {/* 15. PLAN-VORLAGE (Underlay Image) */}
        <div className="relative group flex items-center justify-center">
          {onToggleUnderlayHud ? (
            <button
              onClick={onToggleUnderlayHud}
              title={isUnderlayHudOpen ? 'Plan-Vorlage Menü schließen' : 'Plan-Vorlage anpassen (Transparenz, Maßstab)'}
              className={`w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                isUnderlayHudOpen
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30 font-bold'
                  : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/25 border border-amber-500/30'
              }`}
            >
              <ImageIcon className={iconClass} />
            </button>
          ) : onInsertUnderlayImage ? (
            <label
              title="Plan, Foto oder PDF als Vorlage zum Nachzeichnen einfügen"
              className="w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 shadow-xs active:scale-95 relative overflow-hidden"
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
          ) : null}
          <Tooltip label="Plan-Vorlage (Zeichenhilfe)" />
        </div>

        <div className="h-px bg-slate-200 dark:bg-slate-800/80 my-1 mx-1 w-full" />

        {/* 16. SETUP & AKTIONEN MENÜ (Kompakt für Tablets & Vollbild) */}
        <div ref={setupMenuRef} className="relative flex items-center justify-center">
          <button
            onClick={() => setShowSetupMenu((prev) => !prev)}
            title="Setup & Aktionen (Vollbild, Einpassen, Export, Einstellungen)"
            className={`w-11 h-11 md:w-9 md:h-9 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 rounded-xl md:rounded-lg flex items-center justify-center transition-all cursor-pointer ${
              showSetupMenu
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/30 font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80'
            }`}
          >
            <Sliders className={iconClass} />
          </button>

          {/* Setup Popover Flyout */}
          {showSetupMenu && (
            <div
              className={`absolute ${
                leftHandedMode ? 'right-14' : 'left-14'
              } bottom-0 w-64 bg-white/98 dark:bg-slate-950/98 backdrop-blur-2xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1`}
            >
              <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-200 dark:border-slate-800/80 font-bold text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <span>Setup & Aktionen</span>
                <button
                  onClick={() => setShowSetupMenu(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 1. Einpassen */}
              {onZoomFit && (
                <button
                  onClick={() => {
                    onZoomFit();
                    setShowSetupMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <Maximize2 className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">Ansicht einpassen</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Ganzes Haus zentrieren (Zoom Fit)</span>
                  </div>
                </button>
              )}

              {/* 2. Vollbild */}
              {onToggleFullscreen && (
                <button
                  onClick={() => {
                    onToggleFullscreen();
                    setShowSetupMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  {isFullscreen ? (
                    <Minimize className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <Maximize className="w-4 h-4 text-amber-500 shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">
                      {isFullscreen ? 'Vollbild beenden' : 'Vollbildmodus'}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Browserleiste aus- oder einblenden</span>
                  </div>
                </button>
              )}

              {/* 3. Export */}
              {onOpenExportDialog && (
                <button
                  onClick={() => {
                    onOpenExportDialog();
                    setShowSetupMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4 text-sky-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">Pläne exportieren</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">PDF, PNG, SVG oder Ausdruck</span>
                  </div>
                </button>
              )}

              {/* 4. Plan-Vorlage */}
              {onToggleUnderlayHud && (
                <button
                  onClick={() => {
                    onToggleUnderlayHud();
                    setShowSetupMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <ImageIcon className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">Plan-Vorlage Menü</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Transparenz, Maßstab & Filter</span>
                  </div>
                </button>
              )}

              {/* 5. Einstellungen */}
              {onOpenSettings && (
                <button
                  onClick={() => {
                    onOpenSettings();
                    setShowSetupMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 flex items-center gap-2.5 text-slate-800 dark:text-slate-200 cursor-pointer transition-colors"
                >
                  <Settings className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-semibold text-xs">Einstellungen</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">Design, Einheiten, Baurecht & Fangen</span>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
