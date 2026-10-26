/**
 * Architectural Plan Analysis, Automated DIN 1356 Dimensioning,
 * Room Cycle Detection, and DIN 277 / WoFlV Calculation Engine.
 */

import {
  Wall,
  Door,
  Window,
  Room,
  Point2D,
  FloorFinish,
  ProjectDefaults,
} from '../types/cad';
import { distance, polygonAreaAndPerimeter, isPointInPolygon } from './cadMath';

export interface AutoDimensionSegment {
  start: Point2D;
  end: Point2D;
  witnessStart1: Point2D;
  witnessStart2: Point2D;
  lengthM: number;
  label: string;
  subLabel?: string;
  tier: 1 | 2 | 3; // 1 = Openings/Piers, 2 = Rooms/Walls, 3 = Overall Building
  side: 'north' | 'south' | 'west' | 'east';
}

export interface SectionCutMarker {
  id: string;
  label: string;
  start: Point2D;
  end: Point2D;
  direction: 'up' | 'down' | 'left' | 'right';
}

export interface ElevationMarker {
  position: Point2D;
  label: string;
  elevationText: string;
  isExterior?: boolean;
}

export interface StructuralAxis {
  id: string;
  label: string;
  orientation: 'vertical' | 'horizontal';
  coord: number; // X for vertical, Y for horizontal
  start: Point2D;
  end: Point2D;
}

export interface WallScheduleEntry {
  pos: string;
  category: string;
  materialName: string;
  thicknessCm: number;
  totalLengthM: number;
  heightM: number;
  grossAreaM2: number;
  openingsAreaM2: number;
  netAreaM2: number;
  volumeM3: number;
  uValue: string;
}

export interface ArchitecturalPlanSummary {
  rooms: Room[];
  footprintPolygon: Point2D[];
  bgfM2: number; // Brutto-Grundfläche nach DIN 277
  kgfM2: number; // Konstruktions-Grundfläche nach DIN 277
  nrfM2: number; // Netto-Raumfläche nach DIN 277
  livingAreaM2: number; // Wohnfläche nach WoFlV
  briM3: number; // Brutto-Rauminhalt nach DIN 277
  totalWallLengthM: number;
  exteriorWallLengthM: number;
  interiorWallLengthM: number;
  dimensionChains: AutoDimensionSegment[];
  sectionCuts: SectionCutMarker[];
  elevationMarkers: ElevationMarker[];
  structuralAxes: StructuralAxis[];
  wallSchedule: WallScheduleEntry[];
}

/**
 * Formats numbers in German DIN 1356 architectural style:
 * - Meters >= 1.00 m in m with 2 decimals (e.g. "3,65" or "1,01")
 * - Centimeters < 1.00 m in cm (e.g. "36,5" or "24") or meters ("0,365")
 */
export function formatArchDim(meters: number, useCmUnderOneMeter = false): string {
  if (!isFinite(meters) || meters <= 0) return '0,00';
  if (useCmUnderOneMeter && meters < 1.0) {
    const cm = Math.round(meters * 1000) / 10;
    return Number.isInteger(cm) ? `${cm}` : cm.toFixed(1).replace('.', ',');
  }
  const mm = Math.round(meters * 1000);
  if (mm % 10 === 5) {
    const base = Math.floor(mm / 10) / 100;
    return `${base.toFixed(2).replace('.', ',')}⁵`;
  }
  return meters.toFixed(2).replace('.', ',');
}

/**
 * Translates internal door type keys into professional German VOB / DIN 18299 terms.
 */
export function getGermanDoorTypeLabel(type: string): string {
  const map: Record<string, string> = {
    entry: 'Hauseingangstür (RC2 / Thermotrennung)',
    single: 'Innentür / Zimmertür (stumpf einschlagend)',
    double: 'Zweiflügelige Anschlagtür',
    sliding: 'Hebe-Schiebetür (barrierearm)',
    pocket: 'Wandtaschen-Schiebetür',
    glass: 'Ganzglastür (ESG 8 mm Sicherheitsglas)',
    bifold: 'Faltschiebetür-Anlage',
    opening: 'Wanddurchbruch / Offener Durchgang',
  };
  return map[type] || 'Innentür (Standard DIN 18101)';
}

/**
 * Translates internal window type keys into professional German VOB / DIN 18299 terms.
 */
export function getGermanWindowTypeLabel(type: string): string {
  const map: Record<string, string> = {
    standard: 'Dreh-Kipp-Fenster (1-flg., 3-fach Verglasung)',
    double: 'Zweiflügeliges Dreh-Kipp-Fenster mit Stulp',
    triple: 'Dreiteiliges Fensterelement',
    floor_to_ceiling: 'Bodentiefes Fensterelement (inkl. VSG)',
    panorama: 'Panorama-Festverglasung (bodentief)',
    sliding: 'Parallel-Schiebe-Kipp-Fenster (PSK)',
    fixed: 'Festverglasung',
    skylight: 'Dachflächenfenster',
    ribbon: ' Lichtband / Oberlicht-Fenster',
    glass_block: 'Glasbaustein-Wandfeld',
  };
  return map[type] || 'Dreh-Kipp-Fenster (3-fach Isolierglas)';
}

/**
 * Translates internal room category keys into DIN 277 / WoFlV German labels.
 */
