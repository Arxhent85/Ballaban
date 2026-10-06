/**
 * High-Precision Architectural Snapping & Intelligent Relationship Guidelines
 * 
 * Features matching professional CAD/BIM applications (Archicad, Revit, SketchUp, Floorplanner):
 * - Relationships: Parallel (//), Perpendicular (⟂), 45°/135°, Equal Length (=), Collinear Extensions, Alignment
 * - Magnetic Points: Endpoints, Midpoints, Division points (1/3, 1/4), Intersections, Perpendicular foot (Lot)
 * - Equal Spacing: Equidistant distribution between walls, doors, windows, and corner margins
 * - Offset Snapping: Fixed parallel offset (e.g. 2.50m / 3.00m)
 * - Hierarchy: Point snaps > Line/Lot snaps > Angle/Relationships > Grid
 * - Keyboard interactions: Tab cycles competing candidates, Alt bypasses snapping, Shift locks angle
 */

import {
  Point2D,
  Wall,
  Door,
  Window,
  Furniture,
  Room,
  PlotBoundary,
  SnapSettings,
  ActiveGuideLine,
  SmartSnapCandidate,
  SmartSnapResult,
  SnapPointType,
} from '../types/cad';
import {
  distance,
  lineIntersection,
  infiniteLineIntersection,
  projectPointOntoWall,
  getWallNormal,
} from './cadMath';

// Math helpers
export function normalizeAngle(rad: number): number {
  let a = rad % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

export function angleDifference(a1: number, a2: number): number {
  return Math.abs(normalizeAngle(a1 - a2));
}

export function projectPointOntoInfiniteLine(
  p: Point2D,
  lineA: Point2D,
  lineB: Point2D
): { point: Point2D; t: number; dist: number } {
  const dx = lineB.x - lineA.x;
  const dy = lineB.y - lineA.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { point: lineA, t: 0, dist: distance(p, lineA) };
  }
  const t = ((p.x - lineA.x) * dx + (p.y - lineA.y) * dy) / lenSq;
  const proj = { x: lineA.x + t * dx, y: lineA.y + t * dy };
  return { point: proj, t, dist: distance(p, proj) };
}

export interface SmartSnapContext {
  target: Point2D;
  origin?: Point2D | null;
  walls: Wall[];
  doors?: Door[];
  windows?: Window[];
  furniture?: Furniture[];
  rooms?: Room[];
  plot?: PlotBoundary;
  settings: SnapSettings;
  zoom: number;
  candidateIndex?: number;
  isAngleLocked?: boolean;
  isAltPressed?: boolean;
  ignoredIds?: string[];
  currentTool?: string;
}

/**
 * Calculates magnetic snap candidates and active relationship guidelines.
 */
