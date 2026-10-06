/**
 * CAD Data Types and Models for Holiday Home Architecture
 */

export type UnitType = 'm' | 'cm' | 'mm';
export type ScaleType = '1:20' | '1:50' | '1:100';
export type ViewMode = '2d' | '3d' | 'split' | 'elevations' | 'section' | 'quantities';
export type Language = 'de' | 'en' | 'sq';

export interface Point2D {
  x: number; // In meters
  y: number; // In meters
}

export interface BoundingBox2D {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type WallMaterial = 
  | 'brick' 
  | 'concrete' 
  | 'timber' 
  | 'drywall' 
  | 'log' 
  | 'glass' 
  | 'insulation';

export interface Wall {
  id: string;
  start: Point2D;
  end: Point2D;
  thickness: number; // e.g. 0.30 (exterior) or 0.115 (interior) in meters
  height: number; // standard 2.50m (Anfangshöhe)
  endHeight?: number; // optional Endhöhe für geneigte/ansteigende Wände (z. B. 3.50m)
  startElevation?: number; // Level above floor
  leftHeight?: number; // For gables or sloped walls
  rightHeight?: number;
  isExterior: boolean;
  material: WallMaterial;
  referenceLine: 'center' | 'inner' | 'outer';
  color?: string;
  arcRadius?: number; // If curved wall
  locked?: boolean;
}

export type DoorType = 
  | 'single' 
  | 'double' 
  | 'sliding' 
  | 'pocket' 
  | 'folding' 
  | 'entry' 
  | 'patio' 
  | 'garage' 
  | 'opening';

export interface Door {
  id: string;
  wallId: string;
  position: number; // 0..1 ratio along wall
  width: number; // e.g. 0.885 or 1.01m
  height: number; // 2.05m
  lintelHeight?: number; // Sturzhöhe, standard 2.05m or 2.10m
  type: DoorType;
  swingDirection: 'left' | 'right';
  openDirection: 'inside' | 'outside';
  swingAngle: number; // typically 90 degrees
  frameThickness: number; // e.g. 0.08m
  sillHeight: number; // 0.00 for normal doors
  material?: string;
  color?: string;
  name?: string;
}

export type WindowType = 
  | 'turn_tilt' 
  | 'double' 
  | 'triple' 
  | 'fixed' 
  | 'tilt' 
  | 'sliding' 
  | 'skylight' 
  | 'round' 
  | 'arch' 
  | 'bay' 
  | 'floor_to_ceiling' 
  | 'ribbon' 
  | 'glass_block';

export interface Window {
  id: string;
  wallId: string;
  position: number; // 0..1 ratio along wall
  width: number; // e.g. 1.00m or 1.20m
  height: number; // 1.25m
  parapetHeight: number; // Brüstungshöhe (0.90m)
  lintelHeight?: number; // Sturzhöhe (e.g. 2.15m)
  type: WindowType;
  frameColor: string;
  glazing: '1' | '2' | '3';
  hasInteriorSill: boolean;
  hasExteriorSill: boolean;
  leafCount?: number;
  openDirection?: 'left' | 'right';
  name?: string;
}

export type StairType = 'straight' | 'L' | 'U' | 'spiral' | 'landing';

export interface Stair {
  id: string;
  type: StairType;
  x: number; // in meters
  y: number;
  rotation: number; // in degrees
  width: number; // e.g. 0.90m
  length: number; // e.g. 2.80m
  storyHeight: number; // e.g. 2.75m
  stepCount: number; // e.g. 15
  stepHeight: number; // calculated rise: storyHeight / stepCount (~18cm)
  stepDepth: number; // calculated run: length / stepCount (~26cm)
  hasHandrail: boolean;
  hasRailings: boolean;
  name?: string;
}

export interface Column {
  id: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  shape: 'rect' | 'circle';
  material: 'timber' | 'concrete' | 'steel' | 'brick';
  color?: string;
}

export type RoofType = 'gable' | 'hip' | 'shed' | 'flat' | 'tent';

export interface Roof {
  id: string;
  type: RoofType;
  pitchDegrees: number; // e.g. 35° (0° for flat)
  overhang: number; // e.g. 0.40m
  ridgeDirection: 'horizontal' | 'vertical';
  height: number; // Ridge height above eaves (Firsthöhe, e.g. 2.20m)
  baseHeight?: number; // Eaves / Wall plate height above floor (Traufhöhe, e.g. 2.50m)
  material: 'tiles_red' | 'tiles_anthracite' | 'metal_sheet' | 'slate' | 'green_roof';
  hasChimney: boolean;
  chimneyPosition?: Point2D;
  chimneyHeight?: number;
  skylightsCount: number;
  customBounds?: { minX: number; maxX: number; minY: number; maxY: number };
  color?: string;
}

export type FloorFinish = 
  | 'parquet' 
  | 'tiles' 
  | 'carpet' 
  | 'concrete' 
  | 'wood_plank' 
  | 'terrace_stone'
  | 'laminate';

export interface Room {
  id: string;
  name: string;
  category: 'living' | 'sleeping' | 'kitchen' | 'bath' | 'corridor' | 'storage' | 'outdoor';
  polygon: Point2D[];
  areaM2: number; // Net internal area
  grossAreaM2?: number; // Gross area including enclosing wall shares
  perimeterM: number;
  height: number;
  floorFinish: FloorFinish;
  color: string;
  targetLivingArea: boolean; // whether counts toward Wohnfläche
}

export type FurnitureCategory = 
  | 'living' 
  | 'bedroom' 
  | 'kitchen' 
  | 'bathroom' 
  | 'tech' 
  | 'outdoor' 
  | 'custom';

export interface Furniture {
  id: string;
  name: string;
  category: FurnitureCategory;
  type: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  rotation: number;
  color?: string;
  iconType: string;
  locked?: boolean;
}

export type ElectricalType = 
  | 'socket' 
  | 'switch' 
  | 'switch_double' 
  | 'light_ceiling' 
  | 'light_wall' 
  | 'network' 
  | 'tv' 
  | 'smoke_detector' 
  | 'water' 
  | 'drainage' 
  | 'gas';

export interface ElectricalSymbol {
  id: string;
  type: ElectricalType;
  x: number;
  y: number;
  rotation: number;
  label?: string;
}

export interface DimensionLine {
  id: string;
  start: Point2D;
  end: Point2D;
  offset: number; // Perpendicular offset in meters
  label?: string;
  type: 'linear' | 'chain' | 'height' | 'angle';
  linkedId?: string; // Optional linked wall or window
}

export interface TextAnnotation {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize: number; // in meters (e.g. 0.25m)
  rotation: number;
  color: string;
}

export type ShapeType = 'line' | 'rect' | 'circle' | 'polygon' | 'arrow' | 'freehand';

export interface VectorShape {
  id: string;
  type: ShapeType;
  points: Point2D[];
  strokeColor: string;
  strokeWidth: number;
  fillColor?: string;
  lineStyle: 'solid' | 'dashed' | 'dotted' | 'dashdot';
}

export interface GuideLine {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number; // Coordinate in meters
}

export interface BackgroundImage {
  url: string;
  x: number;
  y: number;
  widthM: number;
  heightM: number;
  opacity: number;
  locked: boolean;
}

export interface LayerState {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  color?: string;
}

export interface Floor {
  id: string;
  name: string;
  storyHeight: number; // e.g. 2.75m
  floorElevation: number; // OKFF e.g. 0.00 or +2.80
  slabThickness: number; // e.g. 0.20m
  groundElevation?: number; // Sockelhöhe / Geländehöhe (e.g. 0.30m)
  walls: Wall[];
  doors: Door[];
  windows: Window[];
  stairs: Stair[];
  columns: Column[];
  roofs: Roof[];
  rooms: Room[];
  furniture: Furniture[];
  electrical: ElectricalSymbol[];
  dimensions: DimensionLine[];
  annotations: TextAnnotation[];
  shapes: VectorShape[];
}

export interface TitleBlock {
  projectName: string;
  clientName: string;
  siteAddress: string;
  planContent: string;
  date: string;
  scale: string;
  author: string;
  sheetNumber: string;
  revision: string;
}

export interface PlotBoundary {
  enabled: boolean;
  x: number; // origin top-left in meters
  y: number;
  width: number; // e.g. 20.0 m
  depth: number; // e.g. 30.0 m
  points?: Point2D[]; // Optional custom polygon
  setback: number; // Abstandsfläche / Grenzabstand, default 3.00 m
  maxGRZ: number; // Zulässige Grundflächenzahl, default 0.40
  maxGFZ: number; // Zulässige Geschossflächenzahl, default 0.80
  groundElevation: number; // Geländehöhe / Sockelhöhe (e.g. 0.30 m)
}

export interface ProjectDefaults {
  exteriorWallThickness: number; // e.g. 0.30
  interiorWallThickness: number; // e.g. 0.115
  wallHeight: number; // e.g. 2.50
  roomHeight: number; // e.g. 2.50
  doorWidth: number; // e.g. 0.885
  doorHeight: number; // e.g. 2.05
  doorLintel: number; // e.g. 2.05
  windowWidth: number; // e.g. 1.20
  windowHeight: number; // e.g. 1.25
  windowParapet: number; // e.g. 0.90
  windowLintel: number; // e.g. 2.15
  gridSize: number; // e.g. 0.25
  unit: UnitType;
  setback: number; // e.g. 3.00
}

export interface CadProject {
  id: string;
  name: string;
  variant: string;
  unit: UnitType;
  scale: ScaleType;
  activeFloorId: string;
  floors: Floor[];
  titleBlock: TitleBlock;
  layers: LayerState[];
  guideLines: GuideLine[];
  backgroundImage?: BackgroundImage;
  northAngle: number; // degrees (0 = North up)
  plot?: PlotBoundary;
  defaults?: ProjectDefaults;
  createdAt: string;
  updatedAt: string;
}

export interface SnapSettings {
  enabled: boolean; // Master switch for snapping
  grid: boolean;
  gridSize: number; // meters e.g. 0.10, 0.25, 0.50
  wallEndpoints: boolean;
  wallMidpoints: boolean;
  intersections: boolean;
  perpendicular: boolean; // Lotpunkt (Fußpunkt senkrecht auf Wand/Linie)
  extensions: boolean; // Fluchtend / Verlängerungslinien
  parallel: boolean; // Parallele Hilfslinie (//)
  rightAngle: boolean; // Rechtwinklig (90° / 45° relativ zu Wänden)
  equalLength: boolean; // Gleiche Wandlänge (=)
  equalSpacing: boolean; // Gleiche Abstände zwischen Elementen
  alignment: boolean; // Fluchtende Ausrichtung an Kanten/Zentren
  offset: boolean; // Versatz-Fang (fester Parallelabstand)
  offsetDistance?: number; // e.g. 2.50m or 3.00m
  divisionPoints: boolean; // Drittel- und Viertelpunkte
  snapRadiusPx: number; // Fangradius in Pixeln (default 18, slider 8..40)
  angleStepDeg: number; // Winkelschritt in Grad (default 15)
  ortho: boolean;
  step15Deg: boolean;
}

export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  grid: true,
  gridSize: 0.25,
  wallEndpoints: true,
  wallMidpoints: true,
  intersections: true,
  perpendicular: true,
  extensions: true,
  parallel: true,
  rightAngle: true,
  equalLength: true,
  equalSpacing: true,
  alignment: true,
  offset: true,
  offsetDistance: 2.50,
  divisionPoints: true,
  snapRadiusPx: 18,
  angleStepDeg: 15,
  ortho: false,
  step15Deg: true,
};