export function getGermanRoomCategoryLabel(category: string): string {
  const map: Record<string, string> = {
    living: 'NUF 1 – Wohnen & Aufenthalt',
    sleeping: 'NUF 1 – Schlafen / Privat',
    kitchen: 'NUF 1 – Kochen & Essen',
    bath: 'NUF 7 – Sanitär / Bad / WC',
    corridor: 'VF – Verkehrsfläche / Flur',
    storage: 'NUF 5 – Lager / Abstellraum / HWR',
    outdoor: 'Freisitz / Terrasse (50 % WoFlV)',
  };
  return map[category] || 'NUF 1 – Wohnen & Aufenthalt';
}

/**
 * Translates internal floor finish keys into German descriptions.
 */
export function getGermanFloorFinishLabel(finish: string): string {
  const map: Record<string, string> = {
    parquet: 'Eichenparkett (geölt)',
    tiles: 'Feinsteinzeug-Fliesen (R9)',
    carpet: 'Textilbelag / Teppich',
    concrete: 'Sichtestrich (geschliffen)',
    wood_plank: 'Massivholzdielen',
    terrace_stone: 'Natursteinplatten / Holzdeck',
    laminate: 'Design-Laminatboden',
  };
  return map[finish] || 'Parkett / Fliesen';
}

/**
 * Translates internal wall material keys into German masonry / construction terms.
 */
export function getGermanWallMaterialInfo(
  material: string,
  isExterior: boolean,
  thicknessM: number
): { name: string; uValue: string } {
  const map: Record<string, { name: string; uExt: string; uInt: string }> = {
    brick: { name: 'Poroton-Planziegel Mauerwerk', uExt: '0,20 W/(m²K)', uInt: '1,40 W/(m²K)' },
    concrete: { name: 'Stahlbeton C25/30 (DIN EN 1992)', uExt: '0,22 W/(m²K)', uInt: '2,10 W/(m²K)' },
    timber: { name: 'Holzständerwerk mit Wärmedämmung', uExt: '0,16 W/(m²K)', uInt: '0,45 W/(m²K)' },
    drywall: { name: 'GK-Metallständerwand (doppelt beplankt)', uExt: '0,24 W/(m²K)', uInt: '0,55 W/(m²K)' },
    aerated_concrete: { name: 'Porenbeton Planstein (PP2)', uExt: '0,19 W/(m²K)', uInt: '0,95 W/(m²K)' },
    natural_stone: { name: 'Natursteinmauerwerk / Verblender', uExt: '0,25 W/(m²K)', uInt: '1,80 W/(m²K)' },
    exposed_brick: { name: 'Klinkermauerwerk zweischalig', uExt: '0,18 W/(m²K)', uInt: '1,30 W/(m²K)' },
  };
  const entry = map[material] || (isExterior
    ? { name: 'Hochlochziegel + WDVS', uExt: '0,20 W/(m²K)', uInt: '1,20 W/(m²K)' }
    : { name: thicknessM >= 0.17 ? 'Kalksandstein-Mauerwerk' : 'Trockenbau-Ständerwand', uExt: '0,24 W/(m²K)', uInt: '0,65 W/(m²K)' });
  return {
    name: entry.name,
    uValue: isExterior ? entry.uExt : entry.uInt,
  };
}

/**
 * Automatically detects enclosed rooms from wall segments using both:
 * 1) Orthogonal / Grid cell room decomposition (handles T-junctions & overlapping walls seamlessly)
 * 2) Planar cycle fallback
 * Also computes exact Brutto-Grundfläche (BGF) from the outer building envelope.
 */
