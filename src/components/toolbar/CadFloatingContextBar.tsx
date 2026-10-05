/**
 * Floating Context Toolbar next to selected objects (Figma/Miro style)
 */

import React from 'react';
import { Copy, RotateCw, FlipHorizontal, Trash2, Lock } from 'lucide-react';
import { SelectionState, BoundingBox2D, Point2D } from '../../types/cad';

interface CadFloatingContextBarProps {
  selection: SelectionState;
  boundingBox: BoundingBox2D | null;
  worldToScreen: (p: Point2D) => Point2D;
  onDuplicate: () => void;
  onRotate90: () => void;
  onFlipHorizontal: () => void;
  onDelete: () => void;
}

export const CadFloatingContextBar: React.FC<CadFloatingContextBarProps> = ({
  selection,
  boundingBox,
  worldToScreen,
  onDuplicate,
  onRotate90,
  onFlipHorizontal,
  onDelete,
}) => {
  if (!boundingBox || selection.ids.length === 0 || selection.type === 'none') {
    return null;
  }

  // Position bar directly above the bounding box (safely clamped to stay inside viewport)
  const topCenterWorld: Point2D = {
    x: (boundingBox.minX + boundingBox.maxX) / 2,
    y: boundingBox.minY,
  };
  const screenPos = worldToScreen(topCenterWorld);
  const clampedY = Math.max(16, screenPos.y - 48);
  const clampedX = Math.max(130, screenPos.x);

  return (
    <div
      style={{
        position: 'absolute',
        left: `${clampedX}px`,
        top: `${clampedY}px`,
        transform: 'translateX(-50%)',
      }}
      className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl shadow-xl px-2 py-1 flex items-center gap-1.5 z-30 select-none animate-in fade-in zoom-in-95 duration-150 text-xs"
    >
      {selection.ids.length > 1 && (
        <span className="px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold text-[11px] border border-amber-300 dark:border-amber-800 whitespace-nowrap">
          {selection.ids.length} gewählt
        </span>
      )}

      <button
        onClick={onDuplicate}
        title="Duplizieren (Strg+D)"
        className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
      >
        <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </button>

      <button
        onClick={onRotate90}
        title="90° Drehen (R)"
        className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
      >
        <RotateCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </button>

      <button
        onClick={onFlipHorizontal}
        title="Horizontal spiegeln"
        className="p-1.5 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 transition-colors cursor-pointer"
      >
        <FlipHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
      </button>

      <div className="h-4 w-px bg-stone-200 dark:bg-stone-800 mx-0.5" />

      <button
        onClick={onDelete}
        title="Auswahl löschen (Entf / Backspace)"
        className="px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Löschen</span>
      </button>
    </div>
  );
};
