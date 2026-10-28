import { FoodItem } from '../types';
import { differenceInDays, parseISO, startOfDay } from 'date-fns';

export interface ExpiryNotificationGroup {
  expired: FoodItem[];
  urgent: FoodItem[]; // scade oggi, domani o entro 3 giorni
  expiringToday: FoodItem[];
}

export function checkExpiringItems(items: FoodItem[]): ExpiryNotificationGroup {
  const today = startOfDay(new Date());
  const expired: FoodItem[] = [];
  const urgent: FoodItem[] = [];
  const expiringToday: FoodItem[] = [];

  items.forEach((item) => {
    if (!item.expiry_date) return;
    const expDate = startOfDay(parseISO(item.expiry_date));
    const diff = differenceInDays(expDate, today);

    if (diff < 0) {
      expired.push(item);
    } else if (diff === 0) {
      expiringToday.push(item);
      urgent.push(item);
    } else if (diff <= 3) {
      urgent.push(item);
    }
  });

  return { expired, urgent, expiringToday };
}

/**
 * Richiede il permesso per le notifiche native del browser / dispositivo
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    localStorage.setItem('mydispensa_notifications_enabled', permission === 'granted' ? 'true' : 'false');
    return permission;
  } catch (error) {
    console.warn('Errore durante la richiesta permessi notifiche:', error);
    return 'denied';
  }
}

/**
 * Invia una notifica nativa se il permesso è attivo
 */
export function sendExpiryPushNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  try {
    // Se c'è un service worker attivo, usa showNotification per migliore supporto mobile PWA
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.svg',
          badge: '/pwa-192x192.svg',
          tag: 'mydispensa-expiry-check',
        });
      });
    } else {
      new Notification(title, {
        body,
        icon: '/pwa-192x192.svg',
      });
    }
  } catch (e) {
    console.warn('Invio notifica nativa fallito:', e);
  }
}

/**
 * Esegue il controllo automatico una volta al giorno salvando la data in localStorage
 */
export function runDailyExpiryCheck(items: FoodItem[]) {
  const isEnabled = localStorage.getItem('mydispensa_notifications_enabled') === 'true';
  if (!isEnabled) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const lastCheck = localStorage.getItem('mydispensa_last_notification_date');

  // Esegui la notifica al massimo una volta per data solare
  if (lastCheck === todayStr) return;

  const { expired, expiringToday, urgent } = checkExpiringItems(items);

  if (expiringToday.length > 0) {
    const sampleNames = expiringToday.slice(0, 2).map((i) => i.name).join(', ');
    const more = expiringToday.length > 2 ? ` e altri ${expiringToday.length - 2}` : '';
    sendExpiryPushNotification(
      '⚠️ Cibo in scadenza OGGI!',
      `Attenzione: ${sampleNames}${more} ${expiringToday.length === 1 ? 'scade' : 'scadono'} oggi.`
    );
    localStorage.setItem('mydispensa_last_notification_date', todayStr);
  } else if (urgent.length > 0) {
    const sampleNames = urgent.slice(0, 2).map((i) => i.name).join(', ');
    sendExpiryPushNotification(
      '⏳ Scadenze nei prossimi giorni',
      `${sampleNames} e altri alimenti scadranno presto. Controlla la tua dispensa!`
    );
    localStorage.setItem('mydispensa_last_notification_date', todayStr);
  } else if (expired.length > 0) {
    sendExpiryPushNotification(
      '🗑️ Prodotti scaduti trovati',
      `Hai ${expired.length} ${expired.length === 1 ? 'prodotto già scaduto' : 'prodotti già scaduti'}. Verificali nella schermata Scadenze.`
    );
    localStorage.setItem('mydispensa_last_notification_date', todayStr);
  }
}
