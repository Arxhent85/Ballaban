/**
 * Export and Print Preview Dialog
 */

import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileText,
  Image,
  Code,
  Box,
  FileSpreadsheet,
  X,
  Check,
  Clipboard,
} from 'lucide-react';
import { CadProject, Floor, ScaleType, Language } from '../../types/cad';
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

  const [paperSize, setPaperSize] = useState<'a4' | 'a3'>('a4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [scale, setScale] = useState<'1:50' | '1:100' | '1:20'>('1:50');
  const [includeTitleBlock, setIncludeTitleBlock] = useState(true);
  const [includeLegend, setIncludeLegend] = useState(true);
  const [includeNorthArrow, setIncludeNorthArrow] = useState(true);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const handleDownloadPdf = () => {
    const opts: ExportPdfOptions = {
      paperSize,
      orientation,
      scale,
      includeTitleBlock,
      includeLegend,
      includeNorthArrow,
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
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-sm">{t.exportDialog.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          {/* Format Settings Grid */}
          <div className="grid grid-cols-3 gap-3">
            {/* Paper Size */}
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium">{t.exportDialog.paperSize}:</label>
              <select
                value={paperSize}
                onChange={(e) => setPaperSize(e.target.value as 'a4' | 'a3')}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none"
              >
                <option value="a4">DIN A4</option>
                <option value="a3">DIN A3 (Empfohlen)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium">{t.exportDialog.orientation}:</label>
              <select
                value={orientation}
                onChange={(e) => setOrientation(e.target.value as 'landscape' | 'portrait')}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none"
              >
                <option value="landscape">{t.exportDialog.landscape}</option>
                <option value="portrait">{t.exportDialog.portrait}</option>
              </select>
            </div>

            {/* Scale */}
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60 flex flex-col gap-1">
              <label className="text-slate-400 font-medium">{t.exportDialog.scale}:</label>
              <select
                value={scale}
                onChange={(e) => setScale(e.target.value as '1:50' | '1:100' | '1:20')}
                className="bg-slate-900 border border-slate-600 rounded px-2 py-1 text-slate-200 outline-none"
              >
                <option value="1:20">1:20 (Detailplan)</option>
                <option value="1:50">1:50 (Standard Bauplan)</option>
                <option value="1:100">1:100 (Übersichtsplan)</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTitleBlock}
                onChange={(e) => setIncludeTitleBlock(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-200">{t.exportDialog.includeTitleBlock} (Bauherr, Ort, Maßstab, Datum)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeNorthArrow}
                onChange={(e) => setIncludeNorthArrow(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-200">{t.exportDialog.includeNorthArrow}</span>
            </label>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <span className="font-semibold text-slate-300">Format zum Herunterladen wählen:</span>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadPdf}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <FileText className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-semibold text-white">Vektor-PDF</div>
                  <div className="text-[10px] text-slate-400">Maßstabsgetreu nach DIN</div>
                </div>
              </button>

              <button
                onClick={() => exportProjectDxf(project, floor)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <Code className="w-5 h-5 text-amber-500" />
                <div>
                  <div className="font-semibold text-white">AutoCAD DXF</div>
                  <div className="text-[10px] text-slate-400">Für CAD-Programme</div>
                </div>
              </button>

              <button
                onClick={() => exportProjectObj(project, floor)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <Box className="w-5 h-5 text-amber-400" />
                <div>
                  <div className="font-semibold text-white">3D Wavefront OBJ</div>
                  <div className="text-[10px] text-slate-400">Für Blender & 3D-Druck</div>
                </div>
              </button>

              <button
                onClick={() => exportQuantitiesCsv(project, floor)}
                className="p-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 flex items-center gap-3 transition-colors text-left"
              >
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="font-semibold text-white">Mengenliste (CSV)</div>
                  <div className="text-[10px] text-slate-400">Für Excel & Kalkulation</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
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
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>{t.exportDialog.printNow}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
