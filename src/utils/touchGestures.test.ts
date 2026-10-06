import { describe, it, expect } from 'bun:test';
import {
  isPalmTouch,
  snapRotationAngle,
  recognizeQuickShape,
} from './touchGestures';
import { Point2D } from '../types/cad';

describe('Advanced Touch & Apple Pencil Gestures Engine', () => {
  it('1. Test Palm Rejection (Handballenerkennung)', () => {
    // Normal stylus event
    const penEvt = { pointerType: 'pen', width: 2, height: 2 } as any;
    expect(isPalmTouch(penEvt, false)).toBe(false);

    // Normal finger tap
    const fingerEvt = { pointerType: 'touch', width: 14, height: 14 } as any;
    expect(isPalmTouch(fingerEvt, false)).toBe(false);

    // Palm touch (large contact area)
    const palmEvt = { pointerType: 'touch', width: 45, height: 50 } as any;
    expect(isPalmTouch(palmEvt, false)).toBe(true);

    // Touch while pen is active
    expect(isPalmTouch(fingerEvt, true)).toBe(true);
  });

  it('2. Test Rotation Angle Snapping (Norden / 90° Rastung)', () => {
    // Near 0° (0.04 rad)
    const res0 = snapRotationAngle(0.04);
    expect(res0.isSnapped).toBe(true);
    expect(res0.angle).toBe(0);

    // Near 90° (Math.PI/2 - 0.03 rad)
    const res90 = snapRotationAngle(Math.PI / 2 - 0.03);
    expect(res90.isSnapped).toBe(true);
    expect(Math.abs(res90.angle - Math.PI / 2)).toBeLessThan(0.001);

    // Free angle (45° = Math.PI / 4)
    const resFree = snapRotationAngle(Math.PI / 4, 0.05);
    expect(resFree.isSnapped).toBe(false);
  });

  it('3. Test QuickShape: Gerade Wand aus Freihandlinie', () => {
    // Sample a slightly wavy straight line from (0, 0) to (5, 0)
    const wavyLine: Point2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0.03 },
      { x: 2, y: -0.02 },
      { x: 3, y: 0.04 },
      { x: 4, y: 0.01 },
      { x: 5, y: 0 },
    ];

    const shape = recognizeQuickShape(wavyLine);
    expect(shape).not.toBeNull();
    expect(shape?.type).toBe('line');
    expect(shape?.line?.start.x).toBe(0);
    expect(shape?.line?.end.x).toBe(5);
  });

  it('4. Test QuickShape: Rechteckraum aus Freihand-Schleife', () => {
    // Sample a 4x3 rectangular room roughly drawn
    const roughRect: Point2D[] = [
      { x: 1, y: 1 },
      { x: 3, y: 1.05 },
      { x: 5, y: 1 },
      { x: 5.05, y: 2.5 },
      { x: 5, y: 4 },
      { x: 3, y: 3.95 },
      { x: 1, y: 4 },
      { x: 0.95, y: 2.5 },
      { x: 1.02, y: 1.05 }, // closed back to start
    ];

    const shape = recognizeQuickShape(roughRect);
    expect(shape).not.toBeNull();
    expect(shape?.type).toBe('rect');
    expect(shape?.rect?.width).toBeGreaterThanOrEqual(3.8);
    expect(shape?.rect?.depth).toBeGreaterThanOrEqual(2.8);
  });
});
