/**
 * Architectural CAD Welcome Screen & Secure Vault Access Dialog
 * Features interactive feature overview, salted cryptographic PIN gateway,
 * and option to start fresh with a clean blank project.
 * Completely free of plaintext credentials or personal information.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Lock,
  Unlock,
  KeyRound,
  FilePlus2,
  Sparkles,
  Compass,
  Layers,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Box,
  Flame,
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

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({
  isOpen,
  onClose,
  language,
  onUnlockWithPin,
  onStartFresh,
  hasSavedProject,
}) => {
  const t = getT(language);
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
      setSuccess(false);
      // Auto-focus the PIN input immediately on opening
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

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
        // Reset after small delay so user can re-try
        setTimeout(() => {
          setPin('');
        }, 900);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden text-slate-100 flex flex-col max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="p-5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
                <span>CAD-Architektur & HausPlaner</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  DIN 1356 & DIN 277
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Professionelle 2D/3D Entwurfs-, Genehmigungs- und Werkplanung
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-6 overflow-y-auto">
          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs text-white">2D DIN-Bauplan</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                Maßketten, saubere Wandverschneidung & Raumstempel
              </span>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Box className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs text-white">3D & Ansichten</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                Süd/Nord-Fassaden, Schnitt A-A & Dachstuhl-Generator
              </span>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs text-white">Bauphysik & GEG</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                U-Werte nach GEG 2024 & Wärmeverlust-Berechnung
              </span>
            </div>

            <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3 flex flex-col gap-1.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <FileCheck2 className="w-4 h-4" />
              </div>
              <span className="font-semibold text-xs text-white">PDF & DXF Plan</span>
              <span className="text-[10px] text-slate-400 leading-tight">
                Vektor-Einreichplan 1:100 mit Raumbuch & Mengenermittlung
              </span>
            </div>
          </div>

          {/* Central PIN Gateway (Tresor-Zugang) */}
          <div className="bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center gap-4 relative overflow-hidden shadow-inner">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                success ? 'bg-emerald-500 text-white' : error ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}>
                {success ? <CheckCircle2 className="w-5 h-5" /> : error ? <AlertCircle className="w-5 h-5" /> : <Lock className="w-4 h-4" />}
              </div>
              <h2 className="font-bold text-sm text-white">
                {success ? 'Projekt entsperrt!' : 'Gespeichertes Projekt fortsetzen'}
              </h2>
            </div>

            <p className="text-xs text-slate-400 max-w-sm">
              Gib deinen 4-stelligen Zugangs-PIN ein, um an deinem zuvor gespeicherten Plan weiterzuarbeiten:
            </p>

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
                    className={`w-12 h-14 rounded-xl flex items-center justify-center font-mono font-bold text-2xl transition-all duration-150 border-2 ${
                      success
                        ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400 shadow-md shadow-emerald-500/20'
                        : error
                        ? 'border-rose-500 bg-rose-950/40 text-rose-400 shadow-md shadow-rose-500/20'
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
            <div className="h-4 text-xs font-medium">
              {success && (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>PIN bestätigt – Projekt wird geladen...</span>
                </span>
              )}
              {error && (
                <span className="text-rose-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Falscher PIN. Bitte erneut versuchen.</span>
                </span>
              )}
              {!success && !error && (
                <span className="text-slate-500 text-[11px]">
                  Tippe die 4 Ziffern auf der Tastatur oder dem Ziffernblock
                </span>
              )}
            </div>

            {/* On-Screen Touch Keypad (Convenient for iPad / Tablet / Mobile) */}
            <div className="grid grid-cols-3 gap-2 mt-1 w-full max-w-xs">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyPress(digit)}
                  className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-amber-600 text-white font-mono font-bold text-sm border border-slate-700/60 transition-colors cursor-pointer"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 text-slate-400 font-medium text-xs border border-slate-800 transition-colors cursor-pointer"
              >
                Löschen
              </button>
              <button
                type="button"
                onClick={() => handleKeyPress('0')}
                className="py-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-700/80 active:bg-amber-600 text-white font-mono font-bold text-sm border border-slate-700/60 transition-colors cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => inputRef.current?.focus()}
                className="py-2.5 rounded-xl bg-slate-800/40 hover:bg-slate-700/60 text-amber-400 font-medium text-xs border border-slate-800 transition-colors cursor-pointer"
              >
                Tastatur
              </button>
            </div>
          </div>
        </div>

        {/* Footer Action: Skip & Start Fresh */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-xs">
          <div className="text-slate-500 text-[11px]">
            Kein PIN? Du kannst die App jederzeit uneingeschränkt nutzen.
          </div>

          <button
            type="button"
            onClick={() => {
              onStartFresh();
              onClose();
            }}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Ohne PIN starten (Neues Projekt von 0 beginnen)</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
