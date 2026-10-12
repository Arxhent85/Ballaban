import { describe, it, expect } from 'bun:test';
import { analyzeWallsForRoof, createAutoFittedRoof } from './roofAnalysis';
import { Wall } from '../types/cad';

describe('Roof Analysis & Wall Slope Auto-Fit Engine', () => {
  it('1. Correctly analyzes sloped walls for Pultdach (Back high 4.2m, Front low 2.5m)', () => {
    const walls: Wall[] = [
      // Left sloped wall: back 4.2m -> front 2.5m
      {
        id: 'w1',
        start: { x: 2, y: 2 },
        end: { x: 2, y: 8 },
        thickness: 0.3,
        height: 4.2,
        endHeight: 2.5,
        isExterior: true,
      },
      // Right sloped wall: back 4.2m -> front 2.5m
      {
        id: 'w2',
        start: { x: 10, y: 2 },
        end: { x: 10, y: 8 },
        thickness: 0.3,
        height: 4.2,
        endHeight: 2.5,
        isExterior: true,
      },
      // Back high wall: 4.2m
      {
        id: 'w3',
        start: { x: 2, y: 2 },
        end: { x: 10, y: 2 },
        thickness: 0.3,
        height: 4.2,
        endHeight: 4.2,
        isExterior: true,
      },
      // Front low wall: 2.5m
      {
        id: 'w4',
        start: { x: 2, y: 8 },
        end: { x: 10, y: 8 },
        thickness: 0.3,
        height: 2.5,
        endHeight: 2.5,
        isExterior: true,
      },
    ];

    const analysis = analyzeWallsForRoof(walls);

    expect(analysis.hasSlope).toBe(true);
    expect(analysis.slopeType).toBe('monopitch');
    expect(analysis.recommendedType).toBe('shed');
    expect(analysis.slopeDirection).toBe('front'); // Slopes down to front
    expect(analysis.minHeight).toBeCloseTo(2.5, 2);
    expect(analysis.maxHeight).toBeCloseTo(4.2, 2);
    expect(analysis.deltaHeight).toBeCloseTo(1.7, 2);
    expect(analysis.monopitchBaseHeight).toBeCloseTo(2.5, 2);
    expect(analysis.monopitchHeight).toBeCloseTo(1.7, 2);

    // Span in depth is 8 - 2 = 6m. tan(pitch) = 1.7 / 6 = 0.2833 -> pitch ~ 15.8°
    expect(analysis.monopitchPitchDeg).toBeCloseTo(15.8, 1);

    // Auto-fit roof creation
    const roof = createAutoFittedRoof(walls);
    expect(roof.type).toBe('shed');
    expect(roof.baseHeight).toBeCloseTo(2.5, 2);
    expect(roof.height).toBeCloseTo(1.7, 2);
    expect(roof.slopeDirection).toBe('front');
    expect(roof.pitchDegrees).toBeCloseTo(15.8, 1);
  });

  it('2. Correctly analyzes sloped walls with slope to the right (West 4.0m, East 2.5m)', () => {
    const walls: Wall[] = [
      // North wall: West 4.0m -> East 2.5m
      {
        id: 'w1',
        start: { x: 2, y: 2 },
        end: { x: 10, y: 2 },
        thickness: 0.3,
        height: 4.0,
        endHeight: 2.5,
        isExterior: true,
      },
      // South wall: West 4.0m -> East 2.5m
      {
        id: 'w2',
        start: { x: 2, y: 8 },
        end: { x: 10, y: 8 },
        thickness: 0.3,
        height: 4.0,
        endHeight: 2.5,
        isExterior: true,
      },
      // West high wall: 4.0m
      {
        id: 'w3',
        start: { x: 2, y: 2 },
        end: { x: 2, y: 8 },
        thickness: 0.3,
        height: 4.0,
        endHeight: 4.0,
        isExterior: true,
      },
      // East low wall: 2.5m
      {
        id: 'w4',
        start: { x: 10, y: 2 },
        end: { x: 10, y: 8 },
        thickness: 0.3,
        height: 2.5,
        endHeight: 2.5,
        isExterior: true,
      },
    ];

    const analysis = analyzeWallsForRoof(walls);

    expect(analysis.hasSlope).toBe(true);
    expect(analysis.slopeDirection).toBe('right'); // Slopes down to right
    expect(analysis.minHeight).toBeCloseTo(2.5, 2);
    expect(analysis.maxHeight).toBeCloseTo(4.0, 2);
    expect(analysis.deltaHeight).toBeCloseTo(1.5, 2);

    const roof = createAutoFittedRoof(walls, null, 'shed');
    expect(roof.type).toBe('shed');
    expect(roof.baseHeight).toBeCloseTo(2.5, 2);
    expect(roof.height).toBeCloseTo(1.5, 2);
    expect(roof.slopeDirection).toBe('right');
  });

  it('3. Level walls (flat 2.6m) default to gable with baseHeight at wall plate', () => {
    const walls: Wall[] = [
      { id: 'w1', start: { x: 0, y: 0 }, end: { x: 8, y: 0 }, thickness: 0.3, height: 2.6, endHeight: 2.6, isExterior: true },
      { id: 'w2', start: { x: 8, y: 0 }, end: { x: 8, y: 6 }, thickness: 0.3, height: 2.6, endHeight: 2.6, isExterior: true },
      { id: 'w3', start: { x: 8, y: 6 }, end: { x: 0, y: 6 }, thickness: 0.3, height: 2.6, endHeight: 2.6, isExterior: true },
      { id: 'w4', start: { x: 0, y: 6 }, end: { x: 0, y: 0 }, thickness: 0.3, height: 2.6, endHeight: 2.6, isExterior: true },
    ];

    const analysis = analyzeWallsForRoof(walls);
    expect(analysis.hasSlope).toBe(false);
    expect(analysis.avgHeight).toBeCloseTo(2.6, 2);

    const roof = createAutoFittedRoof(walls, null, 'flat');
    expect(roof.type).toBe('flat');
    expect(roof.baseHeight).toBeCloseTo(2.6, 2);
  });
});