export function detectRoomsAndEnvelope(
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  existingRooms: Room[],
  storyHeight = 2.75,
  defaults?: ProjectDefaults
): {
  rooms: Room[];
  footprintPolygon: Point2D[];
  bgfM2: number;
  kgfM2: number;
  nrfM2: number;
  livingAreaM2: number;
  briM3: number;
} {
  if (!walls || walls.length === 0) {
    return {
      rooms: existingRooms || [],
      footprintPolygon: [],
      bgfM2: 0,
      kgfM2: 0,
      nrfM2: 0,
      livingAreaM2: 0,
      briM3: 0,
    };
  }

  // 1. Collect X and Y coordinates from walls to decompose orthogonal / mixed spaces
  const snapCoord = (v: number) => Math.round(v * 20) / 20; // 5cm grid snap for topology
  const xsSet = new Set<number>();
  const ysSet = new Set<number>();

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const w of walls) {
    const halfT = (w.thickness || (w.isExterior ? 0.30 : 0.115)) / 2;
    const x1 = Math.min(w.start.x, w.end.x);
    const x2 = Math.max(w.start.x, w.end.x);
    const y1 = Math.min(w.start.y, w.end.y);
    const y2 = Math.max(w.start.y, w.end.y);

    minX = Math.min(minX, x1 - halfT);
    maxX = Math.max(maxX, x2 + halfT);
    minY = Math.min(minY, y1 - halfT);
    maxY = Math.max(maxY, y2 + halfT);

    xsSet.add(snapCoord(w.start.x));
    xsSet.add(snapCoord(w.end.x));
    ysSet.add(snapCoord(w.start.y));
    ysSet.add(snapCoord(w.end.y));
  }

  // Merge coordinates that are within 0.25m of each other (same wall line)
  const mergeCoords = (arr: number[]): number[] => {
    const sorted = [...arr].sort((a, b) => a - b);
    const result: number[] = [];
    for (const v of sorted) {
      if (result.length === 0 || v - result[result.length - 1] > 0.28) {
        result.push(v);
      }
    }
    return result;
  };

  const xs = mergeCoords(Array.from(xsSet));
  const ys = mergeCoords(Array.from(ysSet));

  // Helper: Check if a wall segment blocks the boundary between two adjacent grid cells
  const hasHorizontalWallAt = (xMid: number, yLine: number): { found: boolean; thickness: number } => {
    for (const w of walls) {
      const dy = Math.abs(w.end.y - w.start.y);
      const dx = Math.abs(w.end.x - w.start.x);
      if (dy < 0.35 && dx > 0.25) {
        const wy = (w.start.y + w.end.y) / 2;
        const wxMin = Math.min(w.start.x, w.end.x) - 0.20;
        const wxMax = Math.max(w.start.x, w.end.x) + 0.20;
        if (Math.abs(wy - yLine) <= 0.35 && xMid >= wxMin && xMid <= wxMax) {
          return { found: true, thickness: w.thickness || (w.isExterior ? 0.30 : 0.115) };
        }
      }
    }
    return { found: false, thickness: 0 };
  };

  const hasVerticalWallAt = (xLine: number, yMid: number): { found: boolean; thickness: number } => {
    for (const w of walls) {
      const dx = Math.abs(w.end.x - w.start.x);
      const dy = Math.abs(w.end.y - w.start.y);
      if (dx < 0.35 && dy > 0.25) {
        const wx = (w.start.x + w.end.x) / 2;
        const wyMin = Math.min(w.start.y, w.end.y) - 0.20;
        const wyMax = Math.max(w.start.y, w.end.y) + 0.20;
        if (Math.abs(wx - xLine) <= 0.35 && yMid >= wyMin && yMid <= wyMax) {
          return { found: true, thickness: w.thickness || (w.isExterior ? 0.30 : 0.115) };
        }
      }
    }
    return { found: false, thickness: 0 };
  };

  const numCols = xs.length - 1;
  const numRows = ys.length - 1;

  // Grid cell states: -1 = unvisited, -2 = outside (leaked to exterior), >=0 = room cluster ID
  const cellState: number[][] = Array.from({ length: numRows }, () => Array(numCols).fill(-1));

  // Flood-fill from outside edges to eliminate cells not bounded by walls
  const queue: [number, number][] = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const xMid = (xs[c] + xs[c + 1]) / 2;
      const yMid = (ys[r] + ys[r + 1]) / 2;
      const openTop = r === 0 && !hasHorizontalWallAt(xMid, ys[0]).found;
      const openBottom = r === numRows - 1 && !hasHorizontalWallAt(xMid, ys[numRows]).found;
      const openLeft = c === 0 && !hasVerticalWallAt(xs[0], yMid).found;
      const openRight = c === numCols - 1 && !hasVerticalWallAt(xs[numCols], yMid).found;

      if (openTop || openBottom || openLeft || openRight) {
        cellState[r][c] = -2;
        queue.push([r, c]);
      }
    }
  }

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    const xMid = (xs[c] + xs[c + 1]) / 2;
    const yMid = (ys[r] + ys[r + 1]) / 2;

    // Top neighbor (r - 1, c)
    if (r > 0 && cellState[r - 1][c] === -1 && !hasHorizontalWallAt(xMid, ys[r]).found) {
      cellState[r - 1][c] = -2;
      queue.push([r - 1, c]);
    }
    // Bottom neighbor (r + 1, c)
    if (r < numRows - 1 && cellState[r + 1][c] === -1 && !hasHorizontalWallAt(xMid, ys[r + 1]).found) {
      cellState[r + 1][c] = -2;
      queue.push([r + 1, c]);
    }
    // Left neighbor (r, c - 1)
    if (c > 0 && cellState[r][c - 1] === -1 && !hasVerticalWallAt(xs[c], yMid).found) {
      cellState[r][c - 1] = -2;
      queue.push([r, c - 1]);
    }
    // Right neighbor (r, c + 1)
    if (c < numCols - 1 && cellState[r][c + 1] === -1 && !hasVerticalWallAt(xs[c + 1], yMid).found) {
      cellState[r][c + 1] = -2;
      queue.push([r, c + 1]);
    }
  }

  // Group remaining interior cells into connected rooms
  interface DetectedCluster {
    cells: [number, number][];
    minC: number;
    maxC: number;
    minR: number;
    maxR: number;
    grossAreaM2: number;
    netAreaM2: number;
    perimeterM: number;
    polygon: Point2D[];
  }

  const clusters: DetectedCluster[] = [];
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (cellState[r][c] === -1) {
        const clusterId = clusters.length;
        const cells: [number, number][] = [];
        const cQueue: [number, number][] = [[r, c]];
        cellState[r][c] = clusterId;

        while (cQueue.length > 0) {
          const [cr, cc] = cQueue.shift()!;
          cells.push([cr, cc]);
          const xMid = (xs[cc] + xs[cc + 1]) / 2;
          const yMid = (ys[cr] + ys[cr + 1]) / 2;

          if (cr > 0 && cellState[cr - 1][cc] === -1 && !hasHorizontalWallAt(xMid, ys[cr]).found) {
            cellState[cr - 1][cc] = clusterId;
            cQueue.push([cr - 1, cc]);
          }
          if (cr < numRows - 1 && cellState[cr + 1][cc] === -1 && !hasHorizontalWallAt(xMid, ys[cr + 1]).found) {
            cellState[cr + 1][cc] = clusterId;
            cQueue.push([cr + 1, cc]);
          }
          if (cc > 0 && cellState[cr][cc - 1] === -1 && !hasVerticalWallAt(xs[cc], yMid).found) {
            cellState[cr][cc - 1] = clusterId;
            cQueue.push([cr, cc - 1]);
          }
          if (cc < numCols - 1 && cellState[cr][cc + 1] === -1 && !hasVerticalWallAt(xs[cc + 1], yMid).found) {
            cellState[cr][cc + 1] = clusterId;
            cQueue.push([cr, cc + 1]);
          }
        }

        let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
        let grossArea = 0;
        for (const [cr, cc] of cells) {
          minC = Math.min(minC, cc);
          maxC = Math.max(maxC, cc + 1);
          minR = Math.min(minR, cr);
          maxR = Math.max(maxR, cr + 1);
          grossArea += (xs[cc + 1] - xs[cc]) * (ys[cr + 1] - ys[cr]);
        }

        // Compute inner net bounds by inset of half wall thickness (~0.12m)
        const inset = 0.12;
        const x1 = xs[minC] + inset;
        const x2 = Math.max(x1 + 0.2, xs[maxC] - inset);
        const y1 = ys[minR] + inset;
        const y2 = Math.max(y1 + 0.2, ys[maxR] - inset);

        const wSpan = x2 - x1;
        const hSpan = y2 - y1;
        const RatioBox = grossArea / Math.max(0.01, (xs[maxC] - xs[minC]) * (ys[maxR] - ys[minR]));
        const netArea = Math.max(0.5, wSpan * hSpan * RatioBox);
        const perim = 2 * (wSpan + hSpan);

        if (netArea >= 0.8) {
          clusters.push({
            cells,
            minC,
            maxC,
            minR,
            maxR,
            grossAreaM2: grossArea,
            netAreaM2: Math.round(netArea * 100) / 100,
            perimeterM: Math.round(perim * 100) / 100,
            polygon: [
              { x: x1, y: y1 },
              { x: x2, y: y1 },
              { x: x2, y: y2 },
              { x: x1, y: y2 },
            ],
          });
        }
      }
    }
  }

  // Merge existing rooms with auto-detected clusters
  const finalRooms: Room[] = [...(existingRooms || [])];
  const defaultRoomHeight = defaults?.roomHeight || Math.max(2.40, storyHeight - 0.20);

  // Role assignment counter for intelligent German naming when rooms are unnamed
  let sleepCount = 1;
  let bathAssigned = false;
  let kitchenAssigned = false;

  clusters.forEach((cl, idx) => {
    const cx = (cl.polygon[0].x + cl.polygon[2].x) / 2;
    const cy = (cl.polygon[0].y + cl.polygon[2].y) / 2;

    // Check if an existing room already covers this centroid
    const alreadyExists = finalRooms.some(
      (r) => r.polygon && r.polygon.length >= 3 && isPointInPolygon({ x: cx, y: cy }, r.polygon)
    );
    if (alreadyExists) return;

    const wSpan = cl.polygon[1].x - cl.polygon[0].x;
    const hSpan = cl.polygon[2].y - cl.polygon[1].y;
    const aspect = Math.max(wSpan, hSpan) / Math.max(0.1, Math.min(wSpan, hSpan));

    // Count doors opening into/near this room
    let doorCount = 0;
    for (const d of doors) {
      const pw = walls.find((w) => w.id === d.wallId);
      if (pw) {
        const dx = pw.start.x + (pw.end.x - pw.start.x) * d.position;
        const dy = pw.start.y + (pw.end.y - pw.start.y) * d.position;
        if (
          dx >= cl.polygon[0].x - 0.5 &&
          dx <= cl.polygon[2].x + 0.5 &&
          dy >= cl.polygon[0].y - 0.5 &&
          dy <= cl.polygon[2].y + 0.5
        ) {
          doorCount++;
        }
      }
    }

    let name = `Raum ${finalRooms.length + 1}`;
    let category: Room['category'] = 'living';
    let floorFinish: FloorFinish = 'parquet';

    if (aspect > 2.2 || doorCount >= 3) {
      name = 'Flur / Diele';
      category = 'corridor';
      floorFinish = 'tiles';
    } else if (cl.netAreaM2 >= 18) {
      name = 'Wohnen / Essen';
      category = 'living';
      floorFinish = 'parquet';
    } else if (cl.netAreaM2 < 6.5 && !bathAssigned) {
      name = 'Bad / WC';
      category = 'bath';
      floorFinish = 'tiles';
      bathAssigned = true;
    } else if (cl.netAreaM2 < 9.5 && !kitchenAssigned) {
      name = 'Küche';
      category = 'kitchen';
      floorFinish = 'tiles';
      kitchenAssigned = true;
    } else if (cl.netAreaM2 < 4.5) {
      name = 'HWR / Abstellraum';
      category = 'storage';
      floorFinish = 'tiles';
    } else {
      name = sleepCount === 1 ? 'Schlafen' : `Zimmer ${sleepCount}`;
      category = 'sleeping';
      floorFinish = 'parquet';
      sleepCount++;
    }

    finalRooms.push({
      id: `auto_rm_${idx + 1}`,
      name,
      category,
      polygon: cl.polygon,
      areaM2: cl.netAreaM2,
      grossAreaM2: Math.round(cl.grossAreaM2 * 100) / 100,
      perimeterM: cl.perimeterM,
      height: defaultRoomHeight,
      floorFinish,
      color: '#f59e0b',
      targetLivingArea: true,
    });
  });

  // Fallback if walls don't form a closed grid (e.g. single room or open polyline)
  if (finalRooms.length === 0 && isFinite(minX) && maxX > minX + 1 && maxY > minY + 1) {
    const wNet = Math.max(1, maxX - minX - 0.6);
    const hNet = Math.max(1, maxY - minY - 0.6);
    const area = Math.round(wNet * hNet * 100) / 100;
    finalRooms.push({
      id: 'auto_rm_main',
      name: 'Hauptraum / Wohnen',
      category: 'living',
      polygon: [
        { x: minX + 0.3, y: minY + 0.3 },
        { x: maxX - 0.3, y: minY + 0.3 },
        { x: maxX - 0.3, y: maxY - 0.3 },
        { x: minX + 0.3, y: maxY - 0.3 },
      ],
      areaM2: area,
      perimeterM: Math.round(2 * (wNet + hNet) * 100) / 100,
      height: defaultRoomHeight,
      floorFinish: 'parquet',
      color: '#f59e0b',
      targetLivingArea: true,
    });
  }

  // Compute NRF and Living Area (WoFlV: outdoor = 50%, others = 100%)
  let nrfM2 = 0;
  let livingAreaM2 = 0;
  for (const r of finalRooms) {
    const a = r.areaM2 || polygonAreaAndPerimeter(r.polygon).area;
    nrfM2 += a;
    if (r.targetLivingArea !== false) {
      livingAreaM2 += r.category === 'outdoor' ? a * 0.5 : a;
    }
  }

  // Compute Wall Construction Footprint (KGF)
  let wallFootprintArea = 0;
  for (const w of walls) {
    const len = distance(w.start, w.end);
    const thick = w.thickness || (w.isExterior ? 0.30 : 0.115);
    wallFootprintArea += len * thick;
  }

  // Compute BGF (Brutto-Grundfläche nach DIN 277) = NRF + KGF
  const bgfFromCells = clusters.reduce((acc, c) => acc + c.grossAreaM2, 0) + wallFootprintArea * 0.65;
  const bgfM2 = Math.max(nrfM2 + wallFootprintArea * 0.75, bgfFromCells);
  const kgfM2 = Math.max(wallFootprintArea * 0.75, bgfM2 - nrfM2);
  const briM3 = bgfM2 * (storyHeight || 2.75);

  const footprintPolygon: Point2D[] = isFinite(minX)
    ? [
        { x: minX, y: minY },
        { x: maxX, y: minY },
        { x: maxX, y: maxY },
        { x: minX, y: maxY },
      ]
    : [];

  return {
    rooms: finalRooms,
    footprintPolygon,
    bgfM2: Math.round(bgfM2 * 100) / 100,
    kgfM2: Math.round(kgfM2 * 100) / 100,
    nrfM2: Math.round(nrfM2 * 100) / 100,
    livingAreaM2: Math.round(livingAreaM2 * 100) / 100,
    briM3: Math.round(briM3 * 100) / 100,
  };
}

