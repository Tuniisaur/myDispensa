import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  Clock,
  Flame,
  ChefHat,
  Search,
  Check,
  ShoppingBag,
  ArrowRight,
  RefreshCw,
  Lightbulb,
  X,
  AlertTriangle,
  SlidersHorizontal,
  Users,
  Wine,
  PackageCheck,
  CheckCircle2,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { useInventory } from '../context/InventoryContext';
import { generateRecipesWithAI, GeneratedRecipe } from '../utils/aiRecipes';
import { getExpiryStatus } from '../utils/date';
import { useBodyScrollLock } from '../utils/useBodyScrollLock';

export const RecipesView: React.FC = () => {
  const { items, addShoppingItem, consumeItem } = useInventory();

  // State
  const [recipes, setRecipes] = useState<GeneratedRecipe[] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<GeneratedRecipe | null>(null);
  const [servings, setServings] = useState<number>(2);
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [cookedSuccessToast, setCookedSuccessToast] = useState<string | null>(null);

  useBodyScrollLock(!!selectedRecipe);

  // Filtri e Ricerca
  const [searchFilter, setSearchFilter] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'all' | 'quick' | 'vegetarian' | 'lowcal' | 'antiwaste' | 'sweet'>('all');
  const [activeTab, setActiveTab] = useState<'all' | 'ready' | 'antiwaste'>('all');
  const [customPrompt, setCustomPrompt] = useState('');

  // Selezione ingredienti
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<string[]>([]);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // Ingredienti in scadenza
  const expiringItems = items.filter((i) => {
    const s = getExpiryStatus(i.expiry_date);
    return s === 'expired' || s === 'warning';
  });

  // Genera ricette
  const handleGenerate = async (dietaryOverride?: 'all' | 'quick' | 'vegetarian' | 'lowcal' | 'antiwaste' | 'sweet', explicitPrompt?: string) => {
    setIsGenerating(true);
    try {
      const activeDiet = dietaryOverride || dietaryFilter;
      const promptToUse = explicitPrompt !== undefined ? explicitPrompt : customPrompt;
      const res = await generateRecipesWithAI(
        items,
        promptToUse,
        activeDiet,
        selectedIngredientIds.length > 0 ? selectedIngredientIds : undefined
      );
      setRecipes(res);
    } catch (e) {
      console.error('Generazione ricette fallita:', e);
    } finally {
      setIsGenerating(false);
    }
  };

  // Caricamento iniziale
  useEffect(() => {
    if (!recipes && items.length > 0) {
      handleGenerate('all');
    }
  }, [items.length]);

  const toggleIngredient = (id: string) => {
    setSelectedIngredientIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectExpiring = () => {
    setSelectedIngredientIds(expiringItems.map((i) => i.id));
  };

  const handleClearSelection = () => {
    setSelectedIngredientIds([]);
  };

  const handleAddToShopping = (ingName: string) => {
    addShoppingItem({
      name: ingName,
      location: 'pantry',
      category: 'other',
      quantity: 1,
      unit: 'pz',
    });
    setAddedItems((prev) => ({ ...prev, [ingName]: true }));
  };

  // Funzione "Ho cucinato questo piatto" -> scala gli alimenti dall'inventario
  const handleConsumeRecipeIngredients = async (recipe: GeneratedRecipe) => {
    const matched = recipe.matchedItemIds || [];
    let count = 0;

    for (const itemId of matched) {
      const pantryItem = items.find((i) => i.id === itemId);
      if (pantryItem) {
        // Calcola quantità proporzionata se disponibile
        const ing = recipe.ingredients.find((ig) => ig.pantryItemId === itemId);
        const amountToDeduct = ing ? Math.max(1, Math.round((ing.baseQty / 2) * servings)) : 1;
        await consumeItem(itemId, amountToDeduct);
        count++;
      }
    }

    setCookedSuccessToast(
      count > 0
        ? `Fantastico! ${count} ingredienti scalati dalla tua dispensa.`
        : 'Piatto cucinato! Nessun ingrediente scalato.'
    );

    setTimeout(() => {
      setCookedSuccessToast(null);
    }, 4000);

    setSelectedRecipe(null);
  };

  // Suggerimenti veloci con prompt predefiniti
  const quickChefPrompts = [
    { label: '⚡ Salva Cena (<15 min)', prompt: 'Cena pronta in 15 minuti' },
    { label: '♻️ Svuota Frigo', prompt: 'Ricetta svuotafrigo anti spreco' },
    { label: '🍝 Comfort Food', prompt: 'Piatto confortante e gustoso' },
    { label: '🧁 Dolcetto Rapido', prompt: 'Dolce facile e veloce' },
  ];

  // Filtraggio ricette visualizzate
  const filteredRecipes = (recipes || []).filter((r) => {
    if (searchFilter.trim() !== '') {
      const q = searchFilter.toLowerCase();
      const matchTitle = r.title.toLowerCase().includes(q);
      const matchDesc = r.description.toLowerCase().includes(q);
      const matchIng = r.ingredients.some((i) => i.name.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchIng) return false;
    }

    if (activeTab === 'ready' && r.matchRate < 90) return false;
    if (activeTab === 'antiwaste' && r.category !== 'Anti-Spreco') return false;

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Toast notifica cottura completata */}
      {cookedSuccessToast && (
        <div className="fixed top-18 left-4 right-4 z-50 max-w-md mx-auto bg-emerald-800 text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200">
          <CheckCircle2 size={20} className="text-emerald-300 shrink-0" />
          <span className="text-xs font-bold flex-1">{cookedSuccessToast}</span>
          <button
            onClick={() => setCookedSuccessToast(null)}
            className="text-emerald-200 hover:text-white p-1"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 
        1. IMMAGINE CHEF.PNG IN PRIMO PIANO INGRANDITA CON SOVRAPPOSIZIONE
      */}
      <div className="flex flex-col items-center text-center pt-2">
        <div className="w-52 h-52 sm:w-60 sm:h-60 drop-shadow-2xl transition-transform hover:scale-105 duration-200">
          <img
            src="/chef.png"
            alt="Chef AI"
            className="w-full h-full object-contain pointer-events-none select-none"
          />
        </div>
        <div className="-mt-8 sm:-mt-10 relative z-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-zinc-900 leading-tight drop-shadow-xs">
            Chef <span className="text-emerald-700">Intelligente</span>
          </h2>
          <p className="text-xs text-zinc-600 font-bold mt-0.5">
            Cosa cuciniamo oggi con gli ingredienti di casa?
          </p>
        </div>
      </div>

      {/* 
        2. MENU DELL'ASSISTENTE POTENZIATO
      */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 border border-zinc-200/90 shadow-xs space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-900">
              Assistente Culinario Attivo
            </span>
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="h-8 px-3 bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 text-emerald-800 rounded-xl border border-emerald-200/90 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs shrink-0 disabled:opacity-50"
            title="Rigenera ricette"
          >
            <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
            <span>Nuove Idee</span>
          </button>
        </div>

        {/* Input Ricerca / Prompt Chef con pulsante Genera */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input
              type="text"
              placeholder="Chiedi allo Chef (es. pasta veloce, risotto, secondo leggero...)"
              value={customPrompt || searchFilter}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                setSearchFilter(e.target.value);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
              className="w-full pl-9.5 pr-8 py-2.5 bg-zinc-50 focus:bg-white text-zinc-900 placeholder:text-zinc-400 text-xs font-semibold rounded-xl border border-zinc-200 focus:outline-none focus:border-emerald-600 transition-colors shadow-2xs"
            />
            {(customPrompt || searchFilter) && (
              <button
                onClick={() => {
                  setCustomPrompt('');
                  setSearchFilter('');
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={() => handleGenerate()}
            disabled={isGenerating}
            className="h-[38px] px-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0 disabled:opacity-50"
          >
            <Wand2 size={14} />
            <span>Crea</span>
          </button>
        </div>

        {/* Quick Action Chips dello Chef */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {quickChefPrompts.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCustomPrompt(chip.prompt);
                handleGenerate(undefined, chip.prompt);
              }}
              className="px-2.5 py-1 bg-emerald-50/70 hover:bg-emerald-100/80 active:scale-95 text-emerald-900 border border-emerald-200/80 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer shadow-2xs flex items-center gap-1"
            >
              <Zap size={11} className="text-amber-500 fill-amber-500" />
              <span>{chip.label}</span>
            </button>
          ))}
        </div>

        {/* Barra Opzioni e Filtri Rapidi */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 flex-wrap">
          {/* Pillole alimentari */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'all', label: 'Tutte' },
              { id: 'quick', label: '⚡ Veloci' },
              { id: 'antiwaste', label: '♻️ Anti-Spreco' },
              { id: 'vegetarian', label: '🌱 Vegetariano' },
              { id: 'lowcal', label: '🥗 Leggere' },
              { id: 'sweet', label: '🧁 Dolci' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => {
                  setDietaryFilter(f.id as any);
                  handleGenerate(f.id as any);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                  dietaryFilter === f.id
                    ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-extrabold'
                    : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Tasto Selettore Ingredienti */}
          <button
            type="button"
            onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
            className={`h-8 px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer border flex items-center gap-1.5 ${
              isFilterPanelOpen || selectedIngredientIds.length > 0
                ? 'bg-amber-50 text-amber-900 border-amber-300 font-extrabold shadow-2xs'
                : 'bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-zinc-200'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Scegli alimenti</span>
            {selectedIngredientIds.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-emerald-700 text-white text-[10px] flex items-center justify-center font-black">
                {selectedIngredientIds.length}
              </span>
            )}
          </button>
        </div>

        {/* Pannello Selettore Alimenti a Scomparsa */}
        {isFilterPanelOpen && (
          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/90 space-y-2.5 animate-in fade-in duration-150">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-600">
              <span>Ingredienti specifici da includere:</span>
              <div className="flex items-center gap-2">
                {expiringItems.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectExpiring}
                    className="text-amber-800 hover:underline text-[11px] font-bold cursor-pointer"
                  >
                    In scadenza ({expiringItems.length})
                  </button>
                )}
                {selectedIngredientIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-zinc-500 hover:text-zinc-800 text-[11px] underline cursor-pointer"
                  >
                    Azzera
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar pt-0.5">
              {items.map((item) => {
                const isSelected = selectedIngredientIds.includes(item.id);
                const isExp =
                  getExpiryStatus(item.expiry_date) === 'warning' ||
                  getExpiryStatus(item.expiry_date) === 'expired';

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleIngredient(item.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-700 text-white border-emerald-700 shadow-2xs font-bold'
                        : 'bg-white hover:bg-zinc-100 text-zinc-700 border-zinc-200'
                    }`}
                  >
                    <span>{item.name}</span>
                    {isExp && (
                      <AlertTriangle
                        size={12}
                        className={isSelected ? 'text-amber-200' : 'text-amber-600'}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 
        3. TABS DI NAVIGAZIONE RICETTE:
        Tutte, Pronte subito (100% a casa), Anti-Spreco
      */}
      <div className="flex items-center bg-zinc-100 p-1 rounded-2xl border border-zinc-200/80 gap-1 text-xs font-bold">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center ${
            activeTab === 'all'
              ? 'bg-white text-zinc-900 shadow-xs font-extrabold'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Tutte ({filteredRecipes.length})
        </button>

        <button
          onClick={() => setActiveTab('ready')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'ready'
              ? 'bg-white text-emerald-800 shadow-xs font-extrabold'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>✓ Pronte subito</span>
        </button>

        <button
          onClick={() => setActiveTab('antiwaste')}
          className={`flex-1 py-2 rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
            activeTab === 'antiwaste'
              ? 'bg-white text-amber-800 shadow-xs font-extrabold'
              : 'text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <span>♻️ Anti-Spreco</span>
        </button>
      </div>

      {/* 
        4. LISTA DELLE RICETTE GENERATE
      */}
      {isGenerating ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-zinc-200/80 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles size={24} className="animate-spin text-amber-500" />
          </div>
          <div>
            <p className="text-zinc-900 font-extrabold text-sm">Chef AI sta combinando gli alimenti...</p>
            <p className="text-zinc-500 text-xs mt-1">
              Ricerca degli abbinamenti ottimali per consumare ciò che hai a casa.
            </p>
          </div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 text-center border border-dashed border-zinc-200 shadow-xs space-y-3">
          <ChefHat size={32} className="text-zinc-400 mx-auto" />
          <p className="text-zinc-900 font-bold text-sm">Nessuna ricetta corrispondente</p>
          <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
            Prova a modificare i filtri o premi su "Crea" per inventare nuove combinazioni.
          </p>
          <button
            onClick={() => handleGenerate()}
            className="px-4 py-2 bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            Genera nuove ricette
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRecipes.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => {
                setSelectedRecipe(recipe);
                setServings(2);
              }}
              className="bg-white rounded-2xl p-4 border border-zinc-200/90 hover:border-emerald-500/50 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Badges, categoria e tempi */}
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100/70 text-emerald-900 border border-emerald-200/90 uppercase tracking-wider">
                      {recipe.category}
                    </span>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        recipe.matchRate >= 90
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {recipe.matchRate >= 95 ? '✓ 100% In Casa' : `${recipe.matchRate}% In Casa`}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                      <Clock size={12} /> {recipe.prepTime}
                    </span>
                    {recipe.caloriesApprox && (
                      <span className="text-[11px] font-semibold text-zinc-500 flex items-center gap-1">
                        <Flame size={12} className="text-amber-500" /> ~{recipe.caloriesApprox} kcal
                      </span>
                    )}
                  </div>

                  <h3 className="font-extrabold text-zinc-900 text-sm tracking-tight group-hover:text-emerald-800 transition-colors">
                    {recipe.title}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                    {recipe.description}
                  </p>
                </div>

                <div className="p-2 rounded-xl bg-zinc-50 group-hover:bg-emerald-50 text-zinc-400 group-hover:text-emerald-700 transition-colors self-center shrink-0">
                  <ArrowRight size={16} />
                </div>
              </div>

              {/* Ingredienti da consumare subito */}
              {recipe.usedFromPantry && recipe.usedFromPantry.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1 text-[11px] text-emerald-800 font-semibold truncate">
                  <span className="text-zinc-400 font-normal">Usa da casa:</span>
                  <span className="text-emerald-700 font-bold truncate">
                    {recipe.usedFromPantry.join(', ')}
                  </span>
                </div>
              )}

              {/* Tag degli ingredienti */}
              <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-zinc-100">
                {recipe.ingredients.map((ing, idx) => (
                  <span
                    key={idx}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-1 ${
                      ing.inStock
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                        : 'bg-zinc-100 text-zinc-500'
                    }`}
                  >
                    {ing.inStock ? '✓' : '+'} {ing.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 
        5. MODAL DETTAGLIO RICETTA CON PORZIONI DINAMICHE E TASTO "HO CUCINATO"
      */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div
            className="bg-white w-full max-w-lg rounded-t-[32px] sm:rounded-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6 sm:fade-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="px-6 pt-5 pb-3.5 border-b border-zinc-100 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black text-emerald-900 uppercase tracking-wider bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-md">
                    {selectedRecipe.category}
                  </span>
                  <span className="text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                    {selectedRecipe.difficulty} · {selectedRecipe.prepTime}
                  </span>
                  {selectedRecipe.caloriesApprox && (
                    <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                      <Flame size={12} className="text-amber-500" /> ~{Math.round((selectedRecipe.caloriesApprox / 2) * servings)} kcal
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-zinc-900 mt-1.5 leading-snug">
                  {selectedRecipe.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 transition-colors cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* Contenuto scrollabile */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
              {/* Selettore Porzioni Dinamico */}
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-black text-zinc-700">
                  <Users size={16} className="text-emerald-700" />
                  <span>Porzioni:</span>
                </div>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-zinc-200 shadow-2xs">
                  {[1, 2, 4, 6].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setServings(num)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all cursor-pointer ${
                        servings === num
                          ? 'bg-emerald-700 text-white shadow-xs'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {num} {num === 1 ? 'persona' : 'persone'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggerimento dello Chef */}
              {selectedRecipe.aiTip && (
                <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950">
                  <Lightbulb size={18} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Consiglio dello Chef:</strong>
                    <span className="text-amber-900 font-medium leading-relaxed">{selectedRecipe.aiTip}</span>
                  </div>
                </div>
              )}

              {/* Ingredienti con dosi ricalcolate e sostituzioni pratiche */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider">
                    Ingredienti (x{servings})
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-800">
                    {selectedRecipe.ingredients.filter((i) => i.inStock).length}/{selectedRecipe.ingredients.length} disponibili
                  </span>
                </div>

                <div className="space-y-2">
                  {selectedRecipe.ingredients.map((ing, i) => {
                    const scaledQty = ing.baseQty
                      ? Math.round((ing.baseQty / 2) * servings)
                      : ing.needed;

                    return (
                      <div
                        key={i}
                        className="p-2.5 bg-zinc-50 border border-zinc-100 rounded-xl text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                ing.inStock
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-zinc-200 text-zinc-500'
                              }`}
                            >
                              {ing.inStock ? '✓' : '!'}
                            </span>
                            <span className="font-bold text-zinc-800">{ing.name}</span>
                            <span className="text-emerald-900 font-extrabold text-[11px] bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {scaledQty} {ing.unit !== 'q.b.' ? ing.unit : ''}
                            </span>
                          </div>

                          {!ing.inStock && (
                            <button
                              onClick={() => handleAddToShopping(ing.name)}
                              disabled={addedItems[ing.name]}
                              className="px-2.5 py-1 bg-white border border-zinc-200 hover:border-emerald-600 text-[11px] font-bold text-emerald-800 rounded-lg flex items-center gap-1 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {addedItems[ing.name] ? (
                                <>
                                  <Check size={12} /> Aggiunto
                                </>
                              ) : (
                                <>
                                  <ShoppingBag size={12} /> + Spesa
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Consiglio di sostituzione se manca o come variante */}
                        {ing.substitute && (
                          <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 pl-6">
                            <HelpCircle size={11} className="text-amber-500 shrink-0" />
                            <span>Alternativa: <strong className="text-zinc-700">{ing.substitute}</strong></span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Istruzioni Passo Passo */}
              <div>
                <h4 className="text-xs font-black text-zinc-400 uppercase tracking-wider mb-2.5">
                  Preparazione Passo Passo
                </h4>
                <ol className="space-y-3">
                  {selectedRecipe.instructions.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-xs leading-relaxed text-zinc-700 font-medium bg-zinc-50/60 p-2.5 rounded-xl border border-zinc-100">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-900 font-black text-[10px] flex items-center justify-center shrink-0 mt-0.5 border border-emerald-300">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Abbinamento e Conservazione */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {selectedRecipe.winePairing && (
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-2xl flex items-start gap-2 text-xs">
                    <Wine size={16} className="text-purple-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-purple-950 font-bold">Abbinamento:</strong>
                      <span className="text-purple-900 text-[11px] leading-tight">{selectedRecipe.winePairing}</span>
                    </div>
                  </div>
                )}

                {selectedRecipe.storageTip && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-start gap-2 text-xs">
                    <PackageCheck size={16} className="text-blue-700 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-blue-950 font-bold">Come conservare gli avanzi:</strong>
                      <span className="text-blue-900 text-[11px] leading-tight">{selectedRecipe.storageTip}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal con Tasto "Ho cucinato questo piatto" */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleConsumeRecipeIngredients(selectedRecipe)}
                className="flex-1 py-3 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={16} />
                <span>Ho cucinato questo piatto (Scala ingredienti)</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecipe(null)}
                className="px-4 py-3 bg-zinc-200 hover:bg-zinc-300 text-zinc-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
