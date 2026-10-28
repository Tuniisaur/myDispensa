import { FoodCategory, StorageLocation } from './types';

export const STORAGE_LOCATIONS: {
  id: StorageLocation;
  name: string;
  tagline: string;
  iconName: string;
  color: string;
  activeBg: string;
  borderActive: string;
  badge: string;
}[] = [
  {
    id: 'fridge',
    name: 'Frigo',
    tagline: 'Freschi & Latticini',
    iconName: 'Refrigerator',
    color: 'text-sky-600',
    activeBg: 'bg-sky-50 text-sky-700',
    borderActive: 'border-sky-300',
    badge: 'bg-sky-100 text-sky-800',
  },
  {
    id: 'freezer',
    name: 'Freezer',
    tagline: 'Surgelati & Scorte',
    iconName: 'Snowflake',
    color: 'text-indigo-600',
    activeBg: 'bg-indigo-50 text-indigo-700',
    borderActive: 'border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-800',
  },
  {
    id: 'pantry',
    name: 'Dispensa',
    tagline: 'Pasta, Scatolame & Secco',
    iconName: 'Package',
    color: 'text-amber-600',
    activeBg: 'bg-amber-50 text-amber-700',
    borderActive: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800',
  },
];

export const CATEGORIES: {
  id: FoodCategory;
  name: string;
  emoji: string;
  color: string;
  bgLight: string;
  border: string;
  text: string;
}[] = [
  { id: 'dairy', name: 'Latticini', emoji: '🧀', color: 'from-amber-400 to-yellow-500', bgLight: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
  { id: 'meat', name: 'Carne', emoji: '🥩', color: 'from-rose-400 to-red-500', bgLight: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' },
  { id: 'fish', name: 'Pesce', emoji: '🐟', color: 'from-cyan-400 to-blue-500', bgLight: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800' },
  { id: 'produce', name: 'Verdura & Frutta', emoji: '🥦', color: 'from-emerald-400 to-green-500', bgLight: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
  { id: 'bakery', name: 'Pane & Forno', emoji: '🍞', color: 'from-orange-400 to-amber-600', bgLight: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800' },
  { id: 'grains', name: 'Pasta & Riso', emoji: '🍝', color: 'from-yellow-400 to-amber-500', bgLight: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800' },
  { id: 'canned', name: 'Conserve', emoji: '🥫', color: 'from-red-400 to-rose-600', bgLight: 'bg-red-50', border: 'border-red-200', text: 'text-red-800' },
  { id: 'condiments', name: 'Salse & Spezie', emoji: '🧂', color: 'from-teal-400 to-emerald-600', bgLight: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800' },
  { id: 'beverages', name: 'Bevande', emoji: '🧃', color: 'from-blue-400 to-indigo-500', bgLight: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800' },
  { id: 'frozen', name: 'Surgelati', emoji: '🧊', color: 'from-sky-400 to-cyan-500', bgLight: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-800' },
  { id: 'snacks', name: 'Snack & Dolci', emoji: '🍪', color: 'from-violet-400 to-purple-500', bgLight: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800' },
  { id: 'other', name: 'Altro', emoji: '✨', color: 'from-zinc-400 to-slate-500', bgLight: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-800' },
];

export const COMMON_UNITS = ['pz', 'g', 'kg', 'ml', 'L', 'conf.', 'fette'];