export type SnapPointType =
  | 'none'
  | 'grid'
  | 'endpoint'
  | 'midpoint'
  | 'intersection'
  | 'lot' // Lotpunkt (perpendicular foot)
  | 'edge' // Auf Kante / Achse
  | 'division' // Drittel / Viertel
  | 'extension' // Fluchtend auf Verlängerung
  | 'extension_intersection'
  | 'room_corner'
  | 'door_center'
  | 'window_center'
  | 'furniture_axis'
  | 'plot_vertex'
  | 'plot_edge'
  | 'parallel' // Parallele Richtung (//)
  | 'right_angle' // Rechtwinklig (90°) zu Wand
  | 'equal_length' // Gleiche Wandlänge (=)
  | 'equal_spacing' // Gleicher Abstand
  | 'alignment' // Horizontale/vertikale Fluchtlinie
  | 'offset' // Paralleler Versatz
  | 'ortho'
  | 'angle15';

export interface ActiveGuideLine {
  id: string;
  type: 'parallel' | 'perpendicular' | 'extension' | 'alignment' | 'equal_length' | 'equal_spacing' | 'offset';
  p1: Point2D;
  p2: Point2D;
  label?: string;
  symbol?: string; // '//', '⟂', '=', '90°'
  color?: string;
  dash?: number[];
  sourceWallIds?: string[];
  matchedLength?: number;
  tickMarks?: Point2D[];
  equalSpacingInfo?: {
    segments: { p1: Point2D; p2: Point2D; dist: number }[];
  };
}

