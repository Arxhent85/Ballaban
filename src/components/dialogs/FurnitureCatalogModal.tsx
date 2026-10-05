/**
 * Furniture & Architectural Equipment Catalog Picker
 */

import React, { useState } from 'react';
import {
  Armchair,
  X,
  Search,
  Bed,
  UtensilsCrossed,
  Bath,
  Flame,
  Trees,
  Zap,
  Plus,
} from 'lucide-react';
import { Furniture, FurnitureCategory, Language } from '../../types/cad';
import { FURNITURE_CATALOG, ELECTRICAL_CATALOG, CatalogItem } from '../../utils/furnitureLibrary';
import { getT } from '../../i18n/translations';

interface FurnitureCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFurniture: (f: Furniture) => void;
  language: Language;
}

export const FurnitureCatalogModal: React.FC<FurnitureCatalogModalProps> = ({
  isOpen,
  onClose,
  onSelectFurniture,
  language,
}) => {
  const t = getT(language);
  const [activeCategory, setActiveCategory] = useState<FurnitureCategory>('living');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filteredItems = FURNITURE_CATALOG.filter((item) => {
    const matchesCat = item.category === activeCategory;
    const matchesSearch =
      searchTerm.trim() === '' || item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const handlePickItem = (item: CatalogItem) => {
    const newFurn: Furniture = {
      id: 'furn_' + Date.now(),
      name: item.name,
      category: item.category,
      type: item.id,
      x: 6.0,
      y: 4.5,
      width: item.width,
      depth: item.depth,
      height: item.height,
      rotation: 0,
      color: item.defaultColor,
      iconType: item.iconType,
    };
    onSelectFurniture(newFurn);
    onClose();
  };

  const categories: { id: FurnitureCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'living', label: 'Wohnen & Essen', icon: <Armchair className="w-4 h-4" /> },
    { id: 'bedroom', label: 'Schlafzimmer', icon: <Bed className="w-4 h-4" /> },
    { id: 'kitchen', label: 'Küche', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { id: 'bathroom', label: 'Badezimmer & WC', icon: <Bath className="w-4 h-4" /> },
    { id: 'tech', label: 'Heizung & Technik', icon: <Flame className="w-4 h-4" /> },
    { id: 'outdoor', label: 'Terrasse & Garten', icon: <Trees className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Armchair className="w-5 h-5 text-indigo-400" />
            <h2 className="font-semibold text-sm">Möbel- & Ausstattungskatalog</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Categories Bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Möbelstück suchen (z. B. Sofa, Bett, Esstisch)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 shrink-0 transition-colors ${
                  activeCategory === c.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {c.icon}
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Items Grid */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handlePickItem(item)}
              className="p-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 flex items-center justify-between cursor-pointer group transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center border border-slate-600"
                  style={{ backgroundColor: item.defaultColor ? `${item.defaultColor}33` : '#334155' }}
                >
                  <div
                    className="w-5 h-5 rounded-sm"
                    style={{ backgroundColor: item.defaultColor || '#94a3b8' }}
                  />
                </div>
                <div>
                  <div className="font-semibold text-white group-hover:text-indigo-300 transition-colors">
                    {item.name}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                    {(item.width * 100).toFixed(0)} × {(item.depth * 100).toFixed(0)} cm (H: {(item.height * 100).toFixed(0)} cm)
                  </div>
                </div>
              </div>

              <button className="p-1.5 rounded-lg bg-indigo-600/30 group-hover:bg-indigo-600 text-indigo-300 group-hover:text-white transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-between items-center text-xs">
          <span className="text-slate-400 text-[11px]">Klicke auf ein Möbelstück, um es im Plan zu platzieren.</span>
          <button onClick={onClose} className="px-4 py-1.5 text-slate-400 hover:text-white">
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
