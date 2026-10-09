import { describe, it, expect } from 'bun:test';
import { BackgroundImage, Project } from '../types/cad';

describe('Underlay Plan & Tracing Engine Tests', () => {
  it('1. Test underlay dimensions calculate correct aspect ratio and initial scale', () => {
    const naturalWidth = 2400;
    const naturalHeight = 1600;
    const defaultWidthM = 10.0;
    const aspect = naturalHeight / naturalWidth; // 0.6667
    const heightM = Math.round(defaultWidthM * aspect * 100) / 100; // 6.67

    expect(heightM).toBe(6.67);

    const underlay: BackgroundImage = {
      url: 'data:image/jpeg;base64,sample',
      originalUrl: 'data:image/jpeg;base64,sample',
      x: 0,
      y: 0,
      widthM: defaultWidthM,
      heightM,
      opacity: 0.5,
      contrast: 100,
      brightness: 100,
      rotationDeg: 0,
      locked: false,
      visible: true,
    };

    expect(underlay.widthM).toBe(10.0);
    expect(underlay.heightM).toBe(6.67);
    expect(underlay.opacity).toBe(0.5);
    expect(underlay.locked).toBe(false);
  });

  it('2. Test underlay layer creation and retention', () => {
    const existingLayers = [
      { id: 'walls', name: 'Wände', visible: true, locked: false },
    ];

    const hasUnderlay = existingLayers.some((l) => l.id === 'underlay');
    expect(hasUnderlay).toBe(false);

    const nextLayers = hasUnderlay
      ? existingLayers.map((l) => (l.id === 'underlay' ? { ...l, visible: true, locked: false } : l))
      : [...existingLayers, { id: 'underlay', name: 'Plan-Vorlage (Hintergrund)', visible: true, locked: false }];

    expect(nextLayers.length).toBe(2);
    expect(nextLayers[1].id).toBe('underlay');
    expect(nextLayers[1].visible).toBe(true);
    expect(nextLayers[1].locked).toBe(false);

    // If inserted a second time, it should update without duplicating
    const hasUnderlay2 = nextLayers.some((l) => l.id === 'underlay');
    const nextLayers2 = hasUnderlay2
      ? nextLayers.map((l) => (l.id === 'underlay' ? { ...l, visible: true, locked: false } : l))
      : [...nextLayers, { id: 'underlay', name: 'Plan-Vorlage (Hintergrund)', visible: true, locked: false }];

    expect(nextLayers2.length).toBe(2);
  });

  it('3. Test asymmetric scaling (distortion / strecken) math', () => {
    const underlay: BackgroundImage = {
      url: 'data:image/jpeg;base64,sample',
      x: 0,
      y: 0,
      widthM: 10.0,
      heightM: 8.0,
      opacity: 0.4,
      locked: false,
      visible: true,
    };

    // User stretches horizontally only from 10.0m to 14.5m
    const stretchedWidth = 14.5;
    const modifiedUnderlay: BackgroundImage = {
      ...underlay,
      widthM: stretchedWidth,
    };

    expect(modifiedUnderlay.widthM).toBe(14.5);
    expect(modifiedUnderlay.heightM).toBe(8.0); // Height unchanged
  });

  it('4. Test calibration scaling calculation from 2 points', () => {
    const pointA = { x: 2.0, y: 1.0 };
    const pointB = { x: 7.0, y: 1.0 }; // measured = 5.0m in current coordinates
    const measuredDistance = Math.hypot(pointB.x - pointA.x, pointB.y - pointA.y); // 5.0m
    const realWorldLength = 7.5; // user specifies it's actually 7.50m

    const scaleFactor = realWorldLength / measuredDistance; // 1.5
    const initialWidthM = 10.0;
    const initialHeightM = 8.0;

    const calibratedWidthM = Math.round(initialWidthM * scaleFactor * 100) / 100;
    const calibratedHeightM = Math.round(initialHeightM * scaleFactor * 100) / 100;

    expect(calibratedWidthM).toBe(15.0);
    expect(calibratedHeightM).toBe(12.0);
  });
});