export function calculateSmartSnap(ctx: SmartSnapContext): SmartSnapResult {
  const {
    target,
    origin,
    walls,
    doors = [],
    windows = [],
    furniture = [],
    rooms = [],
    plot,
    settings,
    zoom,
    candidateIndex = 0,
    isAltPressed = false,
    ignoredIds = [],
  } = ctx;

  // Alt key bypasses all snapping immediately
  if (isAltPressed || settings.enabled === false) {
    return {
      point: target,
      snapped: false,
      type: 'none',
      label: '',
      symbol: '',
      activeCandidateIndex: 0,
      candidatesCount: 0,
      guideLines: [],
      matchedWallIds: [],
    };
  }

  const snapRadiusPx = Math.max(8, settings.snapRadiusPx || 18);
  const snapRadiusM = snapRadiusPx / zoom;
  const activeWalls = walls.filter((w) => !ignoredIds.includes(w.id));
  const candidates: SmartSnapCandidate[] = [];

  // ==========================================================
  // 1. POINT SNAPS (Priority 1: Endpoints, Midpoints, Intersections)
  // ==========================================================

  // A. Wall Endpoints
  if (settings.wallEndpoints !== false) {
    for (const w of activeWalls) {
      const dStart = distance(target, w.start);
      if (dStart <= snapRadiusM) {
        const startH = w.height || 2.50;
        candidates.push({
          point: { ...w.start },
          type: 'endpoint',
          distancePx: dStart * zoom,
          priority: 1.0,
          label: `Endpunkt (${startH.toFixed(2)}m)`,
          symbol: '■',
          targetId: w.id,
          matchedHeights: {
            height: startH,
            sourceWallId: w.id,
            label: `Eck-Höhe: ${startH.toFixed(2)}m`,
          },
        });
      }
      const dEnd = distance(target, w.end);
      if (dEnd <= snapRadiusM) {
        const endH = w.endHeight ?? (w.height || 2.50);
        candidates.push({
          point: { ...w.end },
          type: 'endpoint',
          distancePx: dEnd * zoom,
          priority: 1.0,
          label: `Endpunkt (${endH.toFixed(2)}m)`,
          symbol: '■',
          targetId: w.id,
          matchedHeights: {
            height: endH,
            sourceWallId: w.id,
            label: `Eck-Höhe: ${endH.toFixed(2)}m`,
          },
        });
      }
    }
  }

  // B. Wall Midpoints
  if (settings.wallMidpoints !== false) {
    for (const w of activeWalls) {
      const mid = { x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 };
      const dMid = distance(target, mid);
      if (dMid <= snapRadiusM) {
        candidates.push({
          point: mid,
          type: 'midpoint',
          distancePx: dMid * zoom,
          priority: 1.1,
          label: 'Mittelpunkt',
          symbol: '▲',
          targetId: w.id,
        });
      }
    }
  }

  // C. Division Points: 1/3, 2/3, 1/4, 3/4
  if (settings.divisionPoints !== false) {
    for (const w of activeWalls) {
      const ratios = [
        { r: 1 / 3, label: 'Drittelpunkt' },
        { r: 2 / 3, label: 'Drittelpunkt' },
        { r: 1 / 4, label: 'Viertelpunkt' },
        { r: 3 / 4, label: 'Viertelpunkt' },
      ];
      for (const { r, label } of ratios) {
        const p = {
          x: w.start.x + (w.end.x - w.start.x) * r,
          y: w.start.y + (w.end.y - w.start.y) * r,
        };
        const dPt = distance(target, p);
        if (dPt <= snapRadiusM) {
          candidates.push({
            point: p,
            type: 'division',
            distancePx: dPt * zoom,
            priority: 1.3,
            label,
            symbol: '⚬',
            targetId: w.id,
          });
        }
      }
    }
  }

  // D. Wall Intersections
  if (settings.intersections !== false && activeWalls.length > 1) {
    for (let i = 0; i < activeWalls.length; i++) {
      for (let j = i + 1; j < activeWalls.length; j++) {
        const inter = lineIntersection(
          activeWalls[i].start,
          activeWalls[i].end,
          activeWalls[j].start,
          activeWalls[j].end
        );
        if (inter) {
          const dInter = distance(target, inter);
          if (dInter <= snapRadiusM) {
            candidates.push({
              point: inter,
              type: 'intersection',
              distancePx: dInter * zoom,
              priority: 1.0,
              label: 'Schnittpunkt',
              symbol: '✕',
              matchedWallIds: [activeWalls[i].id, activeWalls[j].id],
            });
          }
        }
      }
    }
  }

  // E. Room Corners
  if (rooms.length > 0) {
    for (const r of rooms) {
      if (ignoredIds.includes(r.id)) continue;
      for (const p of r.polygon) {
        const dCorner = distance(target, p);
        if (dCorner <= snapRadiusM) {
          candidates.push({
            point: { ...p },
            type: 'room_corner',
            distancePx: dCorner * zoom,
            priority: 1.2,
            label: 'Raumecke',
            symbol: '⬟',
            targetId: r.id,
          });
        }
      }
    }
  }

  // F. Door & Window Centers
  for (const d of doors) {
    const parentWall = activeWalls.find((w) => w.id === d.wallId);
    if (parentWall) {
      const dCenter = {
        x: parentWall.start.x + (parentWall.end.x - parentWall.start.x) * d.position,
        y: parentWall.start.y + (parentWall.end.y - parentWall.start.y) * d.position,
      };
      const distC = distance(target, dCenter);
      if (distC <= snapRadiusM) {
        candidates.push({
          point: dCenter,
          type: 'door_center',
          distancePx: distC * zoom,
          priority: 1.2,
          label: 'Türmitte',
          symbol: '⌂',
          targetId: d.id,
        });
      }
    }
  }

  for (const win of windows) {
    const parentWall = activeWalls.find((w) => w.id === win.wallId);
    if (parentWall) {
      const winCenter = {
        x: parentWall.start.x + (parentWall.end.x - parentWall.start.x) * win.position,
        y: parentWall.start.y + (parentWall.end.y - parentWall.start.y) * win.position,
      };
      const distC = distance(target, winCenter);
      if (distC <= snapRadiusM) {
        candidates.push({
          point: winCenter,
          type: 'window_center',
          distancePx: distC * zoom,
          priority: 1.2,
          label: 'Fenstermitte',
          symbol: '⊟',
          targetId: win.id,
        });
      }
    }
  }

  // G. Plot Vertices
  if (plot && plot.enabled) {
    const plotPts =
      plot.points && plot.points.length >= 3
        ? plot.points
        : [
            { x: plot.x, y: plot.y },
            { x: plot.x + plot.width, y: plot.y },
            { x: plot.x + plot.width, y: plot.y + plot.depth },
            { x: plot.x, y: plot.y + plot.depth },
          ];
    for (const p of plotPts) {
      const dPt = distance(target, p);
      if (dPt <= snapRadiusM) {
        candidates.push({
          point: { ...p },
          type: 'plot_vertex',
          distancePx: dPt * zoom,
          priority: 1.15,
          label: 'Grundstücksecke',
          symbol: '◈',
        });
      }
    }
  }

  // H. Furniture Axes & Center
  for (const f of furniture) {
    if (ignoredIds.includes(f.id)) continue;
    const center = { x: f.x, y: f.y };
    const dCenter = distance(target, center);
    if (dCenter <= snapRadiusM) {
      candidates.push({
        point: center,
        type: 'furniture_axis',
        distancePx: dCenter * zoom,
        priority: 1.35,
        label: 'Möbelzentrum',
        symbol: '⊕',
        targetId: f.id,
      });
    }
  }

  // ==========================================================
  // 2. LOTPUNKT (Perpendicular foot point on a wall)
  // ==========================================================
  if (settings.perpendicular !== false && origin) {
    for (const w of activeWalls) {
      const proj = projectPointOntoWall(origin, w);
      if (proj.ratio >= -0.05 && proj.ratio <= 1.05) {
        const dFoot = distance(target, proj.point);
        if (dFoot <= snapRadiusM) {
          const guideLine: ActiveGuideLine = {
            id: 'lot_' + w.id,
            type: 'perpendicular',
            p1: origin,
            p2: proj.point,
            label: 'Lot (⟂)',
            symbol: '⟂',
            color: '#16a34a',
            dash: [5, 3],
            sourceWallIds: [w.id],
          };
          candidates.push({
            point: proj.point,
            type: 'lot',
            distancePx: dFoot * zoom,
            priority: 1.4,
            label: 'Lotpunkt (⟂)',
            symbol: '⟂',
            guideLine,
            targetId: w.id,
          });
        }
      }
    }
  }

  // ==========================================================
  // 3. FLUCHTEND / EXTENSIONS (Collinear Ray along Wall Axis)
  // ==========================================================
  if (settings.extensions !== false && activeWalls.length > 0) {
    for (const w of activeWalls) {
      const infProj = projectPointOntoInfiniteLine(target, w.start, w.end);
      // Lies outside [0, 1] segment
      if (infProj.t < -0.01 || infProj.t > 1.01) {
        const nearEnd = infProj.t < 0 ? w.start : w.end;
        const extDist = distance(infProj.point, nearEnd);
        if (extDist <= 30 && infProj.dist <= snapRadiusM) {
          const guideLine: ActiveGuideLine = {
            id: 'ext_' + w.id,
            type: 'extension',
            p1: nearEnd,
            p2: infProj.point,
            label: 'Fluchtend',
            symbol: '⇢',
            color: '#0284c7',
            dash: [4, 4],
            sourceWallIds: [w.id],
          };
          candidates.push({
            point: infProj.point,
            type: 'extension',
            distancePx: infProj.dist * zoom,
            priority: 2.0,
            label: 'Fluchtend',
            symbol: '⇢',
            guideLine,
            matchedWallIds: [w.id],
          });
        }
      }
    }

    // Intersections between two wall extension lines
    if (activeWalls.length >= 2) {
      const maxWallsToCheck = Math.min(activeWalls.length, 12);
      for (let i = 0; i < maxWallsToCheck; i++) {
        for (let j = i + 1; j < maxWallsToCheck; j++) {
          const inter = infiniteLineIntersection(
            activeWalls[i].start,
            activeWalls[i].end,
            activeWalls[j].start,
            activeWalls[j].end
          );
          if (inter) {
            const dInter = distance(target, inter);
            if (dInter <= snapRadiusM) {
              const guideLine: ActiveGuideLine = {
                id: `ext_cross_${activeWalls[i].id}_${activeWalls[j].id}`,
                type: 'extension',
                p1: activeWalls[i].end,
                p2: inter,
                label: 'Fluchtpunkt',
                symbol: '✕',
                color: '#0284c7',
                dash: [4, 4],
                sourceWallIds: [activeWalls[i].id, activeWalls[j].id],
              };
              candidates.push({
                point: inter,
                type: 'extension_intersection',
                distancePx: dInter * zoom,
                priority: 1.8,
                label: 'Fluchtpunkt (Kreuzung)',
                symbol: '✕',
                guideLine,
                matchedWallIds: [activeWalls[i].id, activeWalls[j].id],
              });
            }
          }
        }
      }
    }
  }

  // ==========================================================
  // 4. BEZIEHUNGEN: PARALLEL (//) & RECHTWINKLIG (90° / 45°)
  // ==========================================================
  if (origin) {
    const vec = { x: target.x - origin.x, y: target.y - origin.y };
    const currentDist = Math.hypot(vec.x, vec.y);

    if (currentDist >= 0.20) {
      const currentAngle = Math.atan2(vec.y, vec.x);
      const angularTol = Math.max(0.045, (snapRadiusPx * 1.3) / (currentDist * zoom));

      for (const w of activeWalls) {
        const wAng = Math.atan2(w.end.y - w.start.y, w.end.x - w.start.x);

        // A. Parallel (//)
        if (settings.parallel !== false) {
          for (const pAng of [wAng, wAng + Math.PI]) {
            const diff = angleDifference(currentAngle, pAng);
            if (diff <= angularTol) {
              const snappedPt = {
                x: origin.x + Math.cos(pAng) * currentDist,
                y: origin.y + Math.sin(pAng) * currentDist,
              };
              const wH1 = w.height || 2.50;
              const wH2 = w.endHeight ?? wH1;
              const isOpp = Math.abs(normalizeAngle(pAng - wAng)) > Math.PI / 2;
              const matchedH1 = isOpp ? wH2 : wH1;
              const matchedH2 = isOpp ? wH1 : wH2;
              const isSloped = Math.abs(wH2 - wH1) > 0.02;

              const heightLabel = isSloped
                ? `Höhen-Magnet: ${matchedH1.toFixed(2)}m → ${matchedH2.toFixed(2)}m (Wand gegenüber)`
                : `Höhe: ${matchedH1.toFixed(2)}m`;

              const guideLine: ActiveGuideLine = {
                id: 'parallel_' + w.id,
                type: 'parallel',
                p1: origin,
                p2: snappedPt,
                label: isSloped ? `Parallel (//) • ${matchedH1.toFixed(2)}m → ${matchedH2.toFixed(2)}m` : 'Parallel (//)',
                symbol: '//',
                color: '#2563eb',
                sourceWallIds: [w.id],
              };
              candidates.push({
                point: snappedPt,
                type: 'parallel',
                distancePx: diff * currentDist * zoom,
                priority: 2.2,
                label: isSloped ? `Parallel (//) • ${heightLabel}` : 'Parallel (//)',
                symbol: '//',
                guideLine,
                matchedWallIds: [w.id],
                matchedHeights: {
                  height: matchedH1,
                  endHeight: matchedH2,
                  sourceWallId: w.id,
                  isOpposite: true,
                  label: heightLabel,
                },
              });
            }
          }
        }

        // B. Rechtwinklig (90°)
        if (settings.rightAngle !== false) {
          for (const rAng of [wAng + Math.PI / 2, wAng - Math.PI / 2]) {
            const diff = angleDifference(currentAngle, rAng);
            if (diff <= angularTol) {
              const snappedPt = {
                x: origin.x + Math.cos(rAng) * currentDist,
                y: origin.y + Math.sin(rAng) * currentDist,
              };
              const guideLine: ActiveGuideLine = {
                id: 'perp_' + w.id,
                type: 'perpendicular',
                p1: origin,
                p2: snappedPt,
                label: 'Rechtwinklig (90°)',
                symbol: '⟂',
                color: '#16a34a',
                sourceWallIds: [w.id],
              };
              candidates.push({
                point: snappedPt,
                type: 'right_angle',
                distancePx: diff * currentDist * zoom,
                priority: 2.3,
                label: 'Rechtwinklig (90°)',
                symbol: '⟂',
                guideLine,
                matchedWallIds: [w.id],
              });
            }
          }

          // C. 45° und 135° relativ zur Wand
          for (const fAng of [
            wAng + Math.PI / 4,
            wAng - Math.PI / 4,
            wAng + (3 * Math.PI) / 4,
            wAng - (3 * Math.PI) / 4,
          ]) {
            const diff = angleDifference(currentAngle, fAng);
            if (diff <= angularTol * 0.85) {
              const snappedPt = {
                x: origin.x + Math.cos(fAng) * currentDist,
                y: origin.y + Math.sin(fAng) * currentDist,
              };
              candidates.push({
                point: snappedPt,
                type: 'right_angle',
                distancePx: diff * currentDist * zoom,
                priority: 2.5,
                label: '45° zu Wand',
                symbol: '∠',
                matchedWallIds: [w.id],
              });
            }
          }
        }
      }
    }
  }

  // ==========================================================
  // 5. GLEICHE WANDLÄNGE (=) (Equal Length)
  // ==========================================================
  if (origin && settings.equalLength !== false) {
    const vec = { x: target.x - origin.x, y: target.y - origin.y };
    const currentDist = Math.hypot(vec.x, vec.y);

    if (currentDist >= 0.3) {
      const currentAngle = Math.atan2(vec.y, vec.x);
      for (const w of activeWalls) {
        const wLen = Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
        if (wLen >= 0.5 && Math.abs(currentDist - wLen) <= snapRadiusM) {
          const snappedPt = {
            x: origin.x + Math.cos(currentAngle) * wLen,
            y: origin.y + Math.sin(currentAngle) * wLen,
          };
          const midPtCurrent = {
            x: (origin.x + snappedPt.x) / 2,
            y: (origin.y + snappedPt.y) / 2,
          };
          const midPtW = {
            x: (w.start.x + w.end.x) / 2,
            y: (w.start.y + w.end.y) / 2,
          };

          // Check if current direction is parallel to source wall to inherit heights
          const curDx = snappedPt.x - origin.x;
          const curDy = snappedPt.y - origin.y;
          const curLen = Math.hypot(curDx, curDy) || 1;
          const wDx = w.end.x - w.start.x;
          const wDy = w.end.y - w.start.y;
          const dot = (curDx * wDx + curDy * wDy) / (curLen * wLen);
          const isPar = Math.abs(Math.abs(dot) - 1) < 0.12;

          const wH1 = w.height || 2.50;
          const wH2 = w.endHeight ?? wH1;
          const isOpp = dot < 0;
          const matchedH1 = isOpp ? wH2 : wH1;
          const matchedH2 = isOpp ? wH1 : wH2;
          const isSloped = Math.abs(wH2 - wH1) > 0.02;

          let matchedHeightsInfo: MatchedHeightsInfo | undefined;
          if (isPar) {
            matchedHeightsInfo = {
              height: matchedH1,
              endHeight: matchedH2,
              sourceWallId: w.id,
              isOpposite: isOpp,
              label: isSloped
                ? `Höhe: ${matchedH1.toFixed(2)}m → ${matchedH2.toFixed(2)}m (Wand gegenüber)`
                : `Höhe: ${matchedH1.toFixed(2)}m`,
            };
          }

          const guideLine: ActiveGuideLine = {
            id: 'eqlen_' + w.id,
            type: 'equal_length',
            p1: origin,
            p2: snappedPt,
            label: isSloped && matchedHeightsInfo
              ? `${wLen.toFixed(2)}m = ${wLen.toFixed(2)}m (${matchedH1.toFixed(2)}m → ${matchedH2.toFixed(2)}m)`
              : `${wLen.toFixed(2)} m = ${wLen.toFixed(2)} m`,
            symbol: '=',
            color: '#ea580c',
            sourceWallIds: [w.id],
            matchedLength: wLen,
            tickMarks: [midPtCurrent, midPtW],
          };
          candidates.push({
            point: snappedPt,
            type: 'equal_length',
            distancePx: Math.abs(currentDist - wLen) * zoom,
            priority: 2.1,
            label: isSloped && matchedHeightsInfo
              ? `Gleiche Länge (${wLen.toFixed(2)}m) • Höhe ${matchedH1.toFixed(2)}m → ${matchedH2.toFixed(2)}m`
              : `Gleiche Länge (${wLen.toFixed(2)}m = ${wLen.toFixed(2)}m)`,
            symbol: '=',
            guideLine,
            matchedWallIds: [w.id],
            matchedLength: wLen,
            matchedHeights: matchedHeightsInfo,
          });
        }
      }
    }
  }

  // ==========================================================
  // 6. AUSRICHTUNG (Horizontal & Vertical Alignment Guides)
  // ==========================================================
  if (settings.alignment !== false) {
    // Collect key reference points
    const refPoints: Point2D[] = [];
    for (const w of activeWalls) {
      refPoints.push(w.start, w.end);
      refPoints.push({ x: (w.start.x + w.end.x) / 2, y: (w.start.y + w.end.y) / 2 });
    }
    for (const f of furniture) {
      if (!ignoredIds.includes(f.id)) refPoints.push({ x: f.x, y: f.y });
    }
    for (const r of rooms) {
      if (!ignoredIds.includes(r.id)) refPoints.push(...r.polygon);
    }

    for (const rp of refPoints) {
      // Horizontal align (same Y)
      const diffY = Math.abs(target.y - rp.y);
      if (diffY <= snapRadiusM && Math.abs(target.x - rp.x) > 0.1) {
        const snappedPt = { x: target.x, y: rp.y };
        const guideLine: ActiveGuideLine = {
          id: `align_h_${rp.x}_${rp.y}`,
          type: 'alignment',
          p1: { x: Math.min(target.x, rp.x) - 1.5, y: rp.y },
          p2: { x: Math.max(target.x, rp.x) + 1.5, y: rp.y },
          label: 'Fluchtlinie',
          color: '#6366f1',
          dash: [4, 4],
        };
        candidates.push({
          point: snappedPt,
          type: 'alignment',
          distancePx: diffY * zoom,
          priority: 2.6,
          label: 'Ausrichtung (Horizontal)',
          symbol: '┄',
          guideLine,
        });
      }

      // Vertical align (same X)
      const diffX = Math.abs(target.x - rp.x);
      if (diffX <= snapRadiusM && Math.abs(target.y - rp.y) > 0.1) {
        const snappedPt = { x: rp.x, y: target.y };
        const guideLine: ActiveGuideLine = {
          id: `align_v_${rp.x}_${rp.y}`,
          type: 'alignment',
          p1: { x: rp.x, y: Math.min(target.y, rp.y) - 1.5 },
          p2: { x: rp.x, y: Math.max(target.y, rp.y) + 1.5 },
          label: 'Fluchtlinie',
          color: '#6366f1',
          dash: [4, 4],
        };
        candidates.push({
          point: snappedPt,
          type: 'alignment',
          distancePx: diffX * zoom,
          priority: 2.6,
          label: 'Ausrichtung (Vertikal)',
          symbol: '┆',
          guideLine,
        });
      }
    }
  }

  // ==========================================================
  // 7. VERSATZ-FANG (Parallel Offset Snap)
  // ==========================================================
  if (settings.offset !== false && (settings.offsetDistance || 2.5) > 0) {
    const offDist = settings.offsetDistance || 2.5;
    for (const w of activeWalls) {
      const norm = getWallNormal(w);
      for (const sign of [1, -1]) {
        const pA = { x: w.start.x + norm.x * offDist * sign, y: w.start.y + norm.y * offDist * sign };
        const pB = { x: w.end.x + norm.x * offDist * sign, y: w.end.y + norm.y * offDist * sign };
        const proj = projectPointOntoInfiniteLine(target, pA, pB);
        if (proj.dist <= snapRadiusM && proj.t >= -0.05 && proj.t <= 1.05) {
          const guideLine: ActiveGuideLine = {
            id: `offset_${w.id}_${sign}`,
            type: 'offset',
            p1: pA,
            p2: pB,
            label: `Versatz ${offDist.toFixed(2)} m`,
            color: '#d97706',
            dash: [6, 3],
            sourceWallIds: [w.id],
          };
          candidates.push({
            point: proj.point,
            type: 'offset',
            distancePx: proj.dist * zoom,
            priority: 2.7,
            label: `Versatz (${offDist.toFixed(2)}m)`,
            symbol: '⫽',
            guideLine,
            matchedWallIds: [w.id],
          });
        }
      }
    }
  }

  // ==========================================================
  // 8. WALL SURFACE / EDGE SNAP (T-Junctions along axis)
  // ==========================================================
  for (const w of activeWalls) {
    const proj = projectPointOntoWall(target, w);
    if (proj.ratio >= 0.005 && proj.ratio <= 0.995 && proj.dist <= snapRadiusM * 1.3) {
      candidates.push({
        point: proj.point,
        type: 'edge',
        distancePx: proj.dist * zoom,
        priority: 2.8,
        label: 'Auf Wandachse',
        symbol: '◆',
        targetId: w.id,
      });
    }
  }

  // ==========================================================
  // 9. ORTHO & ANGLE STEPS
  // ==========================================================
  if (origin) {
    const vec = { x: target.x - origin.x, y: target.y - origin.y };
    const currentDist = Math.hypot(vec.x, vec.y);

    if (currentDist >= 0.1) {
      if (settings.ortho) {
        const dx = Math.abs(vec.x);
        const dy = Math.abs(vec.y);
        const orthoPt = dx > dy ? { x: target.x, y: origin.y } : { x: origin.x, y: target.y };
        candidates.push({
          point: orthoPt,
          type: 'ortho',
          distancePx: Math.min(dx, dy) * zoom,
          priority: 3.0,
          label: 'Ortho (90°)',
          symbol: '∟',
        });
      } else if (settings.step15Deg || settings.angleStepDeg) {
        const stepDeg = settings.angleStepDeg || 15;
        const stepRad = (stepDeg * Math.PI) / 180;
        const curAng = Math.atan2(vec.y, vec.x);
        const snappedAng = Math.round(curAng / stepRad) * stepRad;
        const angDiff = angleDifference(curAng, snappedAng);
        if (angDiff * currentDist * zoom <= snapRadiusPx * 1.2) {
          const stepPt = {
            x: origin.x + Math.cos(snappedAng) * currentDist,
            y: origin.y + Math.sin(snappedAng) * currentDist,
          };
          const degLabel = `${Math.round(((snappedAng * 180) / Math.PI + 360) % 360)}°`;
          candidates.push({
            point: stepPt,
            type: 'angle15',
            distancePx: angDiff * currentDist * zoom,
            priority: 3.2,
            label: degLabel,
            symbol: '∠',
          });
        }
      }
    }
  }

  // ==========================================================
  // 10. RASTER-FANG (Grid Snap fallback)
  // ==========================================================
  if (settings.grid && settings.gridSize > 0) {
    const g = settings.gridSize;
    const gx = Math.round(target.x / g) * g;
    const gy = Math.round(target.y / g) * g;
    const gDist = Math.hypot(gx - target.x, gy - target.y);
    if (gDist <= snapRadiusM * 1.5) {
      candidates.push({
        point: { x: gx, y: gy },
        type: 'grid',
        distancePx: gDist * zoom,
        priority: 4.0,
        label: 'Raster',
        symbol: '⊞',
      });
    }
  }

  // ==========================================================
  // 11. CANDIDATE SORTING & TAB-CYCLING
  // ==========================================================
  if (candidates.length === 0) {
    return {
      point: target,
      snapped: false,
      type: 'none',
      label: '',
      symbol: '',
      activeCandidateIndex: 0,
      candidatesCount: 0,
      guideLines: [],
      matchedWallIds: [],
    };
  }

  // Filter within snap distance
  const validCandidates = candidates.filter((c) => c.distancePx <= snapRadiusPx * 1.5);
  if (validCandidates.length === 0) {
    return {
      point: target,
      snapped: false,
      type: 'none',
      label: '',
      symbol: '',
      activeCandidateIndex: 0,
      candidatesCount: 0,
      guideLines: [],
      matchedWallIds: [],
    };
  }

  // Sort by priority (ascending) and then by distance in pixels (ascending)
  validCandidates.sort((a, b) => {
    if (Math.abs(a.priority - b.priority) > 0.05) {
      return a.priority - b.priority;
    }
    return a.distancePx - b.distancePx;
  });

  // Deduplicate points that are identical within 2mm
  const uniqueCandidates: SmartSnapCandidate[] = [];
  for (const c of validCandidates) {
    const isDup = uniqueCandidates.some(
      (u) => distance(u.point, c.point) < 0.002 && u.type === c.type
    );
    if (!isDup) uniqueCandidates.push(c);
  }

  const activeIndex = candidateIndex % uniqueCandidates.length;
  const chosen = uniqueCandidates[activeIndex];

  const guideLines: ActiveGuideLine[] = [];
  if (chosen.guideLine) guideLines.push(chosen.guideLine);
  if (chosen.secondaryGuideLine) guideLines.push(chosen.secondaryGuideLine);

  return {
    point: chosen.point,
    snapped: true,
    type: chosen.type,
    label: chosen.label,
    symbol: chosen.symbol,
    activeCandidateIndex: activeIndex,
    candidatesCount: uniqueCandidates.length,
    guideLines,
    matchedWallIds: chosen.matchedWallIds || (chosen.targetId ? [chosen.targetId] : []),
    matchedHeights: chosen.matchedHeights,
  };
}

