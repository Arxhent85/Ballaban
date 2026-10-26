import { describe, it, expect } from 'bun:test';
import {
  analyzeArchitecturalPlan,
  getGermanDoorTypeLabel,
  getGermanWindowTypeLabel,
  formatArchDim,
} from './cadArchitecturalPlan';
import { Wall, Door, Window } from '../types/cad';

describe('Architectural Plan Analysis & DIN 1356 Dimensioning Engine', () => {
  const sampleWalls: Wall[] = [
    // Exterior 10m x 8m building
    { id: 'w1', start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, thickness: 0.365, height: 2.75, isExterior: true, material: 'brick', referenceLine: 'center' },
    { id: 'w2', start: { x: 10, y: 0 }, end: { x: 10, y: 8 }, thickness: 0.365, height: 2.75, isExterior: true, material: 'brick', referenceLine: 'center' },
    { id: 'w3', start: { x: 10, y: 8 }, end: { x: 0, y: 8 }, thickness: 0.365, height: 2.75, isExterior: true, material: 'brick', referenceLine: 'center' },
    { id: 'w4', start: { x: 0, y: 8 }, end: { x: 0, y: 0 }, thickness: 0.365, height: 2.75, isExterior: true, material: 'brick', referenceLine: 'center' },
    // Interior horizontal wall at y = 4
    { id: 'w5', start: { x: 0, y: 4 }, end: { x: 10, y: 4 }, thickness: 0.24, height: 2.75, isExterior: false, material: 'brick', referenceLine: 'center' },
    // Interior vertical walls in top half (3 rooms on top, 1 large room on bottom)
    { id: 'w6', start: { x: 3.5, y: 0 }, end: { x: 3.5, y: 4 }, thickness: 0.115, height: 2.75, isExterior: false, material: 'drywall', referenceLine: 'center' },
    { id: 'w7', start: { x: 7.0, y: 0 }, end: { x: 7.0, y: 4 }, thickness: 0.115, height: 2.75, isExterior: false, material: 'drywall', referenceLine: 'center' },
  ];

  const sampleDoors: Door[] = [
    { id: 'd1', wallId: 'w3', position: 0.5, width: 1.01, height: 2.05, type: 'entry', swingDirection: 'right', openDirection: 'inside', material: 'wood', hasThreshold: true },
    { id: 'd2', wallId: 'w5', position: 0.2, width: 0.885, height: 2.05, type: 'single', swingDirection: 'left', openDirection: 'inside', material: 'wood', hasThreshold: false },
  ];

  const sampleWindows: Window[] = [
    { id: 'win1', wallId: 'w1', position: 0.2, width: 1.20, height: 1.25, parapetHeight: 0.90, type: 'standard', frameColor: '#333', glazing: '3', hasInteriorSill: true, hasExteriorSill: true, hasRollerShutter: true },
  ];

  it('1. Automatically detects all 4 enclosed rooms when floor.rooms is empty', () => {
    const summary = analyzeArchitecturalPlan(sampleWalls, sampleDoors, sampleWindows, [], 2.75, 0);
    expect(summary.rooms.length).toBe(4);
    expect(summary.livingAreaM2).toBeGreaterThan(60);
    expect(summary.bgfM2).toBeGreaterThan(75);
    expect(summary.briM3).toBeGreaterThan(200);
  });

  it('2. Generates 3-tier exterior dimension chains on all 4 sides (North, South, West, East)', () => {
    const summary = analyzeArchitecturalPlan(sampleWalls, sampleDoors, sampleWindows, [], 2.75, 0);
    expect(summary.dimensionChains.length).toBeGreaterThan(10);

    const sides = new Set(summary.dimensionChains.map((d) => d.side));
    expect(sides.has('north')).toBe(true);
    expect(sides.has('south')).toBe(true);
    expect(sides.has('west')).toBe(true);
    expect(sides.has('east')).toBe(true);

    const tiers = new Set(summary.dimensionChains.map((d) => d.tier));
    expect(tiers.has(1)).toBe(true);
    expect(tiers.has(2)).toBe(true);
    expect(tiers.has(3)).toBe(true);
  });

  it('3. Generates section cut markers, elevation markers, structural axes, and wall schedule', () => {
    const summary = analyzeArchitecturalPlan(sampleWalls, sampleDoors, sampleWindows, [], 2.75, 0);
    expect(summary.sectionCuts.length).toBe(2);
    expect(summary.elevationMarkers.length).toBeGreaterThanOrEqual(2);
    expect(summary.structuralAxes.length).toBeGreaterThanOrEqual(4);
    expect(summary.wallSchedule.length).toBe(3); // 36.5cm ext, 24cm int, 11.5cm int
  });

  it('4. Translates door and window types into professional German VOB terms', () => {
    expect(getGermanDoorTypeLabel('entry')).toContain('Hauseingangstür');
    expect(getGermanDoorTypeLabel('single')).toContain('Innentür');
    expect(getGermanWindowTypeLabel('floor_to_ceiling')).toContain('Bodentiefes');
    expect(formatArchDim(0.365, true)).toBe('36,5');
    expect(formatArchDim(0.885)).toBe('0,88⁵');
  });
});
