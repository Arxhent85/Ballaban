/**
 * Natural Language Architecture Modification ("Korrektur in Worten")
 * 
 * Allows users to dictate or type commands like:
 * "Die Wand links ist 30 cm dick", "Das Fenster im Bad ist 60 cm breit", "Das Wohnzimmer ist 4 m hoch"
 * Displays diff preview before applying. Changes are 100% undoable.
 */

import React, { useState } from 'react';
import { Sparkles, Mic, Check, X, AlertCircle, Loader2, ArrowRight, CornerDownLeft, Settings } from 'lucide-react';
import { Floor, CadProject } from '../../types/cad';
import { executeNaturalLanguageCorrection, getStoredApiKey } from '../../utils/geminiAi';

interface VoiceTextCorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CadProject;
  activeFloor: Floor;
  onApplyCorrection: (explanation: string, updatedFloor: Floor) => void;
  onOpenSettings: (tab: 'ai') => void;
}

export const VoiceTextCorrectionModal: React.FC<VoiceTextCorrectionModalProps> = ({
  isOpen,
  onClose,
  project,
  activeFloor,
  onApplyCorrection,
  onOpenSettings,
}) => {
  const [instruction, setInstruction] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewResult, setPreviewResult] = useState<{
    explanation: string;
    modifications: Array<{
      type: string;
      targetDescription: string;
      oldValue?: string;
      newValue: string;
    }>;
  } | null>(null);

  const [isListening, setIsListening] = useState<boolean>(false);

  if (!isOpen) return null;

  const quickSuggestions = [
    'Die linke Außenwand ist 36,5 cm dick',
    'Das Badezimmerfenster auf 60 cm Breite ändern',
    'Die Raumhöhe im Wohnzimmer auf 3,20 m erhöhen',
    'Alle Innentüren auf 88,5 cm vereinheitlichen',
    'Dachneigung auf 40 Grad anpassen',
  ];

  // Speech Recognition (if browser supports Web Speech API)
  const handleToggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Spracherkennung wird in diesem Browser nicht unterstützt. Bitte tippen Sie die Anweisung ein.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'de-DE';
      recognition.interimResults = false;
      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInstruction((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleAnalyzeInstruction = async () => {
    if (!instruction.trim()) return;
    const key = getStoredApiKey();
    if (!key) {
      setErrorMsg('Bitte hinterlegen Sie zuerst einen Gemini API-Schlüssel in den Einstellungen.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setPreviewResult(null);

    // Build plan context summary
    const summary = `
Geschoss: ${activeFloor.name}
Anzahl Wände: ${activeFloor.walls.length} (Außenwände: ${activeFloor.walls.filter((w) => w.isExterior).length})
Anzahl Türen: ${activeFloor.doors.length}
Anzahl Fenster: ${activeFloor.windows.length}
Räume: ${activeFloor.rooms.map((r) => `${r.name} (${r.areaM2} m²)`).join(', ') || 'Keine'}
Wandhöhen: Standard ${activeFloor.storyHeight}m
`;

    try {
      const res = await executeNaturalLanguageCorrection(instruction, summary, key);
      setPreviewResult(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Korrekturanalyse fehlgeschlagen.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!previewResult) return;

    // Apply adjustments directly to activeFloor elements
    const updatedFloor: Floor = {
      ...activeFloor,
      walls: activeFloor.walls.map((w) => {
        let newW = { ...w };
        for (const mod of previewResult.modifications) {
          if (mod.type === 'wall_thickness') {
            const num = parseFloat(mod.newValue.replace(',', '.').replace(/[^0-9.]/g, ''));
            if (num > 0) {
              const valM = num > 2 ? num / 100 : num; // e.g. 30 -> 0.30
              if (mod.targetDescription.toLowerCase().includes('außen') && w.isExterior) {
                newW.thickness = valM;
              } else if (!w.isExterior) {
                newW.thickness = valM;
              }
            }
          }
          if (mod.type === 'wall_height') {
            const num = parseFloat(mod.newValue.replace(',', '.').replace(/[^0-9.]/g, ''));
            if (num > 0) newW.height = num;
          }
        }
        return newW;
      }),
      windows: activeFloor.windows.map((win) => {
        let newWin = { ...win };
        for (const mod of previewResult.modifications) {
          if (mod.type === 'window_width') {
            const num = parseFloat(mod.newValue.replace(',', '.').replace(/[^0-9.]/g, ''));
            if (num > 0) newWin.width = num > 2 ? num / 100 : num;
          }
        }
        return newWin;
      }),
      doors: activeFloor.doors.map((d) => {
        let newD = { ...d };
        for (const mod of previewResult.modifications) {
          if (mod.type === 'door_width') {
            const num = parseFloat(mod.newValue.replace(',', '.').replace(/[^0-9.]/g, ''));
            if (num > 0) newD.width = num > 2 ? num / 100 : num;
          }
        }
        return newD;
      }),
    };

    onApplyCorrection(previewResult.explanation, updatedFloor);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-sm">Plan-Korrektur in Worten (KI)</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto max-h-[75vh]">
          <p className="text-slate-400 leading-relaxed">
            Schreiben oder diktieren Sie eine gewünschte Änderung. Die KI schlägt Ihnen eine Vorschau vor, die Sie vor der Übernahme prüfen können (vollständig rückgängig machbar).
          </p>

          {/* Input Area */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="z.B. 'Die linke Außenwand ist 36,5 cm dick und das Badezimmerfenster 60 cm breit'..."
                rows={3}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 pr-10 text-white text-xs outline-none focus:border-amber-500 resize-none leading-relaxed"
              />
              <button
                type="button"
                onClick={handleToggleVoice}
                title={isListening ? 'Zuhören beenden' : 'Spracheingabe starten'}
                className={`absolute right-2.5 bottom-2.5 p-2 rounded-lg cursor-pointer transition-colors ${
                  isListening ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {quickSuggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setInstruction(s)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-[11px] text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Action: Analyze */}
          <button
            onClick={handleAnalyzeInstruction}
            disabled={isLoading || !instruction.trim()}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin text-amber-200" /> : <Sparkles className="w-4 h-4 text-amber-200" />}
            <span>Änderung mit KI prüfen & vorschlagen</span>
          </button>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex flex-col gap-1.5 flex-1">
                <span>{errorMsg}</span>
                {errorMsg.includes('API-Schlüssel') && (
                  <button
                    onClick={() => onOpenSettings('ai')}
                    className="text-amber-400 font-semibold underline text-left cursor-pointer"
                  >
                    Einstellungen öffnen und Schlüssel eintragen →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Preview of Proposed Changes */}
          {previewResult && (
            <div className="p-4 rounded-xl bg-slate-850 border border-amber-500/50 flex flex-col gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Check className="w-4 h-4" />
                <span>Vorgeschlagene Änderungen:</span>
              </div>
              <p className="text-white leading-relaxed text-xs">
                {previewResult.explanation}
              </p>

              {previewResult.modifications.length > 0 && (
                <div className="flex flex-col gap-1.5 pt-1">
                  {previewResult.modifications.map((mod, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800 text-xs">
                      <span className="text-slate-300 font-medium">{mod.targetDescription}</span>
                      <div className="flex items-center gap-1.5 font-mono">
                        {mod.oldValue && <span className="text-slate-500 line-through">{mod.oldValue}</span>}
                        <ArrowRight className="w-3 h-3 text-amber-400" />
                        <span className="text-amber-300 font-bold">{mod.newValue}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
          >
            Abbrechen
          </button>

          {previewResult && (
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Änderung anwenden</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
