/**
 * Professional Architectural Export and Print Utilities (DIN 1356, DIN 277, WoFlV, VOB)
 * Supports Vector PDF (2-Page Construction & Permit Plan), DXF, Wavefront OBJ, and CSV Schedules.
 */

import { jsPDF } from 'jspdf';
import { CadProject, Floor } from '../types/cad';
import { getWallPolygon, calculatePlotMetrics } from './cadMath';
import { calculateCleanWallJunctions } from './cadWallJunctions';
import {
  analyzeArchitecturalPlan,
  getGermanDoorTypeLabel,
  getGermanWindowTypeLabel,
  getGermanRoomCategoryLabel,
  getGermanFloorFinishLabel,
  formatArchDim,
} from './cadArchitecturalPlan';

export interface ExportPdfOptions {
  paperSize: 'a4' | 'a3';
  orientation: 'landscape' | 'portrait';
  scale: '1:50' | '1:100' | '1:20';
  planStyle?: 'werkplan' | 'bauantrag';
  includeTitleBlock: boolean;
  includeLegend: boolean;
  includeNorthArrow: boolean;
  includeAutoDimensions?: boolean;
  includeRoomStamps?: boolean;
  includeWallHatching?: boolean;
  includeSectionCuts?: boolean;
  includeElevationMarkers?: boolean;
  includeStructuralAxes?: boolean;
  includeRoofOutline?: boolean;
}

/**
 * Helper to draw 45° diagonal DIN 1356 hatch lines inside an axis-aligned or general wall polygon.
 */
function drawWallHatchLines(
  doc: jsPDF,
  mmPts: number[][],
  spacingMm = 1.6,
  crossHatch = false
): void {
  if (mmPts.length < 3) return;
  const xs = mmPts.map((p) => p[0]);
  const ys = mmPts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = maxX - minX;
  const h = maxY - minY;
  if (w < 0.4 || h < 0.4) return;

  doc.setLineWidth(0.08);
  doc.setDrawColor(75, 70, 65);

  // Clip segment [x, y] with wall bounding box (fast & clean for architectural orthogonal/angled walls)
  const totalSpan = w + h;
  for (let d = spacingMm; d < totalSpan; d += spacingMm) {
    // Line x - minX + y - minY = d  => y = minY + d - (x - minX)
    const xStart = Math.max(minX, minX + d - h);
    const xEnd = Math.min(maxX, minX + d);
    const yStart = minY + d - (xStart - minX);
    const yEnd = minY + d - (xEnd - minX);
    if (xEnd > xStart + 0.1 || Math.abs(yEnd - yStart) > 0.1) {
      doc.line(xStart, yStart, xEnd, yEnd);
    }

    if (crossHatch) {
      // Opposite diagonal: (x - minX) - (y - minY) = d - h
      const cxStart = Math.max(minX, minX + d - h);
      const cxEnd = Math.min(maxX, minX + d);
      const cyStart = maxY - (d - (cxStart - minX));
      const cyEnd = maxY - (d - (cxEnd - minX));
      if (cxEnd > cxStart + 0.1 || Math.abs(cyEnd - cyStart) > 0.1) {
        doc.line(cxStart, cyStart, cxEnd, cyEnd);
      }
    }
  }
}

/**
 * Helper to draw an architectural 45° slash tick at a dimension point.
 */
function drawDimensionTick(doc: jsPDF, x: number, y: number, size = 1.1): void {
  doc.setLineWidth(0.32);
  doc.setDrawColor(20, 20, 20);
  doc.line(x - size, y + size, x + size, y - size);
}

