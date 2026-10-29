import React, { useState, useEffect, useRef } from 'react';
import { useInventory } from '../context/InventoryContext';
import {
  Check,
  Trash2,
  ArrowUpRight,
  Plus,
  Mic,
  MicOff,
  Sparkles,
  Loader2,
  Key,
} from 'lucide-react';
import { STORAGE_LOCATIONS, CATEGORIES } from '../constants';
import { StorageLocation, FoodCategory } from '../types';
import { transcribeAudioWithGroq } from '../utils/whisperAudio';
import { GroqKeyModal } from './GroqKeyModal';

export const ShoppingListView: React.FC = () => {
  const {
    shoppingItems,
    addShoppingItem,
    toggleShoppingItem,
    deleteShoppingItem,
    moveShoppingToInventory,
  } = useInventory();

  const [name, setName] = useState('');
  const [location, setLocation] = useState<StorageLocation>('fridge');
  const [category, setCategory] = useState<FoodCategory>('produce');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('pz');
  const [isOptionsOpen, setIsOptionsOpen] = useState(false);
  const userManuallyChangedLocationRef = useRef(false);

  // Rilevamento intelligente del reparto e categoria dal nome dell'alimento
  const detectCategoryAndLocationFromName = (text: string): { category: FoodCategory; location: StorageLocation } => {
    const nameLow = text.toLowerCase().trim();
    if (!nameLow) return { category: 'other', location: 'pantry' };

    // 1. Surgelati -> Freezer
    if (/surgelat|gelato|gelati|pizza surgelata|bastoncini|ghiacciol|cubetti di ghiaccio/i.test(nameLow)) {
      return { category: 'frozen', location: 'freezer' };
    }

    // 2. Latticini & Freschi da banco -> Frigo
    if (/latte|burro|formaggio|formaggi|mozzarella|parmigiano|grana|pecorino|yogurt|ricotta|panna|mascarpone|stracchino|gorgonzola|scamorza/i.test(nameLow)) {
      return { category: 'dairy', location: 'fridge' };
    }

    // 3. Carne & Salumi -> Frigo (o freezer se esplicitato)
    if (/pollo|carne|manzo|maiale|vitello|macinato|salsiccia|wurstel|prosciutto|salame|mortadella|bresaola|pancetta|bacon|fesa/i.test(nameLow)) {
      return { category: 'meat', location: 'fridge' };
    }

    // 4. Pesce fresco -> Frigo
    if (/pesce|salmone|orata|spigola|merluzzo|gamber|calamar|cozze|vongole|alici/i.test(nameLow)) {
      return { category: 'fish', location: 'fridge' };
    }

    // 5. Frutta & Verdura -> Frigo (o produce)
    if (/mela|mele|banana|banane|arancia|arance|limon|pera|pere|fragol|uva|pesca|pesche|pomodor|insalata|lattuga|carot|zucchina|zucchine|melanzan|peperon|spinac|broccoli|cavol|cipoll|patat|aglio/i.test(nameLow)) {
      // Patate e cipolle tradizionalmente in dispensa, il resto verdura fresca in frigo
      if (/patat|cipoll|aglio/i.test(nameLow)) {
        return { category: 'produce', location: 'pantry' };
      }
      return { category: 'produce', location: 'fridge' };
    }

    // 6. Pasta, Riso, Cereali -> Dispensa
    if (/pasta|spaghetti|penne|fusilli|rigatoni|riso|farina|cereali|avena|couscous|polenta|orzo/i.test(nameLow)) {
      return { category: 'grains', location: 'pantry' };
    }

    // 7. Pane, Prodotti da Forno, Colazione -> Dispensa
    if (/pane|pan bauletto|biscotti|fette biscottate|crackers|grissini|brioche|croissant|merendine|frollini|taralli|piadina/i.test(nameLow)) {
      return { category: 'bakery', location: 'pantry' };
    }

    // 8. Conserve & Scatolame -> Dispensa
    if (/tonno|passata|pelati|polpa|sughi|sugo|legumi|fagioli|ceci|piselli|mais|lenticchie|olive|sottoli|sottaceti/i.test(nameLow)) {
      return { category: 'canned', location: 'pantry' };
    }

    // 9. Condimenti, Olio, Spezie -> Dispensa
    if (/olio|aceto|sale|zucchero|pepe|spezie|origano|rosmarino|maionese|ketchup|senape|nutella|marmellata|miele/i.test(nameLow)) {
      return { category: 'condiments', location: 'pantry' };
    }

    // 10. Bevande -> Dispensa (o frigo se birra/succo, default dispensa per scorta)
    if (/acqua|birra|vino|succo|succhi|caffè|caffe|the|tè|cola|aranciata|bibita/i.test(nameLow)) {
      return { category: 'beverages', location: 'pantry' };
    }

    // 11. Snack & Dolci -> Dispensa
    if (/patatine|snack|cioccolato|cioccolata|caramelle|arachidi|noci|mandorle/i.test(nameLow)) {
      return { category: 'snacks', location: 'pantry' };
    }

    return { category: 'other', location: 'pantry' };
  };

  // Quando l'utente digita il nome, aggiorna automaticamente reparto e categoria
  const handleNameChange = (val: string) => {
    setName(val);
    if (!userManuallyChangedLocationRef.current && val.trim().length >= 3) {
      const detected = detectCategoryAndLocationFromName(val);
      setLocation(detected.location);
      setCategory(detected.category);
    }
  };

  const getLocationLabel = (loc: StorageLocation) => {
    switch (loc) {
      case 'fridge':
        return 'Frigo';
      case 'freezer':
        return 'Freezer';
      case 'pantry':
        return 'Dispensa';
      default:
        return loc;
    }
  };

  // Voice Recognition States (MediaRecorder + Groq Whisper)
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [isGroqModalOpen, setIsGroqModalOpen] = useState(false);

  // Audio recording refs (MediaRecorder per iOS/Safari/PWA)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);

  // Analisi automatica di un singolo alimento vocale
  const parseSingleVoiceItem = (text: string) => {
    let cleanText = text.trim();
    if (!cleanText) return null;

    let parsedQuantity = 1;
    let parsedUnit = 'pz';
    let parsedLocation: StorageLocation = location;
    let parsedCategory: FoodCategory = 'other';

    // Rileva location
    const lower = cleanText.toLowerCase();
    if (lower.includes('in freezer') || lower.includes('nel freezer') || lower.includes('congelatore')) {
      parsedLocation = 'freezer';
      cleanText = cleanText.replace(/in freezer|nel freezer|congelatore/gi, '').trim();
    } else if (lower.includes('in dispensa') || lower.includes('nella dispensa')) {
      parsedLocation = 'pantry';
      cleanText = cleanText.replace(/in dispensa|nella dispensa/gi, '').trim();
    } else if (lower.includes('in frigo') || lower.includes('nel frigo') || lower.includes('frigorifero')) {
      parsedLocation = 'fridge';
      cleanText = cleanText.replace(/in frigo|nel frigo|frigorifero/gi, '').trim();
    }

    // Rileva quantità e unità all'inizio (es: "2 kg di mele", "3 bottiglie di latte", "500 grammi di farina")
    const matchQtyUnit = cleanText.match(
      /^(\d+([.,]\d+)?)\s*(kg|chili|chilo|g|grammi|l|litri|litro|pz|pacchi|pacco|bottiglie|bottiglia|scatole|scatola|fette)?\s*(di|d')?\s*(.*)$/i
    );

    let parsedName = cleanText;
    if (matchQtyUnit) {
      if (matchQtyUnit[1]) {
        parsedQuantity = parseFloat(matchQtyUnit[1].replace(',', '.'));
      }
      if (matchQtyUnit[3]) {
        const u = matchQtyUnit[3].toLowerCase();
        if (u.startsWith('chil') || u === 'kg') parsedUnit = 'kg';
        else if (u.startsWith('gram') || u === 'g') parsedUnit = 'g';
        else if (u.startsWith('litr') || u === 'l') parsedUnit = 'L';
        else if (u.startsWith('bottigl')) parsedUnit = 'bott';
        else if (u.startsWith('pacc') || u.startsWith('scatol')) parsedUnit = 'conf';
        else parsedUnit = 'pz';
      }
      if (matchQtyUnit[5]) {
        parsedName = matchQtyUnit[5].trim();
      }
    }

    // Capitalizza nome alimento
    if (parsedName.length > 0) {
      parsedName = parsedName.charAt(0).toUpperCase() + parsedName.slice(1);
    }

    if (!parsedName) return null;

    // Deduci categoria e reparto in base alle parole chiave
    const detected = detectCategoryAndLocationFromName(parsedName);
    parsedCategory = detected.category;
    if (!lower.includes('freezer') && !lower.includes('dispensa') && !lower.includes('frigo')) {
      parsedLocation = detected.location;
    }

    return {
      name: parsedName,
      location: parsedLocation,
      category: parsedCategory,
      quantity: parsedQuantity,
      unit: parsedUnit,
    };
  };

  // Analisi intelligente del parlato: supporta lista multipla (es. "latte, 2 kg di mele e pasta")
  const parseVoiceInput = (text: string) => {
    let cleanText = text.trim();
    if (!cleanText) return;

    // Rimuove eventuali punti o punteggiatura finale da ogni singola parola/alimento
    cleanText = cleanText.replace(/[.,;:!?]+(\s|$)/g, '$1').replace(/[.]+$/g, '').trim();

    // Riconosci se l'utente ha dettato più alimenti separati da virgola o " e " / " ed "
    // Esempio: "latte, mele e birra" -> ["latte", "mele", "birra"]
    const rawItems = cleanText
      .split(/\s*,\s*|\s+\bed?\b\s+/i)
      .map((s) => s.replace(/[.,;:!?]+$/g, '').trim())
      .filter((s) => s.length > 0);

    const addedList: string[] = [];

    rawItems.forEach((itemText) => {
      const parsed = parseSingleVoiceItem(itemText);
      if (parsed) {
        addShoppingItem({
          name: parsed.name,
          location: parsed.location,
          category: parsed.category,
          quantity: parsed.quantity,
          unit: parsed.unit,
        });
        addedList.push(`${parsed.name} (${parsed.quantity} ${parsed.unit})`);
      }
    });

    if (addedList.length > 0) {
      if (addedList.length === 1) {
        setVoiceNotice(`Aggiunto: ${addedList[0]}`);
      } else {
        setVoiceNotice(`Aggiunti ${addedList.length} alimenti: ${addedList.join(', ')}`);
      }
      setTimeout(() => setVoiceNotice(null), 4000);
    }
  };

  // Chiusura completa e rilascio dello stream audio
  const stopAudioTracks = () => {
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      audioStreamRef.current = null;
    }
  };

  // Pulizia e stop sicuro di SpeechRecognition legacy
  const cleanupRecognition = () => {
    stopAudioTracks();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (_) {}
    }
    mediaRecorderRef.current = null;

    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.stop();
      } catch (_) {}
      try {
        rec.abort();
      } catch (_) {}
    }
    setIsListening(false);
  };

  // 1. REGISTRAZIONE CON MEDIARECORDER + GROQ WHISPER (Soluzione 2 - 100% stabile su iOS e PWA)
  const startRecordingMediaRecorder = async (stream: MediaStream) => {
    try {
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      // Determina il MIME type supportato da iOS Safari
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        }
      }

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        stopAudioTracks();
        setIsListening(false);

        const recordedBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        audioChunksRef.current = [];

        if (recordedBlob.size < 500) {
          // Audio troppo breve o vuoto
          return;
        }

        // Procedi alla trascrizione con Groq Whisper
        setIsTranscribing(true);
        setSpeechError(null);
        try {
          const text = await transcribeAudioWithGroq(recordedBlob);
          if (text && text.trim()) {
            parseVoiceInput(text.trim());
          } else {
            setSpeechError('Nessuna voce rilevata nell\'audio.');
          }
        } catch (err: any) {
          console.error('Groq transcription error:', err);
          if (err.message === 'API_KEY_MISSING') {
            setIsGroqModalOpen(true);
            setSpeechError('Configura la chiave API gratuita Groq per attivare il vocale.');
          } else {
            setSpeechError(err.message || 'Errore durante la trascrizione vocale.');
          }
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start(250);
      setIsListening(true);
      setSpeechError(null);

      // Auto-stop di sicurezza dopo 15 secondi per preservare la batteria
      recordingTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 15000);
    } catch (err: any) {
      console.error('Error starting MediaRecorder:', err);
      stopAudioTracks();
      setIsListening(false);
      setSpeechError('Impossibile avviare il registratore vocale.');
    }
  };

  // Toggle Principale: Se l'utente preme durante la registrazione, ferma e trascrive
  const toggleSpeechToText = async () => {
    setSpeechError(null);

    // Se stiamo già ascoltando/registrando, interrompiamo per procedere alla trascrizione
    if (isListening) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
        return;
      }
      cleanupRecognition();
      return;
    }

    // Se stiamo già elaborando la trascrizione precedente, attendi
    if (isTranscribing) return;

    try {
      // 1. Richiedi stream microfono con getUserMedia (garantito su iOS Safari e PWA)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // 2. Avvia la registrazione audio pura MediaRecorder
      await startRecordingMediaRecorder(stream);
    } catch (err: any) {
      console.warn('getUserMedia error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setSpeechError('Microfono non consentito: abilitalo nelle impostazioni del browser/iPhone.');
      } else {
        setSpeechError('Microfono non disponibile su questo dispositivo.');
      }
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecognition();
    };
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Se l'utente non ha impostato manualmente una destinazione, rileva al submit
    let finalLocation = location;
    let finalCategory = category;
    if (!userManuallyChangedLocationRef.current) {
      const detected = detectCategoryAndLocationFromName(name.trim());
      finalLocation = detected.location;
      finalCategory = detected.category;
    }

    addShoppingItem({
      name: name.trim(),
      location: finalLocation,
      category: finalCategory,
      quantity,
      unit,
    });

    setName('');
    userManuallyChangedLocationRef.current = false;
    setIsOptionsOpen(false);
  };

  const pendingItems = shoppingItems.filter((i) => !i.completed);
  const completedItems = shoppingItems.filter((i) => i.completed);

  return (
    <div className="space-y-5 relative">
      {/* Intestazione */}
      <div className="pt-1">
        <div>
          <h2 className="text-xl font-black tracking-tight text-zinc-950">Lista della Spesa</h2>
          <p className="text-xs font-semibold text-teal-800 mt-0.5">
            {pendingItems.length} da acquistare · {completedItems.length} nel carrello
          </p>
        </div>

        {/* Input box di rapido inserimento */}
        <div className="mt-4 bg-white rounded-3xl p-3 border border-teal-200/80 shadow-xs">
          <form onSubmit={handleAdd} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Cosa ti serve? (o usa il microfono)"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="flex-1 bg-zinc-50 focus:bg-white px-3.5 py-2.5 rounded-2xl border border-zinc-200 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-teal-600 transition-colors"
            />

            {/* Pulsante Microfono compatto nell'input */}
            <button
              type="button"
              onClick={toggleSpeechToText}
              disabled={isTranscribing}
              className={`p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 border ${
                isTranscribing
                  ? 'bg-amber-500 text-white border-amber-600 animate-spin'
                  : isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-200 shadow-md shadow-rose-500/30'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100/80 border-teal-200/80'
              }`}
              title={
                isTranscribing
                  ? 'Trascrizione in corso con Groq Whisper...'
                  : isListening
                  ? 'Registrazione in corso... clicca per fermare e trascrivere'
                  : 'Registra a voce con Whisper AI'
              }
            >
              {isTranscribing ? (
                <Loader2 size={16} className="animate-spin" />
              ) : isListening ? (
                <MicOff size={16} />
              ) : (
                <Mic size={16} />
              )}
            </button>

            {/* Pulsante Aggiungi manuale */}
            <button
              type="submit"
              disabled={!name.trim()}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 hover:opacity-95 disabled:opacity-40 text-white px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm shadow-teal-600/30"
            >
              <Plus size={16} strokeWidth={2.8} />
              <span className="hidden sm:inline">Aggiungi</span>
            </button>
          </form>

          {/* Feedback Vocale attivo o Notifiche */}
          {isTranscribing && (
            <div className="mt-2.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-2 text-amber-800 text-xs font-bold animate-pulse">
              <Loader2 size={15} className="animate-spin text-amber-600" />
              <span>Trascrizione ultra-rapida Groq Whisper in corso...</span>
            </div>
          )}

          {isListening && (
            <div className="mt-2.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-xs font-bold animate-pulse">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="truncate">
                  Sto registrando... tocca <strong>"Fine"</strong> o di nuovo il microfono appena hai finito di parlare.
                </span>
              </div>
              <button
                type="button"
                onClick={toggleSpeechToText}
                className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-lg shrink-0 font-bold hover:bg-rose-300 transition-colors"
              >
                Fine
              </button>
            </div>
          )}

          {speechError && (
            <div className="mt-2.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-2 text-amber-800 text-xs font-semibold">
              <div className="flex items-center gap-1.5 truncate">
                <span>⚠️ {speechError}</span>
              </div>
              {speechError.includes('chiave') || speechError.includes('Groq') ? (
                <button
                  type="button"
                  onClick={() => setIsGroqModalOpen(true)}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Key size={11} /> Imposta Chiave
                </button>
              ) : null}
            </div>
          )}

          {voiceNotice && (
            <div className="mt-2.5 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold shadow-xs">
              <Sparkles size={14} className="text-emerald-600" />
              <span>{voiceNotice}</span>
            </div>
          )}

          {/* Dettagli veloci */}
          <div className="flex items-center justify-between px-2 pt-2.5 mt-1.5 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setIsOptionsOpen(!isOptionsOpen)}
              className="text-[11px] font-bold text-teal-800 hover:text-teal-900 transition-colors cursor-pointer"
            >
              {isOptionsOpen ? 'Nascondi dettagli' : '+ Scegli reparto e quantità'}
            </button>
            <span className="text-[11px] text-zinc-500 font-medium">
              Destinato a: <strong className="text-teal-900 font-bold">{getLocationLabel(location)}</strong>
            </span>
          </div>

          {/* Dettagli avanzati a comparsa */}
          {isOptionsOpen && (
            <div className="mt-3 p-3 bg-teal-50/50 rounded-2xl grid grid-cols-2 gap-2 text-xs border border-teal-200/60">
              <div>
                <label className="text-teal-900 text-[10px] font-black uppercase tracking-wider block mb-1">
                  Riponi in
                </label>
                <select
                  value={location}
                  onChange={(e) => {
                    userManuallyChangedLocationRef.current = true;
                    setLocation(e.target.value as StorageLocation);
                  }}
                  className="w-full bg-white rounded-xl p-2 text-xs border border-teal-200 font-semibold text-zinc-800"
                >
                  {STORAGE_LOCATIONS.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-teal-900 text-[10px] font-black uppercase tracking-wider block mb-1">
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as FoodCategory)}
                  className="w-full bg-white rounded-xl p-2 text-xs border border-teal-200 font-semibold text-zinc-800"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.emoji} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-teal-900 text-[10px] font-black uppercase tracking-wider block mb-1">
                  Quantità
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-white rounded-xl p-2 text-xs border border-teal-200 font-bold text-zinc-800"
                />
              </div>
              <div>
                <label className="text-teal-900 text-[10px] font-black uppercase tracking-wider block mb-1">
                  Unità
                </label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="w-full bg-white rounded-xl p-2 text-xs border border-teal-200 font-semibold text-zinc-800"
                  placeholder="pz, kg, L..."
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista Da Comprare */}
      <div>
        <div className="flex items-center justify-between mb-2.5 px-1">
          <h3 className="text-xs font-black text-zinc-500 uppercase tracking-wider">
            Da acquistare ({pendingItems.length})
          </h3>
        </div>

        {pendingItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center border-2 border-dashed border-zinc-200 shadow-xs overflow-hidden">
            <div className="relative flex justify-center items-center select-none pointer-events-none">
              <img
                src="/nonelist.png"
                alt="Nessun articolo nella spesa"
                className="w-44 sm:w-48 h-auto max-w-full aspect-[600/335] object-contain drop-shadow-md"
              />
            </div>
            <p className="text-zinc-900 font-extrabold text-sm mt-2">Nessun articolo nella spesa!</p>
            <p className="text-zinc-500 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
              Tocca il microfono o usa il campo sopra per aggiungere velocemente cosa comprare.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.map((item) => {
              const cat = CATEGORIES.find((c) => c.id === item.category);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-3 border border-zinc-200/90 shadow-2xs flex items-center justify-between gap-3 hover:border-teal-400 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => toggleShoppingItem(item.id)}
                      className="w-6 h-6 rounded-lg border-2 border-zinc-300 hover:border-teal-600 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                    >
                      {item.completed && <Check size={14} className="text-teal-700 font-black" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-zinc-900 font-bold text-sm truncate">{item.name}</p>
                      <span className="text-zinc-500 text-[11px] font-medium flex items-center gap-1">
                        {cat?.emoji} {cat?.name} · Destinato a {getLocationLabel(item.location)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-lg">
                      {item.quantity} {item.unit}
                    </span>
                    <button
                      onClick={() => deleteShoppingItem(item.id)}
                      className="p-1.5 text-zinc-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista Presi / Nel carrello */}
      {completedItems.length > 0 && (
        <div className="pt-2">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2 px-1">
            Nel carrello ({completedItems.length})
          </h3>
          <div className="space-y-2">
            {completedItems.map((item) => (
              <div
                key={item.id}
                className="bg-zinc-50/90 rounded-2xl p-3 border border-zinc-200/60 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleShoppingItem(item.id)}
                    className="w-6 h-6 rounded-lg bg-teal-600 border border-teal-600 flex items-center justify-center shrink-0 text-white cursor-pointer shadow-xs"
                  >
                    <Check size={14} strokeWidth={2.8} />
                  </button>
                  <p className="text-zinc-400 line-through text-sm font-medium truncate">{item.name}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => moveShoppingToInventory(item.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer shadow-xs"
                    title="Metti direttamente in dispensa"
                  >
                    Riponi <ArrowUpRight size={13} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => deleteShoppingItem(item.id)}
                    className="p-1.5 text-zinc-300 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 
        BUTTON FLUTTUANTE (FAB) SPEECH TO TEXT:
        Posizionato in basso a destra fluttuante e ben staccato sopra la bottom bar
      */}
      <div className="fixed bottom-[calc(90px+max(env(safe-area-inset-bottom,0px),12px))] right-5 sm:right-auto sm:left-[calc(50%+130px)] z-30">
        <button
          type="button"
          onClick={toggleSpeechToText}
          disabled={isTranscribing}
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 border-white ${
            isTranscribing
              ? 'bg-amber-500 text-white animate-spin shadow-[0_8px_24px_rgba(245,158,11,0.5)]'
              : isListening
              ? 'bg-rose-500 text-white ring-4 ring-rose-200 animate-pulse shadow-[0_8px_24px_rgba(244,63,94,0.5)] scale-105'
              : 'bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white shadow-[0_8px_24px_rgba(13,148,136,0.45)] active:scale-95'
          }`}
          title={
            isTranscribing
              ? 'Trascrizione in corso...'
              : isListening
              ? 'Registrazione vocale in corso... tocca per fermare'
              : 'Tocca e detta la spesa con Whisper AI'
          }
        >
          {isTranscribing ? (
            <Loader2 size={26} className="animate-spin" />
          ) : isListening ? (
            <MicOff size={26} strokeWidth={2.4} />
          ) : (
            <Mic size={26} strokeWidth={2.4} />
          )}
        </button>
      </div>

      {/* Modal Gestione Chiave Groq Whisper */}
      <GroqKeyModal
        isOpen={isGroqModalOpen}
        onClose={() => setIsGroqModalOpen(false)}
      />
    </div>
  );
};
