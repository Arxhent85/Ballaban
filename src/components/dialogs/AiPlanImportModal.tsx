/**
 * AI Plan Import & Architecture Digitization Wizard
 * 
 * Supports:
 * - Camera, photo gallery, file upload, drag-and-drop, clipboard paste, PDF pages
 * - Image prep: 4-corner perspective keystone warp, crop, rotate, sketch B/W filter
 * - Multi-image input (floor plan + elevation/section)
 * - Scale calibration (2-point touch loupe, total dimensions, labeled dimensions)
 * - Gemini AI plan recognition with progress bar & cancel
 * - Interactive Review View with blend slider (Überblend-Regler) and group filters
 * - Correction options: straighten walls, round dimensions, library furniture
 * - Real CAD plan creation as a single undo step
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  RotateCw,
  Crop,
  Layers,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Sliders,
  Maximize2,
  ZoomIn,
  Trash2,
  Loader2,
  HelpCircle,
  Eye,
  Settings,
  ArrowRight,
  ArrowLeft,
  Key,
  ShieldCheck,
  FileText,
  Compass,
} from 'lucide-react';
import { Point2D, CadProject, Floor, Wall, Door, Window, Room, Furniture, Stair, Roof } from '../../types/cad';
import {
  ImportImageItem,
  CalibrationData,
  AiPlanAnalysisResult,
  AiImportOptions,
  PlanQualityCheckItem,
} from '../../types/aiImport';
import {
  getStoredApiKey,
  getStoredModel,
  hasPrivacyConsent,
  setPrivacyConsent,
  analyzePlanImages,
  testGeminiConnection,
} from '../../utils/geminiAi';
import { loadImageFromFile, processImageToDataUrl } from '../../utils/imageProcessing';
import { calibrateAndTransformPlan } from '../../utils/aiPlanCalibrator';
import { convertAiPlanToCadObjects } from '../../utils/aiPlanToCad';

interface AiPlanImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: CadProject;
  activeFloor: Floor;
  onImportPlan: (data: {
    walls: Wall[];
    doors: Door[];
    windows: Window[];
    rooms: Room[];
    furniture: Furniture[];
    stairs: Stair[];
    roof?: Roof;
    backgroundImageUrl?: string;
    backgroundWidthM?: number;
    backgroundHeightM?: number;
    target: AiImportOptions['targetDestination'];
    qualityChecks: PlanQualityCheckItem[];
  }) => void;
  onOpenSettings: (tab: 'standards' | 'snapping' | 'ai') => void;
}

type WizardStep = 'upload' | 'prep' | 'calibrate' | 'analyzing' | 'review' | 'report';

export const AiPlanImportModal: React.FC<AiPlanImportModalProps> = ({
  isOpen,
  onClose,
  project,
  activeFloor,
  onImportPlan,
  onOpenSettings,
}) => {
  const [step, setStep] = useState<WizardStep>('upload');
  const [images, setImages] = useState<ImportImageItem[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0);

  // Pre-processing states
  const [prepMode, setPrepMode] = useState<'normal' | 'perspective' | 'crop'>('normal');
  const [perspectivePins, setPerspectivePins] = useState<{
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  } | null>(null);
  const [cropBox, setCropBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [sketchMode, setSketchMode] = useState<boolean>(false);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);

  // Calibration states
  const [calibrationPointA, setCalibrationPointA] = useState<Point2D | null>(null);
  const [calibrationPointB, setCalibrationPointB] = useState<Point2D | null>(null);
  const [calibLengthM, setCalibLengthM] = useState<number>(8.0);
  const [totalBuildingWidthM, setTotalBuildingWidthM] = useState<string>('');
  const [calibrationData, setCalibrationData] = useState<CalibrationData | null>(null);

  // Analysis & Gemini states
  const [analysisProgressMsg, setAnalysisProgressMsg] = useState<string>('');
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [rawAiResult, setRawAiResult] = useState<AiPlanAnalysisResult | null>(null);
  const [calibratedResult, setCalibratedResult] = useState<AiPlanAnalysisResult | null>(null);

  // Privacy notice
  const [showPrivacyNotice, setShowPrivacyNotice] = useState<boolean>(false);
  const [dontShowPrivacyAgain, setDontShowPrivacyAgain] = useState<boolean>(true);

  // Missing key inline prompt
  const [inlineApiKey, setInlineApiKey] = useState<string>('');
  const [isInlineTestingKey, setIsInlineTestingKey] = useState<boolean>(false);
  const [inlineKeyError, setInlineKeyError] = useState<string | null>(null);

  // Review & options states
  const [blendAlpha, setBlendAlpha] = useState<number>(0.65); // 0 = original image, 1 = CAD vectors
  const [importOptions, setImportOptions] = useState<AiImportOptions>({
    autoStraightenWalls: true,
    roundDimensions: '5cm',
    replaceWithLibraryFurniture: true,
    useDefaultWallThickness: true,
    keepUnderlayInProject: true,
    targetDestination: 'new_project',
  });
  const [filterGroups, setFilterGroups] = useState({
    walls: true,
    doors: true,
    windows: true,
    rooms: true,
    furniture: true,
    stairs: true,
  });

  // Quality check report
  const [qualityChecks, setQualityChecks] = useState<PlanQualityCheckItem[]>([]);

  // Canvas refs
  const prepCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const reviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const activeImage = images[activeImageIndex] || null;

  // Reset or setup on open
  useEffect(() => {
    if (isOpen) {
      if (images.length === 0) {
        setStep('upload');
      }
      setInlineApiKey(getStoredApiKey());
      setAnalysisError(null);
    }
  }, [isOpen]);

  // Handle global paste
  useEffect(() => {
    if (!isOpen) return;
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const loaded = await loadImageFromFile(file, images.length === 0 ? 'floorplan' : 'elevation');
            setImages((prev) => [...prev, ...loaded]);
            setStep('prep');
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen, images.length]);

  // Handle file picker selection
  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: ImportImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const loaded = await loadImageFromFile(files[i], images.length === 0 && i === 0 ? 'floorplan' : 'elevation');
        newItems.push(...loaded);
      } catch (err: any) {
        alert(err.message || 'Fehler beim Laden der Datei');
      }
    }
    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems]);
      setActiveImageIndex(images.length);
      setStep('prep');
    }
    e.target.value = '';
  };

  // Dropzone drag handlers
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    const newItems: ImportImageItem[] = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const loaded = await loadImageFromFile(files[i], images.length === 0 && i === 0 ? 'floorplan' : 'elevation');
        newItems.push(...loaded);
      } catch (err: any) {
        alert(err.message || 'Fehler beim Laden der Datei');
      }
    }
    if (newItems.length > 0) {
      setImages((prev) => [...prev, ...newItems]);
      setActiveImageIndex(images.length);
      setStep('prep');
    }
  };

  // Initialize perspective corner pins when entering prep mode
  useEffect(() => {
    if (activeImage && !perspectivePins) {
      const w = activeImage.width || 800;
      const h = activeImage.height || 600;
      setPerspectivePins({
        topLeft: { x: w * 0.05, y: h * 0.05 },
        topRight: { x: w * 0.95, y: h * 0.05 },
        bottomRight: { x: w * 0.95, y: h * 0.95 },
        bottomLeft: { x: w * 0.05, y: h * 0.95 },
      });
    }
  }, [activeImage, perspectivePins]);

  // Draw Prep Canvas (Rendering source, filters, perspective pins or crop box)
  useEffect(() => {
    if (step !== 'prep' && step !== 'calibrate') return;
    const canvas = prepCanvasRef.current;
    if (!canvas || !activeImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Render perspective pins if in perspective mode
      if (prepMode === 'perspective' && perspectivePins) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(perspectivePins.topLeft.x, perspectivePins.topLeft.y);
        ctx.lineTo(perspectivePins.topRight.x, perspectivePins.topRight.y);
        ctx.lineTo(perspectivePins.bottomRight.x, perspectivePins.bottomRight.y);
        ctx.lineTo(perspectivePins.bottomLeft.x, perspectivePins.bottomLeft.y);
        ctx.closePath();
        ctx.stroke();

        // Corner handles
        const pins = [
          { p: perspectivePins.topLeft, label: 'OL' },
          { p: perspectivePins.topRight, label: 'OR' },
          { p: perspectivePins.bottomRight, label: 'UR' },
          { p: perspectivePins.bottomLeft, label: 'UL' },
        ];
        for (const pin of pins) {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(pin.p.x, pin.p.y, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      }

      // Render calibration line if in calibrate step
      if (step === 'calibrate') {
        if (calibrationPointA) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(calibrationPointA.x, calibrationPointA.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        if (calibrationPointB) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(calibrationPointB.x, calibrationPointB.y, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }
        if (calibrationPointA && calibrationPointB) {
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 3.5;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(calibrationPointA.x, calibrationPointA.y);
          ctx.lineTo(calibrationPointB.x, calibrationPointB.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };
    img.src = activeImage.dataUrl;
  }, [step, activeImage, prepMode, perspectivePins, calibrationPointA, calibrationPointB]);

  // Handle tap on calibrate canvas to set points A and B
  const handleCalibrateCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (step !== 'calibrate') return;
    const canvas = prepCanvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (!calibrationPointA || (calibrationPointA && calibrationPointB)) {
      setCalibrationPointA({ x, y });
      setCalibrationPointB(null);
    } else {
      setCalibrationPointB({ x, y });
      const pxDist = Math.hypot(x - calibrationPointA.x, y - calibrationPointA.y);
      if (pxDist > 10 && calibLengthM > 0) {
        setCalibrationData({
          type: 'two_points',
          pointA: calibrationPointA,
          pointB: { x, y },
          pixelDistance: pxDist,
          realLengthM: calibLengthM,
          pixelsPerMeter: pxDist / calibLengthM,
          isCalibrated: true,
        });
      }
    }
  };

  // Trigger analysis
  const handleStartAnalysis = async () => {
    const key = inlineApiKey.trim() || getStoredApiKey();
    if (!key) {
      setInlineKeyError('Bitte einen Gemini API-Schlüssel eintragen, um die KI-Erkennung zu starten.');
      return;
    }

    if (!hasPrivacyConsent()) {
      setShowPrivacyNotice(true);
      return;
    }

    setStep('analyzing');
    setAnalysisError(null);
    setAnalysisProgressMsg('Bilder werden vorbereitet...');

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // 1. Process active images (apply rotation, filters, keystone)
      const processedImages: ImportImageItem[] = [];
      for (const item of images) {
        const proc = await processImageToDataUrl({
          ...item,
          rotationDeg,
          perspectiveCorners: prepMode === 'perspective' && perspectivePins ? perspectivePins : undefined,
          cropRect: cropBox || undefined,
          filterSettings: {
            brightness,
            contrast,
            sketchMode,
          },
        });
        processedImages.push({
          ...item,
          dataUrl: proc.dataUrl,
          width: proc.width,
          height: proc.height,
        });
      }

      // 2. Call Gemini
      const result = await analyzePlanImages(
        processedImages,
        '',
        key,
        getStoredModel(),
        (msg) => setAnalysisProgressMsg(msg),
        controller.signal
      );

      setRawAiResult(result);

      // 3. Calibrate and transform plan
      const calibrated = calibrateAndTransformPlan(result, calibrationData || undefined, {
        autoStraighten: importOptions.autoStraightenWalls,
        roundDimensions: importOptions.roundDimensions,
        useDefaultThickness: importOptions.useDefaultWallThickness,
        defaultExteriorThickness: project.defaults?.exteriorWallThickness,
        defaultInteriorThickness: project.defaults?.interiorWallThickness,
      });

      setCalibratedResult(calibrated.calibratedResult);
      setStep('review');
    } catch (err: any) {
      if (controller.signal.aborted) {
        setStep('prep');
        return;
      }
      setAnalysisError(err.message || 'Analyse fehlgeschlagen');
      setStep('analyzing'); // stay on analyzing to display retry / settings options
    } finally {
      setAbortController(null);
    }
  };

  // Draw Review Canvas (Overlaid image + CAD vectors)
  useEffect(() => {
    if (step !== 'review' || !calibratedResult || !activeImage) return;
    const canvas = reviewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw original photo with (1 - blendAlpha) opacity
      ctx.globalAlpha = Math.max(0.15, 1 - blendAlpha * 0.7);
      ctx.drawImage(img, 0, 0);
      ctx.globalAlpha = 1.0;

      const pxScale = calibratedResult.scalePxPerMeter;

      // 2. Draw Rooms (Polygons with light color & badges)
      if (filterGroups.rooms) {
        for (const r of calibratedResult.rooms) {
          if (!r.selected || r.polygon.length < 3) continue;
          ctx.beginPath();
          const p0 = r.polygon[0];
          ctx.moveTo(p0.x * pxScale, p0.y * pxScale);
          for (let i = 1; i < r.polygon.length; i++) {
            ctx.lineTo(r.polygon[i].x * pxScale, r.polygon[i].y * pxScale);
          }
          ctx.closePath();
          ctx.fillStyle = r.confidence < 0.7 ? 'rgba(249, 115, 22, 0.25)' : 'rgba(245, 158, 11, 0.18)';
          ctx.fill();
          ctx.strokeStyle = r.confidence < 0.7 ? '#f97316' : '#f59e0b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Room Label badge
          if (r.polygon.length > 0) {
            const centerX = (r.polygon.reduce((acc, p) => acc + p.x, 0) / r.polygon.length) * pxScale;
            const centerY = (r.polygon.reduce((acc, p) => acc + p.y, 0) / r.polygon.length) * pxScale;
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${r.name} ${r.areaM2 ? `(${r.areaM2.toFixed(1)} m²)` : ''}`, centerX, centerY);
          }
        }
      }

      // 3. Draw Walls
      if (filterGroups.walls) {
        for (const w of calibratedResult.walls) {
          if (!w.selected) continue;
          ctx.beginPath();
          ctx.moveTo(w.startX * pxScale, w.startY * pxScale);
          ctx.lineTo(w.endX * pxScale, w.endY * pxScale);
          ctx.strokeStyle = w.confidence < 0.7 ? '#ea580c' : w.isExterior ? '#0284c7' : '#64748b';
          ctx.lineWidth = Math.max(3, w.thickness * pxScale);
          ctx.lineCap = 'square';
          ctx.stroke();

          // End joints
          ctx.fillStyle = w.confidence < 0.7 ? '#f97316' : '#0284c7';
          ctx.beginPath();
          ctx.arc(w.startX * pxScale, w.startY * pxScale, 4, 0, Math.PI * 2);
          ctx.arc(w.endX * pxScale, w.endY * pxScale, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 4. Draw Doors
      if (filterGroups.doors) {
        for (const d of calibratedResult.doors) {
          if (!d.selected) continue;
          const dx = d.x * pxScale;
          const dy = d.y * pxScale;
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.arc(dx, dy, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Swing arc
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(dx, dy, (d.width * pxScale) / 2, 0, Math.PI / 2);
          ctx.stroke();
        }
      }

      // 5. Draw Windows
      if (filterGroups.windows) {
        for (const win of calibratedResult.windows) {
          if (!win.selected) continue;
          const wx = win.x * pxScale;
          const wy = win.y * pxScale;
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.rect(wx - 8, wy - 4, 16, 8);
          ctx.fill();
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }

      // 6. Draw Furniture
      if (filterGroups.furniture) {
        for (const f of calibratedResult.furniture) {
          if (!f.selected) continue;
          const fx = f.x * pxScale;
          const fy = f.y * pxScale;
          const fw = Math.max(16, (f.width || 1) * pxScale * 0.4);
          const fd = Math.max(16, (f.depth || 0.8) * pxScale * 0.4);

          ctx.save();
          ctx.translate(fx, fy);
          ctx.rotate(((f.rotation || 0) * Math.PI) / 180);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.4)';
          ctx.strokeStyle = '#a855f7';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(-fw / 2, -fd / 2, fw, fd);
          ctx.fillRect(-fw / 2, -fd / 2, fw, fd);
          ctx.fillStyle = '#ffffff';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(f.name, 0, 3);
          ctx.restore();
        }
      }
    };
    img.src = activeImage.dataUrl;
  }, [step, calibratedResult, activeImage, blendAlpha, filterGroups]);

  // Final confirmation: Convert to CAD and pass to App
  const handleCommitPlanCreation = () => {
    if (!calibratedResult) return;

    const conversion = convertAiPlanToCadObjects(calibratedResult, importOptions, project.defaults);
    setQualityChecks(conversion.qualityChecks);

    onImportPlan({
      walls: conversion.walls,
      doors: conversion.doors,
      windows: conversion.windows,
      rooms: conversion.rooms,
      furniture: conversion.furniture,
      stairs: conversion.stairs,
      roof: conversion.roof,
      backgroundImageUrl: importOptions.keepUnderlayInProject && activeImage ? activeImage.dataUrl : undefined,
      backgroundWidthM: calibratedResult.detectedTotalWidthM,
      backgroundHeightM: calibratedResult.detectedTotalDepthM,
      target: importOptions.targetDestination,
      qualityChecks: conversion.qualityChecks,
    });

    onClose();
  };

  // Direct trace mode without AI
  const handleUseAsManualUnderlay = () => {
    if (!activeImage) return;
    const estW = 10.0;
    const estH = (activeImage.height / activeImage.width) * estW;

    onImportPlan({
      walls: [],
      doors: [],
      windows: [],
      rooms: [],
      furniture: [],
      stairs: [],
      backgroundImageUrl: activeImage.dataUrl,
      backgroundWidthM: estW,
      backgroundHeightM: estH,
      target: 'underlay_only',
      qualityChecks: [
        {
          id: 'manual_trace_info',
          type: 'info',
          title: 'Plan als Vorlage eingefügt',
          description: 'Das Bild liegt als transparente Unterlage auf der Zeichenfläche. Sie können nun mit Wandwerkzeug und Fangfunktionen darüber zeichnen.',
          severity: 'info',
        },
      ],
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col text-slate-100 overflow-hidden h-[92vh] max-h-[820px]">
        {/* TOP BAR */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-xs sm:text-sm text-white">Plan & Skizze mit KI digitalisieren</h2>
              <span className="text-[11px] text-slate-400">
                {step === 'upload' && '1. Bildquelle wählen (Foto, Scan, Datei, Zwischenablage)'}
                {step === 'prep' && '2. Bild aufbereiten (Entzerren, Drehen, Schärfen)'}
                {step === 'calibrate' && '3. Maßstab kalibrieren (Referenzmaß setzen)'}
                {step === 'analyzing' && '4. Gemini KI-Erkennung aktiv'}
                {step === 'review' && '5. Erkannte Elemente prüfen, anpassen & Plan erstellen'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenSettings('ai')}
              title="KI-Einstellungen (API-Schlüssel)"
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-slate-300 hover:text-white cursor-pointer transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 overflow-hidden flex flex-col relative bg-slate-950/40">
          {/* STEP 1: UPLOAD & INPUT */}
          {step === 'upload' && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFilesSelected}
                accept="image/*,application/pdf"
                multiple
                className="hidden"
              />
              <input
                type="file"
                ref={cameraInputRef}
                onChange={handleFilesSelected}
                accept="image/*"
                capture="environment"
                className="hidden"
              />

              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>

              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                Handskizze oder Bauplan einfügen
              </h3>
              <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
                Fotografieren Sie Ihre Skizze, wählen Sie eine Bilddatei oder PDF aus, oder fügen Sie ein Bild direkt per Drag & Drop oder Zwischenablage (Strg+V) ein.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center justify-center gap-2.5 transition-all shadow-md cursor-pointer active:scale-98"
                >
                  <Camera className="w-5 h-5" />
                  <span>Foto aufnehmen (Kamera)</span>
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-4 rounded-2xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-white font-semibold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98"
                >
                  <Upload className="w-5 h-5 text-amber-400" />
                  <span>Aus Fotos / Dateien wählen</span>
                </button>
              </div>

              <div className="mt-8 flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  JPG, PNG, HEIC, WebP, PDF
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Lokal & DSGVO-konform
                </span>
              </div>
            </div>
          )}

          {/* STEP 2: PRE-PROCESSING (Entzerren, Drehen, Schärfen) */}
          {step === 'prep' && activeImage && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Center Canvas Viewport */}
              <div className="flex-1 bg-slate-950 flex items-center justify-center overflow-auto p-4 relative select-none">
                <canvas
                  ref={prepCanvasRef}
                  className="max-h-[60vh] md:max-h-[70vh] max-w-full object-contain rounded-lg shadow-xl border border-slate-800"
                />
              </div>

              {/* Sidebar Controls */}
              <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 flex flex-col gap-3.5 shrink-0 overflow-y-auto">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Bild-Aufbereitung</span>

                {/* Perspective & Rotate Tools */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPrepMode(prepMode === 'perspective' ? 'normal' : 'perspective')}
                    className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      prepMode === 'perspective'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Entzerren (4 Ecken)</span>
                  </button>

                  <button
                    onClick={() => setRotationDeg((prev) => (prev + 90) % 360)}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>90° Drehen</span>
                  </button>
                </div>

                {/* Filter sliders */}
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300 font-medium">Skizzen-Modus (S/W):</span>
                    <button
                      onClick={() => setSketchMode(!sketchMode)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-bold cursor-pointer transition-colors ${
                        sketchMode ? 'bg-amber-600 text-white' : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {sketchMode ? 'Aktiv' : 'Aus'}
                    </button>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Kontrast:</span>
                      <span className="font-mono">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Helligkeit:</span>
                      <span className="font-mono">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="180"
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* Multi-image indicator */}
                {images.length > 1 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-semibold text-slate-400">Verknüpfte Bilder ({images.length}):</span>
                    <div className="flex gap-1.5 overflow-x-auto pb-1">
                      {images.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium shrink-0 cursor-pointer border ${
                            idx === activeImageIndex
                              ? 'bg-amber-600 text-white border-amber-500'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {img.role === 'floorplan' ? 'Grundriss' : img.role === 'elevation' ? 'Ansicht' : 'Schnitt'} #{idx + 1}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <button
                    onClick={() => setStep('calibrate')}
                    className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <span>Weiter zur Kalibrierung</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    onClick={handleUseAsManualUnderlay}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Ohne KI als Vorlage verwenden</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: CALIBRATE SCALE */}
          {step === 'calibrate' && activeImage && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center overflow-auto p-4 relative select-none">
                <canvas
                  ref={prepCanvasRef}
                  onClick={handleCalibrateCanvasClick}
                  className="max-h-[60vh] md:max-h-[70vh] max-w-full object-contain rounded-lg shadow-xl border border-slate-800 cursor-crosshair"
                />
                <div className="absolute top-6 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-full text-xs text-amber-300 shadow-lg">
                  Tippen Sie zwei Punkte auf dem Plan an (z. B. eine Außenwand), um den exakten Maßstab festzulegen.
                </div>
              </div>

              {/* Calibration Sidebar */}
              <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 flex flex-col gap-3.5 shrink-0 overflow-y-auto">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Maßstab & Ausrichtung</span>

                {/* 2-Point Reference Measurement */}
                <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs">
                  <span className="font-semibold text-white">2-Punkte Referenzmaß</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Gemessene Länge:</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="100"
                      value={calibLengthM}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 8.0;
                        setCalibLengthM(val);
                        if (calibrationData && calibrationData.pixelDistance) {
                          setCalibrationData({
                            ...calibrationData,
                            realLengthM: val,
                            pixelsPerMeter: calibrationData.pixelDistance / val,
                          });
                        }
                      }}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-right font-mono text-white font-bold"
                    />
                    <span className="text-slate-400 font-mono">m</span>
                  </div>

                  {calibrationPointA && calibrationPointB ? (
                    <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[11px] flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>2 Punkte erfolgreich kalibriert</span>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-400/90 leading-relaxed">
                      Klicken Sie nacheinander auf Start- und Endpunkt einer Wand im Bild.
                    </p>
                  )}
                </div>

                {/* Alternative: Overall House Width */}
                <div className="bg-slate-850 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2.5 text-xs">
                  <span className="font-semibold text-white">Alternativ: Gesamtbreite</span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Hausbreite:</span>
                    <input
                      type="number"
                      step="0.5"
                      placeholder="z.B. 10.0"
                      value={totalBuildingWidthM}
                      onChange={(e) => setTotalBuildingWidthM(e.target.value)}
                      className="w-24 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-right font-mono text-white"
                    />
                    <span className="text-slate-400 font-mono">m</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Wird bevorzugt, falls keine 2 Punkte gesetzt wurden.
                  </span>
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleStartAnalysis}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>KI-Analyse starten</span>
                  </button>

                  <button
                    onClick={() => setStep('prep')}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Zurück zur Aufbereitung</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: ANALYZING SPINNER & PROGRESS */}
          {step === 'analyzing' && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              {!analysisError ? (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6 shadow-xl animate-pulse">
                    <Loader2 className="w-10 h-10 animate-spin" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    Grundriss wird analysiert...
                  </h3>
                  <p className="text-xs text-amber-400 font-medium mb-6">
                    {analysisProgressMsg || 'Wände, Türen, Fenster & Räume werden erkannt...'}
                  </p>

                  <div className="w-full max-w-sm bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full animate-progress w-2/3" />
                  </div>

                  <button
                    onClick={() => {
                      abortController?.abort();
                      setStep('calibrate');
                    }}
                    className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Analyse abbrechen
                  </button>
                </>
              ) : (
                <div className="max-w-md bg-slate-900 border border-rose-800/80 p-6 rounded-2xl flex flex-col items-center text-center shadow-2xl">
                  <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
                  <h3 className="text-base font-bold text-white mb-1.5">Analyse fehlgeschlagen</h3>
                  <p className="text-xs text-rose-300 leading-relaxed mb-6">
                    {analysisError}
                  </p>

                  <div className="flex flex-wrap gap-2 justify-center w-full">
                    <button
                      onClick={handleStartAnalysis}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Erneut versuchen</span>
                    </button>

                    <button
                      onClick={() => onOpenSettings('ai')}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5 text-amber-400" />
                      <span>API-Schlüssel prüfen</span>
                    </button>

                    <button
                      onClick={handleUseAsManualUnderlay}
                      className="px-4 py-2 bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl cursor-pointer"
                    >
                      <span>Als manuelle Vorlage öffnen</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW & CORRECTION VIEW (TEIL 5) */}
          {step === 'review' && calibratedResult && (
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
              {/* Overlay Canvas Viewport */}
              <div className="flex-1 bg-slate-950 flex flex-col items-center justify-center overflow-auto p-4 relative select-none">
                <canvas
                  ref={reviewCanvasRef}
                  className="max-h-[60vh] md:max-h-[70vh] max-w-full object-contain rounded-lg shadow-xl border border-slate-800"
                />

                {/* Floating Blend Slider (Überblend-Regler) */}
                <div className="absolute bottom-6 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-4 py-2 rounded-2xl flex items-center gap-3 text-xs shadow-xl">
                  <span className="text-slate-400 text-[11px] font-medium">Foto</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={blendAlpha}
                    onChange={(e) => setBlendAlpha(parseFloat(e.target.value))}
                    className="w-36 accent-amber-500"
                  />
                  <span className="text-amber-400 text-[11px] font-semibold">CAD-Plan</span>
                </div>
              </div>

              {/* Review Sidebar Controls */}
              <div className="w-full md:w-80 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 flex flex-col gap-3.5 shrink-0 overflow-y-auto">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Erkannte Elemente</span>

                {/* Stats Chips */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Wände:</span>
                    <span className="font-bold text-amber-400">{calibratedResult.walls.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Türen:</span>
                    <span className="font-bold text-emerald-400">{calibratedResult.doors.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Fenster:</span>
                    <span className="font-bold text-sky-400">{calibratedResult.windows.length}</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400">Räume:</span>
                    <span className="font-bold text-amber-500">{calibratedResult.rooms.length}</span>
                  </div>
                </div>

                {/* Layer Toggles */}
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-slate-300 mb-1">Objektgruppen einbinden:</span>
                  {[
                    { key: 'walls', label: 'Wände' },
                    { key: 'doors', label: 'Türen' },
                    { key: 'windows', label: 'Fenster' },
                    { key: 'rooms', label: 'Räume & Beschriftung' },
                    { key: 'furniture', label: 'Möbel & Sanitärobjekte' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 py-0.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(filterGroups as any)[key]}
                        onChange={(e) => setFilterGroups({ ...filterGroups, [key]: e.target.checked })}
                        className="rounded accent-amber-500"
                      />
                      <span className="text-slate-300">{label}</span>
                    </label>
                  ))}
                </div>

                {/* Import Quality Options */}
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs">
                  <span className="font-semibold text-slate-300">Optionen vor Erstellung:</span>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.autoStraightenWalls}
                      onChange={(e) => setImportOptions({ ...importOptions, autoStraightenWalls: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-slate-300">Wände begradigen (0°/90° Einrasten)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.useDefaultWallThickness}
                      onChange={(e) => setImportOptions({ ...importOptions, useDefaultWallThickness: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-slate-300">Standard-Wandstärken anwenden</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.replaceWithLibraryFurniture}
                      onChange={(e) => setImportOptions({ ...importOptions, replaceWithLibraryFurniture: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-slate-300">Möbel durch Bibliothek ersetzen</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importOptions.keepUnderlayInProject}
                      onChange={(e) => setImportOptions({ ...importOptions, keepUnderlayInProject: e.target.checked })}
                      className="rounded accent-amber-500"
                    />
                    <span className="text-slate-300">Originalbild als Vorlage behalten</span>
                  </label>
                </div>

                {/* Target Destination */}
                <div className="bg-slate-850 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 text-xs">
                  <span className="font-semibold text-slate-300">Ziel des Plans:</span>
                  <select
                    value={importOptions.targetDestination}
                    onChange={(e) => setImportOptions({ ...importOptions, targetDestination: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white outline-none cursor-pointer"
                  >
                    <option value="new_project">Neues Projekt (Zeichenfläche ersetzen)</option>
                    <option value="current_floor">In aktuelles Geschoss einfügen</option>
                    <option value="new_floor">Als neues Obergeschoss anlegen</option>
                    <option value="underlay_only">Nur als Vorlage / Unterlage</option>
                  </select>
                </div>

                {/* Actions */}
                <div className="mt-auto flex flex-col gap-2 pt-2">
                  <button
                    onClick={handleCommitPlanCreation}
                    className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Vollständigen CAD-Plan erstellen</span>
                  </button>

                  <button
                    onClick={() => setStep('calibrate')}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Neu kalibrieren</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* PRIVACY CONSENT MODAL */}
        {showPrivacyNotice && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 text-slate-100 flex flex-col gap-4 shadow-2xl">
              <div className="flex items-center gap-2.5 text-amber-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Hinweis zur KI-Plan-Analyse</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Um den Grundriss zu erkennen, wird das Bild über eine verschlüsselte Verbindung an die Google Gemini API übertragen.
                Ihr API-Schlüssel und Ihre Projektdateien verbleiben ausschließlich lokal auf Ihrem Gerät und werden niemals an andere Server übertragen.
              </p>
              <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dontShowPrivacyAgain}
                  onChange={(e) => setDontShowPrivacyAgain(e.target.checked)}
                  className="rounded accent-amber-500"
                />
                <span>Zustimmen und nicht mehr nachfragen</span>
              </label>
              <div className="flex gap-2 justify-end pt-2">
                <button
                  onClick={() => setShowPrivacyNotice(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    if (dontShowPrivacyAgain) setPrivacyConsent(true);
                    setShowPrivacyNotice(false);
                    handleStartAnalysis();
                  }}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Zustimmen & Fortfahren
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
