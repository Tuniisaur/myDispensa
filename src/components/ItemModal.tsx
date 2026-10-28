import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FoodItem, FoodCategory, StorageLocation } from '../types';
import { CATEGORIES, COMMON_UNITS, STORAGE_LOCATIONS } from '../constants';
import { X, Check, Barcode } from 'lucide-react';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<FoodItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => void;
  onOpenScanner?: () => void;
  initialItem?: FoodItem | null;
  defaultLocation?: StorageLocation;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onOpenScanner,
  initialItem,
  defaultLocation = 'fridge',
}) => {
  const [name, setName] = useState('');
  const [location, setLocation] = useState<StorageLocation>(defaultLocation);
  const [category, setCategory] = useState<FoodCategory>('produce');
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<string>('pz');
  const [expiryDate, setExpiryDate] = useState<string>('');
  const [opened, setOpened] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setLocation(initialItem.location);
      setCategory(initialItem.category);
      setQuantity(initialItem.quantity);
      setUnit(initialItem.unit);
      setExpiryDate(initialItem.expiry_date || '');
      setOpened(initialItem.opened);
      setNotes(initialItem.notes || '');
    } else {
      setName('');
      setLocation(defaultLocation);
      setCategory('produce');
      setQuantity(1);
      setUnit('pz');
      setExpiryDate('');
      setOpened(false);
      setNotes('');
    }
  }, [initialItem, defaultLocation, isOpen]);

  const setQuickExpiry = (daysFromNow: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysFromNow);
    setExpiryDate(d.toISOString().split('T')[0]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      location,
      category,
      quantity: Number(quantity) || 1,
      unit,
      expiry_date: expiryDate ? expiryDate : null,
      opened,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop con animazione fluida in fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm cursor-pointer"
          />

          {/* Bottom Sheet nativo iOS / Android con trascinamento verso il basso (swipe-down to dismiss) */}
          <motion.div
            initial={{ y: '100%', scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.98 }}
            transition={{
              type: 'spring',
              damping: 32,
              stiffness: 340,
              mass: 0.7,
            }}
            drag="y"
            dragDirectionLock
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.55 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 450) {
                onClose();
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl border border-black/[0.04] overflow-hidden overflow-x-hidden touch-pan-y"
          >
            {/* Drag Handle con micro-animazione per swipe to dismiss */}
            <div className="w-full flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing sm:hidden touch-none select-none">
              <div className="w-12 h-1.5 bg-zinc-300 rounded-full transition-colors hover:bg-zinc-400" />
            </div>

            {/* Intestazione */}
            <div className="flex items-center justify-between px-6 pt-2 sm:pt-4 pb-3 border-b border-zinc-100 shrink-0">
              <div>
                <h2 className="text-lg font-black text-zinc-900 tracking-tight">
                  {initialItem ? 'Modifica Alimento' : 'Nuovo Alimento'}
                </h2>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  Inserisci i dettagli di conservazione e scadenza
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 active:scale-95 flex items-center justify-center text-zinc-500 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form con scroll esclusivamente verticale */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overflow-x-hidden px-6 py-5 space-y-5 overscroll-x-contain touch-pan-y">
              {/* Scorciatoia Scansiona Codice a Barre */}
              {!initialItem && onOpenScanner && (
                <button
                  type="button"
                  onClick={onOpenScanner}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-sky-500/10 border-2 border-dashed border-emerald-500/40 hover:border-emerald-600 rounded-2xl flex items-center justify-center gap-2.5 text-emerald-800 font-extrabold text-xs transition-all active:scale-[0.99] cursor-pointer shadow-2xs"
                >
                  <Barcode size={20} className="text-emerald-600" />
                  <span>Scansiona Codice a Barre con Fotocamera</span>
                </button>
              )}

              {/* Posizione (Tab Segmented Control) */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Posizione
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-100/90 rounded-2xl border border-zinc-200/60">
                  {STORAGE_LOCATIONS.map((loc) => {
                    const isSelected = location === loc.id;
                    return (
                      <button
                        type="button"
                        key={loc.id}
                        onClick={() => setLocation(loc.id)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? `${loc.activeBg} ${loc.borderActive} border font-black shadow-xs`
                            : 'text-zinc-500 hover:text-zinc-800'
                        }`}
                      >
                        {loc.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Nome Alimento */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Nome Prodotto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="es. Mozzarella di bufala, Zucchine, Farina"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-zinc-50 hover:bg-zinc-50/70 focus:bg-white rounded-xl border border-zinc-200 focus:border-emerald-600 focus:outline-none text-zinc-900 text-sm font-bold transition-colors"
                />
              </div>

              {/* Categorie Visual Grid Ridisegnata */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Categoria
                  </label>
                  <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {CATEGORIES.find((c) => c.id === category)?.emoji}{' '}
                    {CATEGORIES.find((c) => c.id === category)?.name}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 bg-zinc-50/90 rounded-2xl border border-zinc-200/80">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-2.5 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer border text-center select-none ${
                          isSelected
                            ? 'bg-white border-emerald-600 shadow-md ring-2 ring-emerald-500/30 scale-[1.03]'
                            : 'bg-white/80 hover:bg-white border-zinc-200/70 hover:border-zinc-300 text-zinc-600'
                        }`}
                      >
                        <span className={`text-2xl transition-transform ${isSelected ? 'scale-110 drop-shadow-xs' : ''}`}>
                          {cat.emoji}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold tracking-tight truncate w-full leading-tight ${
                            isSelected ? 'text-emerald-900 font-black' : 'text-zinc-600'
                          }`}
                        >
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantità e Unità */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Quantità
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-sm font-black text-zinc-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Unità
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                  >
                    {COMMON_UNITS.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scadenza con quick pills */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Data di Scadenza
                  </label>
                  {expiryDate && (
                    <button
                      type="button"
                      onClick={() => setExpiryDate('')}
                      className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
                    >
                      Rimuovi
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-900 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setQuickExpiry(3)}
                    className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 font-bold transition-colors cursor-pointer"
                  >
                    +3 giorni
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickExpiry(7)}
                    className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 font-bold transition-colors cursor-pointer"
                  >
                    +1 settimana
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickExpiry(30)}
                    className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 font-bold transition-colors cursor-pointer"
                  >
                    +1 mese
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickExpiry(180)}
                    className="px-2.5 py-1 text-xs bg-zinc-100 hover:bg-zinc-200 rounded-lg text-zinc-700 font-bold transition-colors cursor-pointer"
                  >
                    +6 mesi
                  </button>
                </div>
              </div>

              {/* Interruttore Aperto */}
              <div className="flex items-center justify-between p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200">
                <div>
                  <p className="text-xs font-bold text-amber-950">Confezione già aperta?</p>
                  <p className="text-[11px] font-medium text-amber-800">
                    Evidenzia l'alimento per consumarlo prima
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpened(!opened)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                    opened ? 'bg-amber-500 justify-end' : 'bg-zinc-300 justify-start'
                  }`}
                >
                  <div className="w-5 h-5 rounded-full bg-white shadow-xs" />
                </button>
              </div>

              {/* Note opzionali */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Note (Opzionale)
                </label>
                <input
                  type="text"
                  placeholder="es. Nel cassetto in basso, da usare per la pizza"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-50 rounded-xl border border-zinc-200 text-sm font-medium text-zinc-800 focus:bg-white focus:border-emerald-600 focus:outline-none"
                />
              </div>

              {/* Submit Action */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 active:scale-[0.99] text-white font-black rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check size={18} strokeWidth={2.8} />
                  {initialItem ? 'Salva modifiche' : 'Salva in Dispensa'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
