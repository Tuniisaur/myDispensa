import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { FoodItem, ShoppingItem, StorageLocation } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';

interface InventoryContextType {
  items: FoodItem[];
  shoppingItems: ShoppingItem[];
  loading: boolean;
  deletedToastItem: FoodItem | null;
  refreshData: () => Promise<void>;
  addItem: (item: Omit<FoodItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<FoodItem | null>;
  updateItem: (id: string, updates: Partial<Omit<FoodItem, 'id' | 'user_id'>>) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  undoDelete: () => Promise<void>;
  dismissUndoToast: () => void;
  consumeItem: (id: string, amount?: number) => Promise<boolean>;
  addShoppingItem: (item: { name: string; location: StorageLocation; category: FoodItem['category']; quantity: number; unit: string }) => Promise<void>;
  toggleShoppingItem: (id: string) => Promise<void>;
  deleteShoppingItem: (id: string) => Promise<void>;
  moveShoppingToInventory: (shoppingId: string) => Promise<void>;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const LOCAL_STORAGE_ITEMS_KEY = 'mydispensa_local_items';
const LOCAL_STORAGE_SHOPPING_KEY = 'mydispensa_local_shopping';

const isValidUuid = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Stato per notifica "Elemento eliminato — Annulla"
  const [deletedToastItem, setDeletedToastItem] = useState<FoodItem | null>(null);
  const undoTimeoutRef = useRef<any>(null);

  // Caricamento dati
  const refreshData = useCallback(async () => {
    if (!user) {
      setItems([]);
      setShoppingItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    if (!isSupabaseConfigured) {
      const storedItems = localStorage.getItem(LOCAL_STORAGE_ITEMS_KEY);
      const storedShopping = localStorage.getItem(LOCAL_STORAGE_SHOPPING_KEY);

      if (storedItems) setItems(JSON.parse(storedItems));
      if (storedShopping) setShoppingItems(JSON.parse(storedShopping));

      setLoading(false);
      return;
    }

    // Caricamento da Supabase: supporta filtraggio per utente sia cloud che legacy da MySQL
    try {
      let itemsQuery = supabase
        .from('food_items')
        .select('*')
        .order('expiry_date', { ascending: true, nullsFirst: false });

      let shoppingQuery = supabase
        .from('shopping_items')
        .select('*')
        .order('created_at', { ascending: false });

      const uname = (user.user_metadata?.username || user.email?.split('@')[0] || '').toLowerCase();

      // Mappatura utenti:
      // 1: Franca
      // 2: Mavi
      const hasValidUuid = isValidUuid(user.id);
      const userCondition = hasValidUuid ? `,user_id.eq.${user.id}` : '';

      if (uname === 'franca') {
        itemsQuery = itemsQuery.or(`legacy_user_id.eq.1${userCondition}`);
        shoppingQuery = shoppingQuery.or(`legacy_user_id.eq.1${userCondition}`);
      } else if (uname === 'mavi') {
        itemsQuery = itemsQuery.or(`legacy_user_id.eq.2${userCondition}`);
        shoppingQuery = shoppingQuery.or(`legacy_user_id.eq.2${userCondition}`);
      } else if (hasValidUuid) {
        itemsQuery = itemsQuery.or(`user_id.eq.${user.id}`);
        shoppingQuery = shoppingQuery.or(`user_id.eq.${user.id}`);
      }

      const [itemsRes, shoppingRes] = await Promise.all([itemsQuery, shoppingQuery]);

      if (itemsRes.error) {
        console.error('Errore query alimenti Supabase:', itemsRes.error);
      }
      if (shoppingRes.error) {
        console.error('Errore query shopping Supabase:', shoppingRes.error);
      }

      if (itemsRes.data) {
        setItems(itemsRes.data as FoodItem[]);
      }
      if (shoppingRes.data) {
        setShoppingItems(shoppingRes.data as ShoppingItem[]);
      }
    } catch (err) {
      console.error('Errore nel recupero dati da Supabase:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Aggiunta alimento
  const addItem = async (
    itemData: Omit<FoodItem, 'id' | 'user_id' | 'created_at' | 'updated_at'>
  ): Promise<FoodItem | null> => {
    if (!user) return null;

    if (!isSupabaseConfigured) {
      const newItem: FoodItem = {
        ...itemData,
        id: 'local-' + Date.now(),
        user_id: user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const updated = [newItem, ...items];
      setItems(updated);
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(updated));
      return newItem;
    }

    const uname = (user.user_metadata?.username || user.email?.split('@')[0] || '').toLowerCase();
    const legacyId = uname === 'franca' ? 1 : uname === 'mavi' ? 2 : null;

    const payload: any = {
      ...itemData,
    };
    if (isValidUuid(user.id)) {
      payload.user_id = user.id;
    }
    if (legacyId) {
      payload.legacy_user_id = legacyId;
    }

    const { data, error } = await supabase
      .from('food_items')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Errore aggiunta item su Supabase:', error);
      return null;
    }

    setItems((prev) => [data as FoodItem, ...prev]);
    return data as FoodItem;
  };

  // Modifica alimento (aggiorna quantità, dosi, unità e campi su Supabase)
  const updateItem = async (
    id: string,
    updates: Partial<Omit<FoodItem, 'id' | 'user_id'>>
  ): Promise<boolean> => {
    if (!user) return false;

    // Aggiornamento ottimistico dello stato locale
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i))
    );

    if (!isSupabaseConfigured) {
      const updated = items.map((i) =>
        i.id === id ? { ...i, ...updates, updated_at: new Date().toISOString() } : i
      );
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(updated));
      return true;
    }

    const { error } = await supabase
      .from('food_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Errore update item su Supabase:', error);
      return false;
    }

    return true;
  };

