/**
 * CadHeader.tsx
 * 
 * Compact, Touch-First Top Navigation Bar (TEIL 4: OBERE LEISTE)
 * Schlank (max. 48–52 pt), halbtransparent, ohne abgeschnittene Knöpfe.
 * 
 * Content from left to right:
 * 1. ☰-Menü (Neu/Leere Seite, Vorlagen, Öffnen, Speichern, Export, IFC/DXF, Baurecht, Einstellungen, Gesten, Sprache, Theme)
 * 2. Projektname (antippen zum Umbenennen) mit Speicherstatus-Häkchen
 * 3. Geschoss-Wähler (EG / OG / DG) – nur sichtbar, wenn > 1 Geschoss existiert
 * 4. Ansichts-Pill: "2D | 3D | Geteilt" (kompakte Segment-Schaltfläche)
 * 5. Rechts: Rückgängig, Wiederholen, Vollbild (IMMER sichtbar!), Export-Schnellbutton
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu,
  X,
  FileText,
  FolderOpen,
  Save,
  Undo2,
  Redo2,
  Wand2,
  Sparkles,
  HelpCircle,
  Settings,
  Layers,
  Sun,
  Moon,
  ChevronDown,
  Globe,
  Download,
  Building,
  Box,
  Columns2,
  Calculator,
  Check,
  SplitSquareVertical,
  RotateCcw,
  Home,
  Maximize,
  Minimize,
  Tablet,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { ViewMode, Language, CadProject, Floor } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface CadHeaderProps {
  project: CadProject;
  activeFloor: Floor;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onNewProject: () => void;
  onResetProjectPrompt?: () => void;
  onOpenProject: (file: File) => void;
  onSaveProject: () => void;
  onOpenExportDialog: () => void;
  onOpenWizard: () => void;
  onOpenTemplates: () => void;
  onOpenHelp: () => void;
  onOpenSettings: () => void;
  onOpenHistory: () => void;
  onOpenRoofModal?: () => void;
  onSwitchFloor: (floorId: string) => void;
  onAddFloor: () => void;
  onDeleteFloor: (floorId: string) => void;
  onRenameProject: (name: string) => void;
  isFocusMode?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onOpenGestureHelp?: () => void;
}

export const CadHeader: React.FC<CadHeaderProps> = ({
  project,
  activeFloor,
  viewMode,
  onViewModeChange,
  language,
  onLanguageChange,
  isDark,
  onToggleTheme,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onNewProject,
  onResetProjectPrompt,
  onOpenProject,
  onSaveProject,
  onOpenExportDialog,
  onOpenWizard,
  onOpenTemplates,
  onOpenHelp,
  onOpenSettings,
  onOpenHistory,
  onOpenRoofModal,
  onSwitchFloor,
  onAddFloor,
  onDeleteFloor,
  onRenameProject,
  isFocusMode = false,
  isFullscreen = false,
  onToggleFullscreen,
  onOpenGestureHelp,
}) => {
  const t = getT(language);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hamburger Menu state
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [showFloorsDropdown, setShowFloorsDropdown] = useState(false);

  // Project rename
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);

  // Close menus on outside click / escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMainMenu(false);
        setShowFloorsDropdown(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onOpenProject(e.target.files[0]);
    }
  };

  const isFullscreenActive = isFullscreen || isFocusMode;

  return (
    <header className="h-12 md:h-13 max-h-[52px] border-b border-stone-200 dark:border-stone-800 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md px-2.5 sm:px-4 flex items-center justify-between z-30 select-none shrink-0 text-stone-800 dark:text-stone-100 transition-colors">
      {/* 1. LEFT ZONE: ☰-Menü & Projektname & Speicherstatus */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* ☰ Hamburger Main Menu Button */}
        <div className="relative">
          <button
            onClick={() => setShowMainMenu(!showMainMenu)}
            title="Hauptmenü (Datei, Vorlagen, Einstellungen)"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-stone-700 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer border border-stone-200/80 dark:border-stone-700/80"
          >
            {showMainMenu ? <X className="w-5 h-5 text-amber-500" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* ☰ Full Dropdown Menu */}
          {showMainMenu && (
            <div
              onMouseLeave={() => setShowMainMenu(false)}
              className="absolute left-0 mt-2 w-72 max-h-[85vh] overflow-y-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl py-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
            >
              {/* SECTION: DATEI */}
              <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Datei & Projekt
              </div>

              {/* Leere Seite (Moved into menu per Teil 4) */}
              <button
                onClick={() => {
                  (onResetProjectPrompt || onNewProject)();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 font-semibold cursor-pointer transition-colors"
              >
                <RotateCcw className="w-4 h-4 text-rose-500" />
                <div className="flex flex-col">
                  <span>Leere Seite (Alles löschen)</span>
                  <span className="text-[10px] font-normal text-rose-500/80">Zeichenfläche komplett leeren</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onNewProject();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <FileText className="w-4 h-4 text-stone-500" />
                <span>Neuer Standardplan (Ferienhaus 6×8m)</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                accept=".json,.cad"
                className="hidden"
              />
              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <FolderOpen className="w-4 h-4 text-amber-500" />
                <span>Plan öffnen (.json, .cad)...</span>
              </button>

              <button
                onClick={() => {
                  onSaveProject();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-500" />
                <span>Projekt speichern (Herunterladen)</span>
              </button>

              <div className="border-t border-stone-100 dark:border-stone-800 my-1" />

              {/* SECTION: DESIGN & ASSISTENTEN */}
              <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Planung & Bauteile
              </div>

              <button
                onClick={() => {
                  onOpenRoofModal?.();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-950/40 flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-semibold cursor-pointer"
              >
                <Home className="w-4 h-4 text-amber-500" />
                <span>Dach-Modul (11 Formen & Parameter)...</span>
              </button>

              <button
                onClick={() => {
                  onOpenTemplates();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Musterhäuser & Vorlagen...</span>
              </button>

              <button
                onClick={() => {
                  onOpenWizard();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <Wand2 className="w-4 h-4 text-amber-500" />
                <span>Haus-Assistent (Raumprogramm)...</span>
              </button>

              {/* SECTION: EXPORT & PLÄNE */}
              <div className="border-t border-stone-100 dark:border-stone-800 my-1" />
              <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                Export & Prüfung
              </div>

              <button
                onClick={() => {
                  onOpenExportDialog();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <Download className="w-4 h-4 text-blue-500" />
                <span>Pläne exportieren & drucken (PDF/PNG/SVG)...</span>
              </button>

              <button
                onClick={() => {
                  onViewModeChange('quantities');
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <Calculator className="w-4 h-4 text-stone-500" />
                <span>Mengenermittlung & Baurechts-Check</span>
              </button>

              {/* SECTION: EINSTELLUNGEN & SYSTEM */}
              <div className="border-t border-stone-100 dark:border-stone-800 my-1" />
              <div className="px-3 py-1 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                System & Hilfe
              </div>

              {onOpenGestureHelp && (
                <button
                  onClick={() => {
                    onOpenGestureHelp();
                    setShowMainMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-medium cursor-pointer"
                >
                  <Tablet className="w-4 h-4 text-amber-500" />
                  <span>iPad Gesten & Apple Pencil Hilfe</span>
                </button>
              )}

              <button
                onClick={() => {
                  onOpenSettings();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2.5 text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-stone-500" />
                <span>Einstellungen (Raster & Maßeinheiten)...</span>
              </button>

              <button
                onClick={() => {
                  onToggleTheme();
                  setShowMainMenu(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-between text-stone-800 dark:text-stone-200 cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-stone-500" />}
                  <span>Design</span>
                </div>
                <span className="text-[10px] text-stone-400 font-medium">{isDark ? 'Dunkel' : 'Hell'}</span>
              </button>

              <div className="px-3 py-1.5 flex items-center justify-between text-stone-600 dark:text-stone-400">
                <div className="flex items-center gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  <span>Sprache:</span>
                </div>
                <div className="flex items-center gap-1 font-mono uppercase text-[10px]">
                  {(['de', 'en', 'sq'] as Language[]).map((lng) => (
                    <button
                      key={lng}
                      onClick={() => onLanguageChange(lng)}
                      className={`px-1.5 py-0.5 rounded cursor-pointer ${
                        language === lng ? 'bg-amber-600 text-white font-bold' : 'hover:bg-stone-200 dark:hover:bg-stone-800'
                      }`}
                    >
                      {lng}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Project Title (Editable on tap) & Saved Badge */}
        <div className="flex items-center gap-1.5 min-w-0">
          {isEditingName ? (
            <input
              type="text"
              value={projectNameInput}
              onChange={(e) => setProjectNameInput(e.target.value)}
              onBlur={() => {
                setIsEditingName(false);
                onRenameProject(projectNameInput);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingName(false);
                  onRenameProject(projectNameInput);
                }
              }}
              autoFocus
              className="bg-stone-100 dark:bg-stone-800 border border-amber-500 rounded px-2 py-0.5 text-xs font-semibold text-stone-900 dark:text-white outline-none w-36 sm:w-48"
            />
          ) : (
            <h1
              onClick={() => setIsEditingName(true)}
              title="Antippen zum Umbenennen"
              className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
            >
              {project.name}
            </h1>
          )}

          {/* Discreet Saved Status Icon */}
          <div
            title="Projekt automatisch lokal gesichert"
            className="flex items-center text-emerald-500 shrink-0"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* 2. CENTER ZONE: Geschoss-Wähler (NUR wenn > 1 Geschoss) & Ansichts-Pill */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Geschoss-Wähler: ONLY visible if project.floors.length > 1 per Teil 4 */}
        {project.floors.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowFloorsDropdown(!showFloorsDropdown)}
              className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 font-medium cursor-pointer border border-stone-200 dark:border-stone-700"
            >
              <Layers className="w-3.5 h-3.5 text-amber-500" />
              <span className="truncate max-w-[70px] sm:max-w-[100px]">{activeFloor.name}</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {showFloorsDropdown && (
              <div
                onMouseLeave={() => setShowFloorsDropdown(false)}
                className="absolute left-0 mt-1 w-44 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl py-1 z-50 text-xs"
              >
                {project.floors.map((fl) => (
                  <button
                    key={fl.id}
                    onClick={() => {
                      onSwitchFloor(fl.id);
                      setShowFloorsDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 ${
                      fl.id === activeFloor.id ? 'text-amber-600 dark:text-amber-400 font-bold bg-amber-50/50 dark:bg-amber-950/30' : ''
                    }`}
                  >
                    <span>{fl.name}</span>
                  </button>
                ))}
                <div className="border-t border-stone-100 dark:border-stone-800 mt-1 pt-1">
                  <button
                    onClick={() => {
                      onAddFloor();
                      setShowFloorsDropdown(false);
                    }}
                    className="w-full text-left px-3 py-1.5 text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
                  >
                    + Neues Geschoss
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Ansichts-Pill: "2D | 3D | Geteilt" (kompakte Segment-Schaltfläche) */}
        <div className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800/90 rounded-xl border border-stone-200 dark:border-stone-700 text-xs">
          <button
            onClick={() => onViewModeChange('2d')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === '2d'
                ? 'bg-stone-900 dark:bg-stone-100 text-amber-400 dark:text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            2D
          </button>

          <button
            onClick={() => onViewModeChange('3d')}
            className={`px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === '3d'
                ? 'bg-stone-900 dark:bg-stone-100 text-amber-400 dark:text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            3D
          </button>

          <button
            onClick={() => onViewModeChange('split')}
            className={`hidden sm:block px-2.5 sm:px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
              viewMode === 'split'
                ? 'bg-stone-900 dark:bg-stone-100 text-amber-400 dark:text-stone-900 shadow-xs font-bold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Geteilt
          </button>
        </div>
      </div>

      {/* 3. RIGHT ZONE: Rückgängig, Wiederholen, VOLLBILD (IMMER SICHTBAR!), Export */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Undo / Redo */}
        <div className="flex items-center">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Rückgängig (Strg+Z / 2-Finger-Tipp)"
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Wiederholen (Strg+Y / 3-Finger-Tipp)"
            className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 disabled:opacity-25 disabled:pointer-events-none transition-colors cursor-pointer"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-stone-200 dark:border-stone-800 mx-0.5 sm:mx-1" />

        {/* VOLLBILD / FOKUSMODUS: IMMER SICHTBAR & NIE ABGESCHNITTEN per TEIL 1 & 4 */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title={isFullscreenActive ? 'Vollbild / Fokusmodus beenden (Esc)' : 'Vollbild / Fokusmodus aktivieren (100% Zeichenfläche)'}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer font-medium text-xs ${
              isFullscreenActive
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-amber-700 dark:text-amber-300 font-bold shadow-xs'
                : 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/80 hover:bg-stone-100 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-200'
            }`}
          >
            {isFullscreenActive ? <Minimize className="w-4 h-4 text-amber-500" /> : <Maximize className="w-4 h-4 text-amber-500" />}
            <span className="hidden md:inline">{isFullscreenActive ? 'Beenden' : 'Vollbild'}</span>
          </button>
        )}

        {/* Export / Schnell-Button */}
        <button
          onClick={onOpenExportDialog}
          title="Pläne exportieren & drucken (PDF, PNG, SVG)"
          className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>
    </header>
  );
};
