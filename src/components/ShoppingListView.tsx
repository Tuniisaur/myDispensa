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
  const recognitionRef = useRef<any>(null);

  // Analisi automatica del testo vocale (es. "3 litri di latte", "1 chilo di mele in frigo", "pasta")
  const parseVoiceInput = (text: string) => {
    let cleanText = text.trim();
    if (!cleanText) return;

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

    // Deduci categoria in base alle parole chiave
    const nameLow = parsedName.toLowerCase();
    if (/latte|burro|formaggio|mozzarella|parmigiano|yogurt|ricotta|panna/i.test(nameLow)) {
      parsedCategory = 'dairy';
      if (!lower.includes('freezer') && !lower.includes('dispensa')) parsedLocation = 'fridge';
    } else if (/mela|mele|banana|pomodor|insalata|carot|aranc|limon|verdura|frutta|zucchine/i.test(nameLow)) {
      parsedCategory = 'produce';
    } else if (/pollo|carne|manzo|maiale|pesce|salmone|tonno|prosciutto|salame/i.test(nameLow)) {
      parsedCategory = 'meat';
      if (!lower.includes('freezer')) parsedLocation = 'fridge';
    } else if (/pasta|riso|farina|cereali/i.test(nameLow)) {
      parsedCategory = 'grains';
      if (!lower.includes('frigo') && !lower.includes('freezer')) parsedLocation = 'pantry';
    } else if (/pane|biscotti|fette biscottate|brioche|croissant/i.test(nameLow)) {
      parsedCategory = 'bakery';
      if (!lower.includes('frigo') && !lower.includes('freezer')) parsedLocation = 'pantry';
    } else if (/olio|aceto|sale|zucchero|pepe|spezie/i.test(nameLow)) {
      parsedCategory = 'condiments';
      if (!lower.includes('frigo') && !lower.includes('freezer')) parsedLocation = 'pantry';
    } else if (/tonno in scatola|pelati|legumi|fagioli|piselli/i.test(nameLow)) {
      parsedCategory = 'canned';
      if (!lower.includes('frigo') && !lower.includes('freezer')) parsedLocation = 'pantry';
    } else if (/surgelat|gelato|pizza surgelata|piselli surgelati/i.test(nameLow)) {
      parsedCategory = 'frozen';
      parsedLocation = 'freezer';
    } else if (/acqua|birra|vino|succo|caffè|the|tè|cola/i.test(nameLow)) {
      parsedCategory = 'beverages';
    }

    addShoppingItem({
      name: parsedName || 'Alimento vocale',
      location: parsedLocation,
      category: parsedCategory,
      quantity: parsedQuantity,
      unit: parsedUnit,
    });

    setVoiceNotice(`Aggiunto: "${parsedName}" (${parsedQuantity} ${parsedUnit})`);
    setTimeout(() => setVoiceNotice(null), 3500);
  };

  // Inizializza Web Speech API SpeechRecognition
  const toggleSpeechToText = () => {
    setSpeechError(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Il riconoscimento vocale non è supportato su questo browser. Prova con Chrome o Safari.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'it-IT';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          parseVoiceInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Permesso microfono negato. Consenti l’accesso al microfono.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Errore microfono: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Error starting recognition:', err);
      setSpeechError('Impossibile attivare il microfono');
      setIsListening(false);
    }
  };

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addShoppingItem({
      name: name.trim(),
      location,
      category,
      quantity,
      unit,
    });

    setName('');
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
              onChange={(e) => setName(e.target.value)}
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
            <div className="mt-2.5 px-3 py-2 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-bold animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping shrink-0" />
              <span>In ascolto... Pronuncia ad es. <em>"1 litro di latte in frigo"</em> o <em>"Pane"</em></span>
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
                  onChange={(e) => setLocation(e.target.value as StorageLocation)}
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
