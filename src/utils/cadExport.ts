/**
 * Export and Print Utilities: PDF, PNG, SVG, DXF, OBJ, CSV
 */

import { jsPDF } from 'jspdf';
import { CadProject, Floor, Wall, Door, Window } from '../types/cad';
import { getWallPolygon } from './cadMath';

export interface ExportPdfOptions {
  paperSize: 'a4' | 'a3';
  orientation: 'landscape' | 'portrait';
  scale: '1:50' | '1:100' | '1:20';
  includeTitleBlock: boolean;
  includeLegend: boolean;
  includeNorthArrow: boolean;
}

export function exportProjectPdf(project: CadProject, floor: Floor, options: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;

  // Outer border & Title block
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  // Plankopf / Title block in lower right corner
  if (options.includeTitleBlock) {
    const tbWidth = 85;
    const tbHeight = 35;
    const tbX = pageWidth - margin - tbWidth;
    const tbY = pageHeight - margin - tbHeight;

    doc.setFillColor(250, 250, 250);
    doc.rect(tbX, tbY, tbWidth, tbHeight, 'FD');
    doc.setLineWidth(0.2);
    doc.line(tbX, tbY + 8, tbX + tbWidth, tbY + 8);
    doc.line(tbX, tbY + 16, tbX + tbWidth, tbY + 16);
    doc.line(tbX, tbY + 24, tbX + tbWidth, tbY + 24);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(project.titleBlock.projectName, tbX + 2, tbY + 5.5);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Bauherr: ${project.titleBlock.clientName}`, tbX + 2, tbY + 12);
    doc.text(`Ort: ${project.titleBlock.siteAddress}`, tbX + 2, tbY + 14.5);

    doc.text(`Inhalt: ${floor.name}`, tbX + 2, tbY + 20);
    doc.text(`Maßstab: ${options.scale}`, tbX + 2, tbY + 22.5);

    doc.text(`Datum: ${project.titleBlock.date}`, tbX + 2, tbY + 28);
    doc.text(`Planer: ${project.titleBlock.author}`, tbX + 2, tbY + 31);
    doc.text(`Blatt: ${project.titleBlock.sheetNumber} / ${project.titleBlock.revision}`, tbX + 45, tbY + 31);
  }

  // North Arrow with True Project Rotation
  if (options.includeNorthArrow) {
    const naX = margin + 12;
    const naY = margin + 18;
    const r = 6;
    const angleRad = ((project.northAngle || 0) * Math.PI) / 180;

    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.3);
    doc.circle(naX, naY, r);

    // Rotated tip & bases
    const tipX = naX + Math.sin(angleRad) * (r - 0.5);
    const tipY = naY - Math.cos(angleRad) * (r - 0.5);
    const base1X = naX - Math.sin(angleRad) * 2 + Math.cos(angleRad) * 2.5;
    const base1Y = naY + Math.cos(angleRad) * 2 + Math.sin(angleRad) * 2.5;
    const base2X = naX - Math.sin(angleRad) * 2 - Math.cos(angleRad) * 2.5;
    const base2Y = naY + Math.cos(angleRad) * 2 - Math.sin(angleRad) * 2.5;

    doc.setFillColor(20, 20, 20);
    doc.triangle(tipX, tipY, base1X, base1Y, base2X, base2Y, 'FD');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    const labelX = naX + Math.sin(angleRad) * (r + 3.5);
    const labelY = naY - Math.cos(angleRad) * (r + 3.5) + 2;
    doc.text('N', labelX, labelY, { align: 'center' });
  }

  // Compute bounding box of floor plan to center on page
  let minX = 0, maxX = 12, minY = 0, maxY = 10;
  if (floor.walls.length > 0) {
    minX = Math.min(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
    maxX = Math.max(...floor.walls.flatMap((w) => [w.start.x, w.end.x]));
    minY = Math.min(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
    maxY = Math.max(...floor.walls.flatMap((w) => [w.start.y, w.end.y]));
  }

  const planWidthM = Math.max(1, maxX - minX + 2);
  const planHeightM = Math.max(1, maxY - minY + 2);

  // Conversion: 1m in scale 1:50 is 20mm; 1:100 is 10mm; 1:20 is 50mm
  let mmPerMeter = 20;
  if (options.scale === '1:100') mmPerMeter = 10;
  if (options.scale === '1:20') mmPerMeter = 50;

  // Center drawing in available area
  const availWidth = pageWidth - 2 * margin - 20;
  const availHeight = pageHeight - 2 * margin - 45;
  const scaleFit = Math.min(1, availWidth / (planWidthM * mmPerMeter), availHeight / (planHeightM * mmPerMeter));
  const finalScale = mmPerMeter * scaleFit;

  const startOffsetX = margin + 15 + (availWidth - planWidthM * finalScale) / 2 - minX * finalScale;
  const startOffsetY = margin + 15 + (availHeight - planHeightM * finalScale) / 2 - minY * finalScale;

  // Render Rooms
  floor.rooms.forEach((r) => {
    if (r.polygon.length >= 3) {
      doc.setFillColor(248, 246, 242);
      const polyPts = r.polygon.map((p) => [startOffsetX + p.x * finalScale, startOffsetY + p.y * finalScale]);
      
      // Draw filled room background
      if (polyPts.length >= 3) {
        const start = polyPts[0];
        const lines = polyPts.slice(1).map((p, idx) => {
          const prev = polyPts[idx];
          return [p[0] - prev[0], p[1] - prev[1]];
        });
        lines.push([start[0] - polyPts[polyPts.length - 1][0], start[1] - polyPts[polyPts.length - 1][1]]);
        doc.setDrawColor(220, 218, 212);
        doc.setLineWidth(0.1);
        doc.lines(lines, start[0], start[1], [1, 1], 'FD', true);
      }

      // Room stamp
      const cx = r.polygon.reduce((acc, p) => acc + p.x, 0) / r.polygon.length;
      const cy = r.polygon.reduce((acc, p) => acc + p.y, 0) / r.polygon.length;
      const stampX = startOffsetX + cx * finalScale;
      const stampY = startOffsetY + cy * finalScale;

      // Stamp badge background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(180, 175, 165);
      doc.setLineWidth(0.15);
      const bW = 28;
      const bH = 10;
      doc.roundedRect(stampX - bW / 2, stampY - bH / 2, bW, bH, 1.5, 1.5, 'FD');

      doc.setTextColor(20, 20, 20);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'bold');
      doc.text(r.name, stampX, stampY - 1, { align: 'center' });
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(40, 40, 40);
      doc.text(`${r.areaM2.toFixed(2)} m²`, stampX, stampY + 2.5, { align: 'center' });
    }
  });

  // Render Walls with clean architectural hatching / solid fills
  floor.walls.forEach((w) => {
    const pts = getWallPolygon(w);
    const mmPts = pts.map((p) => [startOffsetX + p.x * finalScale, startOffsetY + p.y * finalScale]);

    if (w.isExterior) {
      doc.setFillColor(45, 42, 40); // Dark architectural cut stone
    } else {
      doc.setFillColor(115, 110, 105); // Interior masonry
    }
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(w.isExterior ? 0.35 : 0.22);

    // Draw filled polygon for wall
    const start = mmPts[0];
    const lines = [
      [mmPts[1][0] - mmPts[0][0], mmPts[1][1] - mmPts[0][1]],
      [mmPts[2][0] - mmPts[1][0], mmPts[2][1] - mmPts[1][1]],
      [mmPts[3][0] - mmPts[2][0], mmPts[3][1] - mmPts[2][1]],
      [mmPts[0][0] - mmPts[3][0], mmPts[0][1] - mmPts[3][1]],
    ];
    doc.lines(lines, start[0], start[1], [1, 1], 'FD', true);
  });

  // Render Doors (Openings, leaf & 90° swing arc)
  floor.doors.forEach((d) => {
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

    // Door center in world
    const cx = parentWall.start.x + wDx * d.position;
    const cy = parentWall.start.y + wDy * d.position;
    const halfW = d.width / 2;

    const p1x = cx - ux * halfW;
    const p1y = cy - uy * halfW;
    const p2x = cx + ux * halfW;
    const p2y = cy + uy * halfW;

    const sP1x = startOffsetX + p1x * finalScale;
    const sP1y = startOffsetY + p1y * finalScale;
    const sP2x = startOffsetX + p2x * finalScale;
    const sP2y = startOffsetY + p2y * finalScale;

    // Opening cutout (clear wall fill)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.2);
    const wallThickMm = (parentWall.thickness || 0.30) * finalScale;

    // Door Jambs (Pfeiler)
    doc.line(sP1x - nx * (wallThickMm / 2), sP1y - ny * (wallThickMm / 2), sP1x + nx * (wallThickMm / 2), sP1y + ny * (wallThickMm / 2));
    doc.line(sP2x - nx * (wallThickMm / 2), sP2y - ny * (wallThickMm / 2), sP2x + nx * (wallThickMm / 2), sP2y + ny * (wallThickMm / 2));

    // Door Leaf (90° open)
    const hingeAtStart = d.swingDirection === 'left';
    const hingeX = hingeAtStart ? sP1x : sP2x;
    const hingeY = hingeAtStart ? sP1y : sP2y;
    const leafDx = nx * (d.width * finalScale);
    const leafDy = ny * (d.width * finalScale);

    doc.setLineWidth(0.25);
    doc.setDrawColor(20, 20, 20);
    doc.line(hingeX, hingeY, hingeX + leafDx, hingeY + leafDy);

    // Swing Arc (fine dashed line)
    doc.setLineWidth(0.12);
    doc.setLineDashPattern([0.8, 0.8], 0);
    const swingRadius = d.width * finalScale;
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
    doc.setLineDashPattern([], 0); // reset
  });

  // Render Windows (3-line architectural glazing representation)
  floor.windows.forEach((win) => {
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

    const sP1x = startOffsetX + (cx - ux * halfW) * finalScale;
    const sP1y = startOffsetY + (cy - uy * halfW) * finalScale;
    const sP2x = startOffsetX + (cx + ux * halfW) * finalScale;
    const sP2y = startOffsetY + (cy + uy * halfW) * finalScale;
    const wallThickMm = (parentWall.thickness || 0.30) * finalScale;

    // Cutout / Wall reveal
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.2);
    // Jamb lines
    doc.line(sP1x - nx * (wallThickMm / 2), sP1y - ny * (wallThickMm / 2), sP1x + nx * (wallThickMm / 2), sP1y + ny * (wallThickMm / 2));
    doc.line(sP2x - nx * (wallThickMm / 2), sP2y - ny * (wallThickMm / 2), sP2x + nx * (wallThickMm / 2), sP2y + ny * (wallThickMm / 2));

    // Outer & Inner Sill Lines
    doc.setLineWidth(0.15);
    doc.setDrawColor(60, 60, 60);
    doc.line(sP1x + nx * (wallThickMm / 2), sP1y + ny * (wallThickMm / 2), sP2x + nx * (wallThickMm / 2), sP2y + ny * (wallThickMm / 2));
    doc.line(sP1x - nx * (wallThickMm / 2), sP1y - ny * (wallThickMm / 2), sP2x - nx * (wallThickMm / 2), sP2y - ny * (wallThickMm / 2));

    // Center Glazing line (Blue tinted CAD line)
    doc.setDrawColor(37, 99, 235);
    doc.setLineWidth(0.25);
    doc.line(sP1x, sP1y, sP2x, sP2y);

    // Dimension annotation (e.g. 1.20 / 1.25)
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(5.5);
    doc.setFont('helvetica', 'normal');
    const midX = (sP1x + sP2x) / 2 + nx * (wallThickMm / 2 + 2);
    const midY = (sP1y + sP2y) / 2 + ny * (wallThickMm / 2 + 2);
    doc.text(`${(win.width * 100).toFixed(0)} / ${(win.height * 100).toFixed(0)}`, midX, midY, { align: 'center' });
  });

  // Render Stairs (Step treads & walking arrow)
  floor.stairs.forEach((stair) => {
    const sX = startOffsetX + stair.x * finalScale;
    const sY = startOffsetY + stair.y * finalScale;
    const sW = stair.width * finalScale;
    const sL = stair.length * finalScale;
    const steps = stair.stepCount || 14;

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.2);
    doc.rect(sX, sY, sW, sL, 'FD');

    // Treads
    doc.setLineWidth(0.12);
    const stepDepth = sL / steps;
    for (let i = 1; i < steps; i++) {
      doc.line(sX, sY + i * stepDepth, sX + sW, sY + i * stepDepth);
    }

    // Walking line (start circle & top arrow)
    const midX = sX + sW / 2;
    doc.setLineWidth(0.2);
    doc.setDrawColor(220, 38, 38);
    doc.circle(midX, sY + sL - 2, 0.8, 'FD');
    doc.line(midX, sY + sL - 2, midX, sY + 3);
    doc.triangle(midX, sY + 1.5, midX - 1, sY + 3.5, midX + 1, sY + 3.5, 'FD');
  });

  // Render Dimensions (Architectural 45° Slash Ticks)
  floor.dimensions.forEach((dim) => {
    const x1 = startOffsetX + dim.start.x * finalScale;
    const y1 = startOffsetY + dim.start.y * finalScale;
    const x2 = startOffsetX + dim.end.x * finalScale;
    const y2 = startOffsetY + dim.end.y * finalScale;

    doc.setDrawColor(30, 30, 30);
    doc.setLineWidth(0.18);
    doc.line(x1, y1, x2, y2);
    
    // 45° architectural slash ticks
    const tick = 1.2;
    doc.setLineWidth(0.35);
    doc.line(x1 - tick, y1 + tick, x1 + tick, y1 - tick);
    doc.line(x2 - tick, y2 + tick, x2 + tick, y2 - tick);

    if (dim.label) {
      doc.setTextColor(20, 20, 20);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');
      doc.text(dim.label, (x1 + x2) / 2, (y1 + y2) / 2 - 1.2, { align: 'center' });
    }
  });

  // Graphic Scale Bar (Maßstabsbalken 0 - 5m)
  const barX = margin + 12;
  const barY = pageHeight - margin - 15;
  const barH = 2.0;
  const meterMm = finalScale; // length of 1m in mm

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 30, 30);
  doc.text(`Maßstab ${options.scale}`, barX, barY - 2.5);

  // 0m to 1m (black), 1m to 2m (white), 2m to 5m (black)
  doc.setLineWidth(0.15);
  doc.setDrawColor(0, 0, 0);

  doc.setFillColor(0, 0, 0);
  doc.rect(barX, barY, meterMm, barH, 'FD');
  doc.setFillColor(255, 255, 255);
  doc.rect(barX + meterMm, barY, meterMm, barH, 'FD');
  doc.setFillColor(0, 0, 0);
  doc.rect(barX + 2 * meterMm, barY, 3 * meterMm, barH, 'FD');

  doc.text('0', barX - 1, barY + barH + 3);
  doc.text('1m', barX + meterMm - 2, barY + barH + 3);
  doc.text('2m', barX + 2 * meterMm - 2, barY + barH + 3);
  doc.text('5m', barX + 5 * meterMm - 2, barY + barH + 3);

  // ==========================================
  // PAGE 2: OFFICIAL CALCULATION SHEET (DIN 277 / WoFlV)
  // ==========================================
  doc.addPage(options.paperSize, options.orientation);

  // Outer border Page 2
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.4);
  doc.rect(margin, margin, pageWidth - 2 * margin, pageHeight - 2 * margin);

  // Page 2 Header
  doc.setFillColor(245, 245, 248);
  doc.rect(margin, margin, pageWidth - 2 * margin, 18, 'F');
  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.2);
  doc.line(margin, margin + 18, pageWidth - margin, margin + 18);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('FLÄCHENBERECHNUNG & BAUTEILVERZEICHNIS', margin + 6, margin + 8);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Projekt: ${project.name} | Geschoss: ${floor.name} | Datum: ${project.titleBlock.date || new Date().toLocaleDateString('de-DE')}`, margin + 6, margin + 14);

  // Calculations
  let totalLivingAreaM2 = 0;
  let totalUsableAreaM2 = 0;
  floor.rooms.forEach((r) => {
    totalUsableAreaM2 += r.areaM2;
    if (r.targetLivingArea !== false) totalLivingAreaM2 += r.areaM2;
  });
  const bgfM2 = totalUsableAreaM2 * 1.18;
  const briM3 = bgfM2 * (floor.storyHeight || 2.75);

  let totalWallLenM = 0;
  let extWallLenM = 0;
  floor.walls.forEach((w) => {
    const l = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
    totalWallLenM += l;
    if (w.isExterior) extWallLenM += l;
  });

  // KPI Summary Cards
  const kpiY = margin + 24;
  const kpiW = (pageWidth - 2 * margin - 12) / 4;
  const kpis = [
    { title: 'Wohnfläche (WoFlV)', val: `${totalLivingAreaM2.toFixed(2)} m²` },
    { title: 'Brutto-Grundfläche (BGF)', val: `${bgfM2.toFixed(1)} m²` },
    { title: 'Brutto-Rauminhalt (BRI)', val: `${briM3.toFixed(1)} m³` },
    { title: 'Wandabwicklung gesamt', val: `${totalWallLenM.toFixed(1)} m` },
  ];

  kpis.forEach((kpi, idx) => {
    const kX = margin + 3 + idx * (kpiW + 2);
    doc.setFillColor(250, 250, 252);
    doc.setDrawColor(210, 210, 215);
    doc.setLineWidth(0.15);
    doc.roundedRect(kX, kpiY, kpiW, 14, 1.5, 1.5, 'FD');

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(kpi.title, kX + 3, kpiY + 4.5);

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text(kpi.val, kX + 3, kpiY + 10.5);
  });

  // Room Schedule Table (Raumbuch)
  let tableY = kpiY + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('1. Raumbuch & Flächenaufstellung nach DIN 277', margin + 4, tableY);

  tableY += 4;
  doc.setFillColor(240, 240, 244);
  doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);

  const colX = [margin + 6, margin + 45, margin + 80, margin + 110, margin + 135, margin + 165];
  doc.text('Raumbezeichnung', colX[0], tableY + 4.2);
  doc.text('Kategorie', colX[1], tableY + 4.2);
  doc.text('Fläche (m²)', colX[2], tableY + 4.2, { align: 'right' });
  doc.text('Umfang (m)', colX[3], tableY + 4.2, { align: 'right' });
  doc.text('Lichte Höhe (m)', colX[4], tableY + 4.2, { align: 'right' });
  doc.text('Bodenbelag', colX[5], tableY + 4.2);

  tableY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);

  floor.rooms.forEach((r, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5, 'F');
    }
    doc.text(r.name, colX[0], tableY + 3.8);
    doc.text(r.category, colX[1], tableY + 3.8);
    doc.text(`${r.areaM2.toFixed(2)} m²`, colX[2], tableY + 3.8, { align: 'right' });
    doc.text(`${r.perimeterM.toFixed(2)} m`, colX[3], tableY + 3.8, { align: 'right' });
    doc.text(`${r.height.toFixed(2)} m`, colX[4], tableY + 3.8, { align: 'right' });
    doc.text(r.floorFinish, colX[5], tableY + 3.8);
    tableY += 5;
  });

  // Windows & Doors Schedule (Bauteilliste)
  tableY += 6;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  doc.text('2. Fenster- & Türenverzeichnis (VOB / DIN 18299)', margin + 4, tableY);

  tableY += 4;
  doc.setFillColor(240, 240, 244);
  doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 6, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(50, 50, 50);

  doc.text('Bauteil / Pos.', colX[0], tableY + 4.2);
  doc.text('Typ', colX[1], tableY + 4.2);
  doc.text('Breite × Höhe', colX[2], tableY + 4.2, { align: 'right' });
  doc.text('BRH / Sturz', colX[3], tableY + 4.2, { align: 'right' });
  doc.text('Anschlag / Glas', colX[4], tableY + 4.2);
  doc.text('Anzahl', colX[5], tableY + 4.2);

  tableY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(30, 30, 30);

  // List Windows
  floor.windows.forEach((win, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5, 'F');
    }
    doc.text(win.name || `Fenster ${idx + 1}`, colX[0], tableY + 3.8);
    doc.text(win.type, colX[1], tableY + 3.8);
    doc.text(`${(win.width * 100).toFixed(0)} × ${(win.height * 100).toFixed(0)} cm`, colX[2], tableY + 3.8, { align: 'right' });
    doc.text(`BRH ${(win.parapetHeight * 100).toFixed(0)} cm`, colX[3], tableY + 3.8, { align: 'right' });
    doc.text(`${win.glazing}-fach Isolierglas`, colX[4], tableY + 3.8);
    doc.text('1 Stk.', colX[5], tableY + 3.8);
    tableY += 5;
  });

  // List Doors
  floor.doors.forEach((door, idx) => {
    const rowIdx = floor.windows.length + idx;
    if (rowIdx % 2 === 1) {
      doc.setFillColor(250, 250, 252);
      doc.rect(margin + 4, tableY, pageWidth - 2 * margin - 8, 5, 'F');
    }
    doc.text(door.name || `Tür ${idx + 1}`, colX[0], tableY + 3.8);
    doc.text(door.type, colX[1], tableY + 3.8);
    doc.text(`${(door.width * 100).toFixed(0)} × ${(door.height * 100).toFixed(0)} cm`, colX[2], tableY + 3.8, { align: 'right' });
    doc.text(`STH ${(door.height * 100).toFixed(0)} cm`, colX[3], tableY + 3.8, { align: 'right' });
    doc.text(`${door.swingDirection === 'left' ? 'DIN L' : 'DIN R'} (${door.openDirection})`, colX[4], tableY + 3.8);
    doc.text('1 Stk.', colX[5], tableY + 3.8);
    tableY += 5;
  });

  // Verification & Signature block
  const signY = pageHeight - margin - 22;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(margin + 6, signY, margin + 70, signY);
  doc.line(pageWidth - margin - 70, signY, pageWidth - margin - 6, signY);

  doc.setFontSize(6.5);
  doc.setTextColor(90, 90, 90);
  doc.text('Datum & Unterschrift Bauherr', margin + 6, signY + 4);
  doc.text('Datum & Stempel / Unterschrift Planverfasser', pageWidth - margin - 70, signY + 4);

  doc.save(`${project.name.replace(/\s+/g, '_')}_Plan.pdf`);
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

  // Walls as 3DFACE / LINES
  floor.walls.forEach((w) => {
    const pts = getWallPolygon(w);
    // Line 1
    dxf += `0\nLINE\n8\nWALLS\n10\n${pts[0].x}\n20\n${-pts[0].y}\n30\n0.0\n11\n${pts[1].x}\n21\n${-pts[1].y}\n31\n0.0\n`;
    dxf += `0\nLINE\n8\nWALLS\n10\n${pts[1].x}\n20\n${-pts[1].y}\n30\n0.0\n11\n${pts[2].x}\n21\n${-pts[2].y}\n31\n0.0\n`;
    dxf += `0\nLINE\n8\nWALLS\n10\n${pts[2].x}\n20\n${-pts[2].y}\n30\n0.0\n11\n${pts[3].x}\n21\n${-pts[3].y}\n31\n0.0\n`;
    dxf += `0\nLINE\n8\nWALLS\n10\n${pts[3].x}\n20\n${-pts[3].y}\n30\n0.0\n11\n${pts[0].x}\n21\n${-pts[0].y}\n31\n0.0\n`;
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

    // 4 base points + 4 top points
    pts.forEach((p) => vertices.push(`v ${p.x.toFixed(3)} 0.000 ${p.y.toFixed(3)}`));
    pts.forEach((p) => vertices.push(`v ${p.x.toFixed(3)} ${h.toFixed(3)} ${p.y.toFixed(3)}`));

    const b = vCount;
    // Sides
    faces.push(`f ${b} ${b + 1} ${b + 5} ${b + 4}`);
    faces.push(`f ${b + 1} ${b + 2} ${b + 6} ${b + 5}`);
    faces.push(`f ${b + 2} ${b + 3} ${b + 7} ${b + 6}`);
    faces.push(`f ${b + 3} ${b} ${b + 4} ${b + 7}`);
    // Top
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
    csv += `Tür;${d.type};${d.name || 'Tür ' + (i + 1)};1 Stk;${(d.width * 100).toFixed(0)} cm;${(d.height * 100).toFixed(0)} cm;Aufschlag ${d.swingDirection === 'left' ? 'DIN L' : 'DIN R'}\n`;
  });

  // Windows
  floor.windows.forEach((win, i) => {
    const area = win.width * win.height;
    csv += `Fenster;${win.type};${win.name || 'Fenster ' + (i + 1)};1 Stk;${(win.width * 100).toFixed(0)} cm;${(win.height * 100).toFixed(0)} cm (${area.toFixed(2)} m²);BRH ${(win.parapetHeight * 100).toFixed(0)} cm, ${win.glazing}-fach Glas\n`;
  });

  // Rooms
  floor.rooms.forEach((r) => {
    csv += `Raum;Raumbuch;${r.name};Fläche: ${r.areaM2.toFixed(2)} m²;Umfang: ${r.perimeterM.toFixed(2)} m;Höhe: ${r.height.toFixed(2)} m;Bodenbelag: ${r.floorFinish}\n`;
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
