/**
 * Welcome & 5-Step Quick Onboarding Guide for Beginners
 */

import React, { useState } from 'react';
import {
  PenTool,
  DoorOpen,
  AppWindow,
  Box,
  Download,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
} from 'lucide-react';
import { Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface WelcomeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const WelcomeDialog: React.FC<WelcomeDialogProps> = ({ isOpen, onClose, language }) => {
  const t = getT(language);
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: '1. Wand mit Maßeingabe zeichnen',
      desc: 'Wähle das Werkzeug "Wand" (W) oder "Rechteckraum" (R). Klicke den Startpunkt und bewege die Maus. Tippe die gewünschte Länge (z. B. 6.5) einfach auf der Tastatur und drücke Enter!',
      icon: <PenTool className="w-8 h-8 text-amber-400" />,
    },
    {
      title: '2. Türen & Fenster mit 1 Klick einsetzen',
      desc: 'Wähle "Tür" (D) oder "Fenster" (F) in der linken Leiste. Fahre einfach mit der Maus über eine gezeichnete Wand und klicke – die Öffnung und der Aufschlagbogen entstehen automatisch!',
      icon: <DoorOpen className="w-8 h-8 text-amber-500" />,
    },
    {
      title: '3. Räume & Maße überprüfen',
      desc: 'Aus den umschließenden Wänden werden automatisch die Räume mit m² Wohnfläche berechnet. Mit dem Werkzeug "Bemaßung" (B) kannst du Maßketten an Außen- und Innenwände setzen.',
      icon: <AppWindow className="w-8 h-8 text-emerald-400" />,
    },
    {
      title: '4. Echtzeit 3D-Modell & Rundgang',
      desc: 'Klicke oben auf "3D Modell" oder "Geteilt", um dein Ferienhaus sofort als 3D-Haus mit Fenstern, Dach und Möbeln zu sehen. Schalte in den Innenrundgang, um durch dein Haus zu spazieren!',
      icon: <Box className="w-8 h-8 text-cyan-400" />,
    },
    {
      title: '5. Maßstabsgetreu drucken & PDF/DXF',
      desc: 'Klicke oben auf "Exportieren". Du erhältst ein echtes, maßstabsgetreues PDF im Maßstab 1:50 mit professionellem Plankopf, druckbar auf jedem handelsüblichen Drucker.',
      icon: <Download className="w-8 h-8 text-rose-400" />,
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden text-slate-100 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-sm">Willkommen beim Ferienhaus CAD-Planer</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-center shadow-inner">
            {current.icon}
          </div>

          <h3 className="text-lg font-bold text-white tracking-tight">{current.title}</h3>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md">{current.desc}</p>

          {/* Stepper Dots */}
          <div className="flex items-center gap-1.5 mt-2">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-emerald-500' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
          >
            Überspringen
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 font-medium transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Zurück</span>
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg flex items-center gap-1 font-medium shadow-sm transition-colors"
              >
                <span>Weiter</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold shadow-sm transition-colors"
              >
                Loslegen!
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