export function exportProjectPdf(project: CadProject, floor: Floor, options: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 8;

  const showAutoDims = options.includeAutoDimensions !== false;
  const showRoomStamps = options.includeRoomStamps !== false;
  const showHatching = options.includeWallHatching !== false && options.planStyle !== 'bauantrag';
  const showSections = options.includeSectionCuts !== false;
  const showElevations = options.includeElevationMarkers !== false;
  const showAxes = options.includeStructuralAxes !== false;
  const showRoof = options.includeRoofOutline !== false;

  // Run full architectural analysis (detects enclosed rooms automatically if floor.rooms is empty!)
  const planAnalysis = analyzeArchitecturalPlan(
    floor.walls,
    floor.doors,
    floor.windows,
    floor.rooms,
    floor.storyHeight || 2.75,
    floor.floorElevation || 0.0,
    project.defaults
  );

  const effectiveRooms = planAnalysis.rooms;

  // ============================================================================
  // PAGE 1: ARCHITECTURAL CONSTRUCTION & PERMIT FLOOR PLAN (DIN 1356-1)
  // ============================================================================

  // Double CAD sheet border with DIN 824 fold marks
  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.45);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  doc.setLineWidth(0.15);
  doc.rect(margin - 1.5, margin - 1.5, pageWidth - 2 * margin + 3, pageHeight - 2 * margin + 3);

  // Compute bounding box of floor plan + margin for 3-tier exterior dimension chains
  let minX = 0, maxX = 12, minY = 0, maxY = 10;
  if (floor.walls.length > 0) {
    minX = Math.min(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
    maxX = Math.max(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
    minY = Math.min(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
    maxY = Math.max(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
  }

  const dimMarginM = showAutoDims ? 2.5 : 1.2;
  const planWidthM = Math.max(2, maxX - minX + dimMarginM * 2);
  const planHeightM = Math.max(2, maxY - minY + dimMarginM * 2);

  let mmPerMeter = 20; // 1:50 -> 20mm per meter
  if (options.scale === '1:100') mmPerMeter = 10;
  if (options.scale === '1:20') mmPerMeter = 50;

  const tbWidth = options.includeTitleBlock ? 92 : 0;
  const availWidth = pageWidth - 2 * margin - 16 - (options.orientation === 'landscape' ? tbWidth * 0.45 : 0);
  const availHeight = pageHeight - 2 * margin - 26;
  const scaleFit = Math.min(1, availWidth / (planWidthM * mmPerMeter), availHeight / (planHeightM * mmPerMeter));
  const finalScale = mmPerMeter * scaleFit;

  const centerWorldX = (minX + maxX) / 2;
  const centerWorldY = (minY + maxY) / 2;
  const drawCenterX = margin + 8 + availWidth / 2;
  const drawCenterY = margin + 10 + availHeight / 2;

  const startOffsetX = drawCenterX - centerWorldX * finalScale;
  const startOffsetY = drawCenterY - centerWorldY * finalScale;

  const toMmX = (wx: number) => startOffsetX + wx * finalScale;
  const toMmY = (wy: number) => startOffsetY + wy * finalScale;

  // 1. Structural Grid Axes (Achsraster 1, 2, 3... & A, B, C...)
  if (showAxes && planAnalysis.structuralAxes.length > 0) {
    for (const ax of planAnalysis.structuralAxes) {
      const x1 = toMmX(ax.start.x);
      const y1 = toMmY(ax.start.y);
      const x2 = toMmX(ax.end.x);
      const y2 = toMmY(ax.end.y);

      doc.setDrawColor(160, 165, 175);
      doc.setLineWidth(0.12);
      doc.setLineDashPattern([3.0, 1.2, 0.6, 1.2], 0);
      doc.line(x1, y1, x2, y2);
      doc.setLineDashPattern([], 0);

      // Axis bubble circle at start
      const r = 2.8;
      const bx = ax.orientation === 'vertical' ? x1 : x1 - r;
      const by = ax.orientation === 'vertical' ? y1 - r : y1;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(70, 80, 95);
      doc.setLineWidth(0.22);
      doc.circle(bx, by, r, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(40, 50, 65);
      doc.text(ax.label, bx, by + 0.8, { align: 'center' });
    }
  }

  // 2. Render Rooms & Floor Finishes
  effectiveRooms.forEach((r) => {
    if (r.polygon.length >= 3) {
      doc.setFillColor(250, 249, 246);
      const polyPts = r.polygon.map((p) => [toMmX(p.x), toMmY(p.y)]);
      const start = polyPts[0];
      const lines = polyPts.slice(1).map((p, idx) => {
        const prev = polyPts[idx];
        return [p[0] - prev[0], p[1] - prev[1]];
      });
      lines.push([start[0] - polyPts[polyPts.length - 1][0], start[1] - polyPts[polyPts.length - 1][1]]);
      doc.setDrawColor(225, 222, 215);
      doc.setLineWidth(0.1);
      doc.lines(lines, start[0], start[1], [1, 1], 'FD', true);
    }
  });

  // 3. Render Seamless Walls with DIN 1356-1 Material Hatching & Junction Cleanup
  // We calculate seamless wall junctions to eliminate internal seam lines at X-crossings, T-junctions, and L-corners!
  const cleanWallData = calculateCleanWallJunctions(floor.walls);

  // Pass A: Fill wall body and draw hatching (fill only, no border strokes)
  cleanWallData.walls.forEach(({ wall: w, poly: pts }) => {
    const mmPts = pts.map((p) => [toMmX(p.x), toMmY(p.y)]);

    if (showHatching) {
      // Light background fill + vector hatching lines
      if (w.isExterior) {
        doc.setFillColor(235, 232, 228);
      } else {
        doc.setFillColor(244, 242, 238);
      }
    } else {
      // Solid fill for Bauantrag 1:100 style
      if (w.isExterior) {
        doc.setFillColor(45, 42, 40);
      } else {
        doc.setFillColor(115, 110, 105);
      }
    }

    const start = mmPts[0];
    const lines = [
      [mmPts[1][0] - mmPts[0][0], mmPts[1][1] - mmPts[0][1]],
      [mmPts[2][0] - mmPts[1][0], mmPts[2][1] - mmPts[1][1]],
      [mmPts[3][0] - mmPts[2][0], mmPts[3][1] - mmPts[2][1]],
      [mmPts[0][0] - mmPts[3][0], mmPts[0][1] - mmPts[3][1]],
    ];
    doc.lines(lines, start[0], start[1], [1, 1], 'F', true);

    if (showHatching) {
      const isConcrete = w.material === 'concrete';
      drawWallHatchLines(doc, mmPts, w.isExterior ? 1.5 : 1.8, isConcrete);
    }
  });

  // Pass B: Stroke ONLY clean exposed boundaries (ZERO internal cross lines at X-crossings or T-junctions!)
  cleanWallData.allBoundarySegments.forEach((seg) => {
    doc.setDrawColor(15, 15, 15);
    doc.setLineWidth(seg.isJointLine ? 0.15 : seg.isExterior ? 0.35 : 0.24);
    doc.line(toMmX(seg.start.x), toMmY(seg.start.y), toMmX(seg.end.x), toMmY(seg.end.y));
  });

  // 4. Render Doors (Cutout, Jambs, Leaf, Swing Arc, Pos Badge & Rohbaumaß)
  floor.doors.forEach((d, idx) => {
    const parentWall = floor.walls.find((w) => w.id === d.wallId);
    if (!parentWall) return;

    const wDx = parentWall.end.x - parentWall.start.x;
    const wDy = parentWall.end.y - parentWall.start.y;
    const wLen = Math.hypot(wDx, wDy);
    if (wLen < 1e-3) return;

    const ux = wDx / wLen;
    const uy = wDy / wLen;
    const nx = -uy;
    const ny = ux;

    const cx = parentWall.start.x + wDx * d.position;
    const cy = parentWall.start.y + wDy * d.position;
    const halfW = d.width / 2;

    const sP1x = toMmX(cx - ux * halfW);
    const sP1y = toMmY(cy - uy * halfW);
    const sP2x = toMmX(cx + ux * halfW);
    const sP2y = toMmY(cy + uy * halfW);
    const wallThickMm = (parentWall.thickness || 0.30) * finalScale;

    // White opening cutout over wall
    const cutPts = [
      [sP1x - nx * (wallThickMm / 2), sP1y - ny * (wallThickMm / 2)],
      [sP2x - nx * (wallThickMm / 2), sP2y - ny * (wallThickMm / 2)],
      [sP2x + nx * (wallThickMm / 2), sP2y + ny * (wallThickMm / 2)],
      [sP1x + nx * (wallThickMm / 2), sP1y + ny * (wallThickMm / 2)],
    ];
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.1);
    doc.lines(
      [
        [cutPts[1][0] - cutPts[0][0], cutPts[1][1] - cutPts[0][1]],
        [cutPts[2][0] - cutPts[1][0], cutPts[2][1] - cutPts[1][1]],
        [cutPts[3][0] - cutPts[2][0], cutPts[3][1] - cutPts[2][1]],
        [cutPts[0][0] - cutPts[3][0], cutPts[0][1] - cutPts[3][1]],
      ],
      cutPts[0][0],
      cutPts[0][1],
      [1, 1],
      'F',
      true
    );

    // Jamb lines
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.25);
    doc.line(cutPts[0][0], cutPts[0][1], cutPts[3][0], cutPts[3][1]);
    doc.line(cutPts[1][0], cutPts[1][1], cutPts[2][0], cutPts[2][1]);

    // Door Leaf & Swing Arc
    const hingeAtStart = d.swingDirection === 'left';
    const hingeX = hingeAtStart ? sP1x : sP2x;
    const hingeY = hingeAtStart ? sP1y : sP2y;
    const swingRadius = d.width * finalScale;
    const leafDx = nx * swingRadius;
    const leafDy = ny * swingRadius;

    doc.setLineWidth(0.28);
    doc.setDrawColor(20, 20, 20);
    doc.line(hingeX, hingeY, hingeX + leafDx, hingeY + leafDy);

    doc.setLineWidth(0.12);
    doc.setLineDashPattern([0.8, 0.8], 0);
    const steps = 12;
    for (let k = 0; k < steps; k++) {
      const a1 = (k / steps) * (Math.PI / 2);
      const a2 = ((k + 1) / steps) * (Math.PI / 2);
      const sx1 = hingeX + (hingeAtStart ? ux : -ux) * Math.cos(a1) * swingRadius + nx * Math.sin(a1) * swingRadius;
      const sy1 = hingeY + (hingeAtStart ? uy : -uy) * Math.cos(a1) * swingRadius + ny * Math.sin(a1) * swingRadius;
      const sx2 = hingeX + (hingeAtStart ? ux : -ux) * Math.cos(a2) * swingRadius + nx * Math.sin(a2) * swingRadius;
      const sy2 = hingeY + (hingeAtStart ? uy : -uy) * Math.cos(a2) * swingRadius + ny * Math.sin(a2) * swingRadius;
      doc.line(sx1, sy1, sx2, sy2);
    }
    doc.setLineDashPattern([], 0);

    // Door Tag & Opening Dimension (e.g. "T1: 88,5/205")
    const midX = (sP1x + sP2x) / 2 + nx * (swingRadius * 0.42);
    const midY = (sP1y + sP2y) / 2 + ny * (swingRadius * 0.42);
    const wCm = Math.round(d.width * 1000) / 10;
    const hCm = Math.round(d.height * 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(30, 30, 30);
    doc.text(`T${idx + 1}`, midX, midY - 0.5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(4.8);
    doc.text(`${String(wCm).replace('.', ',')}/${hCm}`, midX, midY + 1.5, { align: 'center' });
  });

  // 5. Render Windows (Cutout, 3-line glazing, Pos Badge & BRH)
  floor.windows.forEach((win, idx) => {
    const parentWall = floor.walls.find((w) => w.id === win.wallId);
    if (!parentWall) return;

    const wDx = parentWall.end.x - parentWall.start.x;
    const wDy = parentWall.end.y - parentWall.start.y;
    const wLen = Math.hypot(wDx, wDy);
    if (wLen < 1e-3) return;

    const ux = wDx / wLen;
    const uy = wDy / wLen;
    const nx = -uy;
    const ny = ux;

    const cx = parentWall.start.x + wDx * win.position;
    const cy = parentWall.start.y + wDy * win.position;
    const halfW = win.width / 2;

    const sP1x = toMmX(cx - ux * halfW);
    const sP1y = toMmY(cy - uy * halfW);
    const sP2x = toMmX(cx + ux * halfW);
    const sP2y = toMmY(cy + uy * halfW);
    const wallThickMm = (parentWall.thickness || 0.30) * finalScale;

    // White cutout over wall
    const cutPts = [
      [sP1x - nx * (wallThickMm / 2), sP1y - ny * (wallThickMm / 2)],
      [sP2x - nx * (wallThickMm / 2), sP2y - ny * (wallThickMm / 2)],
      [sP2x + nx * (wallThickMm / 2), sP2y + ny * (wallThickMm / 2)],
      [sP1x + nx * (wallThickMm / 2), sP1y + ny * (wallThickMm / 2)],
    ];
    doc.setFillColor(255, 255, 255);
    doc.lines(
      [
        [cutPts[1][0] - cutPts[0][0], cutPts[1][1] - cutPts[0][1]],
        [cutPts[2][0] - cutPts[1][0], cutPts[2][1] - cutPts[1][1]],
        [cutPts[3][0] - cutPts[2][0], cutPts[3][1] - cutPts[2][1]],
        [cutPts[0][0] - cutPts[3][0], cutPts[0][1] - cutPts[3][1]],
      ],
      cutPts[0][0],
      cutPts[0][1],
      [1, 1],
      'F',
      true
    );

    // Jambs & Sills
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.22);
    doc.line(cutPts[0][0], cutPts[0][1], cutPts[3][0], cutPts[3][1]);
    doc.line(cutPts[1][0], cutPts[1][1], cutPts[2][0], cutPts[2][1]);
    doc.setLineWidth(0.14);
    doc.line(cutPts[0][0], cutPts[0][1], cutPts[1][0], cutPts[1][1]);
    doc.line(cutPts[3][0], cutPts[3][1], cutPts[2][0], cutPts[2][1]);

    // Center Glazing Line
    doc.setDrawColor(30, 85, 200);
    doc.setLineWidth(0.25);
    doc.line(sP1x, sP1y, sP2x, sP2y);

    // Window Tag & BRH annotation
    const midX = (sP1x + sP2x) / 2 - nx * (wallThickMm / 2 + 2.8);
    const midY = (sP1y + sP2y) / 2 - ny * (wallThickMm / 2 + 2.8);
    const wCm = Math.round(win.width * 100);
    const hCm = Math.round(win.height * 100);
    const brhCm = Math.round((win.parapetHeight || 0) * 100);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.0);
    doc.setTextColor(25, 55, 130);
    doc.text(`F${idx + 1}: ${wCm}/${hCm} (BRH ${brhCm})`, midX, midY, { align: 'center' });
  });

  // 6. Render Stairs (DIN 18065 Step treads, walking line & step ratio)
  floor.stairs.forEach((stair) => {
    const sX = toMmX(stair.x);
    const sY = toMmY(stair.y);
    const sW = stair.width * finalScale;
    const sL = stair.length * finalScale;
    const steps = stair.stepCount || 15;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.22);
    doc.rect(sX, sY, sW, sL, 'FD');

    doc.setLineWidth(0.12);
    const stepDepth = sL / steps;
    for (let i = 1; i < steps; i++) {
      doc.line(sX, sY + i * stepDepth, sX + sW, sY + i * stepDepth);
    }

    const midX = sX + sW / 2;
    doc.setLineWidth(0.2);
    doc.setDrawColor(190, 30, 30);
    doc.circle(midX, sY + sL - 1.8, 0.7, 'FD');
    doc.line(midX, sY + sL - 1.8, midX, sY + 2.5);
    doc.triangle(midX, sY + 1.2, midX - 0.9, sY + 3.0, midX + 0.9, sY + 3.0, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.0);
    doc.setTextColor(30, 30, 30);
    doc.text(`${steps} Stg. 18,3/27 cm`, midX, sY + sL / 2, { align: 'center' });
  });

  // 7. Render DIN 277 Architectural Room Stamps (Raumstempel)
  if (showRoomStamps) {
    effectiveRooms.forEach((r, idx) => {
      if (r.polygon.length < 3) return;
      const cx = r.polygon.reduce((acc, p) => acc + p.x, 0) / r.polygon.length;
      const cy = r.polygon.reduce((acc, p) => acc + p.y, 0) / r.polygon.length;
      const stampX = toMmX(cx);
      const stampY = toMmY(cy);

      const roomNo = `0.${String(idx + 1).padStart(2, '0')}`;
      const finishLabel = getGermanFloorFinishLabel(r.floorFinish).split(' ')[0];
      const bW = 28;
      const bH = 12.5;

      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(90, 90, 95);
      doc.setLineWidth(0.18);
      doc.roundedRect(stampX - bW / 2, stampY - bH / 2, bW, bH, 1.0, 1.0, 'FD');
      doc.line(stampX - bW / 2, stampY - bH / 2 + 4.2, stampX + bW / 2, stampY - bH / 2 + 4.2);

      // Header: Room No + Name
      doc.setTextColor(15, 15, 15);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.2);
      const titleStr = `${roomNo} ${r.name}`.slice(0, 20);
      doc.text(titleStr, stampX, stampY - bH / 2 + 3.0, { align: 'center' });

      // Line 2: Net Area (NRF)
      doc.setFontSize(6.5);
      doc.setTextColor(15, 80, 50);
      doc.text(`NRF: ${r.areaM2.toFixed(2).replace('.', ',')} m²`, stampX, stampY + 1.4, { align: 'center' });

      // Line 3: Floor finish & clear height
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.0);
      doc.setTextColor(75, 75, 80);
      doc.text(`${finishLabel} | LH ${r.height.toFixed(2).replace('.', ',')}m`, stampX, stampY + 4.8, { align: 'center' });
    });
  }

  // 8. Render Roof Overhang Projection (Dachaufsicht gestrichelt nach DIN 1356)
  if (showRoof && planAnalysis.footprintPolygon.length >= 4) {
    const activeRoof = floor.roofs && floor.roofs.length > 0 ? floor.roofs[0] : null;
    const overhangM = activeRoof ? activeRoof.overhang || 0.40 : 0.40;
    const pitchDeg = activeRoof ? activeRoof.pitchDegrees || 25 : 25;

    const rx1 = toMmX(minX - overhangM);
    const ry1 = toMmY(minY - overhangM);
    const rx2 = toMmX(maxX + overhangM);
    const ry2 = toMmY(maxY + overhangM);

    doc.setDrawColor(120, 70, 30);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([2.2, 1.4], 0);
    doc.rect(rx1, ry1, rx2 - rx1, ry2 - ry1, 'S');

    // Ridge line (Firstlinie)
    const ridgeY = (ry1 + ry2) / 2;
    doc.setLineDashPattern([3.5, 1.2, 0.8, 1.2], 0);
    doc.line(rx1, ridgeY, rx2, ridgeY);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.2);
    doc.setTextColor(120, 70, 30);
    doc.text(`Dachüberstand ${(overhangM * 100).toFixed(0)} cm | First DN ${pitchDeg}°`, rx1 + 3, ry1 + 2.5);
  }

  // 9. Render Section Cut Lines (Schnittführung A-A & B-B nach DIN 1356)
  if (showSections && planAnalysis.sectionCuts.length > 0) {
    for (const sc of planAnalysis.sectionCuts) {
      const x1 = toMmX(sc.start.x);
      const y1 = toMmY(sc.start.y);
      const x2 = toMmX(sc.end.x);
      const y2 = toMmY(sc.end.y);

      doc.setDrawColor(180, 25, 25);
      doc.setLineWidth(0.22);
      doc.setLineDashPattern([4.5, 1.5, 0.8, 1.5], 0);
      doc.line(x1, y1, x2, y2);
      doc.setLineDashPattern([], 0);

      // End callout badges
      doc.setFillColor(180, 25, 25);
      doc.circle(x1, y1, 2.2, 'F');
      doc.circle(x2, y2, 2.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.0);
      doc.setTextColor(255, 255, 255);
      doc.text(sc.label, x1, y1 + 0.7, { align: 'center' });
      doc.text(sc.label, x2, y2 + 0.7, { align: 'center' });
    }
  }

  // 10. Render Level Elevation Markers (Höhenkoten OKFF ±0,00 m / GOK)
  if (showElevations && planAnalysis.elevationMarkers.length > 0) {
    for (const em of planAnalysis.elevationMarkers) {
      const ex = toMmX(em.position.x);
      const ey = toMmY(em.position.y);
      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.2);
      doc.circle(ex, ey, 1.6, 'S');
      doc.line(ex - 2.2, ey, ex + 2.2, ey);
      doc.line(ex, ey - 2.2, ex, ey + 2.2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.2);
      doc.setTextColor(20, 20, 20);
      doc.text(em.elevationText, ex + 2.6, ey + 0.6);
    }
  }

  // 11. Render 3-Tier Automated Exterior Dimension Chains (DIN 1356-1 & DIN 406)
  if (showAutoDims && planAnalysis.dimensionChains.length > 0) {
    for (const seg of planAnalysis.dimensionChains) {
      const x1 = toMmX(seg.start.x);
      const y1 = toMmY(seg.start.y);
      const x2 = toMmX(seg.end.x);
      const y2 = toMmY(seg.end.y);
      const wx1 = toMmX(seg.witnessStart1.x);
      const wy1 = toMmY(seg.witnessStart1.y);
      const wx2 = toMmX(seg.witnessStart2.x);
      const wy2 = toMmY(seg.witnessStart2.y);

      // Witness / Extension lines (Maßhilfslinien)
      doc.setDrawColor(110, 110, 115);
      doc.setLineWidth(0.1);
      doc.line(wx1, wy1, x1, y1);
      doc.line(wx2, wy2, x2, y2);

      // Dimension line (Maßlinie)
      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(seg.tier === 3 ? 0.22 : 0.15);
      doc.line(x1, y1, x2, y2);

      // 45° Architectural Slash Ticks (Maßlinienbegrenzung)
      drawDimensionTick(doc, x1, y1, 0.95);
      drawDimensionTick(doc, x2, y2, 0.95);

      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2;
      const isHorizontal = seg.side === 'north' || seg.side === 'south';

      doc.setFont('helvetica', seg.tier === 3 ? 'bold' : 'normal');
      doc.setFontSize(seg.tier === 3 ? 6.2 : 5.4);
      doc.setTextColor(15, 15, 15);

      if (isHorizontal) {
        doc.text(seg.label, mx, my - 0.9, { align: 'center' });
        if (seg.subLabel) {
          doc.setFontSize(4.5);
          doc.setTextColor(70, 70, 75);
          doc.text(seg.subLabel, mx, my + 2.3, { align: 'center' });
        }
      } else {
        // Vertical side: offset text cleanly to left/right of dimension line
        const xOff = seg.side === 'west' ? -1.4 : 1.4;
        const alignMode = seg.side === 'west' ? 'right' : 'left';
        doc.text(seg.label, mx + xOff, my + 0.5, { align: alignMode });
        if (seg.subLabel) {
          doc.setFontSize(4.4);
          doc.setTextColor(70, 70, 75);
          doc.text(seg.subLabel, mx + xOff, my + 2.4, { align: alignMode });
        }
      }
    }
  }

  // 12. Render Manual User Dimensions
  floor.dimensions.forEach((dim) => {
    const x1 = toMmX(dim.start.x);
    const y1 = toMmY(dim.start.y);
    const x2 = toMmX(dim.end.x);
    const y2 = toMmY(dim.end.y);

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.2);
    doc.line(x1, y1, x2, y2);
    drawDimensionTick(doc, x1, y1, 1.1);
    drawDimensionTick(doc, x2, y2, 1.1);

    if (dim.label) {
      doc.setTextColor(15, 15, 15);
      doc.setFontSize(6.2);
      doc.setFont('helvetica', 'bold');
      doc.text(dim.label, (x1 + x2) / 2, (y1 + y2) / 2 - 1.2, { align: 'center' });
    }
  });

  // 13. North Arrow (DIN 1356 with True Rotation)
  if (options.includeNorthArrow) {
    const naX = margin + 12;
    const naY = margin + 16;
    const r = 5.5;
    const angleRad = ((project.northAngle || 0) * Math.PI) / 180;

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.3);
    doc.circle(naX, naY, r);

    const tipX = naX + Math.sin(angleRad) * (r - 0.5);
    const tipY = naY - Math.cos(angleRad) * (r - 0.5);
    const b1x = naX - Math.sin(angleRad) * 1.8 + Math.cos(angleRad) * 2.2;
    const b1y = naY + Math.cos(angleRad) * 1.8 + Math.sin(angleRad) * 2.2;
    const b2x = naX - Math.sin(angleRad) * 1.8 - Math.cos(angleRad) * 2.2;
    const b2y = naY + Math.cos(angleRad) * 1.8 - Math.sin(angleRad) * 2.2;

    doc.setFillColor(20, 20, 20);
    doc.triangle(tipX, tipY, b1x, b1y, b2x, b2y, 'FD');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    const lblX = naX + Math.sin(angleRad) * (r + 3.2);
    const lblY = naY - Math.cos(angleRad) * (r + 3.2) + 1.8;
    doc.text('N', lblX, lblY, { align: 'center' });
  }

  // 14. Graphic Scale Bar (DIN Maßstabsbalken 0 - 5 m)
  const barX = margin + 10;
  const barY = pageHeight - margin - 14;
  const barH = 1.8;
  const m1 = finalScale;

  doc.setFontSize(5.8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`Maßstab ${options.scale} (im Originalformat ${options.paperSize.toUpperCase()})`, barX, barY - 2.2);

  doc.setLineWidth(0.15);
  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  doc.rect(barX, barY, m1, barH, 'FD');
  doc.setFillColor(255, 255, 255);
  doc.rect(barX + m1, barY, m1, barH, 'FD');
  doc.setFillColor(0, 0, 0);
  doc.rect(barX + 2 * m1, barY, 3 * m1, barH, 'FD');

  doc.text('0', barX - 0.8, barY + barH + 2.6);
  doc.text('1 m', barX + m1 - 1.8, barY + barH + 2.6);
  doc.text('2 m', barX + 2 * m1 - 1.8, barY + barH + 2.6);
  doc.text('5 m', barX + 5 * m1 - 1.8, barY + barH + 2.6);

  // 15. Plan-Legende & Abkürzungen
  if (options.includeLegend) {
    const legX = barX;
    const legY = barY - 14;
    doc.setFontSize(5.2);
    doc.setTextColor(80, 80, 85);
    doc.setFont('helvetica', 'bold');
    doc.text('LEGENDE & PLANZEICHEN (DIN 1356):', legX, legY);
    doc.setFont('helvetica', 'normal');
    doc.text('AW = Außenwand | IW = Innenwand | BRH = Brüstungshöhe | STH = Sturzhöhe', legX, legY + 2.8);
    doc.text('OKFF = Oberkante Fertigfußboden (±0,00 m) | UKRD = Unterkante Rohdecke | NRF = Netto-Raumfläche', legX, legY + 5.4);
    doc.text('Schraffur 45°: Mauerwerk / Ziegel | Schraffur Kreuz: Stahlbeton C25/30', legX, legY + 8.0);
  }

  // 16. Professional Title Block (Plankopf nach DIN EN ISO 7200 & DIN 1356)
  if (options.includeTitleBlock) {
    const tbW = 95;
    const tbH = 34;
    const tbX = pageWidth - margin - tbW;
    const tbY = pageHeight - margin - tbH;

    doc.setFillColor(252, 252, 254);
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.35);
    doc.rect(tbX, tbY, tbW, tbH, 'FD');

    doc.setLineWidth(0.18);
    doc.line(tbX, tbY + 8, tbX + tbW, tbY + 8);
    doc.line(tbX, tbY + 16, tbX + tbW, tbY + 16);
    doc.line(tbX, tbY + 24, tbX + tbW, tbY + 24);
    doc.line(tbX + 54, tbY + 16, tbX + 54, tbY + tbH);

    // Row 1: Project Name
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 15, 15);
    doc.text((project.titleBlock.projectName || project.name || 'Ferienhaus Neubau').slice(0, 38), tbX + 2.5, tbY + 5.5);

    // Row 2: Client & Location
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text(`Bauherr: ${project.titleBlock.clientName || 'Familie Weber'}`, tbX + 2.5, tbY + 11.5);
    doc.text(`Bauort: ${project.titleBlock.siteAddress || 'Seeweg 14, 83684 Tegernsee'}`, tbX + 2.5, tbY + 14.5);

    // Row 3: Plan Content & Scale
    const planTypeLabel = options.planStyle === 'bauantrag' ? 'Bauantragsplan' : 'Werk- & Ausführungsplan';
    doc.setFont('helvetica', 'bold');
    doc.text(`Inhalt: ${floor.name} (${planTypeLabel})`, tbX + 2.5, tbY + 19.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Maßstab: ${options.scale} | Format: ${options.paperSize.toUpperCase()}`, tbX + 2.5, tbY + 22.5);

    // Row 4: Date, Author & Sheet/Revision
    doc.text(`Datum: ${project.titleBlock.date || new Date().toLocaleDateString('de-DE')}`, tbX + 2.5, tbY + 27.5);
    doc.text(`Planer: ${project.titleBlock.author || 'Architekturbüro CAD-Studio'}`, tbX + 2.5, tbY + 31.0);

    doc.setFont('helvetica', 'bold');
    doc.text(`Blatt: ${project.titleBlock.sheetNumber || 'A-101'}`, tbX + 56.5, tbY + 27.5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Index: ${project.titleBlock.revision || '0'}`, tbX + 56.5, tbY + 31.0);

    // Disclaimer line under title block
    doc.setFontSize(4.4);
    doc.setTextColor(100, 100, 105);
    doc.text(
      'Maße vor Ausführung am Bau eigenverantwortlich prüfen. Rohbaumaße in m bzw. cm. Höhenkoten bezogen auf OKFF EG = ±0,00 m.',
      tbX - 45,
      pageHeight - margin + 2.2,
      { align: 'right' }
    );
  }

  // ============================================================================
  // PAGE 2: OFFICIAL CALCULATION & SCHEDULES (DIN 277, WoFlV, VOB)
  // ============================================================================
  doc.addPage(options.paperSize, options.orientation);

  doc.setDrawColor(30, 30, 30);
  doc.setLineWidth(0.45);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);
  doc.setLineWidth(0.15);
  doc.rect(margin - 1.5, margin - 1.5, pageWidth - 2 * margin + 3, pageHeight - 2 * margin + 3);

  // Header Banner
  doc.setFillColor(242, 243, 247);
  doc.rect(margin, margin, pageWidth - 2 * margin, 17, 'F');
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.2);
  doc.line(margin, margin + 17, pageWidth - margin, margin + 17);

  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text('FLÄCHENBERECHNUNG & BAUTEILVERZEICHNISSE (DIN 277 / WoFlV / VOB)', margin + 5, margin + 7.5);

  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 75);
  doc.text(
    `Projekt: ${project.name} | Geschoss: ${floor.name} | Geschosshöhe: ${(floor.storyHeight || 2.75).toFixed(2).replace('.', ',')} m | Datum: ${project.titleBlock.date || new Date().toLocaleDateString('de-DE')}`,
    margin + 5,
    margin + 13.5
  );

  // 6 KPI Summary Cards (Wohnfläche, NRF, BGF, KGF, BRI, Wandlänge)
  const kpiY = margin + 21;
  const numKpis = 6;
  const kpiW = (pageWidth - 2 * margin - 14) / numKpis;

  const kpis = [
    { title: 'Wohnfläche (WoFlV)', val: `${planAnalysis.livingAreaM2.toFixed(2).replace('.', ',')} m²`, note: 'Netto anrechenbar' },
    { title: 'Netto-Raumfläche (NRF)', val: `${planAnalysis.nrfM2.toFixed(2).replace('.', ',')} m²`, note: 'DIN 277 Innenmaß' },
    { title: 'Brutto-Grundfläche (BGF)', val: `${planAnalysis.bgfM2.toFixed(1).replace('.', ',')} m²`, note: 'Außenwandumriss' },
    { title: 'Konstruktionsfläche (KGF)', val: `${planAnalysis.kgfM2.toFixed(1).replace('.', ',')} m²`, note: 'Wandanteil Grundriss' },
    { title: 'Brutto-Rauminhalt (BRI)', val: `${planAnalysis.briM3.toFixed(1).replace('.', ',')} m³`, note: 'Rauminhalt BGF × H' },
    { title: 'Wandabwicklung gesamt', val: `${planAnalysis.totalWallLengthM.toFixed(1).replace('.', ',')} m`, note: `${planAnalysis.exteriorWallLengthM.toFixed(0)}m AW / ${planAnalysis.interiorWallLengthM.toFixed(0)}m IW` },
  ];

  kpis.forEach((kpi, idx) => {
    const kX = margin + 3 + idx * (kpiW + 1.8);
    doc.setFillColor(252, 252, 254);
    doc.setDrawColor(205, 208, 215);
    doc.setLineWidth(0.16);
    doc.roundedRect(kX, kpiY, kpiW, 14.5, 1.2, 1.2, 'FD');

    doc.setFontSize(5.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 95, 105);
    doc.text(kpi.title, kX + 2.5, kpiY + 4.2);

    doc.setFontSize(8.6);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 20, 25);
    doc.text(kpi.val, kX + 2.5, kpiY + 9.5);

    doc.setFontSize(4.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 125, 135);
    doc.text(kpi.note, kX + 2.5, kpiY + 13.0);
  });

  // Table 1: Raumbuch & Flächenaufstellung nach DIN 277 / WoFlV
  let tableY = kpiY + 19;
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text('1. Raumbuch & Flächenaufstellung nach DIN 277 / WoFlV', margin + 4, tableY);

  tableY += 3.5;
  doc.setFillColor(236, 238, 244);
  doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 50, 60);

  const colR = [margin + 6, margin + 20, margin + 65, margin + 115, margin + 140, margin + 165, margin + 195, margin + 235];
  doc.text('Pos.', colR[0], tableY + 3.8);
  doc.text('Raumbezeichnung', colR[1], tableY + 3.8);
  doc.text('DIN 277 Nutzungskategorie', colR[2], tableY + 3.8);
  doc.text('Nettofläche (m²)', colR[3], tableY + 3.8, { align: 'right' });
  doc.text('WoFlV (m²)', colR[4], tableY + 3.8, { align: 'right' });
  doc.text('Umfang (m)', colR[5], tableY + 3.8, { align: 'right' });
  doc.text('Lichte Höhe (m)', colR[6], tableY + 3.8, { align: 'right' });
  doc.text('Bodenbelag', colR[7], tableY + 3.8);

  tableY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(25, 25, 30);

  let sumNrf = 0;
  let sumWofl = 0;

  effectiveRooms.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 254);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 4.4, 'F');
    }
    const nrf = r.areaM2;
    const wofl = r.targetLivingArea !== false ? (r.category === 'outdoor' ? nrf * 0.5 : nrf) : 0;
    sumNrf += nrf;
    sumWofl += wofl;

    doc.text(`0.${String(idx + 1).padStart(2, '0')}`, colR[0], tableY + 3.2);
    doc.text(r.name, colR[1], tableY + 3.2);
    doc.text(getGermanRoomCategoryLabel(r.category), colR[2], tableY + 3.2);
    doc.text(`${nrf.toFixed(2).replace('.', ',')} m²`, colR[3], tableY + 3.2, { align: 'right' });
    doc.text(`${wofl.toFixed(2).replace('.', ',')} m²`, colR[4], tableY + 3.2, { align: 'right' });
    doc.text(`${(r.perimeterM || 0).toFixed(2).replace('.', ',')} m`, colR[5], tableY + 3.2, { align: 'right' });
    doc.text(`${(r.height || 2.5).toFixed(2).replace('.', ',')} m`, colR[6], tableY + 3.2, { align: 'right' });
    doc.text(getGermanFloorFinishLabel(r.floorFinish), colR[7], tableY + 3.2);

    tableY += 4.4;
  });

  // Table 1 Totals Row
  doc.setFillColor(242, 244, 248);
  doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5.0, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.8);
  doc.text('SUMME GESCHOSS:', colR[1], tableY + 3.5);
  doc.text(`${sumNrf.toFixed(2).replace('.', ',')} m²`, colR[3], tableY + 3.5, { align: 'right' });
  doc.text(`${sumWofl.toFixed(2).replace('.', ',')} m²`, colR[4], tableY + 3.5, { align: 'right' });
  tableY += 8;

  // Table 2: Wand- & Mauerwerksverzeichnis (DIN 1053 / GEG)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text('2. Wand- & Mauerwerksverzeichnis (DIN 1053 / GEG U-Werte)', margin + 4, tableY);

  tableY += 3.5;
  doc.setFillColor(236, 238, 244);
  doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 50, 60);

  const colW = [margin + 6, margin + 22, margin + 70, margin + 125, margin + 150, margin + 175, margin + 205, margin + 235];
  doc.text('Pos.', colW[0], tableY + 3.8);
  doc.text('Kategorie / Bauteil', colW[1], tableY + 3.8);
  doc.text('Baustoff / Konstruktion', colW[2], tableY + 3.8);
  doc.text('Dicke', colW[3], tableY + 3.8, { align: 'right' });
  doc.text('Länge (m)', colW[4], tableY + 3.8, { align: 'right' });
  doc.text('Wandfläche (m²)', colW[5], tableY + 3.8, { align: 'right' });
  doc.text('Volumen (m³)', colW[6], tableY + 3.8, { align: 'right' });
  doc.text('U-Wert (W/m²K)', colW[7], tableY + 3.8);

  tableY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(25, 25, 30);

  planAnalysis.wallSchedule.forEach((ws, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 254);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 4.4, 'F');
    }
    doc.text(ws.pos, colW[0], tableY + 3.2);
    doc.text(ws.category, colW[1], tableY + 3.2);
    doc.text(ws.materialName, colW[2], tableY + 3.2);
    doc.text(`${ws.thicknessCm.toFixed(1).replace('.', ',')} cm`, colW[3], tableY + 3.2, { align: 'right' });
    doc.text(`${ws.totalLengthM.toFixed(2).replace('.', ',')} m`, colW[4], tableY + 3.2, { align: 'right' });
    doc.text(`${ws.netAreaM2.toFixed(2).replace('.', ',')} m²`, colW[5], tableY + 3.2, { align: 'right' });
    doc.text(`${ws.volumeM3.toFixed(2).replace('.', ',')} m³`, colW[6], tableY + 3.2, { align: 'right' });
    doc.text(ws.uValue, colW[7], tableY + 3.2);
    tableY += 4.4;
  });
  tableY += 4;

  // Table 3: Fenster- & Türenverzeichnis (VOB / DIN 18299)
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 15, 15);
  doc.text('3. Fenster- & Türenverzeichnis (VOB / DIN 18299)', margin + 4, tableY);

  tableY += 3.5;
  doc.setFillColor(236, 238, 244);
  doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5.5, 'F');
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 50, 60);

  const colO = [margin + 6, margin + 22, margin + 85, margin + 130, margin + 165, margin + 215, margin + 245];
  doc.text('Pos.', colO[0], tableY + 3.8);
  doc.text('Bauteil / Element', colO[1], tableY + 3.8);
  doc.text('Typ / Ausführung (Deutsch)', colO[2], tableY + 3.8);
  doc.text('Rohbaumaß (cm)', colO[3], tableY + 3.8, { align: 'right' });
  doc.text('BRH / Sturz (cm)', colO[4], tableY + 3.8, { align: 'right' });
  doc.text('Anschlag / Verglasung', colO[5], tableY + 3.8);
  doc.text('Anzahl', colO[6], tableY + 3.8);

  tableY += 5.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(25, 25, 30);

  // Windows in Schedule
  floor.windows.forEach((win, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 251, 254);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 4.4, 'F');
    }
    const wCm = Math.round(win.width * 100);
    const hCm = Math.round(win.height * 100);
    const brhCm = Math.round((win.parapetHeight || 0) * 100);
    const sthCm = brhCm + hCm;
    const isFloorToCeil = brhCm === 0;

    doc.text(`F${idx + 1}`, colO[0], tableY + 3.2);
    doc.text(win.name || `Fenster ${idx + 1}`, colO[1], tableY + 3.2);
    doc.text(getGermanWindowTypeLabel(win.type), colO[2], tableY + 3.2);
    doc.text(`${wCm} × ${hCm} cm`, colO[3], tableY + 3.2, { align: 'right' });
    doc.text(`BRH ${brhCm} / STH ${sthCm}`, colO[4], tableY + 3.2, { align: 'right' });
    doc.text(`${win.glazing || '3'}-fach Isolierglas (Ug 0.6)${isFloorToCeil ? ' + VSG' : ''}`, colO[5], tableY + 3.2);
    doc.text('1 Stk.', colO[6], tableY + 3.2);
    tableY += 4.4;
  });

  // Doors in Schedule
  floor.doors.forEach((door, idx) => {
    const rowIdx = floor.windows.length + idx;
    if (rowIdx % 2 === 1) {
      doc.setFillColor(250, 251, 254);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 4.4, 'F');
    }
    const wCm = Math.round(door.width * 1000) / 10;
    const hCm = Math.round(door.height * 100);
    const dinDir = door.swingDirection === 'left' ? 'DIN L' : 'DIN R';

    doc.text(`T${idx + 1}`, colO[0], tableY + 3.2);
    doc.text(door.name || `Tür ${idx + 1}`, colO[1], tableY + 3.2);
    doc.text(getGermanDoorTypeLabel(door.type), colO[2], tableY + 3.2);
    doc.text(`${String(wCm).replace('.', ',')} × ${hCm} cm`, colO[3], tableY + 3.2, { align: 'right' });
    doc.text(`STH ${hCm} cm`, colO[4], tableY + 3.2, { align: 'right' });
    doc.text(`${dinDir} (${door.openDirection === 'outside' ? 'nach außen' : 'nach innen'})`, colO[5], tableY + 3.2);
    doc.text('1 Stk.', colO[6], tableY + 3.2);
    tableY += 4.4;
  });

  // Verification & Signature Block (Bauvorlagenverordnung BauVorlV)
  const signY = pageHeight - margin - 20;
  doc.setDrawColor(160, 165, 175);
  doc.setLineWidth(0.2);
  doc.line(margin + 6, signY, margin + 75, signY);
  doc.line(pageWidth - margin - 85, signY, pageWidth - margin - 6, signY);

  doc.setFontSize(6.2);
  doc.setTextColor(80, 85, 95);
  doc.text('Ort, Datum & Unterschrift Bauherr (Genehmigt)', margin + 6, signY + 3.8);
  doc.text('Ort, Datum, Stempel & Unterschrift Planverfasser / Architekt', pageWidth - margin - 85, signY + 3.8);

  doc.save(`${project.name.replace(/\s+/g, '_')}_Bauplan_DIN1356.pdf`);
}

