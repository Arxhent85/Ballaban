/**
 * High-Precision Architectural 2D CAD Canvas
 * Features:
 * - Interactive Property Line Drawing (Linien ziehen um Grundstücksgrenzen frei als Polygon festzulegen)
 * - Noticeably distinct wall thicknesses: Außenwände (30 cm, dunkel gefüllt, stark umrandet) vs Innenwände (11,5 cm)
 * - Geneigte / ansteigende Wände (h₁ Anfangshöhe bis h₂ Endhöhe für vergrößerte Räume / Pultdächer)
 * - Seamless mitered wall junctions and clean outer contours (no seams or cross-lines)
 * - Multi-selection (Window & Crossing marquee, Shift+Click, simultaneous translation of all selected objects)
 * - Plot boundary, setbacks (3m Baugrenze), buildable area (Baufenster), and live GRZ/GFZ status
 * - Refined architectural studio aesthetic (warm charcoal #1c1917, terracotta #ea580c, warm stone #f5f5f4)
 */

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Point2D,
  Wall,
  Door,
  Window,
  Stair,
  Roof,
  Room,
  Furniture,
  DimensionLine,
  TextAnnotation,
  VectorShape,
  GuideLine,
  CadTool,
  SelectionState,
  SnapSettings,
  UnitType,
  Language,
  LayerState,
  BoundingBox2D,
  MarqueeBox,
  PlotBoundary,
  ProjectDefaults,
} from '../../types/cad';
import {
  distance,
  angleDeg,
  calculateSnap,
  projectPointOntoWall,
  formatDimension,
  getWallNormal,
  getWallBoundingBox,
  getFurnitureBoundingBox,
  isPointInAABB,
  aabbContains,
  aabbIntersects,
  mergeBoundingBoxes,
  calculateSeamlessWallRenderData,
  calculatePlotMetrics,
  calculatePolygonInwardOffset,
  checkFurnitureWallCollision,
  isPointInPolygon,
  lineIntersection,
  SnapResult,
  ActiveGuideLine,
  calculateEqualSpacingRatio,
} from '../../utils/cadMath';
import { getT } from '../../i18n/translations';
import {
  RotateCcw,
  Trash2,
  Copy,
  RotateCw,
  FlipHorizontal,
  Check,
  X,
  MousePointer,
  Scissors,
} from 'lucide-react';

interface CadCanvas2DProps {
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  roofs: Roof[];
  rooms: Room[];
  furniture: Furniture[];
  dimensions: DimensionLine[];
  annotations: TextAnnotation[];
  shapes: VectorShape[];
  guideLines: GuideLine[];
  layers: LayerState[];
  activeTool: CadTool;
  selection: SelectionState;
  onSelect: (sel: SelectionState) => void;
  snapSettings: SnapSettings;
  unit: UnitType;
  language: Language;
  zoom: number; // pixels per meter
  onZoomChange: (z: number) => void;
  panOffset: Point2D;
  onPanOffsetChange: (p: Point2D) => void;
  onCursorMove: (p: Point2D | null) => void;
  onAddWall: (w: Wall) => void;
  onUpdateWall: (w: Wall) => void;
  onAddDoor: (d: Door) => void;
  onAddWindow: (win: Window) => void;
  onAddFurniture: (f: Furniture) => void;
  onUpdateFurniture?: (f: Furniture) => void;
  onAddDimension: (d: DimensionLine) => void;
  onEditRoom: (r: Room) => void;
  onAddRoom?: (r: Room) => void;
  plot?: PlotBoundary;
  onUpdatePlot?: (plot: PlotBoundary) => void;
  defaults?: ProjectDefaults;
  floorsCount?: number;
  selectedColor: string;
  isDark: boolean;
  onMoveSelection?: (dx: number, dy: number, specificIds?: string[]) => void;
  onCommitProjectChange?: () => void;
  onDeleteSelected?: (idsToDelete?: string[]) => void;
  onDuplicateSelected?: () => void;
  onRotateSelected?: (deg: number) => void;
  onFlipHorizontal?: () => void;
  onSelectTool?: (tool: CadTool) => void;
  onAddWallsAndRoom?: (walls: Wall[], room?: Room) => void;
  onSplitWall?: (wallId: string, splitPoint: Point2D) => void;
  onSplitSelectedWall?: () => void;
}

