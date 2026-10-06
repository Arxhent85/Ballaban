/**
 * Touch-First Floating CAD Controls & Virtual Numpad (Procreate/iPad optimized)
 * 
 * Includes:
 * - Floating [Fertig ✓] and [Abbrechen ✕] action buttons (replaces Enter/Esc)
 * - Quick Touch Chips: Multi-Select, Ortho, Magnet, GuideLines, Pencil Mode, Loupe
 * - Compact On-Screen CAD Numpad for effortless touch dimension entry
 * - 3-Finger Clipboard Action Sheet (Copy, Cut, Paste, Duplicate)
 * - Focus Mode Exit Button
 * - 3D First-Person Virtual Touch Joysticks
 */

import React, { useState } from 'react';
import {
  Check,
  X,
  Magnet,
  Maximize2,
  Copy,
  Scissors,
  ClipboardPaste,
  Trash2,
  Delete,
  CornerDownLeft,
  ChevronUp,
  Compass,
  Eye,
  Sliders,
  Move,
  Search,
} from 'lucide-react';
import { PencilMode, PrecisionMode } from '../../types/cad';

interface CadTouchControlsProps {
  // Active drawing state
  isDrawingActive: boolean;
  onFinishDrawing?: () => void;
  onCancelDrawing?: () => void;

  // Touch toggles
  isMultiSelectMode: boolean;
  onToggleMultiSelect: () => void;
  isOrthoLocked: boolean;
  onToggleOrtho: () => void;
  isSnapEnabled: boolean;
  onToggleSnap: () => void;
  pencilMode: PencilMode;
  onTogglePencilMode: () => void;
  precisionMode: PrecisionMode;
  onTogglePrecisionMode: () => void;

  // View rotation
  viewRotationDeg: number;
  onResetRotation?: () => void;

  // Virtual Numpad
  showNumpad: boolean;
  onToggleNumpad: () => void;
  numpadValue: string;
  numpadMode: 'length' | 'angle';
  onNumpadInput: (char: string) => void;
  onNumpadBackspace: () => void;
  onNumpadClear: () => void;
  onNumpadSwitchMode: () => void;
  onNumpadCommit: () => void;

  // 3-Finger Clipboard Sheet
  showClipboardSheet: boolean;
  onCloseClipboardSheet: () => void;
  onCopy?: () => void;
  onCut?: () => void;
  onPaste?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  hasSelection: boolean;

  // Layout mode
  isLeftHanded?: boolean;
}

