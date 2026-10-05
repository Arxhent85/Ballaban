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

  // North Arrow
  if (options.includeNorthArrow) {
    const naX = margin + 12;
    const naY = margin + 16;
    doc.setLineWidth(0.3);
    doc.circle(naX, naY, 6);
    doc.triangle(naX, naY - 5.5, naX - 3, naY + 3, naX + 3, naY + 3, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('N', naX - 1.2, naY - 7);
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
      doc.setFillColor(245, 245, 248);
      const polyPts = r.polygon.map((p) => [startOffsetX + p.x * finalScale, startOffsetY + p.y * finalScale]);
      // Approximate room background fill
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.1);
      // Room stamp
      const cx = r.polygon.reduce((acc, p) => acc + p.x, 0) / r.polygon.length;
      const cy = r.polygon.reduce((acc, p) => acc + p.y, 0) / r.polygon.length;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(r.name, startOffsetX + cx * finalScale, startOffsetY + cy * finalScale, { align: 'center' });
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(`${r.areaM2.toFixed(2)} m²`, startOffsetX + cx * finalScale, startOffsetY + cy * finalScale + 3.5, { align: 'center' });
    }
  });

  // Render Walls
  floor.walls.forEach((w) => {
    const pts = getWallPolygon(w);
    const mmPts = pts.map((p) => [startOffsetX + p.x * finalScale, startOffsetY + p.y * finalScale]);

    doc.setFillColor(w.isExterior ? 80 : 130, w.isExterior ? 80 : 130, w.isExterior ? 80 : 130);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(w.isExterior ? 0.35 : 0.2);

    // Draw wall polygon
    for (let i = 0; i < mmPts.length; i++) {
      const next = mmPts[(i + 1) % mmPts.length];
      doc.line(mmPts[i][0], mmPts[i][1], next[0], next[1]);
    }
  });

  // Render Doors & Windows openings
  doc.setLineWidth(0.15);
  doc.setDrawColor(30, 41, 59);

  // Render Dimensions
  floor.dimensions.forEach((dim) => {
    const x1 = startOffsetX + dim.start.x * finalScale;
    const y1 = startOffsetY + dim.start.y * finalScale;
    const x2 = startOffsetX + dim.end.x * finalScale;
    const y2 = startOffsetY + dim.end.y * finalScale;

    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.15);
    doc.line(x1, y1, x2, y2);
    // Draw tick marks
    doc.line(x1 - 1, y1 - 1, x1 + 1, y1 + 1);
    doc.line(x2 - 1, y2 - 1, x2 + 1, y2 + 1);

    if (dim.label) {
      doc.setFontSize(6.5);
      doc.text(dim.label, (x1 + x2) / 2, (y1 + y2) / 2 - 1.5, { align: 'center' });
    }
  });

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