/**
 * Generates 3-Tier Exterior Dimension Chains (Maßketten nach DIN 1356-1 & DIN 406)
 * on all 4 sides of the building:
 * - Tier 1 (innermost): Openings (windows, doors) and wall piers
 * - Tier 2 (middle): Room spans, wall partitions & wall thicknesses
 * - Tier 3 (outermost): Total outer building length / width
 */
export function generateExteriorDimensionChains(
  walls: Wall[],
  doors: Door[],
  windows: Window[]
): AutoDimensionSegment[] {
  if (!walls || walls.length === 0) return [];

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  const xPartitions = new Set<number>();
  const yPartitions = new Set<number>();

  for (const w of walls) {
    const halfT = (w.thickness || (w.isExterior ? 0.30 : 0.115)) / 2;
    const wxMin = Math.min(w.start.x, w.end.x);
    const wxMax = Math.max(w.start.x, w.end.x);
    const wyMin = Math.min(w.start.y, w.end.y);
    const wyMax = Math.max(w.start.y, w.end.y);

    minX = Math.min(minX, wxMin - halfT);
    maxX = Math.max(maxX, wxMax + halfT);
    minY = Math.min(minY, wyMin - halfT);
    maxY = Math.max(maxY, wyMax + halfT);

    // Collect vertical wall coordinates for X partition chain
    if (Math.abs(w.end.x - w.start.x) < 0.25 && Math.abs(w.end.y - w.start.y) > 0.4) {
      const cx = (w.start.x + w.end.x) / 2;
      xPartitions.add(Math.round((cx - halfT) * 100) / 100);
      xPartitions.add(Math.round((cx + halfT) * 100) / 100);
    }
    // Collect horizontal wall coordinates for Y partition chain
    if (Math.abs(w.end.y - w.start.y) < 0.25 && Math.abs(w.end.x - w.start.x) > 0.4) {
      const cy = (w.start.y + w.end.y) / 2;
      yPartitions.add(Math.round((cy - halfT) * 100) / 100);
      yPartitions.add(Math.round((cy + halfT) * 100) / 100);
    }
  }

  if (!isFinite(minX) || maxX - minX < 0.5 || maxY - minY < 0.5) return [];

  xPartitions.add(Math.round(minX * 100) / 100);
  xPartitions.add(Math.round(maxX * 100) / 100);
  yPartitions.add(Math.round(minY * 100) / 100);
  yPartitions.add(Math.round(maxY * 100) / 100);

  const cleanSortedStops = (stops: number[], minGap = 0.08): number[] => {
    const s = [...stops].sort((a, b) => a - b);
    const out: number[] = [];
    for (const v of s) {
      if (out.length === 0 || v - out[out.length - 1] >= minGap) {
        out.push(v);
      }
    }
    return out;
  };

  // Collect openings along North, South, West, East sides
  interface OpeningSpan {
    c1: number;
    c2: number;
    subLabel: string;
  }

  const northOpenings: OpeningSpan[] = [];
  const southOpenings: OpeningSpan[] = [];
  const westOpenings: OpeningSpan[] = [];
  const eastOpenings: OpeningSpan[] = [];

  const registerOpening = (
    wall: Wall,
    posRatio: number,
    widthM: number,
    heightM: number,
    parapetM?: number
  ) => {
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 0.2) return;
    const ux = dx / len;
    const uy = dy / len;
    const cx = wall.start.x + dx * posRatio;
    const cy = wall.start.y + dy * posRatio;
    const halfW = widthM / 2;

    const sub =
      parapetM !== undefined
        ? `H=${formatArchDim(heightM)} / BRH=${formatArchDim(parapetM, true)}`
        : `H=${formatArchDim(heightM)}`;

    // Horizontal wall
    if (Math.abs(dy) < 0.35) {
      const c1 = Math.min(cx - ux * halfW, cx + ux * halfW);
      const c2 = Math.max(cx - ux * halfW, cx + ux * halfW);
      if (Math.abs(cy - minY) <= (maxY - minY) * 0.45) {
        northOpenings.push({ c1, c2, subLabel: sub });
      } else {
        southOpenings.push({ c1, c2, subLabel: sub });
      }
    } else if (Math.abs(dx) < 0.35) {
      // Vertical wall
      const c1 = Math.min(cy - uy * halfW, cy + uy * halfW);
      const c2 = Math.max(cy - uy * halfW, cy + uy * halfW);
      if (Math.abs(cx - minX) <= (maxX - minX) * 0.45) {
        westOpenings.push({ c1, c2, subLabel: sub });
      } else {
        eastOpenings.push({ c1, c2, subLabel: sub });
      }
    }
  };

  for (const win of windows) {
    const pw = walls.find((w) => w.id === win.wallId);
    if (pw) registerOpening(pw, win.position, win.width, win.height, win.parapetHeight);
  }
  for (const d of doors) {
    const pw = walls.find((w) => w.id === d.wallId);
    if (pw) registerOpening(pw, d.position, d.width, d.height);
  }

  const segments: AutoDimensionSegment[] = [];
  const tierDist = [0.65, 1.25, 1.85]; // Offset distances in meters from building outline

  // Helper to build horizontal dimension chain (North or South)
  const buildHorizontalSide = (side: 'north' | 'south', openings: OpeningSpan[]) => {
    const sign = side === 'north' ? -1 : 1;
    const baseY = side === 'north' ? minY : maxY;

    // Tier 1: Openings & Piers
    const t1Y = baseY + sign * tierDist[0];
    if (openings.length > 0) {
      const rawStops = [minX, maxX];
      openings.forEach((op) => {
        rawStops.push(Math.max(minX, Math.min(maxX, op.c1)));
        rawStops.push(Math.max(minX, Math.min(maxX, op.c2)));
      });
      const stops = cleanSortedStops(rawStops, 0.08);
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        const len = b - a;
        if (len < 0.05) continue;
        const mid = (a + b) / 2;
        const matchedOp = openings.find((op) => mid >= op.c1 - 0.05 && mid <= op.c2 + 0.05);
        segments.push({
          start: { x: a, y: t1Y },
          end: { x: b, y: t1Y },
          witnessStart1: { x: a, y: baseY },
          witnessStart2: { x: b, y: baseY },
          lengthM: len,
          label: formatArchDim(len),
          subLabel: matchedOp?.subLabel,
          tier: 1,
          side,
        });
      }
    }

    // Tier 2: Room Spans & Wall Thicknesses
    const t2Y = baseY + sign * (openings.length > 0 ? tierDist[1] : tierDist[0]);
    const pStops = cleanSortedStops(Array.from(xPartitions), 0.08);
    if (pStops.length > 2) {
      for (let i = 0; i < pStops.length - 1; i++) {
        const a = pStops[i];
        const b = pStops[i + 1];
        const len = b - a;
        if (len < 0.05) continue;
        segments.push({
          start: { x: a, y: t2Y },
          end: { x: b, y: t2Y },
          witnessStart1: { x: a, y: baseY },
          witnessStart2: { x: b, y: baseY },
          lengthM: len,
          label: formatArchDim(len, len < 0.45),
          tier: 2,
          side,
        });
      }
    }

    // Tier 3: Total Overall Building Width
    const t3Y =
      baseY +
      sign *
        (openings.length > 0 && pStops.length > 2
          ? tierDist[2]
          : openings.length > 0 || pStops.length > 2
          ? tierDist[1]
          : tierDist[0]);
    const totalLen = maxX - minX;
    segments.push({
      start: { x: minX, y: t3Y },
      end: { x: maxX, y: t3Y },
      witnessStart1: { x: minX, y: baseY },
      witnessStart2: { x: maxX, y: baseY },
      lengthM: totalLen,
      label: formatArchDim(totalLen),
      tier: 3,
      side,
    });
  };

  // Helper to build vertical dimension chain (West or East)
  const buildVerticalSide = (side: 'west' | 'east', openings: OpeningSpan[]) => {
    const sign = side === 'west' ? -1 : 1;
    const baseX = side === 'west' ? minX : maxX;

    // Tier 1: Openings & Piers
    const t1X = baseX + sign * tierDist[0];
    if (openings.length > 0) {
      const rawStops = [minY, maxY];
      openings.forEach((op) => {
        rawStops.push(Math.max(minY, Math.min(maxY, op.c1)));
        rawStops.push(Math.max(minY, Math.min(maxY, op.c2)));
      });
      const stops = cleanSortedStops(rawStops, 0.08);
      for (let i = 0; i < stops.length - 1; i++) {
        const a = stops[i];
        const b = stops[i + 1];
        const len = b - a;
        if (len < 0.05) continue;
        const mid = (a + b) / 2;
        const matchedOp = openings.find((op) => mid >= op.c1 - 0.05 && mid <= op.c2 + 0.05);
        segments.push({
          start: { x: t1X, y: a },
          end: { x: t1X, y: b },
          witnessStart1: { x: baseX, y: a },
          witnessStart2: { x: baseX, y: b },
          lengthM: len,
          label: formatArchDim(len),
          subLabel: matchedOp?.subLabel,
          tier: 1,
          side,
        });
      }
    }

    // Tier 2: Room Spans & Wall Thicknesses
    const t2X = baseX + sign * (openings.length > 0 ? tierDist[1] : tierDist[0]);
    const pStops = cleanSortedStops(Array.from(yPartitions), 0.08);
    if (pStops.length > 2) {
      for (let i = 0; i < pStops.length - 1; i++) {
        const a = pStops[i];
        const b = pStops[i + 1];
        const len = b - a;
        if (len < 0.05) continue;
        segments.push({
          start: { x: t2X, y: a },
          end: { x: t2X, y: b },
          witnessStart1: { x: baseX, y: a },
          witnessStart2: { x: baseX, y: b },
          lengthM: len,
          label: formatArchDim(len, len < 0.45),
          tier: 2,
          side,
        });
      }
    }

    // Tier 3: Total Overall Building Depth
    const t3X =
      baseX +
      sign *
        (openings.length > 0 && pStops.length > 2
          ? tierDist[2]
          : openings.length > 0 || pStops.length > 2
          ? tierDist[1]
          : tierDist[0]);
    const totalLen = maxY - minY;
    segments.push({
      start: { x: t3X, y: minY },
      end: { x: t3X, y: maxY },
      witnessStart1: { x: baseX, y: minY },
      witnessStart2: { x: baseX, y: maxY },
      lengthM: totalLen,
      label: formatArchDim(totalLen),
      tier: 3,
      side,
    });
  };

  buildHorizontalSide('north', northOpenings);
  buildHorizontalSide('south', southOpenings);
  buildVerticalSide('west', westOpenings);
  buildVerticalSide('east', eastOpenings);

  return segments;
}

