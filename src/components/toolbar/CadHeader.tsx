/**
 * Top Navigation and CAD Menu Bar (Modern Figma/Floorplanner Design)
 */

import React, { useState, useRef } from 'react';
import {
  FileText,
  FolderOpen,
  Save,
  Printer,
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
  Eye,
  Columns2,
  Calculator,
  GitBranch,
  Check,
  SplitSquareVertical,
  RotateCcw,
  Home,
  Maximize,
  Minimize,
  Tablet,
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
  onToggleFocusMode?: () => void;
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
  onToggleFocusMode,
  onOpenGestureHelp,
}) => {
  const t = getT(language);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Menu states
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showCalcMenu, setShowCalcMenu] = useState(false);
  const [showFloorsMenu, setShowFloorsMenu] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);

  // Project rename
  const [isEditingName, setIsEditingName] = useState(false);
  const [projectNameInput, setProjectNameInput] = useState(project.name);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onOpenProject(e.target.files[0]);
    }
  };

  return (
    <header className="h-13 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 flex items-center justify-between z-30 select-none shrink-0 text-slate-700 dark:text-slate-200 transition-colors">
      {/* ZONE 1: Logo & Project Name & Menus */}
      <div className="flex items-center gap-3">
        {/* Brand Badge */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-stone-900 dark:bg-stone-100 flex items-center justify-center text-amber-500 dark:text-stone-900 shadow-sm font-bold text-xs tracking-wider border border-amber-600/40">
            CAD
          </div>
          <div className="flex items-center gap-2">
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
                className="bg-stone-100 dark:bg-stone-800 border border-amber-500 rounded px-2 py-0.5 text-xs font-semibold text-stone-900 dark:text-white outline-none"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                title="Klicken zum Umbenennen"
                className="font-semibold text-xs text-stone-900 dark:text-white cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors truncate max-w-[160px]"
              >
                {project.name}
              </h1>
            )}

            {/* Autosave Status Badge */}
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400 font-medium">
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Gespeichert</span>
            </div>
          </div>
        </div>

        {/* Dropdown Menus: Datei / Ansicht / Auswertung & Leere Seite Schnellzugriff */}
        <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-stone-200 dark:border-stone-800 text-xs">
          {/* Schnell-Aktion: Leere neue Seite (Alles löschen) */}
          <button
            onClick={onResetProjectPrompt || onNewProject}
            title="Leere neue Seite anlegen (Alles löschen & von vorne anfangen)"
            className="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-200 border border-stone-300 dark:border-stone-700 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
            <span>Leere Seite</span>
          </button>

          {/* Menu 1: DATEI */}
          <div className="relative">
            <button
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              Datei
            </button>
            {showFileMenu && (
              <div
                onMouseLeave={() => setShowFileMenu(false)}
                className="absolute left-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs"
              >
                <button
                  onClick={() => {
                    (onResetProjectPrompt || onNewProject)();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 text-stone-900 dark:text-stone-100 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                  <span>Leere neue Seite (Alles löschen)</span>
                </button>

                <button
                  onClick={() => {
                    onNewProject();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Neuer Plan (Standard)</span>
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
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Öffnen...</span>
                </button>

                <button
                  onClick={() => {
                    onSaveProject();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Speichern</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  onClick={() => {
                    onOpenTemplates();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Vorlagen...</span>
                </button>

                <button
                  onClick={() => {
                    onOpenWizard();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Wand2 className="w-3.5 h-3.5 text-amber-500" />
                  <span>Haus-Assistent...</span>
                </button>

                <button
                  onClick={() => {
                    onOpenRoofModal?.();
                    setShowFileMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Home className="w-3.5 h-3.5 text-amber-500" />
                  <span>Dach-Modul & Überdachung...</span>
                </button>
              </div>
            )}
          </div>

          {/* Menu 2: ANSICHT */}
          <div className="relative">
            <button
              onClick={() => setShowViewMenu(!showViewMenu)}
              className="px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              Ansicht
            </button>
            {showViewMenu && (
              <div
                onMouseLeave={() => setShowViewMenu(false)}
                className="absolute left-0 mt-1 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs"
              >
                <button
                  onClick={() => {
                    onViewModeChange('2d');
                    setShowViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Building className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>2D Grundriss</span>
                </button>

                <button
                  onClick={() => {
                    onViewModeChange('3d');
                    setShowViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Box className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>3D Modell & Rundgang</span>
                </button>

                <button
                  onClick={() => {
                    onViewModeChange('split');
                    setShowViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Columns2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Geteilt (2D + 3D)</span>
                </button>

                <div className="border-t border-slate-100 dark:border-slate-800 my-1" />

                <button
                  onClick={() => {
                    onViewModeChange('elevations');
                    setShowViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Eye className="w-3.5 h-3.5 text-stone-500" />
                  <span>Fassaden-Ansichten (N/S/O/W)</span>
                </button>

                <button
                  onClick={() => {
                    onViewModeChange('section');
                    setShowViewMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <SplitSquareVertical className="w-3.5 h-3.5 text-stone-500" />
                  <span>Gebäudeschnitt A-A</span>
                </button>
              </div>
            )}
          </div>

          {/* Menu 3: AUSWERTUNG */}
          <div className="relative">
            <button
              onClick={() => setShowCalcMenu(!showCalcMenu)}
              className="px-2.5 py-1 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors"
            >
              Auswertung
            </button>
            {showCalcMenu && (
              <div
                onMouseLeave={() => setShowCalcMenu(false)}
                className="absolute left-0 mt-1 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs"
              >
                <button
                  onClick={() => {
                    onViewModeChange('quantities');
                    setShowCalcMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Calculator className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Mengenliste & Raumbuch</span>
                </button>

                <button
                  onClick={() => {
                    onViewModeChange('quantities');
                    setShowCalcMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Automatischer Bauplan-Check</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ZONE 2: Segmented Control & Floor Selector */}
      <div className="flex items-center gap-2">
        {/* Segmented View Control */}
        <div className="flex items-center p-0.5 bg-stone-100 dark:bg-stone-800/90 rounded-lg border border-stone-200 dark:border-stone-700 text-xs">
          <button
            onClick={() => onViewModeChange('2d')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === '2d'
                ? 'bg-stone-900 dark:bg-stone-100 text-amber-400 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            2D Grundriss
          </button>

          <button
            onClick={() => onViewModeChange('3d')}
            className={`px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === '3d'
                ? 'bg-stone-900 dark:bg-stone-100 text-amber-400 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            3D Modell
          </button>

          <button
            onClick={() => onViewModeChange('split')}
            className={`hidden md:block px-3 py-1 rounded-md font-medium transition-all ${
              viewMode === 'split'
                ? 'bg-stone-900 dark:bg-stone-100 text-amber-400 dark:text-stone-900 shadow-sm font-semibold'
                : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            Geteilt
          </button>
        </div>

        {/* Floor Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFloorsMenu(!showFloorsMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-750 border border-stone-200 dark:border-stone-700 font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span className="truncate max-w-[110px]">{activeFloor.name}</span>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {showFloorsMenu && (
            <div
              onMouseLeave={() => setShowFloorsMenu(false)}
              className="absolute left-0 mt-1 w-44 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg shadow-xl py-1 z-50 text-xs"
            >
              <div className="px-3 py-1 text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
                Geschosse
              </div>
              {project.floors.map((fl) => (
                <div
                  key={fl.id}
                  onClick={() => {
                    onSwitchFloor(fl.id);
                    setShowFloorsMenu(false);
                  }}
                  className={`px-3 py-1.5 flex items-center justify-between cursor-pointer hover:bg-stone-100 dark:hover:bg-stone-800 ${
                    fl.id === activeFloor.id
                      ? 'text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/40'
                      : ''
                  }`}
                >
                  <span>{fl.name}</span>
                </div>
              ))}
              <div className="border-t border-stone-100 dark:border-stone-800 mt-1 pt-1">
                <button
                  onClick={() => {
                    onAddFloor();
                    setShowFloorsMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium"
                >
                  + Neues Geschoss
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ZONE 3: Undo/Redo & Single Main Action (Export) & Controls */}
      <div className="flex items-center gap-1.5">
        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Rückgängig (Strg+Z)"
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Wiederholen (Strg+Y)"
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

        {/* Export / Share - SINGLE Primary Button in Warm Amber */}
        <button
          onClick={onOpenExportDialog}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs shadow-sm transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportieren & Drucken</span>
        </button>

        {/* Language */}
        <div className="relative">
          <button
            onClick={() => setShowLangMenu(!showLangMenu)}
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1 text-xs"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase text-[11px] font-mono">{language}</span>
          </button>
          {showLangMenu && (
            <div
              onMouseLeave={() => setShowLangMenu(false)}
              className="absolute right-0 mt-1 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl py-1 z-50 text-xs"
            >
              {(['de', 'en', 'sq'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    onLanguageChange(lang);
                    setShowLangMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between ${
                    language === lang ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''
                  }`}
                >
                  <span>{lang === 'de' ? 'Deutsch' : lang === 'en' ? 'English' : 'Shqip'}</span>
                  <span className="text-[10px] text-slate-400 uppercase font-mono">{lang}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title={t.settings}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Gesten & Tablet Guide */}
        {onOpenGestureHelp && (
          <button
            onClick={onOpenGestureHelp}
            title="iPad Touch-Gesten, Apple Pencil & Home-Bildschirm Anleitung"
            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <Tablet className="w-4 h-4 text-amber-500" />
          </button>
        )}

        {/* Help */}
        <button
          onClick={onOpenHelp}
          title={t.help}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        {/* Fullscreen / Fokusmodus */}
        {onToggleFocusMode && (
          <button
            onClick={onToggleFocusMode}
            title={isFocusMode ? 'Fokusmodus beenden' : 'Vollbild / Fokusmodus (iPad & Tablet)'}
            className={`p-1.5 rounded-md transition-colors ${
              isFocusMode
                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {isFocusMode ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        )}

        {/* Dark / Light Toggle */}
        <button
          onClick={onToggleTheme}
          title={isDark ? 'Helles Design' : 'Dunkles Design'}
          className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>
    </header>
  );
};
