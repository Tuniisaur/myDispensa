import React from 'react';

// SVG personalizzati ad alta precisione geometrica, con proporzioni coerenti, allineamento al pixel e contrasto cromatico nitido

export const AllItemsSvg: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-7 h-7 transition-all duration-200 ${active ? 'scale-110 drop-shadow-sm' : 'opacity-85'}`}
  >
    {/* Griglia armonica 2x2 di scomparti/provviste */}
    <rect x="4" y="4" width="12" height="12" rx="3.5" fill={active ? '#ffffff' : '#10b981'} fillOpacity={active ? '0.95' : '0.85'} />
    <rect x="20" y="4" width="12" height="12" rx="3.5" fill={active ? '#ffffff' : '#0d9488'} fillOpacity={active ? '0.75' : '0.7'} />
    <rect x="4" y="20" width="12" height="12" rx="3.5" fill={active ? '#ffffff' : '#059669'} fillOpacity={active ? '0.75' : '0.7'} />
    <rect x="20" y="20" width="12" height="12" rx="3.5" fill={active ? '#ffffff' : '#047857'} fillOpacity={active ? '0.95' : '0.85'} />
    {/* Punti centrali decorativi */}
    <circle cx="10" cy="10" r="1.8" fill={active ? '#047857' : '#ffffff'} />
    <circle cx="26" cy="10" r="1.8" fill={active ? '#0f766e' : '#ffffff'} />
    <circle cx="10" cy="26" r="1.8" fill={active ? '#065f46' : '#ffffff'} />
    <circle cx="26" cy="26" r="1.8" fill={active ? '#047857' : '#ffffff'} />
  </svg>
);

export const FridgeSvg: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-7 h-7 transition-all duration-200 ${active ? 'scale-110 drop-shadow-sm' : 'opacity-85'}`}
  >
    {/* Corpo Frigorifero proporzionato e centrato (X: 7, Y: 3, W: 22, H: 30) */}
    <rect
      x="7"
      y="3"
      width="22"
      height="30"
      rx="4.5"
      fill={active ? '#ffffff' : '#bae6fd'}
      stroke={active ? '#ffffff' : '#0284c7'}
      strokeWidth="1.5"
    />
    {/* Linea orizzontale separatore scomparti frigo / freezer */}
    <line
      x1="7"
      y1="15"
      x2="29"
      y2="15"
      stroke={active ? '#0284c7' : '#0284c7'}
      strokeWidth="1.5"
    />
    {/* Maniglie frigo allineate a destra con spaziatura bilanciata */}
    <rect x="24" y="7" width="2" height="5" rx="1" fill={active ? '#0284c7' : '#0369a1'} />
    <rect x="24" y="18" width="2" height="7" rx="1" fill={active ? '#0284c7' : '#0369a1'} />
    {/* Ripiani interni trasparenti vano inferiore */}
    <line x1="10" y1="21" x2="21" y2="21" stroke={active ? '#0284c7' : '#0284c7'} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
    <line x1="10" y1="26" x2="21" y2="26" stroke={active ? '#0284c7' : '#0284c7'} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.4" />
  </svg>
);

export const FreezerSvg: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-7 h-7 transition-all duration-200 ${active ? 'scale-110 drop-shadow-sm' : 'opacity-85'}`}
  >
    {/* Vano congelatore compatto e perfettamente quadrato/centrato (X: 6, Y: 5, W: 24, H: 26) */}
    <rect
      x="6"
      y="5"
      width="24"
      height="26"
      rx="5"
      fill={active ? '#ffffff' : '#c7d2fe'}
      stroke={active ? '#ffffff' : '#4f46e5'}
      strokeWidth="1.5"
    />
    {/* Cristallo di ghiaccio / Fiocco di neve geometrico ad assi simmetrici (Centro: 18, 18) */}
    <line x1="18" y1="10" x2="18" y2="26" stroke={active ? '#4f46e5' : '#4338ca'} strokeWidth="2" strokeLinecap="round" />
    <line x1="10" y1="18" x2="26" y2="18" stroke={active ? '#4f46e5' : '#4338ca'} strokeWidth="2" strokeLinecap="round" />
    <line x1="12" y1="12" x2="24" y2="24" stroke={active ? '#4f46e5' : '#4338ca'} strokeWidth="1.5" strokeLinecap="round" />
    <line x1="24" y1="12" x2="12" y2="24" stroke={active ? '#4f46e5' : '#4338ca'} strokeWidth="1.5" strokeLinecap="round" />
    <circle cx="18" cy="18" r="2" fill={active ? '#6366f1' : '#3730a3'} />
  </svg>
);

export const PantrySvg: React.FC<{ active: boolean }> = ({ active }) => (
  <svg
    viewBox="0 0 36 36"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-7 h-7 transition-all duration-200 ${active ? 'scale-110 drop-shadow-sm' : 'opacity-85'}`}
  >
    {/* Armadio dispensa con ante simmetriche (X: 7, Y: 4, W: 22, H: 28) */}
    <rect
      x="7"
      y="4"
      width="22"
      height="28"
      rx="4.5"
      fill={active ? '#ffffff' : '#fde68a'}
      stroke={active ? '#ffffff' : '#d97706'}
      strokeWidth="1.5"
    />
    {/* Linea centrale separatore ante battenti */}
    <line x1="18" y1="4" x2="18" y2="32" stroke={active ? '#d97706' : '#b45309'} strokeWidth="1.5" />
    {/* Ripiani orizzontali interni coordinati */}
    <line x1="7" y1="13" x2="29" y2="13" stroke={active ? '#d97706' : '#b45309'} strokeWidth="1" strokeOpacity="0.4" />
    <line x1="7" y1="23" x2="29" y2="23" stroke={active ? '#d97706' : '#b45309'} strokeWidth="1" strokeOpacity="0.4" />
    {/* Pomelli dorati centrati sulle ante */}
    <circle cx="15.5" cy="18" r="1.3" fill={active ? '#d97706' : '#78350f'} />
    <circle cx="20.5" cy="18" r="1.3" fill={active ? '#d97706' : '#78350f'} />
  </svg>
);