export interface MatchedHeightsInfo {
  height: number;
  endHeight?: number;
  sourceWallId?: string;
  isOpposite?: boolean;
  label?: string;
}

export interface SmartSnapCandidate {
  point: Point2D;
  type: SnapPointType;
  distancePx: number;
  priority: number; // 1: point, 2: lot/extension, 3: angle/guide, 4: grid
  label: string;
  symbol?: string;
  targetId?: string;
  guideLine?: ActiveGuideLine;
  secondaryGuideLine?: ActiveGuideLine;
  matchedWallIds?: string[];
  matchedLength?: number;
  matchedHeights?: MatchedHeightsInfo;
}

export interface SmartSnapResult {
  point: Point2D;
  snapped: boolean;
  type: SnapPointType;
  label: string;
  symbol?: string;
  activeCandidateIndex: number;
  candidatesCount: number;
  guideLines: ActiveGuideLine[];
  matchedWallIds: string[];
  matchedHeights?: MatchedHeightsInfo;
}

export type CadTool = 
  | 'select' 
  | 'lasso'
  | 'hand' 
  | 'wall' 
  | 'rect_room' 
  | 'split'
  | 'wall_numeric' 
  | 'plot'
  | 'door' 
  | 'window' 
  | 'stairs' 
  | 'column' 
  | 'roof' 
  | 'room' 
  | 'furniture' 
  | 'electrical' 
  | 'dimension' 
  | 'text' 
  | 'shape_rect' 
  | 'shape_circle' 
  | 'shape_line' 
  | 'shape_freehand' 
  | 'eraser' 
  | 'bucket' 
  | 'eyedropper'
  | 'section_line';

export type SelectionCategory = 'wall' | 'door' | 'window' | 'stair' | 'column' | 'roof' | 'room' | 'furniture' | 'electrical' | 'dimension' | 'annotation' | 'shape' | 'plot';

export interface SelectionState {
  type: SelectionCategory | 'mixed' | 'none';
  ids: string[];
  items?: { id: string; type: SelectionCategory }[];
}

export interface MarqueeBox {
  start: Point2D;
  current: Point2D;
  isCrossing: boolean; // Left-to-right (false = Window, solid) vs Right-to-left (true = Crossing, dashed)
}

export type InspectorTab = 'properties' | 'library' | 'layers' | 'rooms';
