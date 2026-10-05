/**
 * House Wizard Generator ("Assistent für neues Haus")
 * Interactively prompts for width, length, floors, roof type, room counts and builds a customized floor plan
 */

import React, { useState } from 'react';
import { Wand2, X, Home, Check } from 'lucide-react';
import { CadProject, Wall, Door, Window, Room, RoofType, Language } from '../../types/cad';
import { createEmptyProject } from '../../utils/templates';
import { getT } from '../../i18n/translations';

interface HouseWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerateProject: (proj: CadProject) => void;
  language: Language;
}

export const HouseWizardModal: React.FC<HouseWizardModalProps> = ({
  isOpen,
  onClose,
  onGenerateProject,
  language,
}) => {
  const t = getT(language);

  const [widthM, setWidthM] = useState<number>(8.0);
  const [lengthM, setLengthM] = useState<number>(6.0);
  const [bedRoomsCount, setBedRoomsCount] = useState<number>(2);
  const [hasBath, setHasBath] = useState<boolean>(true);
  const [hasTerrace, setHasTerrace] = useState<boolean>(true);
  const [roofType, setRoofType] = useState<RoofType>('gable');

  if (!isOpen) return null;

  const handleGenerate = () => {
    const proj = createEmptyProject();
    proj.name = `Ferienhaus (${widthM}x${lengthM}m)`;
    proj.titleBlock.projectName = `Ferienhaus Neubau ${widthM}x${lengthM}m`;

    const ox = 2;
    const oy = 2;
    const w = widthM;
    const l = lengthM;

    // 4 Outer Walls
    const w1: Wall = {
      id: 'wiz_w_south',
      start: { x: ox, y: oy + l },
      end: { x: ox + w, y: oy + l },
      thickness: 0.30,
      height: 2.60,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };
    const w2: Wall = {
      id: 'wiz_w_east',
      start: { x: ox + w, y: oy + l },
      end: { x: ox + w, y: oy },
      thickness: 0.30,
      height: 2.60,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };
    const w3: Wall = {
      id: 'wiz_w_north',
      start: { x: ox + w, y: oy },
      end: { x: ox, y: oy },
      thickness: 0.30,
      height: 2.60,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };
    const w4: Wall = {
      id: 'wiz_w_west',
      start: { x: ox, y: oy },
      end: { x: ox, y: oy + l },
      thickness: 0.30,
      height: 2.60,
      isExterior: true,
      material: 'timber',
      referenceLine: 'center',
    };

    const walls: Wall[] = [w1, w2, w3, w4];
    const doors: Door[] = [];
    const windows: Window[] = [];
    const rooms: Room[] = [];

    // Main entrance door on north
    doors.push({
      id: 'wiz_d_entry',
      wallId: 'wiz_w_north',
      position: 0.25,
      width: 1.01,
      height: 2.10,
      type: 'entry',
      swingDirection: 'right',
      openDirection: 'inside',
      swingAngle: 90,
      frameThickness: 0.08,
      sillHeight: 0,
      name: 'Hauseingangstür',
    });

    // Patio door on south
    doors.push({
      id: 'wiz_d_patio',
      wallId: 'wiz_w_south',
      position: 0.7,
      width: 1.60,
      height: 2.15,
      type: 'patio',
      swingDirection: 'right',
      openDirection: 'outside',
      swingAngle: 90,
      frameThickness: 0.08,
      sillHeight: 0,
      name: 'Terrassentür',
    });

    // Windows
    windows.push({
      id: 'wiz_win_living',
      wallId: 'wiz_w_south',
      position: 0.25,
      width: 1.60,
      height: 1.30,
      parapetHeight: 0.85,
      type: 'double',
      frameColor: '#334155',
      glazing: '3',
      hasInteriorSill: true,
      hasExteriorSill: true,
      name: 'Fenster Wohnen',
    });
    windows.push({
      id: 'wiz_win_bed',
      wallId: 'wiz_w_west',
      position: 0.3,
      width: 1.20,
      height: 1.20,
      parapetHeight: 0.90,
      type: 'turn_tilt',
      frameColor: '#334155',
      glazing: '3',
      hasInteriorSill: true,
      hasExteriorSill: true,
      name: 'Fenster Schlafen',
    });

    // Partition walls based on room counts
    const splitX = ox + w * 0.55;
    walls.push({
      id: 'wiz_w_int_main',
      start: { x: splitX, y: oy },
      end: { x: splitX, y: oy + l },
      thickness: 0.12,
      height: 2.60,
      isExterior: false,
      material: 'drywall',
      referenceLine: 'center',
    });

    if (hasBath) {
      const bathY = oy + l * 0.5;
      walls.push({
        id: 'wiz_w_int_bath',
        start: { x: ox, y: bathY },
        end: { x: splitX, y: bathY },
        thickness: 0.12,
        height: 2.60,
        isExterior: false,
        material: 'drywall',
        referenceLine: 'center',
      });

      // Bath door
      doors.push({
        id: 'wiz_d_bath',
        wallId: 'wiz_w_int_bath',
        position: 0.7,
        width: 0.885,
        height: 2.05,
        type: 'single',
        swingDirection: 'right',
        openDirection: 'inside',
        swingAngle: 90,
        frameThickness: 0.08,
        sillHeight: 0,
        name: 'Bad-Tür',
      });

      // Window in bath
      windows.push({
        id: 'wiz_win_bath',
        wallId: 'wiz_w_west',
        position: 0.75,
        width: 0.80,
        height: 0.80,
        parapetHeight: 1.20,
        type: 'turn_tilt',
        frameColor: '#334155',
        glazing: '3',
        hasInteriorSill: true,
        hasExteriorSill: true,
        name: 'Fenster Bad',
      });

      rooms.push({
        id: 'wiz_r_bath',
        name: 'Duschbad / WC',
        category: 'bath',
        polygon: [
          { x: ox, y: bathY },
          { x: splitX, y: bathY },
          { x: splitX, y: oy + l },
          { x: ox, y: oy + l },
        ],
        areaM2: (splitX - ox) * (oy + l - bathY),
        perimeterM: 2 * ((splitX - ox) + (oy + l - bathY)),
        height: 2.60,
        floorFinish: 'tiles',
        color: '#cffafe',
        targetLivingArea: true,
      });
    }

    // Bedroom door
    doors.push({
      id: 'wiz_d_bed',
      wallId: 'wiz_w_int_main',
      position: 0.3,
      width: 0.885,
      height: 2.05,
      type: 'single',
      swingDirection: 'left',
      openDirection: 'inside',
      swingAngle: 90,
      frameThickness: 0.08,
      sillHeight: 0,
      name: 'Schlafzimmertür',
    });

    // Rooms
    rooms.push({
      id: 'wiz_r_living',
      name: 'Wohnraum mit offener Küche',
      category: 'living',
      polygon: [
        { x: splitX, y: oy },
        { x: ox + w, y: oy },
        { x: ox + w, y: oy + l },
        { x: splitX, y: oy + l },
      ],
      areaM2: (ox + w - splitX) * l,
      perimeterM: 2 * ((ox + w - splitX) + l),
      height: 2.60,
      floorFinish: 'parquet',
      color: '#fef3c7',
      targetLivingArea: true,
    });

    rooms.push({
      id: 'wiz_r_bed',
      name: 'Schlafzimmer',
      category: 'sleeping',
      polygon: [
        { x: ox, y: oy },
        { x: splitX, y: oy },
        { x: splitX, y: hasBath ? oy + l * 0.5 : oy + l },
        { x: ox, y: hasBath ? oy + l * 0.5 : oy + l },
      ],
      areaM2: (splitX - ox) * (hasBath ? l * 0.5 : l),
      perimeterM: 2 * ((splitX - ox) + (hasBath ? l * 0.5 : l)),
      height: 2.60,
      floorFinish: 'wood_plank',
      color: '#e0e7ff',
      targetLivingArea: true,
    });

    proj.floors[0].walls = walls;
    proj.floors[0].doors = doors;
    proj.floors[0].windows = windows;
    proj.floors[0].rooms = rooms;
    proj.floors[0].roofs[0].type = roofType;

    onGenerateProject(proj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-amber-400" />
            <h2 className="font-semibold text-sm">Assistent für neues Ferienhaus</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 flex flex-col gap-4 text-xs">
          <p className="text-slate-300 text-xs">
            Gib die gewünschten Abmessungen und Raumwünsche ein. Der Assistent berechnet einen ersten fertigen Grundriss, den du anschließend im Plan beliebig verändern kannst!
          </p>

          {/* Width & Length */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 flex flex-col gap-1.5">
              <label className="text-slate-300 font-medium">Hausbreite (Außenmaß):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="20"
                  value={widthM}
                  onChange={(e) => setWidthM(parseFloat(e.target.value) || 8)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-base font-bold font-mono text-emerald-400 outline-none"
                />
                <span className="text-slate-400 font-semibold">m</span>
              </div>
            </div>

            <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700 flex flex-col gap-1.5">
              <label className="text-slate-300 font-medium">Haustiefe (Länge):</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="4"
                  max="20"
                  value={lengthM}
                  onChange={(e) => setLengthM(parseFloat(e.target.value) || 6)}
                  className="w-full bg-slate-900 border border-slate-600 rounded px-2.5 py-1 text-base font-bold font-mono text-emerald-400 outline-none"
                />
                <span className="text-slate-400 font-semibold">m</span>
              </div>
            </div>
          </div>

          {/* Roof Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-slate-300 font-medium">Dachform:</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'gable' as RoofType, label: 'Satteldach' },
                { type: 'shed' as RoofType, label: 'Pultdach' },
                { type: 'hip' as RoofType, label: 'Walmdach' },
                { type: 'flat' as RoofType, label: 'Flachdach' },
              ].map((rf) => (
                <button
                  key={rf.type}
                  onClick={() => setRoofType(rf.type)}
                  className={`p-2 rounded-lg border text-center transition-colors ${
                    roofType === rf.type
                      ? 'bg-emerald-600 border-emerald-500 text-white font-semibold'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {rf.label}
                </button>
              ))}
            </div>
          </div>

          {/* Options: Bath, Terrace */}
          <div className="bg-slate-950/40 p-3 rounded-lg border border-slate-800 flex flex-col gap-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasBath}
                onChange={(e) => setHasBath(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-200">Eigenes Duschbad / WC abtrennen</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hasTerrace}
                onChange={(e) => setHasTerrace(e.target.checked)}
                className="accent-emerald-500 rounded"
              />
              <span className="text-slate-200">Große Terrassentür zum Garten einplanen</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white text-xs">
            Abbrechen
          </button>

          <button
            onClick={handleGenerate}
            className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-semibold rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <Check className="w-4 h-4" />
            <span>Grundriss jetzt erzeugen</span>
          </button>
        </div>
      </div>
    </div>
  );
};