  // Elimina alimento (con supporto Undo)
  const deleteItem = async (id: string): Promise<boolean> => {
    if (!user) return false;

    const itemToDelete = items.find((i) => i.id === id);
    if (!itemToDelete) return false;

    // Salva l'elemento nella notifica Undo
    setDeletedToastItem(itemToDelete);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
    // Auto-chiusura dopo 5 secondi
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedToastItem(null);
    }, 5000);

    if (!isSupabaseConfigured) {
      const updated = items.filter((i) => i.id !== id);
      setItems(updated);
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(updated));
      return true;
    }

    const { error } = await supabase
      .from('food_items')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Errore delete item su Supabase:', error);
      return false;
    }

    setItems((prev) => prev.filter((i) => i.id !== id));
    return true;
  };

  // Annulla eliminazione
  const undoDelete = async () => {
    if (!deletedToastItem || !user) return;

    const restoredItem = deletedToastItem;
    setDeletedToastItem(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }

    if (!isSupabaseConfigured) {
      const updated = [restoredItem, ...items];
      setItems(updated);
      localStorage.setItem(LOCAL_STORAGE_ITEMS_KEY, JSON.stringify(updated));
      return;
    }

    // Re-inserisci in Supabase mantenendo i dati
    const uname = (user.user_metadata?.username || user.email?.split('@')[0] || '').toLowerCase();
    const legacyId = uname === 'franca' ? 1 : uname === 'mavi' ? 2 : null;

    const payload: any = {
      id: restoredItem.id,
      name: restoredItem.name,
      location: restoredItem.location,
      category: restoredItem.category,
      quantity: restoredItem.quantity,
      unit: restoredItem.unit,
      expiry_date: restoredItem.expiry_date,
      opened: restoredItem.opened,
      notes: restoredItem.notes,
    };

    if (isValidUuid(user.id)) {
      payload.user_id = user.id;
    }
    if (legacyId) {
      payload.legacy_user_id = legacyId;
    }

    const { data, error } = await supabase
      .from('food_items')
      .insert(payload)
      .select()
      .single();

    if (!error && data) {
      setItems((prev) => [data as FoodItem, ...prev]);
    }
  };

  const dismissUndoToast = () => {
    setDeletedToastItem(null);
    if (undoTimeoutRef.current) {
      clearTimeout(undoTimeoutRef.current);
    }
  };

  // Consuma una quantità
  const consumeItem = async (id: string, amount: number = 1): Promise<boolean> => {
    const item = items.find((i) => i.id === id);
    if (!item) return false;

    const newQty = Math.max(0, item.quantity - amount);
    if (newQty <= 0) {
      return deleteItem(id);
    } else {
      return updateItem(id, { quantity: newQty });
    }
  };

  // Spesa: Aggiungi
  const addShoppingItem = async (itemData: {
    name: string;
    location: StorageLocation;
    category: FoodItem['category'];
    quantity: number;
    unit: string;
  }) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const newItem: ShoppingItem = {
        ...itemData,
        id: 'shop-' + Date.now(),
        user_id: user.id,
        completed: false,
        created_at: new Date().toISOString(),
      };
      const updated = [newItem, ...shoppingItems];
      setShoppingItems(updated);
      localStorage.setItem(LOCAL_STORAGE_SHOPPING_KEY, JSON.stringify(updated));
      return;
    }

    const uname = (user.user_metadata?.username || user.email?.split('@')[0] || '').toLowerCase();
    const legacyId = uname === 'franca' ? 1 : uname === 'mavi' ? 2 : null;

    const payload: any = {
      ...itemData,
      completed: false,
    };
    if (isValidUuid(user.id)) {
      payload.user_id = user.id;
    }
    if (legacyId) {
      payload.legacy_user_id = legacyId;
    }

    const { data, error } = await supabase
      .from('shopping_items')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('Errore aggiunta spesa su Supabase:', error);
      return;
    }

    setShoppingItems((prev) => [data as ShoppingItem, ...prev]);
  };

  // Spesa: Spunta completato
  const toggleShoppingItem = async (id: string) => {
    const item = shoppingItems.find((s) => s.id === id);
    if (!item || !user) return;

    const newStatus = !item.completed;

    if (!isSupabaseConfigured) {
      const updated = shoppingItems.map((s) =>
        s.id === id ? { ...s, completed: newStatus } : s
      );
      setShoppingItems(updated);
      localStorage.setItem(LOCAL_STORAGE_SHOPPING_KEY, JSON.stringify(updated));
      return;
    }

    await supabase
      .from('shopping_items')
      .update({ completed: newStatus })
      .eq('id', id);

    setShoppingItems((prev) =>
      prev.map((s) => (s.id === id ? { ...s, completed: newStatus } : s))
    );
  };

  // Spesa: Elimina
  const deleteShoppingItem = async (id: string) => {
    if (!user) return;

    if (!isSupabaseConfigured) {
      const updated = shoppingItems.filter((s) => s.id !== id);
      setShoppingItems(updated);
      localStorage.setItem(LOCAL_STORAGE_SHOPPING_KEY, JSON.stringify(updated));
      return;
    }

    await supabase.from('shopping_items').delete().eq('id', id);
    setShoppingItems((prev) => prev.filter((s) => s.id !== id));
  };

  // Spesa: Sposta in Inventario
  const moveShoppingToInventory = async (shoppingId: string) => {
    const sItem = shoppingItems.find((s) => s.id === shoppingId);
    if (!sItem) return;

    await addItem({
      name: sItem.name,
      location: sItem.location,
      category: sItem.category,
      quantity: sItem.quantity,
      unit: sItem.unit,
      expiry_date: null,
      opened: false,
    });

    await deleteShoppingItem(shoppingId);
  };

  return (
    <InventoryContext.Provider
      value={{
        items,
        shoppingItems,
        loading,
        deletedToastItem,
        refreshData,
        addItem,
        updateItem,
        deleteItem,
        undoDelete,
        dismissUndoToast,
        consumeItem,
        addShoppingItem,
        toggleShoppingItem,
        deleteShoppingItem,
        moveShoppingToInventory,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
