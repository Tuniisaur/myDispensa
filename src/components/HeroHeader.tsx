import React, { useState, useRef, useEffect } from 'react';
import { StorageLocation } from '../types';
import { User as UserIcon, Bell, LogOut, CheckCircle2, ShieldCheck, Key } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { AllItemsSvg, FridgeSvg, FreezerSvg, PantrySvg } from './LocationIconsSvg';
import { GroqKeyModal } from './GroqKeyModal';

interface HeroHeaderProps {
  user: User | null;
  username?: string;
  onSignOut: () => void;
  onOpenNotifications?: () => void;
  onOpenPermissions?: () => void;
  onOpenGroqModal?: () => void;
  hasUrgentItems?: boolean;
  currentTab: string;
  currentLocation: StorageLocation | 'all';
  onLocationChange: (loc: StorageLocation | 'all') => void;
  locationCounts: {
    all: number;
    fridge: number;
    freezer: number;
    pantry: number;
  };
}

export const HeroHeader: React.FC<HeroHeaderProps> = ({
  user,
  username,
  onSignOut,
  onOpenNotifications,
  onOpenPermissions,
  onOpenGroqModal,
  hasUrgentItems = false,
  currentTab,
  currentLocation,
  locationCounts,
  onLocationChange,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isGroqModalOpenInternal, setIsGroqModalOpenInternal] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Chiudi sottomenu cliccando all'esterno
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

  const displayName = username || user?.email?.split('@')[0] || 'Utente';
  const lowerName = displayName.toLowerCase();
  const avatarSrc = lowerName === 'mavi' ? '/mavi.png' : lowerName === 'franca' ? '/franca.png' : null;

  const sections = [
    {
      id: 'all' as const,
      name: 'Tutti',
      subtitle: 'Tutto il cibo',
      count: locationCounts.all,
      svg: AllItemsSvg,
      activeCardBg: 'bg-gradient-to-b from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/25 border-emerald-400 ring-2 ring-emerald-400/40',
      badgeActive: 'bg-emerald-950/80 text-emerald-200 font-black',
      badgeInactive: 'bg-emerald-100 text-emerald-800 font-bold',
    },
    {
      id: 'fridge' as const,
      name: 'Frigo',
      subtitle: 'Freschi & salse',
      count: locationCounts.fridge,
      svg: FridgeSvg,
      activeCardBg: 'bg-gradient-to-b from-sky-500 to-blue-600 text-white shadow-lg shadow-sky-600/25 border-sky-300 ring-2 ring-sky-400/40',
      badgeActive: 'bg-sky-950/80 text-sky-200 font-black',
      badgeInactive: 'bg-sky-100 text-sky-800 font-bold',
      badgeClass: 'text-sky-800',
    },
    {
      id: 'freezer' as const,
      name: 'Freezer',
      subtitle: 'Surgelati & carni',
      count: locationCounts.freezer,
      svg: FreezerSvg,
      activeCardBg: 'bg-gradient-to-b from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/25 border-indigo-300 ring-2 ring-indigo-400/40',
      badgeActive: 'bg-indigo-950/80 text-indigo-200 font-black',
      badgeInactive: 'bg-indigo-100 text-indigo-800 font-bold',
    },
    {
      id: 'pantry' as const,
      name: 'Dispensa',
      subtitle: 'Pasta & conserve',
      count: locationCounts.pantry,
      svg: PantrySvg,
      activeCardBg: 'bg-gradient-to-b from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-600/25 border-amber-300 ring-2 ring-amber-400/40',
      badgeActive: 'bg-amber-950/80 text-amber-200 font-black',
      badgeInactive: 'bg-amber-100 text-amber-800 font-bold',
    },
  ];

  return (
    <header className="relative w-full shadow-xs border-b border-zinc-200/90 bg-gradient-to-b from-emerald-50/70 via-[#f6f8f7] to-slate-100">
      {/* 
        HERO TOP BAR: 
        A sinistra: logo e scritta myDispensa.
        A destra: icona profilo e icona notifiche.
        Margine superiore: safe-area del notch/isola + 30px per perfetto posizionamento visivo su mobile.
      */}
      <div className="relative w-full px-5 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+30px)] pb-4.5">
        <div className="flex items-center justify-between">
          {/* A SINISTRA: Titolo myDispensa */}
          <div>
            <h1 className="font-black text-2xl tracking-tight text-zinc-900 leading-none">
              my<span className="text-emerald-600">Dispensa</span>
            </h1>
          </div>

          {/* A DESTRA: Icona Profilo & Icona Notifiche */}
          <div className="flex items-center gap-2">
            {/* 1. Icona Notifiche con badge per scadenze urgenti */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative w-10 h-10 rounded-full bg-white hover:bg-zinc-50 active:scale-95 text-zinc-700 hover:text-zinc-900 flex items-center justify-center transition-all cursor-pointer border border-zinc-200/90 shadow-2xs"
                title="Notifiche Scadenze"
              >
                <Bell size={18} strokeWidth={2.3} />
                {hasUrgentItems && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse" />
                )}
              </button>
            )}

            {/* 2. Icona Profilo Utente con Sottomenu Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-2xs overflow-hidden ${
                  isProfileMenuOpen
                    ? 'ring-1.5 ring-emerald-600/40 scale-105'
                    : 'bg-white hover:bg-zinc-50 active:scale-95 border border-zinc-200/60'
                }`}
                title="Menu Profilo"
              >
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt={displayName}
                    className="w-full h-full object-cover pointer-events-none select-none"
                  />
                ) : (
                  <UserIcon size={18} strokeWidth={2.3} className="text-zinc-700" />
                )}
              </button>

              {/* SOTTOMENU PROFILO DROPDOWN */}
              {isProfileMenuOpen && user && (
                <div className="absolute right-0 top-12 mt-1 w-64 bg-white rounded-2xl shadow-2xl border border-zinc-200/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Sezione Info Utente */}
                  <div className="px-4 py-3 border-b border-zinc-100">
                    <div className="flex items-center gap-2.5">
                      {avatarSrc ? (
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-emerald-200 shadow-2xs">
                          <img
                            src={avatarSrc}
                            alt={displayName}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-zinc-900 truncate">
                            {displayName}
                          </p>
                        </div>
                        <p className="text-[11px] text-zinc-400 font-semibold truncate flex items-center gap-1 mt-0.5">
                          <CheckCircle2 size={11} className="text-emerald-600" />
                          <span>Connesso</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Voci del Menu */}
                  <div className="p-1.5 space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        if (onOpenGroqModal) onOpenGroqModal();
                        else setIsGroqModalOpenInternal(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-teal-800 hover:bg-teal-50 active:bg-teal-100 transition-colors cursor-pointer text-left"
                    >
                      <Key size={16} className="text-teal-600" />
                      <span>Chiave Vocale Whisper</span>
                    </button>

                    {onOpenPermissions && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          onOpenPermissions();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition-colors cursor-pointer text-left"
                      >
                        <ShieldCheck size={16} className="text-emerald-600" />
                        <span>Permessi app</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onSignOut();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors cursor-pointer text-left"
                    >
                      <LogOut size={16} className="text-red-500" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 
        2. LA SEZIONE REPARTI: Tutti, Frigo, Freezer, Dispensa
      */}
      {currentTab === 'inventory' && (
        <div className="bg-white/95 backdrop-blur-sm p-3.5 sm:p-4 border-t border-zinc-200/90 shadow-2xs">
          <div className="grid grid-cols-4 gap-2 sm:gap-3">
            {sections.map((sec) => {
              const SvgIcon = sec.svg;
              const isActive = currentLocation === sec.id;

              return (
                <button
                  key={sec.id}
                  onClick={() => onLocationChange(sec.id)}
                  className={`p-2 sm:p-2.5 rounded-2xl transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer border ${isActive
                      ? `${sec.activeCardBg} scale-[1.03]`
                      : 'bg-zinc-50/90 hover:bg-zinc-100/90 border-zinc-200 text-zinc-700 hover:text-zinc-900 shadow-2xs'
                    }`}
                >
                  <SvgIcon active={isActive} />

                  <div className="text-center w-full mt-0.5">
                    <span
                      className={`block text-[11px] sm:text-xs font-black tracking-tight leading-tight truncate ${isActive ? 'text-white' : 'text-zinc-800'
                        }`}
                    >
                      {sec.name}
                    </span>
                    <span
                      className={`inline-block text-[9.5px] sm:text-[10px] px-2 py-0.2 rounded-full mt-0.5 ${isActive ? sec.badgeActive : sec.badgeInactive
                        }`}
                    >
                      {sec.count}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Inserimento / Modifica Chiave Groq Whisper */}
      <GroqKeyModal
        isOpen={isGroqModalOpenInternal}
        onClose={() => setIsGroqModalOpenInternal(false)}
      />
    </header>
  );
};
