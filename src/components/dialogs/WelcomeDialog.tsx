/**
 * Architectural CAD Welcome Screen & Interactive Studio Showcase
 * Modern, high-end presentation of CAD capabilities with vector architectural diagrams,
 * prominent "Los geht's!" start button, and discreet PIN gateway to resume saved projects.
 * Free of personal information and plaintext credentials.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  Layers,
  Box,
  Flame,
  FileCheck2,
  Lock,
  KeyRound,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Building2,
  FileText,
  Check,
} from 'lucide-react';
import { Language } from '../../types/cad';
import { getT } from '../../i18n/translations';
import { verifyVaultPin } from '../../utils/vaultSecurity';

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onUnlockWithPin: () => void;
  onStartFresh: () => void;
  hasSavedProject: boolean;
}

type ShowcaseTab = '2d' | '3d' | 'elevations' | 'physics';

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  isOpen,
  onClose,
  language,
  onUnlockWithPin,
  onStartFresh,
  hasSavedProject,
}) => {
  const t = getT(language);
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('2d');
  const [showPinEntry, setShowPinEntry] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setSuccess(false);
      setShowPinEntry(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (showPinEntry) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showPinEntry]);

  if (!isOpen) return null;

  const handlePinChange = (val: string) => {
    const digitsOnly = val.replace(/\D/g, '').slice(0, 4);
    setPin(digitsOnly);
    setError(false);

    if (digitsOnly.length === 4) {
      // Check cryptographic hash
      const isValid = verifyVaultPin(digitsOnly);
      if (isValid) {
        setSuccess(true);
        setError(false);
        setTimeout(() => {
          onUnlockWithPin();
          onClose();
        }, 350);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
        }, 800);
      }
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      handlePinChange(pin + num);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(false);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-5 select-none overflow-y-auto">
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-2xl sm:rounded-3xl shadow-2xl max-w-4xl w-full overflow-hidden text-slate-100 flex flex-col my-auto max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* TOP STATUS & RESUME BANNER (Discreet login hint) */}
        <div className="px-5 py-2.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">CAD Studio Bereit • 100% im Browser • Offline-fähig</span>
            <span className="sm:hidden font-medium text-slate-300">CAD Studio Bereit</span>
          </div>

          {!showPinEntry ? (
            <button
              type="button"
              onClick={() => setShowPinEntry(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 text-[11px] font-medium transition-all cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Gespeichertes Projekt fortsetzen?</span>
              <ChevronRight className="w-3 h-3 text-slate-500" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowPinEntry(false)}
              className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Zurück zur Übersicht</span>
            </button>
          )}
        </div>

        {/* MAIN BODY AREA */}
        {!showPinEntry ? (
          /* SHOWCASE VIEW: Features, Visual Diagrams & "Los geht's!" CTA */
          <div className="flex flex-col overflow-y-auto">
            {/* HERO HEADER */}
            <div className="p-6 pb-4 sm:p-8 sm:pb-5 bg-radial from-slate-800/40 via-transparent to-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      DIN 1356 & DIN 277
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      GEG 2024 Konform
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                      3D & WebGL
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                    <span>Architektur-CAD & HausPlaner</span>
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </h1>
                  <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Präzise 2D-Werkplanung, fotorealistisches 3D, bauphysikalische Energieanalyse und einreichfähige Vektor-Pläne – ohne Installation direkt im Browser.
                  </p>
                </div>

                {/* Primary Quick Start Action in Header */}
                <button
                  type="button"
                  onClick={() => {
                    onStartFresh();
                    onClose();
                  }}
                  className="sm:self-center shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer border border-emerald-400/30 group"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200 group-hover:rotate-12 transition-transform" />
                  <span>Los geht's!</span>
                  <ArrowRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* SHOWCASE TABS */}
              <div className="flex items-center gap-2 mt-6 p-1 bg-slate-950/70 border border-slate-800 rounded-xl overflow-x-auto text-xs scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveTab('2d')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === '2d'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>2D-Grundriss & Bemaßung</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('3d')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === '3d'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Box className="w-4 h-4" />
                  <span>3D & 11 Dachformen</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('elevations')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'elevations'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>Fassaden & Schnitt A-A</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('physics')}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    activeTab === 'physics'
                      ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span>Bauphysik & PDF-Export</span>
                </button>
              </div>
            </div>

            {/* INTERACTIVE FEATURE SHOWCASE PANEL */}
            <div className="p-6 pt-2 sm:p-8 sm:pt-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-950/60 border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-inner items-center">
                
                {/* Left Column: Feature Highlights & Benefits */}
                <div className="md:col-span-7 flex flex-col gap-4">
                  {activeTab === '2d' && (
                    <>
                      <div>
                        <span className="text-amber-400 text-xs font-mono font-bold uppercase tracking-wider">
                          Präzisions-CAD nach DIN 1356
                        </span>
                        <h2 className="text-xl font-bold text-white mt-1">
                          Intelligente 2D-Grundrissplanung
                        </h2>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Reale Wandstärken von 11,5 cm bis 36,5 cm mit automatischem Gehrungsschnitt und fugenloser Verschneidung.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>DIN 277 Wohnflächen</strong>: Automatische Raumstempel mit Quadratmetern und Umfassungswänden in Echtzeit.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Intelligente Magnet-Fanghilfen</strong>: Lotrecht, Parallel, Flucht, 90° Orthogonal und metrisches Rasten.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>3-stufige Bemaßungsketten</strong>: Öffnungsmaße, Pfeilermaße und Gesamtgebäudemaß mit Maßketten-Hilfslinien.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span className="font-semibold text-amber-400">Tastatur-Kürzel:</span>
                        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono">W</kbd> Wand</span>
                        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono">D</kbd> Tür</span>
                        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono">F</kbd> Fenster</span>
                        <span><kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-white font-mono">B</kbd> Bemaßung</span>
                      </div>
                    </>
                  )}

                  {activeTab === '3d' && (
                    <>
                      <div>
                        <span className="text-cyan-400 text-xs font-mono font-bold uppercase tracking-wider">
                          Echtzeit 3D & WebGL Engine
                        </span>
                        <h2 className="text-xl font-bold text-white mt-1">
                          Fotorealistische Visualisierung & Dächer
                        </h2>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Vom 2D-Grundriss in einer Sekunde zum kompletten 3D-Haus mit Fenstern, Türen, Balkonen und Dachkonstruktion.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>11 Parametrische Dachformen</strong>: Satteldach, Pultdach, Walmdach, Mansarddach und Flachdach stufenlos editierbar.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Echtes Dachgebälk</strong>: Sparren, Pfetten, Firstpfetten und lichte Kniestockhöhen auf den Zentimeter genau.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Innenrundgang & Sonnenstand</strong>: Spaziere virtuell durch alle Räume und prüfe den Tageslichteinfall.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span className="font-semibold text-cyan-400">Ansichts-Modi:</span>
                        <span>2D Draufsicht • 3D Perspektive • Geteilte Ansicht (Split-Screen)</span>
                      </div>
                    </>
                  )}

                  {activeTab === 'elevations' && (
                    <>
                      <div>
                        <span className="text-indigo-400 text-xs font-mono font-bold uppercase tracking-wider">
                          Automatische Bauvorlagen
                        </span>
                        <h2 className="text-xl font-bold text-white mt-1">
                          Orthografische Fassaden & Schnitt A-A
                        </h2>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Kein mühsames Nachzeichnen mehr: Schnitte und Ansichten werden direkt aus dem geometrischen 3D-Baukörper abgeleitet.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Alle 4 Himmelsrichtungen</strong>: Süd-, Nord-, Ost- und Westansicht mit korrekten Brüstungs- und Sturzhöhen.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>DIN 1356 Schnitt A-A</strong>: Geschnittene Bodenplatten, Geschossdecken, Treppenverläufe und Dachneigungen.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Höhenkoten</strong>: Automatische Höhenbeschriftung (±0.00 m, Rohbauhöhe, Firsthöhe, Traufhöhe).
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span className="font-semibold text-indigo-400">Bauantrag:</span>
                        <span>Vollständig kompatibel mit deutschen Bauvorlagenverordnungen</span>
                      </div>
                    </>
                  )}

                  {activeTab === 'physics' && (
                    <>
                      <div>
                        <span className="text-emerald-400 text-xs font-mono font-bold uppercase tracking-wider">
                          Energieeffizienz & Vektor-Export
                        </span>
                        <h2 className="text-xl font-bold text-white mt-1">
                          GEG 2024 Nachweis & Vektor-Druck
                        </h2>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          Integrierte Bauphysik nach DIN EN ISO 6946 und normgerechter Export für Behörden, Bauherren und Handwerker.
                        </p>
                      </div>

                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Wärmedurchgangskoeffizient U</strong>: Bauteil-U-Werte für Ziegel, Holzständerwerk, Beton und 3-fach Verglasung.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>KfW 40 / 55 Klassifizierung</strong>: Live-Feedback zur Erreichung von Förderstandards und Transmissionswärmeverlusten.
                          </span>
                        </div>
                        <div className="flex items-start gap-2.5">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                          <span className="text-slate-200">
                            <strong>Maßstabsgetreues PDF & DXF</strong>: Druckfertige Pläne im Maßstab 1:50 oder 1:100 mit professionellem Plankopf.
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                        <span className="font-semibold text-emerald-400">Formate:</span>
                        <span>Vektor-PDF • AutoCAD DXF • SVG • Hochauflösendes PNG • CAD-JSON</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Right Column: Architectural Vector Diagrams (Crisp SVG illustrations) */}
                <div className="md:col-span-5 flex items-center justify-center">
                  <div className="w-full h-56 sm:h-64 rounded-xl bg-slate-900 border border-slate-700/80 p-3 relative overflow-hidden flex items-center justify-center shadow-lg">
                    {/* SVG Blueprint Background Grid */}
                    <div
                      className="absolute inset-0 opacity-20 pointer-events-none"
                      style={{
                        backgroundImage: `linear-gradient(to right, #38bdf8 1px, transparent 1px), linear-gradient(to bottom, #38bdf8 1px, transparent 1px)`,
                        backgroundSize: '20px 20px',
                      }}
                    />

                    {activeTab === '2d' && (
                      <svg viewBox="0 0 300 220" className="w-full h-full">
                        {/* Outer Walls with Hatching */}
                        <rect x="30" y="30" width="240" height="150" fill="none" stroke="#64748b" strokeWidth="12" />
                        <rect x="30" y="30" width="240" height="150" fill="none" stroke="#f8fafc" strokeWidth="2" />
                        
                        {/* Interior Wall */}
                        <line x1="140" y1="30" x2="140" y2="180" stroke="#94a3b8" strokeWidth="8" />
                        
                        {/* Door opening & swing arc */}
                        <line x1="140" y1="85" x2="140" y2="125" stroke="#0f172a" strokeWidth="10" />
                        <line x1="140" y1="85" x2="175" y2="85" stroke="#f59e0b" strokeWidth="2.5" />
                        <path d="M 175 85 A 35 35 0 0 1 140 120" fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                        
                        {/* Window openings */}
                        <line x1="70" y1="30" x2="110" y2="30" stroke="#0f172a" strokeWidth="14" />
                        <line x1="70" y1="30" x2="110" y2="30" stroke="#38bdf8" strokeWidth="3" />
                        <line x1="180" y1="180" x2="230" y2="180" stroke="#0f172a" strokeWidth="14" />
                        <line x1="180" y1="180" x2="230" y2="180" stroke="#38bdf8" strokeWidth="3" />
                        
                        {/* Room Stamp */}
                        <rect x="45" y="75" width="80" height="42" rx="4" fill="#0284c7" fillOpacity="0.2" stroke="#0284c7" strokeWidth="1" />
                        <text x="85" y="93" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">Wohnen / Essen</text>
                        <text x="85" y="108" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">24.8 m²</text>

                        <rect x="155" y="75" width="70" height="42" rx="4" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
                        <text x="190" y="93" fill="#34d399" fontSize="10" fontWeight="bold" textAnchor="middle">Schlafen</text>
                        <text x="190" y="108" fill="#e2e8f0" fontSize="11" fontWeight="bold" textAnchor="middle">16.4 m²</text>

                        {/* Top Dimension Line */}
                        <line x1="30" y1="14" x2="270" y2="14" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="30" y1="8" x2="30" y2="20" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="270" y1="8" x2="270" y2="20" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="150" y="11" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle">8.00 m</text>

                        {/* Left Dimension Line */}
                        <line x1="14" y1="30" x2="14" y2="180" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="8" y1="30" x2="20" y2="30" stroke="#f59e0b" strokeWidth="1.5" />
                        <line x1="8" y1="180" x2="20" y2="180" stroke="#f59e0b" strokeWidth="1.5" />
                        <text x="10" y="110" fill="#f59e0b" fontSize="10" fontWeight="bold" textAnchor="middle" transform="rotate(-90 10 110)">6.00 m</text>
                      </svg>
                    )}

                    {activeTab === '3d' && (
                      <svg viewBox="0 0 300 220" className="w-full h-full">
                        {/* Ground plane shadow */}
                        <polygon points="50,170 150,210 260,175 160,140" fill="#020617" opacity="0.6" />

                        {/* Front Left Wall */}
                        <polygon points="70,110 150,145 150,195 70,160" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                        
                        {/* Front Right Wall */}
                        <polygon points="150,145 235,115 235,165 150,195" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />

                        {/* Windows & Doors on 3D building */}
                        <polygon points="90,128 125,143 125,168 90,153" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1" />
                        <polygon points="175,138 215,124 215,160 175,174" fill="#0284c7" fillOpacity="0.4" stroke="#38bdf8" strokeWidth="1" />

                        {/* 3D Pitched Roof Facets */}
                        <polygon points="60,105 150,140 150,60" fill="#b45309" fillOpacity="0.85" stroke="#f59e0b" strokeWidth="1.5" />
                        <polygon points="150,140 245,110 190,40 150,60" fill="#d97706" fillOpacity="0.9" stroke="#f59e0b" strokeWidth="1.5" />

                        {/* Ridge & Eaves Overhang Lines */}
                        <line x1="150" y1="60" x2="190" y2="40" stroke="#fde68a" strokeWidth="2.5" />

                        {/* Compass Indicator */}
                        <circle cx="260" cy="40" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
                        <text x="260" y="36" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">N</text>
                        <polygon points="260,28 263,38 257,38" fill="#38bdf8" />
                      </svg>
                    )}

                    {activeTab === 'elevations' && (
                      <svg viewBox="0 0 300 220" className="w-full h-full">
                        {/* Terrain / Ground Line */}
                        <line x1="20" y1="175" x2="280" y2="175" stroke="#10b981" strokeWidth="2" />
                        <path d="M 20 180 L 280 180 M 30 185 L 270 185" stroke="#059669" strokeWidth="1" strokeDasharray="4 4" />

                        {/* South Facade Base & Walls */}
                        <rect x="55" y="85" width="190" height="90" fill="#1e293b" stroke="#e2e8f0" strokeWidth="2" />
                        
                        {/* Gable Roof Elevation */}
                        <polygon points="50,85 150,30 250,85" fill="#0f172a" stroke="#f59e0b" strokeWidth="2.5" />

                        {/* Real Window Openings with Sills */}
                        <rect x="75" y="105" width="35" height="40" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
                        <rect x="130" y="105" width="35" height="40" fill="#0284c7" fillOpacity="0.3" stroke="#38bdf8" strokeWidth="1.5" />
                        <rect x="190" y="115" width="30" height="60" fill="#047857" fillOpacity="0.3" stroke="#10b981" strokeWidth="1.5" />
                        
                        {/* Section Cut Line A-A */}
                        <line x1="118" y1="20" x2="118" y2="195" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="6 3" />
                        <polygon points="118,18 122,26 114,26" fill="#ef4444" />
                        <text x="126" y="26" fill="#ef4444" fontSize="10" fontWeight="bold">A</text>
                        <text x="126" y="195" fill="#ef4444" fontSize="10" fontWeight="bold">A</text>

                        {/* Elevation Levels */}
                        <line x1="255" y1="175" x2="285" y2="175" stroke="#94a3b8" strokeWidth="1" />
                        <text x="288" y="178" fill="#94a3b8" fontSize="8" fontWeight="mono">±0.00</text>
                        
                        <line x1="255" y1="85" x2="285" y2="85" stroke="#94a3b8" strokeWidth="1" />
                        <text x="288" y="88" fill="#94a3b8" fontSize="8" fontWeight="mono">+2.80</text>

                        <line x1="150" y1="30" x2="285" y2="30" stroke="#f59e0b" strokeWidth="1" strokeDasharray="2 2" />
                        <text x="288" y="33" fill="#f59e0b" fontSize="8" fontWeight="mono">+5.40</text>
                      </svg>
                    )}

                    {activeTab === 'physics' && (
                      <svg viewBox="0 0 300 220" className="w-full h-full">
                        {/* Wall Layers Diagram */}
                        <g transform="translate(30, 30)">
                          <rect x="0" y="0" width="25" height="110" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                          <text x="12" y="125" fill="#94a3b8" fontSize="7" textAnchor="middle">Putz</text>
                          
                          <rect x="25" y="0" width="75" height="110" fill="#b45309" stroke="#78350f" strokeWidth="1" />
                          <text x="62" y="125" fill="#d97706" fontSize="7" textAnchor="middle">Ziegel 24cm</text>
                          
                          <rect x="100" y="0" width="60" height="110" fill="#047857" fillOpacity="0.5" stroke="#059669" strokeWidth="1" strokeDasharray="2 2" />
                          <text x="130" y="125" fill="#34d399" fontSize="7" textAnchor="middle">Dämmung 16cm</text>
                          
                          <rect x="160" y="0" width="20" height="110" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
                          <text x="170" y="125" fill="#94a3b8" fontSize="7" textAnchor="middle">Putz</text>

                          {/* Heat Flow Arrow */}
                          <line x1="-15" y1="55" x2="200" y2="55" stroke="#f59e0b" strokeWidth="2" markerEnd="url(#arrow)" />
                          <text x="90" y="45" fill="#f59e0b" fontSize="9" fontWeight="bold" textAnchor="middle">Wärmestrom q</text>
                        </g>

                        {/* U-Value Gauge Badge */}
                        <g transform="translate(40, 160)">
                          <rect x="0" y="0" width="220" height="42" rx="8" fill="#064e3b" fillOpacity="0.5" stroke="#10b981" strokeWidth="1.5" />
                          <circle cx="22" cy="21" r="10" fill="#10b981" />
                          <text x="22" y="25" fill="#022c22" fontSize="12" fontWeight="bold" textAnchor="middle">✓</text>
                          <text x="40" y="18" fill="#a7f3d0" fontSize="10" fontWeight="bold">GEG 2024 Konform: U = 0.18 W/(m²K)</text>
                          <text x="40" y="32" fill="#6ee7b7" fontSize="9">Referenz-Grenzwert 0.24 W/(m²K) sicher unterschritten</text>
                        </g>
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* BOTTOM ACTION BAR */}
            <div className="p-6 pt-3 border-t border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 text-center sm:text-left">
                <span className="text-slate-200 font-semibold">Kein Account nötig.</span> Alle Daten bleiben sicher lokal in deinem Browser.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    onStartFresh();
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-8 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-bold text-sm shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2.5 transition-all cursor-pointer border border-emerald-400/40"
                >
                  <Sparkles className="w-4 h-4 text-emerald-200" />
                  <span>Los geht's! (Neues Projekt starten)</span>
                  <ArrowRight className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* PIN LOGIN VIEW: Resume Saved Project from Secure Vault */
          <div className="p-6 sm:p-10 flex flex-col items-center justify-center gap-6 overflow-y-auto max-w-lg mx-auto w-full">
            <div className="flex flex-col items-center text-center gap-2">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                success
                  ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                  : error
                  ? 'bg-rose-500 text-white shadow-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-amber-500/10'
              }`}>
                {success ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : error ? (
                  <AlertCircle className="w-7 h-7" />
                ) : (
                  <Lock className="w-7 h-7" />
                )}
              </div>

              <h2 className="text-xl font-bold text-white mt-1">
                {success ? 'Projekt entsperrt!' : 'Projekt fortsetzen'}
              </h2>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Tippe deinen 4-stelligen Zugangs-PIN ein, um an deinem zuvor gespeicherten Bauplan weiterzuarbeiten.
              </p>
            </div>

            {/* Hidden Input for Keyboard Typing */}
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => handlePinChange(e.target.value)}
              className="absolute opacity-0 pointer-events-auto w-40 h-12 cursor-pointer z-10"
              autoFocus
            />

            {/* Visual 4-Digit Display Boxes */}
            <div
              onClick={() => inputRef.current?.focus()}
              className={`flex items-center gap-3 cursor-pointer p-2 rounded-xl transition-all ${
                error ? 'animate-shake' : ''
              }`}
            >
              {[0, 1, 2, 3].map((idx) => {
                const filled = pin.length > idx;
                return (
                  <div
                    key={idx}
                    className={`w-12 h-14 rounded-2xl flex items-center justify-center font-mono font-bold text-2xl transition-all duration-150 border-2 ${
                      success
                        ? 'border-emerald-500 bg-emerald-950/50 text-emerald-300 shadow-md shadow-emerald-500/20'
                        : error
                        ? 'border-rose-500 bg-rose-950/50 text-rose-300 shadow-md shadow-rose-500/20'
                        : filled
                        ? 'border-amber-500 bg-amber-950/30 text-amber-300 shadow-md shadow-amber-500/20 scale-105'
                        : 'border-slate-700 bg-slate-800/80 text-slate-500'
                    }`}
                  >
                    {filled ? '●' : ''}
                  </div>
                );
              })}
            </div>

            {/* Status Feedback Text */}
            <div className="h-5 text-xs font-medium">
              {success && (
                <span className="text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>PIN bestätigt – Dein Projekt wird geladen...</span>
                </span>
              )}
              {error && (
                <span className="text-rose-400 flex items-center gap-1.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4" />
                  <span>Falscher PIN. Bitte erneut versuchen.</span>
                </span>
              )}
              {!success && !error && (
                <span className="text-slate-500 text-[11px]">
                  Gib die 4 Ziffern über die Tastatur oder den Ziffernblock ein
                </span>
              )}
            </div>

            {/* Touch Keypad */}
            <div className="grid grid-cols-3 gap-2 w-full max-w-xs mt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="py-3 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-amber-600 text-white font-mono font-bold text-base border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 font-medium text-xs border border-slate-800 transition-colors cursor-pointer"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-3 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-amber-600 text-white font-mono font-bold text-base border border-slate-700/60 transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="py-3 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 text-amber-400 font-medium text-xs border border-slate-800 transition-colors cursor-pointer"
              >
                Tastatur
              </button>
            </div>

            {/* Bottom options */}
            <div className="flex items-center justify-between w-full max-w-xs pt-4 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowPinEntry(false)}
                className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Zur Übersicht</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onStartFresh();
                  onClose();
                }}
                className="text-emerald-400 hover:text-emerald-300 font-semibold cursor-pointer transition-colors"
              >
                Ohne PIN neu anfangen ➔
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
