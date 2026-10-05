/**
 * Areas, Quantities, Bill of Materials, and Building Code Compliance Checker
 */

import React from 'react';
import { Floor, CadProject, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import { distance, formatArea, checkStairComfort, calculatePlotMetrics } from '../../utils/cadMath';
import { exportQuantitiesCsv } from '../../utils/cadExport';
import {
  Calculator,
  Download,
  CheckCircle2,
  AlertTriangle,
  Building,
  Home,
  Layers,
  DoorOpen,
  AppWindow,
  Ruler,
  Compass,
} from 'lucide-react';

interface CadQuantitiesViewProps {
  project: CadProject;
  floor: Floor;
  language: Language;
}

export const CadQuantitiesView: React.FC<CadQuantitiesViewProps> = ({ project, floor, language }) => {
  const t = getT(language);

  // Calculations
  let totalWallLengthM = 0;
  let extWallAreaM2 = 0;
  let intWallAreaM2 = 0;

  floor.walls.forEach((w) => {
    const len = distance(w.start, w.end);
    totalWallLengthM += len;
    if (w.isExterior) {
      extWallAreaM2 += len * w.height;
    } else {
      intWallAreaM2 += len * w.height;
    }
  });

  const totalLivingAreaM2 = floor.rooms
    .filter((r) => r.targetLivingArea !== false)
    .reduce((acc, r) => acc + r.areaM2, 0);

  const totalUsableAreaM2 = floor.rooms.reduce((acc, r) => acc + r.areaM2, 0);

  // Gross floor area (approx 1.15 x living area + walls)
  const bgfM2 = totalUsableAreaM2 * 1.18;
  const briM3 = bgfM2 * (floor.storyHeight || 2.75);

  let totalWindowAreaM2 = 0;
  floor.windows.forEach((w) => {
    totalWindowAreaM2 += w.width * w.height;
  });

  // Automated Building Code / Plan Checks
  const warnings: { id: string; text: string; severity: 'warning' | 'info' }[] = [];

  // Check 1: Rooms without daylight
  floor.rooms.forEach((r) => {
    if (r.category === 'living' || r.category === 'sleeping') {
      // Check if room has at least 1 window
      if (floor.windows.length === 0) {
        warnings.push({
          id: `no_win_${r.id}`,
          text: `${r.name}: Kein Fenster für natürliches Tageslicht nachgewiesen (LBO Vorgabe mind. 1/8 der Raumfläche).`,
          severity: 'warning',
        });
      }
    }
  });

  // Check 2: Minimum room height (2.40m standard)
  floor.rooms.forEach((r) => {
    if (r.height < 2.4) {
      warnings.push({
        id: `low_h_${r.id}`,
        text: `${r.name}: Raumhöhe von ${r.height.toFixed(2)} m unterschreitet empfohlene Mindesthöhe (2,40 m).`,
        severity: 'warning',
      });
    }
  });

  // Check 3: Narrow doors (< 80cm)
  floor.doors.forEach((d) => {
    if (d.width < 0.8) {
      warnings.push({
        id: `narrow_d_${d.id}`,
        text: `${d.name || 'Tür'}: Durchgangsbreite von ${(d.width * 100).toFixed(0)} cm unterschreitet Richtmaß (80 cm).`,
        severity: 'info',
      });
    }
  });

  // Check 4: Stair comfort formula
  floor.stairs.forEach((s) => {
    const comfort = checkStairComfort(s.stepHeight, s.stepDepth);
    if (!comfort.isComfortable && comfort.warning) {
      warnings.push({
        id: `stair_${s.id}`,
        text: `${s.name || 'Treppe'}: ${comfort.warning}`,
        severity: 'warning',
      });
    }
  });

  return (
    <div className="flex-1 h-full w-full bg-slate-950 flex flex-col overflow-y-auto p-6 text-slate-200 select-none">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-emerald-400" />
            <span>{t.quantities.title}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automatische Berechnung von Wohnflächen, Bruttorauminhalten, Wandabwicklungen und Bauteilmengen
          </p>
        </div>

        <button
          onClick={() => exportQuantitiesCsv(project, floor)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs shadow-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>{t.quantities.exportCsv}</span>
        </button>
      </div>

      <div className="mt-6 flex flex-col gap-6 max-w-5xl">
        {/* KPI Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">{t.livingArea}</span>
            <span className="text-2xl font-bold text-emerald-400 font-mono tabular-nums">
              {formatArea(totalLivingAreaM2)}
            </span>
            <span className="text-[11px] text-slate-500">nach WoFlV</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">{t.grossFloorArea}</span>
            <span className="text-2xl font-bold text-white font-mono tabular-nums">{formatArea(bgfM2)}</span>
            <span className="text-[11px] text-slate-500">DIN 277 BGF</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">{t.grossVolume}</span>
            <span className="text-2xl font-bold text-cyan-400 font-mono tabular-nums">
              {briM3.toFixed(1)} m³
            </span>
            <span className="text-[11px] text-slate-500">Umbauter Raum BRI</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-1">
            <span className="text-xs text-slate-400 font-medium">{t.quantities.wallLengths}</span>
            <span className="text-2xl font-bold text-amber-400 font-mono tabular-nums">
              {totalWallLengthM.toFixed(1)} m
            </span>
            <span className="text-[11px] text-slate-500">Wandabwicklung lfd. M.</span>
          </div>
        </div>

        {/* Grundstück & Baurecht (GRZ / GFZ / Baugrenzen) */}
        {project.plot && (
          (() => {
            const stats = calculatePlotMetrics(project.plot, floor.walls, project.floors.length);
            return (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Compass className="w-4 h-4 text-amber-500" />
                    <span>Grundstück, Baurecht & Baugrenzen</span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {project.plot.width} × {project.plot.depth} m ({stats.plotArea} m²)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-slate-500 text-[10px] font-sans">Grundfläche (GRZ):</span>
                    <span className={`text-sm font-bold ${stats.isGrzValid ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stats.actualGRZ} / {project.plot.maxGRZ}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {stats.isGrzValid ? '✓ Zulässig nach B-Plan' : '✗ Überschritten'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-slate-500 text-[10px] font-sans">Geschossfläche (GFZ):</span>
                    <span className={`text-sm font-bold ${stats.isGfzValid ? 'text-emerald-400' : 'text-red-400'}`}>
                      {stats.actualGFZ} / {project.plot.maxGFZ}
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {stats.isGfzValid ? '✓ Zulässig' : '✗ Überschritten'}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-slate-500 text-[10px] font-sans">Abstandsfläche:</span>
                    <span className="text-sm font-bold text-slate-200">
                      {(project.plot.setback || 3.0).toFixed(1)} m
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">nach LBO Baugrenze</span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex flex-col gap-0.5">
                    <span className="text-slate-500 text-[10px] font-sans">Baufenster:</span>
                    <span className="text-sm font-bold text-slate-200">
                      {stats.buildableArea} m²
                    </span>
                    <span className="text-[10px] text-slate-400 font-sans">
                      {stats.buildableWidth.toFixed(1)} × {stats.buildableDepth.toFixed(1)} m
                    </span>
                  </div>
                </div>
              </div>
            );
          })()
        )}

        {/* Automated Building Code & Plan Checker Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{t.quantities.codeChecks}</span>
          </div>

          {warnings.length === 0 ? (
            <div className="p-3 bg-emerald-950/40 border border-emerald-800/80 rounded-lg text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{t.quantities.allOk}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {warnings.map((w) => (
                <div
                  key={w.id}
                  className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                    w.severity === 'warning'
                      ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                      : 'bg-stone-850 border-stone-700/80 text-stone-200'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{w.text}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 1. Raumbuch (Room Schedule) Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Raumbuch & Flächenaufstellung</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-2 px-3">Raum</th>
                  <th className="py-2 px-3">Kategorie</th>
                  <th className="py-2 px-3 text-right">Fläche</th>
                  <th className="py-2 px-3 text-right">Umfang</th>
                  <th className="py-2 px-3 text-right">Raumhöhe</th>
                  <th className="py-2 px-3">Bodenbelag</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {floor.rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850">
                    <td className="py-2.5 px-3 font-sans font-semibold text-white">{r.name}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">{r.category}</td>
                    <td className="py-2.5 px-3 text-right text-emerald-400 font-semibold">
                      {r.areaM2.toFixed(2)} m²
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{r.perimeterM.toFixed(2)} m</td>
                    <td className="py-2.5 px-3 text-right text-slate-300">{r.height.toFixed(2)} m</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">{r.floorFinish}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 2. Window & Door Schedules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Windows */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <AppWindow className="w-4 h-4 text-cyan-400" />
              <span>Fensterliste ({floor.windows.length} Elemente)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 px-2">Bezeichnung</th>
                    <th className="py-1.5 px-2 text-right">Breite × Höhe</th>
                    <th className="py-1.5 px-2 text-right">BRH</th>
                    <th className="py-1.5 px-2">Glas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {floor.windows.map((w, i) => (
                    <tr key={w.id}>
                      <td className="py-2 px-2 font-sans text-white">{w.name || `Fenster ${i + 1}`}</td>
                      <td className="py-2 px-2 text-right text-cyan-400">
                        {(w.width * 100).toFixed(0)} × {(w.height * 100).toFixed(0)} cm
                      </td>
                      <td className="py-2 px-2 text-right text-slate-300">
                        {(w.parapetHeight * 100).toFixed(0)} cm
                      </td>
                      <td className="py-2 px-2 font-sans text-slate-400">{w.glazing}-fach</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Doors */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
              <DoorOpen className="w-4 h-4 text-amber-500" />
              <span>Türenliste ({floor.doors.length} Elemente)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-1.5 px-2">Bezeichnung</th>
                    <th className="py-1.5 px-2 text-right">Breite × Höhe</th>
                    <th className="py-1.5 px-2">Aufschlag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {floor.doors.map((d, i) => (
                    <tr key={d.id}>
                      <td className="py-2 px-2 font-sans text-white">{d.name || `Tür ${i + 1}`}</td>
                      <td className="py-2 px-2 text-right text-amber-400">
                        {(d.width * 100).toFixed(0)} × {(d.height * 100).toFixed(0)} cm
                      </td>
                      <td className="py-2 px-2 font-sans text-slate-300">
                        {d.swingDirection === 'left' ? 'DIN L' : 'DIN R'} ({d.openDirection === 'inside' ? 'Innen' : 'Außen'})
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
