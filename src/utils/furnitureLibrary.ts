/**
 * Architectural symbols and furniture catalog with standard metric dimensions
 */

import { FurnitureCategory, ElectricalType } from '../types/cad';

export interface CatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  width: number; // in meters
  depth: number;
  height: number;
  iconType: string;
  defaultColor?: string;
  description?: string;
}

export const FURNITURE_CATALOG: CatalogItem[] = [
  // Wohnen & Essen
  {
    id: 'cat_sofa_3',
    name: 'Sofa 3-Sitzer',
    category: 'living',
    width: 2.10,
    depth: 0.90,
    height: 0.85,
    iconType: 'sofa',
    defaultColor: '#e2e8f0',
    description: 'Geradliniges 3-Sitzer Sofa mit Rücken- und Armlehnen',
  },
  {
    id: 'cat_sofa_corner',
    name: 'Ecksofa L-Form',
    category: 'living',
    width: 2.50,
    depth: 1.70,
    height: 0.85,
    iconType: 'sofa_l',
    defaultColor: '#e2e8f0',
    description: 'Großzügiges Ecksofa für den Wohnbereich',
  },
  {
    id: 'cat_armchair',
    name: 'Sessel',
    category: 'living',
    width: 0.85,
    depth: 0.85,
    height: 0.90,
    iconType: 'armchair',
    defaultColor: '#e2e8f0',
    description: 'Gemütlicher Einzelsessel',
  },
  {
    id: 'cat_coffee_table',
    name: 'Couchtisch',
    category: 'living',
    width: 1.10,
    depth: 0.60,
    height: 0.45,
    iconType: 'coffee_table',
    defaultColor: '#f1f5f9',
    description: 'Rechteckiger Couchtisch',
  },
  {
    id: 'cat_dining_table_4',
    name: 'Esstisch mit 4 Stühlen',
    category: 'living',
    width: 1.40,
    depth: 0.85,
    height: 0.76,
    iconType: 'table_4',
    defaultColor: '#f1f5f9',
    description: 'Esstisch mit 4 eingeschobenen Stühlen',
  },
  {
    id: 'cat_dining_table_6',
    name: 'Esstisch mit 6 Stühlen',
    category: 'living',
    width: 1.80,
    depth: 0.90,
    height: 0.76,
    iconType: 'table_6',
    defaultColor: '#f1f5f9',
    description: 'Großer Familientisch mit 6 Stühlen',
  },
  {
    id: 'cat_tv_unit',
    name: 'TV-Lowboard',
    category: 'living',
    width: 1.60,
    depth: 0.40,
    height: 0.45,
    iconType: 'tv_unit',
    defaultColor: '#e2e8f0',
    description: 'Möbel für Fernseher und Mediengeräte',
  },
  {
    id: 'cat_fireplace',
    name: 'Schwedenofen / Kamin',
    category: 'living',
    width: 0.70,
    depth: 0.55,
    height: 1.20,
    iconType: 'fireplace',
    defaultColor: '#334155',
    description: 'Kaminofen mit Glasfront und Feuerstelle',
  },

  // Schlafen
  {
    id: 'cat_bed_double',
    name: 'Doppelbett (180 × 200 cm)',
    category: 'bedroom',
    width: 1.90,
    depth: 2.10,
    height: 0.55,
    iconType: 'bed_double',
    defaultColor: '#f1f5f9',
    description: 'Doppelbett mit Kopfteil, Kissen und Bettdecke',
  },
  {
    id: 'cat_bed_single',
    name: 'Einzelbett (90 × 200 cm)',
    category: 'bedroom',
    width: 1.00,
    depth: 2.10,
    height: 0.55,
    iconType: 'bed_single',
    defaultColor: '#f1f5f9',
    description: 'Einzelbett mit Kopfkissen',
  },
  {
    id: 'cat_wardrobe_large',
    name: 'Kleiderschrank (3-türig)',
    category: 'bedroom',
    width: 1.60,
    depth: 0.60,
    height: 2.10,
    iconType: 'wardrobe',
    defaultColor: '#e2e8f0',
    description: 'Geräumiger Kleiderschrank mit Schiebetüren',
  },
  {
    id: 'cat_nightstand',
    name: 'Nachttisch',
    category: 'bedroom',
    width: 0.45,
    depth: 0.40,
    height: 0.50,
    iconType: 'nightstand',
    defaultColor: '#f1f5f9',
    description: 'Kompakte Nachtkonsole',
  },

  // Küche
  {
    id: 'cat_kitchen_straight',
    name: 'Küchenzeile mit Herd & Spüle',
    category: 'kitchen',
    width: 2.60,
    depth: 0.60,
    height: 0.92,
    iconType: 'kitchen_counter',
    defaultColor: '#f1f5f9',
    description: 'Arbeitsplatte mit 4 Kochfeldern und Spülbecken',
  },
  {
    id: 'cat_fridge',
    name: 'Kühlschrank',
    category: 'kitchen',
    width: 0.60,
    depth: 0.65,
    height: 1.80,
    iconType: 'fridge',
    defaultColor: '#e2e8f0',
    description: 'Kühl-Gefrier-Kombination',
  },
  {
    id: 'cat_kitchen_sink',
    name: 'Spülbecken separat',
    category: 'kitchen',
    width: 0.85,
    depth: 0.55,
    height: 0.85,
    iconType: 'kitchen_sink',
    defaultColor: '#f1f5f9',
    description: 'Edelstahlspüle mit Mischbatterie',
  },

  // Bad & Sanitär
  {
    id: 'cat_shower_walkin',
    name: 'Walk-In Dusche (100 × 90 cm)',
    category: 'bathroom',
    width: 1.00,
    depth: 0.90,
    height: 2.00,
    iconType: 'shower',
    defaultColor: '#f1f5f9',
    description: 'Bodengleiche Dusche mit Bodenablauf & Glaswand',
  },
  {
    id: 'cat_bathtub',
    name: 'Badewanne (170 × 75 cm)',
    category: 'bathroom',
    width: 1.70,
    depth: 0.75,
    height: 0.58,
    iconType: 'bathtub',
    defaultColor: '#f1f5f9',
    description: 'Acryl-Körperformwanne mit Wannenablauf',
  },
  {
    id: 'cat_toilet',
    name: 'Wand-WC',
    category: 'bathroom',
    width: 0.45,
    depth: 0.55,
    height: 0.45,
    iconType: 'toilet',
    defaultColor: '#f1f5f9',
    description: 'Tiefspül-WC mit Spülkasten',
  },
  {
    id: 'cat_basin_single',
    name: 'Waschtisch mit Armatur',
    category: 'bathroom',
    width: 0.80,
    depth: 0.50,
    height: 0.85,
    iconType: 'sink',
    defaultColor: '#f1f5f9',
    description: 'Keramik-Waschbecken mit Einhebelmischer',
  },
  {
    id: 'cat_washing_machine',
    name: 'Waschmaschine',
    category: 'bathroom',
    width: 0.60,
    depth: 0.60,
    height: 0.85,
    iconType: 'washer',
    defaultColor: '#e2e8f0',
    description: 'Frontlader-Waschmaschine mit Bullauge',
  },

  // Technik & HVAC
  {
    id: 'cat_radiator',
    name: 'Flachheizkörper',
    category: 'tech',
    width: 1.00,
    depth: 0.12,
    height: 0.60,
    iconType: 'radiator',
    defaultColor: '#e2e8f0',
    description: 'Kompaktheizkörper für Wandmontage',
  },
  {
    id: 'cat_heat_pump',
    name: 'Wärmepumpen-Inneneinheit',
    category: 'tech',
    width: 0.60,
    depth: 0.60,
    height: 1.80,
    iconType: 'tech_box',
    defaultColor: '#e2e8f0',
    description: 'Heizungs- und Warmwasserzentrale',
  },

  // Außen & Terrasse
  {
    id: 'cat_patio_table',
    name: 'Gartentisch mit Stühlen',
    category: 'outdoor',
    width: 1.60,
    depth: 0.90,
    height: 0.75,
    iconType: 'table_4',
    defaultColor: '#f1f5f9',
    description: 'Witterungsbeständiges Garten-Set',
  },
  {
    id: 'cat_deck_chair',
    name: 'Sonnenliege',
    category: 'outdoor',
    width: 1.95,
    depth: 0.65,
    height: 0.35,
    iconType: 'deck_chair',
    defaultColor: '#f1f5f9',
    description: 'Verstellbare Liege für die Terrasse',
  },
];

export interface ElectricalCatalogItem {
  type: ElectricalType;
  name: string;
  symbol: string;
}

export const ELECTRICAL_CATALOG: ElectricalCatalogItem[] = [
  { type: 'socket', name: 'Schuko-Steckdose (230V)', symbol: '◉' },
  { type: 'switch', name: 'Lichtschalter 1-polig', symbol: '⚲' },
  { type: 'switch_double', name: 'Serienschalter 2-fach', symbol: '⚯' },
  { type: 'light_ceiling', name: 'Deckenleuchte / Deckenauslass', symbol: '⊗' },
  { type: 'light_wall', name: 'Wandleuchte / Wandauslass', symbol: '◒' },
  { type: 'network', name: 'Netzwerkdose LAN (RJ45)', symbol: '☲' },
  { type: 'tv', name: 'Antennendose / TV-Koaxial', symbol: '📺' },
  { type: 'smoke_detector', name: 'Rauchwarnmelder (DIN 14676)', symbol: '◎' },
  { type: 'water', name: 'Frischwasseranschluss', symbol: '💧' },
  { type: 'drainage', name: 'Abwasserablauf', symbol: '⊘' },
  { type: 'gas', name: 'Gasanschluss', symbol: '🔥' },
];