/**
 * Generate standard AutoCAD Release 12 DXF format
 */
export function exportProjectDxf(project: CadProject, floor: Floor): void {
  let dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n0\nENDSEC\n`;
  dxf += `0\nSECTION\n2\nTABLES\n0\nTABLE\n2\nLAYER\n`;
  dxf += `0\nLAYER\n2\nWALLS\n70\n0\n62\n7\n6\nCONTINUOUS\n0\n`;
  dxf += `0\nLAYER\n2\nDOORS\n70\n0\n62\n3\n6\nCONTINUOUS\n0\n`;
  dxf += `0\nLAYER\n2\nWINDOWS\n70\n0\n62\n5\n6\nCONTINUOUS\n0\n`;
  dxf += `0\nLAYER\n2\nFURNITURE\n70\n0\n62\n2\n6\nCONTINUOUS\n0\n`;
  dxf += `0\nLAYER\n2\nDIMS\n70\n0\n62\n1\n6\nCONTINUOUS\n0\n`;
  dxf += `0\nENDTAB\n0\nENDSEC\n`;

  dxf += `0\nSECTION\n2\nENTITIES\n`;

  // Walls as clean seamless boundary lines (DIN 1356-1 compliant, no internal cross lines in AutoCAD/ArchiCAD/Revit)
  const cleanWallData = calculateCleanWallJunctions(floor.walls);
  cleanWallData.allBoundarySegments.forEach((seg) => {
    dxf += `0\nLINE\n8\nWALLS\n10\n${seg.start.x}\n20\n${-seg.start.y}\n30\n0.0\n11\n${seg.end.x}\n21\n${-seg.end.y}\n31\n0.0\n`;
  });

  // Dimensions
  floor.dimensions.forEach((d) => {
    dxf += `0\nLINE\n8\nDIMS\n10\n${d.start.x}\n20\n${-d.start.y}\n30\n0.0\n11\n${d.end.x}\n21\n${-d.end.y}\n31\n0.0\n`;
  });

  dxf += `0\nENDSEC\n0\nEOF\n`;

  const blob = new Blob([dxf], { type: 'application/dxf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_')}.dxf`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate 3D Wavefront OBJ model for 3D printing or rendering in Blender / SketchUp
 */
export function exportProjectObj(project: CadProject, floor: Floor): void {
  let obj = `# Ferienhaus CAD 3D Model: ${project.name}\n# Generated: ${new Date().toISOString()}\no HolidayHouse\n\n`;

  let vCount = 1;
  const vertices: string[] = [];
  const faces: string[] = [];

  // Floor slab
  vertices.push(`v -2.0 0.0 -2.0\nv 14.0 0.0 -2.0\nv 14.0 0.0 12.0\nv -2.0 0.0 12.0\n`);
  faces.push(`f ${vCount} ${vCount + 1} ${vCount + 2} ${vCount + 3}\n`);
  vCount += 4;

  // Extrude walls
  floor.walls.forEach((w) => {
    const pts = getWallPolygon(w);
    const h = w.height || 2.6;

    pts.forEach((p) => vertices.push(`v ${p.x.toFixed(3)} 0.000 ${p.y.toFixed(3)}`));
    pts.forEach((p) => vertices.push(`v ${p.x.toFixed(3)} ${h.toFixed(3)} ${p.y.toFixed(3)}`));

    const b = vCount;
    faces.push(`f ${b} ${b + 1} ${b + 5} ${b + 4}`);
    faces.push(`f ${b + 1} ${b + 2} ${b + 6} ${b + 5}`);
    faces.push(`f ${b + 2} ${b + 3} ${b + 7} ${b + 6}`);
    faces.push(`f ${b + 3} ${b} ${b + 4} ${b + 7}`);
    faces.push(`f ${b + 4} ${b + 5} ${b + 6} ${b + 7}`);

    vCount += 8;
  });

  obj += vertices.join('\n') + '\n\n' + faces.join('\n') + '\n';

  const blob = new Blob([obj], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_')}_3D.obj`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Generate CSV Quantities and Bill of Materials
 */
export function exportQuantitiesCsv(project: CadProject, floor: Floor): void {
  let csv = 'Bauteil / Element;Kategorie / Typ;Bezeichnung;Anzahl / Länge;Breite;Höhe / Fläche;Material / Bemerkung\n';

  // Walls
  floor.walls.forEach((w, i) => {
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const area = len * w.height;
    csv += `Wand;${w.isExterior ? 'Außenwand' : 'Innenwand'};Wand ${i + 1};${len.toFixed(2)} m;${(w.thickness * 100).toFixed(0)} cm;${area.toFixed(2)} m²;${w.material}\n`;
  });

  // Doors
  floor.doors.forEach((d, i) => {
    csv += `Tür;${getGermanDoorTypeLabel(d.type)};${d.name || 'Tür ' + (i + 1)};1 Stk;${(d.width * 100).toFixed(0)} cm;${(d.height * 100).toFixed(0)} cm;Aufschlag ${d.swingDirection === 'left' ? 'DIN L' : 'DIN R'}\n`;
  });

  // Windows
  floor.windows.forEach((win, i) => {
    const area = win.width * win.height;
    csv += `Fenster;${getGermanWindowTypeLabel(win.type)};${win.name || 'Fenster ' + (i + 1)};1 Stk;${(win.width * 100).toFixed(0)} cm;${(win.height * 100).toFixed(0)} cm (${area.toFixed(2)} m²);BRH ${(win.parapetHeight * 100).toFixed(0)} cm, ${win.glazing}-fach Glas\n`;
  });

  // Rooms
  floor.rooms.forEach((r) => {
    csv += `Raum;${getGermanRoomCategoryLabel(r.category)};${r.name};Fläche: ${r.areaM2.toFixed(2)} m²;Umfang: ${r.perimeterM.toFixed(2)} m;Höhe: ${r.height.toFixed(2)} m;Bodenbelag: ${getGermanFloorFinishLabel(r.floorFinish)}\n`;
  });

  // Furniture
  floor.furniture.forEach((f) => {
    csv += `Möbel;${f.category};${f.name};1 Stk;${(f.width * 100).toFixed(0)} cm;Tiefe: ${(f.depth * 100).toFixed(0)} cm;Höhe: ${(f.height * 100).toFixed(0)} cm\n`;
  });

  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.name.replace(/\s+/g, '_')}_Mengenliste.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
