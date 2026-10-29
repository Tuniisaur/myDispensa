import React, { useState } from 'react';
import { Key, ShieldCheck, ExternalLink, X, Check, Trash2 } from 'lucide-react';
import { getGroqApiKey, saveGroqApiKey } from '../utils/whisperAudio';

interface GroqKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
}

export const GroqKeyModal: React.FC<GroqKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
}) => {
  const [apiKey, setApiKey] = useState(() => getGroqApiKey());
  const [isSaved, setIsSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveGroqApiKey(apiKey);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      onKeySaved?.();
      onClose();
    }, 800);
  };

  const handleClear = () => {
    saveGroqApiKey('');
    setApiKey('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-zinc-100 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-teal-100/70 text-teal-700 flex items-center justify-center">
              <Key size={20} />
            </div>
            <div>
              <h3 className="text-base font-black text-zinc-950">Trascrizione Vocale Groq</h3>
              <p className="text-[11px] font-semibold text-zinc-500">Whisper AI gratuito e ultra-rapido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Spiegazione */}
        <div className="bg-teal-50/70 border border-teal-200/60 rounded-2xl p-3.5 space-y-2 text-xs text-teal-950 leading-relaxed">
          <p className="font-bold flex items-center gap-1.5">
            <ShieldCheck size={16} className="text-teal-700 shrink-0" />
            100% Gratuito e compatibile con iPhone & PWA
          </p>
          <p className="text-zinc-600 text-[11px]">
            Groq Whisper converte la tua voce in testo in <strong>meno di 0.5 secondi</strong> senza mai bloccare il microfono su iOS.
          </p>
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-black text-teal-700 underline hover:text-teal-900 mt-1"
          >
            Crea la tua chiave gratuita su console.groq.com <ExternalLink size={12} />
          </a>
        </div>

        {/* Form di inserimento */}
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-[11px] font-black text-zinc-700 uppercase tracking-wider mb-1.5">
              Chiave API Groq (gsk_...)
            </label>
            <input
              type="password"
              placeholder="gsk_xxxxxxxxxxxxxxxxxxxxxxxx"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-zinc-50 focus:bg-white px-3.5 py-2.5 rounded-2xl border border-zinc-200 text-xs font-mono text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-teal-600 transition-colors"
            />
          </div>

          <div className="flex items-center justify-between gap-2 pt-2">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 size={13} /> Rimuovi
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Chiudi
              </button>
              <button
                type="submit"
                disabled={!apiKey.trim()}
                className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 disabled:opacity-40 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-teal-600/20"
              >
                {isSaved ? <Check size={14} strokeWidth={3} /> : null}
                <span>{isSaved ? 'Salvata!' : 'Salva Chiave'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

