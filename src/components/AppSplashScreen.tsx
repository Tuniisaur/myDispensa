import React from 'react';

interface AppSplashScreenProps {
  subtitle?: string;
}

export const AppSplashScreen: React.FC<AppSplashScreenProps> = ({
  subtitle = 'Caricamento in corso...',
}) => {
  return (
    <div className="fixed inset-0 z-50 min-h-screen min-h-[100dvh] bg-gradient-to-b from-emerald-50/80 via-[#f6f8f7] to-slate-100 flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="flex flex-col items-center text-center">
        {/* Immagine loader.png ingrandita in primo piano */}
        <div className="w-56 h-56 sm:w-68 sm:h-68 drop-shadow-2xl transition-transform hover:scale-105 duration-200 animate-bounce duration-1000">
          <img
            src="/loader.png"
            alt="myDispensa"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>

        {/* Titolo myDispensa che si sovrappone leggermente all'immagine */}
        <div className="-mt-10 sm:-mt-12 relative z-10 flex items-center justify-center">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 leading-none drop-shadow-xs">
            my<span className="text-emerald-600">Dispensa</span>
          </h1>
        </div>

        <p className="text-xs text-zinc-500 font-bold mt-2 relative z-10">{subtitle}</p>

        {/* Spinner di caricamento elegante */}
        <div className="mt-5 flex items-center gap-1.5 relative z-10">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
      </div>
    </div>
  );
};