/**
 * Generates standard architectural section cut lines (Schnitt A-A & B-B),
 * elevation level markers (Höhenkoten OKFF ±0,00), structural grid axes (A, B, C / 1, 2, 3),
 * and wall schedules.
 */
export function analyzeArchitecturalPlan(
  walls: Wall[],
  doors: Door[],
  windows: Window[],
  existingRooms: Room[],
  storyHeight = 2.75,
  floorElevation = 0.0,
  defaults?: ProjectDefaults
): ArchitecturalPlanSummary {
  const { rooms, footprintPolygon, bgfM2, kgfM2, nrfM2, livingAreaM2, briM3 } =
    detectRoomsAndEnvelope(walls, doors, windows, existingRooms, storyHeight, defaults);

  const dimensionChains = generateExteriorDimensionChains(walls, doors, windows);

  let minX = 0, maxX = 10, minY = 0, maxY = 8;
  if (footprintPolygon.length >= 4) {
    minX = footprintPolygon[0].x;
    maxX = footprintPolygon[1].x;
    minY = footprintPolygon[0].y;
    maxY = footprintPolygon[2].y;
  }

  // Section Cut Markers (Schnitt A-A horizontal, Schnitt B-B vertical)
  const midY = (minY + maxY) / 2;
  const midX = (minX + maxX) / 2;
  const sectionCuts: SectionCutMarker[] = [
    {
      id: 'sec_a',
      label: 'A',
      start: { x: minX - 0.9, y: midY },
      end: { x: maxX + 0.9, y: midY },
      direction: 'up',
    },
    {
      id: 'sec_b',
      label: 'B',
      start: { x: midX, y: minY - 0.9 },
      end: { x: midX, y: maxY + 0.9 },
      direction: 'right',
    },
  ];

  // Level Elevation Markers (Höhenkoten nach DIN 1356)
  const okffSign = floorElevation >= 0 ? (floorElevation === 0 ? '±' : '+') : '';
  const okffStr = `${okffSign}${floorElevation.toFixed(2).replace('.', ',')} m`;
  const ukrdVal = floorElevation + (storyHeight - 0.18);
  const ukrdStr = `+${ukrdVal.toFixed(2).replace('.', ',')} m`;

  const elevationMarkers: ElevationMarker[] = [
    {
      position: { x: midX, y: midY },
      label: 'OKFF',
      elevationText: `OKFF ${okffStr} | UKRD ${ukrdStr}`,
      isExterior: false,
    },
    {
      position: { x: minX + (maxX - minX) * 0.25, y: maxY + 0.45 },
      label: 'GOK',
      elevationText: 'GOK -0,15 m',
      isExterior: true,
    },
  ];

  // Structural Grid Axes (Achsraster 1, 2, 3... & A, B, C...)
  const vCoords = new Set<number>();
  const hCoords = new Set<number>();
  for (const w of walls) {
    if (Math.abs(w.end.x - w.start.x) < 0.2 && Math.abs(w.end.y - w.start.y) > 1.2) {
      vCoords.add(Math.round(((w.start.x + w.end.x) / 2) * 10) / 10);
    }
    if (Math.abs(w.end.y - w.start.y) < 0.2 && Math.abs(w.end.x - w.start.x) > 1.2) {
      hCoords.add(Math.round(((w.start.y + w.end.y) / 2) * 10) / 10);
    }
  }

  const filterAxes = (vals: number[]): number[] => {
    const s = [...vals].sort((a, b) => a - b);
    const out: number[] = [];
    for (const v of s) {
      if (out.length === 0 || v - out[out.length - 1] >= 1.2) out.push(v);
    }
    return out;
  };

  const structuralAxes: StructuralAxis[] = [];
  const sortedV = filterAxes(Array.from(vCoords));
  const sortedH = filterAxes(Array.from(hCoords));

  sortedV.forEach((xVal, idx) => {
    structuralAxes.push({
      id: `axis_v_${idx + 1}`,
      label: `${idx + 1}`,
      orientation: 'vertical',
      coord: xVal,
      start: { x: xVal, y: minY - 2.25 },
      end: { x: xVal, y: maxY + 0.3 },
    });
  });

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  sortedH.forEach((yVal, idx) => {
    structuralAxes.push({
      id: `axis_h_${idx + 1}`,
      label: letters[idx % letters.length],
      orientation: 'horizontal',
      coord: yVal,
      start: { x: minX - 2.25, y: yVal },
      end: { x: maxX + 0.3, y: yVal },
    });
  });

  // Wall Schedule & Linear Meter Totals
  let totalWallLengthM = 0;
  let exteriorWallLengthM = 0;
  let interiorWallLengthM = 0;

  const groupMap = new Map<string, WallScheduleEntry>();

  for (const w of walls) {
    const len = distance(w.start, w.end);
    totalWallLengthM += len;
    if (w.isExterior) exteriorWallLengthM += len;
    else interiorWallLengthM += len;

    const thickM = w.thickness || (w.isExterior ? 0.30 : 0.115);
    const thickCm = Math.round(thickM * 1000) / 10;
    const hM = w.height || storyHeight;
    const matInfo = getGermanWallMaterialInfo(w.material || 'brick', w.isExterior, thickM);
    const key = `${w.isExterior ? 'EXT' : 'INT'}_${thickCm}_${w.material || 'brick'}`;

    // Deduct openings on this wall
    let openArea = 0;
    doors.filter((d) => d.wallId === w.id).forEach((d) => {
      openArea += d.width * d.height;
    });
    windows.filter((win) => win.wallId === w.id).forEach((win) => {
      openArea += win.width * win.height;
    });

    const grossA = len * hM;
    const netA = Math.max(0, grossA - openArea);
    const vol = netA * thickM;

    if (!groupMap.has(key)) {
      groupMap.set(key, {
        pos: w.isExterior ? `AW ${groupMap.size + 1}` : `IW ${groupMap.size + 1}`,
        category: w.isExterior ? 'Außenwand (tragend / EnEV)' : thickCm >= 17.5 ? 'Innenwand (tragend)' : 'Trennwand (nichttragend)',
        materialName: matInfo.name,
        thicknessCm: thickCm,
        totalLengthM: len,
        heightM: hM,
        grossAreaM2: grossA,
        openingsAreaM2: openArea,
        netAreaM2: netA,
        volumeM3: vol,
        uValue: matInfo.uValue,
      });
    } else {
      const existing = groupMap.get(key)!;
      existing.totalLengthM += len;
      existing.grossAreaM2 += grossA;
      existing.openingsAreaM2 += openArea;
      existing.netAreaM2 += netA;
      existing.volumeM3 += vol;
    }
  }

  return {
    rooms,
    footprintPolygon,
    bgfM2,
    kgfM2,
    nrfM2,
    livingAreaM2,
    briM3,
    totalWallLengthM: Math.round(totalWallLengthM * 100) / 100,
    exteriorWallLengthM: Math.round(exteriorWallLengthM * 100) / 100,
    interiorWallLengthM: Math.round(interiorWallLengthM * 100) / 100,
    dimensionChains,
    sectionCuts,
    elevationMarkers,
    structuralAxes,
    wallSchedule: Array.from(groupMap.values()),
  };
}
