import React from 'react';
import { Package, Clock, ChefHat, CheckSquare } from 'lucide-react';

interface BottomNavProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  counts: {
    inventory: number;
    expirations: number;
    shopping: number;
  };
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onTabChange, counts }) => {
  const tabs = [
    {
      id: 'inventory',
      label: 'Inventario',
      icon: Package,
      count: counts.inventory,
      color: 'text-emerald-700',
      activeBg: 'bg-emerald-500/10 text-emerald-800',
      pillColor: 'bg-emerald-700 text-white',
    },
    {
      id: 'expirations',
      label: 'Scadenze',
      icon: Clock,
      count: counts.expirations,
      color: 'text-amber-700',
      activeBg: 'bg-amber-500/10 text-amber-800',
      pillColor: 'bg-amber-600 text-white',
    },
    {
      id: 'recipes',
      label: 'Ricette',
      icon: ChefHat,
      count: 0,
      color: 'text-indigo-700',
      activeBg: 'bg-indigo-500/10 text-indigo-800',
      pillColor: 'bg-indigo-600 text-white',
    },
    {
      id: 'shopping',
      label: 'Lista Spesa',
      icon: CheckSquare,
      count: counts.shopping,
      color: 'text-teal-700',
      activeBg: 'bg-teal-500/10 text-teal-800',
      pillColor: 'bg-teal-700 text-white',
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-xl border-t border-zinc-200/90 z-40 pb-[max(env(safe-area-inset-bottom,0px),12px)] shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 rounded-2xl transition-all duration-150 cursor-pointer relative ${
                isActive
                  ? `${tab.activeBg} font-bold scale-[1.02]`
                  : 'text-zinc-400 hover:text-zinc-600'
              }`}
            >
              <div className="relative flex items-center justify-center w-8 h-8">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.9}
                  className="transition-transform duration-150"
                />
                {tab.count > 0 && (
                  <span
                    className={`absolute -top-1 -right-2 min-w-4.5 h-4.5 px-1 rounded-full text-[10px] font-black flex items-center justify-center border-2 border-white shadow-xs transition-all ${tab.pillColor}`}
                  >
                    {tab.count}
                  </span>
                )}
              </div>
              <span className="text-[11px] tracking-tight mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
