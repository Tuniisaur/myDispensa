import React, { useMemo } from 'react';
import { useInventory } from '../context/InventoryContext';
import { FoodItem } from '../types';
import { FoodItemCard } from './FoodItemCard';
import { AlertTriangle, AlertCircle, Skull, CalendarCheck, CheckCircle2 } from 'lucide-react';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { SwipeToDelete } from './spectrumui/swipe-to-delete';

interface ExpirationsViewProps {
  onEditItem: (item: FoodItem) => void;
  onDeleteItem: (id: string) => void;
  onConsumeItem: (id: string, amount: number) => void;
  onAddMoreItem: (id: string) => void;
  onAddToShopping: (item: FoodItem) => void;
}

export const ExpirationsView: React.FC<ExpirationsViewProps> = ({
  onEditItem,
  onDeleteItem,
  onConsumeItem,
  onAddMoreItem,
  onAddToShopping,
}) => {
  const { items } = useInventory();

  const categorized = useMemo(() => {
    const today = startOfDay(new Date());

    const expired: FoodItem[] = [];
    const urgent: FoodItem[] = []; // 0 - 3 giorni
    const soon: FoodItem[] = []; // 4 - 7 giorni
    const later: FoodItem[] = []; // > 7 giorni
    const noDate: FoodItem[] = [];

    items.forEach((item) => {
      if (!item.expiry_date) {
        noDate.push(item);
        return;
      }
      const expDate = startOfDay(parseISO(item.expiry_date));
      const diff = differenceInDays(expDate, today);

      if (diff < 0) {
        expired.push(item);
      } else if (diff <= 3) {
        urgent.push(item);
      } else if (diff <= 7) {
        soon.push(item);
      } else {
        later.push(item);
      }
    });

    return { expired, urgent, soon, later, noDate };
  }, [items]);

  return (
    <div className="space-y-5">
      {/* Intestazione */}
      <div className="pt-1">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-950">Scadenze Alimenti</h2>
          <p className="text-xs font-semibold text-amber-800 mt-0.5">
            Priorità di consumo intelligente per azzerare gli sprechi
          </p>
        </div>

        {/* Card Sommario di Stato Vivaci e Colorate */}
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="p-3 bg-gradient-to-br from-rose-50 to-red-100/70 border border-rose-300 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black text-rose-900 uppercase tracking-wider block flex items-center gap-1">
              <Skull size={13} className="text-rose-600" /> Scaduti
            </span>
            <span className="text-2xl font-black text-rose-950 mt-1 block">
              {categorized.expired.length}
            </span>
          </div>

          <div className="p-3 bg-gradient-to-br from-amber-50 to-yellow-100/70 border border-amber-300 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block flex items-center gap-1">
              <AlertCircle size={12} className="text-amber-600" /> Entro 3gg
            </span>
            <span className="text-2xl font-black text-amber-950 mt-1 block">
              {categorized.urgent.length}
            </span>
          </div>

          <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-100/70 border border-emerald-300 rounded-2xl shadow-xs">
            <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider block flex items-center gap-1">
              <CalendarCheck size={12} className="text-emerald-600" /> In Regola
            </span>
            <span className="text-2xl font-black text-emerald-950 mt-1 block">
              {categorized.soon.length + categorized.later.length}
            </span>
          </div>
        </div>
      </div>

      {/* Sezione: Nessun alimento scaduto o urgente */}
      {categorized.expired.length === 0 && categorized.urgent.length === 0 && items.length > 0 && (
        <div className="bg-white rounded-3xl p-6 text-center border-2 border-dashed border-emerald-200 shadow-xs">
          <div className="relative flex justify-center -my-2 select-none pointer-events-none">
            <img
              src="/nonescad.png"
              alt="Nessun alimento scaduto o in scadenza"
              className="w-48 h-48 object-contain drop-shadow-md transform scale-105"
            />
          </div>
          <h3 className="font-extrabold text-zinc-900 text-sm mt-1">Tutto sotto controllo!</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
            Non ci sono alimenti scaduti o vicini alla scadenza.
          </p>
        </div>
      )}

      {/* Sezione: Già Scaduti */}
      {categorized.expired.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-1 text-rose-700 font-extrabold text-xs uppercase tracking-wider">
            <AlertTriangle size={15} /> Già scaduti ({categorized.expired.length})
          </div>
          <div className="space-y-2.5">
            {categorized.expired.map((item) => (
              <SwipeToDelete
                key={item.id}
                label={item.name}
                onDelete={() => onDeleteItem(item.id)}
                actionWidth={90}
              >
                <FoodItemCard
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onConsume={onConsumeItem}
                  onAddMore={onAddMoreItem}
                  onAddToShopping={onAddToShopping}
                />
              </SwipeToDelete>
            ))}
          </div>
        </div>
      )}

      {/* Sezione: In scadenza urgente (0 - 3 giorni) */}
      {categorized.urgent.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2.5 px-1 text-amber-800 font-extrabold text-xs uppercase tracking-wider">
            <AlertCircle size={15} /> Da consumare a breve ({categorized.urgent.length})
          </div>
          <div className="space-y-2.5">
            {categorized.urgent.map((item) => (
              <SwipeToDelete
                key={item.id}
                label={item.name}
                onDelete={() => onDeleteItem(item.id)}
                actionWidth={90}
              >
                <FoodItemCard
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onConsume={onConsumeItem}
                  onAddMore={onAddMoreItem}
                  onAddToShopping={onAddToShopping}
                />
              </SwipeToDelete>
            ))}
          </div>
        </div>
      )}

      {/* Sezione: Questa settimana (4 - 7 giorni) */}
      {categorized.soon.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
            Entro questa settimana ({categorized.soon.length})
          </h3>
          <div className="space-y-2.5">
            {categorized.soon.map((item) => (
              <SwipeToDelete
                key={item.id}
                label={item.name}
                onDelete={() => onDeleteItem(item.id)}
                actionWidth={90}
              >
                <FoodItemCard
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onConsume={onConsumeItem}
                  onAddMore={onAddMoreItem}
                  onAddToShopping={onAddToShopping}
                />
              </SwipeToDelete>
            ))}
          </div>
        </div>
      )}

      {/* Sezione: A lungo termine */}
      {categorized.later.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2.5 px-1">
            Scadenza successiva ({categorized.later.length})
          </h3>
          <div className="space-y-2.5">
            {categorized.later.map((item) => (
              <SwipeToDelete
                key={item.id}
                label={item.name}
                onDelete={() => onDeleteItem(item.id)}
                actionWidth={90}
              >
                <FoodItemCard
                  item={item}
                  onEdit={onEditItem}
                  onDelete={onDeleteItem}
                  onConsume={onConsumeItem}
                  onAddMore={onAddMoreItem}
                  onAddToShopping={onAddToShopping}
                />
              </SwipeToDelete>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="bg-white rounded-3xl p-8 text-center border border-zinc-200">
          <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-2" />
          <p className="text-zinc-900 font-bold text-sm">Nessun alimento registrato</p>
          <p className="text-zinc-500 text-xs mt-0.5">Aggiungi cibi per visualizzare la linea del tempo delle scadenze.</p>
        </div>
      )}
    </div>
  );
};