/**
 * Calculates equal spacing / equidistant snap positions for doors & windows on a wall.
 */
export function calculateEqualSpacingRatio(
  wall: Wall,
  currentRatio: number,
  elementWidthM = 1.0,
  doors: Door[] = [],
  windows: Window[] = [],
  zoom = 55,
  snapRadiusPx = 18
): {
  ratio: number;
  snapped: boolean;
  label: string;
  guideInfo?: { p1: Point2D; p2: Point2D; text: string }[];
} {
  const wallLen = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  if (wallLen < 0.8) return { ratio: currentRatio, snapped: false, label: '' };

  const snapRatioTol = (snapRadiusPx / zoom) / wallLen;
  const currentPosM = currentRatio * wallLen;

  // 1. Exact wall center (Mitte)
  if (Math.abs(currentRatio - 0.5) <= snapRatioTol) {
    return {
      ratio: 0.5,
      snapped: true,
      label: `Wandmitte (${(wallLen / 2).toFixed(2)}m)`,
    };
  }

  // 2. Existing items on this wall
  const otherItems = [
    ...doors.filter((d) => d.wallId === wall.id).map((d) => ({ ratio: d.position, width: d.width })),
    ...windows.filter((win) => win.wallId === wall.id).map((w) => ({ ratio: w.position, width: w.width })),
  ].sort((a, b) => a.ratio - b.ratio);

  if (otherItems.length > 0) {
    // Equidistant between adjacent elements
    const anchors = [0, ...otherItems.map((item) => item.ratio), 1];
    for (let i = 0; i < anchors.length - 1; i++) {
      const midRatio = (anchors[i] + anchors[i + 1]) / 2;
      if (Math.abs(currentRatio - midRatio) <= snapRatioTol) {
        const segDistM = (anchors[i + 1] - anchors[i]) * wallLen;
        return {
          ratio: midRatio,
          snapped: true,
          label: `Gleicher Abstand (${(segDistM / 2).toFixed(2)}m)`,
        };
      }
    }

    // Equal margin to corner matching another element's margin
    for (const item of otherItems) {
      const marginM = Math.min(item.ratio, 1 - item.ratio) * wallLen;
      if (marginM > 0.2) {
        // Near start
        const startRatio = marginM / wallLen;
        if (Math.abs(currentRatio - startRatio) <= snapRatioTol) {
          return {
            ratio: startRatio,
            snapped: true,
            label: `Gleicher Randabstand (${marginM.toFixed(2)}m)`,
          };
        }
        // Near end
        const endRatio = 1 - marginM / wallLen;
        if (Math.abs(currentRatio - endRatio) <= snapRatioTol) {
          return {
            ratio: endRatio,
            snapped: true,
            label: `Gleicher Randabstand (${marginM.toFixed(2)}m)`,
          };
        }
      }
    }
  }

  return { ratio: currentRatio, snapped: false, label: '' };
}
