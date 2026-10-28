import { differenceInDays, parseISO, startOfDay } from 'date-fns';
import { ExpiryStatus } from '../types';

export function getExpiryStatus(expiryDate: string | null): ExpiryStatus {
  if (!expiryDate) return 'none';
  
  const today = startOfDay(new Date());
  const expDate = startOfDay(parseISO(expiryDate));
  const diffDays = differenceInDays(expDate, today);

  if (diffDays < 0) return 'expired';
  if (diffDays <= 3) return 'warning';
  return 'good';
}

export function formatExpiryLabel(expiryDate: string | null): { 
  label: string; 
  badgeClass: string; 
  isUrgent: boolean;
  daysDiff: number | null;
} {
  if (!expiryDate) {
    return {
      label: 'Nessuna scadenza',
      badgeClass: 'bg-zinc-100/70 text-zinc-500 border border-zinc-200/50',
      isUrgent: false,
      daysDiff: null,
    };
  }

  const today = startOfDay(new Date());
  const expDate = startOfDay(parseISO(expiryDate));
  const diffDays = differenceInDays(expDate, today);

  if (diffDays < 0) {
    const daysAgo = Math.abs(diffDays);
    return {
      label: `Scaduto (${daysAgo}d)`,
      badgeClass: 'bg-rose-50 text-rose-700 border border-rose-200/60 font-semibold',
      isUrgent: true,
      daysDiff: diffDays,
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Scade oggi',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold ring-1 ring-amber-400/20',
      isUrgent: true,
      daysDiff: 0,
    };
  }

  if (diffDays === 1) {
    return {
      label: 'Scade domani',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200/70 font-medium',
      isUrgent: true,
      daysDiff: 1,
    };
  }

  if (diffDays <= 3) {
    return {
      label: `Tra ${diffDays} giorni`,
      badgeClass: 'bg-amber-50/60 text-amber-700 border border-amber-200/50',
      isUrgent: true,
      daysDiff: diffDays,
    };
  }

  return {
    label: `${expDate.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })}`,
    badgeClass: 'bg-zinc-50 text-zinc-600 border border-zinc-200/60',
    isUrgent: false,
    daysDiff: diffDays,
  };
}
