import { describe, it, expect } from 'bun:test';
import { calculateWallThermalEvaluation, calculateWindowUValue, WALL_THERMAL_PROPERTIES } from './buildingPhysics';
import { Wall, Window } from '../types/cad';

describe('Building Physics & GEG Energy Standards Engine', () => {
  it('1. Correctly calculates U-value for 36.5cm exterior brick wall per DIN EN ISO 6946', () => {
    const wall: Wall = {
      id: 'w_ext_1',
      start: { x: 0, y: 0 },
      end: { x: 10, y: 0 },
      thickness: 0.365,
      height: 2.60,
      isExterior: true,
      material: 'brick',
      referenceLine: 'center',
    };

    const evalResult = calculateWallThermalEvaluation(wall);
    expect(evalResult.materialName).toContain('Ziegel');
    expect(evalResult.thicknessCm).toBe(36.5);
    // 36.5cm brick should achieve low U-value (around 0.20 - 0.23) and be GEG compliant (< 0.24)
    expect(evalResult.uValue).toBeLessThanOrEqual(0.24);
    expect(evalResult.gegCompliant).toBe(true);
    expect(evalResult.efficiencyClass).toBeOneOf(['KfW 40', 'KfW 55', 'GEG Standard']);
  });

  it('2. Evaluates high-performance timber frame wall as KfW 40 or KfW 55', () => {
    const wall: Wall = {
      id: 'w_timber_1',
      start: { x: 0, y: 0 },
      end: { x: 8, y: 0 },
      thickness: 0.30,
      height: 2.50,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };

    const evalResult = calculateWallThermalEvaluation(wall);
    expect(evalResult.uValue).toBeLessThan(0.18);
    expect(evalResult.gegCompliant).toBe(true);
  });

  it('3. Correctly calculates window Uw value for double and triple glazing', () => {
    const tripleWin: Window = {
      id: 'win_1',
      wallId: 'w_1',
      position: 0.5,
      width: 1.20,
      height: 1.40,
      parapetHeight: 0.90,
      type: 'turn_tilt',
      frameColor: '#ffffff',
      glazing: '3',
      hasInteriorSill: true,
      hasExteriorSill: true,
    };

    const tripleRes = calculateWindowUValue(tripleWin);
    expect(tripleRes.uw).toBeLessThanOrEqual(0.85); // Modern 3-pane window ~0.79 - 0.85 W/m²K
    expect(tripleRes.gegCompliant).toBe(true);

    const doubleWin: Window = {
      ...tripleWin,
      glazing: '2',
    };
    const doubleRes = calculateWindowUValue(doubleWin);
    expect(doubleRes.uw).toBeLessThanOrEqual(1.30);
    expect(doubleRes.gegCompliant).toBe(true);
  });
});
