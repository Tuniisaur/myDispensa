import React from 'react';
import { FoodItem } from '../types';
import { CATEGORIES } from '../constants';
import { formatExpiryLabel } from '../utils/date';
import { Minus, Plus, Trash2, Edit3, ShoppingBag, Clock } from 'lucide-react';

interface FoodItemCardProps {
  item: FoodItem;
  onEdit: (item: FoodItem) => void;
  onDelete: (id: string) => void;
  onConsume: (id: string, amount: number) => void;
  onAddMore: (id: string) => void;
  onAddToShopping: (item: FoodItem) => void;
}

export const FoodItemCard: React.FC<FoodItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onConsume,
  onAddMore,
  onAddToShopping,
}) => {
  const category = CATEGORIES.find((c) => c.id === item.category) || {
    name: 'Altro',
    emoji: '✨',
    bgLight: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-800',
    color: 'from-zinc-400 to-slate-500',
  };
  const expiryInfo = formatExpiryLabel(item.expiry_date);

  // Colore del piccolo indicatore laterale in base alla scadenza/reparto
  const getLocationTag = () => {
    switch (item.location) {
      case 'fridge':
        return { label: 'Frigo', bg: 'bg-sky-50 text-sky-700 border-sky-200' };
      case 'freezer':
        return { label: 'Freezer', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'pantry':
        return { label: 'Dispensa', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
  };

  const locTag = getLocationTag();

  return (
    <div className="w-full bg-white p-3.5 sm:p-4">
      <div className="flex items-start justify-between gap-3">
        {/* Sinistra: Avatar categoria colorato & Dettagli */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`w-11 h-11 rounded-2xl ${category.bgLight} ${category.border} border flex items-center justify-center text-xl shrink-0 select-none shadow-xs transition-transform active:scale-95`}
          >
            {category.emoji}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-bold text-zinc-900 text-sm tracking-tight truncate">
                {item.name}
              </h3>
              {item.opened && (
                <span className="text-[10px] font-bold tracking-wide uppercase px-1.5 py-0.5 rounded-md bg-amber-100/80 text-amber-900 border border-amber-300">
                  Aperto
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Reparto Pill */}
              <span
                className={`text-[10px] font-semibold px-1.5 py-0.2 rounded-md border ${locTag.bg}`}
              >
                {locTag.label}
              </span>

              <span className="text-[11px] font-semibold text-zinc-500">
                {category.name}
              </span>

              <span className="text-zinc-300 text-[10px]">•</span>

              {/* Badge Scadenza */}
              <span
                className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-lg ${expiryInfo.badgeClass}`}
              >
                {expiryInfo.isUrgent && <Clock size={11} className="stroke-[2.4]" />}
                {expiryInfo.label}
              </span>
            </div>

            {item.notes && (
              <p className="text-[11px] text-zinc-600 mt-2 bg-zinc-50 border border-zinc-150 px-2.5 py-1 rounded-xl line-clamp-1">
                💬 {item.notes}
              </p>
            )}
          </div>
        </div>

        {/* Destra: Stepper Quantità colorato ed elegante */}
        <div className="flex items-center bg-zinc-100/80 border border-zinc-200/80 rounded-2xl p-0.5 shrink-0 shadow-2xs">
          <button
            onClick={() => onConsume(item.id, 1)}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-600 hover:text-emerald-700 hover:bg-white active:scale-90 transition-all cursor-pointer"
            title="Consuma o riduci"
          >
            <Minus size={13} strokeWidth={2.5} />
          </button>
          <span className="px-2 text-xs font-bold text-zinc-900 tabular-nums min-w-8 text-center">
            {item.quantity} <span className="text-[10px] text-zinc-500 font-medium">{item.unit}</span>
          </span>
          <button
            onClick={() => onAddMore(item.id)}
            className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-600 hover:text-emerald-700 hover:bg-white active:scale-90 transition-all cursor-pointer"
            title="Aggiungi"
          >
            <Plus size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Barra inferiore con micro-azioni rifinite */}
      <div className="flex items-center justify-between gap-1 mt-3 pt-2.5 border-t border-zinc-100">
        <span className="text-[10px] font-medium text-zinc-400 select-none flex items-center gap-1">
          ← trascina per eliminare
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onAddToShopping(item)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/70 px-2.5 py-1 rounded-xl transition-colors cursor-pointer"
            title="Aggiungi alla spesa"
          >
            <ShoppingBag size={12} strokeWidth={2.4} />
            <span>+ Spesa</span>
          </button>
          <button
            onClick={() => onEdit(item)}
            className="p-1.5 text-zinc-400 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
            title="Modifica"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => onDelete(item.id)}
            className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
            title="Elimina"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
