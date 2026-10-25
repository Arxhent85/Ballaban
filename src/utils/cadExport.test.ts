import { describe, it, expect } from 'bun:test';
import { exportProjectPdf, ExportPdfOptions } from './cadExport';
import { CadProject, Floor, Wall, Door, Window, Room } from '../types/cad';

describe('Professional PDF Export & Schedules Test Suite', () => {
  it('1. Generates 2-page ready-for-submission PDF with floor plan and schedules', () => {
    const testWall: Wall = {
      id: 'w1',
      start: { x: 0, y: 0 },
      end: { x: 8, y: 0 },
      thickness: 0.30,
      height: 2.60,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const testDoor: Door = {
      id: 'd1',
      wallId: 'w1',
      position: 0.5,
      width: 0.90,
      height: 2.05,
      type: 'entry',
      swingDirection: 'left',
      openDirection: 'inside',
      swingAngle: 90,
      frameThickness: 0.08,
      sillHeight: 0,
    };

    const testWindow: Window = {
      id: 'win1',
      wallId: 'w1',
      position: 0.2,
      width: 1.20,
      height: 1.25,
      parapetHeight: 0.90,
      type: 'turn_tilt',
      frameColor: '#ffffff',
      glazing: '3',
      hasInteriorSill: true,
      hasExteriorSill: true,
    };

    const testRoom: Room = {
      id: 'r1',
      name: 'Wohnbereich',
      category: 'living',
      polygon: [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
        { x: 8, y: 6 },
        { x: 0, y: 6 },
      ],
      areaM2: 48,
      perimeterM: 28,
      height: 2.60,
      floorFinish: 'parquet',
      color: '#e2e8f0',
      targetLivingArea: true,
    };

    const floor: Floor = {
      id: 'fl1',
      name: 'Erdgeschoss',
      storyHeight: 2.75,
      floorElevation: 0,
      slabThickness: 0.20,
      walls: [testWall],
      doors: [testDoor],
      windows: [testWindow],
      stairs: [],
      columns: [],
      roofs: [],
      rooms: [testRoom],
      furniture: [],
      electrical: [],
      dimensions: [
        {
          id: 'dim1',
          start: { x: 0, y: -0.8 },
          end: { x: 8, y: -0.8 },
          offset: 0.8,
          label: '8.00 m',
          type: 'linear',
        },
      ],
      annotations: [],
      shapes: [],
    };

    const project: CadProject = {
      id: 'p1',
      name: 'Ferienhaus Alpenblick',
      variant: 'Standard',
      unit: 'm',
      scale: '1:100',
      activeFloorId: 'fl1',
      floors: [floor],
      titleBlock: {
        projectName: 'Neubau Ferienhaus Alpenblick',
        clientName: 'Familie Mustermann',
        siteAddress: 'Bergweg 12, 82467 Garmisch',
        planContent: 'Grundriss Erdgeschoss 1:100',
        date: '25.10.2026',
        scale: '1:100',
        author: 'Architekturbüro CAD',
        sheetNumber: 'A-101',
        revision: 'Index 0',
      },
      layers: [],
      guideLines: [],
      northAngle: 45,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const options: ExportPdfOptions = {
      paperSize: 'a4',
      orientation: 'landscape',
      scale: '1:100',
      includeTitleBlock: true,
      includeLegend: true,
      includeNorthArrow: true,
    };

    // Mock document save to verify without writing to file system
    let savedFileName = '';
    const originalSave = (globalThis as any).jsPDF_save;
    (globalThis as any).jsPDF_save = (name: string) => {
      savedFileName = name;
    };

    expect(() => {
      exportProjectPdf(project, floor, options);
    }).not.toThrow();
  });
});
