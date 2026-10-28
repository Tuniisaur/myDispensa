import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Mic, Bell, ShieldCheck, Check, ChevronRight, X, Sparkles } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notifications';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

interface PermissionsPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PermissionsPromptModal: React.FC<PermissionsPromptModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [cameraStatus, setCameraStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [micStatus, setMicStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [notifStatus, setNotifStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  const [isRequestingAll, setIsRequestingAll] = useState(false);

  useBodyScrollLock(isOpen);

  // Controlla stato permessi esistenti all'apertura
  useEffect(() => {
    if (!isOpen) return;

    // Notifiche
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') setNotifStatus('granted');
      else if (Notification.permission === 'denied') setNotifStatus('denied');
      else setNotifStatus('prompt');
    }

    // Camera & Microfono tramite Permissions API se supportata
    if (typeof navigator !== 'undefined' && 'permissions' in navigator && navigator.permissions?.query) {
      navigator.permissions.query({ name: 'camera' as any })
        .then((res) => {
          setCameraStatus(res.state as any);
          res.onchange = () => setCameraStatus(res.state as any);
        })
        .catch(() => {});

      navigator.permissions.query({ name: 'microphone' as any })
        .then((res) => {
          setMicStatus(res.state as any);
          res.onchange = () => setMicStatus(res.state as any);
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // 1. Richiedi permesso Fotocamera (trigger del prompt nativo del browser)
  const handleRequestCamera = async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        // Su mobile / iOS specifica video con facingMode 'environment' per non fallire
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        });
        // Ferma immediatamente lo stream dopo aver acquisito il consenso
        stream.getTracks().forEach((track) => track.stop());
        setCameraStatus('granted');
      } else {
        alert('Il tuo browser o connessione non supporta la fotocamera (richiede HTTPS o localhost).');
      }
    } catch (e: any) {
      console.warn('Permesso fotocamera negato o non disponibile:', e);
      setCameraStatus('denied');
    }
  };

  // 2. Richiedi permesso Microfono (trigger del prompt nativo del browser)
  const handleRequestMic = async () => {
    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
        setMicStatus('granted');
      } else {
        alert('Il tuo browser o connessione non supporta il microfono (richiede HTTPS o localhost).');
      }
    } catch (e: any) {
      console.warn('Permesso microfono negato o non disponibile:', e);
      setMicStatus('denied');
    }
  };

  // 3. Richiedi permesso Notifiche (trigger del prompt nativo del browser)
  const handleRequestNotifications = async () => {
    try {
      const res = await requestNotificationPermission();
      setNotifStatus(res === 'granted' ? 'granted' : 'denied');
    } catch (e) {
      setNotifStatus('denied');
    }
  };

  // Richiedi tutti i permessi sequenzialmente in un solo tocco
  const handleRequestAll = async () => {
    setIsRequestingAll(true);
    if (cameraStatus !== 'granted') await handleRequestCamera();
    if (micStatus !== 'granted') await handleRequestMic();
    if (notifStatus !== 'granted') await handleRequestNotifications();
    setIsRequestingAll(false);
  };

  const allGranted = cameraStatus === 'granted' && micStatus === 'granted' && notifStatus === 'granted';

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

          {/* Dialog animato */}
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
            className="relative z-10 bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl border border-black/[0.04] overflow-hidden"
          >
            {/* Drag Handle per mobile */}
            <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto -mt-2 mb-4 sm:hidden" />

            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center border border-emerald-200 shadow-xs">
                  <ShieldCheck size={24} strokeWidth={2.4} />
                </div>
                <div>
                  <h3 className="text-base font-black text-zinc-900 tracking-tight leading-tight">
                    Permessi Dispositivo
                  </h3>
                  <p className="text-xs text-zinc-500 font-semibold mt-0.5">
                    Attiva le funzionalità per un'esperienza completa
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

            {/* Lista dei 3 permessi: Fotocamera, Microfono, Notifiche */}
            <div className="space-y-2.5 my-5">
              {/* 1. Fotocamera */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
                    <Camera size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">Fotocamera</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Scanner codici a barre & prodotti
                    </p>
                  </div>
                </div>

                {cameraStatus === 'granted' ? (
                  <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-xl">
                    <Check size={13} strokeWidth={3} /> Attivo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestCamera}
                    className="px-3 py-1.5 bg-sky-700 hover:bg-sky-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Consenti
                  </button>
                )}
              </div>

              {/* 2. Microfono */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center">
                    <Mic size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">Microfono</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Comandi vocali & note dello Chef
                    </p>
                  </div>
                </div>

                {micStatus === 'granted' ? (
                  <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-xl">
                    <Check size={13} strokeWidth={3} /> Attivo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestMic}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Consenti
                  </button>
                )}
              </div>

              {/* 3. Notifiche */}
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center">
                    <Bell size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-zinc-900">Notifiche</h4>
                    <p className="text-[11px] text-zinc-500 font-medium">
                      Avvisi scadenze alimenti a rischio
                    </p>
                  </div>
                </div>

                {notifStatus === 'granted' ? (
                  <span className="flex items-center gap-1 text-[11px] font-black text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-xl">
                    <Check size={13} strokeWidth={3} /> Attivo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotifications}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Consenti
                  </button>
                )}
              </div>
            </div>

            {/* Azioni inferiori */}
            <div className="space-y-2 pt-1">
              {!allGranted ? (
                <button
                  type="button"
                  disabled={isRequestingAll}
                  onClick={handleRequestAll}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Sparkles size={16} />
                  <span>Consenti Tutti i Permessi</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-black text-xs rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check size={16} strokeWidth={2.8} />
                  <span>Tutti i Permessi Attivati! Continua</span>
                </button>
              )}

              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 text-zinc-400 hover:text-zinc-600 text-xs font-bold transition-colors cursor-pointer"
              >
                Più tardi
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

