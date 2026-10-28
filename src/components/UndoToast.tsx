import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, X } from 'lucide-react';
import { FoodItem } from '../types';

interface UndoToastProps {
  item: FoodItem | null;
  onUndo: () => void;
  onDismiss: () => void;
}

export const UndoToast: React.FC<UndoToastProps> = ({ item, onUndo, onDismiss }) => {
  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          className="fixed bottom-22 left-0 right-0 max-w-md mx-auto px-4 z-40 pointer-events-none"
        >
          {/* Pillola bianca minimalista e raffinata */}
          <div className="pointer-events-auto bg-white/95 backdrop-blur-xl rounded-2xl px-3.5 py-2.5 shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-emerald-950/[0.06] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
              <p className="text-xs text-zinc-600 truncate">
                Rimosso <span className="font-semibold text-zinc-900">{item.name}</span>
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={onUndo}
                className="bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 text-xs font-semibold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RotateCcw size={12} strokeWidth={2.4} />
                <span>Annulla</span>
              </button>
              <button
                onClick={onDismiss}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
                title="Chiudi"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
