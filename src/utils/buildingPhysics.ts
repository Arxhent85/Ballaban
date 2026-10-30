/**
 * Building Physics, Energy & Material Standards Engine (GEG 2024, DIN 4108, EnEV, DIN EN ISO 6946)
 * Calculates thermal transmittance (U-values), thermal resistance (R-values),
 * and compliance with current German Building Energy Act (Gebäudeenergiegesetz - GEG).
 */

import { WallMaterial, Wall, Window } from '../types/cad';

export interface MaterialThermalData {
  nameDe: string;
  lambda: number; // Thermal conductivity in W/(m*K)
  densityKgM3: number; // Density in kg/m³
  heatCapacityJkgK: number; // Specific heat capacity in J/(kg*K)
  fireRating: string; // DIN 4102 / EN 13501-1 (e.g. A1, B1, B2)
  soundInsulationRwDb: number; // Estimated acoustic insulation dB
  ecologicalRating: 'A+' | 'A' | 'B' | 'C';
}

/**
 * Standard thermal conductivities per DIN 4108-4 / DIN EN ISO 10456
 */
export const WALL_THERMAL_PROPERTIES: Record<WallMaterial, MaterialThermalData> = {
  brick: {
    nameDe: 'Ziegelmauerwerk (z. B. Poroton WDF / gefüllt)',
    lambda: 0.08, // High-performance insulating brick with perlite/mineral wool filling (0.07 - 0.09)
    densityKgM3: 650,
    heatCapacityJkgK: 1000,
    fireRating: 'A1 (nicht brennbar)',
    soundInsulationRwDb: 48,
    ecologicalRating: 'A',
  },
  concrete: {
    nameDe: 'Stahlbeton',
    lambda: 2.10, // Solid reinforced concrete
    densityKgM3: 2400,
    heatCapacityJkgK: 1000,
    fireRating: 'A1 (nicht brennbar)',
    soundInsulationRwDb: 56,
    ecologicalRating: 'B',
  },
  timber: {
    nameDe: 'Holzrahmenbau / Holzfaserdämmung',
    lambda: 0.040, // Composite wood-frame with cellulose / wood fiber
    densityKgM3: 450,
    heatCapacityJkgK: 1600,
    fireRating: 'B2 / B-s1,d0',
    soundInsulationRwDb: 46,
    ecologicalRating: 'A+',
  },
  drywall: {
    nameDe: 'Gipskartonständerwand',
    lambda: 0.25, // Plasterboard core
    densityKgM3: 800,
    heatCapacityJkgK: 1000,
    fireRating: 'A2-s1,d0',
    soundInsulationRwDb: 43,
    ecologicalRating: 'A',
  },
  log: {
    nameDe: 'Massivholz / Blockbohle',
    lambda: 0.13, // Solid softwood / spruce
    densityKgM3: 500,
    heatCapacityJkgK: 1600,
    fireRating: 'B2',
    soundInsulationRwDb: 42,
    ecologicalRating: 'A+',
  },
  glass: {
    nameDe: 'Pfosten-Riegel Isolierglas',
    lambda: 0.80, // Thermal equivalent
    densityKgM3: 2500,
    heatCapacityJkgK: 800,
    fireRating: 'A1',
    soundInsulationRwDb: 38,
    ecologicalRating: 'B',
  },
  insulation: {
    nameDe: 'Mineralwolle / EPS Dämmung',
    lambda: 0.035, // High-efficiency insulation WLG 035
    densityKgM3: 30,
    heatCapacityJkgK: 1030,
    fireRating: 'A1 (Mineralwolle)',
    soundInsulationRwDb: 50,
    ecologicalRating: 'A',
  },
  stone: {
    nameDe: 'Natursteinmauerwerk',
    lambda: 1.80, // Sandstone / granite
    densityKgM3: 2200,
    heatCapacityJkgK: 1000,
    fireRating: 'A1',
    soundInsulationRwDb: 58,
    ecologicalRating: 'A',
  },
  plaster: {
    nameDe: 'Kalkzementputz / Wärmedämmputz',
    lambda: 0.35,
    densityKgM3: 1400,
    heatCapacityJkgK: 1000,
    fireRating: 'A1',
    soundInsulationRwDb: 45,
    ecologicalRating: 'A',
  },
};

/**
 * Surface thermal resistances per DIN EN ISO 6946:
 * Rsi = 0.13 m²*K/W (interior horizontal heat flow)
 * Rse = 0.04 m²*K/W (exterior heat flow)
 */
