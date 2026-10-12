/**
 * CadCommandLine.tsx
 * 
 * AutoCAD & CADCraft style Command Prompt Bar (cmdline)
 * Allows architectural power users to trigger CAD commands rapidly with keyboard shortcuts.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Send, ChevronRight, X, Sparkles, Command } from 'lucide-react';
import { CadTool, ViewMode } from '../../types/cad';

interface CommandItem {
  keys: string[];
  name: string;
  category: 'tool' | 'view' | 'action';
  action: () => void;
  description: string;
}

interface CadCommandLineProps {
  activeTool: CadTool;
  onSelectTool: (tool: CadTool) => void;
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  onDeleteSelected?: () => void;
  onZoomFit?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  isDark?: boolean;
}

export const CadCommandLine: React.FC<CadCommandLineProps> = ({
  activeTool,
  onSelectTool,
  viewMode,
  onViewModeChange,
  onDeleteSelected,
  onZoomFit,
  onUndo,
  onRedo,
  isDark = true,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: CommandItem[] = [
    {
      keys: ['W', 'WAND', 'WALL', 'LINE'],
      name: 'Wand zeichnen',
      category: 'tool',
      action: () => onSelectTool('wall'),
      description: 'Startet das Wand-Zeichenwerkzeug',
    },
    {
      keys: ['R', 'RAUM', 'REC', 'ROOM', 'BOX'],
      name: 'Rechteckraum (4 Wände)',
      category: 'tool',
      action: () => onSelectTool('rect_room'),
      description: 'Erstellt einen 4-Wand-Raum mit einem Klick',
    },
    {
      keys: ['M', 'MESSEN', 'DIST', 'MEASURE', 'TAPE'],
      name: 'Maßband (Quick Measure)',
      category: 'tool',
      action: () => onSelectTool('measure'),
      description: 'Schnelles Nachmessen ohne Bemaßungslinien zu speichern',
    },
    {
      keys: ['D', 'TUER', 'DOOR'],
      name: 'Tür einsetzen',
      category: 'tool',
      action: () => onSelectTool('door'),
      description: 'Platziert eine Zimmer- oder Außentür',
    },
    {
      keys: ['F', 'FENSTER', 'WIN', 'WINDOW'],
      name: 'Fenster einsetzen',
      category: 'tool',
      action: () => onSelectTool('window'),
      description: 'Platziert ein Fenster in einer Wand',
    },
    {
      keys: ['T', 'TREPPE', 'STAIR', 'STAIRS'],
      name: 'Treppe einsetzen',
      category: 'tool',
      action: () => onSelectTool('stairs'),
      description: 'Platziert eine Geschosstreppe',
    },
    {
      keys: ['B', 'MASS', 'DIM', 'BEMASSUNG'],
      name: 'Bemaßungslinie',
      category: 'tool',
      action: () => onSelectTool('dimension'),
      description: 'Dauerhafte CAD-Bemaßungskette',
    },
    {
      keys: ['V', 'AUSWAHL', 'SELECT', 'SEL'],
      name: 'Auswahlwerkzeug',
      category: 'tool',
      action: () => onSelectTool('select'),
      description: 'Objekte auswählen und verschieben',
    },
    {
      keys: ['H', 'PAN', 'HAND'],
      name: 'Hand (Pan)',
      category: 'tool',
      action: () => onSelectTool('hand'),
      description: 'Zeichenfläche verschieben',
    },
    {
      keys: ['C', 'CUT', 'SPLIT', 'SCHERE'],
      name: 'Wand trennen',
      category: 'tool',
      action: () => onSelectTool('split'),
      description: 'Wand an einem Punkt trennen',
    },
    {
      keys: ['3D', 'MODEL', 'PERSPEKTIVE'],
      name: '3D-Modellansicht',
      category: 'view',
      action: () => onViewModeChange('3d'),
      description: 'Wechselt in die 3D-Perspektive',
    },
    {
      keys: ['2D', 'TOP', 'PLAN', 'GRUNDRISS'],
      name: '2D-Grundrissansicht',
      category: 'view',
      action: () => onViewModeChange('2d'),
      description: 'Wechselt in den 2D-Grundriss',
    },
    {
      keys: ['ELEV', 'FASSADE', 'ANSICHT'],
      name: 'Fassadenansichten',
      category: 'view',
      action: () => onViewModeChange('elevations'),
      description: 'Zeigt Nord-, Süd-, Ost- und Westfassade',
    },
    {
      keys: ['SEC', 'SCHNITT', 'SECTION'],
      name: 'Querschnittansicht',
      category: 'view',
      action: () => onViewModeChange('section'),
      description: 'Architektonischer Gebäudequerschnitt',
    },
    {
      keys: ['Z', 'FIT', 'ZOOM', 'EINPASSEN'],
      name: 'Auf Bildschirm einpassen',
      category: 'action',
      action: () => onZoomFit?.(),
      description: 'Passt das gesamte Haus in das Fenster ein',
    },
    {
      keys: ['DEL', 'ENTF', 'ERASE', 'LOESCHEN'],
      name: 'Auswahl löschen',
      category: 'action',
      action: () => onDeleteSelected?.(),
      description: 'Löscht die aktuelle Auswahl',
    },
  ];

  // Filter commands by input
  const query = inputVal.trim().toUpperCase();
  const suggestions = query
    ? commands.filter(
        (cmd) =>
          cmd.keys.some((k) => k.startsWith(query)) ||
          cmd.name.toUpperCase().includes(query)
      )
    : [];

  const handleExecute = (cmd: CommandItem) => {
    cmd.action();
    setFeedback(`Befehl: ${cmd.name}`);
    setInputVal('');
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleExecute(suggestions[0]);
      } else if (query) {
        const exact = commands.find((cmd) => cmd.keys.includes(query));
        if (exact) {
          handleExecute(exact);
        } else {
          setFeedback(`Unbekannter Befehl: ${query}`);
          setTimeout(() => setFeedback(null), 2500);
        }
      }
    } else if (e.key === 'Escape') {
      setInputVal('');
      inputRef.current?.blur();
    }
  };

  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 font-mono select-none pointer-events-auto">
      {/* Suggestions Popup */}
      {isFocused && suggestions.length > 0 && (
        <div className="absolute bottom-full mb-1.5 left-0 right-0 max-h-48 overflow-y-auto bg-slate-950/95 backdrop-blur-xl border border-sky-500/50 rounded-2xl p-1 shadow-2xl flex flex-col gap-0.5 text-xs">
          {suggestions.slice(0, 5).map((cmd, idx) => (
            <button
              key={cmd.name}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                handleExecute(cmd);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition-colors cursor-pointer ${
                idx === 0
                  ? 'bg-sky-600/25 text-sky-200 border border-sky-500/40 font-bold'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-900 text-sky-400 text-[10px] font-black border border-slate-700">
                  {cmd.keys[0]}
                </span>
                <span>{cmd.name}</span>
              </div>
              <span className="text-[10px] text-slate-400 font-sans">{cmd.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main Command Bar */}
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-800 shadow-2xl text-xs text-slate-200 hover:border-sky-500/60 transition-colors">
        <div className="flex items-center gap-1.5 text-sky-400 font-bold">
          <Terminal className="w-3.5 h-3.5" />
          <span className="text-[11px] text-slate-400">CMD:</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder="Befehl eingeben (z. B. W für Wand, M für Messen, 3D...)"
          className="bg-transparent border-none outline-none text-white text-xs placeholder:text-slate-500 w-56 sm:w-72 font-mono"
        />

        {feedback && (
          <span className="text-sky-400 text-[11px] font-bold animate-in fade-in duration-150 whitespace-nowrap">
            {feedback}
          </span>
        )}

        <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 text-[9px]">
          Enter ↵
        </kbd>
      </div>
    </div>
  );
};