export const CadCanvas2D: React.FC<CadCanvas2DProps> = ({
  walls,
  doors,
  windows,
  stairs,
  rooms,
  furniture,
  dimensions,
  annotations,
  shapes,
  guideLines,
  layers,
  activeTool,
  selection,
  onSelect,
  snapSettings,
  unit,
  zoom,
  onZoomChange,
  panOffset,
  onPanOffsetChange,
  onCursorMove,
  onAddWall,
  onUpdateWall,
  onAddDoor,
  onAddWindow,
  onAddFurniture,
  onUpdateFurniture,
  onAddDimension,
  onEditRoom,
  onAddRoom,
  plot,
  onUpdatePlot,
  defaults,
  floorsCount = 1,
  selectedColor,
  isDark,
  onMoveSelection,
  onCommitProjectChange,
  onDeleteSelected,
  onDuplicateSelected,
  onRotateSelected,
  onFlipHorizontal,
  onSelectTool,
  onAddWallsAndRoom,
  onSplitWall,
  onSplitSelectedWall,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const draggedIdsRef = useRef<string[]>([]);

  // Pan state
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Hovering selection
  const [isHoveringSelection, setIsHoveringSelection] = useState(false);

  // Multi-touch gestures (Pinch-to-zoom & two-finger pan for tablets)
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStateRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialPan: Point2D;
    initialCenter: { x: number; y: number };
  } | null>(null);

  // Pointer tracking for click vs drag detection
  const [pointerDownPos, setPointerDownPos] = useState<Point2D | null>(null);
  const [isPointerDown, setIsPointerDown] = useState(false);

  // Wall Chain Drawing state
  const [wallStartPoint, setWallStartPoint] = useState<Point2D | null>(null);
  const [wallChainPoints, setWallChainPoints] = useState<Point2D[]>([]);
  const [currentCursorWorld, setCurrentCursorWorld] = useState<Point2D | null>(null);
  const [snapIndicator, setSnapIndicator] = useState<{ point: Point2D; type: string } | null>(null);
  const [smartSnap, setSmartSnap] = useState<SnapResult | null>(null);
  const [snapCandidateIndex, setSnapCandidateIndex] = useState<number>(0);
  const [isShiftDown, setIsShiftDown] = useState<boolean>(false);
  const [isAltDown, setIsAltDown] = useState<boolean>(false);

  // Keyboard modifiers & Tab candidate cycling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Tab') {
        if (smartSnap && (smartSnap.candidatesCount || 0) > 1) {
          e.preventDefault();
          setSnapCandidateIndex((prev) => prev + 1);
        }
      }
      if (e.key === 'Shift') setIsShiftDown(true);
      if (e.key === 'Alt') setIsAltDown(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') setIsShiftDown(false);
      if (e.key === 'Alt') setIsAltDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [smartSnap]);

  // Wall Drawing Mode: Exterior (30 cm) vs Interior (11.5 cm)
  const [wallMode, setWallMode] = useState<'exterior' | 'interior'>('exterior');
  const [wallThicknessM, setWallThicknessM] = useState<number>(0.30);
  const [wallStartHeight, setWallStartHeight] = useState<number>(defaults?.wallHeight || 2.50);
  const [wallEndHeight, setWallEndHeight] = useState<number>(defaults?.wallHeight || 2.50);

  const handleToggleWallMode = (mode: 'exterior' | 'interior') => {
    setWallMode(mode);
    if (mode === 'exterior') {
      setWallThicknessM(defaults?.exteriorWallThickness || 0.30);
    } else {
      setWallThicknessM(defaults?.interiorWallThickness || 0.115);
    }
  };

  // Direct numeric input box state
  const [numericLength, setNumericLength] = useState<string>('');
  const [numericAngle, setNumericAngle] = useState<string>('');
  const [showNumericInput, setShowNumericInput] = useState(false);

  // Rect Room Drawing state
  const [rectRoomStart, setRectRoomStart] = useState<Point2D | null>(null);

  // Property / Plot Polygon Line Drawing state
  const [plotDrawPoints, setPlotDrawPoints] = useState<Point2D[]>([]);

  // Marquee Selection Box
  const [marquee, setMarquee] = useState<MarqueeBox | null>(null);

  // Hover highlighting
  const [hoveredObjectId, setHoveredObjectId] = useState<string | null>(null);

  // Dragging selection
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [dragSelectionStart, setDragSelectionStart] = useState<Point2D | null>(null);

  // Dragging wall handle
  const [draggingHandle, setDraggingHandle] = useState<{ wallId: string; handle: 'start' | 'end'; origPoint: Point2D } | null>(null);

  // Dragging plot vertex or entire plot
  const [draggingPlotVertex, setDraggingPlotVertex] = useState<number | null>(null);
  const [isDraggingPlot, setIsDraggingPlot] = useState<boolean>(false);

  // Coordinate conversions
  const worldToScreen = useCallback(
    (wp: Point2D): Point2D => ({
      x: wp.x * zoom + panOffset.x,
      y: wp.y * zoom + panOffset.y,
    }),
    [zoom, panOffset]
  );

  const screenToWorld = useCallback(
    (sp: Point2D): Point2D => ({
      x: (sp.x - panOffset.x) / zoom,
      y: (sp.y - panOffset.y) / zoom,
    }),
    [zoom, panOffset]
  );

  // Helper: Find wall under point (generous tolerance)
  const findWallNearPoint = useCallback(
    (p: Point2D, toleranceM = 0.35): { wall: Wall; proj: Point2D; ratio: number } | null => {
      const effectiveTol = Math.max(toleranceM, 18 / zoom);
      for (const w of walls) {
        const { point, ratio, dist } = projectPointOntoWall(p, w);
        if (dist <= effectiveTol + (w.thickness || 0.3) / 2) {
          return { wall: w, proj: point, ratio };
        }
      }
      return null;
    },
    [walls, zoom]
  );

  // Helper: Find plot hit (vertex, edge, or area)
  const findPlotHit = useCallback(
    (p: Point2D) => {
      if (!plot || !plot.enabled) return null;
      const pts =
        plot.points && plot.points.length >= 3
          ? plot.points
          : [
              { x: plot.x, y: plot.y },
              { x: plot.x + plot.width, y: plot.y },
              { x: plot.x + plot.width, y: plot.y + plot.depth },
              { x: plot.x, y: plot.y + plot.depth },
            ];

      // 1. Check vertex hit (generous threshold: at least 22px on screen)
      const vertexTol = Math.max(0.5, 22 / zoom);
      for (let i = 0; i < pts.length; i++) {
        if (distance(p, pts[i]) <= vertexTol) {
          return { type: 'vertex' as const, index: i, point: pts[i] };
        }
      }

      // 2. Check edge hit (boundary line)
      const edgeTol = Math.max(0.4, 18 / zoom);
      for (let i = 0; i < pts.length; i++) {
        const pA = pts[i];
        const pB = pts[(i + 1) % pts.length];
        const dx = pB.x - pA.x;
        const dy = pB.y - pA.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq > 0) {
          let t = ((p.x - pA.x) * dx + (p.y - pA.y) * dy) / lenSq;
          t = Math.max(0, Math.min(1, t));
          const proj = { x: pA.x + t * dx, y: pA.y + t * dy };
          if (distance(p, proj) <= edgeTol) {
            return { type: 'edge' as const, index: i, point: proj };
          }
        }
      }

      // 3. Check inside plot polygon area
      if (isPointInPolygon(p, pts)) {
        return { type: 'area' as const, index: -1, point: p };
      }

      return null;
    },
    [plot, zoom]
  );

  // Selection Bounding Box for multi-select
  const selectionBoundingBox = useMemo(() => {
    if ((selection.ids.length === 0 && selection.type === 'none') || selection.type === 'none') return null;

    const boxes: BoundingBox2D[] = [];
    selection.ids.forEach((id) => {
      const wall = walls.find((w) => w.id === id);
      if (wall) boxes.push(getWallBoundingBox(wall));

      const furn = furniture.find((f) => f.id === id);
      if (furn) boxes.push(getFurnitureBoundingBox(furn));

      const door = doors.find((d) => d.id === id);
      if (door) {
        const w = walls.find((wl) => wl.id === door.wallId);
        if (w) {
          const wLen = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
          const cx = w.start.x + ((w.end.x - w.start.x) / wLen) * (door.position * wLen);
          const cy = w.start.y + ((w.end.y - w.start.y) / wLen) * (door.position * wLen);
          boxes.push({ minX: cx - 0.5, minY: cy - 0.5, maxX: cx + 0.5, maxY: cy + 0.5 });
        }
      }

      const win = windows.find((w) => w.id === id);
      if (win) {
        const w = walls.find((wl) => wl.id === win.wallId);
        if (w) {
          const wLen = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y) || 1;
          const cx = w.start.x + ((w.end.x - w.start.x) / wLen) * (win.position * wLen);
          const cy = w.start.y + ((w.end.y - w.start.y) / wLen) * (win.position * wLen);
          boxes.push({ minX: cx - 0.6, minY: cy - 0.6, maxX: cx + 0.6, maxY: cy + 0.6 });
        }
      }

      const rm = rooms.find((r) => r.id === id);
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
      if (plot && plot.enabled) {
        const pts =
          plot.points && plot.points.length >= 3
            ? plot.points
            : [
                { x: plot.x, y: plot.y },
                { x: plot.x + plot.width, y: plot.y },
                { x: plot.x + plot.width, y: plot.y + plot.depth },
                { x: plot.x, y: plot.y + plot.depth },
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
  }, [selection, walls, furniture, doors, windows, rooms, plot]);

  // Seamless wall polygons and junction cap states
  const seamlessWalls = useMemo(() => {
    return calculateSeamlessWallRenderData(walls);
  }, [walls]);

  // Plot metrics (GRZ, GFZ, buildable area)
  const plotMetrics = useMemo(() => {
    if (!plot || !plot.enabled) return null;
    return calculatePlotMetrics(plot, walls, floorsCount);
  }, [plot, walls, floorsCount]);

  // Current active wall thickness based on mode
  const currentWallThickness = wallThicknessM || (wallMode === 'exterior'
    ? (defaults?.exteriorWallThickness || 0.30)
    : (defaults?.interiorWallThickness || 0.115));

  // ==========================================
  // MAIN CANVAS RENDERING LOOP
  // ==========================================
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Canvas Background: warm architectural bone-white or deep charcoal
    ctx.fillStyle = isDark ? '#141416' : '#fdfcfb';
    ctx.fillRect(0, 0, width, height);

    // Subtle Architectural Grid
    if (snapSettings.grid) {
      const gSize = snapSettings.gridSize * zoom;
      const startX = ((panOffset.x % gSize) + gSize) % gSize;
      const startY = ((panOffset.y % gSize) + gSize) % gSize;

      // Minor grid: warm subtle stone
      ctx.strokeStyle = isDark ? 'rgba(63, 63, 70, 0.4)' : 'rgba(231, 229, 228, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x < width; x += gSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += gSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Major grid (1.0 m lines): slightly more defined
      const majorSize = 1.0 * zoom;
      const majorStartX = ((panOffset.x % majorSize) + majorSize) % majorSize;
      const majorStartY = ((panOffset.y % majorSize) + majorSize) % majorSize;

      ctx.strokeStyle = isDark ? 'rgba(82, 82, 91, 0.6)' : 'rgba(214, 211, 209, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = majorStartX; x < width; x += majorSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = majorStartY; y < height; y += majorSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }

    // ==========================================
    // 0. WORLD AXES (X=0 & Y=0 NULL-ACHSEN & URSPRUNG)
    // ==========================================
    const originX = Math.round(panOffset.x) + 0.5;
    const originY = Math.round(panOffset.y) + 0.5;

    // Subtle shading for area outside the primary positive workspace (x < 0 or y < 0)
    if (originX > 0 || originY > 0) {
      ctx.fillStyle = isDark ? 'rgba(0, 0, 0, 0.25)' : 'rgba(241, 245, 249, 0.55)';
      if (originX > 0) ctx.fillRect(0, 0, originX, height);
      if (originY > 0) ctx.fillRect(originX, 0, width - originX, originY);
    }

    // Y-Axis line (vertical line at X = 0.00 m extending into positive Y)
    if (originX >= 0 && originX <= width) {
      ctx.strokeStyle = isDark ? 'rgba(56, 189, 248, 0.65)' : 'rgba(2, 132, 199, 0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(originX, Math.max(0, originY));
      ctx.lineTo(originX, height);
      ctx.stroke();

      // Label at Y-Axis
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('Y-Achse (0 m)', originX + 5, Math.max(30, originY + 5));
    }

    // X-Axis line (horizontal line at Y = 0.00 m extending into positive X)
    if (originY >= 0 && originY <= height) {
      ctx.strokeStyle = isDark ? 'rgba(244, 63, 94, 0.65)' : 'rgba(225, 29, 72, 0.7)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(Math.max(0, originX), originY);
      ctx.lineTo(width, originY);
      ctx.stroke();

      // Label at X-Axis
      ctx.font = '600 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#f43f5e' : '#e11d48';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('X-Achse (0 m)', Math.max(36, originX + 5), originY - 4);
    }

    // Origin marker at (0, 0)
    if (originX >= 0 && originX <= width && originY >= 0 && originY <= height) {
      ctx.fillStyle = isDark ? '#38bdf8' : '#0284c7';
      ctx.beginPath();
      ctx.arc(originX, originY, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = '700 10.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#7dd3fc' : '#0369a1';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('0,0 m', originX + 7, originY + 7);
    }

    // ==========================================
    // 1. PROPERTY PLOT (GRUNDSTÜCK, GRENZLINIEN & BAUFENSTER)
    // ==========================================
    if (plot && plot.enabled) {
      const plotPts: Point2D[] = (plot.points && plot.points.length >= 3)
        ? plot.points
        : [
            { x: plot.x, y: plot.y },
            { x: plot.x + plot.width, y: plot.y },
            { x: plot.x + plot.width, y: plot.y + plot.depth },
            { x: plot.x, y: plot.y + plot.depth },
          ];

      const screenPts = plotPts.map(worldToScreen);

      // 1.1 Property Area fill
      ctx.beginPath();
      ctx.moveTo(screenPts[0].x, screenPts[0].y);
      for (let i = 1; i < screenPts.length; i++) {
        ctx.lineTo(screenPts[i].x, screenPts[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = isDark ? 'rgba(28, 25, 23, 0.5)' : 'rgba(245, 245, 244, 0.5)';
      ctx.fill();

      // 1.2 Property Boundary Line (Grenzlinie)
      if (selection.type === 'plot' || selection.ids.includes('plot')) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3.5;
        ctx.stroke();
      } else {
        ctx.strokeStyle = isDark ? '#78716c' : '#44403c';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // 1.3 Boundary Corner Stones (Grenzsteine)
      screenPts.forEach((pt) => {
        ctx.fillStyle = isDark ? '#fafaf9' : '#1c1917';
        ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(pt.x - 1, pt.y - 1, 2, 2);
      });

      // 1.4 Dimension labels along each boundary line segment
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#a8a29e' : '#57534e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = 0; i < plotPts.length; i++) {
        const pA = plotPts[i];
        const pB = plotPts[(i + 1) % plotPts.length];
        const segLen = distance(pA, pB);
        const spA = screenPts[i];
        const spB = screenPts[(i + 1) % screenPts.length];
        const mid = { x: (spA.x + spB.x) / 2, y: (spA.y + spB.y) / 2 };

        // Perpendicular offset for label
        const dx = spB.x - spA.x;
        const dy = spB.y - spA.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const label = `${segLen.toFixed(2)} m`;
        const txtW = ctx.measureText(label).width;

        // Label backing badge
        ctx.fillStyle = isDark ? '#1c1917' : '#ffffff';
        ctx.fillRect(mid.x + nx * 14 - txtW / 2 - 3, mid.y + ny * 14 - 7, txtW + 6, 14);
        ctx.strokeStyle = isDark ? '#44403c' : '#d6d3d1';
        ctx.lineWidth = 1;
        ctx.strokeRect(mid.x + nx * 14 - txtW / 2 - 3, mid.y + ny * 14 - 7, txtW + 6, 14);

        ctx.fillStyle = isDark ? '#d6d3d1' : '#292524';
        ctx.fillText(label, mid.x + nx * 14, mid.y + ny * 14);
      }

      // 1.5 Setback Polygon (Baugrenzen / Abstandsflächen 3.0m)
      const setbackPts = plotMetrics?.setbackPolygon || calculatePolygonInwardOffset(plotPts, plot.setback || 3.0);
      if (setbackPts && setbackPts.length >= 3) {
        const sbScreen = setbackPts.map(worldToScreen);

        // Buildable Envelope (Baufenster) soft tint
        ctx.beginPath();
        ctx.moveTo(sbScreen[0].x, sbScreen[0].y);
        for (let i = 1; i < sbScreen.length; i++) {
          ctx.lineTo(sbScreen[i].x, sbScreen[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = isDark ? 'rgba(234, 88, 12, 0.04)' : 'rgba(234, 88, 12, 0.05)';
        ctx.fill();

        // Dashed Red Setback Line
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([7, 4]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on first setback segment
        if (sbScreen.length >= 2) {
          ctx.font = '600 10px "Inter", sans-serif';
          ctx.fillStyle = '#dc2626';
          ctx.textAlign = 'left';
          ctx.fillText(`Baugrenze (${(plot.setback || 3.0).toFixed(1)} m Abstand)`, sbScreen[0].x + 10, sbScreen[0].y + 14);
        }
      }
    }

    // 1.6 Active Property Line Drawing Preview
    if (activeTool === 'plot' && plotDrawPoints.length > 0) {
      const pts = plotDrawPoints.map(worldToScreen);

      // Existing line segments
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();

      // Vertex markers
      pts.forEach((pt) => {
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(pt.x - 4, pt.y - 4, 8, 8);
      });

      // Preview segment to cursor
      if (currentCursorWorld) {
        const curSp = worldToScreen(currentCursorWorld);
        const lastPt = pts[pts.length - 1];
        const lastWorld = plotDrawPoints[plotDrawPoints.length - 1];

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.0;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(curSp.x, curSp.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Live segment dimension badge
        const segDist = distance(lastWorld, currentCursorWorld);
        const segAng = angleDeg(lastWorld, currentCursorWorld);
        const midX = (lastPt.x + curSp.x) / 2;
        const midY = (lastPt.y + curSp.y) / 2;

        ctx.font = '600 11px "JetBrains Mono", monospace';
        const txt = `Grenzlinie: ${formatDimension(segDist, unit, 2)} · ${segAng.toFixed(0)}°`;
        const bW = ctx.measureText(txt).width + 12;

        ctx.fillStyle = '#1c1917';
        ctx.fillRect(midX - bW / 2, midY - 24, bW, 20);
        ctx.strokeStyle = '#ea580c';
        ctx.strokeRect(midX - bW / 2, midY - 24, bW, 20);
        ctx.fillStyle = '#fdba74';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(txt, midX, midY - 14);

        // Snap marker if close to start
        if (plotDrawPoints.length >= 3 && distance(currentCursorWorld, plotDrawPoints[0]) <= 0.4) {
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(pts[0].x - 8, pts[0].y - 8, 16, 16);
        }
      }
    }

    // ==========================================
    // 2. ROOMS (Floor finishes & Net internal areas)
    // ==========================================
    const showRooms = layers.find((l) => l.id === 'rooms')?.visible !== false;
    if (showRooms) {
      rooms.forEach((r) => {
        if (r.polygon.length >= 3) {
          ctx.beginPath();
          const first = worldToScreen(r.polygon[0]);
          ctx.moveTo(first.x, first.y);
          for (let i = 1; i < r.polygon.length; i++) {
            const pt = worldToScreen(r.polygon[i]);
            ctx.lineTo(pt.x, pt.y);
          }
          ctx.closePath();

          const isSelectedRoom = selection.ids.includes(r.id);

          // Clear, distinct architectural floor fills with noticeable color & contrast
          let fillColor = isDark ? 'rgba(59, 130, 246, 0.18)' : 'rgba(219, 234, 254, 0.65)'; // default soft blue
          let strokeColor = isDark ? 'rgba(96, 165, 250, 0.5)' : 'rgba(59, 130, 246, 0.5)';

          if (r.floorFinish === 'tiles') {
            fillColor = isDark ? 'rgba(20, 184, 166, 0.20)' : 'rgba(204, 251, 241, 0.75)'; // crisp mint
            strokeColor = isDark ? 'rgba(45, 212, 191, 0.6)' : 'rgba(13, 148, 136, 0.55)';
          } else if (r.floorFinish === 'parquet' || r.floorFinish === 'wood_plank') {
            fillColor = isDark ? 'rgba(217, 119, 6, 0.20)' : 'rgba(254, 240, 138, 0.65)'; // warm honey wood
            strokeColor = isDark ? 'rgba(245, 158, 11, 0.6)' : 'rgba(217, 119, 6, 0.6)';
          } else if (r.floorFinish === 'carpet') {
            fillColor = isDark ? 'rgba(168, 85, 247, 0.18)' : 'rgba(243, 232, 255, 0.7)'; // soft lavender
            strokeColor = isDark ? 'rgba(192, 132, 252, 0.6)' : 'rgba(147, 51, 234, 0.55)';
          } else if (r.category === 'kitchen' || r.category === 'bath') {
            fillColor = isDark ? 'rgba(6, 182, 212, 0.20)' : 'rgba(207, 250, 254, 0.75)'; // aqua
            strokeColor = isDark ? 'rgba(34, 211, 238, 0.6)' : 'rgba(8, 145, 178, 0.55)';
          } else if (r.category === 'sleeping') {
            fillColor = isDark ? 'rgba(99, 102, 241, 0.18)' : 'rgba(224, 231, 255, 0.7)'; // soft indigo
            strokeColor = isDark ? 'rgba(129, 140, 248, 0.6)' : 'rgba(79, 70, 229, 0.55)';
          } else if (r.category === 'outdoor') {
            fillColor = isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(220, 252, 231, 0.7)'; // fresh garden green
            strokeColor = isDark ? 'rgba(74, 222, 128, 0.6)' : 'rgba(22, 163, 74, 0.55)';
          }

          if (isSelectedRoom) {
            fillColor = isDark ? 'rgba(245, 158, 11, 0.32)' : 'rgba(251, 191, 36, 0.45)';
            strokeColor = '#ea580c';
          }

          ctx.fillStyle = fillColor;
          ctx.fill();

          // Room boundary contour stroke: clearly defined
          ctx.strokeStyle = isSelectedRoom ? '#ea580c' : strokeColor;
          ctx.lineWidth = isSelectedRoom ? 2.5 : 1.5;
          if (isSelectedRoom) {
            ctx.setLineDash([6, 4]);
          } else {
            ctx.setLineDash([]);
          }
          ctx.stroke();
          ctx.setLineDash([]);

          // Room Stamp Centered
          const cx = r.polygon.reduce((acc, p) => acc + p.x, 0) / r.polygon.length;
          const cy = r.polygon.reduce((acc, p) => acc + p.y, 0) / r.polygon.length;
          const sc = worldToScreen({ x: cx, y: cy });

          ctx.font = '700 12px "Inter", sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const titleWidth = ctx.measureText(r.name).width;
          const badgeW = Math.max(titleWidth + 24, 110);
          const badgeH = 34;

          // Shadow for room stamp badge
          ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.5)' : 'rgba(0, 0, 0, 0.15)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;

          ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
          ctx.strokeStyle = isSelectedRoom ? '#ea580c' : (isDark ? '#475569' : '#cbd5e1');
          ctx.lineWidth = isSelectedRoom ? 2 : 1.2;
          
          ctx.beginPath();
          if (typeof ctx.roundRect === 'function') {
            ctx.roundRect(sc.x - badgeW / 2, sc.y - badgeH / 2, badgeW, badgeH, 6);
          } else {
            ctx.rect(sc.x - badgeW / 2, sc.y - badgeH / 2, badgeW, badgeH);
          }
          ctx.fill();
          ctx.stroke();

          // Reset shadow
          ctx.shadowColor = 'transparent';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;

          // Room name
          ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
          ctx.font = '700 12px "Inter", sans-serif';
          ctx.fillText(r.name, sc.x, sc.y - 6);

          // Room area & height with high contrast
          ctx.font = '600 11px "JetBrains Mono", monospace';
          ctx.fillStyle = isDark ? '#38bdf8' : '#0369a1';
          ctx.fillText(`${r.areaM2.toFixed(1)} m² (h=${(r.height || 2.5).toFixed(2)}m)`, sc.x, sc.y + 8);
        }
      });
    }

    // ==========================================
    // 3. SEAMLESS WALLS (Clean solid mass, mitered joints, visible distinction between 30cm & 11.5cm)
    // ==========================================
    const showWalls = layers.find((l) => l.id === 'walls')?.visible !== false;
    if (showWalls && seamlessWalls.length > 0) {
      // Pass A: Solid Fill of all walls in single pass to eliminate internal seam lines!
      ctx.fillStyle = isDark ? '#27272a' : '#292524';
      seamlessWalls.forEach(({ poly }) => {
        const pts = poly.map(worldToScreen);
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.closePath();
        ctx.fill();
      });

      // Pass A2: Bright Amber luminous fill for all selected walls
      seamlessWalls.forEach(({ wall, poly }) => {
        if (selection.ids.includes(wall.id)) {
          const pts = poly.map(worldToScreen);
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i].x, pts[i].y);
          }
          ctx.closePath();
          ctx.fillStyle = 'rgba(245, 158, 11, 0.45)';
          ctx.fill();
        }
      });

      // Pass B: Stroke outer boundaries and exposed end caps ONLY
      seamlessWalls.forEach(({ wall, poly, hasStartCap, hasEndCap }) => {
        const isSelected = selection.ids.includes(wall.id);
        const isHovered = hoveredObjectId === wall.id;
        const pts = poly.map(worldToScreen);

        ctx.strokeStyle = isSelected
          ? '#ea580c'
          : isHovered
          ? '#f97316'
          : isDark
          ? '#52525b'
          : '#1c1917';

        // Noticeable difference in line weight: Exterior walls (2.4) vs Interior walls (1.3)
        ctx.lineWidth = isSelected ? 3.5 : wall.isExterior ? 2.4 : 1.3;

        // Left edge: pts[0] -> pts[1]
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        ctx.lineTo(pts[1].x, pts[1].y);
        ctx.stroke();

        // Right edge: pts[2] -> pts[3]
        ctx.beginPath();
        ctx.moveTo(pts[2].x, pts[2].y);
        ctx.lineTo(pts[3].x, pts[3].y);
        ctx.stroke();

        // End Cap: pts[1] -> pts[2] (only if not connected to another wall)
        if (hasEndCap) {
          ctx.beginPath();
          ctx.moveTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.stroke();
        }

        // Start Cap: pts[3] -> pts[0] (only if not connected to another wall)
        if (hasStartCap) {
          ctx.beginPath();
          ctx.moveTo(pts[3].x, pts[3].y);
          ctx.lineTo(pts[0].x, pts[0].y);
          ctx.stroke();
        }

        // Sloped wall elevation tag (e.g. h1 = 2.50m -> h2 = 3.50m)
        if (wall.endHeight && Math.abs(wall.endHeight - wall.height) > 0.05) {
          const sMid = worldToScreen({
            x: (wall.start.x + wall.end.x) / 2,
            y: (wall.start.y + wall.end.y) / 2,
          });
          const slopeText = `h: ${wall.height.toFixed(2)}m ↗ ${wall.endHeight.toFixed(2)}m`;
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = isDark ? '#fdba74' : '#c2410c';
          ctx.textAlign = 'center';
          ctx.fillText(slopeText, sMid.x, sMid.y - 12);
        }

        // Endpoint grab handles if selected
        if (isSelected) {
          const s1 = worldToScreen(wall.start);
          const s2 = worldToScreen(wall.end);

          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2.5;
          ctx.fillRect(s1.x - 6, s1.y - 6, 12, 12);
          ctx.strokeRect(s1.x - 6, s1.y - 6, 12, 12);

          ctx.fillRect(s2.x - 6, s2.y - 6, 12, 12);
          ctx.strokeRect(s2.x - 6, s2.y - 6, 12, 12);
        }
      });
    }

    // ==========================================
    // 4. DOORS & WINDOWS (With architectural reveals & jamb lines)
    // ==========================================
    const showOpenings = layers.find((l) => l.id === 'openings')?.visible !== false;
    if (showOpenings) {
      // DOORS
      doors.forEach((d) => {
        const wall = walls.find((w) => w.id === d.wallId);
        if (!wall) return;

        const isSelected = selection.ids.includes(d.id);
        const isHovered = hoveredObjectId === d.id;
        const wLen = distance(wall.start, wall.end);
        if (wLen <= 0) return;

        const halfDoor = d.width / 2;
        const centerM = d.position * wLen;

        const norm = getWallNormal(wall);
        const dx = (wall.end.x - wall.start.x) / wLen;
        const dy = (wall.end.y - wall.start.y) / wLen;

        const pCenter = { x: wall.start.x + dx * centerM, y: wall.start.y + dy * centerM };
        const p1 = { x: pCenter.x - dx * halfDoor, y: pCenter.y - dy * halfDoor };
        const p2 = { x: pCenter.x + dx * halfDoor, y: pCenter.y + dy * halfDoor };

        const sp1 = worldToScreen(p1);
        const sp2 = worldToScreen(p2);

        // Clear opening in wall
        ctx.strokeStyle = isDark ? '#141416' : '#fdfcfb';
        ctx.lineWidth = (wall.thickness || 0.3) * zoom + 1;
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(sp2.x, sp2.y);
        ctx.stroke();

        // Reveal lines (Leibungen) across wall thickness
        const halfWallPx = ((wall.thickness || 0.3) / 2) * zoom;
        const normPx = { x: norm.x * halfWallPx, y: norm.y * halfWallPx };

        ctx.strokeStyle = isDark ? '#71717a' : '#44403c';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sp1.x - normPx.x, sp1.y - normPx.y);
        ctx.lineTo(sp1.x + normPx.x, sp1.y + normPx.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sp2.x - normPx.x, sp2.y - normPx.y);
        ctx.lineTo(sp2.x + normPx.x, sp2.y + normPx.y);
        ctx.stroke();

        // Door leaf & swing arc
        const hinge = d.swingDirection === 'left' ? sp1 : sp2;
        const swingSign = d.openDirection === 'inside' ? 1 : -1;
        const swingRadius = d.width * zoom;

        const wallAngle = Math.atan2(sp2.y - sp1.y, sp2.x - sp1.x);
        const leafAngle =
          wallAngle + (d.swingDirection === 'left' ? -Math.PI / 2 : Math.PI / 2) * swingSign;

        // Leaf line
        ctx.strokeStyle = isSelected ? '#ea580c' : isHovered ? '#f97316' : isDark ? '#d4d4d8' : '#1c1917';
        ctx.lineWidth = isSelected ? 2.6 : 1.6;
        ctx.beginPath();
        ctx.moveTo(hinge.x, hinge.y);
        ctx.lineTo(
          hinge.x + Math.cos(leafAngle) * swingRadius,
          hinge.y + Math.sin(leafAngle) * swingRadius
        );
        ctx.stroke();

        // Swing Arc
        ctx.setLineDash([3, 3]);
        ctx.strokeStyle = isSelected ? '#ea580c' : isDark ? '#71717a' : '#a8a29e';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(
          hinge.x,
          hinge.y,
          swingRadius,
          wallAngle,
          leafAngle,
          d.swingDirection === 'left' ? swingSign === 1 : swingSign === -1
        );
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // WINDOWS
      windows.forEach((win) => {
        const wall = walls.find((w) => w.id === win.wallId);
        if (!wall) return;

        const isSelected = selection.ids.includes(win.id);
        const isHovered = hoveredObjectId === win.id;
        const wLen = distance(wall.start, wall.end);
        if (wLen <= 0) return;

        const halfWin = win.width / 2;
        const centerM = win.position * wLen;

        const norm = getWallNormal(wall);
        const dx = (wall.end.x - wall.start.x) / wLen;
        const dy = (wall.end.y - wall.start.y) / wLen;

        const pCenter = { x: wall.start.x + dx * centerM, y: wall.start.y + dy * centerM };
        const p1 = { x: pCenter.x - dx * halfWin, y: pCenter.y - dy * halfWin };
        const p2 = { x: pCenter.x + dx * halfWin, y: pCenter.y + dy * halfWin };

        const sp1 = worldToScreen(p1);
        const sp2 = worldToScreen(p2);

        // Clear opening
        ctx.strokeStyle = isDark ? '#141416' : '#fdfcfb';
        ctx.lineWidth = (wall.thickness || 0.3) * zoom;
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(sp2.x, sp2.y);
        ctx.stroke();

        // Reveals
        const halfWallPx = ((wall.thickness || 0.3) / 2) * zoom;
        const normPx = { x: norm.x * halfWallPx, y: norm.y * halfWallPx };

        ctx.strokeStyle = isDark ? '#71717a' : '#44403c';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sp1.x - normPx.x, sp1.y - normPx.y);
        ctx.lineTo(sp1.x + normPx.x, sp1.y + normPx.y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(sp2.x - normPx.x, sp2.y - normPx.y);
        ctx.lineTo(sp2.x + normPx.x, sp2.y + normPx.y);
        ctx.stroke();

        // Outer sill
        const normDir = {
          x: -((sp2.y - sp1.y) / Math.hypot(sp2.x - sp1.x, sp2.y - sp1.y)),
          y: (sp2.x - sp1.x) / Math.hypot(sp2.x - sp1.x, sp2.y - sp1.y),
        };

        ctx.strokeStyle = isSelected ? '#ea580c' : isHovered ? '#f97316' : isDark ? '#a1a1aa' : '#57534e';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(sp1.x + normDir.x * (halfWallPx * 0.9), sp1.y + normDir.y * (halfWallPx * 0.9));
        ctx.lineTo(sp2.x + normDir.x * (halfWallPx * 0.9), sp2.y + normDir.y * (halfWallPx * 0.9));
        ctx.stroke();

        // Glass center line
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sp1.x, sp1.y);
        ctx.lineTo(sp2.x, sp2.y);
        ctx.stroke();
      });
    }

    // ==========================================
    // 5. FURNITURE
    // ==========================================
    const showFurniture = layers.find((l) => l.id === 'furniture')?.visible !== false;
    if (showFurniture) {
      furniture.forEach((f) => {
        const isSelected = selection.ids.includes(f.id);
        const isHovered = hoveredObjectId === f.id;
        const center = worldToScreen({ x: f.x, y: f.y });
        const wPx = f.width * zoom;
        const dPx = f.depth * zoom;

        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.rotate((f.rotation * Math.PI) / 180);

        const hasWallCollision = checkFurnitureWallCollision(f, walls);

        ctx.fillStyle = isSelected
          ? 'rgba(234, 88, 12, 0.35)'
          : hasWallCollision
          ? 'rgba(239, 68, 68, 0.15)'
          : isDark
          ? '#27272a'
          : '#f5f5f4';

        ctx.strokeStyle = isSelected
          ? '#ea580c'
          : isHovered
          ? '#f97316'
          : hasWallCollision
          ? '#ef4444'
          : isDark
          ? '#71717a'
          : '#57534e';

        ctx.lineWidth = isSelected ? 3.0 : 1.3;
        ctx.fillRect(-wPx / 2, -dPx / 2, wPx, dPx);
        ctx.strokeRect(-wPx / 2, -dPx / 2, wPx, dPx);

        // Corner grips if selected
        if (isSelected) {
          const corners = [
            { x: -wPx / 2, y: -dPx / 2 },
            { x: wPx / 2, y: -dPx / 2 },
            { x: wPx / 2, y: dPx / 2 },
            { x: -wPx / 2, y: dPx / 2 },
          ];
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#ea580c';
          ctx.lineWidth = 2.0;
          corners.forEach((c) => {
            ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
            ctx.strokeRect(c.x - 4, c.y - 4, 8, 8);
          });
        }

        // Name
        ctx.font = '500 10px "Inter", sans-serif';
        ctx.fillStyle = isDark ? '#a1a1aa' : '#57534e';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(f.name, 0, 0);

        ctx.restore();
      });
    }

    // ==========================================
    // 6. DIMENSIONS
    // ==========================================
    const showDims = layers.find((l) => l.id === 'dimensions')?.visible !== false;
    if (showDims) {
      dimensions.forEach((dim) => {
        const s1 = worldToScreen(dim.start);
        const s2 = worldToScreen(dim.end);
        const dx = s2.x - s1.x;
        const dy = s2.y - s1.y;
        const len = Math.hypot(dx, dy);
        if (len === 0) return;

        const nx = -dy / len;
        const ny = dx / len;
        const offPx = dim.offset * zoom;

        const d1 = { x: s1.x + nx * offPx, y: s1.y + ny * offPx };
        const d2 = { x: s2.x + nx * offPx, y: s2.y + ny * offPx };

        ctx.strokeStyle = isDark ? '#d4d4d8' : '#292524';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(d1.x, d1.y);
        ctx.lineTo(d2.x, d2.y);
        ctx.stroke();

        const label = dim.label || formatDimension(distance(dim.start, dim.end), unit, 2);
        const mid = { x: (d1.x + d2.x) / 2, y: (d1.y + d2.y) / 2 };

        ctx.font = '600 11px "JetBrains Mono", monospace';
        const txtW = ctx.measureText(label).width;
        ctx.fillStyle = isDark ? '#141416' : '#ffffff';
        ctx.fillRect(mid.x - txtW / 2 - 4, mid.y - 8, txtW + 8, 16);

        ctx.fillStyle = isDark ? '#fafaf9' : '#1c1917';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, mid.x, mid.y);
      });
    }

    // ==========================================
    // 7. MULTI-SELECTION BOUNDING BOX
    // ==========================================
    if (selectionBoundingBox && selection.ids.length > 1) {
      const pMin = worldToScreen({ x: selectionBoundingBox.minX, y: selectionBoundingBox.minY });
      const pMax = worldToScreen({ x: selectionBoundingBox.maxX, y: selectionBoundingBox.maxY });
      const bW = pMax.x - pMin.x;
      const bH = pMax.y - pMin.y;

      ctx.fillStyle = 'rgba(245, 158, 11, 0.05)';
      ctx.fillRect(pMin.x - 6, pMin.y - 6, bW + 12, bH + 12);

      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(pMin.x - 6, pMin.y - 6, bW + 12, bH + 12);
      ctx.setLineDash([]);

      // Top badge: "{N} Elemente markiert · Ziehen zum Verschieben"
      const badgeText = `${selection.ids.length} Elemente markiert · Ziehen zum Verschieben`;
      ctx.font = '600 11px "Inter", sans-serif';
      const bTextW = ctx.measureText(badgeText).width;
      const bMidX = (pMin.x + pMax.x) / 2;

      ctx.fillStyle = isDark ? '#1c1917' : '#ffffff';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.2;
      ctx.fillRect(bMidX - bTextW / 2 - 8, pMin.y - 28, bTextW + 16, 20);
      ctx.strokeRect(bMidX - bTextW / 2 - 8, pMin.y - 28, bTextW + 16, 20);

      ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, bMidX, pMin.y - 18);

      const corners = [
        { x: pMin.x - 6, y: pMin.y - 6 },
        { x: pMax.x + 6, y: pMin.y - 6 },
        { x: pMax.x + 6, y: pMax.y + 6 },
        { x: pMin.x - 6, y: pMax.y + 6 },
      ];
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2.0;
      corners.forEach((c) => {
        ctx.fillRect(c.x - 4, c.y - 4, 8, 8);
        ctx.strokeRect(c.x - 4, c.y - 4, 8, 8);
      });
    }

    // ==========================================
    // 8. MARQUEE SELECTION (Window & Crossing)
    // ==========================================
    if (marquee) {
      const p1 = worldToScreen(marquee.start);
      const p2 = worldToScreen(marquee.current);
      const mx = Math.min(p1.x, p2.x);
      const my = Math.min(p1.y, p2.y);
      const mw = Math.abs(p2.x - p1.x);
      const mh = Math.abs(p2.y - p1.y);

      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([5, 4]);
      ctx.strokeRect(mx, my, mw, mh);
      ctx.setLineDash([]);

      // Live hint badge next to marquee cursor
      if (mw > 20 || mh > 20) {
        const minWorldX = Math.min(marquee.start.x, marquee.current.x);
        const maxWorldX = Math.max(marquee.start.x, marquee.current.x);
        const minWorldY = Math.min(marquee.start.y, marquee.current.y);
        const maxWorldY = Math.max(marquee.start.y, marquee.current.y);
        const box: BoundingBox2D = { minX: minWorldX, minY: minWorldY, maxX: maxWorldX, maxY: maxWorldY };

        const wallMatches = walls.filter((w) => {
          const wBox = getWallBoundingBox(w);
          return aabbIntersects(box, wBox) || isPointInAABB(w.start, box) || isPointInAABB(w.end, box);
        }).length;
        const furnMatches = furniture.filter((f) => {
          return isPointInAABB({ x: f.x, y: f.y }, box);
        }).length;
        const totalMatches = wallMatches + furnMatches;

        if (totalMatches > 0) {
          const hint = `${totalMatches} markiert`;
          ctx.font = '600 10px "Inter", sans-serif';
          ctx.fillStyle = isDark ? '#1c1917' : '#ffffff';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.fillRect(p2.x + 8, p2.y + 8, 70, 18);
          ctx.strokeRect(p2.x + 8, p2.y + 8, 70, 18);
          ctx.fillStyle = isDark ? '#fbbf24' : '#b45309';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(hint, p2.x + 43, p2.y + 17);
        }
      }
    }

    // ==========================================
    // 9. ACTIVE DRAWING PREVIEWS
    // ==========================================
    // A. Wall drawing
    if (activeTool === 'wall' && wallStartPoint && currentCursorWorld) {
      const sStart = worldToScreen(wallStartPoint);
      const sEnd = worldToScreen(currentCursorWorld);
      const len = distance(wallStartPoint, currentCursorWorld);

      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = currentWallThickness * zoom;
      ctx.beginPath();
      ctx.moveTo(sStart.x, sStart.y);
      ctx.lineTo(sEnd.x, sEnd.y);
      ctx.stroke();

      const mid = { x: (sStart.x + sEnd.x) / 2, y: (sStart.y + sEnd.y) / 2 };
      const lenStr = formatDimension(len, unit, 2);
      const angle = angleDeg(wallStartPoint, currentCursorWorld);
      const wallTag = wallMode === 'exterior' ? 'Außen 30cm' : 'Innen 11.5cm';

      ctx.font = '600 12px "JetBrains Mono", monospace';
      const labelText = `${lenStr} · ${angle.toFixed(0)}° (${wallTag})`;
      const bWidth = ctx.measureText(labelText).width + 16;

      ctx.fillStyle = '#1c1917';
      ctx.fillRect(mid.x - bWidth / 2, mid.y - 28, bWidth, 24);
      ctx.strokeStyle = '#ea580c';
      ctx.strokeRect(mid.x - bWidth / 2, mid.y - 28, bWidth, 24);
      ctx.fillStyle = '#fdba74';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, mid.x, mid.y - 16);
    }

    // B. Rect Room drawing
    if (activeTool === 'rect_room' && rectRoomStart && currentCursorWorld) {
      const p1 = worldToScreen(rectRoomStart);
      const p2 = worldToScreen(currentCursorWorld);
      const rx = Math.min(p1.x, p2.x);
      const ry = Math.min(p1.y, p2.y);
      const rw = Math.abs(p2.x - p1.x);
      const rh = Math.abs(p2.y - p1.y);

      ctx.fillStyle = 'rgba(234, 88, 12, 0.08)';
      ctx.fillRect(rx, ry, rw, rh);
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(rx, ry, rw, rh);
      ctx.setLineDash([]);

      const wM = Math.abs(currentCursorWorld.x - rectRoomStart.x);
      const dM = Math.abs(currentCursorWorld.y - rectRoomStart.y);
      const areaM2 = wM * dM;

      ctx.font = '600 12px "JetBrains Mono", monospace';
      const badgeText = `${formatDimension(wM, unit, 2)} × ${formatDimension(dM, unit, 2)} (${areaM2.toFixed(1)} m²)`;
      ctx.fillStyle = '#1c1917';
      const bW = ctx.measureText(badgeText).width + 20;
      ctx.fillRect(rx + rw / 2 - bW / 2, ry + rh / 2 - 14, bW, 28);
      ctx.strokeStyle = '#ea580c';
      ctx.strokeRect(rx + rw / 2 - bW / 2, ry + rh / 2 - 14, bW, 28);
      ctx.fillStyle = '#fdba74';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(badgeText, rx + rw / 2, ry + rh / 2);
    }

    // ==========================================
    // 10. INTELLIGENT RELATIONSHIP GUIDELINES & ADVANCED MAGNETIC SNAP
    // ==========================================
    if (smartSnap && smartSnap.snapped) {
      const sp = worldToScreen(smartSnap.point);

      // A. Matched Wall Highlights (Luminous accent glow)
      if (smartSnap.matchedWallIds && smartSnap.matchedWallIds.length > 0) {
        smartSnap.matchedWallIds.forEach((mwId) => {
          const mw = walls.find((w) => w.id === mwId);
          if (mw) {
            const pA = worldToScreen(mw.start);
            const pB = worldToScreen(mw.end);
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = Math.max(4, (mw.thickness || 0.3) * zoom + 5);
            ctx.globalAlpha = 0.28;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(pA.x, pA.y);
            ctx.lineTo(pB.x, pB.y);
            ctx.stroke();
            ctx.restore();
          }
        });
      }

      // B. Active Relationship Guidelines (Parallel, Perpendicular, Equal Length, Extension, Alignment, Offset)
      if (smartSnap.guideLines && smartSnap.guideLines.length > 0) {
        smartSnap.guideLines.forEach((gl) => {
          const p1 = worldToScreen(gl.p1);
          const p2 = worldToScreen(gl.p2);

          ctx.save();
          ctx.strokeStyle = gl.color || '#3b82f6';
          ctx.lineWidth = 1.6;
          ctx.setLineDash(gl.dash || [6, 4]);

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // 1. Parallel (//) Guideline Badge
          if (gl.type === 'parallel') {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.font = '700 11px "Inter", sans-serif';
            const bText = '// Parallel';
            const bW = ctx.measureText(bText).width + 14;
            ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 1.3;
            ctx.fillRect(midX - bW / 2, midY - 20, bW, 20);
            ctx.strokeRect(midX - bW / 2, midY - 20, bW, 20);
            ctx.fillStyle = '#2563eb';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(bText, midX, midY - 10);
          }

          // 2. Perpendicular (⟂ / 90°) Corner Marker
          if (gl.type === 'perpendicular') {
            const dx = p1.x - p2.x;
            const dy = p1.y - p2.y;
            const len = Math.hypot(dx, dy) || 1;
            const uX = dx / len;
            const uY = dy / len;
            const nX = -uY;
            const nY = uX;
            const sqSize = 11;
            ctx.strokeStyle = '#16a34a';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(p2.x + uX * sqSize, p2.y + uY * sqSize);
            ctx.lineTo(p2.x + uX * sqSize + nX * sqSize, p2.y + uY * sqSize + nY * sqSize);
            ctx.lineTo(p2.x + nX * sqSize, p2.y + nY * sqSize);
            ctx.stroke();
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.arc(p2.x + (uX + nX) * (sqSize / 2), p2.y + (uY + nY) * (sqSize / 2), 1.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // 3. Equal Length (=) Tick Marks and Dimension equality badge
          if (gl.type === 'equal_length') {
            if (gl.tickMarks && gl.tickMarks.length >= 2) {
              gl.tickMarks.forEach((tm) => {
                const scTm = worldToScreen(tm);
                ctx.strokeStyle = '#ea580c';
                ctx.lineWidth = 2.2;
                ctx.beginPath();
                ctx.moveTo(scTm.x - 3, scTm.y - 7);
                ctx.lineTo(scTm.x - 3, scTm.y + 7);
                ctx.moveTo(scTm.x + 3, scTm.y - 7);
                ctx.lineTo(scTm.x + 3, scTm.y + 7);
                ctx.stroke();
              });
            }
            if (gl.label) {
              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2;
              ctx.font = '700 11px "JetBrains Mono", monospace';
              const bW = ctx.measureText(gl.label).width + 16;
              ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
              ctx.strokeStyle = '#ea580c';
              ctx.lineWidth = 1.5;
              ctx.fillRect(midX - bW / 2, midY - 24, bW, 22);
              ctx.strokeRect(midX - bW / 2, midY - 24, bW, 22);
              ctx.fillStyle = '#ea580c';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText(gl.label, midX, midY - 13);
            }
          }

          // 4. Offset Guideline Badge
          if (gl.type === 'offset' && gl.label) {
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;
            ctx.font = '600 10px "Inter", sans-serif';
            const bW = ctx.measureText(gl.label).width + 12;
            ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
            ctx.strokeStyle = '#d97706';
            ctx.lineWidth = 1;
            ctx.fillRect(midX - bW / 2, midY - 18, bW, 18);
            ctx.strokeRect(midX - bW / 2, midY - 18, bW, 18);
            ctx.fillStyle = '#d97706';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(gl.label, midX, midY - 9);
          }

          ctx.restore();
        });
      }

      // C. Snap Point Geometric Glyphs
      ctx.save();
      ctx.lineWidth = 2;

      switch (smartSnap.type) {
        case 'endpoint':
          ctx.strokeStyle = '#10b981';
          ctx.strokeRect(sp.x - 6, sp.y - 6, 12, 12);
          break;
        case 'midpoint':
          ctx.strokeStyle = '#ea580c';
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y - 7);
          ctx.lineTo(sp.x + 7, sp.y + 5);
          ctx.lineTo(sp.x - 7, sp.y + 5);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'intersection':
        case 'extension_intersection':
          ctx.strokeStyle = '#0284c7';
          ctx.beginPath();
          ctx.moveTo(sp.x - 7, sp.y - 7);
          ctx.lineTo(sp.x + 7, sp.y + 7);
          ctx.moveTo(sp.x + 7, sp.y - 7);
          ctx.lineTo(sp.x - 7, sp.y + 7);
          ctx.stroke();
          break;
        case 'lot':
          ctx.strokeStyle = '#16a34a';
          ctx.beginPath();
          ctx.moveTo(sp.x - 6, sp.y + 6);
          ctx.lineTo(sp.x + 6, sp.y + 6);
          ctx.moveTo(sp.x, sp.y + 6);
          ctx.lineTo(sp.x, sp.y - 6);
          ctx.stroke();
          break;
        case 'edge':
          ctx.strokeStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(sp.x, sp.y - 6);
          ctx.lineTo(sp.x + 6, sp.y);
          ctx.lineTo(sp.x, sp.y + 6);
          ctx.lineTo(sp.x - 6, sp.y);
          ctx.closePath();
          ctx.stroke();
          break;
        case 'division':
          ctx.strokeStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#a855f7';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'extension':
          ctx.strokeStyle = '#0284c7';
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
          break;
        case 'room_corner':
        case 'plot_vertex':
          ctx.strokeStyle = '#ec4899';
          ctx.strokeRect(sp.x - 5, sp.y - 5, 10, 10);
          break;
        case 'door_center':
        case 'window_center':
        case 'furniture_axis':
          ctx.strokeStyle = '#8b5cf6';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case 'grid':
          ctx.fillStyle = '#78716c';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 3, 0, Math.PI * 2);
          ctx.fill();
          break;
        default:
          ctx.strokeStyle = '#3b82f6';
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 5, 0, Math.PI * 2);
          ctx.stroke();
          break;
      }

      // D. Floating Smart Snap Info Badge
      if (smartSnap.label) {
        ctx.font = '600 11px "Inter", sans-serif';
        let badgeLabel = smartSnap.label;
        if (smartSnap.candidatesCount && smartSnap.candidatesCount > 1) {
          badgeLabel += ` [Tab: ${(smartSnap.activeCandidateIndex || 0) + 1}/${smartSnap.candidatesCount}]`;
        }

        const textW = ctx.measureText(badgeLabel).width;
        const bW = textW + 16;
        const bH = 22;
        const bX = sp.x + 12;
        const bY = sp.y - 24;

        ctx.shadowColor = isDark ? 'rgba(0, 0, 0, 0.6)' : 'rgba(0, 0, 0, 0.18)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;

        ctx.fillStyle = isDark ? '#0f172a' : '#ffffff';
        ctx.strokeStyle = isDark ? '#334155' : '#cbd5e1';
        ctx.lineWidth = 1;
        if (typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(bX, bY, bW, bH, 5);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillRect(bX, bY, bW, bH);
          ctx.strokeRect(bX, bY, bW, bH);
        }

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeLabel, bX + 8, bY + bH / 2);
      }
      ctx.restore();
    }

    // Split Tool Preview (Schere / Wand trennen)
    if (activeTool === 'split' && currentCursorWorld) {
      const nearWall = findWallNearPoint(currentCursorWorld, 0.4);
      if (nearWall) {
        const pSc = worldToScreen(nearWall.proj);
        const norm = getWallNormal(nearWall.wall);
        const cutLen = Math.max(16, (nearWall.wall.thickness || 0.3) * zoom * 1.5);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 2]);
        ctx.beginPath();
        ctx.moveTo(pSc.x - norm.x * (cutLen / 2), pSc.y - norm.y * (cutLen / 2));
        ctx.lineTo(pSc.x + norm.x * (cutLen / 2), pSc.y + norm.y * (cutLen / 2));
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(pSc.x, pSc.y, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '600 11px "Inter", sans-serif';
        ctx.fillStyle = isDark ? '#ffffff' : '#0f172a';
        ctx.textAlign = 'center';
        ctx.fillText('Hier trennen (Klick)', pSc.x, pSc.y - 14);
      }
    }

    // ==========================================
    // 11. HORIZONTAL & VERTICAL RULERS (X- & Y-ACHSEN MAßSTAB IN METERN)
    // ==========================================
    const RULER_THICKNESS_X = 26; // Height of top ruler
    const RULER_THICKNESS_Y = 34; // Width of left ruler

    let majorStep = 1; // in meters
    let mediumStep = 0.5;
    let minorStep = 0.1;

    if (zoom >= 110) {
      majorStep = 1;
      mediumStep = 0.5;
      minorStep = 0.1;
    } else if (zoom >= 50) {
      majorStep = 1;
      mediumStep = 0.5;
      minorStep = 0.25;
    } else if (zoom >= 25) {
      majorStep = 2;
      mediumStep = 1;
      minorStep = 0.5;
    } else if (zoom >= 12) {
      majorStep = 5;
      mediumStep = 2.5;
      minorStep = 1;
    } else {
      majorStep = 10;
      mediumStep = 5;
      minorStep = 2.5;
    }

    // A. TOP HORIZONTAL RULER (X-Achse in Metern - Beginnt strikt bei 0 m)
    ctx.fillStyle = isDark ? '#18181b' : '#f8fafc';
    ctx.fillRect(0, 0, width, RULER_THICKNESS_X);

    // Negative X zone shading on ruler (left of origin 0 m)
    if (originX > RULER_THICKNESS_Y) {
      ctx.fillStyle = isDark ? '#141416' : '#f1f5f9';
      ctx.fillRect(RULER_THICKNESS_Y, 0, originX - RULER_THICKNESS_Y, RULER_THICKNESS_X);
    }

    ctx.strokeStyle = isDark ? '#3f3f46' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, RULER_THICKNESS_X - 0.5);
    ctx.lineTo(width, RULER_THICKNESS_X - 0.5);
    ctx.stroke();

    const minWorldX = (RULER_THICKNESS_Y - panOffset.x) / zoom;
    const maxWorldX = (width - panOffset.x) / zoom;
    // START STRICTLY AT 0! NO NEGATIVE NUMBERS!
    const startMinorX = Math.max(0, Math.floor(minWorldX / minorStep) * minorStep);
    const endMinorX = Math.max(0, Math.ceil(maxWorldX / minorStep) * minorStep);

    ctx.font = '600 10px "JetBrains Mono", monospace';
    for (let wx = startMinorX; wx <= endMinorX; wx += minorStep) {
      if (wx < 0) continue; // KEINE NEGATIVEN WERTE
      const sx = Math.round(wx * zoom + panOffset.x) + 0.5;
      if (sx < RULER_THICKNESS_Y || sx > width) continue;

      const isMajor = Math.abs(wx % majorStep) < 0.001 || Math.abs(Math.abs(wx % majorStep) - majorStep) < 0.001;
      const isMedium = !isMajor && (Math.abs(wx % mediumStep) < 0.001 || Math.abs(Math.abs(wx % mediumStep) - mediumStep) < 0.001);

      if (isMajor) {
        const isZero = Math.abs(wx) < 0.001;
        ctx.strokeStyle = isZero ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#a1a1aa' : '#475569');
        ctx.lineWidth = isZero ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(sx, RULER_THICKNESS_X - 12);
        ctx.lineTo(sx, RULER_THICKNESS_X);
        ctx.stroke();

        const roundedM = Math.round(wx * 10) / 10;
        const label = `${roundedM} m`;
        ctx.fillStyle = isZero ? (isDark ? '#38bdf8' : '#0284c7') : (isDark ? '#f4f4f5' : '#1e293b');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(label, sx, 3);
      } else if (isMedium) {
        ctx.strokeStyle = isDark ? '#71717a' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, RULER_THICKNESS_X - 7);
        ctx.lineTo(sx, RULER_THICKNESS_X);
        ctx.stroke();
      } else {
        ctx.strokeStyle = isDark ? '#52525b' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(sx, RULER_THICKNESS_X - 4);
        ctx.lineTo(sx, RULER_THICKNESS_X);
        ctx.stroke();
      }
    }

    // B. LEFT VERTICAL RULER (Y-Achse in Metern - Beginnt strikt bei 0 m)
    ctx.fillStyle = isDark ? '#18181b' : '#f8fafc';
    ctx.fillRect(0, 0, RULER_THICKNESS_Y, height);

    // Negative Y zone shading on ruler (above origin 0 m)
    if (originY > RULER_THICKNESS_X) {
      ctx.fillStyle = isDark ? '#141416' : '#f1f5f9';
      ctx.fillRect(0, RULER_THICKNESS_X, RULER_THICKNESS_Y, originY - RULER_THICKNESS_X);
    }

    ctx.strokeStyle = isDark ? '#3f3f46' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(RULER_THICKNESS_Y - 0.5, 0);
    ctx.lineTo(RULER_THICKNESS_Y - 0.5, height);
    ctx.stroke();

    const minWorldY = (RULER_THICKNESS_X - panOffset.y) / zoom;
    const maxWorldY = (height - panOffset.y) / zoom;
    // START STRICTLY AT 0! NO NEGATIVE NUMBERS!
    const startMinorY = Math.max(0, Math.floor(minWorldY / minorStep) * minorStep);
    const endMinorY = Math.max(0, Math.ceil(maxWorldY / minorStep) * minorStep);

    ctx.font = '600 9px "JetBrains Mono", monospace';
    for (let wy = startMinorY; wy <= endMinorY; wy += minorStep) {
      if (wy < 0) continue; // KEINE NEGATIVEN WERTE
      const sy = Math.round(wy * zoom + panOffset.y) + 0.5;
      if (sy < RULER_THICKNESS_X || sy > height) continue;

      const isMajor = Math.abs(wy % majorStep) < 0.001 || Math.abs(Math.abs(wy % majorStep) - majorStep) < 0.001;
      const isMedium = !isMajor && (Math.abs(wy % mediumStep) < 0.001 || Math.abs(Math.abs(wy % mediumStep) - mediumStep) < 0.001);

      if (isMajor) {
        const isZero = Math.abs(wy) < 0.001;
        ctx.strokeStyle = isZero ? (isDark ? '#f43f5e' : '#e11d48') : (isDark ? '#a1a1aa' : '#475569');
        ctx.lineWidth = isZero ? 2.2 : 1.2;
        ctx.beginPath();
        ctx.moveTo(RULER_THICKNESS_Y - 12, sy);
        ctx.lineTo(RULER_THICKNESS_Y, sy);
        ctx.stroke();

        const roundedM = Math.round(wy * 10) / 10;
        const label = `${roundedM} m`;
        ctx.fillStyle = isZero ? (isDark ? '#f43f5e' : '#e11d48') : (isDark ? '#f4f4f5' : '#1e293b');
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, RULER_THICKNESS_Y - 14, sy);
      } else if (isMedium) {
        ctx.strokeStyle = isDark ? '#71717a' : '#94a3b8';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(RULER_THICKNESS_Y - 7, sy);
        ctx.lineTo(RULER_THICKNESS_Y, sy);
        ctx.stroke();
      } else {
        ctx.strokeStyle = isDark ? '#52525b' : '#cbd5e1';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(RULER_THICKNESS_Y - 4, sy);
        ctx.lineTo(RULER_THICKNESS_Y, sy);
        ctx.stroke();
      }
    }

    // C. TOP-LEFT CORNER BOX (Nullpunkt-Taste & Einheitsindikator "m")
    ctx.fillStyle = isDark ? '#27272a' : '#e2e8f0';
    ctx.fillRect(0, 0, RULER_THICKNESS_Y, RULER_THICKNESS_X);
    ctx.strokeStyle = isDark ? '#3f3f46' : '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, RULER_THICKNESS_Y - 1, RULER_THICKNESS_X - 1);

    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillStyle = isDark ? '#f59e0b' : '#d97706';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('0,0', RULER_THICKNESS_Y / 2, RULER_THICKNESS_X / 2);

    // D. DYNAMIC CURSOR INDICATORS ON RULERS (Nur für positive Werte)
    if (currentCursorWorld && currentCursorWorld.x >= 0 && currentCursorWorld.y >= 0) {
      const curScreenX = Math.round(currentCursorWorld.x * zoom + panOffset.x);
      const curScreenY = Math.round(currentCursorWorld.y * zoom + panOffset.y);

      // Top Ruler Indicator
      if (curScreenX >= RULER_THICKNESS_Y && curScreenX <= width) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(curScreenX - 4, 0);
        ctx.lineTo(curScreenX + 4, 0);
        ctx.lineTo(curScreenX, 6);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(curScreenX, 6);
        ctx.lineTo(curScreenX, RULER_THICKNESS_X);
        ctx.stroke();
      }

      // Left Ruler Indicator
      if (curScreenY >= RULER_THICKNESS_X && curScreenY <= height) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(0, curScreenY - 4);
        ctx.lineTo(0, curScreenY + 4);
        ctx.lineTo(6, curScreenY);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(6, curScreenY);
        ctx.lineTo(RULER_THICKNESS_Y, curScreenY);
        ctx.stroke();
      }
    }

    // ==========================================
    // 12. ARCHITECTURAL SCALE BAR (MAßSTABSBALKEN)
    // ==========================================
    const scaleBarMeters = zoom >= 70 ? 1 : zoom >= 30 ? 2 : zoom >= 15 ? 5 : 10;
    const scaleBarPx = scaleBarMeters * zoom;
    const sbX = width - scaleBarPx - 20;
    const sbY = height - 34;

    if (sbX > RULER_THICKNESS_Y + 100 && sbY > RULER_THICKNESS_X + 40) {
      const cardW = scaleBarPx + 20;
      const cardH = 34;
      ctx.fillStyle = isDark ? 'rgba(24, 24, 27, 0.88)' : 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(sbX - 10, sbY - 14, cardW, cardH);
      ctx.strokeStyle = isDark ? '#3f3f46' : '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect(sbX - 10, sbY - 14, cardW, cardH);

      ctx.font = '600 9.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#f4f4f5' : '#1e293b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Maßstab: ${scaleBarMeters} m`, sbX, sbY - 2);

      const segments = 2;
      const segW = scaleBarPx / segments;
      for (let s = 0; s < segments; s++) {
        ctx.fillStyle = s % 2 === 0 ? (isDark ? '#f4f4f5' : '#18181b') : (isDark ? '#71717a' : '#ffffff');
        ctx.fillRect(sbX + s * segW, sbY, segW, 6);
        ctx.strokeStyle = isDark ? '#a1a1aa' : '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(sbX + s * segW, sbY, segW, 6);
      }

      ctx.font = '500 8.5px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#a1a1aa' : '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('0', sbX, sbY + 8);
      ctx.fillText(`${(scaleBarMeters / 2).toFixed(1)}m`, sbX + segW, sbY + 8);
      ctx.fillText(`${scaleBarMeters}m`, sbX + scaleBarPx, sbY + 8);
    }
  }, [
    walls,
    doors,
    windows,
    rooms,
    furniture,
    dimensions,
    layers,
    activeTool,
    selection,
    selectionBoundingBox,
    seamlessWalls,
    marquee,
    hoveredObjectId,
    snapSettings,
    zoom,
    panOffset,
    wallStartPoint,
    currentCursorWorld,
    rectRoomStart,
    plotDrawPoints,
    wallMode,
    currentWallThickness,
    snapIndicator,
    unit,
    plot,
    isDark,
    worldToScreen,
  ]);

  // ==========================================
  // EVENT HANDLERS
  // ==========================================

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Multi-touch pinch-to-zoom & two-finger pan for tablets
    if (activePointersRef.current.size >= 2) {
      const pts = Array.from(activePointersRef.current.values());
      const p1 = pts[0];
      const p2 = pts[1];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const center = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      pinchStateRef.current = {
        initialDist: dist,
        initialZoom: zoom,
        initialPan: { ...panOffset },
        initialCenter: center,
      };
      setIsPanning(false);
      setIsDraggingSelection(false);
      setMarquee(null);
      setDraggingHandle(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Top-Left Corner Box (0,0 button): Center origin on screen!
    if (screenPt.x <= 34 && screenPt.y <= 26) {
      onPanOffsetChange({ x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 });
      return;
    }

    // Clicking on Rulers: Pan view instead of accidental drawing behind rulers
    if (screenPt.x < 34 || screenPt.y < 26) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const rawWorld = screenToWorld(screenPt);

    // Pan with middle click, Space, or Hand tool
    if (e.button === 1 || activeTool === 'hand' || e.buttons === 4) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    const extraSnapCtx = {
      doors,
      windows,
      furniture,
      rooms,
      plot,
      candidateIndex: snapCandidateIndex,
      isAltPressed: e.altKey || isAltDown,
      isAngleLocked: e.shiftKey || isShiftDown,
      ignoredIds: [],
      currentTool: activeTool,
    };
    const snap = calculateSnap(rawWorld, wallStartPoint, walls, snapSettings, zoom, extraSnapCtx);
    const targetPt = snap.point;

    setPointerDownPos(targetPt);
    setIsPointerDown(true);

    // TOOL: PLOT BOUNDARY LINE DRAWING (Linien ziehen um Grundstücksgrenzen festzulegen)
    if (activeTool === 'plot') {
      if (plotDrawPoints.length === 0) {
        setPlotDrawPoints([targetPt]);
      } else {
        // Check if clicking near start point to close the boundary polygon!
        if (plotDrawPoints.length >= 3 && distance(targetPt, plotDrawPoints[0]) <= 0.45) {
          const finalPolygon = [...plotDrawPoints];
          if (onUpdatePlot) {
            onUpdatePlot({
              enabled: true,
              x: Math.min(...finalPolygon.map((p) => p.x)),
              y: Math.min(...finalPolygon.map((p) => p.y)),
              width: Math.round((Math.max(...finalPolygon.map((p) => p.x)) - Math.min(...finalPolygon.map((p) => p.x))) * 10) / 10,
              depth: Math.round((Math.max(...finalPolygon.map((p) => p.y)) - Math.min(...finalPolygon.map((p) => p.y))) * 10) / 10,
              points: finalPolygon,
              setback: plot?.setback || 3.0,
              maxGRZ: plot?.maxGRZ || 0.40,
              maxGFZ: plot?.maxGFZ || 0.80,
              groundElevation: plot?.groundElevation || 0.30,
            });
          }
          setPlotDrawPoints([]);
          return;
        }

        const lastPt = plotDrawPoints[plotDrawPoints.length - 1];
        if (distance(lastPt, targetPt) >= 0.3) {
          setPlotDrawPoints((prev) => [...prev, targetPt]);
        }
      }
      return;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    // TOOL: SPLIT (Wand trennen an geklickter Position)
    if (activeTool === 'split') {
      const nearWall = findWallNearPoint(rawWorld, Math.max(0.4, 25 / zoom));
      if (nearWall && onSplitWall) {
        onSplitWall(nearWall.wall.id, nearWall.proj);
      }
      return;
    }

    // TOOL: ERASER (Radiert / Löscht das angeklickte Element mit einem Klick)
    if (activeTool === 'eraser') {
      // 1. Doors & Windows first
      const nearDoor = doors.find((d) => {
        const w = walls.find((wall) => wall.id === d.wallId);
        if (!w) return false;
        const { point } = projectPointOntoWall(rawWorld, w);
        return distance(rawWorld, point) < Math.max(0.42, 22 / zoom);
      });
      if (nearDoor) {
        if (onDeleteSelected) onDeleteSelected([nearDoor.id]);
        return;
      }

      const nearWin = windows.find((win) => {
        const w = walls.find((wall) => wall.id === win.wallId);
        if (!w) return false;
        const { point } = projectPointOntoWall(rawWorld, w);
        return distance(rawWorld, point) < Math.max(0.42, 22 / zoom);
      });
      if (nearWin) {
        if (onDeleteSelected) onDeleteSelected([nearWin.id]);
        return;
      }

      // 2. Furniture
      const clickedFurn = furniture.find(
        (f) =>
          Math.abs(rawWorld.x - f.x) <= f.width / 2 + Math.max(0.2, 14 / zoom) &&
          Math.abs(rawWorld.y - f.y) <= f.depth / 2 + Math.max(0.2, 14 / zoom)
      );
      if (clickedFurn) {
        if (onDeleteSelected) onDeleteSelected([clickedFurn.id]);
        return;
      }

      // 3. Walls (Smart segment trimming if intersected by cross walls, else deletes entire wall)
      const nearWall = findWallNearPoint(rawWorld, Math.max(0.35, 20 / zoom));
      if (nearWall) {
        const wall = nearWall.wall;
        const pts: { t: number; pt: Point2D }[] = [];
        const wallVec = { x: wall.end.x - wall.start.x, y: wall.end.y - wall.start.y };
        const wallLenSq = wallVec.x * wallVec.x + wallVec.y * wallVec.y;

        if (wallLenSq > 0.001) {
          walls.forEach((otherW) => {
            if (otherW.id === wall.id) return;
            const inter = lineIntersection(wall.start, wall.end, otherW.start, otherW.end);
            if (inter) {
              const t = ((inter.x - wall.start.x) * wallVec.x + (inter.y - wall.start.y) * wallVec.y) / wallLenSq;
              if (t > 0.04 && t < 0.96) {
                pts.push({ t, pt: inter });
              }
            }
          });
        }

        if (pts.length > 0) {
          pts.sort((a, b) => a.t - b.t);
          const uniqueSplitPoints = pts.filter((p, i, arr) => i === 0 || p.t - arr[i - 1].t > 0.04);

          if (uniqueSplitPoints.length > 0) {
            const clickT = Math.max(0, Math.min(1, nearWall.ratio));
            const segments: { startT: number; endT: number; startPt: Point2D; endPt: Point2D }[] = [];

            let curT = 0;
            let curPt = wall.start;
            for (const sp of uniqueSplitPoints) {
              segments.push({ startT: curT, endT: sp.t, startPt: curPt, endPt: sp.pt });
              curT = sp.t;
              curPt = sp.pt;
            }
            segments.push({ startT: curT, endT: 1, startPt: curPt, endPt: wall.end });

            const clickedSegIdx = segments.findIndex((seg) => clickT >= seg.startT && clickT <= seg.endT);
            if (clickedSegIdx !== -1) {
              const remainingSegments = segments.filter((_, idx) => idx !== clickedSegIdx);
              if (remainingSegments.length > 0) {
                const firstSeg = remainingSegments[0];
                onUpdateWall({
                  ...wall,
                  start: firstSeg.startPt,
                  end: firstSeg.endPt,
                });
                for (let i = 1; i < remainingSegments.length; i++) {
                  const seg = remainingSegments[i];
                  onAddWall({
                    ...wall,
                    id: 'w_' + Date.now() + Math.random().toString(36).substr(2, 4) + '_' + i,
                    start: seg.startPt,
                    end: seg.endPt,
                  });
                }
                return;
              }
            }
          }
        }

        if (onDeleteSelected) onDeleteSelected([nearWall.wall.id]);
        return;
      }

      // 4. Dimension lines
      const nearDim = dimensions.find((d) => {
        const { dist } = projectPointOntoWall(rawWorld, { start: d.start, end: d.end } as Wall);
        return dist < Math.max(0.4, 20 / zoom);
      });
      if (nearDim) {
        if (onDeleteSelected) onDeleteSelected([nearDim.id]);
        return;
      }

      // 5. Rooms
      const clickedRoom = rooms.find((rm) => rm.polygon.length >= 3 && isPointInPolygon(rawWorld, rm.polygon));
      if (clickedRoom) {
        if (onDeleteSelected) onDeleteSelected([clickedRoom.id]);
        return;
      }

      // 6. Stairs
      const clickedStair = stairs.find((st) => {
        return (
          Math.abs(rawWorld.x - st.x) <= (st.width || 1.0) / 2 + 0.3 &&
          Math.abs(rawWorld.y - st.y) <= (st.length || 3.0) / 2 + 0.3
        );
      });
      if (clickedStair) {
        if (onDeleteSelected) onDeleteSelected([clickedStair.id]);
        return;
      }

      // 7. Plot
      if (plot && plot.enabled) {
        const plotHit = findPlotHit(rawWorld);
        if (plotHit) {
          if (onDeleteSelected) onDeleteSelected(['plot']);
          return;
        }
      }
      return;
    }

    // TOOL: SELECT / LASSO
    if (activeTool === 'select' || activeTool === 'lasso') {
      // 1. Check if clicking on existing single selected wall handles
      if (selection.ids.length === 1 && selection.type === 'wall') {
        const selWall = walls.find((w) => w.id === selection.ids[0]);
        if (selWall) {
          const handleTol = Math.max(0.35, 20 / zoom);
          if (distance(rawWorld, selWall.start) < handleTol) {
            setDraggingHandle({ wallId: selWall.id, handle: 'start', origPoint: selWall.start });
            return;
          }
          if (distance(rawWorld, selWall.end) < handleTol) {
            setDraggingHandle({ wallId: selWall.id, handle: 'end', origPoint: selWall.end });
            return;
          }
        }
      }

      // 2. Check clicking on an already-selected element -> start multi-drag!
      const clickedSelectedWall = walls.some(
        (w) => selection.ids.includes(w.id) && findWallNearPoint(rawWorld, Math.max(0.35, 20 / zoom))?.wall.id === w.id
      );
      const clickedSelectedFurn = furniture.some(
        (f) =>
          selection.ids.includes(f.id) &&
          Math.abs(rawWorld.x - f.x) <= f.width / 2 + Math.max(0.2, 14 / zoom) &&
          Math.abs(rawWorld.y - f.y) <= f.depth / 2 + Math.max(0.2, 14 / zoom)
      );
      const clickedSelectedDoor = doors.some((d) => {
        if (!selection.ids.includes(d.id)) return false;
        const w = walls.find((wall) => wall.id === d.wallId);
        if (!w) return false;
        const { point } = projectPointOntoWall(rawWorld, w);
        return distance(rawWorld, point) < Math.max(0.4, 22 / zoom);
      });
      const clickedSelectedWin = windows.some((win) => {
        if (!selection.ids.includes(win.id)) return false;
        const w = walls.find((wall) => wall.id === win.wallId);
        if (!w) return false;
        const { point } = projectPointOntoWall(rawWorld, w);
        return distance(rawWorld, point) < Math.max(0.4, 22 / zoom);
      });
      const clickedSelectedRoom = rooms.some(
        (rm) => selection.ids.includes(rm.id) && rm.polygon.length >= 3 && isPointInPolygon(rawWorld, rm.polygon)
      );

      if (
        selection.ids.length > 0 &&
        (clickedSelectedWall || clickedSelectedFurn || clickedSelectedDoor || clickedSelectedWin || clickedSelectedRoom)
      ) {
        draggedIdsRef.current = selection.ids;
        setIsDraggingSelection(true);
        setDragSelectionStart(rawWorld);
        return;
      }

      // 3. Doors & Windows FIRST (since they sit directly on walls)
      const nearDoor = doors.find((d) => {
        const w = walls.find((wall) => wall.id === d.wallId);
        if (!w) return false;
        const { point } = projectPointOntoWall(rawWorld, w);
        return distance(rawWorld, point) < Math.max(0.42, 22 / zoom);
      });
      if (nearDoor) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(nearDoor.id)
            ? selection.ids.filter((id) => id !== nearDoor.id)
            : [...selection.ids, nearDoor.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'door', ids: nextIds });
        } else {
          onSelect({ type: 'door', ids: [nearDoor.id] });
          draggedIdsRef.current = [nearDoor.id];
        }
        return;
      }

      const nearWin = windows.find((win) => {
        const w = walls.find((wall) => wall.id === win.wallId);
        if (!w) return false;
        const { point } = projectPointOntoWall(rawWorld, w);
        return distance(rawWorld, point) < Math.max(0.42, 22 / zoom);
      });
      if (nearWin) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(nearWin.id)
            ? selection.ids.filter((id) => id !== nearWin.id)
            : [...selection.ids, nearWin.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'window', ids: nextIds });
        } else {
          onSelect({ type: 'window', ids: [nearWin.id] });
          draggedIdsRef.current = [nearWin.id];
        }
        return;
      }

      // 4. Furniture selection (click or drag)
      const clickedFurn = furniture.find(
        (f) =>
          Math.abs(rawWorld.x - f.x) <= f.width / 2 + Math.max(0.18, 14 / zoom) &&
          Math.abs(rawWorld.y - f.y) <= f.depth / 2 + Math.max(0.18, 14 / zoom)
      );
      if (clickedFurn) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(clickedFurn.id)
            ? selection.ids.filter((id) => id !== clickedFurn.id)
            : [...selection.ids, clickedFurn.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'furniture', ids: nextIds });
        } else {
          onSelect({ type: 'furniture', ids: [clickedFurn.id] });
          draggedIdsRef.current = [clickedFurn.id];
          setIsDraggingSelection(true);
          setDragSelectionStart(rawWorld);
        }
        return;
      }

      // 5. Wall selection (click or drag)
      const nearWall = findWallNearPoint(rawWorld, Math.max(0.35, 20 / zoom));
      if (nearWall) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(nearWall.wall.id)
            ? selection.ids.filter((id) => id !== nearWall.wall.id)
            : [...selection.ids, nearWall.wall.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'wall', ids: nextIds });
        } else {
          onSelect({ type: 'wall', ids: [nearWall.wall.id] });
          draggedIdsRef.current = [nearWall.wall.id];
          setIsDraggingSelection(true);
          setDragSelectionStart(rawWorld);
        }
        return;
      }

      // 6. Dimension line selection
      const nearDim = dimensions.find((d) => {
        const { dist } = projectPointOntoWall(rawWorld, { start: d.start, end: d.end } as Wall);
        return dist < Math.max(0.4, 20 / zoom);
      });
      if (nearDim) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(nearDim.id)
            ? selection.ids.filter((id) => id !== nearDim.id)
            : [...selection.ids, nearDim.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'dimension', ids: nextIds });
        } else {
          onSelect({ type: 'dimension', ids: [nearDim.id] });
          draggedIdsRef.current = [nearDim.id];
          setIsDraggingSelection(true);
          setDragSelectionStart(rawWorld);
        }
        return;
      }

      // 7. Room selection
      const clickedRoom = rooms.find((rm) => rm.polygon.length >= 3 && isPointInPolygon(rawWorld, rm.polygon));
      if (clickedRoom) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(clickedRoom.id)
            ? selection.ids.filter((id) => id !== clickedRoom.id)
            : [...selection.ids, clickedRoom.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'room', ids: nextIds });
        } else {
          onSelect({ type: 'room', ids: [clickedRoom.id] });
          draggedIdsRef.current = [clickedRoom.id];
        }
        return;
      }

      // 8. Stairs selection
      const clickedStair = stairs.find((st) => {
        return (
          Math.abs(rawWorld.x - st.x) <= (st.width || 1.0) / 2 + 0.3 &&
          Math.abs(rawWorld.y - st.y) <= (st.length || 3.0) / 2 + 0.3
        );
      });
      if (clickedStair) {
        if (e.shiftKey) {
          const nextIds = selection.ids.includes(clickedStair.id)
            ? selection.ids.filter((id) => id !== clickedStair.id)
            : [...selection.ids, clickedStair.id];
          onSelect({ type: nextIds.length > 1 ? 'mixed' : 'stair', ids: nextIds });
        } else {
          onSelect({ type: 'stair', ids: [clickedStair.id] });
          draggedIdsRef.current = [clickedStair.id];
          setIsDraggingSelection(true);
          setDragSelectionStart(rawWorld);
        }
        return;
      }

      // 9. Plot Boundary selection
      if (plot && plot.enabled) {
        const plotHit = findPlotHit(rawWorld);
        if (plotHit) {
          onSelect({ type: 'plot', ids: ['plot'] });
          draggedIdsRef.current = ['plot'];
          setIsDraggingSelection(true);
          setDragSelectionStart(rawWorld);
          return;
        }
      }

      // 10. Clicked on EMPTY SPACE -> Deselect and start Marquee Box
      if (!e.shiftKey) {
        onSelect({ type: 'none', ids: [] });
      }
      setMarquee({ start: rawWorld, current: rawWorld, isCrossing: false });
      return;
    }

    // TOOL: WALL DRAWING (CHAIN & DRAG)
    if (activeTool === 'wall') {
      if (!wallStartPoint) {
        setWallStartPoint(targetPt);
        setWallChainPoints([targetPt]);
        setShowNumericInput(true);
      } else {
        const dFromStart = distance(wallStartPoint, targetPt);
        if (dFromStart >= 0.25) {
          // Check if clicking near chain start point to close loop into a room!
          if (wallChainPoints.length >= 3 && distance(targetPt, wallChainPoints[0]) <= 0.35) {
            const closingWall: Wall = {
              id: 'w_' + Date.now() + Math.random().toString(36).substr(2, 4),
              start: wallStartPoint,
              end: wallChainPoints[0],
              thickness: currentWallThickness,
              height: wallStartHeight,
              endHeight: wallEndHeight,
              isExterior: wallMode === 'exterior',
              material: wallMode === 'exterior' ? 'timber' : 'drywall',
              referenceLine: 'center',
            };

            // Automatically detect and create closed room
            const fullLoop = [...wallChainPoints, wallChainPoints[0]];
            let area = 0;
            for (let i = 0; i < fullLoop.length - 1; i++) {
              area += fullLoop[i].x * fullLoop[i + 1].y - fullLoop[i + 1].x * fullLoop[i].y;
            }
            area = Math.abs(area) / 2;

            const newRoom: Room = {
              id: 'rm_' + Date.now(),
              name: 'Raum ' + (rooms.length + 1),
              category: 'living',
              polygon: fullLoop.slice(0, fullLoop.length - 1),
              areaM2: Math.round(area * 10) / 10,
              perimeterM: Math.round(dFromStart * 10) / 10,
              height: defaults?.roomHeight || 2.50,
              floorFinish: 'parquet',
              color: '#ea580c',
              targetLivingArea: true,
            };

            if (onAddWallsAndRoom) {
              onAddWallsAndRoom([closingWall], newRoom);
            } else {
              onAddWall(closingWall);
              if (onAddRoom) onAddRoom(newRoom);
            }

            setWallStartPoint(null);
            setWallChainPoints([]);
            setShowNumericInput(false);
            return;
          }

          // Continue chain
          const newWall: Wall = {
            id: 'w_' + Date.now() + Math.random().toString(36).substr(2, 4),
            start: wallStartPoint,
            end: targetPt,
            thickness: currentWallThickness,
            height: wallStartHeight,
            endHeight: wallEndHeight,
            isExterior: wallMode === 'exterior',
            material: wallMode === 'exterior' ? 'timber' : 'drywall',
            referenceLine: 'center',
          };
          onAddWall(newWall);
          setWallStartPoint(targetPt);
          setWallChainPoints((prev) => [...prev, targetPt]);
        }
      }
      return;
    }

    // TOOL: RECT ROOM
    if (activeTool === 'rect_room') {
      if (!rectRoomStart) {
        setRectRoomStart(targetPt);
      } else {
        const wM = Math.abs(targetPt.x - rectRoomStart.x);
        const dM = Math.abs(targetPt.y - rectRoomStart.y);
        if (wM >= 0.4 && dM >= 0.4) {
          createRectRoomFromPoints(rectRoomStart, targetPt);
          setRectRoomStart(null);
        }
      }
      return;
    }

    // TOOL: DOOR
    if (activeTool === 'door') {
      const near = findWallNearPoint(rawWorld, 0.4);
      if (near) {
        // Equal spacing & equidistant snap!
        const eq = calculateEqualSpacingRatio(
          near.wall,
          near.ratio,
          defaults?.doorWidth || 0.885,
          doors,
          windows,
          zoom,
          snapSettings.snapRadiusPx || 18
        );
        const finalRatio = eq.snapped ? eq.ratio : near.ratio;

        const newDoor: Door = {
          id: 'd_' + Date.now(),
          wallId: near.wall.id,
          position: finalRatio,
          width: defaults?.doorWidth || 0.885,
          height: defaults?.doorHeight || 2.05,
          lintelHeight: defaults?.doorLintel || 2.05,
          type: 'single',
          swingDirection: 'right',
          openDirection: 'inside',
          swingAngle: 90,
          frameThickness: 0.08,
          sillHeight: 0,
        };
        onAddDoor(newDoor);
      }
      return;
    }

    // TOOL: WINDOW
    if (activeTool === 'window') {
      const near = findWallNearPoint(rawWorld, 0.4);
      if (near) {
        // Equal spacing & equidistant snap!
        const eq = calculateEqualSpacingRatio(
          near.wall,
          near.ratio,
          defaults?.windowWidth || 1.20,
          doors,
          windows,
          zoom,
          snapSettings.snapRadiusPx || 18
        );
        const finalRatio = eq.snapped ? eq.ratio : near.ratio;

        const newWin: Window = {
          id: 'win_' + Date.now(),
          wallId: near.wall.id,
          position: finalRatio,
          width: defaults?.windowWidth || 1.20,
          height: defaults?.windowHeight || 1.25,
          parapetHeight: defaults?.windowParapet || 0.90,
          lintelHeight: defaults?.windowLintel || 2.15,
          type: 'turn_tilt',
          frameColor: '#1c1917',
          glazing: '3',
          hasInteriorSill: true,
          hasExteriorSill: true,
        };
        onAddWindow(newWin);
      }
      return;
    }

    // TOOL: DIMENSION
    if (activeTool === 'dimension') {
      if (!wallStartPoint) {
        setWallStartPoint(targetPt);
      } else {
        const newDim: DimensionLine = {
          id: 'dim_' + Date.now(),
          start: wallStartPoint,
          end: targetPt,
          offset: 0.8,
          type: 'linear',
          label: formatDimension(distance(wallStartPoint, targetPt), unit, 2),
        };
        onAddDimension(newDim);
        setWallStartPoint(null);
      }
    }
  };

  // Helper to construct rectangular room walls and room entity
  const createRectRoomFromPoints = (pA: Point2D, pB: Point2D) => {
    const minX = Math.min(pA.x, pB.x);
    const maxX = Math.max(pA.x, pB.x);
    const minY = Math.min(pA.y, pB.y);
    const maxY = Math.max(pA.y, pB.y);

    const p1 = { x: minX, y: minY };
    const p2 = { x: maxX, y: minY };
    const p3 = { x: maxX, y: maxY };
    const p4 = { x: minX, y: maxY };

    const wallThickness = currentWallThickness;
    const wallHeight = wallStartHeight;
    const wallEndH = wallEndHeight;

    const w1: Wall = {
      id: 'w_r1_' + Date.now() + Math.random().toString(36).substr(2, 3),
      start: p1,
      end: p2,
      thickness: wallThickness,
      height: wallHeight,
      endHeight: wallEndH,
      isExterior: wallMode === 'exterior',
      material: 'timber',
      referenceLine: 'center',
    };
    const w2: Wall = {
      id: 'w_r2_' + Date.now() + Math.random().toString(36).substr(2, 3),
      start: p2,
      end: p3,
      thickness: wallThickness,
      height: wallHeight,
      endHeight: wallEndH,
      isExterior: wallMode === 'exterior',
      material: 'timber',
      referenceLine: 'center',
    };
    const w3: Wall = {
      id: 'w_r3_' + Date.now() + Math.random().toString(36).substr(2, 3),
      start: p3,
      end: p4,
      thickness: wallThickness,
      height: wallHeight,
      endHeight: wallEndH,
      isExterior: wallMode === 'exterior',
      material: 'timber',
      referenceLine: 'center',
    };
    const w4: Wall = {
      id: 'w_r4_' + Date.now() + Math.random().toString(36).substr(2, 3),
      start: p4,
      end: p1,
      thickness: wallThickness,
      height: wallHeight,
      endHeight: wallEndH,
      isExterior: wallMode === 'exterior',
      material: 'timber',
      referenceLine: 'center',
    };

    const area = (maxX - minX) * (maxY - minY);
    const perim = 2 * ((maxX - minX) + (maxY - minY));
    const room: Room = {
      id: 'rm_' + Date.now(),
      name: 'Raum ' + (rooms.length + 1),
      category: 'living',
      polygon: [p1, p2, p3, p4],
      areaM2: Math.round(area * 10) / 10,
      perimeterM: Math.round(perim * 10) / 10,
      height: defaults?.roomHeight || 2.50,
      floorFinish: 'parquet',
      color: '#ea580c',
      targetLivingArea: true,
    };

    if (onAddWallsAndRoom) {
      onAddWallsAndRoom([w1, w2, w3, w4], room);
    } else {
      onAddWall(w1);
      onAddWall(w2);
      onAddWall(w3);
      onAddWall(w4);
      if (onAddRoom) onAddRoom(room);
    }
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Handle multi-touch pinch-zoom & two-finger pan
    if (activePointersRef.current.size >= 2 && pinchStateRef.current) {
      const pts = Array.from(activePointersRef.current.values());
      const p1 = pts[0];
      const p2 = pts[1];
      const newDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const currentCenter = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const { initialDist, initialZoom, initialPan, initialCenter } = pinchStateRef.current;

      if (initialDist > 10 && newDist > 10) {
        const zoomRatio = newDist / initialDist;
        const targetZoom = Math.min(180, Math.max(15, initialZoom * zoomRatio));

        const rect = canvas.getBoundingClientRect();
        const centerInCanvas = { x: initialCenter.x - rect.left, y: initialCenter.y - rect.top };
        const worldFocal = {
          x: (centerInCanvas.x - initialPan.x) / initialZoom,
          y: (centerInCanvas.y - initialPan.y) / initialZoom,
        };
        const panDeltaX = currentCenter.x - initialCenter.x;
        const panDeltaY = currentCenter.y - initialCenter.y;

        const newPanX = centerInCanvas.x - worldFocal.x * targetZoom + panDeltaX;
        const newPanY = centerInCanvas.y - worldFocal.y * targetZoom + panDeltaY;

        onZoomChange(targetZoom);
        onPanOffsetChange({ x: newPanX, y: newPanY });
      }
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    // Panning canvas
    if (isPanning) {
      onPanOffsetChange({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    const rawWorld = screenToWorld(screenPt);
    onCursorMove(rawWorld);

    // Dragging selection (translates all selected objects simultaneously)
    if (isDraggingSelection && dragSelectionStart) {
      const dx = rawWorld.x - dragSelectionStart.x;
      const dy = rawWorld.y - dragSelectionStart.y;
      if (Math.hypot(dx, dy) > 0.002) {
        setDragSelectionStart(rawWorld);
        const targetIds = draggedIdsRef.current.length > 0 ? draggedIdsRef.current : selection.ids;
        if (onMoveSelection) {
          onMoveSelection(dx, dy, targetIds);
        } else {
          // fallback
          walls.forEach((w) => {
            if (targetIds.includes(w.id)) {
              onUpdateWall({
                ...w,
                start: { x: w.start.x + dx, y: w.start.y + dy },
                end: { x: w.end.x + dx, y: w.end.y + dy },
              });
            }
          });
          furniture.forEach((f) => {
            if (targetIds.includes(f.id)) {
              if (onUpdateFurniture) {
                onUpdateFurniture({ ...f, x: f.x + dx, y: f.y + dy });
              } else {
                onAddFurniture({ ...f, x: f.x + dx, y: f.y + dy });
              }
            }
          });
        }
      }
      return;
    }

    // Marquee updating
    if (marquee) {
      const isCrossing = rawWorld.x < marquee.start.x;
      setMarquee({
        start: marquee.start,
        current: rawWorld,
        isCrossing,
      });
      return;
    }

    // Hover detection
    let hoveredId: string | null = null;
    let hoveringSelected = false;
    const furnHover = furniture.find(
      (f) => Math.abs(rawWorld.x - f.x) <= f.width / 2 && Math.abs(rawWorld.y - f.y) <= f.depth / 2
    );
    if (furnHover) {
      hoveredId = furnHover.id;
    } else {
      const wallNear = findWallNearPoint(rawWorld, 0.25);
      if (wallNear) hoveredId = wallNear.wall.id;
    }
    setHoveredObjectId(hoveredId);

    if (selection.ids.length > 0) {
      if (hoveredId && selection.ids.includes(hoveredId)) {
        hoveringSelected = true;
      } else if (selectionBoundingBox && isPointInAABB(rawWorld, selectionBoundingBox)) {
        hoveringSelected = true;
      }
    }
    setIsHoveringSelection(hoveringSelected);

    // Snapping calculation
    const extraSnapCtx = {
      doors,
      windows,
      furniture,
      rooms,
      plot,
      candidateIndex: snapCandidateIndex,
      isAltPressed: e.altKey || isAltDown,
      isAngleLocked: e.shiftKey || isShiftDown,
      ignoredIds: draggingHandle ? [draggingHandle.wallId] : isDraggingSelection ? (draggedIdsRef.current.length > 0 ? draggedIdsRef.current : selection.ids) : [],
      currentTool: activeTool,
    };
    const snap = calculateSnap(rawWorld, wallStartPoint, walls, snapSettings, zoom, extraSnapCtx);
    setCurrentCursorWorld(snap.point);
    setSmartSnap(snap.snapped ? snap : null);
    if (snap.snapped) {
      setSnapIndicator({ point: snap.point, type: snap.type });
    } else {
      setSnapIndicator(null);
    }

    // Dragging wall handle (with connected wall adaptation)
    if (draggingHandle) {
      const wall = walls.find((w) => w.id === draggingHandle.wallId);
      if (wall) {
        const oldPt = draggingHandle.handle === 'start' ? wall.start : wall.end;
        const newPt = snap.point;

        // Update target wall
        if (draggingHandle.handle === 'start') {
          onUpdateWall({ ...wall, start: newPt });
        } else {
          onUpdateWall({ ...wall, end: newPt });
        }

        // Adjust connected walls so corner remains sealed
        walls.forEach((other) => {
          if (other.id === wall.id) return;
          if (distance(other.start, oldPt) < 0.1) {
            onUpdateWall({ ...other, start: newPt });
          } else if (distance(other.end, oldPt) < 0.1) {
            onUpdateWall({ ...other, end: newPt });
          }
        });
      }
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      pinchStateRef.current = null;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screenPt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const rawWorld = screenToWorld(screenPt);
    const extraUpSnapCtx = {
      doors,
      windows,
      furniture,
      rooms,
      plot,
      candidateIndex: snapCandidateIndex,
      isAltPressed: e.altKey || isAltDown,
      isAngleLocked: e.shiftKey || isShiftDown,
      ignoredIds: [],
      currentTool: activeTool,
    };
    const snap = calculateSnap(rawWorld, wallStartPoint, walls, snapSettings, zoom, extraUpSnapCtx);
    const targetPt = snap.point;

    setIsPanning(false);
    if (isDraggingSelection && onCommitProjectChange) {
      onCommitProjectChange();
    }
    setIsDraggingSelection(false);
    setDragSelectionStart(null);
    setDraggingHandle(null);
    draggedIdsRef.current = [];

    // Check if user was Drag-Drawing a wall
    if (activeTool === 'wall' && isPointerDown && pointerDownPos) {
      const dragDist = distance(pointerDownPos, targetPt);
      if (dragDist >= 0.4) {
        // Drag-to-draw completed!
        const newWall: Wall = {
          id: 'w_' + Date.now() + Math.random().toString(36).substr(2, 4),
          start: pointerDownPos,
          end: targetPt,
          thickness: currentWallThickness,
          height: wallStartHeight,
          endHeight: wallEndHeight,
          isExterior: wallMode === 'exterior',
          material: wallMode === 'exterior' ? 'timber' : 'drywall',
          referenceLine: 'center',
        };
        onAddWall(newWall);
        setWallStartPoint(null);
        setWallChainPoints([]);
        setShowNumericInput(false);
      }
    }

    // Check if user was Drag-Drawing a Rect Room
    if (activeTool === 'rect_room' && isPointerDown && pointerDownPos) {
      const wM = Math.abs(targetPt.x - pointerDownPos.x);
      const dM = Math.abs(targetPt.y - pointerDownPos.y);
      if (wM >= 0.5 && dM >= 0.5) {
        createRectRoomFromPoints(pointerDownPos, targetPt);
        setRectRoomStart(null);
      }
    }

    setIsPointerDown(false);
    setPointerDownPos(null);

    // Finish Marquee selection
    if (marquee) {
      const minX = Math.min(marquee.start.x, marquee.current.x);
      const maxX = Math.max(marquee.start.x, marquee.current.x);
      const minY = Math.min(marquee.start.y, marquee.current.y);
      const maxY = Math.max(marquee.start.y, marquee.current.y);

      // Only evaluate if actually dragged a box (> 5cm)
      if (maxX - minX > 0.05 || maxY - minY > 0.05) {
        const mBox: BoundingBox2D = { minX, minY, maxX, maxY };
        const selectedIds: string[] = [];

        // Check walls: if start, end, midpoint, or bounding box intersects
        walls.forEach((w) => {
          const wBox = getWallBoundingBox(w);
          const startIn = isPointInAABB(w.start, mBox);
          const endIn = isPointInAABB(w.end, mBox);
          const midIn = isPointInAABB({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 }, mBox);
          if (startIn || endIn || midIn || aabbIntersects(mBox, wBox)) {
            selectedIds.push(w.id);
          }
        });

        // Check furniture
        furniture.forEach((f) => {
          const fBox = getFurnitureBoundingBox(f);
          const centerIn = isPointInAABB({ x: f.x, y: f.y }, mBox);
          if (centerIn || aabbIntersects(mBox, fBox)) {
            selectedIds.push(f.id);
          }
        });

        // Check doors
        doors.forEach((d) => {
          const w = walls.find((wall) => wall.id === d.wallId);
          if (!w) return;
          const wLen = distance(w.start, w.end);
          if (wLen > 0) {
            const dx = (w.end.x - w.start.x) / wLen;
            const dy = (w.end.y - w.start.y) / wLen;
            const dPt = { x: w.start.x + dx * (d.position * wLen), y: w.start.y + dy * (d.position * wLen) };
            if (isPointInAABB(dPt, mBox)) {
              selectedIds.push(d.id);
            }
          }
        });

        // Check windows
        windows.forEach((win) => {
          const w = walls.find((wall) => wall.id === win.wallId);
          if (!w) return;
          const wLen = distance(w.start, w.end);
          if (wLen > 0) {
            const dx = (w.end.x - w.start.x) / wLen;
            const dy = (w.end.y - w.start.y) / wLen;
            const winPt = { x: w.start.x + dx * (win.position * wLen), y: w.start.y + dy * (win.position * wLen) };
            if (isPointInAABB(winPt, mBox)) {
              selectedIds.push(win.id);
            }
          }
        });

        // Check dimensions
        dimensions.forEach((dim) => {
          if (isPointInAABB(dim.start, mBox) || isPointInAABB(dim.end, mBox)) {
            selectedIds.push(dim.id);
          }
        });

        // Check rooms
        rooms.forEach((rm) => {
          if (rm.polygon.length >= 3) {
            const inBox = rm.polygon.some((p) => isPointInAABB(p, mBox));
            const cx = rm.polygon.reduce((acc, p) => acc + p.x, 0) / rm.polygon.length;
            const cy = rm.polygon.reduce((acc, p) => acc + p.y, 0) / rm.polygon.length;
            if (inBox || isPointInAABB({ x: cx, y: cy }, mBox)) {
              selectedIds.push(rm.id);
            }
          }
        });

        if (selectedIds.length > 0) {
          const finalIds = e.shiftKey
            ? Array.from(new Set([...selection.ids, ...selectedIds]))
            : selectedIds;
          onSelect({ type: finalIds.length > 1 ? 'mixed' : 'wall', ids: finalIds });
          if (onSelectTool) onSelectTool('select');
        } else if (!e.shiftKey) {
          onSelect({ type: 'none', ids: [] });
        }
      }
      setMarquee(null);
    }
  };

  // Double Click / Right Click / Escape to end chains
  const handleDoubleClick = () => {
    // If in plot drawing mode, close polygon!
    if (activeTool === 'plot' && plotDrawPoints.length >= 3) {
      const finalPolygon = [...plotDrawPoints];
      if (onUpdatePlot) {
        onUpdatePlot({
          enabled: true,
          x: Math.min(...finalPolygon.map((p) => p.x)),
          y: Math.min(...finalPolygon.map((p) => p.y)),
          width: Math.round((Math.max(...finalPolygon.map((p) => p.x)) - Math.min(...finalPolygon.map((p) => p.x))) * 10) / 10,
          depth: Math.round((Math.max(...finalPolygon.map((p) => p.y)) - Math.min(...finalPolygon.map((p) => p.y))) * 10) / 10,
          points: finalPolygon,
          setback: plot?.setback || 3.0,
          maxGRZ: plot?.maxGRZ || 0.40,
          maxGFZ: plot?.maxGFZ || 0.80,
          groundElevation: plot?.groundElevation || 0.30,
        });
      }
      setPlotDrawPoints([]);
      return;
    }

    setWallStartPoint(null);
    setWallChainPoints([]);
    setRectRoomStart(null);
    setShowNumericInput(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    handleDoubleClick();
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    const newZoom = Math.max(12, Math.min(280, zoom * zoomFactor));

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - panOffset.x) * (newZoom / zoom);
    const newPanY = mouseY - (mouseY - panOffset.y) * (newZoom / zoom);

    onZoomChange(newZoom);
    onPanOffsetChange({ x: newPanX, y: newPanY });
  };

  // Direct numeric input commit
  const commitNumericLength = () => {
    const len = parseFloat(numericLength);
    if (!isNaN(len) && len > 0 && wallStartPoint && currentCursorWorld) {
      let targetAng = Math.atan2(currentCursorWorld.y - wallStartPoint.y, currentCursorWorld.x - wallStartPoint.x);
      const customAng = parseFloat(numericAngle);
      if (!isNaN(customAng)) {
        targetAng = (customAng * Math.PI) / 180;
      }

      const endPt = {
        x: wallStartPoint.x + Math.cos(targetAng) * len,
        y: wallStartPoint.y + Math.sin(targetAng) * len,
      };

      const newWall: Wall = {
        id: 'w_' + Date.now(),
        start: wallStartPoint,
        end: endPt,
        thickness: currentWallThickness,
        height: wallStartHeight,
        endHeight: wallEndHeight,
        isExterior: wallMode === 'exterior',
        material: wallMode === 'exterior' ? 'timber' : 'drywall',
        referenceLine: 'center',
      };
      onAddWall(newWall);
      setWallStartPoint(endPt);
      setWallChainPoints((prev) => [...prev, endPt]);
      setNumericLength('');
      setNumericAngle('');
    }
  };

  const cursorStyle = useMemo(() => {
    if (isPanning || activeTool === 'hand') return 'grab';
    if (activeTool === 'wall' || activeTool === 'rect_room' || activeTool === 'dimension' || activeTool === 'plot') return 'crosshair';
    if (activeTool === 'eraser') return 'not-allowed';
    if (isDraggingSelection) return 'grabbing';
    if (activeTool === 'select' && isHoveringSelection) return 'move';
    return 'default';
  }, [isPanning, activeTool, isDraggingSelection, isHoveringSelection]);

  return (
    <div
      ref={containerRef}
      style={{ cursor: cursorStyle }}
      className="relative flex-1 h-full w-full bg-stone-50 dark:bg-stone-950 overflow-hidden outline-none select-none"
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className="w-full h-full block touch-none"
      />

      {/* CANVAS SELECTION ACTION BAR (Pinned at top of canvas, guaranteed visible) */}
      {selection.ids.length > 0 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className="absolute top-3.5 left-1/2 -translate-x-1/2 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border border-stone-200 dark:border-stone-800 rounded-xl px-3 py-1.5 shadow-2xl flex items-center gap-2 z-40 animate-in fade-in zoom-in-95 duration-150 select-none"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 font-semibold text-xs whitespace-nowrap">
            <Check className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              {selection.ids.length === 1
                ? selection.type === 'plot' || selection.ids.includes('plot')
                  ? 'Grundstück ausgewählt'
                  : '1 Element ausgewählt'
                : `${selection.ids.length} Elemente ausgewählt`}
            </span>
          </div>

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />

          {/* Delete Button */}
          {onDeleteSelected && (
            <button
              onClick={() => onDeleteSelected()}
              title="Ausgewählte Elemente löschen (Entf / Backspace)"
              className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Löschen (Entf)</span>
            </button>
          )}

          {/* Duplicate */}
          {onDuplicateSelected && (
            <button
              onClick={onDuplicateSelected}
              title="Duplizieren (Strg+D)"
              className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Copy className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Duplizieren</span>
            </button>
          )}

          {/* Split wall if single wall selected */}
          {selection.type === 'wall' && selection.ids.length === 1 && onSplitSelectedWall && (
            <button
              onClick={onSplitSelectedWall}
              title="Wand in zwei Abschnitte teilen (C)"
              className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <Scissors className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Teilen (C)</span>
            </button>
          )}

          {/* Rotate 90 */}
          {onRotateSelected && (
            <button
              onClick={() => onRotateSelected(90)}
              title="90° Drehen (R)"
              className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Drehen</span>
            </button>
          )}

          {/* Flip */}
          {onFlipHorizontal && (
            <button
              onClick={onFlipHorizontal}
              title="Horizontal spiegeln"
              className="px-2 py-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <FlipHorizontal className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span className="hidden sm:inline">Spiegeln</span>
            </button>
          )}

          <div className="h-4 w-px bg-stone-200 dark:bg-stone-800" />

          {/* Clear selection */}
          <button
            onClick={() => onSelect({ type: 'none', ids: [] })}
            title="Auswahl aufheben (Esc)"
            className="p-1 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FLOATING TOP-CENTER TOOL HUD: Quick Wall Type, Thickness & Sloped Heights */}
      {selection.ids.length === 0 && (activeTool === 'wall' || activeTool === 'rect_room') && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-stone-900/95 dark:bg-stone-900/95 backdrop-blur border border-stone-700/80 rounded-xl px-3 py-2 shadow-2xl flex flex-wrap items-center gap-2 text-xs text-stone-200 z-30 max-w-[94vw]">
          {/* Wandtyp Toggle */}
          <div className="flex items-center gap-1 bg-stone-950 p-0.5 rounded-lg border border-stone-800">
            <button
              onClick={() => handleToggleWallMode('exterior')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                wallMode === 'exterior'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Außenwand
            </button>
            <button
              onClick={() => handleToggleWallMode('interior')}
              className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                wallMode === 'interior'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              Innenwand
            </button>
          </div>

          <div className="h-4 w-px bg-stone-700" />

          {/* Quick Thickness Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-stone-400">Stärke:</span>
            {[0.115, 0.175, 0.24, 0.30, 0.365].map((val) => (
              <button
                key={val}
                onClick={() => setWallThicknessM(val)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors cursor-pointer ${
                  Math.abs(wallThicknessM - val) < 0.005
                    ? 'bg-amber-600 text-white font-bold'
                    : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                }`}
              >
                {(val * 100).toFixed(1)} cm
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-stone-700" />

          {/* Wall Heights: Anfangshöhe & Endhöhe */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-stone-400">Start:</span>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="8.0"
              value={wallStartHeight}
              onChange={(e) => setWallStartHeight(parseFloat(e.target.value) || 2.5)}
              className="w-14 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 font-mono text-center font-bold text-amber-300"
            />
            <span className="text-[10px] text-stone-400">m</span>

            <span className="text-[10px] text-stone-400 ml-1">Ende:</span>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="8.0"
              value={wallEndHeight}
              onChange={(e) => setWallEndHeight(parseFloat(e.target.value) || 2.5)}
              className="w-14 bg-stone-950 border border-stone-700 rounded px-1.5 py-0.5 font-mono text-center font-bold text-amber-300"
            />
            <span className="text-[10px] text-stone-400">m</span>

            {/* Quick slope helper */}
            <button
              onClick={() => setWallEndHeight(Math.round((wallStartHeight + 1.0) * 100) / 100)}
              title="Ende 1.0 m höher als Start"
              className="px-2 py-0.5 rounded bg-stone-800 hover:bg-amber-600 hover:text-white text-[10px] font-medium text-amber-300 transition-colors cursor-pointer"
            >
              +1.0m ↗
            </button>
            {Math.abs(wallEndHeight - wallStartHeight) > 0.02 && (
              <button
                onClick={() => setWallEndHeight(wallStartHeight)}
                title="Wand gerade (Anfang = Ende)"
                className="px-1.5 py-0.5 rounded bg-stone-800 hover:bg-stone-700 text-[10px] text-stone-400 cursor-pointer"
              >
                Gerade
              </button>
            )}
          </div>
        </div>
      )}

      {/* FLOATING TOP-CENTER TOOL HUD: Plot Drawing Guidance & Control */}
      {selection.ids.length === 0 && activeTool === 'plot' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-stone-900/95 backdrop-blur border border-amber-500/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-3 text-xs text-stone-100 z-30">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-medium">
            {plotDrawPoints.length === 0
              ? 'Grundstücksgrenzen mit Linien ziehen: Klicke die Eckpunkte an'
              : `${plotDrawPoints.length} Grenzpunkte gesetzt. Klicke nächsten Punkt oder schließe auf Startpunkt ab`}
          </span>

          {plotDrawPoints.length >= 3 && (
            <button
              onClick={handleDoubleClick}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs shadow-md transition-colors cursor-pointer"
            >
              Grundstück schließen ↵
            </button>
          )}

          {plotDrawPoints.length > 0 && (
            <button
              onClick={() => setPlotDrawPoints((prev) => prev.slice(0, -1))}
              className="px-2 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors cursor-pointer"
            >
              Punkt zurück
            </button>
          )}

          <button
            onClick={() => {
              if (onUpdatePlot) {
                onUpdatePlot({
                  enabled: true,
                  x: -5.0,
                  y: -4.0,
                  width: 20.0,
                  depth: 30.0,
                  setback: 3.0,
                  maxGRZ: 0.40,
                  maxGFZ: 0.80,
                  groundElevation: 0.30,
                  points: undefined,
                });
              }
              setPlotDrawPoints([]);
            }}
            className="px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded text-xs transition-colors cursor-pointer"
          >
            Standard 20 × 30 m
          </button>
        </div>
      )}

      {/* Floating Direct Numeric Input Box for Walls */}
      {wallStartPoint && showNumericInput && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 bg-stone-900/95 backdrop-blur border border-amber-500/80 rounded-xl px-3.5 py-2 shadow-2xl flex items-center gap-2.5 text-xs text-stone-100 z-30">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-amber-400">Länge:</span>
            <input
              type="number"
              step="0.1"
              placeholder="z. B. 6.0"
              value={numericLength}
              onChange={(e) => setNumericLength(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNumericLength();
                else if (e.key === 'Escape') setWallStartPoint(null);
              }}
              autoFocus
              className="w-20 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 font-mono text-sm outline-none font-bold text-amber-200"
            />
            <span className="text-stone-400 font-mono">m</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="font-semibold text-stone-400">Winkel:</span>
            <input
              type="number"
              step="15"
              placeholder="0"
              value={numericAngle}
              onChange={(e) => setNumericAngle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitNumericLength();
                else if (e.key === 'Escape') setWallStartPoint(null);
              }}
              className="w-16 bg-stone-950 border border-stone-700 rounded px-2 py-0.5 font-mono text-sm outline-none font-bold text-stone-200"
            />
            <span className="text-stone-400 font-mono">°</span>
          </div>

          <button
            onClick={commitNumericLength}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-500 font-semibold rounded text-white text-xs shadow-sm transition-colors cursor-pointer"
          >
            Enter ↵
          </button>
        </div>
      )}

      {/* Floating Property/Plot Status HUD (GRZ / GFZ / Baufenster live) */}
      {plot && plot.enabled && plotMetrics && (
        <div className="absolute top-4 right-4 bg-stone-900/90 dark:bg-stone-900/95 backdrop-blur border border-stone-800 rounded-xl p-3 shadow-xl flex flex-col gap-1.5 text-[11px] text-stone-300 z-10 font-mono">
          <div className="flex items-center justify-between gap-3 border-b border-stone-800 pb-1">
            <span className="font-bold text-white font-sans">Grundstück & Baugrenzen</span>
            <span className="text-[10px] text-amber-400 font-semibold">
              {plotMetrics.plotArea} m² Fläche
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-stone-400">GRZ (Grundfläche):</span>
            <span className={`font-bold ${plotMetrics.isGrzValid ? 'text-emerald-400' : 'text-red-400'}`}>
              {plotMetrics.actualGRZ} / {plot.maxGRZ} {plotMetrics.isGrzValid ? '✓' : '✗'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-stone-400">GFZ (Geschossfläche):</span>
            <span className={`font-bold ${plotMetrics.isGfzValid ? 'text-emerald-400' : 'text-red-400'}`}>
              {plotMetrics.actualGFZ} / {plot.maxGFZ} {plotMetrics.isGfzValid ? '✓' : '✗'}
            </span>
          </div>

          <div className="flex justify-between items-center text-stone-400 text-[10px] pt-0.5">
            <span>Baufenster:</span>
            <span>{plotMetrics.buildableArea} m² ({plot.setback || 3.0}m Grenzabstand)</span>
          </div>
        </div>
      )}
    </div>
  );
};
