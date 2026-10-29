import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useInventory } from './context/InventoryContext';
import { FoodItem, FoodCategory, StorageLocation } from './types';
import { CATEGORIES } from './constants';
import { getExpiryStatus } from './utils/date';
import { ScannedProductResult } from './utils/openFoodFacts';

// Icons
import {
  Search,
  Plus,
  AlertCircle,
  Barcode,
} from 'lucide-react';

// Components
import { HeroHeader } from './components/HeroHeader';
import { BottomNav } from './components/BottomNav';
import { FoodItemCard } from './components/FoodItemCard';
import { ItemModal } from './components/ItemModal';
import { ExpirationsView } from './components/ExpirationsView';
import { RecipesView } from './components/RecipesView';
import { ShoppingListView } from './components/ShoppingListView';
import { UndoToast } from './components/UndoToast';
import { BarcodeScannerModal } from './components/BarcodeScannerModal';
import { SwipeToDelete } from './components/spectrumui/swipe-to-delete';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { LoginScreen } from './components/LoginScreen';
import { AppSplashScreen } from './components/AppSplashScreen';
import { PermissionsPromptModal } from './components/PermissionsPromptModal';
import { runDailyExpiryCheck } from './utils/notifications';

export const App: React.FC = () => {
  const { user, username, loading, signOut } = useAuth();
  const {
    items,
    shoppingItems,
    loading: inventoryLoading,
    addItem,
    updateItem,
    deleteItem,
    consumeItem,
    addShoppingItem,
    deletedToastItem,
    undoDelete,
    dismissUndoToast,
  } = useInventory();

  // Loader iniziale garantito (visibile sempre all'avvio per almeno 1.2 secondi)
  const [initialSplashDone, setInitialSplashDone] = useState(false);

  useEffect(() => {
    const minSplashTimer = setTimeout(() => {
      setInitialSplashDone(true);
    }, 1200);

    return () => clearTimeout(minSplashTimer);
  }, []);

  // Navigation & Filter States
  const [currentTab, setCurrentTab] = useState<string>('inventory');
  const [currentLocation, setCurrentLocation] = useState<StorageLocation | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'expiry' | 'name' | 'quantity'>('expiry');

  // Modal States
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isBarcodeScannerOpen, setIsBarcodeScannerOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);

  // Al primo accesso mostra automaticamente il popup dei permessi
  useEffect(() => {
    if (user && initialSplashDone) {
      const hasAskedPermissions = localStorage.getItem('mydispensa_permissions_prompted');
      if (!hasAskedPermissions) {
        const timer = setTimeout(() => {
          setIsPermissionsModalOpen(true);
          localStorage.setItem('mydispensa_permissions_prompted', 'true');
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [user, initialSplashDone]);

  // Esegui controllo automatico giornaliero scadenze
  useEffect(() => {
    if (items.length > 0) {
      runDailyExpiryCheck(items);
    }
  }, [items]);

  // Calcolo conteggi
  const locationCounts = useMemo(() => {
    return {
      all: items.length,
      fridge: items.filter((i: FoodItem) => i.location === 'fridge').length,
      freezer: items.filter((i: FoodItem) => i.location === 'freezer').length,
      pantry: items.filter((i: FoodItem) => i.location === 'pantry').length,
    };
  }, [items]);

  const counts = useMemo(() => {
    return {
      inventory: items.length,
      expirations: items.filter((i: FoodItem) => {
        const st = getExpiryStatus(i.expiry_date);
        return st === 'expired' || st === 'warning';
      }).length,
      shopping: shoppingItems.filter((i) => !i.completed).length,
    };
  }, [items, shoppingItems]);

  const expiringSoonItems = useMemo(() => {
    return items.filter((i: FoodItem) => {
      const st = getExpiryStatus(i.expiry_date);
      return st === 'expired' || st === 'warning';
    });
  }, [items]);

  // Filtro Alimenti
  const filteredItems = useMemo(() => {
    return items
      .filter((item: FoodItem) => {
        if (currentLocation !== 'all' && item.location !== currentLocation) {
          return false;
        }

        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchName = item.name.toLowerCase().includes(q);
          const matchNotes = item.notes?.toLowerCase().includes(q);
          if (!matchName && !matchNotes) return false;
        }

        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        return true;
      })
      .sort((a: FoodItem, b: FoodItem) => {
        if (sortBy === 'expiry') {
          if (!a.expiry_date) return 1;
          if (!b.expiry_date) return -1;
          return a.expiry_date.localeCompare(b.expiry_date);
        }
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === 'quantity') {
          return b.quantity - a.quantity;
        }
        return 0;
      });
  }, [items, currentLocation, searchQuery, selectedCategory, sortBy]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsItemModalOpen(true);
  };

  const handleEditItem = (item: FoodItem) => {
    setEditingItem(item);
    setIsItemModalOpen(true);
  };

  const handleProductScanned = (product: ScannedProductResult) => {
    const tempItem: FoodItem = {
      id: '',
      user_id: '',
      name: product.name,
      location: product.location,
      category: product.category,
      quantity: product.quantity,
      unit: product.unit,
      expiry_date: null,
      opened: false,
      notes: product.brand ? `Marca: ${product.brand} (EAN: ${product.barcode})` : `Codice: ${product.barcode}`,
      created_at: '',
      updated_at: '',
    };
    setEditingItem(tempItem);
    setIsItemModalOpen(true);
  };

  const handleSaveItem = async (
    data: Omit<FoodItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ) => {
    if (editingItem && editingItem.id) {
      await updateItem(editingItem.id, data);
    } else {
      await addItem(data);
    }
  };

  const handleAddMore = async (id: string) => {
    const item = items.find((i: FoodItem) => i.id === id);
    if (item) {
      await updateItem(id, { quantity: item.quantity + 1 });
    }
  };

  const handleAddToShopping = async (item: FoodItem) => {
    await addShoppingItem({
      name: item.name,
      location: item.location,
      category: item.category,
      quantity: 1,
      unit: item.unit,
    });
  };

  // Splash Screen iniziale garantito all'avvio dell'applicazione
  if (!initialSplashDone || loading || inventoryLoading) {
    return (
      <AppSplashScreen
        subtitle={!user ? 'Accesso in corso...' : 'Caricamento dispensa...'}
      />
    );
  }

  // Accesso obbligatorio: se non loggato, mostra schermata di Login
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#f6f8f7] flex justify-center selection:bg-emerald-600 selection:text-white">
      {/* Contenitore mobile centrale a tutta altezza su smartphone standalone */}
      <div className="w-full max-w-md bg-white min-h-screen min-h-[100dvh] flex flex-col pb-[calc(76px+max(env(safe-area-inset-bottom,0px),12px))] shadow-xl relative sm:border-x sm:border-zinc-200/80">
        
        {/* Grande Hero Header (1/4 Schermo) con Scena SVG Cucina & Hub Reparti */}
        <HeroHeader
          user={user}
          username={username}
          onSignOut={signOut}
          onOpenNotifications={() => setIsNotificationModalOpen(true)}
          onOpenPermissions={() => setIsPermissionsModalOpen(true)}
          hasUrgentItems={expiringSoonItems.length > 0}
          currentTab={currentTab}
          currentLocation={currentLocation}
          onLocationChange={setCurrentLocation}
          locationCounts={locationCounts}
        />

        {/* Banner Scadenze con padding e margini equilibrati */}
        {currentTab === 'inventory' && expiringSoonItems.length > 0 && (
          <div className="px-4 pt-3 pb-1">
            <div
              onClick={() => setCurrentTab('expirations')}
              className="p-3.5 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-rose-500/10 border border-amber-300/80 rounded-2xl flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:border-amber-400 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs shadow-amber-500/30">
                  <AlertCircle size={18} />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-amber-950 block truncate">
                    {expiringSoonItems.length} alimenti da consumare subito!
                  </span>
                  <span className="text-[11px] text-amber-800 font-medium block">
                    Scadono a breve o sono già scaduti.
                  </span>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-900 bg-white/90 border border-amber-200 px-2.5 py-1 rounded-xl shadow-2xs shrink-0">
                Controlla →
              </span>
            </div>
          </div>
        )}

        {/* Contenuto Principale con Cambio Scheda Istantaneo e Fluido */}
        <main className="flex-1 px-4 pt-3 space-y-4">
          {/* TAB 1: INVENTARIO */}
          {currentTab === 'inventory' && (
            <div className="space-y-4">
              {/* Barra Ricerca Integrata con Scanner Codice a Barre & Switch Ordinamento */}
              <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {/* Barra di ricerca */}
                    <div className="relative flex-1">
                      <Search
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400"
                        size={16}
                      />
                      <input
                        type="text"
                        placeholder="Cerca per nome, note o marca..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9.5 pr-8 py-2.5 bg-zinc-50 hover:bg-zinc-50/80 focus:bg-white rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-emerald-600 shadow-2xs transition-colors"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400 hover:text-zinc-700 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Pulsante dedicato per scansionare codice a barre */}
                    <button
                      type="button"
                      onClick={() => setIsBarcodeScannerOpen(true)}
                      className="h-[38px] px-3 bg-emerald-50 hover:bg-emerald-100/90 active:scale-95 text-emerald-800 rounded-xl border border-emerald-200/90 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 font-bold text-xs"
                      title="Scansiona Codice a Barre"
                    >
                      <Barcode size={17} strokeWidth={2.4} />
                      <span className="hidden sm:inline">Scansiona</span>
                    </button>

                    {/* Switch Ordinamento */}
                    <div className="flex items-center bg-zinc-100 p-1 rounded-xl border border-zinc-200 shrink-0 gap-1 h-[38px]">
                      <button
                        onClick={() => setSortBy('expiry')}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          sortBy === 'expiry' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-zinc-500'
                        }`}
                      >
                        Scadenza
                      </button>
                      <button
                        onClick={() => setSortBy('name')}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          sortBy === 'name' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-zinc-500'
                        }`}
                      >
                        A-Z
                      </button>
                    </div>
                  </div>

                  {/* Filtro per categoria orizzontale a scorrimento con respiro */}
                  <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer shrink-0 border ${
                        selectedCategory === 'all'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-zinc-50 hover:bg-zinc-100/90 text-zinc-700 border-zinc-200'
                      }`}
                    >
                      Tutte
                    </button>
                    {CATEGORIES.map((cat: { id: FoodCategory; name: string; emoji: string }) => {
                      const isSelected = selectedCategory === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 border ${
                            isSelected
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : 'bg-zinc-50 hover:bg-zinc-100/90 text-zinc-700 border-zinc-200'
                          }`}
                        >
                          <span>{cat.emoji}</span>
                          <span>{cat.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lista Alimenti con SwipeToDelete di Spectrum UI con padding separati */}
                {filteredItems.length === 0 ? (
                  <div className="relative bg-white rounded-3xl p-6 pt-3 text-center border-2 border-dashed border-zinc-200 mt-2 shadow-xs overflow-hidden">
                    <div className="relative flex justify-center items-center pointer-events-none select-none z-0">
                      <img
                        src="/none.png"
                        alt="Nessun cibo trovato"
                        className="w-48 sm:w-56 h-auto max-w-full aspect-[600/335] object-contain drop-shadow-md"
                      />
                    </div>
                    <div className="relative z-10 mt-1">
                      <h3 className="font-extrabold text-zinc-900 text-sm">Nessun cibo trovato</h3>
                      <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto leading-relaxed">
                        {searchQuery
                          ? 'Nessun alimento corrisponde alla ricerca impostata.'
                          : `Il reparto selezionato è vuoto.`}
                      </p>
                      <div className="mt-5 flex items-center justify-center gap-2.5">
                        <button
                          onClick={() => setIsBarcodeScannerOpen(true)}
                          className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-2xl border border-emerald-200 transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <Barcode size={16} /> Scansiona
                        </button>
                        <button
                          onClick={handleOpenAddModal}
                          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-2xl hover:opacity-95 transition-opacity inline-flex items-center gap-2 cursor-pointer shadow-sm shadow-emerald-500/30"
                        >
                          <Plus size={16} /> Aggiungi a mano
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {filteredItems.map((item: FoodItem) => (
                      <SwipeToDelete
                        key={item.id}
                        label={item.name}
                        onDelete={() => deleteItem(item.id)}
                        actionWidth={90}
                      >
                        <FoodItemCard
                          item={item}
                          onEdit={handleEditItem}
                          onDelete={deleteItem}
                          onConsume={consumeItem}
                          onAddMore={handleAddMore}
                          onAddToShopping={handleAddToShopping}
                        />
                      </SwipeToDelete>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: SCADENZE */}
            {currentTab === 'expirations' && (
              <ExpirationsView
                onEditItem={handleEditItem}
                onDeleteItem={deleteItem}
                onConsumeItem={consumeItem}
                onAddMoreItem={handleAddMore}
                onAddToShopping={handleAddToShopping}
              />
            )}

            {/* TAB 3: RICETTE */}
            {currentTab === 'recipes' && <RecipesView />}

            {/* TAB 4: LISTA SPESA */}
            {currentTab === 'shopping' && <ShoppingListView />}
        </main>

        {/* Pulsante Fluttuante Singolo FAB (+ Aggiungi Alimento) ben staccato e visibile sopra la barra */}
        {currentTab === 'inventory' && (
          <div className="fixed bottom-[calc(90px+max(env(safe-area-inset-bottom,0px),12px))] right-5 sm:right-auto sm:left-[calc(50%+130px)] z-30">
            <button
              onClick={handleOpenAddModal}
              className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 active:scale-95 text-white rounded-full flex items-center justify-center shadow-[0_8px_24px_rgba(16,185,129,0.45)] transition-all cursor-pointer border-2 border-white"
              title="Aggiungi Alimento"
            >
              <Plus size={28} strokeWidth={2.8} />
            </button>
          </div>
        )}

        {/* Barra di Navigazione Inferiore */}
        <BottomNav
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          counts={counts}
        />

        {/* Toast Notifica con Annulla Eliminazione */}
        <UndoToast
          item={deletedToastItem}
          onUndo={undoDelete}
          onDismiss={dismissUndoToast}
        />

        {/* Modal Modifica/Aggiunta */}
        <ItemModal
          isOpen={isItemModalOpen}
          onClose={() => setIsItemModalOpen(false)}
          onSave={handleSaveItem}
          onOpenScanner={() => {
            setIsItemModalOpen(false);
            setIsBarcodeScannerOpen(true);
          }}
          initialItem={editingItem}
          defaultLocation={currentLocation !== 'all' ? currentLocation : 'fridge'}
        />

        {/* Modal Scanner Codice a Barre Fullscreen */}
        <BarcodeScannerModal
          isOpen={isBarcodeScannerOpen}
          onClose={() => setIsBarcodeScannerOpen(false)}
          onProductFound={handleProductScanned}
        />

        {/* Modal Gestione Notifiche Scadenze */}
        <NotificationSettingsModal
          isOpen={isNotificationModalOpen}
          onClose={() => setIsNotificationModalOpen(false)}
          items={items}
          onOpenExpirationsTab={() => setCurrentTab('expirations')}
        />

        {/* Modal Permessi Dispositivo (Fotocamera, Microfono, Notifiche) */}
        <PermissionsPromptModal
          isOpen={isPermissionsModalOpen}
          onClose={() => setIsPermissionsModalOpen(false)}
        />
      </div>
    </div>
  );
};

export default App;
