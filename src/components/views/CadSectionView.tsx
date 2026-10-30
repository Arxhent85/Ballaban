/**
 * Architectural Cross-Section View (Schnitt A-A) per DIN 1356-1
 * Fully projects real floor slab, walls with insulation, ceilings, roof rafters, and height markers.
 */

import React, { useMemo } from 'react';
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

  // Compute actual building dimensions
  const { spanM, wallHM, roofHM, leftWallThickM, rightWallThickM, interiorWallXs } = useMemo(() => {
    let minX = 0, maxX = 10, minY = 0, maxY = 8;
    if (floor.walls.length > 0) {
      minX = Math.min(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
      maxX = Math.max(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
      minY = Math.min(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
      maxY = Math.max(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
    }

    const houseSpan = Math.max(3.0, maxX - minX);
    const extWalls = floor.walls.filter((w) => w.isExterior);
    const avgH = extWalls.length > 0
      ? extWalls.reduce((sum, w) => sum + (w.height || 2.6), 0) / extWalls.length
      : 2.60;

    const roofPitch = project.roof?.pitch || 35;
    const calcRoofH = Math.max(1.2, (houseSpan / 2) * Math.tan((roofPitch * Math.PI) / 180));

    // Find interior walls cut by section line at midY
    const midY = (minY + maxY) / 2;
    const intWalls = floor.walls.filter((w) => !w.isExterior);
    const cutXs: { xM: number; thicknessM: number }[] = [];

    intWalls.forEach((w) => {
      const y1 = Math.min(w.start.y, w.end.y);
      const y2 = Math.max(w.start.y, w.end.y);
      if (y1 <= midY && midY <= y2) {
        // Vertical or angled wall crosses midY
        const t = (y2 - y1) > 1e-4 ? (midY - w.start.y) / (w.end.y - w.start.y) : 0.5;
        const xAtCut = w.start.x + (w.end.x - w.start.x) * t;
        const xRel = xAtCut - minX;
        if (xRel > 0.5 && xRel < houseSpan - 0.5) {
          cutXs.push({ xM: xRel, thicknessM: w.thickness || 0.115 });
        }
      }
    });

    return {
      spanM: Math.round(houseSpan * 100) / 100,
      wallHM: Math.round(avgH * 100) / 100,
      roofHM: Math.round(calcRoofH * 100) / 100,
      leftWallThickM: extWalls[0]?.thickness || 0.365,
      rightWallThickM: extWalls[1]?.thickness || 0.365,
      interiorWallXs: cutXs,
    };
  }, [floor.walls, project.roof]);

  const svgWidth = 880;
  const svgHeight = 540;
  const scale = 36; // px per meter
  const slabHM = 0.25;
  const ceilingSlabHM = 0.20;

  const startX = Math.max(60, (svgWidth - spanM * scale) / 2);
  const groundY = 400;

  const totalRoofRidgeY = groundY - (slabHM + wallHM + roofHM) * scale;
  const eavesY = groundY - (slabHM + wallHM) * scale;
  const ceilingY = groundY - (slabHM + wallHM) * scale;

  return (
    <div className="flex-1 h-full w-full bg-slate-950 flex flex-col overflow-y-auto p-6 text-slate-200 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <SplitSquareVertical className="w-5 h-5 text-emerald-400" />
            <span>Gebäudeschnitt A-A (Querschnitt nach DIN 1356-1)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Detaillierter architektonischer Querschnitt mit Bodenplatte, Innenwänden, Geschossdecke und Sparrendach
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-2.5 py-1 rounded bg-slate-900 border border-slate-800 font-mono text-emerald-400">
            Spannweite: {spanM.toFixed(2)} m · Maßstab 1:50
          </span>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-6 relative">
          <div className="absolute top-4 left-6 text-sm font-semibold text-emerald-400 font-mono">
            Schnitt A-A · {project.name || 'Bauvorhaben'}
          </div>

          <svg width={svgWidth} height={svgHeight} className="overflow-visible">
            {/* Ground Line (Gelände GOK ±0.00 / -0.15) */}
            <line x1="30" y1={groundY} x2={svgWidth - 30} y2={groundY} stroke="#64748b" strokeWidth="2.5" />
            <text x="40" y={groundY + 16} fill="#64748b" fontSize="10" fontFamily="JetBrains Mono">
              Gelände ±0,00 GOK
            </text>

            {/* Foundation / Streifenfundamente */}
            <rect
              x={startX - 15}
              y={groundY}
              width="45"
              height="65"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1.5"
            />
            <rect
              x={startX + spanM * scale - 30}
              y={groundY}
              width="45"
              height="65"
              fill="#1e293b"
              stroke="#475569"
              strokeWidth="1.5"
            />

            {/* Bodenplatte / Slab with insulation (d = 25cm) */}
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
              fill="#cbd5e1"
              fontSize="10"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              Stahlbeton-Bodenplatte d = 25 cm mit Perimeterdämmung
            </text>

            {/* Exterior Wall Left */}
            <rect
              x={startX}
              y={eavesY}
              width={leftWallThickM * scale}
              height={wallHM * scale}
              fill="#475569"
              stroke="#94a3b8"
              strokeWidth="1.8"
            />
            {/* Exterior Wall Right */}
            <rect
              x={startX + spanM * scale - rightWallThickM * scale}
              y={eavesY}
              width={rightWallThickM * scale}
              height={wallHM * scale}
              fill="#475569"
              stroke="#94a3b8"
              strokeWidth="1.8"
            />

            {/* Cut Interior Walls */}
            {interiorWallXs.map((iw, idx) => (
              <g key={idx}>
                <rect
                  x={startX + iw.xM * scale - (iw.thicknessM * scale) / 2}
                  y={eavesY}
                  width={iw.thicknessM * scale}
                  height={wallHM * scale}
                  fill="#64748b"
                  stroke="#cbd5e1"
                  strokeWidth="1.5"
                />
                <text
                  x={startX + iw.xM * scale}
                  y={eavesY + wallHM * scale * 0.5}
                  fill="#ffffff"
                  fontSize="8.5"
                  fontFamily="JetBrains Mono"
                  textAnchor="middle"
                  transform={`rotate(-90, ${startX + iw.xM * scale}, ${eavesY + wallHM * scale * 0.5})`}
                >
                  IW {Math.round(iw.thicknessM * 100)}cm
                </text>
              </g>
            ))}

            {/* Geschossdecke / Ceiling Slab */}
            <rect
              x={startX}
              y={eavesY - ceilingSlabHM * scale}
              width={spanM * scale}
              height={ceilingSlabHM * scale}
              fill="#1e293b"
              stroke="#64748b"
              strokeWidth="1.8"
            />
            <text
              x={startX + (spanM * scale) / 2}
              y={eavesY - (ceilingSlabHM * scale) / 2 + 3}
              fill="#94a3b8"
              fontSize="9"
              fontFamily="JetBrains Mono"
              textAnchor="middle"
            >
              Holzbalkendecke / Stahlbetondecke d = 20 cm
            </text>

            {/* Roof Rafters / Dachstuhl (Sparrendach) */}
            {/* Left Rafter */}
            <line
              x1={startX - 18}
              y1={eavesY}
              x2={startX + (spanM * scale) / 2}
              y2={totalRoofRidgeY}
              stroke="#d97706"
              strokeWidth="4"
            />
            {/* Right Rafter */}
            <line
              x1={startX + spanM * scale + 18}
              y1={eavesY}
              x2={startX + (spanM * scale) / 2}
              y2={totalRoofRidgeY}
              stroke="#d97706"
              strokeWidth="4"
            />
            {/* Kehlbalken (Collar beam) */}
            <line
              x1={startX + spanM * scale * 0.25}
              y1={eavesY - roofHM * scale * 0.45}
              x2={startX + spanM * scale * 0.75}
              y2={eavesY - roofHM * scale * 0.45}
              stroke="#b45309"
              strokeWidth="3"
            />

            {/* Room Labels inside section */}
            <text
              x={startX + spanM * scale * 0.3}
              y={groundY - slabHM * scale - wallHM * scale * 0.4}
              fill="#38bdf8"
              fontSize="11"
              fontFamily="JetBrains Mono"
              fontWeight="bold"
            >
              Wohnen / Essen
            </text>
            <text
              x={startX + spanM * scale * 0.3}
              y={groundY - slabHM * scale - wallHM * scale * 0.4 + 16}
              fill="#64748b"
              fontSize="9"
              fontFamily="JetBrains Mono"
            >
              Lichte Höhe LH = {wallHM.toFixed(2)} m
            </text>

            {/* DIN 1356 Höhenkoten (Level Elevation Markers) */}
            {/* Firstkote */}
            <g transform={`translate(${startX - 65}, ${totalRoofRidgeY})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="45,-4 55,0 45,4" fill="#94a3b8" />
              <text x="-6" y="4" fill="#34d399" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{(slabHM + wallHM + roofHM).toFixed(2)} OK First
              </text>
            </g>

            {/* Traufkote */}
            <g transform={`translate(${startX - 65}, ${eavesY})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="45,-4 55,0 45,4" fill="#94a3b8" />
              <text x="-6" y="4" fill="#38bdf8" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +{(slabHM + wallHM).toFixed(2)} OK Traufe
              </text>
            </g>

            {/* OKFF */}
            <g transform={`translate(${startX - 65}, ${groundY - slabHM * scale})`}>
              <line x1="0" y1="0" x2="55" y2="0" stroke="#94a3b8" strokeDasharray="3,3" />
              <polygon points="45,-4 55,0 45,4" fill="#94a3b8" />
              <text x="-6" y="4" fill="#f8fafc" fontSize="11" fontFamily="JetBrains Mono" textAnchor="end">
                +0,00 OKFF (Rohfußboden)
              </text>
            </g>

            {/* Dimension Chain at bottom */}
            <g transform={`translate(0, ${groundY + 45})`}>
              <line x1={startX} y1="0" x2={startX + spanM * scale} y2="0" stroke="#cbd5e1" strokeWidth="1.5" />
              <line x1={startX} y1="-6" x2={startX} y2="6" stroke="#cbd5e1" strokeWidth="1.5" />
              <line
                x1={startX + spanM * scale}
                y1="-6"
                x2={startX + spanM * scale}
                y2="6"
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
                {spanM.toFixed(2)} m (Gebäudequerschnitt)
              </text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
};
