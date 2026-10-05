/**
 * Architectural Cross-Section View (Schnitt A-A)
 * Shows floor slab build-up, foundation, walls with insulation hatches, ceiling, roof rafters, and levels
 */

import React from 'react';
import { Floor, CadProject, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import { SplitSquareVertical, Ruler, CheckCircle2 } from 'lucide-react';

interface CadSectionViewProps {
  project: CadProject;
  floor: Floor;
  language: Language;
}

export const CadSectionView: React.FC<CadSectionViewProps> = ({ project, floor, language }) => {
  const t = getT(language);

  const svgWidth = 840;
  const svgHeight = 520;
  const scale = 36; // px per meter
  const spanM = 8.0;
  const wallHM = 2.60;
  const roofHM = 2.40;
  const slabHM = 0.25;

  const startX = (svgWidth - spanM * scale) / 2;
  const groundY = 380;

  return (
    <div className="flex-1 h-full w-full bg-slate-950 flex flex-col overflow-y-auto p-6 text-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <SplitSquareVertical className="w-5 h-5 text-emerald-400" />
            <span>Gebäudeschnitt A-A (Querschnitt)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detaillierter architektonischer Schnitt durch Wohnraum, Geschossdecke und Dachstuhl mit Schichtaufbauten
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-emerald-400">
            Maßstab 1:50
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
          <div className="absolute top-4 left-6 text-sm font-semibold text-emerald-400 font-mono">
            Schnitt A-A · Ferienhaus
          </div>

          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            {/* Ground Line */}
            <line x1="40" y1={groundY} x2={svgWidth - 40} y2={groundY} stroke="#64748b" strokeWidth="2.5" />
            <text x="50" y={groundY + 16} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
              Gelände ±0.00
            </text>

            {/* Foundation / Streifenfundament */}
            <rect
              x={startX - 15}
              y={groundY}
              width="45"
              height="60"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1.5"
            />
            <rect
              x={startX + spanM * scale - 30}
              y={groundY}
              width="45"
              height="60"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Bodenplatte / Slab with insulation */}
            <rect
              x={startX}
              y={groundY - slabHM * scale}
              width={spanM * scale}
              height={slabHM * scale}
              fill="#334155"
              stroke="#64748b"
              strokeWidth="2"
            />
            <text
              x={startX + (spanM * scale) / 2}
              y={groundY - (slabHM * scale) / 2 + 4}
              fill="#94a3b8"
              fontSize="10"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              Stahlbeton-Bodenplatte d = 25 cm mit Wärmedämmung
            </text>

            {/* Exterior Wall Left */}
            <rect
              x={startX}
              y={groundY - (slabHM + wallHM) * scale}
              width={0.3 * scale}
              height={wallHM * scale}
              fill="#475569"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />
            {/* Exterior Wall Right */}
            <rect
              x={startX + spanM * scale - 0.3 * scale}
              y={groundY - (slabHM + wallHM) * scale}
              width={0.3 * scale}
              height={wallHM * scale}
              fill="#475569"
              stroke="#94a3b8"
              strokeWidth="1.5"
            />

            {/* Interior Dividing Wall */}
            <rect
              x={startX + spanM * scale * 0.55}
              y={groundY - (slabHM + wallHM) * scale}
              width={0.12 * scale}
              height={wallHM * scale}
              fill="#334155"
              stroke="#64748b"
              strokeWidth="1.2"
            />

            {/* Ceiling / Kehlbalkenlage */}
            <rect
              x={startX}
              y={groundY - (slabHM + wallHM) * scale}
              width={spanM * scale}
              height={0.2 * scale}
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="1.5"
            />
            <text
              x={startX + (spanM * scale) * 0.3}
              y={groundY - (slabHM + wallHM) * scale + 10}
              fill="#94a3b8"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              Holzbalkendecke d = 20 cm
            </text>

            {/* Roof Sparren / Rafters Triangle */}
            <polygon
              points={`
                ${startX - 20},${groundY - (slabHM + wallHM) * scale}
                ${startX + (spanM * scale) / 2},${groundY - (slabHM + wallHM + roofHM) * scale}
                ${startX + spanM * scale + 20},${groundY - (slabHM + wallHM) * scale}
              `}
              fill="none"
              stroke="#b45309"
              strokeWidth="3"
            />

            {/* Roof Covering (Ziegel) */}
            <polygon
              points={`
                ${startX - 25},${groundY - (slabHM + wallHM) * scale - 4}
                ${startX + (spanM * scale) / 2},${groundY - (slabHM + wallHM + roofHM) * scale - 4}
                ${startX + spanM * scale + 25},${groundY - (slabHM + wallHM) * scale - 4}
              `}
              fill="none"
              stroke="#ef4444"
              strokeWidth="2"
            />

            {/* Height Annotations */}
            {/* First */}
            <g transform={`translate(${startX - 60}, ${groundY - (slabHM + wallHM + roofHM) * scale})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="40,-4 50,0 40,4" fill="#94a3b8" />
              <text x="-5" y="4" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{(slabHM + wallHM + roofHM).toFixed(2)} First
              </text>
            </g>

            {/* UKRD */}
            <g transform={`translate(${startX - 60}, ${groundY - (slabHM + wallHM) * scale})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="40,-4 50,0 40,4" fill="#94a3b8" />
              <text x="-5" y="4" fill="#38bdf8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{(slabHM + wallHM).toFixed(2)} Decke
              </text>
            </g>

            {/* OKFF */}
            <g transform={`translate(${startX - 60}, ${groundY - slabHM * scale})`}>
              <line x1="0" y1="0" x2="50" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="40,-4 50,0 40,4" fill="#94a3b8" />
              <text x="-5" y="4" fill="#f8fafc" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                ±0.00 OKFF
              </text>
            </g>

            {/* Dimension Line across building span */}
            <g transform={`translate(0, ${groundY + 75})`}>
              <line x1={startX} y1="0" x2={startX + spanM * scale} y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1={startX} y1="-5" x2={startX} y2="5" stroke="#cbd5e1" strokeWidth="1.5" />
              <line
                x1={startX + spanM * scale}
                y1="-5"
                x2={startX + spanM * scale}
                y2="5"
                stroke="#cbd5e1"
                strokeWidth="1.5"
              />
              <text
                x={startX + (spanM * scale) / 2}
                y="-6"
                fill="#ffffff"
                fontSize="11"
                fontFamily="JetBrains Mono"
                textAnchor="middle"
              >
                {spanM.toFixed(2)} m
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
