import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, AlertTriangle, Clock, ArrowRight, Skull } from 'lucide-react';
import { FoodItem } from '../types';
import { CATEGORIES } from '../constants';
import { formatExpiryLabel, getExpiryStatus } from '../utils/date';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: FoodItem[];
  onOpenExpirationsTab: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  isOpen,
  onClose,
  items,
  onOpenExpirationsTab,
}) => {
  useBodyScrollLock(isOpen);
  // Filtra unicamente i cibi in scadenza (oggi, a breve o scaduti)
  const expiringItems = items
    .filter((item) => {
      const status = getExpiryStatus(item.expiry_date);
      return status === 'expired' || status === 'warning';
    })
    .sort((a, b) => {
      if (!a.expiry_date) return 1;
      if (!b.expiry_date) return -1;
      return a.expiry_date.localeCompare(b.expiry_date);
    });

  const expiredCount = items.filter((i) => getExpiryStatus(i.expiry_date) === 'expired').length;
  const urgentCount = items.filter((i) => getExpiryStatus(i.expiry_date) === 'warning').length;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop con sfocatura */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Bottom Sheet */}
          <motion.div
            initial={{ y: '100%', scale: 0.96 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.96 }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 340,
              mass: 0.7,
            }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl max-h-[88vh] flex flex-col shadow-2xl border border-black/[0.04] overflow-hidden"
          >
            {/* Drag Handle per mobile */}
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mt-3 sm:hidden" />

            {/* Header del Centro Notifiche */}
            <div className="relative z-20 flex items-center justify-between px-6 pt-3 sm:pt-5 pb-3.5 border-b border-zinc-100/80 bg-white/70 backdrop-blur-xs shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-200 shadow-2xs">
                  <Bell size={20} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 text-base leading-tight tracking-tight">
                    Centro Notifiche
                  </h3>
                  <p className="text-[11px] text-zinc-500 font-bold mt-0.5">
                    {expiringItems.length > 0
                      ? `${expiringItems.length} alimenti richiedono attenzione`
                      : 'Nessun alimento a rischio'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Immagine scadenze ingrandita con sovrapposizione */}
            <div className="relative flex justify-center -my-6 sm:-my-8 pointer-events-none select-none z-10 overflow-visible">
              <img
                src="/scadenze.png"
                alt="Scadenze"
                className="h-44 sm:h-52 w-auto object-contain drop-shadow-md transform scale-110"
              />
            </div>

            {/* Badge riepilogo rapido */}
            <div className="relative z-20 grid grid-cols-2 gap-2 px-6 pt-1 pb-1 shrink-0">
              <div className="p-2.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">
                    In Scadenza
                  </span>
                  <span className="text-sm font-black text-amber-950">{urgentCount}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-rose-50/80 border border-rose-200 flex items-center gap-2">
                <Skull size={16} className="text-rose-600 shrink-0" />
                <div>
                  <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider block">
                    Scaduti
                  </span>
                  <span className="text-sm font-black text-rose-950">{expiredCount}</span>
                </div>
              </div>
            </div>

            {/* Lista dei cibi in scadenza */}
            <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2.5">
              {expiringItems.length > 0 &&
                expiringItems.map((item) => {
                  const cat = CATEGORIES.find((c) => c.id === item.category);
                  const expiryInfo = formatExpiryLabel(item.expiry_date);
                  const isExpired = getExpiryStatus(item.expiry_date) === 'expired';

                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-colors ${
                        isExpired
                          ? 'bg-rose-50/50 border-rose-200'
                          : 'bg-amber-50/50 border-amber-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xl select-none shrink-0">{cat?.emoji || '🥫'}</span>
                        <div className="min-w-0">
                          <h4 className="text-xs font-black text-zinc-900 truncate">
                            {item.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                              {item.location === 'fridge'
                                ? 'Frigo'
                                : item.location === 'freezer'
                                ? 'Freezer'
                                : 'Dispensa'}
                            </span>
                            <span className="text-zinc-300 text-[10px]">•</span>
                            <span className="text-[10px] font-semibold text-zinc-500">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-lg ${expiryInfo.badgeClass}`}
                        >
                          <Clock size={10} strokeWidth={2.4} />
                          {expiryInfo.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Footer con collegamento alla pagina scadenze */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50/80 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExpirationsTab();
                }}
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Gestisci tutte le scadenze</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
