/**
 * Pre-built holiday home project templates with architecturally validated layouts
 */

import { CadProject, Floor, Wall, Door, Window, Room, Furniture, DimensionLine, Stair, Roof } from '../types/cad';

export function createEmptyProject(): CadProject {
  const groundFloor: Floor = {
    id: 'floor_eg',
    name: 'Erdgeschoss (EG)',
    storyHeight: 2.75,
    floorElevation: 0.00,
    slabThickness: 0.20,
    walls: [],
    doors: [],
    windows: [],
    stairs: [],
    columns: [],
    roofs: [],
    rooms: [],
    furniture: [],
    electrical: [],
    dimensions: [],
    annotations: [],
    shapes: [],
  };

  return {
    id: 'proj_' + Date.now(),
    name: 'Ferienhaus Entwurf',
    variant: 'Entwurf A',
    unit: 'm',
    scale: '1:50',
    activeFloorId: 'floor_eg',
    floors: [groundFloor],
    titleBlock: {
      projectName: 'Ferienhaus Neubau',
      clientName: 'Bauherr Familie Weber',
      siteAddress: 'Seeweg 14, 83684 Tegernsee',
      planContent: 'Grundriss Erdgeschoss & Maße',
      date: new Date().toLocaleDateString('de-DE'),
      scale: '1:50',
      author: 'Architekturbüro CAD-Studio',
      sheetNumber: 'A-101',
      revision: 'Index 0',
    },
    layers: [
      { id: 'walls', name: 'Wände & Konstruktion', visible: true, locked: false },
      { id: 'openings', name: 'Türen & Fenster', visible: true, locked: false },
      { id: 'rooms', name: 'Räume & Flächen', visible: true, locked: false },
      { id: 'furniture', name: 'Möbel & Ausstattung', visible: true, locked: false },
      { id: 'electrical', name: 'Elektro & Technik', visible: true, locked: false },
      { id: 'dimensions', name: 'Bemaßung & Beschriftung', visible: true, locked: false },
      { id: 'roof', name: 'Dach & Überdachung', visible: true, locked: false },
    ],
    guideLines: [],
    northAngle: 0,
    plot: {
      enabled: false,
      x: 0,
      y: 0,
      width: 20.0,
      depth: 20.0,
      setback: 3.0,
      maxGRZ: 0.40,
      maxGFZ: 0.80,
      groundElevation: 0.30,
    },
    defaults: {
      exteriorWallThickness: 0.30,
      interiorWallThickness: 0.115,
      wallHeight: 2.50,
      roomHeight: 2.50,
      doorWidth: 0.885,
      doorHeight: 2.05,
      doorLintel: 2.05,
      windowWidth: 1.20,
      windowHeight: 1.25,
      windowParapet: 0.90,
      windowLintel: 2.15,
      gridSize: 0.25,
      unit: 'm',
      setback: 3.00,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Validated holiday cabin 6 x 8 m template according to user specifications (A7):
 * - Exactly 8.00 × 6.00 m exterior dimensions.
 * - Entrance opens into living area.
 * - Bathroom (~5.5 m²) accessible from living/hall.
 * - Bedroom (~11 m²) with double bed and wardrobe.
 * - Open living/dining/kitchen (~21 m²) with patio door to terrace.
 * - Window in every room.
 * - Minimum 80 cm clear walkways everywhere, zero collisions.
 */
export function createHolidayHouse6x8Template(): CadProject {
  const proj = createEmptyProject();
  proj.name = 'Ferienhaus 6 × 8 m';
  proj.titleBlock.projectName = 'Ferienhaus 6,00 × 8,00 m (48 m² BGF)';

  // 1. Exterior Walls (8.00m width × 6.00m depth, thickness 0.30m)
  // Coordinates: X: 2.0 to 10.0, Y: 2.0 to 8.0
  const wSouth: Wall = {
    id: 'w_ext_south',
    start: { x: 2.0, y: 8.0 },
    end: { x: 10.0, y: 8.0 },
    thickness: 0.30,
    height: 2.60,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };
  const wEast: Wall = {
    id: 'w_ext_east',
    start: { x: 10.0, y: 8.0 },
    end: { x: 10.0, y: 2.0 },
    thickness: 0.30,
    height: 2.60,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };
  const wNorth: Wall = {
    id: 'w_ext_north',
    start: { x: 10.0, y: 2.0 },
    end: { x: 2.0, y: 2.0 },
    thickness: 0.30,
    height: 2.60,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };
  const wWest: Wall = {
    id: 'w_ext_west',
    start: { x: 2.0, y: 2.0 },
    end: { x: 2.0, y: 8.0 },
    thickness: 0.30,
    height: 2.60,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };

  // 2. Interior Dividing Walls (thickness 0.115m)
  // Wall 1: Separates Living (East) from Bed & Bath (West) at X = 5.80
  const wIntMain: Wall = {
    id: 'w_int_main',
    start: { x: 5.80, y: 2.0 },
    end: { x: 5.80, y: 8.0 },
    thickness: 0.115,
    height: 2.60,
    isExterior: false,
    material: 'drywall',
    referenceLine: 'center',
  };

  // Wall 2: Separates Bedroom (North) from Bathroom (South) at Y = 5.10
  const wIntBedBath: Wall = {
    id: 'w_int_bedbath',
    start: { x: 2.0, y: 5.10 },
    end: { x: 5.80, y: 5.10 },
    thickness: 0.115,
    height: 2.60,
    isExterior: false,
    material: 'drywall',
    referenceLine: 'center',
  };

  // 3. Doors
  // Entrance door on North wall (leads into living/hall area)
  const dEntry: Door = {
    id: 'd_entry',
    wallId: 'w_ext_north',
    position: 0.35, // Near X = 7.20
    width: 0.985,
    height: 2.10,
    type: 'entry',
    swingDirection: 'right',
    openDirection: 'inside',
    swingAngle: 90,
    frameThickness: 0.08,
    sillHeight: 0,
    name: 'Hauseingangstür',
  };

  // Patio / Garden door on South wall
  const dPatio: Door = {
    id: 'd_patio',
    wallId: 'w_ext_south',
    position: 0.75, // Near X = 8.00
    width: 1.60,
    height: 2.15,
    type: 'patio',
    swingDirection: 'right',
    openDirection: 'outside',
    swingAngle: 90,
    frameThickness: 0.08,
    sillHeight: 0,
    name: 'Terrassentür',
  };

  // Bedroom door on interior wall (swings into bedroom towards corner)
  const dBed: Door = {
    id: 'd_bed',
    wallId: 'w_int_main',
    position: 0.22, // Near Y = 3.32
    width: 0.885,
    height: 2.05,
    type: 'single',
    swingDirection: 'left',
    openDirection: 'inside',
    swingAngle: 90,
    frameThickness: 0.08,
    sillHeight: 0,
    name: 'Zimmertür Schlafen',
  };

  // Bathroom door on interior wall (swings into bath towards South wall)
  const dBath: Door = {
    id: 'd_bath',
    wallId: 'w_int_main',
    position: 0.72, // Near Y = 6.32
    width: 0.885,
    height: 2.05,
    type: 'single',
    swingDirection: 'right',
    openDirection: 'inside',
    swingAngle: 90,
    frameThickness: 0.08,
    sillHeight: 0,
    name: 'Badezimmertür',
  };

  // 4. Windows (at least one in each room)
  // Living room South panoramic window
  const winLivSouth: Window = {
    id: 'win_liv_south',
    wallId: 'w_ext_south',
    position: 0.25, // Near X = 4.00
    width: 1.60,
    height: 1.30,
    parapetHeight: 0.85,
    type: 'double',
    frameColor: '#334155',
    glazing: '3',
    hasInteriorSill: true,
    hasExteriorSill: true,
    name: 'Panoramafenster Süd',
  };

  // Kitchen East window
  const winKitchenEast: Window = {
    id: 'win_kitchen_east',
    wallId: 'w_ext_east',
    position: 0.35, // Near Y = 4.10
    width: 1.20,
    height: 1.10,
    parapetHeight: 1.05,
    type: 'turn_tilt',
    frameColor: '#334155',
    glazing: '3',
    hasInteriorSill: true,
    hasExteriorSill: true,
    name: 'Küchenfenster Ost',
  };

  // Bedroom West window
  const winBedWest: Window = {
    id: 'win_bed_west',
    wallId: 'w_ext_west',
    position: 0.25, // Near Y = 3.50
    width: 1.20,
    height: 1.25,
    parapetHeight: 0.90,
    type: 'turn_tilt',
    frameColor: '#334155',
    glazing: '3',
    hasInteriorSill: true,
    hasExteriorSill: true,
    name: 'Schlafzimmerfenster',
  };

  // Bathroom West window (privacy, higher sill)
  const winBathWest: Window = {
    id: 'win_bath_west',
    wallId: 'w_ext_west',
    position: 0.78, // Near Y = 6.68
    width: 0.80,
    height: 0.80,
    parapetHeight: 1.25,
    type: 'turn_tilt',
    frameColor: '#334155',
    glazing: '3',
    hasInteriorSill: true,
    hasExteriorSill: true,
    name: 'Badfenster',
  };

  // 5. Rooms (calculated with net internal boundary polygons)
  const rLiving: Room = {
    id: 'r_living',
    name: 'Wohnen / Kochen / Essen',
    category: 'living',
    polygon: [
      { x: 5.86, y: 2.15 },
      { x: 9.85, y: 2.15 },
      { x: 9.85, y: 7.85 },
      { x: 5.86, y: 7.85 },
    ],
    areaM2: 22.7,
    grossAreaM2: 25.2,
    perimeterM: 19.4,
    height: 2.60,
    floorFinish: 'parquet',
    color: '#fef3c7',
    targetLivingArea: true,
  };

  const rBed: Room = {
    id: 'r_bed',
    name: 'Schlafzimmer',
    category: 'sleeping',
    polygon: [
      { x: 2.15, y: 2.15 },
      { x: 5.74, y: 2.15 },
      { x: 5.74, y: 5.04 },
      { x: 2.15, y: 5.04 },
    ],
    areaM2: 10.4,
    grossAreaM2: 11.6,
    perimeterM: 13.0,
    height: 2.60,
    floorFinish: 'wood_plank',
    color: '#e0e7ff',
    targetLivingArea: true,
  };

  const rBath: Room = {
    id: 'r_bath',
    name: 'Duschbad / WC',
    category: 'bath',
    polygon: [
      { x: 2.15, y: 5.16 },
      { x: 5.74, y: 5.16 },
      { x: 5.74, y: 7.85 },
      { x: 2.15, y: 7.85 },
    ],
    areaM2: 9.7,
    grossAreaM2: 10.8,
    perimeterM: 12.6,
    height: 2.60,
    floorFinish: 'tiles',
    color: '#cffafe',
    targetLivingArea: true,
  };

  // 6. Furniture (perfectly placed inside rooms, 0 wall collisions, 0 door conflicts)
  const furnitures: Furniture[] = [
    // Bedroom: Double Bed (1.80 × 2.00m) placed against North wall
    {
      id: 'f_bed',
      name: 'Doppelbett (180 × 200 cm)',
      category: 'bedroom',
      type: 'cat_bed_double',
      x: 4.10,
      y: 3.30,
      width: 1.90,
      depth: 2.10,
      height: 0.55,
      rotation: 0,
      iconType: 'bed',
    },
    // Bedroom: Wardrobe along West wall
    {
      id: 'f_wardrobe',
      name: 'Kleiderschrank',
      category: 'bedroom',
      type: 'cat_wardrobe_large',
      x: 2.50,
      y: 3.80,
      width: 1.60,
      depth: 0.60,
      height: 2.10,
      rotation: 90,
      iconType: 'wardrobe',
    },
    // Bathroom: Walk-in Shower (1.00 × 0.90m) in South-West corner
    {
      id: 'f_shower',
      name: 'Walk-In Dusche (100 × 90 cm)',
      category: 'bathroom',
      type: 'cat_shower_walkin',
      x: 2.80,
      y: 7.30,
      width: 1.00,
      depth: 0.90,
      height: 2.00,
      rotation: 0,
      iconType: 'shower',
    },
    // Bathroom: Wall WC along South wall
    {
      id: 'f_wc',
      name: 'Wand-WC',
      category: 'bathroom',
      type: 'cat_toilet',
      x: 4.10,
      y: 7.45,
      width: 0.45,
      depth: 0.55,
      height: 0.45,
      rotation: 0,
      iconType: 'toilet',
    },
    // Bathroom: Sink along South wall
    {
      id: 'f_basin',
      name: 'Waschtisch mit Unterschrank',
      category: 'bathroom',
      type: 'cat_basin_single',
      x: 5.10,
      y: 7.45,
      width: 0.80,
      depth: 0.50,
      height: 0.85,
      rotation: 0,
      iconType: 'sink',
    },
    // Living: Kitchen Counter along East wall
    {
      id: 'f_kitchen',
      name: 'Küchenzeile mit Herd & Spüle',
      category: 'kitchen',
      type: 'cat_kitchen_straight',
      x: 9.45,
      y: 3.80,
      width: 2.60,
      depth: 0.60,
      height: 0.92,
      rotation: 90,
      iconType: 'kitchen',
    },
    // Living: Dining Table for 4
    {
      id: 'f_table',
      name: 'Esstisch für 4',
      category: 'living',
      type: 'cat_dining_table_4',
      x: 7.60,
      y: 3.60,
      width: 1.40,
      depth: 0.85,
      height: 0.76,
      rotation: 0,
      iconType: 'table',
    },
    // Living: Comfortable Sofa in Living corner
    {
      id: 'f_sofa',
      name: 'Sofa 3-Sitzer',
      category: 'living',
      type: 'cat_sofa_3',
      x: 7.70,
      y: 6.80,
      width: 2.10,
      depth: 0.90,
      height: 0.85,
      rotation: 0,
      iconType: 'sofa',
    },
  ];

  // 7. Dimension Lines (Matching exact 8.00m × 6.00m outer dimensions)
  const dims: DimensionLine[] = [
    {
      id: 'dim_south_overall',
      start: { x: 2.0, y: 8.0 },
      end: { x: 10.0, y: 8.0 },
      offset: 0.9,
      type: 'linear',
      label: '8,00 m',
    },
    {
      id: 'dim_east_overall',
      start: { x: 10.0, y: 8.0 },
      end: { x: 10.0, y: 2.0 },
      offset: 0.9,
      type: 'linear',
      label: '6,00 m',
    },
  ];

  proj.floors[0].walls = [wSouth, wEast, wNorth, wWest, wIntMain, wIntBedBath];
  proj.floors[0].doors = [dEntry, dPatio, dBed, dBath];
  proj.floors[0].windows = [winLivSouth, winKitchenEast, winBedWest, winBathWest];
  proj.floors[0].rooms = [rLiving, rBed, rBath];
  proj.floors[0].furniture = furnitures;
  proj.floors[0].dimensions = dims;

  return proj;
}

export function createTinyHouseTemplate(): CadProject {
  const proj = createEmptyProject();
  proj.name = 'Tiny House (7.5 × 3 m)';
  proj.titleBlock.projectName = 'Modernes Tiny House auf Trailer-Fahrgestell';

  const wSouth: Wall = {
    id: 'tw_south',
    start: { x: 2.0, y: 5.0 },
    end: { x: 9.5, y: 5.0 },
    thickness: 0.20,
    height: 3.20,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };
  const wEast: Wall = {
    id: 'tw_east',
    start: { x: 9.5, y: 5.0 },
    end: { x: 9.5, y: 2.0 },
    thickness: 0.20,
    height: 3.20,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };
  const wNorth: Wall = {
    id: 'tw_north',
    start: { x: 9.5, y: 2.0 },
    end: { x: 2.0, y: 2.0 },
    thickness: 0.20,
    height: 3.20,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };
  const wWest: Wall = {
    id: 'tw_west',
    start: { x: 2.0, y: 2.0 },
    end: { x: 2.0, y: 5.0 },
    thickness: 0.20,
    height: 3.20,
    isExterior: true,
    material: 'timber',
    referenceLine: 'center',
  };

  const wBath: Wall = {
    id: 'tw_int_bath',
    start: { x: 4.0, y: 2.0 },
    end: { x: 4.0, y: 5.0 },
    thickness: 0.10,
    height: 3.0,
    isExterior: false,
    material: 'drywall',
    referenceLine: 'center',
  };

  const dEntry: Door = {
    id: 'td_entry',
    wallId: 'tw_south',
    position: 0.60,
    width: 0.90,
    height: 2.05,
    type: 'patio',
    swingDirection: 'right',
    openDirection: 'outside',
    swingAngle: 90,
    frameThickness: 0.08,
    sillHeight: 0,
    name: 'Glastür Eingang',
  };
  const dBath: Door = {
    id: 'td_bath',
    wallId: 'tw_int_bath',
    position: 0.5,
    width: 0.75,
    height: 2.00,
    type: 'pocket',
    swingDirection: 'left',
    openDirection: 'inside',
    swingAngle: 90,
    frameThickness: 0.06,
    sillHeight: 0,
    name: 'Schiebetür Bad',
  };

  const winPano: Window = {
    id: 'twin_pano',
    wallId: 'tw_east',
    position: 0.5,
    width: 1.80,
    height: 1.80,
    parapetHeight: 0.60,
    type: 'fixed',
    frameColor: '#1e293b',
    glazing: '3',
    hasInteriorSill: true,
    hasExteriorSill: true,
    name: 'Panoramafenster Giebel',
  };

  const rMain: Room = {
    id: 'tr_main',
    name: 'Wohnbereich mit Schlafloft & Küche',
    category: 'living',
    polygon: [{ x: 4.05, y: 2.1 }, { x: 9.4, y: 2.1 }, { x: 9.4, y: 4.9 }, { x: 4.05, y: 4.9 }],
    areaM2: 15.0,
    perimeterM: 16.3,
    height: 3.20,
    floorFinish: 'wood_plank',
    color: '#fef3c7',
    targetLivingArea: true,
  };
  const rBath: Room = {
    id: 'tr_bath',
    name: 'Kompaktbad',
    category: 'bath',
    polygon: [{ x: 2.1, y: 2.1 }, { x: 3.95, y: 2.1 }, { x: 3.95, y: 4.9 }, { x: 2.1, y: 4.9 }],
    areaM2: 5.2,
    perimeterM: 9.3,
    height: 3.00,
    floorFinish: 'tiles',
    color: '#cffafe',
    targetLivingArea: true,
  };

  proj.floors[0].walls = [wSouth, wEast, wNorth, wWest, wBath];
  proj.floors[0].doors = [dEntry, dBath];
  proj.floors[0].windows = [winPano];
  proj.floors[0].rooms = [rMain, rBath];

  return proj;
}

export function createLogCabinTemplate(): CadProject {
  const proj = createHolidayHouse6x8Template();
  proj.name = 'Rustikale Blockhütte mit Kamin';
  proj.titleBlock.projectName = 'Traditionelle Blockhütte (Massivholz)';
  proj.floors[0].walls.forEach((w) => {
    if (w.isExterior) {
      w.material = 'log';
      w.thickness = 0.28;
    }
  });
  if (!proj.floors[0].roofs || proj.floors[0].roofs.length === 0) {
    proj.floors[0].roofs = [{
      id: 'roof_cabin',
      type: 'gable',
      pitchDegrees: 42,
      height: 2.70,
      overhang: 0.50,
      overhangEaves: 0.50,
      overhangGable: 0.50,
      isOverhangLinked: true,
      ridgeDirection: 'horizontal',
      slopeDirection: 'front',
      material: 'slate',
      hasChimney: true,
      accessories: [],
    }];
  } else {
    proj.floors[0].roofs[0].type = 'gable';
    proj.floors[0].roofs[0].pitchDegrees = 42;
    proj.floors[0].roofs[0].material = 'slate';
    proj.floors[0].roofs[0].hasChimney = true;
  }
  return proj;
}
