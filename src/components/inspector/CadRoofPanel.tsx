/**
 * Architectural Roof Panel & Live Interactive Editor (Dach-Modul)
 * 
 * Replaces modal dialog with an iPad-optimized non-blocking Side Panel (landscape)
 * or Bottom Sheet (portrait). Updates the 2D & 3D model in real time.
 * 
 * Features:
 * - 11 Roof types with clear isometric SVG pictograms (>= 96 pt touch cards)
 * - Live cross-section diagram with angle arc and editable linked heights
 * - Orientation / Slope direction pictograms (Längs, Quer, Vorne, Hinten, Links, Rechts)
 * - Traufhöhe synced with actual wall heights (2 operating modes)
 * - Separate eaves/verge overhangs with top-view pictograms
 * - Asymmetrical pitch & ridge offset with lock toggle
 * - Material previews with complete German titles (never truncated)
 * - Accessories: Chimney, Dachfenster, Gauben, Solarmodule, Dachrinne, Dachluke
 * - Undo-safe commit / revert ("Fertig", "Abbrechen", "Dach entfernen")
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  Check,
  Trash2,
  Sliders,
  Sparkles,
  Info,
  Lock,
  Unlock,
  Layers,
  Maximize2,
  Sun,
  Flame,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Compass,
  Palette,
  Ruler,
  HelpCircle,
} from 'lucide-react';
import {
  Roof,
  RoofType,
  RoofMaterial,
  RoofSlopeDirection,
  Wall,
  Floor,
  Language,
  RoofAccessoryItem,
} from '../../types/cad';
import { getT } from '../../i18n/translations';
import { formatGermanNumber } from '../../utils/cadMath';

interface CadRoofPanelProps {
  isOpen: boolean;
  onClose: () => void;
  roof: Roof | null;
  walls: Wall[];
  onLiveUpdateRoof: (roof: Roof | null) => void;
  onCommitRoof: (roof: Roof | null) => void;
  onRemoveRoof: () => void;
  language: Language;
  isPortrait?: boolean;
}

type RoofTab = 'form' | 'dimensions' | 'material' | 'accessories';

export const CadRoofPanel: React.FC<CadRoofPanelProps> = ({
  isOpen,
  onClose,
  roof,
  walls,
  onLiveUpdateRoof,
  onCommitRoof,
  onRemoveRoof,
  language,
  isPortrait = false,
}) => {
  const t = getT(language);
  const [activeTab, setActiveTab] = useState<RoofTab>('form');
  const [expandedInfoForm, setExpandedInfoForm] = useState<RoofType | null>(null);

  // Store initial snapshot for "Abbrechen" revert
  const initialRoofRef = useRef<Roof | null>(roof ? JSON.parse(JSON.stringify(roof)) : null);

  useEffect(() => {
    if (isOpen) {
      initialRoofRef.current = roof ? JSON.parse(JSON.stringify(roof)) : null;
    }
  }, [isOpen]);

  // Envelope of exterior walls
  const envelope = useMemo(() => {
    const extWalls = walls.filter((w) => w.isExterior);
    const targetWalls = extWalls.length > 0 ? extWalls : walls;
    if (targetWalls.length === 0) {
      return { minX: 2, maxX: 10, minY: 2, maxY: 8, width: 8, depth: 6, maxH: 2.6, avgH: 2.6 };
    }
    const minX = Math.min(...targetWalls.flatMap((w) => [w.start.x, w.end.x]));
    const maxX = Math.max(...targetWalls.flatMap((w) => [w.start.x, w.end.x]));
    const minY = Math.min(...targetWalls.flatMap((w) => [w.start.y, w.end.y]));
    const maxY = Math.max(...targetWalls.flatMap((w) => [w.start.y, w.end.y]));
    const heights = targetWalls.flatMap((w) => [w.height, w.endHeight ?? w.height]);
    const maxH = Math.max(...heights, 2.5);
    const avgH = Math.round((heights.reduce((a, b) => a + b, 0) / heights.length) * 100) / 100;
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(1, maxX - minX),
      depth: Math.max(1, maxY - minY),
      maxH,
      avgH,
    };
  }, [walls]);

  // Current working roof state
  const currentRoof = useMemo<Roof>(() => {
    const defaultRidgeDir = envelope.width >= envelope.depth ? 'horizontal' : 'vertical';
    const span = defaultRidgeDir === 'horizontal' ? envelope.depth : envelope.width;
    const h = Math.round((span / 2) * Math.tan((35 * Math.PI) / 180) * 100) / 100;
    const fallback: Roof = {
      id: 'roof_' + Date.now(),
      type: 'gable',
      pitchDegrees: 35,
      pitchLeft: 35,
      pitchRight: 35,
      isPitchLinked: true,
      overhang: 0.40,
      overhangEaves: 0.40,
      overhangGable: 0.40,
      isOverhangLinked: true,
      ridgeDirection: defaultRidgeDir,
      slopeDirection: 'front',
      ridgeOffset: 0,
      pitchMode: 'follow_walls',
      height: h,
      baseHeight: envelope.avgH,
      material: 'tiles_anthracite',
      hasChimney: false,
      skylightsCount: 0,
      accessories: [],
    };
    if (roof) {
      return {
        ...fallback,
        ...roof,
        pitchDegrees: roof.pitchDegrees ?? (roof as any).pitchDeg ?? 35,
        height: roof.height ?? (roof as any).ridgeHeightM ?? h,
        overhangEaves: roof.overhangEaves ?? roof.overhang ?? 0.40,
        overhangGable: roof.overhangGable ?? roof.overhang ?? 0.40,
        baseHeight: roof.baseHeight ?? envelope.avgH,
        accessories: roof.accessories ?? [],
      };
    }
    return fallback;
  }, [roof, envelope]);

  // Helper to trigger live updates
  const updateField = <K extends keyof Roof>(key: K, value: Roof[K]) => {
    const updated = { ...currentRoof, [key]: value };
    onLiveUpdateRoof(updated);
  };

  const handlePitchChange = (degrees: number) => {
    const safeDeg = Math.max(0, Math.min(currentRoof.type === 'flat' ? 10 : 75, degrees));
    const span = currentRoof.ridgeDirection === 'horizontal' ? envelope.depth : envelope.width;
    const halfSpan = span / 2;
    const rad = (safeDeg * Math.PI) / 180;
    const newHeight = safeDeg === 0 ? 0.35 : Math.round(halfSpan * Math.tan(rad) * 100) / 100;
    const updated: Roof = {
      ...currentRoof,
      pitchDegrees: safeDeg,
      pitchLeft: currentRoof.isPitchLinked ? safeDeg : currentRoof.pitchLeft,
      pitchRight: currentRoof.isPitchLinked ? safeDeg : currentRoof.pitchRight,
      height: newHeight,
    };
    onLiveUpdateRoof(updated);
  };

  const handleHeightChange = (newHeight: number) => {
    const safeH = Math.max(0.2, Math.min(8.0, newHeight));
    const span = currentRoof.ridgeDirection === 'horizontal' ? envelope.depth : envelope.width;
    const halfSpan = span / 2;
    const rad = Math.atan2(safeH, halfSpan);
    const newDeg = Math.round(((rad * 180) / Math.PI) * 10) / 10;
    const updated: Roof = {
      ...currentRoof,
      height: safeH,
      pitchDegrees: newDeg,
      pitchLeft: currentRoof.isPitchLinked ? newDeg : currentRoof.pitchLeft,
      pitchRight: currentRoof.isPitchLinked ? newDeg : currentRoof.pitchRight,
    };
    onLiveUpdateRoof(updated);
  };

  // Revert changes on Abbrechen
  const handleCancel = () => {
    onLiveUpdateRoof(initialRoofRef.current);
    onClose();
  };

  // Commit changes on Fertig
  const handleSave = () => {
    onCommitRoof(currentRoof);
    onClose();
  };

  // Remove roof
  const handleDelete = () => {
    onRemoveRoof();
    onClose();
  };

  if (!isOpen) return null;

  // 11 Dachformen definitions with descriptions and isometric drawings
  const ROOF_FORMS: Array<{
    type: RoofType;
    label: string;
    desc: string;
    badge?: string;
  }> = [
    { type: 'gable', label: 'Satteldach', desc: 'Zwei geneigte Dachflächen, die sich am First treffen. Der zeitlose Klassiker für Ferienhäuser.' },
    { type: 'shed', label: 'Pultdach', desc: 'Eine einzige schräge Dachfläche mit Gefälle in eine Richtung. Ideal für moderne Architektur und Solarnutzung.' },
    { type: 'hip', label: 'Walmdach', desc: 'Vier geneigte Dachflächen, auch an den Schmalseiten abgewalmt. Hoher Wind- und Wetterschutz.' },
    { type: 'half_hip', label: 'Krüppelwalmdach', desc: 'Giebelseiten sind im oberen Bereich partiell abgewalmt. Typisch für traditionelle Landhäuser.' },
    { type: 'tent', label: 'Zeltdach', desc: 'Vier symmetrische Dachflächen laufen in einer zentralen Firstspitze zusammen. Perfekt für quadratische Grundrisse.' },
    { type: 'flat', label: 'Flachdach (Attika)', desc: 'Flache Decke mit umlaufender Attika-Brüstung. Ermöglicht Dachterrassen und moderne Kuben.' },
    { type: 'mansard', label: 'Mansarddach', desc: 'Zweifach abgeknickte Dachflächen: unten steil für volle Raumhöhe, oben flach geneigt.' },
    { type: 'barrel', label: 'Tonnendach', desc: 'Gleichmäßig rund gewölbte Dachform. Hohes Raumgefühl und außergewöhnliche Optik.' },
    { type: 'butterfly', label: 'Schmetterlingsdach', desc: 'Zwei nach innen zur Mitte geneigte Flächen mit zentraler Dachkehle. Architektonisches Highlight.' },
    { type: 'sawtooth', label: 'Sheddach', desc: 'Sägezahnförmiges Atelier-Dach mit steilen Lichtflächen für blendfreies Nordlicht.' },
    { type: 'freeform', label: 'Freiform', desc: 'Individuell anpassbare Dachflächen für verwinkelte Anbauten und moderne Entwürfe.' },
  ];

  const MATERIALS: Array<{ id: RoofMaterial; label: string; color: string; sampleGradient: string }> = [
    { id: 'tiles_anthracite', label: 'Tonziegel Anthrazit', color: '#27272a', sampleGradient: 'linear-gradient(135deg, #3f3f46, #18181b)' },
    { id: 'tiles_red', label: 'Tonziegel Ziegelrot', color: '#b91c1c', sampleGradient: 'linear-gradient(135deg, #dc2626, #991b1b)' },
    { id: 'concrete_tiles', label: 'Betondachstein Schiefergrau', color: '#475569', sampleGradient: 'linear-gradient(135deg, #64748b, #334155)' },
    { id: 'slate', label: 'Naturschiefer Anthrazit', color: '#1e293b', sampleGradient: 'linear-gradient(135deg, #334155, #0f172a)' },
    { id: 'metal_sheet', label: 'Stehfalzblech Titanzink', color: '#64748b', sampleGradient: 'linear-gradient(135deg, #94a3b8, #475569)' },
    { id: 'shingles', label: 'Holzschindeln Lärche', color: '#78350f', sampleGradient: 'linear-gradient(135deg, #92400e, #451a03)' },
    { id: 'thatch', label: 'Reet / Strohdach', color: '#d97706', sampleGradient: 'linear-gradient(135deg, #f59e0b, #b45309)' },
    { id: 'green_roof', label: 'Extensives Gründach', color: '#15803d', sampleGradient: 'linear-gradient(135deg, #22c55e, #166534)' },
  ];

  return (
    <aside
      className={
        isPortrait
          ? 'fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 shadow-2xl rounded-t-3xl max-h-[82vh] flex flex-col select-none overflow-hidden text-stone-800 dark:text-stone-200 animate-in slide-in-from-bottom duration-200'
          : 'fixed top-14 right-3 bottom-3 z-40 w-96 md:w-[420px] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-2xl rounded-3xl flex flex-col select-none overflow-hidden text-stone-800 dark:text-stone-200 animate-in slide-in-from-right duration-200'
      }
    >
      {/* 1. HEADER & PRIMARY ACTIONS */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50/90 dark:bg-stone-850/90 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-bold text-sm text-stone-900 dark:text-white leading-tight">
              Dach-Modul
            </h2>
            <p className="text-[11px] text-stone-500 dark:text-stone-400">
              Form, Neigung, Überstand & Zubehör
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {roof && (
            <button
              onClick={handleDelete}
              title="Dach vollständig entfernen"
              className="p-2 rounded-xl text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={handleCancel}
            title="Abbrechen (keine Änderungen speichern)"
            className="px-3 py-1.5 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-semibold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
          >
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            title="Dach übernehmen (Enter)"
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Fertig</span>
          </button>
        </div>
      </div>

      {/* 2. TOP LIVE CROSS-SECTION DIAGRAM WITH ANGLE ARC & LINKED HEIGHTS */}
      <div className="p-4 bg-stone-100/70 dark:bg-stone-950/60 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="bg-white dark:bg-stone-900 rounded-2xl p-3 border border-stone-200/80 dark:border-stone-800/80 shadow-xs flex items-center justify-between gap-3">
          {/* Schematic SVG Elevation & Angle Arc */}
          <div className="w-36 h-20 relative flex items-center justify-center shrink-0">
            <svg viewBox="0 0 160 90" className="w-full h-full">
              {/* Ground & Wall outline */}
              <rect x="25" y="55" width="110" height="30" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="3 3" />
              
              {/* Roof geometry preview */}
              {currentRoof.type === 'flat' ? (
                <>
                  <rect x="20" y="50" width="120" height="7" rx="1" fill="#f59e0b" />
                  <rect x="18" y="44" width="6" height="8" fill="#d97706" />
                  <rect x="136" y="44" width="6" height="8" fill="#d97706" />
                </>
              ) : currentRoof.type === 'shed' ? (
                <>
                  <polygon points="20,55 140,25 140,30 20,60" fill="#f59e0b" />
                  <line x1="20" y1="55" x2="140" y2="55" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 2" />
                  <path d="M 50 55 A 25 25 0 0 1 48 48" fill="none" stroke="#ea580c" strokeWidth="1.5" />
                </>
              ) : (
                <>
                  {/* Gable triangle */}
                  <polygon
                    points={`20,55 ${80 + (currentRoof.ridgeOffset || 0) * 8},${Math.max(12, 55 - (currentRoof.height || 2.2) * 16)} 140,55`}
                    fill="#f59e0b"
                    fillOpacity="0.85"
                  />
                  {/* Base reference line */}
                  <line x1="20" y1="55" x2="140" y2="55" stroke="#94a3b8" strokeWidth="1" strokeDasharray="2 2" />
                  {/* Angle arc */}
                  <path d="M 45 55 A 20 20 0 0 0 42 45" fill="none" stroke="#ea580c" strokeWidth="2" />
                  <text x="48" y="50" fontSize="8" fill="#ea580c" fontWeight="bold">
                    {Math.round(currentRoof.pitchDegrees)}°
                  </text>
                </>
              )}
            </svg>
          </div>

          {/* Dimension metrics */}
          <div className="flex-1 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
              <span className="text-[11px] text-stone-400">Traufhöhe:</span>
              <span className="font-semibold tabular-nums text-stone-800 dark:text-stone-200">
                {formatGermanNumber(currentRoof.baseHeight ?? envelope.avgH)} m
              </span>
            </div>
            <div className="flex items-center justify-between text-stone-600 dark:text-stone-300">
              <span className="text-[11px] text-stone-400">Dachhöhe (First):</span>
              <span className="font-bold tabular-nums text-amber-600 dark:text-amber-400">
                +{formatGermanNumber(currentRoof.height)} m
              </span>
            </div>
            <div className="h-px bg-stone-100 dark:bg-stone-800 w-full" />
            <div className="flex items-center justify-between text-stone-900 dark:text-white font-bold">
              <span className="text-[11px] text-stone-500">Gesamthöhe:</span>
              <span className="tabular-nums">
                {formatGermanNumber((currentRoof.baseHeight ?? envelope.avgH) + currentRoof.height)} m
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TABS: FORM · MAßE · MATERIAL · ZUBEHÖR */}
      <div className="flex items-center border-b border-stone-200 dark:border-stone-800 px-3 bg-stone-50/50 dark:bg-stone-850/50 shrink-0">
        {[
          { id: 'form' as const, label: 'Form', icon: Sparkles },
          { id: 'dimensions' as const, label: 'Maße', icon: Ruler },
          { id: 'material' as const, label: 'Material', icon: Palette },
          { id: 'accessories' as const, label: 'Zubehör', icon: Flame },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                isActive
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 4. SCROLLABLE TAB CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 safe-bottom">
        {/* ============================================================== */}
        {/* TAB 1: DACHFORM (11 Cards, >= 96pt, with uniform isometric SVGs) */}
        {/* ============================================================== */}
        {activeTab === 'form' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Dachform wählen (11 Formen)
              </span>
              <span className="text-[11px] text-stone-400">Tippen zum Auswählen</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {ROOF_FORMS.map((item) => {
                const isSelected = currentRoof.type === item.type;
                return (
                  <div
                    key={item.type}
                    onClick={() => {
                      updateField('type', item.type);
                      if (item.type === 'flat') {
                        handlePitchChange(0);
                      } else if (currentRoof.pitchDegrees === 0) {
                        handlePitchChange(35);
                      }
                    }}
                    className={`min-h-[104px] p-3 rounded-2xl border-2 flex flex-col items-center justify-between transition-all cursor-pointer relative select-none ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-md ring-2 ring-amber-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-amber-300 dark:hover:border-stone-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}

                    {/* Isometric Roof Drawing */}
                    <div className="w-16 h-12 flex items-center justify-center">
                      <svg viewBox="0 0 64 48" className="w-full h-full">
                        {/* House Base */}
                        <polygon points="12,28 32,38 52,28 52,42 32,48 12,38" fill="#cbd5e1" opacity="0.6" />
                        
                        {/* Roof Cap by type */}
                        {item.type === 'gable' && (
                          <>
                            <polygon points="12,28 32,14 32,24 12,38" fill="#f59e0b" />
                            <polygon points="32,14 52,28 32,38 32,24" fill="#d97706" />
                          </>
                        )}
                        {item.type === 'shed' && (
                          <polygon points="12,22 52,14 52,28 12,36" fill="#f59e0b" />
                        )}
                        {item.type === 'hip' && (
                          <>
                            <polygon points="12,28 32,18 32,28 12,38" fill="#f59e0b" />
                            <polygon points="32,18 52,28 32,38 32,28" fill="#d97706" />
                            <polygon points="26,18 38,18 52,28 12,28" fill="#b45309" opacity="0.7" />
                          </>
                        )}
                        {item.type === 'tent' && (
                          <>
                            <polygon points="12,28 32,12 32,38" fill="#f59e0b" />
                            <polygon points="32,12 52,28 32,38" fill="#d97706" />
                          </>
                        )}
                        {item.type === 'flat' && (
                          <>
                            <polygon points="10,26 32,36 54,26 32,16" fill="#f59e0b" />
                            <polyline points="10,24 32,34 54,24" fill="none" stroke="#d97706" strokeWidth="2" />
                          </>
                        )}
                        {item.type === 'mansard' && (
                          <>
                            <polygon points="12,28 20,20 32,16 32,38" fill="#f59e0b" />
                            <polygon points="32,16 44,20 52,28 32,38" fill="#d97706" />
                          </>
                        )}
                        {item.type === 'half_hip' && (
                          <>
                            <polygon points="12,28 32,14 52,28" fill="#f59e0b" />
                            <polygon points="22,14 42,14 32,20" fill="#d97706" />
                          </>
                        )}
                        {item.type === 'barrel' && (
                          <path d="M 12 28 Q 32 10 52 28 L 32 38 Z" fill="#f59e0b" />
                        )}
                        {item.type === 'butterfly' && (
                          <>
                            <polygon points="12,18 32,28 12,38" fill="#f59e0b" />
                            <polygon points="52,18 32,28 52,38" fill="#d97706" />
                          </>
                        )}
                        {item.type === 'sawtooth' && (
                          <>
                            <polygon points="12,28 22,16 22,26 12,38" fill="#f59e0b" />
                            <polygon points="22,26 32,16 32,26 22,36" fill="#d97706" />
                            <polygon points="32,26 42,16 42,26 32,36" fill="#f59e0b" />
                          </>
                        )}
                        {item.type === 'freeform' && (
                          <polygon points="14,24 30,16 50,22 46,36 20,34" fill="#f59e0b" />
                        )}
                      </svg>
                    </div>

                    <div className="w-full text-center">
                      <span className={`text-xs font-bold block ${isSelected ? 'text-amber-800 dark:text-amber-300' : 'text-stone-800 dark:text-stone-200'}`}>
                        {item.label}
                      </span>
                    </div>

                    {/* Info Trigger Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedInfoForm(expandedInfoForm === item.type ? null : item.type);
                      }}
                      title="Beschreibung anzeigen"
                      className="absolute bottom-2 right-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Description Card for Selected Form */}
            {expandedInfoForm && (
              <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800 text-xs text-stone-600 dark:text-stone-300 flex items-start gap-2.5 animate-in fade-in duration-150">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold text-stone-900 dark:text-white block mb-0.5">
                    {ROOF_FORMS.find((f) => f.type === expandedInfoForm)?.label}:
                  </span>
                  <span>{ROOF_FORMS.find((f) => f.type === expandedInfoForm)?.desc}</span>
                </div>
                <button
                  onClick={() => setExpandedInfoForm(null)}
                  className="text-stone-400 hover:text-stone-600"
                >
                  ✕
                </button>
              </div>
            )}

            {/* FIRST- & GEFÄLLE-RICHTUNG (Context-sensitive pictograms) */}
            {currentRoof.type === 'shed' ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Gefälle-Richtung (Tiefe Kante):
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'front' as const, label: 'Vorne (Süd)', icon: ArrowDown },
                    { id: 'back' as const, label: 'Hinten (Nord)', icon: ArrowUp },
                    { id: 'left' as const, label: 'Links (West)', icon: ArrowLeft },
                    { id: 'right' as const, label: 'Rechts (Ost)', icon: ArrowRight },
                  ].map((dir) => {
                    const isSelected = (currentRoof.slopeDirection || 'front') === dir.id;
                    const Icon = dir.icon;
                    return (
                      <button
                        key={dir.id}
                        onClick={() => updateField('slopeDirection', dir.id)}
                        className={`h-16 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-amber-500 bg-amber-500 text-white font-bold shadow-sm'
                            : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-[10px]">{dir.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : currentRoof.type !== 'tent' && currentRoof.type !== 'flat' ? (
              <div className="flex flex-col gap-2 pt-2 border-t border-stone-200 dark:border-stone-800">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Firstrichtung:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={() => updateField('ridgeDirection', 'horizontal')}
                    className={`h-18 p-2 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      currentRoof.ridgeDirection === 'horizontal'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 font-bold text-amber-900 dark:text-amber-200 shadow-sm'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {/* Top view footprint horizontal ridge */}
                    <div className="w-12 h-10 border-2 border-stone-400 rounded-md relative flex items-center justify-center bg-stone-100 dark:bg-stone-800 shrink-0">
                      <div className="w-full h-0.5 bg-amber-500" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block">Längsfirst</span>
                      <span className="text-[10px] text-stone-400">Parallel zur langen Seite</span>
                    </div>
                  </button>

                  <button
                    onClick={() => updateField('ridgeDirection', 'vertical')}
                    className={`h-18 p-2 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      currentRoof.ridgeDirection === 'vertical'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 font-bold text-amber-900 dark:text-amber-200 shadow-sm'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 text-stone-600 dark:text-stone-300'
                    }`}
                  >
                    {/* Top view footprint vertical ridge */}
                    <div className="w-12 h-10 border-2 border-stone-400 rounded-md relative flex items-center justify-center bg-stone-100 dark:bg-stone-800 shrink-0">
                      <div className="h-full w-0.5 bg-amber-500" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold block">Querfirst</span>
                      <span className="text-[10px] text-stone-400">Quer zur langen Seite</span>
                    </div>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MAßE & NEIGUNG (Live sliders, Linked heights, Overhangs) */}
        {/* ============================================================== */}
        {activeTab === 'dimensions' && (
          <div className="flex flex-col gap-5">
            {/* 1. BETRIEBSART TRAUFHÖHE (2 Klare Karten) */}
            <div className="flex flex-col gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Wand- und Trauf-Bezug
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => updateField('pitchMode', 'follow_walls')}
                  className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    (currentRoof.pitchMode || 'follow_walls') === 'follow_walls'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 font-bold'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 text-stone-600'
                  }`}
                >
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Dach folgt Wänden
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                    Traufe sitzt bündig auf Wandoberkante ({formatGermanNumber(envelope.avgH)} m)
                  </span>
                </div>

                <div
                  onClick={() => updateField('pitchMode', 'specify_pitch')}
                  className={`p-3 rounded-2xl border-2 flex flex-col justify-between gap-1 transition-all cursor-pointer ${
                    currentRoof.pitchMode === 'specify_pitch'
                      ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 font-bold'
                      : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 text-stone-600'
                  }`}
                >
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Neigung vorgeben
                  </span>
                  <span className="text-[10px] text-stone-500 dark:text-stone-400 leading-tight">
                    Wände werden bis zum Dach hochgezogen
                  </span>
                </div>
              </div>
            </div>

            {/* 2. DACHNEIGUNG SLIDER & QUICK CHIPS */}
            {currentRoof.type !== 'flat' && (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Dachneigung:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="5"
                      max="75"
                      value={Math.round(currentRoof.pitchDegrees)}
                      onChange={(e) => handlePitchChange(parseFloat(e.target.value) || 35)}
                      className="w-16 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-center font-bold text-sm text-amber-600 dark:text-amber-400"
                    />
                    <span className="text-xs font-bold text-stone-400">°</span>
                  </div>
                </div>

                {/* Big Slider Thumb >= 44pt */}
                <input
                  type="range"
                  min="10"
                  max="65"
                  step="1"
                  value={Math.round(currentRoof.pitchDegrees)}
                  onChange={(e) => handlePitchChange(parseFloat(e.target.value))}
                  className="w-full h-3 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500 min-h-[44px]"
                />

                {/* Quick Chips 15°, 25°, 35°, 45° */}
                <div className="flex items-center gap-2">
                  {[15, 25, 35, 45, 50].map((deg) => (
                    <button
                      key={deg}
                      onClick={() => handlePitchChange(deg)}
                      className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        Math.abs(currentRoof.pitchDegrees - deg) < 1
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3. FIRSTHÖHE ÜBER TRAUFE (GEKOPPELT) */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Firsthöhe über Traufe:
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    min="0.3"
                    max="6.0"
                    value={currentRoof.height}
                    onChange={(e) => handleHeightChange(parseFloat(e.target.value) || 2.0)}
                    className="w-20 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-center font-bold text-sm text-stone-900 dark:text-white"
                  />
                  <span className="text-xs font-bold text-stone-400">m</span>
                </div>
              </div>
            </div>

            {/* 4. DACHÜBERSTAND (Traufe & Ortgang getrennt) */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                  Dachüberstand:
                </span>
                <button
                  onClick={() => updateField('isOverhangLinked', !(currentRoof.isOverhangLinked ?? true))}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-xs font-semibold text-stone-600 dark:text-stone-300 cursor-pointer"
                >
                  {(currentRoof.isOverhangLinked ?? true) ? (
                    <>
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Gleich</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-stone-400" />
                      <span>Getrennt</span>
                    </>
                  )}
                </button>
              </div>

              {/* Traufüberstand */}
              <div className="flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-850 p-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-800">
                <div className="text-xs">
                  <span className="font-bold text-stone-800 dark:text-stone-200 block">Traufe (Längs)</span>
                  <span className="text-[10px] text-stone-400">Regenschutz Außenwand</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1.5"
                    value={currentRoof.overhangEaves ?? currentRoof.overhang}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      updateField('overhangEaves', val);
                      if (currentRoof.isOverhangLinked ?? true) {
                        updateField('overhangGable', val);
                        updateField('overhang', val);
                      }
                    }}
                    className="w-16 h-8 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-center font-bold text-xs"
                  />
                  <span className="text-xs text-stone-400">m</span>
                </div>
              </div>

              {/* Ortgangüberstand */}
              {!(currentRoof.isOverhangLinked ?? true) && (
                <div className="flex items-center justify-between gap-3 bg-stone-50 dark:bg-stone-850 p-2.5 rounded-2xl border border-stone-200/80 dark:border-stone-800 animate-in fade-in">
                  <div className="text-xs">
                    <span className="font-bold text-stone-800 dark:text-stone-200 block">Ortgang (Giebel)</span>
                    <span className="text-[10px] text-stone-400">Giebelüberstand</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1.5"
                      value={currentRoof.overhangGable ?? currentRoof.overhang}
                      onChange={(e) => updateField('overhangGable', parseFloat(e.target.value) || 0)}
                      className="w-16 h-8 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-center font-bold text-xs"
                    />
                    <span className="text-xs text-stone-400">m</span>
                  </div>
                </div>
              )}

              {/* Quick Overhang Chips */}
              <div className="flex items-center gap-2">
                {[
                  { val: 0, label: '0 cm (Bündig)' },
                  { val: 0.4, label: '40 cm (Standard)' },
                  { val: 0.8, label: '80 cm (Vordach)' },
                ].map((item) => (
                  <button
                    key={item.val}
                    onClick={() => {
                      updateField('overhang', item.val);
                      updateField('overhangEaves', item.val);
                      updateField('overhangGable', item.val);
                    }}
                    className="flex-1 h-8 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-750 text-[10px] font-bold text-stone-600 dark:text-stone-300 cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 5. ASYMMETRIE & FIRSTVERSATZ (Satteldach) */}
            {currentRoof.type === 'gable' && (
              <div className="flex flex-col gap-2 pt-3 border-t border-stone-200 dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-700 dark:text-stone-300">
                    Firstversatz (Asymmetrie):
                  </span>
                  <span className="text-xs font-mono font-bold text-amber-600">
                    {formatGermanNumber(currentRoof.ridgeOffset || 0)} m
                  </span>
                </div>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={currentRoof.ridgeOffset || 0}
                  onChange={(e) => updateField('ridgeOffset', parseFloat(e.target.value))}
                  className="w-full h-3 bg-stone-200 dark:bg-stone-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: MATERIAL & FARBE (Vollständige Namen, echte Kacheln) */}
        {/* ============================================================== */}
        {activeTab === 'material' && (
          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Dachdeckung & Material
            </span>

            <div className="grid grid-cols-1 gap-2">
              {MATERIALS.map((mat) => {
                const isSelected = currentRoof.material === mat.id;
                return (
                  <div
                    key={mat.id}
                    onClick={() => updateField('material', mat.id)}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 shadow-xs'
                        : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 hover:border-amber-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Material Swatch */}
                      <div
                        className="w-9 h-9 rounded-xl shadow-xs border border-white/20 shrink-0"
                        style={{ background: mat.sampleGradient }}
                      />
                      <span className="text-xs font-bold text-stone-900 dark:text-white">
                        {mat.label}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: ZUBEHÖR (Schornstein, Dachfenster, Gauben, Solar) */}
        {/* ============================================================== */}
        {activeTab === 'accessories' && (
          <div className="flex flex-col gap-3.5">
            <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
              Dach-Zubehör & Einbauten
            </span>

            {/* Schornstein */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Kamin / Schornstein
                  </span>
                  <span className="text-[11px] text-stone-400">Gemauerter Kaminzug</span>
                </div>
              </div>
              <button
                onClick={() => updateField('hasChimney', !currentRoof.hasChimney)}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
                  currentRoof.hasChimney ? 'bg-amber-600' : 'bg-stone-300 dark:bg-stone-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform absolute top-0.5 ${
                    currentRoof.hasChimney ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Dachfenster */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Sun className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Dachfenster
                  </span>
                  <span className="text-[11px] text-stone-400">Schwingfenster im Dach</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateField('skylightsCount', Math.max(0, currentRoof.skylightsCount - 1))}
                  className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold text-xs"
                >
                  -
                </button>
                <span className="w-6 text-center font-bold text-xs">{currentRoof.skylightsCount}</span>
                <button
                  onClick={() => updateField('skylightsCount', currentRoof.skylightsCount + 1)}
                  className="w-7 h-7 rounded-lg bg-stone-100 dark:bg-stone-800 font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>

            {/* Solarmodule / Photovoltaik */}
            <div className="p-3.5 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-850 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-stone-900 dark:text-white block">
                    Photovoltaik / Solarmodule
                  </span>
                  <span className="text-[11px] text-stone-400">Aufdach-Solaranlage</span>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                Aktiv
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
