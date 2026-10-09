/**
 * Ferienhaus Grundriss- & Bauplan-Planer CAD
 * Modern, architectural standalone CAD application with precision drafting and 3D visualization.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CadProject,
  Floor,
  Wall,
  Door,
  Window,
  Stair,
  Roof,
  Room,
  Furniture,
  DimensionLine,
  CadTool,
  SelectionState,
  SnapSettings,
  DEFAULT_SNAP_SETTINGS,
  UnitType,
  ScaleType,
  ViewMode,
  Language,
  Point2D,
  BoundingBox2D,
  PlotBoundary,
  ProjectDefaults,
  TouchInteractionMode,
  PencilMode,
  PrecisionMode,
  TouchGestureSettings,
  DEFAULT_TOUCH_GESTURE_SETTINGS,
  BackgroundImage,
} from './types/cad';
import { PlanQualityCheckItem, AiImportOptions } from './types/aiImport';
import {
  createHolidayHouse6x8Template,
  createEmptyProject,
} from './utils/templates';
import { getT } from './i18n/translations';
import { mergeBoundingBoxes, getWallBoundingBox, getFurnitureBoundingBox, lineIntersection, projectPointOntoWall } from './utils/cadMath';
import { isTouchDevice, isIOSorIPadDevice } from './utils/touchGestures';
import { RotateCcw, Trash2 } from 'lucide-react';

// UI components
import { CadHeader } from './components/toolbar/CadHeader';
import { CadToolbar } from './components/toolbar/CadToolbar';
import { CadStatusBar } from './components/toolbar/CadStatusBar';
import { CadInspector } from './components/inspector/CadInspector';
import { CadFloatingContextBar } from './components/toolbar/CadFloatingContextBar';
import { CadTouchControls } from './components/toolbar/CadTouchControls';
import { CadToolOptionsFlyout } from './components/toolbar/CadToolOptionsFlyout';

// Views
import { CadCanvas2D } from './components/canvas/CadCanvas2D';
import { CadView3D } from './components/views/CadView3D';
import { CadElevationsView } from './components/views/CadElevationsView';
import { CadSectionView } from './components/views/CadSectionView';
import { CadQuantitiesView } from './components/views/CadQuantitiesView';

// Modals & Panels
import { CadRoofPanel } from './components/inspector/CadRoofPanel';
import { HomeScreenGuideModal } from './components/dialogs/HomeScreenGuideModal';
import { WelcomeDialog } from './components/dialogs/WelcomeDialog';
import { HelpDialog } from './components/dialogs/HelpDialog';
import { HouseWizardModal } from './components/dialogs/HouseWizardModal';
import { ExportPrintDialog } from './components/dialogs/ExportPrintDialog';
import { TemplatesModal } from './components/dialogs/TemplatesModal';
import { SettingsDialog } from './components/dialogs/SettingsDialog';
import { FurnitureCatalogModal } from './components/dialogs/FurnitureCatalogModal';
import { WallNumericModal } from './components/dialogs/WallNumericModal';
import { HistoryModal } from './components/dialogs/HistoryModal';
import { RoomEditModal } from './components/dialogs/RoomEditModal';
import { RoofConfigModal } from './components/dialogs/RoofConfigModal';
import { TouchGestureHelpModal } from './components/dialogs/TouchGestureHelpModal';
import { AiPlanImportModal } from './components/dialogs/AiPlanImportModal';
import { VoiceTextCorrectionModal } from './components/dialogs/VoiceTextCorrectionModal';
import { UnderlayCropModal } from './components/dialogs/UnderlayCropModal';
import { loadImageFromFile } from './utils/imageProcessing';

export default function App() {
  // Project state: default to newly designed 6x8m Holiday House
  const [project, setProject] = useState<CadProject>(() => {
    try {
      const saved = localStorage.getItem('cad_holiday_house_project_v3');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.floors && parsed.floors.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return createHolidayHouse6x8Template();
  });

  // Undo / Redo history
  const [history, setHistory] = useState<CadProject[]>([project]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // App UI State
  const [activeTool, setActiveTool] = useState<CadTool>('select');
  const [selection, setSelection] = useState<SelectionState>({ type: 'none', ids: [] });
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [language, setLanguage] = useState<Language>('de');

  // Default is LIGHT THEME per Teil C specifications ("Standard ist ein helles Design...")
  const [isDark, setIsDark] = useState<boolean>(false);
  const [selectedColor, setSelectedColor] = useState('#334155');

  // Canvas zoom & pan
  const [zoom, setZoom] = useState(55);
  const [panOffset, setPanOffset] = useState<Point2D>({ x: 50, y: 40 });
  const [cursorPos, setCursorPos] = useState<Point2D | null>(null);

  // Snapping & Smart Relationship Guides
  const [snapSettings, setSnapSettings] = useState<SnapSettings>(() => {
    try {
      const saved = localStorage.getItem('cad_snap_settings_v2');
      if (saved) {
        return { ...DEFAULT_SNAP_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // ignore
    }
    return { ...DEFAULT_SNAP_SETTINGS };
  });

  const handleSnapSettingsChange = useCallback((next: SnapSettings) => {
    setSnapSettings(next);
    try {
      localStorage.setItem('cad_snap_settings_v2', JSON.stringify(next));
    } catch {
      // quota
    }
  }, []);

  // Dialogs
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('cad_has_seen_welcome_v2');
    } catch {
      return false;
    }
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'standards' | 'snapping' | 'ai'>('standards');
  const [showAiImport, setShowAiImport] = useState(false);
  const [showVoiceCorrection, setShowVoiceCorrection] = useState(false);
  const [showFurnitureCatalog, setShowFurnitureCatalog] = useState(false);
  const [showWallNumeric, setShowWallNumeric] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showRoofModal, setShowRoofModal] = useState(false);
  const [showUnderlayCropModal, setShowUnderlayCropModal] = useState(false);

  // Tool options state (Wall, Door, Window)
  const [wallMode, setWallMode] = useState<'exterior' | 'interior'>('exterior');
  const [wallThicknessM, setWallThicknessM] = useState<number>(project.defaults?.exteriorWallThickness || 0.30);
  const [wallStartHeight, setWallStartHeight] = useState<number>(project.defaults?.wallHeight || 2.50);
  const [wallEndHeight, setWallEndHeight] = useState<number>(project.defaults?.wallHeight || 2.50);
  const [isLockWallHeights, setIsLockWallHeights] = useState<boolean>(true);
  const [isDrawingActive, setIsDrawingActive] = useState<boolean>(false);
  const [doorWidthM, setDoorWidthM] = useState<number>(0.90);
  const [doorHinge, setDoorHinge] = useState<'left' | 'right'>('left');
  const [windowWidthM, setWindowWidthM] = useState<number>(1.20);
  const [windowSillHeightM, setWindowSillHeightM] = useState<number>(0.90);

  // Tablet, Touch & Apple Pencil UI State
  const isTablet = useMemo(() => isTouchDevice(), []);
  const [pencilMode, setPencilMode] = useState<PencilMode>('finger_draws_too');
  const [precisionMode, setPrecisionMode] = useState<PrecisionMode>('normal');
  const [touchSettings, setTouchSettings] = useState<TouchGestureSettings>(() => {
    try {
      const saved = localStorage.getItem('cad_touch_gesture_settings_v1');
      if (saved) return { ...DEFAULT_TOUCH_GESTURE_SETTINGS, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_TOUCH_GESTURE_SETTINGS };
  });
  const [viewRotationDeg, setViewRotationDeg] = useState<number>(0);
  const [leftHandedMode, setLeftHandedMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('cad_left_handed_mode') === 'true';
    } catch {
      return false;
    }
  });
  const [bottomSheetDetent, setBottomSheetDetent] = useState<'peek' | 'half' | 'full'>('half');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [showTouchNumpad, setShowTouchNumpad] = useState<boolean>(false);
  const [numpadValue, setNumpadValue] = useState<string>('');
  const [numpadMode, setNumpadMode] = useState<'length' | 'angle'>('length');
  const [showGestureHelp, setShowGestureHelp] = useState<boolean>(false);
  const [showClipboardSheet, setShowClipboardSheet] = useState<boolean>(false);
  const [isMultiSelectActive, setIsMultiSelectActive] = useState<boolean>(false);
  const [clipboardData, setClipboardData] = useState<{
    walls: Wall[];
    furniture: Furniture[];
    rooms: Room[];
    doors: Door[];
    windows: Window[];
  } | null>(null);

  // Fullscreen state & Home Screen Guide
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    return !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
  });
  const [showHomeScreenGuide, setShowHomeScreenGuide] = useState<boolean>(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(active);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
      try {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if ((document as any).webkitExitFullscreen) await (document as any).webkitExitFullscreen();
      } catch {}
      setIsFullscreen(false);
      return;
    }

    let nativeSuccess = false;
    const docEl = document.documentElement as any;
    try {
      if (docEl.requestFullscreen) {
        await docEl.requestFullscreen();
        nativeSuccess = true;
      } else if (docEl.webkitRequestFullscreen) {
        await docEl.webkitRequestFullscreen();
        nativeSuccess = true;
      }
    } catch {
      nativeSuccess = false;
    }

    if (!nativeSuccess) {
      const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
      let dismissed = false;
      try {
        dismissed = localStorage.getItem('cad_dismiss_homescreen_guide_v1') === 'true';
      } catch {}
      if (!isStandalone && !dismissed) {
        setShowHomeScreenGuide(true);
      }
    }
  }, []);

  const handleSaveDefaultsWalls = useCallback(() => {
    updateProject({
      ...project,
      defaults: {
        ...project.defaults,
        wallHeight: wallStartHeight,
        exteriorWallThickness: wallMode === 'exterior' ? wallThicknessM : project.defaults?.exteriorWallThickness || 0.30,
        interiorWallThickness: wallMode === 'interior' ? wallThicknessM : project.defaults?.interiorWallThickness || 0.115,
      },
    });
  }, [project, wallMode, wallThicknessM, wallStartHeight]);

  // Tablet Wake Lock API (keeps screen awake while drawing)
  useEffect(() => {
    let wakeLock: any = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator && (navigator as any).wakeLock) {
          wakeLock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    };
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLock) wakeLock.release().catch(() => {});
    };
  }, []);

  // Autosave on mobile tab switch or backgrounding
  useEffect(() => {
    const handleSave = () => {
      try {
        localStorage.setItem('cad_holiday_house_project_v3', JSON.stringify(project));
      } catch {}
    };
    window.addEventListener('pagehide', handleSave);
    window.addEventListener('beforeunload', handleSave);
    const handleVis = () => {
      if (document.visibilityState === 'hidden') handleSave();
    };
    document.addEventListener('visibilitychange', handleVis);
    return () => {
      window.removeEventListener('pagehide', handleSave);
      window.removeEventListener('beforeunload', handleSave);
      document.removeEventListener('visibilitychange', handleVis);
    };
  }, [project]);

  // Open drawer automatically when selecting an object on tablet
  useEffect(() => {
    if (isTablet && selection.ids.length > 0) {
      setIsDrawerOpen(true);
    }
  }, [isTablet, selection.ids]);

  // CAD Touch Numpad Handlers
  const handleNumpadInput = useCallback((char: string) => {
    setNumpadValue((prev) => {
      if (char === '.' && prev.includes('.')) return prev;
      if (prev.length >= 8) return prev;
      return prev + char;
    });
  }, []);

  const handleNumpadBackspace = useCallback(() => {
    setNumpadValue((prev) => prev.slice(0, -1));
  }, []);

  const handleNumpadClear = useCallback(() => {
    setNumpadValue('');
  }, []);

  const handleNumpadSwitchMode = useCallback(() => {
    setNumpadMode((prev) => (prev === 'length' ? 'angle' : 'length'));
  }, []);

  const t = getT(language);

  // Active Floor reference
  const activeFloor = useMemo(() => {
    return project.floors.find((f) => f.id === project.activeFloorId) || project.floors[0];
  }, [project]);

  // Coordinate transformation for floating bar
  const worldToScreen = useCallback(
    (wp: Point2D): Point2D => ({
      x: wp.x * zoom + panOffset.x,
      y: wp.y * zoom + panOffset.y,
    }),
    [zoom, panOffset]
  );

  // Selection Bounding Box for Floating Context Bar
  const selectionBoundingBox = useMemo((): BoundingBox2D | null => {
    if ((selection.ids.length === 0 && selection.type === 'none') || selection.type === 'none') return null;

    const boxes: BoundingBox2D[] = [];
    selection.ids.forEach((id) => {
      const wall = activeFloor.walls.find((w) => w.id === id);
      if (wall) boxes.push(getWallBoundingBox(wall));

      const furn = activeFloor.furniture.find((f) => f.id === id);
      if (furn) boxes.push(getFurnitureBoundingBox(furn));

      const door = activeFloor.doors.find((d) => d.id === id);
      if (door) {
        const w = activeFloor.walls.find((wl) => wl.id === door.wallId);
        if (w) {
          const wLen = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
          const cx = w.start.x + ((w.end.x - w.start.x) / wLen) * (door.position * wLen);
          const cy = w.start.y + ((w.end.y - w.start.y) / wLen) * (door.position * wLen);
          boxes.push({ minX: cx - 0.5, minY: cy - 0.5, maxX: cx + 0.5, maxY: cy + 0.5 });
        }
      }

      const win = activeFloor.windows.find((w) => w.id === id);
      if (win) {
        const w = activeFloor.walls.find((wl) => wl.id === win.wallId);
        if (w) {
          const wLen = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
          const cx = w.start.x + ((w.end.x - w.start.x) / wLen) * (win.position * wLen);
          const cy = w.start.y + ((w.end.y - w.start.y) / wLen) * (win.position * wLen);
          boxes.push({ minX: cx - 0.6, minY: cy - 0.6, maxX: cx + 0.6, maxY: cy + 0.6 });
        }
      }

      const rm = activeFloor.rooms.find((r) => r.id === id);
      if (rm && rm.polygon.length > 0) {
        boxes.push({
          minX: Math.min(...rm.polygon.map((p) => p.x)),
          maxX: Math.max(...rm.polygon.map((p) => p.x)),
          minY: Math.min(...rm.polygon.map((p) => p.y)),
          maxY: Math.max(...rm.polygon.map((p) => p.y)),
        });
      }
    });

    if (selection.type === 'plot' || selection.ids.includes('plot')) {
      if (project.plot && project.plot.enabled) {
        const pts =
          project.plot.points && project.plot.points.length >= 3
            ? project.plot.points
            : [
                { x: project.plot.x, y: project.plot.y },
                { x: project.plot.x + project.plot.width, y: project.plot.y },
                { x: project.plot.x + project.plot.width, y: project.plot.y + project.plot.depth },
                { x: project.plot.x, y: project.plot.y + project.plot.depth },
              ];
        boxes.push({
          minX: Math.min(...pts.map((p) => p.x)),
          maxX: Math.max(...pts.map((p) => p.x)),
          minY: Math.min(...pts.map((p) => p.y)),
          maxY: Math.max(...pts.map((p) => p.y)),
        });
      }
    }

    return mergeBoundingBoxes(boxes);
  }, [selection, activeFloor, project.plot]);

  // Commit changes to Project & History
  const updateProject = useCallback(
    (newProject: CadProject) => {
      newProject.updatedAt = new Date().toISOString();
      setProject(newProject);

      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newProject);
      if (newHistory.length > 50) newHistory.shift();

      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);

      try {
        localStorage.setItem('cad_holiday_house_project_v3', JSON.stringify(newProject));
      } catch {
        // quota
      }
    },
    [history, historyIndex]
  );

  // Update elements inside active floor
  const updateActiveFloor = useCallback(
    (updater: (f: Floor) => Floor) => {
      const updatedFloors = project.floors.map((fl) => {
        if (fl.id === activeFloor.id) {
          return updater({ ...fl });
        }
        return fl;
      });
      updateProject({
        ...project,
        floors: updatedFloors,
      });
    },
    [project, activeFloor, updateProject]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      setProject(prev);
      try {
        localStorage.setItem('cad_holiday_house_project_v3', JSON.stringify(prev));
      } catch {}
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      setProject(next);
      try {
        localStorage.setItem('cad_holiday_house_project_v3', JSON.stringify(next));
      } catch {}
    }
  }, [history, historyIndex]);

  // Zoom to Fit (filling approx 70% of canvas)
  const handleZoomFit = useCallback(() => {
    if (activeFloor.walls.length === 0) {
      setZoom(55);
      setPanOffset({ x: 220, y: 160 });
      return;
    }
    const minX = Math.min(...activeFloor.walls.flatMap((w) => [w.start.x, w.end.x]));
    const maxX = Math.max(...activeFloor.walls.flatMap((w) => [w.start.x, w.end.x]));
    const minY = Math.min(...activeFloor.walls.flatMap((w) => [w.start.y, w.end.y]));
    const maxY = Math.max(...activeFloor.walls.flatMap((w) => [w.start.y, w.end.y]));

    const wSpan = Math.max(2, maxX - minX);
    const hSpan = Math.max(2, maxY - minY);

    const canvasWidth = window.innerWidth - 340; // account for toolbar & inspector
    const canvasHeight = window.innerHeight - 100;

    const scaleX = (canvasWidth * 0.7) / wSpan;
    const scaleY = (canvasHeight * 0.7) / hSpan;
    const fitZoom = Math.min(85, Math.max(25, Math.min(scaleX, scaleY)));

    setZoom(fitZoom);
    setPanOffset({
      x: canvasWidth / 2 - ((minX + maxX) / 2) * fitZoom + 50,
      y: canvasHeight / 2 - ((minY + maxY) / 2) * fitZoom,
    });
  }, [activeFloor]);

  // Auto zoom-to-fit on initial mount and ensure underlay layer exists
  useEffect(() => {
    const timer = setTimeout(handleZoomFit, 150);
    setProject((prev) => {
      if (prev.layers.some((l) => l.id === 'underlay')) return prev;
      return {
        ...prev,
        layers: [...prev.layers, { id: 'underlay', name: 'Plan-Vorlage (Hintergrund)', visible: true, locked: false }],
      };
    });
    return () => clearTimeout(timer);
  }, []);

  // Reset / Clear Entire Project to clean blank slate
  const handleResetEmptyProject = useCallback(() => {
    const emptyProj = createEmptyProject();
    if (emptyProj.plot) {
      emptyProj.plot = {
        ...emptyProj.plot,
        enabled: false,
        points: undefined,
      };
    }
    updateProject(emptyProj);
    setSelection({ type: 'none', ids: [] });
    setActiveTool('wall');
    setZoom(55);
    setPanOffset({ x: 50, y: 40 });
    setShowClearConfirm(false);
  }, [updateProject]);

  const handleOpenSettingsWithTab = useCallback((tab: 'standards' | 'snapping' | 'ai') => {
    setSettingsInitialTab(tab);
    setShowSettings(true);
  }, []);

  const handleUpdateBackgroundImage = useCallback((bg?: BackgroundImage) => {
    let nextLayers = project.layers;
    if (bg) {
      const hasUnderlay = project.layers.some((l) => l.id === 'underlay');
      if (hasUnderlay) {
        nextLayers = project.layers.map((l) =>
          l.id === 'underlay' ? { ...l, locked: !!bg.locked, visible: bg.visible !== false } : l
        );
      } else {
        nextLayers = [
          ...project.layers,
          { id: 'underlay', name: 'Plan-Vorlage (Hintergrund)', visible: bg.visible !== false, locked: !!bg.locked },
        ];
      }
    }
    updateProject({
      ...project,
      layers: nextLayers,
      backgroundImage: bg,
    });
  }, [project, updateProject]);

  const handleToggleLockLayer = useCallback((layerId: string) => {
    const isUnderlay = layerId === 'underlay';
    const target = project.layers.find((l) => l.id === layerId);
    const newLocked = target ? !target.locked : true;

    const nextLayers = project.layers.map((l) =>
      l.id === layerId ? { ...l, locked: newLocked } : l
    );

    let nextBg = project.backgroundImage;
    if (isUnderlay && nextBg) {
      nextBg = { ...nextBg, locked: newLocked };
    }

    updateProject({
      ...project,
      layers: nextLayers,
      backgroundImage: nextBg,
    });
  }, [project, updateProject]);

  const handleInsertUnderlayImage = useCallback(async (file: File) => {
    try {
      const items = await loadImageFromFile(file, 'floorplan');
      if (items.length === 0) return;
      const item = items[0];

      const defaultWidthM = 10.0;
      const aspect = item.height && item.width ? item.height / item.width : 0.75;
      const heightM = Math.round(defaultWidthM * aspect * 100) / 100;

      const newBg: BackgroundImage = {
        url: item.dataUrl,
        originalUrl: item.dataUrl,
        x: 0,
        y: 0,
        widthM: defaultWidthM,
        heightM: heightM,
        opacity: 0.5,
        contrast: 100,
        brightness: 100,
        rotationDeg: 0,
        locked: false,
        visible: true,
      };

      const hasUnderlayLayer = project.layers.some((l) => l.id === 'underlay');
      const nextLayers = hasUnderlayLayer
        ? project.layers.map((l) => (l.id === 'underlay' ? { ...l, visible: true, locked: false } : l))
        : [...project.layers, { id: 'underlay', name: 'Plan-Vorlage (Hintergrund)', visible: true, locked: false }];

      updateProject({
        ...project,
        layers: nextLayers,
        backgroundImage: newBg,
      });

      setViewMode('2d');
      setTimeout(handleZoomFit, 100);
    } catch (err: any) {
      alert('Fehler beim Laden der Plan-Vorlage: ' + (err?.message || err));
    }
  }, [project, updateProject, handleZoomFit]);

  const handleImportPlan = useCallback((imported: {
    walls: Wall[];
    doors: Door[];
    windows: Window[];
    rooms: Room[];
    furniture: Furniture[];
    stairs: Stair[];
    roof?: Roof;
    backgroundImageUrl?: string;
    originalImageUrl?: string;
    backgroundWidthM?: number;
    backgroundHeightM?: number;
    contrast?: number;
    brightness?: number;
    sketchMode?: boolean;
    target: AiImportOptions['targetDestination'];
    qualityChecks: PlanQualityCheckItem[];
  }) => {
    const bgImage: BackgroundImage | undefined = (imported.backgroundImageUrl && imported.backgroundWidthM && imported.backgroundHeightM) ? {
      url: imported.backgroundImageUrl,
      originalUrl: imported.originalImageUrl || imported.backgroundImageUrl,
      x: 0,
      y: 0,
      widthM: imported.backgroundWidthM,
      heightM: imported.backgroundHeightM,
      opacity: 0.50,
      contrast: imported.contrast ?? 100,
      brightness: imported.brightness ?? 100,
      sketchMode: imported.sketchMode ?? false,
      locked: false,
    } : project.backgroundImage;

    if (imported.target === 'underlay_only') {
      const hasUnderlay = project.layers.some((l) => l.id === 'underlay');
      const nextLayers = hasUnderlay
        ? project.layers.map((l) => (l.id === 'underlay' ? { ...l, visible: true, locked: false } : l))
        : [...project.layers, { id: 'underlay', name: 'Plan-Vorlage (Hintergrund)', visible: true, locked: false }];

      updateProject({
        ...project,
        layers: nextLayers,
        backgroundImage: bgImage ? { ...bgImage, locked: false } : undefined,
      });
      setShowAiImport(false);
      setViewMode('2d');
      setTimeout(handleZoomFit, 100);
      return;
    }

    if (imported.target === 'new_project') {
      const newFloorId = 'fl_' + Date.now();
      const newProj: CadProject = {
        ...createEmptyProject(),
        id: 'proj_' + Date.now(),
        name: 'KI-Import ' + new Date().toLocaleDateString('de-DE'),
        updatedAt: new Date().toISOString(),
        floors: [
          {
            id: newFloorId,
            name: 'Erdgeschoss (EG)',
            level: 0,
            elevation: 0,
            height: 2.60,
            walls: imported.walls,
            doors: imported.doors,
            windows: imported.windows,
            rooms: imported.rooms,
            furniture: imported.furniture,
            stairs: imported.stairs,
            dimensions: [],
            annotations: [],
            shapes: [],
            roofs: imported.roof ? [imported.roof] : [],
          },
        ],
        activeFloorId: newFloorId,
        backgroundImage: bgImage,
      };
      updateProject(newProj);
      setShowAiImport(false);
      setTimeout(handleZoomFit, 100);
      return;
    }

    if (imported.target === 'new_floor') {
      const newFloorId = 'fl_' + Date.now();
      const level = project.floors.length;
      const newFloor: Floor = {
        id: newFloorId,
        name: `Geschoss ${level}`,
        level,
        elevation: level * 2.80,
        height: 2.60,
        walls: imported.walls,
        doors: imported.doors,
        windows: imported.windows,
        rooms: imported.rooms,
        furniture: imported.furniture,
        stairs: imported.stairs,
        dimensions: [],
        annotations: [],
        shapes: [],
        roofs: imported.roof ? [imported.roof] : [],
      };
      updateProject({
        ...project,
        floors: [...project.floors, newFloor],
        activeFloorId: newFloorId,
        backgroundImage: bgImage,
      });
      setShowAiImport(false);
      setTimeout(handleZoomFit, 100);
      return;
    }

    // Default: 'current_floor'
    const updatedFloors = project.floors.map((fl) => {
      if (fl.id === activeFloor.id) {
        return {
          ...fl,
          walls: imported.walls.length > 0 ? imported.walls : fl.walls,
          doors: imported.doors.length > 0 ? imported.doors : fl.doors,
          windows: imported.windows.length > 0 ? imported.windows : fl.windows,
          rooms: imported.rooms.length > 0 ? imported.rooms : fl.rooms,
          furniture: imported.furniture.length > 0 ? imported.furniture : fl.furniture,
          stairs: imported.stairs.length > 0 ? imported.stairs : fl.stairs,
          roofs: imported.roof ? [imported.roof] : fl.roofs,
        };
      }
      return fl;
    });

    updateProject({
      ...project,
      floors: updatedFloors,
      backgroundImage: bgImage,
    });
    setShowAiImport(false);
    setTimeout(handleZoomFit, 100);
  }, [project, activeFloor, updateProject, handleZoomFit]);

  const handleVoiceCorrection = useCallback((explanation: string, updatedFloor: Floor) => {
    const updatedFloors = project.floors.map((fl) => {
      if (fl.id === activeFloor.id) {
        return updatedFloor;
      }
      return fl;
    });
    updateProject({
      ...project,
      floors: updatedFloors,
    });
    setShowVoiceCorrection(false);
  }, [project, activeFloor, updateProject]);

  // Atomic batch move of all selected elements simultaneously (smooth 60fps)
  const handleMoveSelection = useCallback((dx: number, dy: number, specificIds?: string[]) => {
    const targetIds = specificIds && specificIds.length > 0 ? specificIds : selection.ids;
    if ((dx === 0 && dy === 0) || targetIds.length === 0) return;
    const idSet = new Set(targetIds);

    setProject((prev) => {
      let nextPlot = prev.plot;
      if (idSet.has('plot') && nextPlot) {
        nextPlot = {
          ...nextPlot,
          x: nextPlot.x + dx,
          y: nextPlot.y + dy,
          points: nextPlot.points ? nextPlot.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) : undefined,
        };
      }

      const plotPtMatch = Array.from(idSet).find((id) => id.startsWith('plot_pt_'));
      if (plotPtMatch && nextPlot && nextPlot.points) {
        const ptIdx = parseInt(plotPtMatch.replace('plot_pt_', ''), 10);
        if (!isNaN(ptIdx) && nextPlot.points[ptIdx]) {
          const newPts = [...nextPlot.points];
          newPts[ptIdx] = { x: newPts[ptIdx].x + dx, y: newPts[ptIdx].y + dy };
          nextPlot = { ...nextPlot, points: newPts };
        }
      }

      const nextFloors = prev.floors.map((fl) => {
        if (fl.id !== prev.activeFloorId) return fl;
        return {
          ...fl,
          walls: fl.walls.map((w) =>
            idSet.has(w.id)
              ? {
                  ...w,
                  start: { x: w.start.x + dx, y: w.start.y + dy },
                  end: { x: w.end.x + dx, y: w.end.y + dy },
                }
              : w
          ),
          doors: fl.doors.map((d) => {
            if (!idSet.has(d.id)) return d;
            // When parent wall moves, door position along wall remains unchanged!
            if (idSet.has(d.wallId)) return d;
            const parentWall = fl.walls.find((w) => w.id === d.wallId);
            if (!parentWall) return d;
            const wLen = Math.hypot(parentWall.end.x - parentWall.start.x, parentWall.end.y - parentWall.start.y) || 1;
            const dirX = (parentWall.end.x - parentWall.start.x) / wLen;
            const dirY = (parentWall.end.y - parentWall.start.y) / wLen;
            const dot = (dx * dirX + dy * dirY) / wLen;
            return {
              ...d,
              position: Math.max(0.05, Math.min(0.95, d.position + dot)),
            };
          }),
          windows: fl.windows.map((win) => {
            if (!idSet.has(win.id)) return win;
            // When parent wall moves, window position along wall remains unchanged!
            if (idSet.has(win.wallId)) return win;
            const parentWall = fl.walls.find((w) => w.id === win.wallId);
            if (!parentWall) return win;
            const wLen = Math.hypot(parentWall.end.x - parentWall.start.x, parentWall.end.y - parentWall.start.y) || 1;
            const dirX = (parentWall.end.x - parentWall.start.x) / wLen;
            const dirY = (parentWall.end.y - parentWall.start.y) / wLen;
            const dot = (dx * dirX + dy * dirY) / wLen;
            return {
              ...win,
              position: Math.max(0.05, Math.min(0.95, win.position + dot)),
            };
          }),
          furniture: fl.furniture.map((f) =>
            idSet.has(f.id) ? { ...f, x: f.x + dx, y: f.y + dy } : f
          ),
          dimensions: fl.dimensions.map((dim) =>
            idSet.has(dim.id)
              ? {
                  ...dim,
                  start: { x: dim.start.x + dx, y: dim.start.y + dy },
                  end: { x: dim.end.x + dx, y: dim.end.y + dy },
                }
              : dim
          ),
          rooms: fl.rooms.map((rm) =>
            idSet.has(rm.id)
              ? {
                  ...rm,
                  polygon: rm.polygon.map((p) => ({ x: p.x + dx, y: p.y + dy })),
                }
              : rm
          ),
        };
      });
      return { ...prev, plot: nextPlot, floors: nextFloors };
    });
  }, [selection.ids]);

  // Commit history checkpoint after dragging finishes
  const handleCommitProjectChange = useCallback(() => {
    setProject((currentProj) => {
      currentProj.updatedAt = new Date().toISOString();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(currentProj);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      try {
        localStorage.setItem('cad_holiday_house_project_v3', JSON.stringify(currentProj));
      } catch {
        // quota
      }
      return currentProj;
    });
  }, [history, historyIndex]);

  // Element Actions
  const handleAddWall = (wall: Wall) => {
    updateActiveFloor((f) => ({ ...f, walls: [...f.walls, wall] }));
  };
  const handleUpdateWall = (wall: Wall) => {
    updateActiveFloor((f) => ({ ...f, walls: f.walls.map((w) => (w.id === wall.id ? wall : w)) }));
  };
  const handleAddDoor = (door: Door) => {
    updateActiveFloor((f) => ({ ...f, doors: [...f.doors, door] }));
  };
  const handleUpdateDoor = (door: Door) => {
    updateActiveFloor((f) => ({ ...f, doors: f.doors.map((d) => (d.id === door.id ? door : d)) }));
  };
  const handleAddWindow = (win: Window) => {
    updateActiveFloor((f) => ({ ...f, windows: [...f.windows, win] }));
  };
  const handleUpdateWindow = (win: Window) => {
    updateActiveFloor((f) => ({ ...f, windows: f.windows.map((w) => (w.id === win.id ? win : w)) }));
  };
  const handleAddFurniture = (furn: Furniture) => {
    updateActiveFloor((f) => ({ ...f, furniture: [...f.furniture, furn] }));
  };
  const handleUpdateFurniture = (furn: Furniture) => {
    updateActiveFloor((f) => ({ ...f, furniture: f.furniture.map((item) => (item.id === furn.id ? furn : item)) }));
  };
  const handleUpdateStair = (stair: Stair) => {
    updateActiveFloor((f) => ({ ...f, stairs: f.stairs.map((s) => (s.id === stair.id ? stair : s)) }));
  };
  const handleUpdateRoof = (roof: Roof) => {
    updateActiveFloor((f) => ({ ...f, roofs: f.roofs.map((r) => (r.id === roof.id ? roof : r)) }));
  };
  const handleSaveRoof = useCallback((roof: Roof | null) => {
    updateActiveFloor((f) => ({
      ...f,
      roofs: roof ? [roof] : [],
    }));
  }, [updateActiveFloor]);
  const handleUpdateRoom = (room: Room) => {
    updateActiveFloor((f) => ({ ...f, rooms: f.rooms.map((r) => (r.id === room.id ? room : r)) }));
  };
  const handleAddDimension = (dim: DimensionLine) => {
    updateActiveFloor((f) => ({ ...f, dimensions: [...f.dimensions, dim] }));
  };
  const handleAddRoom = (room: Room) => {
    updateActiveFloor((f) => ({ ...f, rooms: [...f.rooms, room] }));
  };
  const handleBatchUpdateWalls = (updates: Partial<Wall>) => {
    updateActiveFloor((f) => ({
      ...f,
      walls: f.walls.map((w) => (selection.ids.includes(w.id) ? { ...w, ...updates } : w)),
    }));
  };
  const handleUpdatePlot = (newPlot: PlotBoundary) => {
    updateProject({ ...project, plot: newPlot });
  };
  // Atomically add multiple walls and optional room (prevents React closure overwrite)
  const handleAddWallsAndRoom = useCallback((newWalls: Wall[], room?: Room) => {
    updateActiveFloor((f) => ({
      ...f,
      walls: [...f.walls, ...newWalls],
      rooms: room ? [...f.rooms, room] : f.rooms,
    }));
  }, [updateActiveFloor]);

  // Split a wall into two wall segments at splitPoint
  const handleSplitWall = useCallback((wallId: string, splitPoint: Point2D) => {
    updateActiveFloor((f) => {
      const targetWall = f.walls.find((w) => w.id === wallId);
      if (!targetWall) return f;

      const wLen = Math.hypot(targetWall.end.x - targetWall.start.x, targetWall.end.y - targetWall.start.y);
      if (wLen < 0.1) return f;

      const dSplit = Math.hypot(splitPoint.x - targetWall.start.x, splitPoint.y - targetWall.start.y);
      const splitRatio = Math.max(0.05, Math.min(0.95, dSplit / wLen));

      const w1Id = 'w_s1_' + Date.now();
      const w2Id = 'w_s2_' + (Date.now() + 1);

      const w1: Wall = {
        ...targetWall,
        id: w1Id,
        start: { ...targetWall.start },
        end: { ...splitPoint },
      };

      const w2: Wall = {
        ...targetWall,
        id: w2Id,
        start: { ...splitPoint },
        end: { ...targetWall.end },
      };

      // Reassign doors on this wall
      const updatedDoors = f.doors.map((d) => {
        if (d.wallId !== wallId) return d;
        if (d.position <= splitRatio) {
          return {
            ...d,
            wallId: w1Id,
            position: Math.max(0.05, Math.min(0.95, d.position / splitRatio)),
          };
        } else {
          return {
            ...d,
            wallId: w2Id,
            position: Math.max(0.05, Math.min(0.95, (d.position - splitRatio) / (1 - splitRatio))),
          };
        }
      });

      // Reassign windows on this wall
      const updatedWindows = f.windows.map((win) => {
        if (win.wallId !== wallId) return win;
        if (win.position <= splitRatio) {
          return {
            ...win,
            wallId: w1Id,
            position: Math.max(0.05, Math.min(0.95, win.position / splitRatio)),
          };
        } else {
          return {
            ...win,
            wallId: w2Id,
            position: Math.max(0.05, Math.min(0.95, (win.position - splitRatio) / (1 - splitRatio))),
          };
        }
      });

      const updatedWalls = f.walls.flatMap((w) => (w.id === wallId ? [w1, w2] : [w]));

      return {
        ...f,
        walls: updatedWalls,
        doors: updatedDoors,
        windows: updatedWindows,
      };
    });
  }, [updateActiveFloor]);

  // Split selected wall at intersection or midpoint
  const handleSplitSelectedWall = useCallback(() => {
    if (selection.ids.length !== 1 || selection.type !== 'wall') return;
    const targetWall = activeFloor.walls.find((w) => w.id === selection.ids[0]);
    if (!targetWall) return;

    let splitPt: Point2D | null = null;
    for (const other of activeFloor.walls) {
      if (other.id === targetWall.id) continue;
      const inter = lineIntersection(targetWall.start, targetWall.end, other.start, other.end);
      if (inter) {
        splitPt = inter;
        break;
      }
      const projStart = projectPointOntoWall(other.start, targetWall);
      if (projStart.dist < 0.08 && projStart.ratio > 0.05 && projStart.ratio < 0.95) {
        splitPt = projStart.point;
        break;
      }
      const projEnd = projectPointOntoWall(other.end, targetWall);
      if (projEnd.dist < 0.08 && projEnd.ratio > 0.05 && projEnd.ratio < 0.95) {
        splitPt = projEnd.point;
        break;
      }
    }

    if (!splitPt) {
      splitPt = {
        x: (targetWall.start.x + targetWall.end.x) / 2,
        y: (targetWall.start.y + targetWall.end.y) / 2,
      };
    }

    handleSplitWall(targetWall.id, splitPt);
  }, [selection, activeFloor, handleSplitWall]);

  // Update project defaults
  const handleUpdateDefaults = useCallback((newDefaults: ProjectDefaults) => {
    updateProject({
      ...project,
      defaults: newDefaults,
    });
  }, [project, updateProject]);

  // Delete Selection (Single, Multi, Plot, Walls, Furniture, Rooms, etc.)
  const handleDeleteSelected = useCallback((idsToDelete?: string[]) => {
    const targetIds = idsToDelete && idsToDelete.length > 0 ? idsToDelete : selection.ids;
    const isPlotTargeted =
      targetIds.includes('plot') ||
      selection.type === 'plot' ||
      targetIds.some((id) => id.startsWith('plot_pt_'));
    const isRoofTargeted =
      targetIds.includes('roof') ||
      selection.type === 'roof' ||
      (activeFloor.roofs && activeFloor.roofs.some((rf) => targetIds.includes(rf.id)));

    if (targetIds.length === 0 && !isPlotTargeted && !isRoofTargeted && selection.type === 'none') return;
    const idSet = new Set(targetIds);

    let nextPlot = project.plot ? { ...project.plot } : undefined;
    if (isPlotTargeted && nextPlot) {
      const singlePtId = targetIds.find((id) => id.startsWith('plot_pt_'));
      if (singlePtId && nextPlot.points && nextPlot.points.length > 3) {
        const ptIdx = parseInt(singlePtId.replace('plot_pt_', ''), 10);
        if (!isNaN(ptIdx)) {
          nextPlot.points = nextPlot.points.filter((_, idx) => idx !== ptIdx);
        }
      } else {
        // Complete plot deletion / disable
        nextPlot = {
          ...nextPlot,
          enabled: false,
          points: undefined,
          width: 20.0,
          depth: 30.0,
        };
      }
    }

    const nextFloors = project.floors.map((fl) => {
      if (fl.id !== activeFloor.id) return fl;
      return {
        ...fl,
        walls: fl.walls.filter((w) => !idSet.has(w.id)),
        doors: fl.doors.filter((d) => !idSet.has(d.id) && !idSet.has(d.wallId)),
        windows: fl.windows.filter((win) => !idSet.has(win.id) && !idSet.has(win.wallId)),
        furniture: fl.furniture.filter((item) => !idSet.has(item.id)),
        dimensions: fl.dimensions.filter((dim) => !idSet.has(dim.id)),
        stairs: fl.stairs.filter((st) => !idSet.has(st.id)),
        rooms: fl.rooms.filter((rm) => !idSet.has(rm.id)),
        shapes: (fl.shapes || []).filter((sh) => !idSet.has(sh.id)),
        annotations: (fl.annotations || []).filter((an) => !idSet.has(an.id)),
        columns: (fl.columns || []).filter((col) => !idSet.has(col.id)),
        roofs: isRoofTargeted ? [] : (fl.roofs || []).filter((rf) => !idSet.has(rf.id)),
        electrical: (fl.electrical || []).filter((el) => !idSet.has(el.id)),
      };
    });

    updateProject({
      ...project,
      plot: nextPlot,
      floors: nextFloors,
    });
    setSelection({ type: 'none', ids: [] });
  }, [selection, project, activeFloor, updateProject]);

  // Duplicate Selection (Plot to boundary walls, Walls, Furniture, Rooms, Stairs, Shapes)
  const handleDuplicateSelected = useCallback(() => {
    const isPlotTargeted =
      selection.ids.includes('plot') ||
      selection.type === 'plot' ||
      selection.ids.some((id) => id.startsWith('plot_pt_'));

    if (selection.ids.length === 0 && !isPlotTargeted) return;
    const offset = 0.5;
    const idSet = new Set(selection.ids);
    const newIds: string[] = [];

    const activeFl = project.floors.find((f) => f.id === project.activeFloorId) || project.floors[0];
    const nextWalls = [...activeFl.walls];
    const nextFurn = [...activeFl.furniture];
    const nextDoors = [...activeFl.doors];
    const nextWindows = [...activeFl.windows];
    const nextRooms = [...activeFl.rooms];
    const nextStairs = [...activeFl.stairs];
    const nextShapes = [...(activeFl.shapes || [])];

    // 1. If Plot is duplicated, generate exterior walls along the plot boundary!
    if (isPlotTargeted && project.plot && project.plot.enabled) {
      const pts =
        project.plot.points && project.plot.points.length >= 3
          ? project.plot.points
          : [
              { x: project.plot.x, y: project.plot.y },
              { x: project.plot.x + project.plot.width, y: project.plot.y },
              { x: project.plot.x + project.plot.width, y: project.plot.y + project.plot.depth },
              { x: project.plot.x, y: project.plot.y + project.plot.depth },
            ];

      for (let i = 0; i < pts.length; i++) {
        const p1 = pts[i];
        const p2 = pts[(i + 1) % pts.length];
        const newWallId = 'w_ext_' + Date.now() + '_' + i;
        nextWalls.push({
          id: newWallId,
          start: { x: p1.x, y: p1.y },
          end: { x: p2.x, y: p2.y },
          thickness: project.defaults?.exteriorWallThickness || 0.30,
          height: project.defaults?.wallHeight || 2.60,
          isExterior: true,
          material: 'timber',
          referenceLine: 'center',
        });
        newIds.push(newWallId);
      }
    }

    // 2. Duplicate Walls (and replicate doors & windows that were on those walls)
    const wallIdMap = new Map<string, string>();
    activeFl.walls.forEach((w) => {
      if (idSet.has(w.id)) {
        const newWId = 'w_' + Date.now() + Math.random().toString(36).substring(2, 6);
        wallIdMap.set(w.id, newWId);
        nextWalls.push({
          ...w,
          id: newWId,
          start: { x: w.start.x + offset, y: w.start.y + offset },
          end: { x: w.end.x + offset, y: w.end.y + offset },
        });
        newIds.push(newWId);
      }
    });

    activeFl.doors.forEach((d) => {
      const clonedWallId = wallIdMap.get(d.wallId);
      if (clonedWallId) {
        const newDId = 'door_' + Date.now() + Math.random().toString(36).substring(2, 6);
        nextDoors.push({
          ...d,
          id: newDId,
          wallId: clonedWallId,
        });
      }
    });

    activeFl.windows.forEach((win) => {
      const clonedWallId = wallIdMap.get(win.wallId);
      if (clonedWallId) {
        const newWinId = 'win_' + Date.now() + Math.random().toString(36).substring(2, 6);
        nextWindows.push({
          ...win,
          id: newWinId,
          wallId: clonedWallId,
        });
      }
    });

    // 3. Duplicate Furniture
    activeFl.furniture.forEach((item) => {
      if (idSet.has(item.id)) {
        const newFId = 'furn_' + Date.now() + Math.random().toString(36).substring(2, 6);
        nextFurn.push({
          ...item,
          id: newFId,
          x: item.x + offset,
          y: item.y + offset,
        });
        newIds.push(newFId);
      }
    });

    // 4. Duplicate Rooms
    activeFl.rooms.forEach((rm) => {
      if (idSet.has(rm.id)) {
        const newRId = 'room_' + Date.now() + Math.random().toString(36).substring(2, 6);
        nextRooms.push({
          ...rm,
          id: newRId,
          name: rm.name + ' (Kopie)',
          polygon: rm.polygon.map((p) => ({ x: p.x + offset, y: p.y + offset })),
        });
        newIds.push(newRId);
      }
    });

    // 5. Duplicate Stairs
    activeFl.stairs.forEach((st) => {
      if (idSet.has(st.id)) {
        const newStId = 'stair_' + Date.now() + Math.random().toString(36).substring(2, 6);
        nextStairs.push({
          ...st,
          id: newStId,
          x: st.x + offset,
          y: st.y + offset,
        });
        newIds.push(newStId);
      }
    });

    // 6. Duplicate Shapes
    activeFl.shapes?.forEach((sh) => {
      if (idSet.has(sh.id)) {
        const newShId = 'shape_' + Date.now() + Math.random().toString(36).substring(2, 6);
        nextShapes.push({
          ...sh,
          id: newShId,
          points: (sh.points || []).map((p) => ({ x: p.x + offset, y: p.y + offset })),
        });
        newIds.push(newShId);
      }
    });

    const nextFloors = project.floors.map((fl) => {
      if (fl.id !== activeFl.id) return fl;
      return {
        ...fl,
        walls: nextWalls,
        furniture: nextFurn,
        doors: nextDoors,
        windows: nextWindows,
        rooms: nextRooms,
        stairs: nextStairs,
        shapes: nextShapes,
      };
    });

    updateProject({
      ...project,
      floors: nextFloors,
    });

    if (newIds.length > 0) {
      setSelection({
        type: newIds.length > 1 ? 'mixed' : 'wall',
        ids: newIds,
      });
    }
  }, [selection, project, updateProject]);

  // Touch Clipboard Action Handlers (Copy, Cut, Paste for 3-finger swipe sheet)
  const handleClipboardCopy = useCallback(() => {
    if (selection.ids.length === 0) return;
    const idSet = new Set(selection.ids);
    const copiedWalls = activeFloor.walls.filter((w) => idSet.has(w.id));
    const copiedFurn = activeFloor.furniture.filter((f) => idSet.has(f.id));
    const copiedRooms = activeFloor.rooms.filter((r) => idSet.has(r.id));
    const copiedDoors = activeFloor.doors.filter((d) => idSet.has(d.id));
    const copiedWindows = activeFloor.windows.filter((w) => idSet.has(w.id));
    setClipboardData({
      walls: copiedWalls,
      furniture: copiedFurn,
      rooms: copiedRooms,
      doors: copiedDoors,
      windows: copiedWindows,
    });
    setShowClipboardSheet(false);
  }, [selection.ids, activeFloor]);

  const handleClipboardCut = useCallback(() => {
    handleClipboardCopy();
    handleDeleteSelected();
    setShowClipboardSheet(false);
  }, [handleClipboardCopy, handleDeleteSelected]);

  const handleClipboardPaste = useCallback(() => {
    if (!clipboardData) return;
    const offset = 0.5;
    const newWallIds = new Map<string, string>();
    const newWalls: Wall[] = clipboardData.walls.map((w) => {
      const newId = 'w_paste_' + Date.now() + Math.random().toString(36).substring(2, 6);
      newWallIds.set(w.id, newId);
      return {
        ...w,
        id: newId,
        start: { x: w.start.x + offset, y: w.start.y + offset },
        end: { x: w.end.x + offset, y: w.end.y + offset },
      };
    });
    const newFurn: Furniture[] = clipboardData.furniture.map((f) => ({
      ...f,
      id: 'f_paste_' + Date.now() + Math.random().toString(36).substring(2, 6),
      x: f.x + offset,
      y: f.y + offset,
    }));
    const newRooms: Room[] = clipboardData.rooms.map((r) => ({
      ...r,
      id: 'r_paste_' + Date.now() + Math.random().toString(36).substring(2, 6),
      polygon: r.polygon.map((p) => ({ x: p.x + offset, y: p.y + offset })),
    }));
    const newDoors: Door[] = clipboardData.doors.map((d) => ({
      ...d,
      id: 'd_paste_' + Date.now() + Math.random().toString(36).substring(2, 6),
      wallId: newWallIds.get(d.wallId) || d.wallId,
    }));
    const newWindows: Window[] = clipboardData.windows.map((win) => ({
      ...win,
      id: 'win_paste_' + Date.now() + Math.random().toString(36).substring(2, 6),
      wallId: newWallIds.get(win.wallId) || win.wallId,
    }));

    updateActiveFloor((fl) => ({
      ...fl,
      walls: [...fl.walls, ...newWalls],
      furniture: [...fl.furniture, ...newFurn],
      rooms: [...fl.rooms, ...newRooms],
      doors: [...fl.doors, ...newDoors],
      windows: [...fl.windows, ...newWindows],
    }));

    const allNewIds = [
      ...newWalls.map((w) => w.id),
      ...newFurn.map((f) => f.id),
      ...newRooms.map((r) => r.id),
    ];
    setSelection({
      type: newWalls.length > 0 ? 'wall' : newFurn.length > 0 ? 'furniture' : 'mixed',
      ids: allNewIds,
    });
    setShowClipboardSheet(false);
  }, [clipboardData, updateActiveFloor]);

  // Touch CAD Numpad Commit
  const handleNumpadCommit = useCallback(() => {
    const val = parseFloat(numpadValue);
    if (!isNaN(val) && val > 0) {
      if (selection.ids.length === 1 && selection.type === 'wall') {
        const wallId = selection.ids[0];
        updateActiveFloor((fl) => {
          const w = fl.walls.find((item) => item.id === wallId);
          if (!w) return fl;
          const curLen = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
          const curAngle = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);

          if (numpadMode === 'length') {
            const newEnd = {
              x: w.start.x + Math.cos(curAngle) * val,
              y: w.start.y + Math.sin(curAngle) * val,
            };
            return {
              ...fl,
              walls: fl.walls.map((item) => (item.id === wallId ? { ...item, end: newEnd } : item)),
            };
          } else {
            const targetRad = (val * Math.PI) / 180;
            const newEnd = {
              x: w.start.x + Math.cos(targetRad) * curLen,
              y: w.start.y + Math.sin(targetRad) * curLen,
            };
            return {
              ...fl,
              walls: fl.walls.map((item) => (item.id === wallId ? { ...item, end: newEnd } : item)),
            };
          }
        });
      }
    }
    setNumpadValue('');
    setShowTouchNumpad(false);
  }, [numpadValue, selection, numpadMode, updateActiveFloor]);

  // Rotate Selection by angle deg (works for Plot, Walls, Furniture, Rooms, Stairs, Shapes)
  const handleRotateSelected = useCallback((deg: number) => {
    const isPlotTargeted =
      selection.ids.includes('plot') ||
      selection.type === 'plot' ||
      selection.ids.some((id) => id.startsWith('plot_pt_'));

    if (selection.ids.length === 0 && !isPlotTargeted) return;
    const idSet = new Set(selection.ids);

    // Center of rotation
    let cx = 0;
    let cy = 0;
    if (selectionBoundingBox) {
      cx = (selectionBoundingBox.minX + selectionBoundingBox.maxX) / 2;
      cy = (selectionBoundingBox.minY + selectionBoundingBox.maxY) / 2;
    } else if (isPlotTargeted && project.plot) {
      cx = project.plot.x + project.plot.width / 2;
      cy = project.plot.y + project.plot.depth / 2;
    }

    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const rotatePt = (p: Point2D): Point2D => {
      const dx = p.x - cx;
      const dy = p.y - cy;
      return {
        x: Math.round((cx + dx * cos - dy * sin) * 1000) / 1000,
        y: Math.round((cy + dx * sin + dy * cos) * 1000) / 1000,
      };
    };

    let nextPlot = project.plot ? { ...project.plot } : undefined;
    if (isPlotTargeted && nextPlot && nextPlot.enabled) {
      if (nextPlot.points && nextPlot.points.length >= 3) {
        nextPlot = {
          ...nextPlot,
          points: nextPlot.points.map((p) => rotatePt(p)),
        };
      } else {
        const rectPts = [
          { x: nextPlot.x, y: nextPlot.y },
          { x: nextPlot.x + nextPlot.width, y: nextPlot.y },
          { x: nextPlot.x + nextPlot.width, y: nextPlot.y + nextPlot.depth },
          { x: nextPlot.x, y: nextPlot.y + nextPlot.depth },
        ];
        nextPlot = {
          ...nextPlot,
          points: rectPts.map((p) => rotatePt(p)),
        };
      }
    }

    const nextFloors = project.floors.map((fl) => {
      if (fl.id !== activeFloor.id) return fl;
      return {
        ...fl,
        walls: fl.walls.map((w) =>
          idSet.has(w.id)
            ? {
                ...w,
                start: rotatePt(w.start),
                end: rotatePt(w.end),
              }
            : w
        ),
        furniture: fl.furniture.map((item) => {
          if (!idSet.has(item.id)) return item;
          if (selection.ids.length === 1 && !isPlotTargeted) {
            return { ...item, rotation: (item.rotation + deg) % 360 };
          }
          const np = rotatePt({ x: item.x, y: item.y });
          return {
            ...item,
            x: np.x,
            y: np.y,
            rotation: (item.rotation + deg) % 360,
          };
        }),
        rooms: fl.rooms.map((rm) =>
          idSet.has(rm.id)
            ? {
                ...rm,
                polygon: rm.polygon.map((p) => rotatePt(p)),
              }
            : rm
        ),
        stairs: fl.stairs.map((st) => {
          if (!idSet.has(st.id)) return st;
          const rotatedPos = rotatePt({ x: st.x, y: st.y });
          return {
            ...st,
            x: Math.round(rotatedPos.x * 1000) / 1000,
            y: Math.round(rotatedPos.y * 1000) / 1000,
            rotation: (st.rotation + deg) % 360,
          };
        }),
        dimensions: fl.dimensions.map((dim) =>
          idSet.has(dim.id)
            ? {
                ...dim,
                start: rotatePt(dim.start),
                end: rotatePt(dim.end),
              }
            : dim
        ),
        shapes: (fl.shapes || []).map((sh) =>
          idSet.has(sh.id)
            ? {
                ...sh,
                points: (sh.points || []).map((p) => rotatePt(p)),
              }
            : sh
        ),
      };
    });

    updateProject({
      ...project,
      plot: nextPlot,
      floors: nextFloors,
    });
  }, [selection, selectionBoundingBox, project, activeFloor, updateProject]);

  // Horizontal Mirror (Plot, Walls, Furniture, Rooms, Doors, Stairs, Shapes)
  const handleFlipHorizontal = useCallback(() => {
    const isPlotTargeted =
      selection.ids.includes('plot') ||
      selection.type === 'plot' ||
      selection.ids.some((id) => id.startsWith('plot_pt_'));

    if (selection.ids.length === 0 && !isPlotTargeted) return;
    const idSet = new Set(selection.ids);

    let cx = 0;
    if (selectionBoundingBox) {
      cx = (selectionBoundingBox.minX + selectionBoundingBox.maxX) / 2;
    } else if (isPlotTargeted && project.plot) {
      cx = project.plot.x + project.plot.width / 2;
    }

    const flipPt = (p: Point2D): Point2D => ({
      x: Math.round((2 * cx - p.x) * 1000) / 1000,
      y: p.y,
    });

    let nextPlot = project.plot ? { ...project.plot } : undefined;
    if (isPlotTargeted && nextPlot && nextPlot.enabled) {
      if (nextPlot.points && nextPlot.points.length >= 3) {
        nextPlot = {
          ...nextPlot,
          points: nextPlot.points.map((p) => flipPt(p)),
        };
      } else {
        const rectPts = [
          { x: nextPlot.x, y: nextPlot.y },
          { x: nextPlot.x + nextPlot.width, y: nextPlot.y },
          { x: nextPlot.x + nextPlot.width, y: nextPlot.y + nextPlot.depth },
          { x: nextPlot.x, y: nextPlot.y + nextPlot.depth },
        ];
        nextPlot = {
          ...nextPlot,
          points: rectPts.map((p) => flipPt(p)),
        };
      }
    }

    const nextFloors = project.floors.map((fl) => {
      if (fl.id !== activeFloor.id) return fl;
      return {
        ...fl,
        walls: fl.walls.map((w) =>
          idSet.has(w.id)
            ? {
                ...w,
                start: flipPt(w.start),
                end: flipPt(w.end),
              }
            : w
        ),
        doors: fl.doors.map((d) => {
          if (idSet.has(d.id) || idSet.has(d.wallId)) {
            const flippedSwing: 'left' | 'right' = d.swingDirection === 'left' ? 'right' : 'left';
            return {
              ...d,
              swingDirection: flippedSwing,
              position: 1 - d.position,
            };
          }
          return d;
        }),
        furniture: fl.furniture.map((item) => {
          if (!idSet.has(item.id)) return item;
          if (selection.ids.length === 1 && !isPlotTargeted) {
            return {
              ...item,
              rotation: (360 - item.rotation) % 360,
            };
          }
          return {
            ...item,
            x: Math.round((2 * cx - item.x) * 1000) / 1000,
            rotation: (360 - item.rotation) % 360,
          };
        }),
        rooms: fl.rooms.map((rm) =>
          idSet.has(rm.id)
            ? {
                ...rm,
                polygon: rm.polygon.map((p) => flipPt(p)),
              }
            : rm
        ),
        stairs: fl.stairs.map((st) => {
          if (!idSet.has(st.id)) return st;
          const flippedPos = flipPt({ x: st.x, y: st.y });
          return {
            ...st,
            x: Math.round(flippedPos.x * 1000) / 1000,
            y: Math.round(flippedPos.y * 1000) / 1000,
            rotation: (360 - st.rotation) % 360,
          };
        }),
        dimensions: fl.dimensions.map((dim) =>
          idSet.has(dim.id)
            ? {
                ...dim,
                start: flipPt(dim.start),
                end: flipPt(dim.end),
              }
            : dim
        ),
        shapes: (fl.shapes || []).map((sh) =>
          idSet.has(sh.id)
            ? {
                ...sh,
                points: (sh.points || []).map((p) => flipPt(p)),
              }
            : sh
        ),
      };
    });

    updateProject({
      ...project,
      plot: nextPlot,
      floors: nextFloors,
    });
  }, [selection, selectionBoundingBox, project, activeFloor, updateProject]);

  // Keyboard Shortcuts (including multi-selection arrow nudging)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'w' || e.key === 'W') setActiveTool('wall');
      if (e.key === 'r' || e.key === 'R') {
        if (selection.ids.length > 0) {
          e.preventDefault();
          handleRotateSelected(90);
        } else {
          setActiveTool('rect_room');
        }
      }
      if (e.key === 'c' || e.key === 'C') {
        if (selection.ids.length === 1 && selection.type === 'wall') {
          e.preventDefault();
          handleSplitSelectedWall();
        } else {
          setActiveTool('split');
        }
      }
      if (e.key === 'g' || e.key === 'G') setActiveTool('plot');
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) setActiveTool('door');
      if (e.key === 'D' && !e.ctrlKey && !e.metaKey) setActiveTool('door');
      if (e.key === 'f' || e.key === 'F') setActiveTool('window');
      if (e.key === 't' || e.key === 'T') setActiveTool('stairs');
      if (e.key === 'm' || e.key === 'M') setShowFurnitureCatalog(true);
      if (e.key === 'u' || e.key === 'U') setShowRoofModal(true);
      if (e.key === 'b' || e.key === 'B') setActiveTool('dimension');
      if ((e.key === 's' || e.key === 'S' || e.key === 'F3') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSnapSettings((prev) => {
          const next = { ...prev, enabled: !prev.enabled };
          try {
            localStorage.setItem('cad_snap_settings_v2', JSON.stringify(next));
          } catch {
            // ignore
          }
          return next;
        });
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDeleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateSelected();
      }
      if (e.key === 'Escape') {
        setActiveTool('select');
        setSelection({ type: 'none', ids: [] });
      }

      // Ctrl + A: Select All (Teil B)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const allIds = [
          ...activeFloor.walls.map((w) => w.id),
          ...activeFloor.furniture.map((f) => f.id),
          ...activeFloor.doors.map((d) => d.id),
          ...activeFloor.windows.map((win) => win.id),
          ...activeFloor.dimensions.map((dim) => dim.id),
          ...activeFloor.rooms.map((rm) => rm.id),
        ];
        if (allIds.length > 0) {
          setSelection({ type: 'mixed', ids: allIds });
          setActiveTool('select');
        }
      }

      // Arrow keys: fine-step nudging (0.01m, Shift: 0.10m)
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selection.ids.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 0.10 : 0.01;
        let dx = 0, dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const idSet = new Set(selection.ids);
        updateActiveFloor((f) => ({
          ...f,
          walls: f.walls.map((w) => {
            if (idSet.has(w.id)) {
              return {
                ...w,
                start: { x: w.start.x + dx, y: w.start.y + dy },
                end: { x: w.end.x + dx, y: w.end.y + dy },
              };
            }
            return w;
          }),
          furniture: f.furniture.map((item) => {
            if (idSet.has(item.id)) {
              return { ...item, x: item.x + dx, y: item.y + dy };
            }
            return item;
          }),
        }));
      }

      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault();
        handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleDuplicateSelected();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selection, activeFloor]);

  // Hint text
  const hintText = useMemo(() => {
    if (activeTool === 'wall') return 'Klicke den Startpunkt der Wand. Tippe die Länge direkt auf der Tastatur und drücke Enter.';
    if (activeTool === 'rect_room') return 'Zwei Punkte klicken oder aufziehen, um 4 bündig verbundene Wände zu erzeugen.';
    if (activeTool === 'door') return 'Bewege die Maus über eine Wand und klicke, um eine Tür mit Aufschlagbogen einzusetzen.';
    if (activeTool === 'window') return 'Bewege die Maus über eine Wand und klicke, um ein Fenster mit Leibungen einzusetzen.';
    if (activeTool === 'hand') return 'Klicke und ziehe mit der Maus, um die Zeichenfläche zu verschieben.';
    if (activeTool === 'dimension') return 'Klicke nacheinander auf zwei Wandpunkte, um eine Maßkette zu platzieren.';
    return 'Klicke auf ein Objekt zum Auswählen. Ziehe einen Auswahlrahmen auf freier Fläche für Mehrfachauswahl.';
  }, [activeTool]);

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-white text-slate-800'}`}>
      {/* 1. TOP HEADER & MENUS */}
      <CadHeader
        project={project}
        activeFloor={activeFloor}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        language={language}
        onLanguageChange={setLanguage}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onNewProject={handleResetEmptyProject}
        onResetProjectPrompt={() => setShowClearConfirm(true)}
        onOpenProject={(file) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            try {
              const parsed = JSON.parse(e.target?.result as string);
              if (parsed.floors) {
                updateProject(parsed);
                handleZoomFit();
              }
            } catch {
              alert('Ungültige CAD-Datei');
            }
          };
          reader.readAsText(file);
        }}
        onSaveProject={() => {
          const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
          const dl = document.createElement('a');
          dl.href = dataStr;
          dl.download = `${project.name.replace(/\s+/g, '_')}.cad`;
          dl.click();
        }}
        onOpenExportDialog={() => setShowExport(true)}
        onOpenWizard={() => setShowWizard(true)}
        onOpenTemplates={() => setShowTemplates(true)}
        onOpenHelp={() => setShowHelp(true)}
        onOpenSettings={() => setShowSettings(true)}
        onOpenHistory={() => setShowHistory(true)}
        onSwitchFloor={(fId) => setProject({ ...project, activeFloorId: fId })}
        onAddFloor={() => {
          const cnt = project.floors.length + 1;
          const newFl: Floor = {
            id: 'floor_' + Date.now(),
            name: `${cnt}. Obergeschoss`,
            storyHeight: 2.75,
            floorElevation: cnt * 2.8,
            slabThickness: 0.2,
            walls: [],
            doors: [],
            windows: [],
            stairs: [],
            columns: [],
            roofs: [],
            rooms: [],
            furniture: [],
            electrical: [],
            dimensions: [],
            annotations: [],
            shapes: [],
          };
          updateProject({
            ...project,
            activeFloorId: newFl.id,
            floors: [...project.floors, newFl],
          });
        }}
        onDeleteFloor={(fId) => {
          if (project.floors.length <= 1) return;
          const rem = project.floors.filter((f) => f.id !== fId);
          updateProject({ ...project, activeFloorId: rem[0].id, floors: rem });
        }}
        onRenameProject={(newName) => updateProject({ ...project, name: newName })}
        onOpenRoofModal={() => setShowRoofModal(true)}
        onZoomFit={handleZoomFit}
        isFullscreen={isFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
        onOpenGestureHelp={() => setShowGestureHelp(true)}
        onOpenAiImport={() => setShowAiImport(true)}
        onOpenVoiceCorrection={() => setShowVoiceCorrection(true)}
        onInsertUnderlayImage={handleInsertUnderlayImage}
      />

      {/* 2. MAIN WORKSPACE */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Toolbar */}
        <CadToolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          language={language}
          onOpenFurnitureCatalog={() => setShowFurnitureCatalog(true)}
          onOpenWallNumericModal={() => setShowWallNumeric(true)}
          onOpenRoofModal={() => setShowRoofModal(true)}
          onOpenAiImport={() => setShowAiImport(true)}
          leftHandedMode={leftHandedMode}
        />

        {/* Tool Options Flyout (TEIL 3: Wall, Door, Window Options Docked Beside Toolbar) */}
        <CadToolOptionsFlyout
          activeTool={activeTool}
          wallMode={wallMode}
          onWallModeChange={setWallMode}
          wallThicknessM={wallThicknessM}
          onWallThicknessChange={setWallThicknessM}
          wallStartHeight={wallStartHeight}
          onWallStartHeightChange={setWallStartHeight}
          wallEndHeight={wallEndHeight}
          onWallEndHeightChange={setWallEndHeight}
          isLockWallHeights={isLockWallHeights}
          onLockWallHeightsChange={setIsLockWallHeights}
          onSaveAsDefaultWalls={handleSaveDefaultsWalls}
          doorWidthM={doorWidthM}
          onDoorWidthChange={setDoorWidthM}
          doorHinge={doorHinge}
          onDoorHingeChange={setDoorHinge}
          windowWidthM={windowWidthM}
          onWindowWidthChange={setWindowWidthM}
          windowSillHeightM={windowSillHeightM}
          onWindowSillHeightChange={setWindowSillHeightM}
          isDrawingActive={isDrawingActive}
          leftHandedMode={leftHandedMode}
          isPortrait={window.innerHeight > window.innerWidth}
          language={language}
        />

        {/* Center Viewport */}
        <main className="flex-1 h-full overflow-hidden flex relative">
          {/* VIEW: 2D FLOOR PLAN */}
          {viewMode === '2d' && (
            <CadCanvas2D
              walls={activeFloor.walls}
              doors={activeFloor.doors}
              windows={activeFloor.windows}
              stairs={activeFloor.stairs}
              roofs={activeFloor.roofs}
              rooms={activeFloor.rooms}
              furniture={activeFloor.furniture}
              dimensions={activeFloor.dimensions}
              annotations={activeFloor.annotations}
              shapes={activeFloor.shapes}
              guideLines={project.guideLines}
              layers={project.layers}
              activeTool={activeTool}
              selection={selection}
              onSelect={setSelection}
              snapSettings={snapSettings}
              unit={project.unit}
              language={language}
              zoom={zoom}
              onZoomChange={setZoom}
              panOffset={panOffset}
              onPanOffsetChange={setPanOffset}
              onCursorMove={setCursorPos}
              onAddWall={handleAddWall}
              onUpdateWall={handleUpdateWall}
              onAddDoor={handleAddDoor}
              onAddWindow={handleAddWindow}
              onAddFurniture={handleAddFurniture}
              onUpdateFurniture={handleUpdateFurniture}
              onAddDimension={handleAddDimension}
              onEditRoom={(r) => setEditingRoom(r)}
              onAddRoom={handleAddRoom}
              plot={project.plot}
              onUpdatePlot={handleUpdatePlot}
              defaults={project.defaults}
              floorsCount={project.floors.length}
              selectedColor={selectedColor}
              isDark={isDark}
              onMoveSelection={handleMoveSelection}
              onCommitProjectChange={handleCommitProjectChange}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              onRotateSelected={handleRotateSelected}
              onFlipHorizontal={handleFlipHorizontal}
              onSelectTool={setActiveTool}
              onAddWallsAndRoom={handleAddWallsAndRoom}
              onSplitWall={handleSplitWall}
              onSplitSelectedWall={handleSplitSelectedWall}
              onUndo={handleUndo}
              onRedo={handleRedo}
              onZoomFit={handleZoomFit}
              onToggleFullscreen={handleToggleFullscreen}
              onShowClipboardSheet={() => setShowClipboardSheet(true)}
              pencilMode={pencilMode}
              precisionMode={precisionMode}
              touchGestureSettings={touchSettings}
              viewRotationDeg={viewRotationDeg}
              onViewRotationChange={setViewRotationDeg}
              isMultiSelectActive={isMultiSelectActive}
              wallMode={wallMode}
              onWallModeChange={setWallMode}
              wallThicknessM={wallThicknessM}
              onWallThicknessChange={setWallThicknessM}
              wallStartHeight={wallStartHeight}
              onWallStartHeightChange={setWallStartHeight}
              wallEndHeight={wallEndHeight}
              onWallEndHeightChange={setWallEndHeight}
              isLockWallHeights={isLockWallHeights}
              onLockWallHeightsChange={setIsLockWallHeights}
              onDrawingStateChange={setIsDrawingActive}
              backgroundImage={project.backgroundImage}
              onUpdateBackgroundImage={handleUpdateBackgroundImage}
            />
          )}

          {/* VIEW: 3D MODEL */}
          {viewMode === '3d' && (
            <CadView3D
              project={project}
              floor={activeFloor}
              language={language}
              selection={selection}
              onSelect={setSelection}
              isDark={isDark}
              onOpenRoofModal={() => setShowRoofModal(true)}
            />
          )}

          {/* VIEW: SPLIT 2D + 3D */}
          {viewMode === 'split' && (
            <div className="flex-1 h-full flex">
              <div className="w-1/2 h-full border-r border-slate-200 dark:border-slate-800">
                <CadCanvas2D
                  walls={activeFloor.walls}
                  doors={activeFloor.doors}
                  windows={activeFloor.windows}
                  stairs={activeFloor.stairs}
                  roofs={activeFloor.roofs}
                  rooms={activeFloor.rooms}
                  furniture={activeFloor.furniture}
                  dimensions={activeFloor.dimensions}
                  annotations={activeFloor.annotations}
                  shapes={activeFloor.shapes}
                  guideLines={project.guideLines}
                  layers={project.layers}
                  activeTool={activeTool}
                  selection={selection}
                  onSelect={setSelection}
                  snapSettings={snapSettings}
                  unit={project.unit}
                  language={language}
                  zoom={zoom * 0.8}
                  onZoomChange={setZoom}
                  panOffset={panOffset}
                  onPanOffsetChange={setPanOffset}
                  onCursorMove={setCursorPos}
                  onAddWall={handleAddWall}
                  onUpdateWall={handleUpdateWall}
                  onAddDoor={handleAddDoor}
                  onAddWindow={handleAddWindow}
                  onAddFurniture={handleAddFurniture}
                  onUpdateFurniture={handleUpdateFurniture}
                  onAddDimension={handleAddDimension}
                  onEditRoom={(r) => setEditingRoom(r)}
                  onAddRoom={handleAddRoom}
                  plot={project.plot}
                  onUpdatePlot={handleUpdatePlot}
                  defaults={project.defaults}
                  floorsCount={project.floors.length}
                  selectedColor={selectedColor}
                  isDark={isDark}
                  onMoveSelection={handleMoveSelection}
                  onCommitProjectChange={handleCommitProjectChange}
                  onDeleteSelected={handleDeleteSelected}
                  onDuplicateSelected={handleDuplicateSelected}
                  onRotateSelected={handleRotateSelected}
                  onFlipHorizontal={handleFlipHorizontal}
                  onSelectTool={setActiveTool}
                  onAddWallsAndRoom={handleAddWallsAndRoom}
                  onSplitWall={handleSplitWall}
                  onSplitSelectedWall={handleSplitSelectedWall}
                  onUndo={handleUndo}
                  onRedo={handleRedo}
                  onZoomFit={handleZoomFit}
                  onToggleFullscreen={handleToggleFullscreen}
                  onShowClipboardSheet={() => setShowClipboardSheet(true)}
                  pencilMode={pencilMode}
                  precisionMode={precisionMode}
                  touchGestureSettings={touchSettings}
                  viewRotationDeg={viewRotationDeg}
                  onViewRotationChange={setViewRotationDeg}
                  isMultiSelectActive={isMultiSelectActive}
                  wallMode={wallMode}
                  onWallModeChange={setWallMode}
                  wallThicknessM={wallThicknessM}
                  onWallThicknessChange={setWallThicknessM}
                  wallStartHeight={wallStartHeight}
                  onWallStartHeightChange={setWallStartHeight}
                  wallEndHeight={wallEndHeight}
                  onWallEndHeightChange={setWallEndHeight}
                  isLockWallHeights={isLockWallHeights}
                  onLockWallHeightsChange={setIsLockWallHeights}
                  onDrawingStateChange={setIsDrawingActive}
                  backgroundImage={project.backgroundImage}
                  onUpdateBackgroundImage={handleUpdateBackgroundImage}
                />
              </div>
              <div className="w-1/2 h-full">
                <CadView3D
                  project={project}
                  floor={activeFloor}
                  language={language}
                  selection={selection}
                  onSelect={setSelection}
                  isDark={isDark}
                  onOpenRoofModal={() => setShowRoofModal(true)}
                />
              </div>
            </div>
          )}

          {/* VIEW: ELEVATIONS */}
          {viewMode === 'elevations' && (
            <CadElevationsView project={project} floor={activeFloor} language={language} />
          )}

          {/* VIEW: SECTION */}
          {viewMode === 'section' && (
            <CadSectionView project={project} floor={activeFloor} language={language} />
          )}

          {/* VIEW: QUANTITIES & SCHEDULES */}
          {viewMode === 'quantities' && (
            <CadQuantitiesView project={project} floor={activeFloor} language={language} />
          )}

          {/* Floating Context Mini-Toolbar (Figma/Miro style) */}
          <CadFloatingContextBar
            selection={selection}
            boundingBox={selectionBoundingBox}
            worldToScreen={worldToScreen}
            onDuplicate={handleDuplicateSelected}
            onRotate90={() => handleRotateSelected(90)}
            onFlipHorizontal={handleFlipHorizontal}
            onDelete={handleDeleteSelected}
            onSplitWall={handleSplitSelectedWall}
          />
        </main>

        {/* Right Inspector & Library */}
        <CadInspector
          selection={selection}
          walls={activeFloor.walls}
          doors={activeFloor.doors}
          windows={activeFloor.windows}
          stairs={activeFloor.stairs}
          roofs={activeFloor.roofs}
          rooms={activeFloor.rooms}
          furniture={activeFloor.furniture}
          layers={project.layers}
          unit={project.unit}
          language={language}
          onUpdateWall={handleUpdateWall}
          onUpdateDoor={handleUpdateDoor}
          onUpdateWindow={handleUpdateWindow}
          onUpdateStair={handleUpdateStair}
          onUpdateRoof={handleUpdateRoof}
          onUpdateRoom={handleUpdateRoom}
          onUpdateFurniture={handleUpdateFurniture}
          onDeleteSelected={handleDeleteSelected}
          onDuplicateSelected={handleDuplicateSelected}
          onRotateSelected={handleRotateSelected}
          onToggleLayer={(lId) => {
            setProject({
              ...project,
              layers: project.layers.map((l) => (l.id === lId ? { ...l, visible: !l.visible } : l)),
            });
          }}
          onAddFurniture={(furn) => {
            handleAddFurniture(furn);
            setSelection({ type: 'furniture', ids: [furn.id] });
          }}
          onEditRoom={(r) => setEditingRoom(r)}
          onBatchUpdateWalls={handleBatchUpdateWalls}
          plot={project.plot}
          onUpdatePlot={handleUpdatePlot}
          floorsCount={project.floors.length}
          onOpenRoofModal={() => setShowRoofModal(true)}
          isDrawerMode={isTablet}
          isOpenDrawer={isDrawerOpen}
          onCloseDrawer={() => setIsDrawerOpen(false)}
          bottomSheetDetent={bottomSheetDetent}
          onBottomSheetDetentChange={setBottomSheetDetent}
          backgroundImage={project.backgroundImage}
          onUpdateBackgroundImage={handleUpdateBackgroundImage}
          onToggleLockLayer={handleToggleLockLayer}
          onOpenUnderlayCrop={() => setShowUnderlayCropModal(true)}
          onInsertUnderlayImage={handleInsertUnderlayImage}
        />
      </div>

      {/* 3. BOTTOM STATUS BAR */}
      <CadStatusBar
        cursorPos={cursorPos}
        hintText={hintText}
        zoom={zoom}
        onZoomChange={setZoom}
        onZoomFit={handleZoomFit}
        snapSettings={snapSettings}
        onSnapSettingsChange={handleSnapSettingsChange}
        unit={project.unit}
        onUnitChange={(newUnit) => setProject({ ...project, unit: newUnit })}
        scale={project.scale}
        onScaleChange={(newScale) => setProject({ ...project, scale: newScale })}
        language={language}
        selectedCount={selection.ids.length}
      />

      {/* 4. TOUCH-FIRST FLOATING CONTROLS & CAD NUMPAD */}
      <CadTouchControls
        isDrawingActive={activeTool !== 'select' && activeTool !== 'pan'}
        onFinishDrawing={() => setActiveTool('select')}
        onCancelDrawing={() => setActiveTool('select')}
        isMultiSelectMode={isMultiSelectActive}
        onToggleMultiSelect={() => setIsMultiSelectActive((prev) => !prev)}
        isOrthoLocked={snapSettings.ortho}
        onToggleOrtho={() => handleSnapSettingsChange({ ...snapSettings, ortho: !snapSettings.ortho })}
        isSnapEnabled={snapSettings.enabled}
        onToggleSnap={() => handleSnapSettingsChange({ ...snapSettings, enabled: !snapSettings.enabled })}
        pencilMode={pencilMode}
        onTogglePencilMode={() =>
          setPencilMode((prev) =>
            prev === 'pencil_draws_finger_pans' || prev === 'pencilDrawsFingerNavigates'
              ? 'finger_draws_too'
              : 'pencil_draws_finger_pans'
          )
        }
        precisionMode={precisionMode}
        onTogglePrecisionMode={() =>
          setPrecisionMode((prev) =>
            prev === 'offset_crosshair' || prev === 'offsetCrosshairWithLoupe'
              ? 'normal'
              : 'offset_crosshair'
          )
        }
        viewRotationDeg={viewRotationDeg}
        onResetRotation={() => setViewRotationDeg(0)}
        showNumpad={showTouchNumpad}
        onToggleNumpad={() => setShowTouchNumpad((prev) => !prev)}
        numpadValue={numpadValue}
        numpadMode={numpadMode}
        onNumpadInput={handleNumpadInput}
        onNumpadBackspace={handleNumpadBackspace}
        onNumpadClear={handleNumpadClear}
        onNumpadSwitchMode={handleNumpadSwitchMode}
        onNumpadCommit={handleNumpadCommit}
        showClipboardSheet={showClipboardSheet}
        onCloseClipboardSheet={() => setShowClipboardSheet(false)}
        onCopy={handleClipboardCopy}
        onCut={handleClipboardCut}
        onPaste={handleClipboardPaste}
        onDuplicate={handleDuplicateSelected}
        onDelete={handleDeleteSelected}
        hasSelection={selection.ids.length > 0}
        isLeftHanded={leftHandedMode}
      />

      {/* MODALS */}
      <TouchGestureHelpModal
        isOpen={showGestureHelp}
        onClose={() => setShowGestureHelp(false)}
      />
      <WelcomeDialog
        isOpen={showWelcome}
        onClose={() => {
          setShowWelcome(false);
          try {
            localStorage.setItem('cad_has_seen_welcome_v2', 'true');
          } catch {}
        }}
        language={language}
      />

      <HelpDialog
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        language={language}
      />

      <HouseWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onGenerateProject={(proj) => {
          updateProject(proj);
          handleZoomFit();
        }}
        language={language}
      />

      <ExportPrintDialog
        isOpen={showExport}
        onClose={() => setShowExport(false)}
        project={project}
        floor={activeFloor}
        language={language}
      />

      <TemplatesModal
        isOpen={showTemplates}
        onClose={() => setShowTemplates(false)}
        onSelectProject={(proj) => {
          updateProject(proj);
          handleZoomFit();
        }}
        language={language}
      />

      <SettingsDialog
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        unit={project.unit}
        onUnitChange={(u) => setProject({ ...project, unit: u })}
        scale={project.scale}
        onScaleChange={(sc) => setProject({ ...project, scale: sc })}
        language={language}
        onLanguageChange={setLanguage}
        defaults={project.defaults}
        onUpdateDefaults={handleUpdateDefaults}
        snapSettings={snapSettings}
        onSnapSettingsChange={handleSnapSettingsChange}
        initialTab={settingsInitialTab}
      />

      <AiPlanImportModal
        isOpen={showAiImport}
        onClose={() => setShowAiImport(false)}
        project={project}
        activeFloor={activeFloor}
        onImportPlan={handleImportPlan}
        onOpenSettings={handleOpenSettingsWithTab}
      />

      <VoiceTextCorrectionModal
        isOpen={showVoiceCorrection}
        onClose={() => setShowVoiceCorrection(false)}
        project={project}
        activeFloor={activeFloor}
        onApplyCorrection={handleVoiceCorrection}
        onOpenSettings={() => handleOpenSettingsWithTab('ai')}
      />

      <FurnitureCatalogModal
        isOpen={showFurnitureCatalog}
        onClose={() => setShowFurnitureCatalog(false)}
        onSelectFurniture={(furn) => {
          handleAddFurniture(furn);
          setSelection({ type: 'furniture', ids: [furn.id] });
        }}
        language={language}
      />

      <WallNumericModal
        isOpen={showWallNumeric}
        onClose={() => setShowWallNumeric(false)}
        onAddWall={handleAddWall}
        language={language}
      />

      <HistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        historyLength={history.length}
        currentIndex={historyIndex}
        onJumpToIndex={(idx) => {
          setHistoryIndex(idx);
          setProject(history[idx]);
          setShowHistory(false);
        }}
        language={language}
      />

      <RoomEditModal
        room={editingRoom}
        onClose={() => setEditingRoom(null)}
        onSave={(updated) => {
          handleUpdateRoom(updated);
          setEditingRoom(null);
        }}
        language={language}
      />

      <CadRoofPanel
        isOpen={showRoofModal}
        onClose={() => setShowRoofModal(false)}
        roof={activeFloor.roofs[0] || null}
        walls={activeFloor.walls}
        onLiveUpdateRoof={(liveRoof) => {
          setProject((prev) => ({
            ...prev,
            floors: prev.floors.map((fl) =>
              fl.id === prev.activeFloorId ? { ...fl, roofs: liveRoof ? [liveRoof] : [] } : fl
            ),
          }));
        }}
        onCommitRoof={(committedRoof) => {
          handleSaveRoof(committedRoof);
          setShowRoofModal(false);
        }}
        onRemoveRoof={() => {
          handleSaveRoof(null);
          setShowRoofModal(false);
        }}
        language={language}
        isPortrait={window.innerHeight > window.innerWidth}
      />

      <HomeScreenGuideModal
        isOpen={showHomeScreenGuide}
        onClose={() => setShowHomeScreenGuide(false)}
        onNeverShowAgain={() => {
          try {
            localStorage.setItem('cad_dismiss_homescreen_guide_v1', 'true');
          } catch {}
          setShowHomeScreenGuide(false);
        }}
      />

      <UnderlayCropModal
        isOpen={showUnderlayCropModal}
        onClose={() => setShowUnderlayCropModal(false)}
        backgroundImage={project.backgroundImage}
        onApplyCrop={(crop) => {
          if (project.backgroundImage) {
            handleUpdateBackgroundImage({
              ...project.backgroundImage,
              crop,
            });
          }
          setShowUnderlayCropModal(false);
        }}
        language={language}
      />

      {/* CONFIRMATION DIALOG: LEERE NEUE SEITE / ALLES LÖSCHEN */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 shadow-xs">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-stone-900 dark:text-white">Leere neue Seite anlegen?</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">Alles löschen, um von vorne anzufangen</p>
              </div>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed mb-6 bg-stone-50 dark:bg-stone-850 p-3.5 rounded-xl border border-stone-200/80 dark:border-stone-800">
              Möchtest du wirklich alle aktuellen Wände, Räume, Türen, Fenster, Möbel und Grundstückspunkte löschen? Du erhältst eine völlig leere, saubere Arbeitsfläche.
            </p>

            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                onClick={handleResetEmptyProject}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-500 text-white shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Alles löschen & Neu anfangen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