export const R_SI = 0.13;
export const R_SE = 0.04;

export interface WallThermalEvaluation {
  materialName: string;
  thicknessCm: number;
  rValue: number; // Thermal resistance in m²*K/W
  uValue: number; // Thermal transmittance in W/(m²*K)
  gegMaxU: number; // Maximum allowed U-value per GEG 2024 Anlage 7
  gegCompliant: boolean;
  efficiencyClass: 'KfW 40' | 'KfW 55' | 'GEG Standard' | 'Sanierungsbedürftig';
  heatLossWattsPerK: number; // Heat loss per degree Kelvin temperature difference
}

/**
 * Evaluate thermal transmittance (U-Wert) for a wall per DIN EN ISO 6946
 */
export function calculateWallThermalEvaluation(wall: Wall): WallThermalEvaluation {
  const mat = WALL_THERMAL_PROPERTIES[wall.material] || WALL_THERMAL_PROPERTIES.brick;
  const d = Math.max(0.05, wall.thickness); // thickness in meters

  // If exterior wall, add standard exterior composite thermal resistance (WDVS or facing)
  // For standard insulated exterior wall construction (e.g. 30-36.5cm monomauerwerk or 24cm + 12cm WDVS)
  let materialR = d / mat.lambda;

  if (wall.isExterior) {
    if (wall.material === 'timber') {
      // Wood frame composite typically has 16cm insulation + 4cm wood cladding
      materialR = (d * 0.85) / 0.035 + (d * 0.15) / 0.13;
    } else if (wall.material === 'concrete' || wall.material === 'stone') {
      // Concrete/stone exterior walls require WDVS insulation layer
      const insulationThickness = Math.max(0.12, d * 0.4);
      materialR = (d - insulationThickness) / mat.lambda + insulationThickness / 0.035;
    } else if (wall.material === 'brick' && d < 0.30) {
      // Thinner brick exterior wall requires additional insulation
      materialR = d / mat.lambda + 0.12 / 0.035;
    }
  }

  const rTotal = R_SI + materialR + (wall.isExterior ? R_SE : R_SI);
  const uValue = Math.round((1 / rTotal) * 100) / 100;

  // GEG 2024 Reference Max U-Values (Anlage 7):
  // Exterior wall: max 0.24 W/(m²*K)
  // Interior partition: max 0.60 W/(m²*K)
  const gegMaxU = wall.isExterior ? 0.24 : 0.60;
  const gegCompliant = uValue <= gegMaxU;

  let efficiencyClass: WallThermalEvaluation['efficiencyClass'] = 'GEG Standard';
  if (uValue <= 0.15) {
    efficiencyClass = 'KfW 40';
  } else if (uValue <= 0.20) {
    efficiencyClass = 'KfW 55';
  } else if (uValue > gegMaxU) {
    efficiencyClass = 'Sanierungsbedürftig';
  }

  const wallLength = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
  const wallArea = wallLength * (wall.height || 2.50);
  const heatLossWattsPerK = Math.round(wallArea * uValue * 10) / 10;

  return {
    materialName: mat.nameDe,
    thicknessCm: Math.round(d * 1000) / 10,
    rValue: Math.round(rTotal * 100) / 100,
    uValue,
    gegMaxU,
    gegCompliant,
    efficiencyClass,
    heatLossWattsPerK,
  };
}

/**
 * Window thermal transmittance (Uw-Wert) per DIN EN ISO 10077-1
 */
export function calculateWindowUValue(win: Window): { uw: number; gegCompliant: boolean; label: string } {
  // Glazing: 1 = single (5.0), 2 = double (1.1 - 1.3), 3 = triple (0.6 - 0.8)
  let ug = 1.1;
  let label = '2-fach Wärmeschutzglas';

  if (win.glazing === '3') {
    ug = 0.6;
    label = '3-fach Isolierglas (Passivhaus)';
  } else if (win.glazing === '1') {
    ug = 5.0;
    label = 'Einfachverglasung (Altbau)';
  }

  // Frame thermal transmittance Uf (standard warm-edge wood/PVC frame = 1.2)
  const uf = 1.2;
  const frameRatio = 0.25; // 25% frame area, 75% glass area
  const psiEdge = 0.04; // Warm-edge spacer
  const uw = Math.round((ug * (1 - frameRatio) + uf * frameRatio + psiEdge) * 100) / 100;

  // GEG 2024 max Uw for windows is 1.30 W/(m²*K)
  const gegCompliant = uw <= 1.30;

  return {
    uw,
    gegCompliant,
    label,
  };
}