export const CadTouchControls: React.FC<CadTouchControlsProps> = ({
  isDrawingActive,
  onFinishDrawing,
  onCancelDrawing,
  isMultiSelectMode,
  onToggleMultiSelect,
  isOrthoLocked,
  onToggleOrtho,
  isSnapEnabled,
  onToggleSnap,
  pencilMode,
  onTogglePencilMode,
  precisionMode,
  onTogglePrecisionMode,
  viewRotationDeg,
  onResetRotation,
  showNumpad,
  onToggleNumpad,
  numpadValue,
  numpadMode,
  onNumpadInput,
  onNumpadBackspace,
  onNumpadClear,
  onNumpadSwitchMode,
  onNumpadCommit,
  showClipboardSheet,
  onCloseClipboardSheet,
  onCopy,
  onCut,
  onPaste,
  onDuplicate,
  onDelete,
  hasSelection,
  isLeftHanded = false,
}) => {
  return (
    <>
      {/* 1. ROTATION RESET CHIP (When view is rotated with 2 fingers) */}
      {Math.abs(viewRotationDeg) > 1 && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-40 animate-in fade-in duration-200">
          <button
            onClick={onResetRotation}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-950/85 text-amber-200 border border-amber-500/60 rounded-full shadow-xl backdrop-blur-md text-xs font-mono font-medium hover:bg-amber-900 cursor-pointer active:scale-95"
          >
            <Compass className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Drehung: {Math.round(viewRotationDeg)}° • Nord ausrichten ↺</span>
          </button>
        </div>
      )}

      {/* 2. FLOATING PRIMARY ACTION BUTTONS [Fertig ✓] & [Abbrechen ✕] (When drawing walls / plot) */}
      {isDrawingActive && (
        <div
          className={`fixed bottom-12 ${
            isLeftHanded ? 'left-6' : 'right-6'
          } z-40 flex items-center gap-2.5 animate-in slide-in-from-bottom-4 duration-150`}
        >
          {onCancelDrawing && (
            <button
              onClick={onCancelDrawing}
              title="Aktion abbrechen (Esc)"
              className="h-13 px-4.5 rounded-2xl bg-stone-800/95 hover:bg-stone-700 text-stone-200 border border-stone-600/80 shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-semibold active:scale-95 transition-all cursor-pointer"
            >
              <X className="w-5 h-5 text-red-400" />
              <span>Abbrechen</span>
            </button>
          )}

          {onFinishDrawing && (
            <button
              onClick={onFinishDrawing}
              title="Wandkette oder Form abschließen (Enter / Doppel-Tipp)"
              className="h-13 px-6 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white border border-amber-400/60 shadow-2xl backdrop-blur-md flex items-center gap-2 text-sm font-bold active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-5 h-5 text-white" />
              <span>Fertig ✓</span>
            </button>
          )}
        </div>
      )}

      {/* 3. SLENDER FLOATING QUICK TOUCH CHIPS BAR (Bottom-Left / Right) */}
      <div
        className={`fixed bottom-3 ${
          isLeftHanded ? 'right-4' : 'left-4'
        } z-30 flex flex-wrap items-center gap-1.5 p-1 bg-stone-900/80 backdrop-blur-md border border-stone-700/60 rounded-2xl shadow-xl max-w-[85vw]`}
      >
          {/* Multi-Select Toggle */}
          <button
            onClick={onToggleMultiSelect}
            title={isMultiSelectMode ? 'Mehrfachauswahl aktiv (Tippen fügt hinzu)' : 'Einzelauswahl'}
            className={`h-9 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isMultiSelectMode
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800/80'
            }`}
          >
            <span>+ Mehrfach</span>
          </button>

          {/* Ortho Lock Toggle */}
          <button
            onClick={onToggleOrtho}
            title={isOrthoLocked ? '90° Winkel gesperrt (Ortho aktiv)' : 'Freie Winkel'}
            className={`h-9 px-2.5 rounded-xl flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              isOrthoLocked
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800/80'
            }`}
          >
            <span>90° Ortho</span>
          </button>

          {/* Magnet / Snap Toggle */}
          <button
            onClick={onToggleSnap}
            title={isSnapEnabled ? 'Magnetisches Fangen aktiv' : 'Fangen deaktiviert'}
            className={`h-9 px-2.5 rounded-xl flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              isSnapEnabled
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-stone-400 hover:bg-stone-800/80'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Fang</span>
          </button>

          {/* Pencil Mode Toggle */}
          <button
            onClick={onTogglePencilMode}
            title={
              pencilMode === 'finger_draws_too'
                ? 'Stift & Finger können beide zeichnen, auswählen und platzieren'
                : 'Nur Stift zeichnet • 1 Finger verschiebt'
            }
            className={`h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
              pencilMode === 'finger_draws_too'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800/80'
            }`}
          >
            <span>{pencilMode === 'finger_draws_too' ? '✏️👆 Stift & Finger' : '✏️ Nur Stift'}</span>
          </button>

          {/* Precision Loupe Toggle */}
          <button
            onClick={onTogglePrecisionMode}
            title={
              precisionMode === 'offset_crosshair'
                ? 'Präzisions-Lupe & Versatz-Fadenkreuz aktiv'
                : 'Direkter Zeiger'
            }
            className={`h-9 px-2.5 rounded-xl flex items-center gap-1 text-xs font-semibold transition-all cursor-pointer ${
              precisionMode === 'offset_crosshair'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-stone-300 hover:bg-stone-800/80'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Lupe</span>
          </button>

          {/* CAD Numpad Opener Button */}
          <button
            onClick={onToggleNumpad}
            title="CAD Ziffernblock einblenden"
            className={`h-9 px-2.5 rounded-xl flex items-center gap-1 text-xs font-mono font-bold transition-all cursor-pointer ${
              showNumpad
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-amber-400 hover:bg-stone-800/80'
            }`}
          >
            <span>123</span>
          </button>
        </div>

      {/* 5. VIRTUAL TOUCH CAD NUMPAD (Effortless touch dimension entry without OS keyboard) */}
      {showNumpad && (
        <div
          className={`fixed bottom-14 ${
            isLeftHanded ? 'left-4' : 'right-4'
          } z-40 bg-stone-900/95 backdrop-blur-xl border border-stone-700/80 rounded-3xl p-3 shadow-2xl w-64 text-stone-100 animate-in zoom-in-95 duration-150 select-none`}
        >
          {/* Header & Display */}
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-800">
            <div className="flex items-center gap-1.5">
              <button
                onClick={onNumpadSwitchMode}
                className="px-2 py-0.5 rounded-lg bg-stone-800 text-[11px] font-semibold text-amber-400 hover:bg-stone-700 cursor-pointer"
              >
                {numpadMode === 'length' ? '📏 Länge (m)' : '📐 Winkel (°)'}
              </button>
            </div>
            <button
              onClick={onToggleNumpad}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-white hover:bg-stone-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Number Display Screen */}
          <div className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2 mb-3 flex items-center justify-between">
            <span className="text-xl font-mono font-bold text-amber-300">
              {numpadValue || '0.00'}
            </span>
            <span className="text-xs text-stone-400 font-mono">
              {numpadMode === 'length' ? 'm' : '°'}
            </span>
          </div>

          {/* Keypad Grid (44pt touch targets) */}
          <div className="grid grid-cols-4 gap-1.5">
            {['7', '8', '9', 'C'].map((k) => (
              <button
                key={k}
                onClick={() => (k === 'C' ? onNumpadClear() : onNumpadInput(k))}
                className={`h-11 rounded-xl text-base font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                  k === 'C'
                    ? 'bg-stone-800 text-red-400 hover:bg-stone-700'
                    : 'bg-stone-850 hover:bg-stone-750 text-stone-100'
                }`}
              >
                {k}
              </button>
            ))}

            {['4', '5', '6', '⌫'].map((k) => (
              <button
                key={k}
                onClick={() => (k === '⌫' ? onNumpadBackspace() : onNumpadInput(k))}
                className={`h-11 rounded-xl text-base font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                  k === '⌫'
                    ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                    : 'bg-stone-850 hover:bg-stone-750 text-stone-100'
                }`}
              >
                {k}
              </button>
            ))}

            {['1', '2', '3', '±'].map((k) => (
              <button
                key={k}
                onClick={() => (k === '±' ? onNumpadInput('-') : onNumpadInput(k))}
                className="h-11 rounded-xl text-base font-bold bg-stone-850 hover:bg-stone-750 text-stone-100 flex items-center justify-center transition-colors cursor-pointer active:scale-95"
              >
                {k}
              </button>
            ))}

            {['0', '.', '+0.5', '↵'].map((k) => (
              <button
                key={k}
                onClick={() => {
                  if (k === '↵') onNumpadCommit();
                  else if (k === '+0.5') onNumpadInput('+0.5');
                  else onNumpadInput(k);
                }}
                className={`h-11 rounded-xl text-base font-bold flex items-center justify-center transition-colors cursor-pointer active:scale-95 ${
                  k === '↵'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white font-black shadow-md'
                    : k === '+0.5'
                    ? 'bg-stone-800 text-xs font-mono text-amber-300 hover:bg-stone-700'
                    : 'bg-stone-850 hover:bg-stone-750 text-stone-100'
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 6. 3-FINGER SWIPE DOWN CLIPBOARD ACTION SHEET */}
      {showClipboardSheet && (
        <div
          onClick={onCloseClipboardSheet}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border border-stone-700/80 rounded-3xl p-4 shadow-2xl max-w-xs w-full flex flex-col gap-2 animate-in zoom-in-95 duration-150 text-stone-100"
          >
            <div className="flex items-center justify-between pb-2 border-b border-stone-800">
              <span className="text-xs font-bold text-stone-400">Zwischenablage (3-Finger-Geste)</span>
              <button
                onClick={onCloseClipboardSheet}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-stone-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                onDuplicate?.();
                onCloseClipboardSheet();
              }}
              disabled={!hasSelection}
              className="h-12 px-4 rounded-xl flex items-center gap-3 bg-stone-800/80 hover:bg-stone-700 disabled:opacity-40 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 text-amber-400" />
              <span>Duplizieren</span>
            </button>

            <button
              onClick={() => {
                onCopy?.();
                onCloseClipboardSheet();
              }}
              disabled={!hasSelection}
              className="h-12 px-4 rounded-xl flex items-center gap-3 bg-stone-800/80 hover:bg-stone-700 disabled:opacity-40 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Copy className="w-4 h-4 text-sky-400" />
              <span>Kopieren</span>
            </button>

            <button
              onClick={() => {
                onCut?.();
                onCloseClipboardSheet();
              }}
              disabled={!hasSelection}
              className="h-12 px-4 rounded-xl flex items-center gap-3 bg-stone-800/80 hover:bg-stone-700 disabled:opacity-40 text-sm font-semibold transition-colors cursor-pointer"
            >
              <Scissors className="w-4 h-4 text-purple-400" />
              <span>Ausschneiden</span>
            </button>

            <button
              onClick={() => {
                onPaste?.();
                onCloseClipboardSheet();
              }}
              className="h-12 px-4 rounded-xl flex items-center gap-3 bg-stone-800/80 hover:bg-stone-700 text-sm font-semibold transition-colors cursor-pointer"
            >
              <ClipboardPaste className="w-4 h-4 text-emerald-400" />
              <span>Einfügen</span>
            </button>

            <button
              onClick={() => {
                onDelete?.();
                onCloseClipboardSheet();
              }}
              disabled={!hasSelection}
              className="h-12 px-4 rounded-xl flex items-center gap-3 bg-red-950/60 hover:bg-red-900/60 disabled:opacity-40 text-red-300 text-sm font-semibold transition-colors cursor-pointer mt-1"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
              <span>Löschen</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
