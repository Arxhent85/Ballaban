/**
 * CAD Preferences & Defaults Settings Modal
 * Configures central default values, snapping engine, and Google Gemini AI integration.
 */

import React, { useState, useEffect } from 'react';
import { Settings, X, Check, Magnet, Sparkles, Eye, EyeOff, Key, Trash2, CheckCircle2, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import { UnitType, ScaleType, Language, ProjectDefaults, SnapSettings } from '../../types/cad';
import { getT } from '../../i18n/translations';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
  getStoredModel,
  setStoredModel,
  testGeminiConnection,
  AVAILABLE_GEMINI_MODELS,
  isLocalStorageAvailable,
} from '../../utils/geminiAi';

interface SettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  unit: UnitType;
  onUnitChange: (u: UnitType) => void;
  scale: ScaleType;
  onScaleChange: (sc: ScaleType) => void;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  defaults?: ProjectDefaults;
  onUpdateDefaults?: (d: ProjectDefaults) => void;
  snapSettings?: SnapSettings;
  onSnapSettingsChange?: (s: SnapSettings) => void;
  initialTab?: 'standards' | 'snapping' | 'ai';
}

export const SettingsDialog: React.FC<SettingsDialogProps> = ({
  isOpen,
  onClose,
  unit,
  onUnitChange,
  scale,
  onScaleChange,
  language,
  onLanguageChange,
  defaults,
  onUpdateDefaults,
  snapSettings,
  onSnapSettingsChange,
  initialTab = 'standards',
}) => {
  const t = getT(language);
  const [activeTab, setActiveTab] = useState<'standards' | 'snapping' | 'ai'>(initialTab);

  // AI Settings State
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [selectedModel, setSelectedModel] = useState<string>(AVAILABLE_GEMINI_MODELS[0].id);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setApiKeyInput(getStoredApiKey());
      setSelectedModel(getStoredModel());
      setTestResult(null);
      setSaveSuccessMsg('');
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const currentDefaults: ProjectDefaults = defaults || {
    exteriorWallThickness: 0.30,
    interiorWallThickness: 0.115,
    wallHeight: 2.50,
    roomHeight: 2.50,
    doorWidth: 0.885,
    doorHeight: 2.05,
    doorLintel: 2.05,
    windowWidth: 1.20,
    windowHeight: 1.25,
    windowParapet: 0.90,
    windowLintel: 2.15,
    gridSize: 0.25,
    unit: 'm',
    setback: 3.00,
  };

  const handleUpdate = (field: keyof ProjectDefaults, val: any) => {
    if (onUpdateDefaults) {
      onUpdateDefaults({
        ...currentDefaults,
        [field]: val,
      });
    }
  };

  const toggleSnap = (key: keyof SnapSettings) => {
    if (onSnapSettingsChange && snapSettings) {
      onSnapSettingsChange({
        ...snapSettings,
        [key]: !snapSettings[key],
      });
    }
  };

  const updateSnap = <K extends keyof SnapSettings>(key: K, val: SnapSettings[K]) => {
    if (onSnapSettingsChange && snapSettings) {
      onSnapSettingsChange({
        ...snapSettings,
        [key]: val,
      });
    }
  };

  const handleSaveApiKey = () => {
    const res = setStoredApiKey(apiKeyInput);
    setStoredModel(selectedModel);
    if (res.isSessionOnly) {
      setSaveSuccessMsg('Schlüssel für die laufende Sitzung gesichert (Lokaler Speicher nicht verfügbar).');
    } else {
      setSaveSuccessMsg('Schlüssel sicher lokal auf Ihrem Gerät gespeichert.');
    }
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleDeleteApiKey = () => {
    clearStoredApiKey();
    setApiKeyInput('');
    setTestResult(null);
    setSaveSuccessMsg('API-Schlüssel gelöscht.');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testGeminiConnection(apiKeyInput, selectedModel);
      setTestResult(res);
      if (res.success && apiKeyInput) {
        setStoredApiKey(apiKeyInput);
        setStoredModel(selectedModel);
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-xl w-full flex flex-col text-slate-100 overflow-hidden max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-sm">CAD Programmeinstellungen</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-3 pt-2 gap-1.5 shrink-0">
          <button
            onClick={() => setActiveTab('standards')}
            className={`px-3 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'standards'
                ? 'bg-slate-900 text-amber-400 border-t border-x border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Standardwerte</span>
          </button>

          <button
            onClick={() => setActiveTab('snapping')}
            className={`px-3 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'snapping'
                ? 'bg-slate-900 text-amber-400 border-t border-x border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
            <span>Fangen & Hilfslinien</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-2 rounded-t-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-slate-900 text-amber-400 border-t border-x border-slate-700'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>KI (Gemini API)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 flex flex-col gap-4 text-xs overflow-y-auto flex-1">
          {/* TAB 1: STANDARDS & GENERAL */}
          {activeTab === 'standards' && (
            <>
              {/* General: Language & Units */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex flex-col gap-3">
                <span className="font-semibold text-white">Allgemein & Raster</span>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="text-slate-400">Sprache:</label>
                    <select
                      value={language}
                      onChange={(e) => onLanguageChange(e.target.value as Language)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 mt-1 outline-none font-medium"
                    >
                      <option value="de">Deutsch (DE)</option>
                      <option value="en">English (EN)</option>
                      <option value="sq">Shqip (SQ)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400">Maßeinheit:</label>
                    <select
                      value={unit}
                      onChange={(e) => onUnitChange(e.target.value as UnitType)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 mt-1 outline-none font-medium"
                    >
                      <option value="m">Meter (m)</option>
                      <option value="cm">Zentimeter (cm)</option>
                      <option value="mm">Millimeter (mm)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400">Rasterweite:</label>
                    <select
                      value={snapSettings?.gridSize ?? 0.25}
                      onChange={(e) => {
                        const g = parseFloat(e.target.value);
                        if (onSnapSettingsChange && snapSettings) {
                          onSnapSettingsChange({ ...snapSettings, gridSize: g });
                        }
                        handleUpdate('gridSize', g);
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 mt-1 outline-none font-medium"
                    >
                      <option value="0.05">5 cm</option>
                      <option value="0.10">10 cm</option>
                      <option value="0.25">25 cm</option>
                      <option value="0.50">50 cm</option>
                      <option value="1.00">1,0 m</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Architectural Dimensions */}
              <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex flex-col gap-3">
                <span className="font-semibold text-white">Architektur-Standardmaße</span>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400">Außenwandstärke:</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={currentDefaults.exteriorWallThickness}
                        onChange={(e) => handleUpdate('exteriorWallThickness', parseFloat(e.target.value) || 0.30)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-right"
                      />
                      <span className="text-slate-500 font-mono">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400">Innenwandstärke:</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.005"
                        value={currentDefaults.interiorWallThickness}
                        onChange={(e) => handleUpdate('interiorWallThickness', parseFloat(e.target.value) || 0.115)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-right"
                      />
                      <span className="text-slate-500 font-mono">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400">Standard-Wandhöhe:</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.05"
                        value={currentDefaults.wallHeight}
                        onChange={(e) => handleUpdate('wallHeight', parseFloat(e.target.value) || 2.50)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-right"
                      />
                      <span className="text-slate-500 font-mono">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400">Standard-Türbreite:</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.01"
                        value={currentDefaults.doorWidth}
                        onChange={(e) => handleUpdate('doorWidth', parseFloat(e.target.value) || 0.885)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-right"
                      />
                      <span className="text-slate-500 font-mono">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400">Standard-Fensterbreite:</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.05"
                        value={currentDefaults.windowWidth}
                        onChange={(e) => handleUpdate('windowWidth', parseFloat(e.target.value) || 1.20)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-right"
                      />
                      <span className="text-slate-500 font-mono">m</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-400">Brüstungshöhe (Fenster):</label>
                    <div className="flex items-center gap-1 mt-1">
                      <input
                        type="number"
                        step="0.05"
                        value={currentDefaults.windowParapet}
                        onChange={(e) => handleUpdate('windowParapet', parseFloat(e.target.value) || 0.90)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 font-mono text-white text-right"
                      />
                      <span className="text-slate-500 font-mono">m</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SNAPPING & GUIDELINES */}
          {activeTab === 'snapping' && snapSettings && (
            <div className="bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-semibold text-white">
                  <Magnet className="w-4 h-4 text-amber-500" />
                  <span>Magnetisches Fangen & Intelligente Hilfslinien</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleSnap('enabled')}
                  className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                    snapSettings.enabled ? 'bg-amber-600 text-white hover:bg-amber-500' : 'bg-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {snapSettings.enabled ? 'Aktiviert' : 'Deaktiviert'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2">
                {[
                  { key: 'grid', label: 'Raster-Fang' },
                  { key: 'wallEndpoints', label: 'Wand-Endpunkte' },
                  { key: 'wallMidpoints', label: 'Wand-Mittelpunkte' },
                  { key: 'intersections', label: 'Schnittpunkte' },
                  { key: 'perpendicular', label: 'Lotpunkte (senkrecht)' },
                  { key: 'extensions', label: 'Verlängerungslinien' },
                  { key: 'parallel', label: 'Parallele Wände (//)' },
                  { key: 'rightAngle', label: 'Rechtwinklig (90° / 45°)' },
                  { key: 'equalLength', label: 'Gleiche Wandlänge (=)' },
                  { key: 'equalSpacing', label: 'Gleiche Abstände' },
                  { key: 'alignment', label: 'Fluchtlinien an Objekten' },
                  { key: 'offset', label: 'Fester Parallelabstand' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-700/40 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean((snapSettings as any)[key])}
                      onChange={() => toggleSnap(key as keyof SnapSettings)}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-slate-300">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: KI & GEMINI API (TEIL 1) */}
          {activeTab === 'ai' && (
            <div className="flex flex-col gap-4">
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/60 flex flex-col gap-3.5">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                  <Sparkles className="w-4 h-4" />
                  <span>Google Gemini API-Konfiguration</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed">
                  Ermöglicht den KI-Import von handgezeichneten Skizzen, Bauplänen und Fotos direkt im Browser.
                </p>

                {/* API Key Input */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-amber-400" />
                      <span>Gemini API-Schlüssel:</span>
                    </label>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <span>Kostenlosen Schlüssel anfordern</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="relative flex items-center">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKeyInput}
                      onChange={(e) => {
                        setApiKeyInput(e.target.value);
                        setTestResult(null);
                      }}
                      placeholder="AIzaSy..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 pr-10 font-mono text-white text-xs outline-none focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      title={showApiKey ? 'Schlüssel verbergen' : 'Schlüssel anzeigen'}
                      className="absolute right-2.5 p-1 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Model Selector */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-300 font-medium">Gemini Modell:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      setTestResult(null);
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    {AVAILABLE_GEMINI_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Action Buttons: Test Connection & Delete Key */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || !apiKeyInput.trim()}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                  >
                    {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" /> : <Sparkles className="w-3.5 h-3.5 text-amber-400" />}
                    <span>Verbindung testen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveApiKey}
                    className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Schlüssel speichern</span>
                  </button>

                  {apiKeyInput && (
                    <button
                      type="button"
                      onClick={handleDeleteApiKey}
                      className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/60 font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Schlüssel löschen</span>
                    </button>
                  )}
                </div>

                {/* Status & Feedback Messages */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-in fade-in duration-200 ${
                      testResult.success
                        ? 'bg-emerald-950/40 border-emerald-700 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-700 text-rose-200'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    )}
                    <span className="leading-relaxed">{testResult.message}</span>
                  </div>
                )}

                {saveSuccessMsg && (
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* Privacy & Security Guarantee Card */}
              <div className="bg-slate-950/40 p-3.5 rounded-xl border border-slate-800 text-[11px] text-slate-400 flex flex-col gap-2">
                <span className="font-semibold text-slate-300">Sicherheits- & Datenschutz-Garantie:</span>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Der API-Schlüssel wird ausschließlich lokal in Ihrem Browser gesichert.</li>
                  <li>Er steht niemals im Quelltext, in Projektdateien (.cad), in PDF/PNG-Exporten oder URLs.</li>
                  <li>Bilder werden nur bei aktiver Analyse direkt an die Google-API übertragen.</li>
                  <li>Ohne API-Schlüssel bleibt die Plan-Funktion als manuelle Zeichen-Vorlage nutzbar.</li>
                </ul>
                {!isLocalStorageAvailable() && (
                  <p className="text-amber-400 mt-1">
                    Hinweis: Lokaler Speicher ist in dieser Browserumgebung eingeschränkt. Der Schlüssel wird nur für die aktuelle Sitzung im Speicher gehalten.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            {activeTab === 'ai' && (apiKeyInput ? '✓ API-Schlüssel hinterlegt' : 'Kein API-Schlüssel gesetzt')}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Fertig</span>
          </button>
        </div>
      </div>
    </div>
  );
};
