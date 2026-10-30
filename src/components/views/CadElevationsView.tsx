/**
 * Automatic Orthographic Architectural Elevations (Nord, Süd, Ost, West) per DIN 1356-1
 * Fully projects real exterior walls, doors, windows, and roof from the project.
 */

import React, { useState, useMemo } from 'react';
import { Floor, CadProject, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import { Compass, Download, ShieldCheck, Layers } from 'lucide-react';
import { projectBuildingElevation, FacadeDirection } from '../../utils/cadElevationProjection';

interface CadElevationsViewProps {
  project: CadProject;
  floor: Floor;
  language: Language;
}

export const CadElevationsView: React.FC<CadElevationsViewProps> = ({ project, floor, language }) => {
  const t = getT(language);
  const [activeDir, setActiveDir] = useState<FacadeDirection>('south');

  // Compute real projection from project data
  const proj = useMemo(() => {
    return projectBuildingElevation(project, floor, activeDir);
  }, [project, floor, activeDir]);

  // SVG Projection scaling
  const svgWidth = 880;
  const svgHeight = 540;
  const scale = 36; // px per meter
  const facadePxWidth = proj.facadeWidthM * scale;
  const startX = Math.max(60, (svgWidth - facadePxWidth) / 2);
  const groundY = 420;

  const wallPxHeight = proj.wallHeightM * scale;
  const ridgePxHeight = proj.ridgeHeightM * scale;
  const roofPxOverhang = proj.overhangM * scale;

  return (
    <div className="flex-1 h-full w-full bg-slate-950 flex flex-col overflow-y-auto p-6 text-slate-200 select-none">
      {/* Top Controls */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Compass className="w-5 h-5 text-emerald-400" />
            <span>Automatische Fassaden-Ansichten (DIN 1356-1)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Orthogonale Vektor-Projektion aller Außenwände, Fenster, Türen und Dachformen aus dem 3D-Modell
          </p>
        </div>

        {/* Direction Switcher Tabs */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
            {(['south', 'north', 'east', 'west'] as FacadeDirection[]).map((dir) => (
              <button
                key={dir}
                onClick={() => setActiveDir(dir)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  activeDir === dir ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {dir === 'south' ? 'Südansicht' : dir === 'north' ? 'Nordansicht' : dir === 'east' ? 'Ostansicht' : 'Westansicht'}
              </button>
            ))}
          </div>

          <div className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-emerald-400">
            M 1:100
          </div>
        </div>
      </div>

      {/* SVG Drawing Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
          <div className="absolute top-4 left-6 flex items-center gap-3">
            <span className="text-sm font-semibold text-emerald-400 font-mono">
              {proj.titleDe} · Werkplan / Bauantrag
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
              Breite: {proj.facadeWidthM.toFixed(2)} m · Dachneigung: {proj.roofPitchDeg}°
            </span>
          </div>

          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            <defs>
              {/* Glass subtle gradient */}
              <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
                <stop offset="50%" stopColor="#0284c7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.55" />
              </linearGradient>

              {/* Roof tile pattern */}
              <pattern id="roofTiles" width="16" height="10" patternUnits="userSpaceOnUse">
                <line x1="0" y1="10" x2="16" y2="10" stroke="#7f1d1d" strokeWidth="1" />
                <line x1="8" y1="0" x2="8" y2="10" stroke="#991b1b" strokeWidth="0.8" />
              </pattern>
            </defs>

            {/* Ground Line (Gelände -0.15 / ±0.00) */}
            <line x1="20" y1={groundY} x2={svgWidth - 20} y2={groundY} stroke="#64748b" strokeWidth="2.5" />
            <text x="30" y={groundY + 16} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
              Gelände ±0,00 GOK
            </text>

            {/* Facade Wall Body */}
            <rect
              x={startX}
              y={groundY - wallPxHeight}
              width={facadePxWidth}
              height={wallPxHeight}
              fill="#27272a"
              stroke="#52525b"
              strokeWidth="2"
            />

            {/* Facade Wall Texture (Horizontal Timber or Plaster Joints) */}
            {Array.from({ length: 8 }).map((_, i) => (
              <line
                key={i}
                x1={startX}
                y1={groundY - (i + 1) * (wallPxHeight / 9)}
                x2={startX + facadePxWidth}
                y2={groundY - (i + 1) * (wallPxHeight / 9)}
                stroke="#3f3f46"
                strokeWidth="0.8"
                strokeDasharray="4,2"
              />
            ))}

            {/* Roof Projection */}
            {proj.isGableSide ? (
              // Gable Triangle (Giebelseite)
              <polygon
                points={`
                  ${startX - roofPxOverhang},${groundY - wallPxHeight}
                  ${startX + facadePxWidth / 2},${groundY - ridgePxHeight}
                  ${startX + facadePxWidth + roofPxOverhang},${groundY - wallPxHeight}
                `}
                fill="#881337"
                stroke="#be123c"
                strokeWidth="2.5"
              />
            ) : (
              // Eaves / Trapezoid / Hip slope (Traufenseite)
              <polygon
                points={`
                  ${startX - roofPxOverhang},${groundY - wallPxHeight}
                  ${startX + facadePxWidth + roofPxOverhang},${groundY - wallPxHeight}
                  ${startX + facadePxWidth},${groundY - ridgePxHeight}
                  ${startX},${groundY - ridgePxHeight}
                `}
                fill="#881337"
                stroke="#be123c"
                strokeWidth="2.5"
              />
            )}

            {/* Eaves Line (Traufkante) */}
            <line
              x1={startX - roofPxOverhang}
              y1={groundY - wallPxHeight}
              x2={startX + facadePxWidth + roofPxOverhang}
              y2={groundY - wallPxHeight}
              stroke="#fda4af"
              strokeWidth="2"
            />

            {/* Real Project Openings (Doors & Windows) */}
            {proj.openings.map((op) => {
              const opX = startX + op.xM * scale;
              const opW = op.widthM * scale;
              const opH = op.heightM * scale;
              const opY = groundY - (op.bottomM + op.heightM) * scale;

              if (op.type === 'door') {
                return (
                  <g key={op.id}>
                    {/* Door frame */}
                    <rect
                      x={opX}
                      y={opY}
                      width={opW}
                      height={opH}
                      fill="#0f766e"
                      stroke="#2dd4bf"
                      strokeWidth="2"
                    />
                    {/* Door panel / glass insert */}
                    <rect
                      x={opX + 4}
                      y={opY + 4}
                      width={Math.max(2, opW - 8)}
                      height={Math.max(2, opH - 8)}
                      fill="url(#glassGrad)"
                      stroke="#14b8a6"
                      strokeWidth="1"
                    />
                    {/* Door Handle */}
                    <circle cx={opX + opW - 8} cy={opY + opH * 0.52} r="2.5" fill="#f8fafc" />
                    {/* Dimension annotation below */}
                    <text
                      x={opX + opW / 2}
                      y={groundY - 6}
                      fill="#5eead4"
                      fontSize="9"
                      fontFamily="JetBrains Mono"
                      textAnchor="middle"
                    >
                      {op.widthM.toFixed(2)} / {op.heightM.toFixed(2)}
                    </text>
                  </g>
                );
              }

              // Window
              return (
                <g key={op.id}>
                  {/* Window frame */}
                  <rect
                    x={opX}
                    y={opY}
                    width={opW}
                    height={opH}
                    fill="#1e293b"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />
                  {/* Glass pane */}
                  <rect
                    x={opX + 3}
                    y={opY + 3}
                    width={Math.max(2, opW - 6)}
                    height={Math.max(2, opH - 6)}
                    fill="url(#glassGrad)"
                    stroke="#0ea5e9"
                    strokeWidth="1"
                  />
                  {/* Window sill */}
                  <line
                    x1={opX - 3}
                    y1={opY + opH}
                    x2={opX + opW + 3}
                    y2={opY + opH}
                    stroke="#e2e8f0"
                    strokeWidth="2"
                  />
                  {/* Tilt / Turn architectural dashed triangle */}
                  <line
                    x1={opX + 4}
                    y1={opY + opH - 4}
                    x2={opX + opW / 2}
                    y2={opY + 4}
                    stroke="#bae6fd"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                  <line
                    x1={opX + opW - 4}
                    y1={opY + opH - 4}
                    x2={opX + opW / 2}
                    y2={opY + 4}
                    stroke="#bae6fd"
                    strokeWidth="0.8"
                    strokeDasharray="2,2"
                  />
                  {/* Lintel / Parapet callout */}
                  <text
                    x={opX + opW / 2}
                    y={opY + opH + 11}
                    fill="#38bdf8"
                    fontSize="8.5"
                    fontFamily="JetBrains Mono"
                    textAnchor="middle"
                  >
                    BRH {Math.round(op.parapetM * 100)}
                  </text>
                </g>
              );
            })}

            {/* DIN 1356 Höhenkoten (Level Height Markers) */}
            {/* Firsthöhe (Ridge) */}
            <g transform={`translate(${startX - 65}, ${groundY - ridgePxHeight})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="45,-4 55,0 45,4" fill="#94a3b8" />
              <text x="-6" y="4" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{proj.ridgeHeightM.toFixed(2)} FH (First)
              </text>
            </g>

            {/* Traufhöhe (Eaves) */}
            <g transform={`translate(${startX - 65}, ${groundY - wallPxHeight})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="45,-4 55,0 45,4" fill="#94a3b8" />
              <text x="-6" y="4" fill="#38bdf8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{proj.eavesHeightM.toFixed(2)} TH (Traufe)
              </text>
            </g>

            {/* Rohfußboden OKFF */}
            <g transform={`translate(${startX - 65}, ${groundY})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="45,-4 55,0 45,4" fill="#94a3b8" />
              <text x="-6" y="4" fill="#f8fafc" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                ±0,00 OKFF
              </text>
            </g>

            {/* Exterior Dimension Chain at Bottom */}
            <g transform={`translate(0, ${groundY + 38})`}>
              <line x1={startX} y1="0" x2={startX + facadePxWidth} y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1={startX} y1="-6" x2={startX} y2="6" stroke="#cbd5e1" strokeWidth="1.5" />
              <line
                x1={startX + facadePxWidth}
                y1="-6"
                x2={startX + facadePxWidth}
                y2="6"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <text
                x={startX + facadePxWidth / 2}
                y="-6"
                fill="#ffffff"
                fontSize="11"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {proj.facadeWidthM.toFixed(2)} m (Gebäudebreite)
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
