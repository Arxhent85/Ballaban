/**
 * Types for AI Plan Import & Computer Vision Architecture Extraction
 */

import { Point2D, WallMaterial, DoorType, WindowType, Room, Furniture, RoofType } from './cad';

export type PlanImageRole = 'floorplan' | 'elevation' | 'section' | 'site_plan';

export interface ImportImageItem {
  id: string;
  name: string;
  role: PlanImageRole;
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  rotationDeg: number;
  cropRect?: { x: number; y: number; width: number; height: number };
  perspectiveCorners?: {
    topLeft: Point2D;
    topRight: Point2D;
    bottomRight: Point2D;
    bottomLeft: Point2D;
  };
  filterSettings?: {
    brightness: number; // 0..200 (100 = normal)
    contrast: number;   // 0..200 (100 = normal)
    sketchMode: boolean; // black & white thresholding
  };
}

export interface CalibrationData {
  type: 'two_points' | 'total_width' | 'total_depth' | 'plan_dimension';
  pointA?: Point2D;
  pointB?: Point2D;
  pixelDistance?: number;
  realLengthM: number;
  pixelsPerMeter: number;
  isCalibrated: boolean;
}

export interface AiDetectedWall {
  id: string;
  startX: number; // In image coordinates or normalized 0..1000
  startY: number;
  endX: number;
  endY: number;
  thickness: number; // In meters
  height: number;    // In meters
  endHeight?: number;
  isExterior: boolean;
  material?: WallMaterial;
  confidence: number; // 0..1
  selected: boolean;
}

export interface AiDetectedDoor {
  id: string;
  wallIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: DoorType;
  swingDirection: 'left' | 'right';
  openDirection: 'inside' | 'outside';
  confidence: number;
  selected: boolean;
}

export interface AiDetectedWindow {
  id: string;
  wallIndex?: number;
  x: number;
  y: number;
  width: number;
  height: number;
  parapetHeight: number;
  type: WindowType;
  confidence: number;
  selected: boolean;
}

export interface AiDetectedRoom {
  id: string;
  name: string;
  category: Room['category'];
  polygon: Point2D[];
  areaM2?: number;
  confidence: number;
  selected: boolean;
}

export interface AiDetectedFurniture {
  id: string;
  name: string;
  type: string;
  category: Furniture['category'];
  catalogId?: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  rotation: number;
  confidence: number;
  selected: boolean;
}

export interface AiDetectedStair {
  id: string;
  type: 'straight' | 'L' | 'U' | 'spiral';
  x: number;
  y: number;
  width: number;
  length: number;
  rotation: number;
  confidence: number;
  selected: boolean;
}

export interface AiDetectedRoof {
  type: RoofType;
  pitchDegrees: number;
  ridgeHeight: number;
  ridgeDirection: 'horizontal' | 'vertical';
  confidence: number;
}

export interface AiDetectedDimension {
  id: string;
  label: string;
  valueMeters: number;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  confidence: number;
}

export interface AiPlanAnalysisResult {
  unit: 'm';
  imageWidth: number;
  imageHeight: number;
  northAngleDeg: number;
  detectedTotalWidthM?: number;
  detectedTotalDepthM?: number;
  walls: AiDetectedWall[];
  doors: AiDetectedDoor[];
  windows: AiDetectedWindow[];
  rooms: AiDetectedRoom[];
  furniture: AiDetectedFurniture[];
  stairs: AiDetectedStair[];
  roof?: AiDetectedRoof;
  readDimensions: AiDetectedDimension[];
  scalePxPerMeter: number;
  warnings: string[];
  rawResponse?: string;
  timestamp: string;
}

export interface AiImportOptions {
  autoStraightenWalls: boolean;
  roundDimensions: 'none' | '1cm' | '5cm';
  replaceWithLibraryFurniture: boolean;
  useDefaultWallThickness: boolean;
  exteriorWallThickness?: number;
  interiorWallThickness?: number;
  targetBuildingWidthM?: number;
  keepUnderlayInProject: boolean;
  targetDestination: 'new_project' | 'current_floor' | 'new_floor' | 'underlay_only';
  // Granular object selection
  includeWalls?: boolean;
  includeDoors?: boolean;
  includeWindows?: boolean;
  includeRooms?: boolean;
  includeFurniture?: boolean;
  includeStairs?: boolean;
}

export interface PlanQualityCheckItem {
  id: string;
  type: 'unconnected_wall' | 'unclosed_room' | 'room_without_door' | 'opening_outside_wall' | 'implausible_dimension' | 'info';
  title: string;
  description: string;
  location?: Point2D;
  severity: 'error' | 'warning' | 'info';
}

export type AiThinkingLevel = 'low' | 'medium' | 'high';

export interface AiDiagnosticData {
  timestamp: string;
  model: string;
  imageDimensions?: { width: number; height: number };
  imageSizeBytes?: number;
  durationSec: number;
  status: string; // e.g. "200 OK", "400 API_KEY_INVALID", etc.
  httpStatusCode?: number;
  errorCode?: string;
  errorMessage?: string;
  finishReason?: string; // "STOP", "MAX_TOKENS", "SAFETY", etc.
  tokenUsage?: {
    promptTokens?: number;
    candidatesTokens?: number;
    totalTokens?: number;
  };
  rawResponseSnippet?: string; // First 2000 chars of raw output (no keys)
  stagesCompleted?: string[];
  stepsCount?: { current: number; total: number };
}

export interface AiConnectionTestResult {
  overallSuccess: boolean;
  step1KeyValid: { success: boolean; message: string; details?: string };
  step2TextResponse: { success: boolean; message: string; details?: string };
  step3ImageResponse: { success: boolean; message: string; details?: string };
  modelsFound?: { id: string; name: string; description?: string }[];
}
