export type StorageLocation = 'fridge' | 'freezer' | 'pantry';

export type FoodCategory =
  | 'dairy'        // Latticini & Formaggi
  | 'meat'         // Carne & Pollame
  | 'fish'         // Pesce & Frutti di mare
  | 'produce'      // Frutta & Verdura
  | 'bakery'       // Pane & Dolci
  | 'grains'       // Pasta, Riso & Cereali
  | 'canned'       // Scatolame & Conserve
  | 'beverages'    // Bevande
  | 'frozen'       // Surgelati
  | 'condiments'   // Salse, Olio & Spezie
  | 'snacks'       // Snack & Dolciumi
  | 'other';       // Altro

export interface FoodItem {
  id: string;
  user_id: string;
  name: string;
  location: StorageLocation;
  category: FoodCategory;
  quantity: number;
  unit: string; // 'pz', 'kg', 'g', 'L', 'ml', 'confezioni'
  expiry_date: string | null; // YYYY-MM-DD
  opened: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ShoppingItem {
  id: string;
  user_id: string;
  name: string;
  location: StorageLocation;
  category: FoodCategory;
  quantity: number;
  unit: string;
  completed: boolean;
  created_at: string;
}

export type ExpiryStatus = 'expired' | 'warning' | 'good' | 'none';

