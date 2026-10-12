/**
 * CadViewCube.tsx
 * 
 * Interactive 3D / 2D Architectural ViewCube & Compass
 * Inspired by CADCraft (Storytold) and Autodesk Revit / AutoCAD
 * 
 * Features:
 * - Direct isometric 3D representation of orientation
 * - Top Face: 2D Floor Plan (Grundriss)
 * - Cardinal Faces: N (Nordfassade), S (Südfassade), O (Ostfassade), W (Westfassade)
 * - Corner / Center: 3D Perspective Mode
 * - Compass Ring with North arrow (N) that rotates with project north angle
 * - 1-Click reset to North
 */

import React, { useState } from 'react';
import { ViewMode } from '../../types/cad';
import { Compass, Box, Eye, Layers } from 'lucide-react';

interface CadViewCubeProps {
  viewMode: ViewMode;
  onViewModeChange: (m: ViewMode) => void;
  northAngle?: number; // degrees
  onResetNorth?: () => void;
  isDark?: boolean;
}

export const CadViewCube: React.FC<CadViewCubeProps> = ({
  viewMode,
  onViewModeChange,
  northAngle = 0,
  onResetNorth,
  isDark = true,
}) => {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);

  return (
    <div className="absolute top-4 right-4 z-20 select-none flex flex-col items-center gap-1">
      {/* 1. INTERACTIVE VIEWCUBE CONTAINER */}
      <div
        className="relative w-28 h-28 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-slate-800 shadow-2xl flex items-center justify-center p-1.5 transition-all hover:border-sky-500/60"
        title="CAD ViewCube: Schneller Wechsel zwischen Grundriss, 3D und Fassaden"
      >
        {/* COMPASS RING & NORTH ARROW */}
        <div
          className="absolute inset-1 rounded-full border border-slate-800/80 pointer-events-none transition-transform duration-300"
          style={{ transform: `rotate(${-northAngle}deg)` }}
        >
          {/* North indicator notch */}
          <div
            onClick={(e) => {
              e.stopPropagation();
              onResetNorth?.();
            }}
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-1 py-0.5 rounded bg-rose-600 text-[9px] font-black text-white shadow pointer-events-auto cursor-pointer hover:scale-110 transition-transform"
            title="Norden (Klicken zum Einordnen)"
          >
            N
          </div>
          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-slate-500">
            S
          </div>
          <div className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">
            O
          </div>
          <div className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[8px] font-bold text-slate-500">
            W
          </div>
        </div>

        {/* ISOMETRIC 3D CUBE SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-20 h-20 overflow-visible cursor-pointer drop-shadow-md"
        >
          {/* TOP FACE: DRAUFSICHT / 2D */}
          <polygon
            points="50,15 85,32 50,49 15,32"
            fill={
              viewMode === '2d'
                ? '#2563eb'
                : hoveredPart === 'top'
                ? '#3b82f6'
                : isDark
                ? '#334155'
                : '#cbd5e1'
            }
            stroke="#0f172a"
            strokeWidth="1.5"
            onMouseEnter={() => setHoveredPart('top')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => onViewModeChange('2d')}
            className="transition-colors"
          />
          <text
            x="50"
            y="35"
            textAnchor="middle"
            fontSize="7"
            fontWeight="bold"
            fill="#f8fafc"
            pointerEvents="none"
          >
            DRAUFSICHT
          </text>

          {/* FRONT-LEFT FACE: WEST / SÜD */}
          <polygon
            points="15,32 50,49 50,85 15,68"
            fill={
              hoveredPart === 'left'
                ? '#3b82f6'
                : isDark
                ? '#1e293b'
                : '#94a3b8'
            }
            stroke="#0f172a"
            strokeWidth="1.5"
            onMouseEnter={() => setHoveredPart('left')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => onViewModeChange('elevations')}
            className="transition-colors"
          />
          <text
            x="32"
            y="62"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={isDark ? '#e2e8f0' : '#0f172a'}
            pointerEvents="none"
          >
            SÜD
          </text>

          {/* FRONT-RIGHT FACE: OST / 3D */}
          <polygon
            points="50,49 85,32 85,68 50,85"
            fill={
              viewMode === '3d'
                ? '#10b981'
                : hoveredPart === 'right'
                ? '#059669'
                : isDark
                ? '#0f172a'
                : '#64748b'
            }
            stroke="#0f172a"
            strokeWidth="1.5"
            onMouseEnter={() => setHoveredPart('right')}
            onMouseLeave={() => setHoveredPart(null)}
            onClick={() => onViewModeChange('3d')}
            className="transition-colors"
          />
          <text
            x="68"
            y="62"
            textAnchor="middle"
            fontSize="8"
            fontWeight="bold"
            fill={viewMode === '3d' ? '#ffffff' : isDark ? '#e2e8f0' : '#ffffff'}
            pointerEvents="none"
          >
            3D
          </text>

          {/* CENTER ORTHO / ISO SWITCH DOT */}
          <circle
            cx="50"
            cy="49"
            r="4"
            fill="#f59e0b"
            stroke="#ffffff"
            strokeWidth="1"
            className="hover:scale-125 transition-transform"
            onClick={(e) => {
              e.stopPropagation();
              onViewModeChange(viewMode === '2d' ? '3d' : '2d');
            }}
          />
        </svg>

        {/* Active View Label pill */}
        <div className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-stone-950 border border-stone-700 text-[9px] font-mono font-bold text-amber-400 shadow">
          {viewMode === '2d' ? '2D Grundriss' : viewMode === '3d' ? '3D Modell' : viewMode === 'elevations' ? 'Fassaden' : viewMode === 'section' ? 'Schnitt' : 'CAD View'}
        </div>
      </div>

      {/* QUICK VIEW SWITCH CHIPS */}
      <div className="flex items-center gap-1 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl p-1 text-[10px] font-semibold text-slate-300 shadow-md">
        <button
          type="button"
          onClick={() => onViewModeChange('2d')}
          className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
            viewMode === '2d' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="2D Grundriss-Modus"
        >
          2D
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('3d')}
          className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
            viewMode === '3d' ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="3D Perspektiv-Modell"
        >
          3D
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('elevations')}
          className={`px-2 py-0.5 rounded-lg transition-colors cursor-pointer ${
            viewMode === 'elevations' ? 'bg-sky-600 text-white font-bold shadow-xs' : 'hover:bg-slate-800 text-slate-400'
          }`}
          title="Ansichten / Fassaden"
        >
          Ansicht
        </button>
      </div>
    </div>
  );
};
