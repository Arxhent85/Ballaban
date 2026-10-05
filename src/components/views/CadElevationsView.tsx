/**
 * Automatic Orthographic Architectural Elevations (Nord, Süd, Ost, West)
 */

import React, { useState } from 'react';
import { Floor, CadProject, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import { Compass, Download } from 'lucide-react';

interface CadElevationsViewProps {
  project: CadProject;
  floor: Floor;
  language: Language;
}

type Direction = 'south' | 'north' | 'east' | 'west';

export const CadElevationsView: React.FC<CadElevationsViewProps> = ({ project, floor, language }) => {
  const t = getT(language);
  const [activeDir, setActiveDir] = useState<Direction>('south');

  // Compute building dimensions
  let minX = 0, maxX = 10, minY = 0, maxY = 8;
  if (floor.walls.length > 0) {
    minX = Math.min(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
    maxX = Math.max(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
    minY = Math.min(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
    maxY = Math.max(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
  }

  const houseWidthM = Math.max(2, maxX - minX);
  const houseDepthM = Math.max(2, maxY - minY);
  const wallHeightM = 2.60;
  const roofHeightM = 2.40;
  const totalHeightM = wallHeightM + roofHeightM;

  const currentSpanM = activeDir === 'south' || activeDir === 'north' ? houseWidthM : houseDepthM;

  // SVG Projection scaling
  const svgWidth = 800;
  const svgHeight = 500;
  const scale = 35; // px per meter
  const startX = (svgWidth - currentSpanM * scale) / 2;
  const groundY = 400;

  const dirTitles: Record<Direction, string> = {
    south: 'Südansicht (Garten- & Terrassenseite)',
    north: 'Nordansicht (Eingangsseite)',
    east: 'Ostansicht (Morgensonne)',
    west: 'Westansicht (Abendsonne)',
  };

  return (
    <div className="flex-1 h-full w-full bg-slate-950 flex flex-col overflow-y-auto p-6 text-slate-200 select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>Automatische Fassaden-Ansichten</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Maßstabsgetreue 2D-Projektion der Gebäudeansichten mit Höhenkoten und Dachkonstruktion
          </p>
        </div>

        {/* Direction Switcher Tabs */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
          {(['south', 'north', 'east', 'west'] as Direction[]).map((dir) => (
            <button
              key={dir}
              onClick={() => setActiveDir(dir)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeDir === dir ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {dir === 'south' ? 'Süd' : dir === 'north' ? 'Nord' : dir === 'east' ? 'Ost' : 'West'}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Drawing Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
          <div className="absolute top-4 left-6 text-sm font-semibold text-emerald-400 font-mono">
            {dirTitles[activeDir]} · M 1:50
          </div>

          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            {/* Ground Line */}
            <line x1="20" y1={groundY} x2={svgWidth - 20} y2={groundY} stroke="#64748b" strokeWidth="2.5" />
            <text x="30" y={groundY + 16} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
              Gelände ±0.00
            </text>

            {/* Facade Wall Body */}
            <rect
              x={startX}
              y={groundY - wallHeightM * scale}
              width={currentSpanM * scale}
              height={wallHeightM * scale}
              fill="#334155"
              stroke="#64748b"
              strokeWidth="2"
            />

            {/* Timber or cladding lines */}
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1={startX}
                y1={groundY - (i + 1) * (wallHeightM * scale / 13)}
                x2={startX + currentSpanM * scale}
                y2={groundY - (i + 1) * (wallHeightM * scale / 13)}
                stroke="#1e293b"
                strokeWidth="1"
              />
            ))}

            {/* Roof Projection */}
            {activeDir === 'south' || activeDir === 'north' ? (
              // Traufenseite (eaves view)
              <polygon
                points={`
                  ${startX - 20},${groundY - wallHeightM * scale}
                  ${startX + currentSpanM * scale + 20},${groundY - wallHeightM * scale}
                  ${startX + currentSpanM * scale + 10},${groundY - totalHeightM * scale}
                  ${startX - 10},${groundY - totalHeightM * scale}
                `}
                fill="#7f1d1d"
                stroke="#991b1b"
                strokeWidth="2"
              />
            ) : (
              // Giebelseite (gable triangle view)
              <polygon
                points={`
                  ${startX - 15},${groundY - wallHeightM * scale}
                  ${startX + (currentSpanM * scale) / 2},${groundY - totalHeightM * scale}
                  ${startX + currentSpanM * scale + 15},${groundY - wallHeightM * scale}
                `}
                fill="#7f1d1d"
                stroke="#991b1b"
                strokeWidth="2"
              />
            )}

            {/* Chimney */}
            <rect
              x={startX + currentSpanM * scale * 0.7}
              y={groundY - totalHeightM * scale - 25}
              width="26"
              height="35"
              fill="#78350f"
              stroke="#451a03"
              strokeWidth="1.5"
            />

            {/* Windows & Doors on Facade */}
            {activeDir === 'south' && (
              <>
                {/* Patio Door */}
                <rect
                  x={startX + currentSpanM * scale * 0.65}
                  y={groundY - 2.15 * scale}
                  width={1.6 * scale}
                  height={2.15 * scale}
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                {/* Panorama Window */}
                <rect
                  x={startX + currentSpanM * scale * 0.15}
                  y={groundY - (0.85 + 1.3) * scale}
                  width={1.6 * scale}
                  height={1.3 * scale}
                  fill="#0284c7"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
              </>
            )}

            {activeDir === 'north' && (
              <>
                {/* Entrance Door */}
                <rect
                  x={startX + currentSpanM * scale * 0.3}
                  y={groundY - 2.1 * scale}
                  width={1.0 * scale}
                  height={2.1 * scale}
                  fill="#0f766e"
                  stroke="#14b8a6"
                  strokeWidth="2"
                />
              </>
            )}

            {/* Height Markers (Höhenkoten) */}
            {/* Firsthöhe */}
            <g transform={`translate(${startX - 60}, ${groundY - totalHeightM * scale})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="40,-4 50,0 40,4" fill="#94a3b8" />
              <text x="-5" y="4" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{(totalHeightM).toFixed(2)} First
              </text>
            </g>

            {/* Traufe / UKRD */}
            <g transform={`translate(${startX - 60}, ${groundY - wallHeightM * scale})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="40,-4 50,0 40,4" fill="#94a3b8" />
              <text x="-5" y="4" fill="#38bdf8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{(wallHeightM).toFixed(2)} Traufe
              </text>
            </g>

            {/* OKFF */}
            <g transform={`translate(${startX - 60}, ${groundY})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="40,-4 50,0 40,4" fill="#94a3b8" />
              <text x="-5" y="4" fill="#f8fafc" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                ±0.00 OKFF
              </text>
            </g>

            {/* Dimension Chain at Bottom */}
            <g transform={`translate(0, ${groundY + 35})`}>
              <line x1={startX} y1="0" x2={startX + currentSpanM * scale} y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1={startX} y1="-5" x2={startX} y2="5" stroke="#cbd5e1" strokeWidth="1.5" />
              <line
                x1={startX + currentSpanM * scale}
                y1="-5"
                x2={startX + currentSpanM * scale}
                y2="5"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <text
                x={startX + (currentSpanM * scale) / 2}
                y="-6"
                fill="#ffffff"
                fontSize="11"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {currentSpanM.toFixed(2)} m
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
