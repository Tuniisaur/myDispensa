import { FoodCategory, StorageLocation } from '../types';

export interface ScannedProductResult {
  name: string;
  category: FoodCategory;
  location: StorageLocation;
  quantity: number;
  unit: string;
  barcode: string;
  imageUrl?: string;
  brand?: string;
}

// Mappatura automatica tra i tag di OpenFoodFacts e le nostre categorie e posizioni
export function guessCategoryAndLocation(categoriesHierarchy: string[] = [], tags: string[] = [], productName: string = ''): { category: FoodCategory; location: StorageLocation } {
  const combined = (categoriesHierarchy.join(' ') + ' ' + tags.join(' ') + ' ' + productName).toLowerCase();

  // 1. Frigo
  if (
    combined.includes('cheeses') ||
    combined.includes('formagg') ||
    combined.includes('mozzarella') ||
    combined.includes('latte') ||
    combined.includes('milk') ||
    combined.includes('dairy') ||
    combined.includes('yogurt') ||
    combined.includes('burro') ||
    combined.includes('butter')
  ) {
    return { category: 'dairy', location: 'fridge' };
  }

  if (
    combined.includes('meats') ||
    combined.includes('carne') ||
    combined.includes('salumi') ||
    combined.includes('prosciutto') ||
    combined.includes('poultry') ||
    combined.includes('pollo') ||
    combined.includes('sausages')
  ) {
    return { category: 'meat', location: 'fridge' };
  }

  if (
    combined.includes('fishes') ||
    combined.includes('pesce') ||
    combined.includes('seafood') ||
    combined.includes('salmone')
  ) {
    return { category: 'fish', location: 'fridge' };
  }

  if (
    combined.includes('vegetables') ||
    combined.includes('fruits') ||
    combined.includes('verdura') ||
    combined.includes('frutta') ||
    combined.includes('salads') ||
    combined.includes('insalata') ||
    combined.includes('pomodor')
  ) {
    return { category: 'produce', location: 'fridge' };
  }

  // 2. Freezer
  if (
    combined.includes('frozen') ||
    combined.includes('surgelat') ||
    combined.includes('ice cream') ||
    combined.includes('gelat') ||
    combined.includes('ghiacciol')
  ) {
    return { category: 'frozen', location: 'freezer' };
  }

  // 3. Dispensa
  if (
    combined.includes('pastas') ||
    combined.includes('spaghetti') ||
    combined.includes('penne') ||
    combined.includes('noodles') ||
    combined.includes('rice') ||
    combined.includes('riso') ||
    combined.includes('cereals') ||
    combined.includes('flours') ||
    combined.includes('farina')
  ) {
    return { category: 'grains', location: 'pantry' };
  }

  if (
    combined.includes('canned') ||
    combined.includes('scatolame') ||
    combined.includes('tonno') ||
    combined.includes('legumi') ||
    combined.includes('beans') ||
    combined.includes('passata') ||
    combined.includes('pomodori pelati')
  ) {
    return { category: 'canned', location: 'pantry' };
  }

  if (
    combined.includes('sauces') ||
    combined.includes('salse') ||
    combined.includes('pesto') ||
    combined.includes('condiments') ||
    combined.includes('olio') ||
    combined.includes('oil') ||
    combined.includes('aceto') ||
    combined.includes('spices') ||
    combined.includes('spezie')
  ) {
    return { category: 'condiments', location: 'pantry' };
  }

  if (
    combined.includes('biscuits') ||
    combined.includes('biscotti') ||
    combined.includes('cookies') ||
    combined.includes('snacks') ||
    combined.includes('chips') ||
    combined.includes('patatine') ||
    combined.includes('cioccolat') ||
    combined.includes('chocolate')
  ) {
    return { category: 'snacks', location: 'pantry' };
  }

  if (
    combined.includes('breads') ||
    combined.includes('pane') ||
    combined.includes('bakery') ||
    combined.includes('croissant') ||
    combined.includes('crackers')
  ) {
    return { category: 'bakery', location: 'pantry' };
  }

  if (
    combined.includes('beverages') ||
    combined.includes('bevande') ||
    combined.includes('juice') ||
    combined.includes('succhi') ||
    combined.includes('coffee') ||
    combined.includes('caffè') ||
    combined.includes('tea') ||
    combined.includes('tè')
  ) {
    return { category: 'beverages', location: 'pantry' };
  }

  return { category: 'other', location: 'pantry' };
}

// Estrazione quantità e unità da stringa (es. "500 g", "1 L", "4x125 g")
export function parseQuantityAndUnit(quantityStr: string = ''): { quantity: number; unit: string } {
  if (!quantityStr) return { quantity: 1, unit: 'pz' };

  const clean = quantityStr.trim().toLowerCase();
  
  if (clean.includes('kg')) {
    const num = parseFloat(clean.replace(',', '.'));
    return { quantity: isNaN(num) ? 1 : num, unit: 'kg' };
  }
  if (clean.includes('g')) {
    const num = parseFloat(clean.replace(',', '.'));
    return { quantity: isNaN(num) ? 1 : num, unit: 'g' };
  }
  if (clean.includes('ml')) {
    const num = parseFloat(clean.replace(',', '.'));
    return { quantity: isNaN(num) ? 1 : num, unit: 'ml' };
  }
  if (clean.includes('l') || clean.includes('lt')) {
    const num = parseFloat(clean.replace(',', '.'));
    return { quantity: isNaN(num) ? 1 : num, unit: 'L' };
  }

  return { quantity: 1, unit: 'pz' };
}

// Ricerca prodotto su OpenFoodFacts tramite codice a barre EAN
export async function fetchProductByBarcode(barcode: string): Promise<ScannedProductResult | null> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) return null;

  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`);
    if (!response.ok) return null;

    const data = await response.json();
    if (data.status !== 1 || !data.product) {
      return null;
    }

    const p = data.product;
    const name = p.product_name_it || p.product_name || p.generic_name_it || p.generic_name || 'Prodotto Scansionato';
    const brand = p.brands || '';
    const fullName = brand ? `${brand} ${name}` : name;

    const { category, location } = guessCategoryAndLocation(p.categories_hierarchy, p._keywords, fullName);
    const { quantity, unit } = parseQuantityAndUnit(p.quantity);

    return {
      barcode: cleanBarcode,
      name: fullName,
      category,
      location,
      quantity,
      unit,
      brand,
      imageUrl: p.image_front_small_url || p.image_front_url || p.image_url,
    };
  } catch (error) {
    console.error('Errore durante la ricerca del codice a barre su OpenFoodFacts:', error);
    return null;
  }
}

