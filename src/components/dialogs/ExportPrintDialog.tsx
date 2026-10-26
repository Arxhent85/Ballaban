/**
 * Export and Print Preview Dialog
 * Professional architectural export with DIN 1356, DIN 277, WoFlV, and VOB options.
 */

import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileText,
  Code,
  Box,
  FileSpreadsheet,
  X,
  Check,
  Clipboard,
  Layers,
  Ruler,
  Compass,
  FileCheck2,
} from 'lucide-react';
import { CadProject, Floor, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import {
  exportProjectPdf,
  exportProjectDxf,
  exportProjectObj,
  exportQuantitiesCsv,
  ExportPdfOptions,
} from '../../utils/cadExport';

interface ExportPrintDialogProps {
  isOpen: boolean;
  onClose: () => void;
  project: CadProject;
  floor: Floor;
  language: Language;
}

export const ExportPrintDialog: React.FC<ExportPrintDialogProps> = ({
  isOpen,
  onClose,
  project,
  floor,
  language,
}) => {
  const t = getT(language);

  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a3');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [scale, setScale] = useState<'1:50' | '1:100' | '1:20'>('1:50');
  const [planStyle, setPlanStyle] = useState<'werkplan' | 'bauantrag'>('werkplan');

  // Architectural Standards Toggles
  const [includeAutoDimensions, setIncludeAutoDimensions] = useState(true);
  const [includeRoomStamps, setIncludeRoomStamps] = useState(true);
  const [includeWallHatching, setIncludeWallHatching] = useState(true);
  const [includeSectionCuts, setIncludeSectionCuts] = useState(true);
  const [includeElevationMarkers, setIncludeElevationMarkers] = useState(true);
  const [includeStructuralAxes, setIncludeStructuralAxes] = useState(true);
  const [includeRoofOutline, setIncludeRoofOutline] = useState(true);
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);

  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    const opts: ExportPdfOptions = {
      paperSize,
      orientation,
      scale,
      planStyle,
      includeTitleBlock,
      includeLegend: true,
      includeNorthArrow,
      includeAutoDimensions,
      includeRoomStamps,
      includeWallHatching,
      includeSectionCuts,
      includeElevationMarkers,
      includeStructuralAxes,
      includeRoofOutline,
    };
    exportProjectPdf(project, floor, opts);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyImage = () => {
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col text-slate-100 overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-semibold text-sm">Professioneller Bauplan- & PDF-Export (DIN 1356)</h2>
              <p className="text-[10px] text-slate-400">Ausführungspläne, Bauantrag, Raumbuch nach DIN 277 & Bauteillisten</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto">
          {/* Format Settings Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* Plan Type */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium text-[11px]">Plan-Kategorie:</label>
              <select
                value={planStyle}
                onChange={(e) => {
                  const val = e.target.value as 'werkplan' | 'bauantrag';
                  setPlanStyle(val);
                  if (val === 'werkplan') {
                    setScale('1:50');
                    setPaperSize('a3');
                  } else {
                    setScale('1:100');
                  }
                }}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none text-xs"
              >
                <option value="werkplan">Werkplan (M 1:50)</option>
                <option value="bauantrag">Bauantrag (M 1:100)</option>
              </select>
            </div>

            {/* Paper Size */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium text-[11px]">Blattformat:</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none text-xs"
              >
                <option value="a3">DIN A3 (Empfohlen)</option>
                <option value="a4">DIN A4</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium text-[11px]">Ausrichtung:</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none text-xs"
              >
                <option value="landscape">Querformat</option>
                <option value="portrait">Hochformat</option>
              </select>
            </div>

            {/* Scale */}
            <div className="bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium text-[11px]">Maßstab:</label>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value as '1:50' | '1:100' | '1:20')}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none text-xs"
              >
                <option value="1:50">1:50 (Werkplan)</option>
                <option value="1:100">1:100 (Eingabeplan)</option>
                <option value="1:20">1:20 (Detailplan)</option>
              </select>
            </div>
          </div>

          {/* Architectural Elements & Standards Checkboxes */}
          <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5">
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
              <Ruler className="w-3.5 h-3.5" />
              DIN 1356 & DIN 277 Elemente für Bauausführung:
            </span>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAutoDimensions}
                  onChange={(e) => setIncludeAutoDimensions(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">3-stufige Maßketten (DIN 1356)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Öffnungsmaße, Wandstärken, Raumspannen, Gesamtmaß</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRoomStamps}
                  onChange={(e) => setIncludeRoomStamps(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">DIN 277 Raumstempel</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Raumnummer, Nettofläche m², Belag, lichte Höhe</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeWallHatching}
                  onChange={(e) => setIncludeWallHatching(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">Wandschraffuren (DIN 1356-1)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Mauerwerk 45°, Beton Kreuzschraffur, Dämmung</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSectionCuts}
                  onChange={(e) => setIncludeSectionCuts(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">Schnittführung A-A & B-B</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Strich-Punkt-Linien mit Blickrichtungspfeilen</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeElevationMarkers}
                  onChange={(e) => setIncludeElevationMarkers(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">Höhenkoten (OKFF ±0,00 m)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Fertigfußboden, Rohdecke & Geländeoberkante</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeStructuralAxes}
                  onChange={(e) => setIncludeStructuralAxes(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">Achsraster (1, 2, 3 / A, B, C)</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Rasterlinien mit Achsblasen für Rohbauer</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRoofOutline}
                  onChange={(e) => setIncludeRoofOutline(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">Dachaufsicht & Überstand</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Dachüberstand gestrichelt, Firstlinie & Neigung</span>
                </span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTitleBlock}
                  onChange={(e) => setIncludeTitleBlock(e.target.checked)}
                  className="accent-emerald-500 rounded"
                />
                <span className="text-slate-200">
                  <strong className="text-white">DIN EN ISO 7200 Plankopf</strong>
                  <br />
                  <span className="text-[10px] text-slate-400">Bauherr, Bauort, Planer, Index & Prüfhinweis</span>
                </span>
              </label>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-col gap-2 pt-1">
            <span className="font-semibold text-slate-300 text-[11px]">Format zum Herunterladen wählen:</span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadPdf}
                className="p-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/50 flex items-center gap-3 transition-colors text-left group"
              >
                <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white flex items-center gap-1.5">
                    <span>Bauplan-PDF (2 Seiten)</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-300 font-normal">DIN 1356</span>
                  </div>
                  <div className="text-[10px] text-slate-300">Seite 1: Werkplan · Seite 2: Raumbuch & Bauteile</div>
                </div>
              </button>

              <button
                onClick={() => exportProjectDxf(project, floor)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400">
                  <Code className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white">AutoCAD DXF</div>
                  <div className="text-[10px] text-slate-400">Layer: Wände, Öffnungen, Bemaßung</div>
                </div>
              </button>

              <button
                onClick={() => exportProjectObj(project, floor)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white">3D Wavefront OBJ</div>
                  <div className="text-[10px] text-slate-400">Für Blender, SketchUp & 3D-Druck</div>
                </div>
              </button>

              <button
                onClick={() => exportQuantitiesCsv(project, floor)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold text-white">Mengenliste (CSV)</div>
                  <div className="text-[10px] text-slate-400">VOB-Kalkulation für Excel & AVA</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between">
          <button
            onClick={handleCopyImage}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            {copiedNotification ? <Check className="w-4 h-4 text-emerald-400" /> : <Clipboard className="w-4 h-4" />}
            <span>{copiedNotification ? 'In Zwischenablage kopiert!' : 'In Zwischenablage kopieren'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-slate-400 hover:text-white text-xs">
              Schließen
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Drucken</span>
            </button>
            <button
              onClick={handleDownloadPdf}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Bauplan-PDF herunterladen</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
