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
  UnitType,
  ScaleType,
  ViewMode,
  Language,
  Point2D,
  BoundingBox2D,
  PlotBoundary,
  ProjectDefaults,
} from './types/cad';
import {
  createHolidayHouse6x8Template,
  createEmptyProject,
} from './utils/templates';
import { getT } from './i18n/translations';
import { mergeBoundingBoxes, getWallBoundingBox, getFurnitureBoundingBox } from './utils/cadMath';
import { RotateCcw, Trash2 } from 'lucide-react';

// UI components
import { CadHeader } from './components/toolbar/CadHeader';
import { CadToolbar } from './components/toolbar/CadToolbar';
import { CadStatusBar } from './components/toolbar/CadStatusBar';
import { CadInspector } from './components/inspector/CadInspector';
import { CadFloatingContextBar } from './components/toolbar/CadFloatingContextBar';

// Views
import { CadCanvas2D } from './components/canvas/CadCanvas2D';
import { CadView3D } from './components/views/CadView3D';
import { CadElevationsView } from './components/views/CadElevationsView';
import { CadSectionView } from './components/views/CadSectionView';
import { CadQuantitiesView } from './components/views/CadQuantitiesView';

// Modals
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
  const [panOffset, setPanOffset] = useState<Point2D>({ x: 220, y: 160 });
  const [cursorPos, setCursorPos] = useState<Point2D | null>(null);

  // Snapping
  const [snapSettings, setSnapSettings] = useState<SnapSettings>({
    grid: true,
    gridSize: 0.25, // 25 cm
    wallEndpoints: true,
    wallMidpoints: true,
    intersections: true,
    ortho: false,
    step15Deg: false,
  });

  // Dialogs
  const [showWelcome, setShowWelcome] = useState<boolean>(() => {
    return !localStorage.getItem('cad_has_seen_welcome_v2');
  });
  const [showHelp, setShowHelp] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showFurnitureCatalog, setShowFurnitureCatalog] = useState(false);
  const [showWallNumeric, setShowWallNumeric] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

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

  // Auto zoom-to-fit on initial mount
  useEffect(() => {
    const timer = setTimeout(handleZoomFit, 150);
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
    setPanOffset({ x: 220, y: 160 });
    setShowClearConfirm(false);
  }, [updateProject]);

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
  const handleUpdateDefaults = (newDefaults: ProjectDefaults) => {
    updateProject({ ...project, defaults: newDefaults });
  };

  // Delete Selection (Single, Multi, or specific target IDs)
  const handleDeleteSelected = (idsToDelete?: string[]) => {
    const targetIds = idsToDelete && idsToDelete.length > 0 ? idsToDelete : selection.ids;
    const isPlotTargeted =
      targetIds.includes('plot') ||
      selection.type === 'plot' ||
      targetIds.some((id) => id.startsWith('plot_pt_'));

    if (targetIds.length === 0 && !isPlotTargeted && selection.type === 'none') return;
    const idSet = new Set(targetIds);

    // If plot or plot points are selected, clear and disable plot completely
    if (isPlotTargeted) {
      if (project.plot) {
        handleUpdatePlot({
          ...project.plot,
          points: undefined,
          enabled: false,
          width: 20.0,
          depth: 30.0,
        });
      }
    }

    updateActiveFloor((f) => ({
      ...f,
      walls: f.walls.filter((w) => !idSet.has(w.id)),
      doors: f.doors.filter((d) => !idSet.has(d.id) && !idSet.has(d.wallId)),
      windows: f.windows.filter((win) => !idSet.has(win.id) && !idSet.has(win.wallId)),
      furniture: f.furniture.filter((item) => !idSet.has(item.id)),
      dimensions: f.dimensions.filter((dim) => !idSet.has(dim.id)),
      stairs: f.stairs.filter((st) => !idSet.has(st.id)),
      rooms: f.rooms.filter((rm) => !idSet.has(rm.id)),
    }));
    setSelection({ type: 'none', ids: [] });
  };

  // Duplicate Selection
  const handleDuplicateSelected = () => {
    if (selection.ids.length === 0) return;
    const offset = 0.5;
    const idSet = new Set(selection.ids);
    const newIds: string[] = [];

    updateActiveFloor((f) => {
      const nextWalls = [...f.walls];
      const nextFurn = [...f.furniture];

      f.walls.forEach((w) => {
        if (idSet.has(w.id)) {
          const newW: Wall = {
            ...w,
            id: 'w_' + Date.now() + Math.random().toString(36).substr(2, 4),
            start: { x: w.start.x + offset, y: w.start.y + offset },
            end: { x: w.end.x + offset, y: w.end.y + offset },
          };
          nextWalls.push(newW);
          newIds.push(newW.id);
        }
      });

      f.furniture.forEach((item) => {
        if (idSet.has(item.id)) {
          const newF: Furniture = {
            ...item,
            id: 'furn_' + Date.now() + Math.random().toString(36).substr(2, 4),
            x: item.x + offset,
            y: item.y + offset,
          };
          nextFurn.push(newF);
          newIds.push(newF.id);
        }
      });

      return {
        ...f,
        walls: nextWalls,
        furniture: nextFurn,
      };
    });

    if (newIds.length > 0) {
      setSelection({ type: newIds.length > 1 ? 'mixed' : 'wall', ids: newIds });
    }
  };

  // Rotate Selection
  const handleRotateSelected = (deg: number) => {
    if (selection.ids.length === 0) return;
    const idSet = new Set(selection.ids);

    updateActiveFloor((f) => ({
      ...f,
      furniture: f.furniture.map((item) => {
        if (idSet.has(item.id)) {
          return { ...item, rotation: (item.rotation + deg) % 360 };
        }
        return item;
      }),
    }));
  };

  // Horizontal Mirror
  const handleFlipHorizontal = () => {
    if (selection.ids.length === 0) return;
    const idSet = new Set(selection.ids);

    updateActiveFloor((f) => ({
      ...f,
      doors: f.doors.map((d) => {
        if (idSet.has(d.id)) {
          return {
            ...d,
            swingDirection: d.swingDirection === 'left' ? 'right' : 'left',
          };
        }
        return d;
      }),
      furniture: f.furniture.map((item) => {
        if (idSet.has(item.id)) {
          return { ...item, rotation: (item.rotation + 180) % 360 };
        }
        return item;
      }),
    }));
  };

  // Keyboard Shortcuts (including multi-selection arrow nudging)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'v' || e.key === 'V') setActiveTool('select');
      if (e.key === 'h' || e.key === 'H') setActiveTool('hand');
      if (e.key === 'w' || e.key === 'W') setActiveTool('wall');
      if (e.key === 'r' || e.key === 'R') setActiveTool('rect_room');
      if (e.key === 'g' || e.key === 'G') setActiveTool('plot');
      if (e.key === 'd' && !e.ctrlKey && !e.metaKey) setActiveTool('door');
      if (e.key === 'D' && !e.ctrlKey && !e.metaKey) setActiveTool('door');
      if (e.key === 'f' || e.key === 'F') setActiveTool('window');
      if (e.key === 't' || e.key === 'T') setActiveTool('stairs');
      if (e.key === 'm' || e.key === 'M') setShowFurnitureCatalog(true);
      if (e.key === 'b' || e.key === 'B') setActiveTool('dimension');
      if (e.key === 'Delete' || e.key === 'Backspace') handleDeleteSelected();
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
            />
          )}

          {/* VIEW: 3D MODEL */}
          {viewMode === '3d' && (
            <CadView3D project={project} floor={activeFloor} language={language} />
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
                />
              </div>
              <div className="w-1/2 h-full">
                <CadView3D project={project} floor={activeFloor} language={language} />
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
        onSnapSettingsChange={setSnapSettings}
        unit={project.unit}
        onUnitChange={(newUnit) => setProject({ ...project, unit: newUnit })}
        scale={project.scale}
        onScaleChange={(newScale) => setProject({ ...project, scale: newScale })}
        language={language}
        selectedCount={selection.ids.length}
      />

      {/* MODALS */}
      <WelcomeDialog
        isOpen={showWelcome}
        onClose={() => {
          setShowWelcome(false);
          localStorage.setItem('cad_has_seen_welcome_v2', 'true');
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
        onSnapSettingsChange={setSnapSettings}
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
