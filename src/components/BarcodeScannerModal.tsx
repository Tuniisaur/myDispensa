import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  X,
  Loader2,
  Barcode,
  Flashlight,
  Sparkles,
  Keyboard,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';
import { fetchProductByBarcode, ScannedProductResult } from '../utils/openFoodFacts';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductFound: (product: ScannedProductResult) => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onProductFound,
}) => {
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [manualBarcode, setManualBarcode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedFeedback, setScannedFeedback] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'barcode-reader-viewport-fullscreen';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setErrorMessage(null);
        setIsLoadingProduct(false);
        setScannedFeedback(null);

        const html5QrCode = new Html5Qrcode(scannerContainerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
          ],
          verbose: false,
        });

        scannerRef.current = html5QrCode;

        // Inquadratura rettangolare ergonomica e centrata per codici a barre
        const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.floor(Math.min(viewfinderWidth * 0.85, 360));
          const height = Math.floor(Math.min(width * 0.58, viewfinderHeight * 0.4));
          return { width, height };
        };

        const config = {
          fps: 25,
          qrbox: qrboxFunction,
          aspectRatio: window.innerHeight / window.innerWidth,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          async (decodedText) => {
            if (!isMounted) return;
            handleBarcodeSuccess(decodedText);
          },
          () => {}
        );

        // Configurazione fotocamera
        try {
          // @ts-ignore
          html5QrCode.getRunningTrackCapabilities?.();
        } catch (_) {}
      } catch (err: any) {
        console.warn('Errore fotocamera scanner:', err);
        if (isMounted) {
          setErrorMessage(
            'Impossibile accedere alla fotocamera. Controlla i permessi fotocamera del browser o inserisci il codice a mano.'
          );
        }
      }
    };

    const timeout = setTimeout(() => {
      startScanner();
    }, 180);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (e) {}
      scannerRef.current = null;
    }
    setTorchOn(false);
  };

  const toggleTorch = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        const nextState = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          // @ts-ignore
          advanced: [{ torch: nextState } as any],
        });
        setTorchOn(nextState);
      } catch (e) {
        console.log('Torcia non supportata su questo dispositivo', e);
      }
    }
  };

  const handleBarcodeSuccess = async (barcodeText: string) => {
    setScannedFeedback(barcodeText);

    // Feedback tattile vibrante istantaneo (haptic feedback)
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([40, 60, 40]);
      } catch (_) {}
    }

    await stopScanner();
    setIsLoadingProduct(true);
    setErrorMessage(null);

    const product = await fetchProductByBarcode(barcodeText);
    setIsLoadingProduct(false);

    if (product) {
      onProductFound(product);
      onClose();
    } else {
      // Prodotto non censito su OpenFoodFacts: apriamo comunque la scheda con codice pre-impostato
      onProductFound({
        barcode: barcodeText,
        name: `Prodotto (${barcodeText})`,
        category: 'other',
        location: 'fridge',
        quantity: 1,
        unit: 'pz',
      });
      onClose();
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleBarcodeSuccess(manualBarcode.trim());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
      {/* 1. Feed Fotocamera Video a Schermo Intero */}
      <div className="absolute inset-0 w-full h-full">
        <div
          id={scannerContainerId}
          className="w-full h-full object-cover [&_video]:object-cover [&_video]:w-full [&_video]:h-full"
        />
      </div>

      {/* 2. Top Header Barra Navigazione con Vetro Sfumato & Safe Area generosa per notch/isola */}
      <header className="relative z-20 px-5 sm:px-8 pt-[calc(env(safe-area-inset-top,0px)+34px)] pb-4 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 backdrop-blur-md flex items-center justify-center text-emerald-400 border border-emerald-400/30 shadow-lg">
            <Barcode size={22} strokeWidth={2.3} />
          </div>
          <div>
            <h2 className="text-white font-black text-sm tracking-tight drop-shadow-md">
              Scanner Barcode
            </h2>
            <p className="text-zinc-300 text-[11px] font-semibold drop-shadow-sm mt-0.5">
              Riconoscimento automatico confezioni
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pulsante Torcia */}
          <button
            type="button"
            onClick={toggleTorch}
            className={`w-10 h-10 rounded-2xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer border active:scale-95 ${
              torchOn
                ? 'bg-amber-400 text-zinc-950 font-black border-amber-300 shadow-lg shadow-amber-400/40'
                : 'bg-white/15 text-white hover:bg-white/25 border-white/20'
            }`}
            title="Torcia Flash"
          >
            <Flashlight size={19} className={torchOn ? 'fill-zinc-950' : ''} />
          </button>

          {/* Pulsante Chiudi */}
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md hover:bg-white/25 active:scale-95 flex items-center justify-center text-white transition-all cursor-pointer border border-white/20 shadow-md"
            title="Chiudi scanner"
          >
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      {/* 3. Reticolo & Mirino Centrale di Scansione Futuristico */}
      {!isLoadingProduct && !errorMessage && (
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center pointer-events-none px-6">
          <div className="relative w-full max-w-xs h-44 rounded-3xl border-2 border-emerald-400/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)] overflow-hidden transition-all">
            {/* Angoli Hi-Tech ad alta visibilità */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl" />

            {/* Laser di Scansione Fluido con Glow Verde Neon */}
            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_18px_#34d399] animate-bounce top-1/2 -translate-y-1/2" />

            {/* Pattern centrale trasparente a righe di orientamento */}
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <ScanLine size={48} className="text-emerald-300 animate-pulse" />
            </div>
          </div>

          {/* Istruzione galleggiante sotto al mirino */}
          <div className="mt-6 flex flex-col items-center gap-1.5">
            <div className="bg-black/75 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 shadow-xl flex items-center gap-2">
              <Sparkles size={14} className="text-emerald-400 animate-spin" />
              <span className="text-white text-xs font-bold tracking-wide">
                Posiziona il codice a barre nel riquadro
              </span>
            </div>
            <span className="text-zinc-400 text-[11px] font-semibold drop-shadow-sm">
              La fotocamera mette a fuoco automaticamente
            </span>
          </div>
        </div>
      )}

      {/* 4. Overlay di Caricamento Prodotto da Open Food Facts */}
      {isLoadingProduct && (
        <div className="absolute inset-0 z-30 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-in fade-in duration-150">
          <div className="relative mb-5">
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/40 shadow-2xl">
              <Loader2 size={40} className="animate-spin text-emerald-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 size={16} />
            </div>
          </div>

          <h3 className="font-black text-xl text-white tracking-tight">
            Codice Rilevato!
          </h3>
          {scannedFeedback && (
            <p className="font-mono text-emerald-300 font-bold text-xs bg-emerald-950/70 px-3 py-1 rounded-lg border border-emerald-500/30 mt-2">
              {scannedFeedback}
            </p>
          )}
          <p className="text-xs text-zinc-300 mt-2 max-w-xs leading-relaxed font-medium">
            Interrogo OpenFoodFacts per recuperare marca, nome, ingredienti e valori nutrizionali...
          </p>
        </div>
      )}

      {/* 5. Messaggio di Errore o Permesso Mancante */}
      {errorMessage && (
        <div className="relative z-20 flex-1 flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mb-4">
            <Camera size={32} />
          </div>
          <h4 className="font-black text-lg text-white mb-1.5">Fotocamera non rilevata</h4>
          <p className="text-xs text-zinc-300 max-w-xs leading-relaxed font-medium mb-5">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={() => setShowManualInput(true)}
            className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-2xl text-xs font-black shadow-lg cursor-pointer flex items-center gap-2"
          >
            <Keyboard size={16} />
            <span>Inserisci Codice a Mano</span>
          </button>
        </div>
      )}

      {/* 6. Footer con Inserimento Manuale & Scorciatoie EAN Popolari */}
      <footer className="relative z-20 px-5 sm:px-8 pb-[calc(env(safe-area-inset-bottom,0px)+16px)] pt-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
        {showManualInput ? (
          <div className="bg-white rounded-3xl p-5 shadow-2xl border border-zinc-200 animate-in slide-in-from-bottom-8 duration-200">
            <div className="flex items-center justify-between mb-3 px-0.5">
              <div className="flex items-center gap-2">
                <Keyboard size={16} className="text-emerald-700" />
                <span className="text-xs font-black text-zinc-900">
                  Inserimento Manuale Codice
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowManualInput(false)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-700 cursor-pointer p-1"
              >
                Chiudi ✕
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                autoFocus
                placeholder="es. 8076809513753"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="flex-1 bg-zinc-50 focus:bg-white px-4 py-3 text-xs font-bold text-zinc-900 placeholder:text-zinc-400 rounded-xl border border-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors"
              />
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="bg-emerald-700 hover:bg-emerald-800 disabled:opacity-40 text-white px-5 py-3 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
              >
                Cerca
              </button>
            </form>

            {/* Test Rapidi EAN di prodotti comuni */}
            <div className="mt-3.5 pt-3 border-t border-zinc-100">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Esempi Rapidi di Test:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '🌿 Pesto Barilla', code: '8076809513753' },
                  { label: '🍫 Nutella Ferrero', code: '8000500310427' },
                  { label: '🥛 Latte Granarolo', code: '8002660001016' },
                  { label: '🍅 Polpa Mutti', code: '8005110000078' },
                ].map((sample) => (
                  <button
                    key={sample.code}
                    type="button"
                    onClick={() => handleBarcodeSuccess(sample.code)}
                    className="text-[11px] font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 active:scale-95 border border-emerald-200/80 px-2.5 py-1 rounded-xl cursor-pointer transition-all"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => setShowManualInput(true)}
              className="bg-white/20 hover:bg-white/30 active:scale-95 backdrop-blur-md text-white font-extrabold text-xs px-5 py-3 rounded-2xl border border-white/25 transition-all cursor-pointer flex items-center gap-2 shadow-xl"
            >
              <Keyboard size={16} />
              <span>Digita codice a mano</span>
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
