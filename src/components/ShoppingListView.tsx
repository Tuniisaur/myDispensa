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
} from 'lucide-react';
import { STORAGE_LOCATIONS, CATEGORIES } from '../constants';
import { StorageLocation, FoodCategory } from '../types';

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

  // Speech to Text States
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const [interimVoiceText, setInterimVoiceText] = useState<string>('');
  const recognitionRef = useRef<any>(null);
  const watchdogTimerRef = useRef<any>(null);
  const isStoppingRef = useRef<boolean>(false);
  const isStartingRef = useRef<boolean>(false);
  const lastStopTimeRef = useRef<number>(0);

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

    // Riconosci se l'utente ha dettato più alimenti separati da virgola o " e " / " ed "
    // Esempio: "latte, mele e birra" -> ["latte", "mele", "birra"]
    const rawItems = cleanText
      .split(/\s*,\s*|\s+\bed?\b\s+/i)
      .map((s) => s.trim())
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

  // Pulizia e stop sicuro di SpeechRecognition
  const cleanupRecognition = () => {
    lastStopTimeRef.current = Date.now();
    isStartingRef.current = false;
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        isStoppingRef.current = true;
        recognitionRef.current.abort();
      } catch (_) {}
      recognitionRef.current = null;
    }
    setIsListening(false);
    setInterimVoiceText('');
    isStoppingRef.current = false;
  };

  // Gestione robusta Speech to Text compatibile con Safari iOS e Chrome
  const toggleSpeechToText = () => {
    setSpeechError(null);

    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setSpeechError('Il riconoscimento vocale non è supportato su questo browser. Prova con Chrome o Safari.');
      return;
    }

    // Se sta già ascoltando, ferma l'ascolto immediatamente
    if (isListening || recognitionRef.current || isStartingRef.current) {
      cleanupRecognition();
      return;
    }

    // Protezione per Safari iOS: Se una sessione si è appena fermata da meno di 300ms,
    // aspetta un momento per consentire ad AVAudioSession di deallocarsi
    const timeSinceLastStop = Date.now() - lastStopTimeRef.current;
    if (timeSinceLastStop < 250) {
      setTimeout(() => {
        toggleSpeechToText();
      }, 250 - timeSinceLastStop);
      return;
    }

    // Assicura che l'istanza precedente sia completamente resettata
    cleanupRecognition();
    isStartingRef.current = true;

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let hasReceivedFinalResult = false;

      recognition.onstart = () => {
        isStartingRef.current = false;
        setIsListening(true);
        setSpeechError(null);
        setInterimVoiceText('');

        // Watchdog per evitare blocchi infiniti tipici di iOS WebKit:
        // Se entro 9 secondi non si riceve input, chiude pulitamente
        if (watchdogTimerRef.current) clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = setTimeout(() => {
          if (recognitionRef.current === recognition) {
            cleanupRecognition();
          }
        }, 9000);
      };

      recognition.onresult = (event: any) => {
        let finalTrans = '';
        let interimTrans = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          const text = res[0]?.transcript || '';
          if (res.isFinal) {
            finalTrans += text;
          } else {
            interimTrans += text;
          }
        }

        if (interimTrans) {
          setInterimVoiceText(interimTrans);
        }

        if (finalTrans.trim()) {
          hasReceivedFinalResult = true;
          setInterimVoiceText(finalTrans.trim());
          parseVoiceInput(finalTrans.trim());
          // Una volta catturato il risultato finale, fermiamo prontamente la sessione
          setTimeout(() => {
            cleanupRecognition();
          }, 250);
        }
      };

      recognition.onerror = (event: any) => {
        if (isStoppingRef.current) return;
        console.warn('Speech recognition error event:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microfono non consentito. Verifica i permessi in Impostazioni.');
        } else if (event.error === 'service-not-allowed') {
          // Su iOS PWA Standalone (app installata da schermata home), Apple blocca SpeechRecognition a livello di sistema operativo (WebKit Bug 225298)
          setSpeechError('Su app installata iOS, Apple disabilita il microfono web. Puoi dettare comodamente usando il tasto microfono della tastiera!');
        } else if (event.error === 'network') {
          setSpeechError('Errore di connessione durante il riconoscimento vocale.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          setSpeechError(`Avviso microfono (${event.error}). Puoi usare il tasto microfono della tastiera del telefono.`);
        }
        cleanupRecognition();
      };

      recognition.onend = () => {
        // Se non abbiamo ancora gestito il risultato finale ma c'era del testo provvisorio
        if (!hasReceivedFinalResult && interimVoiceText.trim()) {
          parseVoiceInput(interimVoiceText.trim());
        }
        cleanupRecognition();
      };

      recognitionRef.current = recognition;
      // Chiamata immediata e sincrona per garantire il "user gesture context" su Safari
      recognition.start();
    } catch (err: any) {
      console.error('Error starting recognition:', err);
      setSpeechError('Tocca nuovamente per riattivare il microfono');
      cleanupRecognition();
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
              className={`p-2.5 rounded-2xl transition-all cursor-pointer flex items-center justify-center shrink-0 border ${
                isListening
                  ? 'bg-rose-500 text-white border-rose-600 animate-pulse ring-4 ring-rose-200 shadow-md shadow-rose-500/30'
                  : 'bg-teal-50 text-teal-700 hover:bg-teal-100/80 border-teal-200/80'
              }`}
              title={isListening ? 'In ascolto... clicca per fermare' : 'Ditta a voce cosa aggiungere'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
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
          {isListening && (
            <div className="mt-2.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-xs font-bold animate-pulse">
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
                <span className="truncate">
                  {interimVoiceText ? (
                    <>Sto ascoltando: <em className="text-rose-900 font-extrabold underline">{interimVoiceText}</em></>
                  ) : (
                    <>In ascolto... Pronuncia ad es. <em>"Latte, 1 kg di mele e pasta"</em></>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={cleanupRecognition}
                className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-lg shrink-0 font-bold hover:bg-rose-300 transition-colors"
              >
                Fine
              </button>
            </div>
          )}

          {speechError && (
            <div className="mt-2.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-[11px] font-semibold">
              ⚠️ {speechError}
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
          <div className="bg-white rounded-3xl p-6 text-center border-2 border-dashed border-zinc-200 shadow-xs">
            <div className="relative flex justify-center -my-3 select-none pointer-events-none">
              <img
                src="/nonelist.png"
                alt="Nessun articolo nella spesa"
                className="w-48 h-48 object-contain drop-shadow-md transform scale-105"
              />
            </div>
            <p className="text-zinc-900 font-extrabold text-sm mt-1">Nessun articolo nella spesa!</p>
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
          className={`w-14 h-14 rounded-full flex items-center justify-center transition-all cursor-pointer border-2 border-white ${
            isListening
              ? 'bg-rose-500 text-white ring-4 ring-rose-200 animate-pulse shadow-[0_8px_24px_rgba(244,63,94,0.5)] scale-105'
              : 'bg-gradient-to-tr from-teal-600 to-emerald-500 hover:from-teal-500 hover:to-emerald-400 text-white shadow-[0_8px_24px_rgba(13,148,136,0.45)] active:scale-95'
          }`}
          title={isListening ? 'In ascolto vocale... tocca per fermare' : 'Tocca e detta la spesa'}
        >
          {isListening ? (
            <MicOff size={26} strokeWidth={2.4} />
          ) : (
            <Mic size={26} strokeWidth={2.4} />
          )}
        </button>
      </div>
    </div>
  );
};
