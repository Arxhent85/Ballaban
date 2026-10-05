/**
 * Room Edit Modal for renaming and selecting floor finishes
 */

import React, { useState } from 'react';
import { Tag, X, Check } from 'lucide-react';
import { Room, FloorFinish, Language } from '../../types/cad';
import { getT } from '../../i18n/translations';

interface RoomEditModalProps {
  room: Room | null;
  onClose: () => void;
  onSave: (updated: Room) => void;
  language: Language;
}

export const RoomEditModal: React.FC<RoomEditModalProps> = ({
  room,
  onClose,
  onSave,
  language,
}) => {
  const t = getT(language);
  if (!room) return null;

  const [name, setName] = useState(room.name);
  const [floorFinish, setFloorFinish] = useState<FloorFinish>(room.floorFinish);
  const [category, setCategory] = useState(room.category);
  const [targetLivingArea, setTargetLivingArea] = useState(room.targetLivingArea);

  const handleSave = () => {
    onSave({
      ...room,
      name,
      floorFinish,
      category,
      targetLivingArea,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full flex flex-col text-slate-900 dark:text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-900/60">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            <h2 className="font-semibold text-sm">Raum bearbeiten</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-700 dark:hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-3 text-xs">
          <div>
            <label className="text-stone-500 font-medium">Raumbezeichnung:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold mt-1 outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="text-stone-500 font-medium">Bodenbelag:</label>
            <select
              value={floorFinish}
              onChange={(e) => setFloorFinish(e.target.value as FloorFinish)}
              className="w-full bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 rounded-lg px-2.5 py-1.5 text-xs mt-1 outline-none"
            >
              <option value="parquet">Eichenparkett Natur</option>
              <option value="tiles">Feinsteinzeug Fliesen</option>
              <option value="wood_plank">Holzdielen Kiefer</option>
              <option value="carpet">Teppichboden</option>
              <option value="concrete">Sichtestrich / Beton</option>
              <option value="laminate">Laminat modern</option>
            </select>
          </div>

          <div className="p-2.5 rounded-lg bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/60 font-mono text-[11px] flex justify-between">
            <span className="text-stone-500">Netto-Fläche:</span>
            <span className="font-bold text-amber-600 dark:text-amber-400">{room.areaM2.toFixed(1)} m²</span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={targetLivingArea}
              onChange={(e) => setTargetLivingArea(e.target.checked)}
              className="accent-amber-600 rounded"
            />
            <span className="text-stone-700 dark:text-stone-300">Wohnfläche nach WoFlV anrechnen</span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-stone-500 hover:text-stone-800 dark:hover:text-white text-xs cursor-pointer">
            Abbrechen
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Speichern</span>
          </button>
        </div>
      </div>
    </div>
  );
};
