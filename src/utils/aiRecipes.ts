import { FoodItem } from '../types';
import { getExpiryStatus } from './date';

export interface RecipeIngredient {
  name: string;
  baseQty: number; // Quantità per 2 persone di base
  unit: string;
  needed: string;
  inStock: boolean;
  pantryItemId?: string;
  substitute?: string;
}

export interface GeneratedRecipe {
  id: string;
  title: string;
  category: 'Primo' | 'Secondo' | 'Piatto Unico' | 'Salva Cena' | 'Anti-Spreco' | 'Dolce & Snack';
  description: string;
  prepTime: string;
  cookTime?: string;
  difficulty: 'Facile' | 'Media' | 'Avanzata';
  matchRate: number;
  caloriesApprox?: number;
  servingsBase: number;
  ingredients: RecipeIngredient[];
  instructions: string[];
  aiTip?: string;
  winePairing?: string;
  usedFromPantry: string[];
  matchedItemIds: string[];
  storageTip?: string;
}

// Inizializza o chiama l'API Gemini o il Deep Culinary Graph Engine
export async function generateRecipesWithAI(
  inventory: FoodItem[],
  customPrompt?: string,
  dietaryPreference?: 'all' | 'quick' | 'vegetarian' | 'lowcal' | 'antiwaste' | 'sweet',
  selectedIngredientIds?: string[]
): Promise<GeneratedRecipe[]> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  // Filtra inventario se l'utente ha selezionato ingredienti specifici
  const targetInventory = selectedIngredientIds && selectedIngredientIds.length > 0
    ? inventory.filter((i) => selectedIngredientIds.includes(i.id))
    : inventory;

  // Ordina per scadenza per dare priorità assoluta agli ingredienti a rischio spreco
  const prioritizedInventory = [...targetInventory].sort((a, b) => {
    const statusA = getExpiryStatus(a.expiry_date);
    const statusB = getExpiryStatus(b.expiry_date);
    if (statusA === 'expired' || statusA === 'warning') return -1;
    if (statusB === 'expired' || statusB === 'warning') return 1;
    return 0;
  });

  const inventorySummary = prioritizedInventory.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category,
    quantity: `${i.quantity} ${i.unit}`,
    location: i.location,
    status: getExpiryStatus(i.expiry_date),
  }));

  // Se l'utente ha configurato una chiave Gemini API in .env
  if (apiKey) {
    try {
      const systemInstruction = `Sei Chef myDispensa, un assistente culinario professionale italiano esperto di cucina casalinga e anti-spreco.
Dato l'inventario REALE degli alimenti disponibili dell'utente, genera da 3 a 5 ricette squisite, concrete e deliziose, dando PRIORITÀ agli alimenti che stanno per scadere o già aperti.
Fornisci per ciascun ingrediente la quantità base per 2 persone, e suggerimenti di sostituzione intelligenti per ingredienti mancanti.
Rispondi RIGOROSAMENTE con un JSON array valido:
[
  {
    "id": "ai-1",
    "title": "Nome Ricetta",
    "category": "Primo",
    "description": "Descrizione appetitosa",
    "prepTime": "15 min",
    "cookTime": "10 min",
    "difficulty": "Facile",
    "matchRate": 95,
    "caloriesApprox": 380,
    "servingsBase": 2,
    "aiTip": "Consiglio pratico dello chef",
    "winePairing": "Abbinamento bevanda",
    "storageTip": "Come conservare gli avanzi in frigo o freezer",
    "usedFromPantry": ["Ingrediente 1", "Ingrediente 2"],
    "matchedItemIds": ["id1", "id2"],
    "ingredients": [
      { "name": "Nome", "baseQty": 160, "unit": "g", "needed": "160g", "inStock": true, "pantryItemId": "id1", "substitute": "Alternativa possibile" }
    ],
    "instructions": ["Passo 1", "Passo 2", "Passo 3"]
  }
]`;

      const userContent = `Inventario:\n${JSON.stringify(inventorySummary, null, 2)}\n
Preferenza: ${dietaryPreference || 'all'}\n
Richiesta utente: ${customPrompt || 'Ricette gustose e anti-spreco con ciò che ho'}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${systemInstruction}\n\n${userContent}` }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const parsed = JSON.parse(rawJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch (e) {
      console.warn('Gemini API fetch error, switching to Deep Culinary Graph Engine:', e);
    }
  }

  // Motore Gastronomico Deterministico Intelligente (Client-Side Deep Culinary Graph Engine)
  return buildDeepCulinaryRecipes(prioritizedInventory, customPrompt, dietaryPreference);
}

// Grafo culinario avanzato con combinazioni realistiche per qualunque set di alimenti
function buildDeepCulinaryRecipes(
  inventory: FoodItem[],
  customPrompt?: string,
  dietaryPreference?: 'all' | 'quick' | 'vegetarian' | 'lowcal' | 'antiwaste' | 'sweet'
): GeneratedRecipe[] {
  if (inventory.length === 0) {
    return [];
  }

  const recipes: GeneratedRecipe[] = [];

  const findItem = (terms: string[]) =>
    inventory.find((i) => terms.some((t) => i.name.toLowerCase().includes(t)));

  const getAll = (terms: string[]) =>
    inventory.filter((i) => terms.some((t) => i.name.toLowerCase().includes(t)));

  const pastas = getAll(['pasta', 'spaghetti', 'penne', 'fusilli', 'rigatoni', 'tagliatelle', 'gnocchi']);
  const grains = getAll(['riso', 'orzo', 'farro', 'couscous', 'quinoa', 'polenta']);
  const cheeses = getAll(['mozzarella', 'parmigiano', 'grana', 'ricotta', 'pecorino', 'gorgonzola', 'formaggio', 'stracchino', 'caciotta', 'feta']);
  const veg = getAll(['pomodor', 'zucchine', 'melanzan', 'peperon', 'insalata', 'carot', 'funghi', 'cipoll', 'spinac', 'piselli', 'zucca', 'broccoli', 'patat']);
  const meats = getAll(['pollo', 'carne', 'manzo', 'maiale', 'macinato', 'salsiccia', 'prosciutto', 'speck', 'pancetta', 'wurstel']);
  const fish = getAll(['salmone', 'tonno', 'pesce', 'merluzzo', 'gamberi', 'orata', 'sgombro']);
  const eggs = getAll(['uova', 'uovo']);
  const bakery = getAll(['pane', 'fette', 'cracker', 'piadina', 'biscotti', 'farina', 'sfoglia']);
  const dairy = getAll(['latte', 'burro', 'yogurt', 'panna']);
  const legumes = getAll(['fagioli', 'ceci', 'lenticchie']);
  const sweets = getAll(['cioccolato', 'marmellata', 'miele', 'zucchero', 'cacao', 'frutta', 'mela', 'banana']);

  const pantryOil = findItem(['olio']);
  const pantrySalt = findItem(['sale']);

  // ========================================================
  // 1. RICETTA 1: PRIMO GOURMET / RISOTTO O PASTA DELLA TRADIZIONE
  // ========================================================
  if (pastas.length > 0 || grains.length > 0 || inventory.some((i) => i.category === 'grains')) {
    const carb = pastas[0] || grains[0] || inventory[0];
    const isRice = carb.name.toLowerCase().includes('riso');
    const isGnocchi = carb.name.toLowerCase().includes('gnocc');
    const companionVeg = veg[0];
    const companionCheese = cheeses[0];
    const companionMeat = meats[0];
    const companionFish = fish[0];

    let title = isRice ? 'Risotto' : (isGnocchi ? 'Gnocchi' : 'Pasta');
    let desc = '';
    const used: string[] = [carb.name];
    const matchedIds: string[] = [carb.id];

    const ingrList: RecipeIngredient[] = [
      {
        name: carb.name,
        baseQty: 180,
        unit: 'g',
        needed: '180g',
        inStock: true,
        pantryItemId: carb.id,
        substitute: 'Qualsiasi formato di pasta corta o riso Carnaroli'
      }
    ];

    if (companionFish && companionVeg) {
      title += ` con ${companionFish.name} e ${companionVeg.name} al Profumo di Mare`;
      desc = `Primo piatto leggero e saporito, dove la delicatezza di ${companionFish.name.toLowerCase()} si sposa alla freschezza di ${companionVeg.name.toLowerCase()}.`;
      ingrList.push({
        name: companionFish.name,
        baseQty: 150,
        unit: 'g',
        needed: '150g',
        inStock: true,
        pantryItemId: companionFish.id,
        substitute: 'Tonno sottolio sgocciolato o gamberetti'
      });
      ingrList.push({
        name: companionVeg.name,
        baseQty: 120,
        unit: 'g',
        needed: '120g',
        inStock: true,
        pantryItemId: companionVeg.id,
        substitute: 'Zucchine o pomodorini a cubetti'
      });
      used.push(companionFish.name, companionVeg.name);
      matchedIds.push(companionFish.id, companionVeg.id);
    } else if (companionMeat && companionCheese) {
      title += ` Rustica con ${companionMeat.name} e Mantecatura di ${companionCheese.name}`;
      desc = `Un comfort food avvolgente: ${companionMeat.name.toLowerCase()} rosolato con cura e legato dalla cremosità di ${companionCheese.name.toLowerCase()}.`;
      ingrList.push({
        name: companionMeat.name,
        baseQty: 130,
        unit: 'g',
        needed: '130g',
        inStock: true,
        pantryItemId: companionMeat.id,
        substitute: 'Pancetta a dadini, speck o salsiccia'
      });
      ingrList.push({
        name: companionCheese.name,
        baseQty: 60,
        unit: 'g',
        needed: '60g',
        inStock: true,
        pantryItemId: companionCheese.id,
        substitute: 'Grana Padano, Parmigiano o Pecorino'
      });
      used.push(companionMeat.name, companionCheese.name);
      matchedIds.push(companionMeat.id, companionCheese.id);
    } else if (companionVeg && companionCheese) {
      title += ` Vellutata con ${companionVeg.name} e Cuore di ${companionCheese.name}`;
      desc = `Cremosa armonia anti-spreco: valorizza ${companionVeg.name.toLowerCase()} con la filante bontà di ${companionCheese.name.toLowerCase()}.`;
      ingrList.push({
        name: companionVeg.name,
        baseQty: 150,
        unit: 'g',
        needed: '150g',
        inStock: true,
        pantryItemId: companionVeg.id,
        substitute: 'Spinaci, funghi o piselli'
      });
      ingrList.push({
        name: companionCheese.name,
        baseQty: 70,
        unit: 'g',
        needed: '70g',
        inStock: true,
        pantryItemId: companionCheese.id,
        substitute: 'Ricotta, crescenza o formaggio spalmabile'
      });
      used.push(companionVeg.name, companionCheese.name);
      matchedIds.push(companionVeg.id, companionCheese.id);
    } else if (companionCheese) {
      title += ` alla Crema di ${companionCheese.name} e Pepe Tostato`;
      desc = `Ispirata alla cacio e pepe: emulsione setosa di ${companionCheese.name.toLowerCase()} con acqua d'amido.`;
      ingrList.push({
        name: companionCheese.name,
        baseQty: 80,
        unit: 'g',
        needed: '80g',
        inStock: true,
        pantryItemId: companionCheese.id,
        substitute: 'Pecorino Romano o Parmigiano Reggiano'
      });
      used.push(companionCheese.name);
      matchedIds.push(companionCheese.id);
    } else {
      title += ` Espresso Aglio, Olio e Peperoncino Rivisitato`;
      desc = `Il salva-cena italiano per eccellenza: rapido, profumato ed economico.`;
    }

    ingrList.push({
      name: 'Olio Extravergine d\'Oliva',
      baseQty: 2,
      unit: 'cucchiai',
      needed: '2 cucchiai',
      inStock: !!pantryOil,
      pantryItemId: pantryOil?.id,
      substitute: 'Una noce di burro se non hai olio evo'
    });

    recipes.push({
      id: 'recipe-primo-gourmet',
      title,
      category: 'Primo',
      description: desc,
      prepTime: isRice ? '20 min' : '12 min',
      cookTime: '10 min',
      difficulty: 'Facile',
      matchRate: Math.round((ingrList.filter((i) => i.inStock).length / ingrList.length) * 100),
      caloriesApprox: 470,
      servingsBase: 2,
      aiTip: 'Conserva SEMPRE mezza tazza di acqua di cottura prima di scolare: l’amido è il segreto per legare la crema senza aggiungere panna!',
      winePairing: 'Vino bianco fresco e minerale (Vermentino o Pinot Grigio)',
      storageTip: 'Se avanza, conservala in frigo in contenitore ermetico per max 2 giorni: riscaldala in padella con una spruzzata d\'acqua o fanne una frittata di pasta!',
      usedFromPantry: used,
      matchedItemIds: matchedIds,
      ingredients: ingrList,
      instructions: [
        `Porta a ebollizione una pentola con acqua salata e cuoci ${carb.name} al dente (scola 2 minuti prima del tempo indicato).`,
        `Nel frattempo, scalda l'olio in padella e cuoci il condimento a fuoco medio per 5-6 minuti per estrarre tutti i profumi.`,
        `Preleva mezza tazza di acqua di cottura e scola ${carb.name} direttamente nella padella.`,
        `Mantecare a fuoco vivo muovendo energicamente la padella fino a formare un\'emulsione cremosa. Servi ben caldo!`
      ]
    });
  }

  // ========================================================
  // 2. RICETTA 2: SECONDO PROTEICO / ROAST / PADELLATA SALVA-CENA
  // ========================================================
  if (meats.length > 0 || fish.length > 0 || eggs.length > 0 || legumes.length > 0) {
    const prot = meats[0] || fish[0] || eggs[0] || legumes[0];
    const isEgg = prot.name.toLowerCase().includes('uov');
    const isLegume = legumes.length > 0 && prot.id === legumes[0].id;
    const sideVeg = veg[0];
    const sideCheese = cheeses[0];

    let title = '';
    let desc = '';
    const used: string[] = [prot.name];
    const matchedIds: string[] = [prot.id];

    const ingrList: RecipeIngredient[] = [];

    if (isEgg) {
      title = `Frittata Rustica Soffice con ${sideVeg ? sideVeg.name : 'Erbe Aromatiche'} & ${sideCheese ? sideCheese.name : 'Cuore Morbido'}`;
      desc = `La regina dell'anti-spreco: soffice, dorata e perfetta per svuotare il frigo in meno di 10 minuti.`;
      ingrList.push({
        name: prot.name,
        baseQty: 4,
        unit: 'uova',
        needed: '4 uova',
        inStock: true,
        pantryItemId: prot.id,
        substitute: 'Pastella di farina di ceci e acqua per versione vegana'
      });
      if (sideVeg) {
        ingrList.push({
          name: sideVeg.name,
          baseQty: 100,
          unit: 'g',
          needed: '100g',
          inStock: true,
          pantryItemId: sideVeg.id,
          substitute: 'Cipolle stufate, zucchine o patate lesse'
        });
        used.push(sideVeg.name);
        matchedIds.push(sideVeg.id);
      }
      if (sideCheese) {
        ingrList.push({
          name: sideCheese.name,
          baseQty: 60,
          unit: 'g',
          needed: '60g',
          inStock: true,
          pantryItemId: sideCheese.id,
          substitute: 'Qualsiasi formaggio avanzato o formaggini'
        });
        used.push(sideCheese.name);
        matchedIds.push(sideCheese.id);
      }
    } else if (isLegume) {
      title = `Burger / Polpette Dorate di ${prot.name} con ${sideVeg ? sideVeg.name : 'Erbe'}`;
      desc = `Piatto 100% vegetale, proteico e sfizioso per trasformare i legumi in polpette croccanti.`;
      ingrList.push({
        name: prot.name,
        baseQty: 250,
        unit: 'g',
        needed: '250g',
        inStock: true,
        pantryItemId: prot.id,
        substitute: 'Lenticchie, ceci o fagioli cannellini'
      });
      if (sideVeg) {
        ingrList.push({
          name: sideVeg.name,
          baseQty: 80,
          unit: 'g',
          needed: '80g',
          inStock: true,
          pantryItemId: sideVeg.id,
          substitute: 'Carota o zucchina grattugiata'
        });
        used.push(sideVeg.name);
        matchedIds.push(sideVeg.id);
      }
    } else {
      title = `Tagliata o Bocconcini di ${prot.name} al Salto con ${sideVeg ? sideVeg.name : 'Glassa Balsamica'}`;
      desc = `Secondo succoso e veloce che garantisce una cottura tenera esaltando il gusto naturale di ${prot.name.toLowerCase()}.`;
      ingrList.push({
        name: prot.name,
        baseQty: 300,
        unit: 'g',
        needed: '300g',
        inStock: true,
        pantryItemId: prot.id,
        substitute: 'Filetti di pollo, tacchino o tranci di merluzzo'
      });
      if (sideVeg) {
        ingrList.push({
          name: sideVeg.name,
          baseQty: 150,
          unit: 'g',
          needed: '150g',
          inStock: true,
          pantryItemId: sideVeg.id,
          substitute: 'Insalata mista o verdure alla griglia'
        });
        used.push(sideVeg.name);
        matchedIds.push(sideVeg.id);
      }
    }

    ingrList.push({
      name: 'Olio EVO, Sale & Pepe',
      baseQty: 1,
      unit: 'q.b.',
      needed: 'q.b.',
      inStock: !!pantryOil || !!pantrySalt,
      pantryItemId: pantryOil?.id || pantrySalt?.id,
      substitute: 'Spezie a piacere: origano, rosmarino o paprika'
    });

    recipes.push({
      id: 'recipe-secondo-proteico',
      title,
      category: 'Secondo',
      description: desc,
      prepTime: '8 min',
      cookTime: '12 min',
      difficulty: 'Facile',
      matchRate: Math.round((ingrList.filter((i) => i.inStock).length / ingrList.length) * 100),
      caloriesApprox: 350,
      servingsBase: 2,
      aiTip: 'Non punzecchiare mai la carne o le proteine con la forchetta durante la cottura per evitare la fuoriuscita dei succhi!',
      winePairing: isEgg ? 'Birra artigianale chiara o Prosecco' : 'Vino rosso medio corpo (Chianti o Barbera)',
      storageTip: 'Ottimo anche il giorno dopo per farcire un panino o una piadina per il pranzo fuori!',
      usedFromPantry: used,
      matchedItemIds: matchedIds,
      ingredients: ingrList,
      instructions: [
        `Prepara gli ingredienti tagliandoli a dimensioni uniformi per garantire una cottura uniforme.`,
        `Scalda molto bene la padella con un filo d'olio a fiamma vivace.`,
        isEgg
          ? `Sbatti le uova con un pizzico di sale e versa in padella con il ripieno, cuocendo 4 minuti con coperchio prima di girare.`
          : `Rosola le proteine 3-4 minuti per lato per sigillare i succhi e dorare la superficie.`,
        `Aggiusta di sale a fine cottura e fai riposare 1 minuto prima di impiattare.`
      ]
    });
  }

  // ========================================================
  // 3. RICETTA 3: SVUOTA-FRIGO ANTI-SPRECO & SALVA-CENA RAPIDO (<15 min)
  // ========================================================
  const expiringItems = inventory.filter((i) => {
    const s = getExpiryStatus(i.expiry_date);
    return s === 'warning' || s === 'expired';
  });

  const antiWasteTarget = expiringItems.length > 0 ? expiringItems : inventory.slice(0, 3);
  const baseBread = bakery[0];
  const topCheese = cheeses[0];
  const topVeg = veg[0];

  const snackUsed: string[] = antiWasteTarget.map((i) => i.name).slice(0, 3);
  const snackIds: string[] = antiWasteTarget.map((i) => i.id).slice(0, 3);

  const snackTitle = baseBread
    ? `Bruschette Gourmet Svuotafrigo con ${topCheese?.name || 'Formaggio'} & ${topVeg?.name || 'Verdure'}`
    : `Padellata Filante Salva-Cena Anti-Spreco (${snackUsed.slice(0, 2).join(' & ')})`;

  recipes.push({
    id: 'recipe-anti-spreco',
    title: snackTitle,
    category: 'Anti-Spreco',
    description: `La soluzione perfetta per consumare gli ingredienti che rischiano di scadere o i pacchetti aperti, pronta in soli 10 minuti.`,
    prepTime: '5 min',
    cookTime: '8 min',
    difficulty: 'Facile',
    matchRate: 100,
    caloriesApprox: 310,
    servingsBase: 2,
    aiTip: 'Tagliare le verdure a julienne molto sottile ne riduce il tempo di cottura a meno di 5 minuti senza perdere croccantezza.',
    winePairing: 'Vino bianco frizzante o un analcolico agrumato',
    storageTip: 'Consumare preferibilmente subito appena sfornato per godere della massima croccantezza.',
    usedFromPantry: snackUsed,
    matchedItemIds: snackIds,
    ingredients: antiWasteTarget.slice(0, 3).map((item) => ({
      name: item.name,
      baseQty: Math.max(1, item.quantity),
      unit: item.unit,
      needed: `${item.quantity} ${item.unit}`,
      inStock: true,
      pantryItemId: item.id,
      substitute: 'Qualsiasi altro alimento della stessa categoria presente in frigo'
    })),
    instructions: [
      `Raccogli gli ingredienti in scadenza e tagliali a fette o cubetti uniformi.`,
      `In una padella antiaderente scalda un filo d\'olio (o preriscalda il forno a 200°C con grill).`,
      `Salta a fiamma vivace gli ingredienti per 5-6 minuti unendo per ultimi i formaggi per farli fondere alla perfezione.`,
      `Servi caldo accompagnato da fette di pane tostato!`
    ]
  });

  // ========================================================
  // 4. RICETTA 4: ZUPPA, VELLUTATA O COMFORT FOOD CALDO
  // ========================================================
  if (veg.length > 0 || legumes.length > 0) {
    const soupMain = veg[0] || legumes[0];
    const soupSec = veg[1] || legumes[0] || cheeses[0];

    const soupUsed = [soupMain.name];
    const soupIds = [soupMain.id];
    if (soupSec && soupSec.id !== soupMain.id) {
      soupUsed.push(soupSec.name);
      soupIds.push(soupSec.id);
    }

    recipes.push({
      id: 'recipe-comfort-food',
      title: `Vellutata Velluto Dorato con ${soupMain.name} e Crostini Speziati`,
      category: 'Piatto Unico',
      description: `Un piatto confortante, sano e depurativo che sfrutta al meglio ${soupMain.name.toLowerCase()} per una crema densa e profumata.`,
      prepTime: '10 min',
      cookTime: '15 min',
      difficulty: 'Facile',
      matchRate: 95,
      caloriesApprox: 240,
      servingsBase: 2,
      aiTip: 'Una patata o un cucchiaio di farina/amido aggiunto durante la cottura donano una cremosità da ristorante senza panna.',
      winePairing: 'Acqua aromatica con menta e limone o tè verde caldo',
      storageTip: 'Si congela perfettamente in monoporzioni e si conserva in frigo fino a 3-4 giorni.',
      usedFromPantry: soupUsed,
      matchedItemIds: soupIds,
      ingredients: [
        {
          name: soupMain.name,
          baseQty: 250,
          unit: 'g',
          needed: '250g',
          inStock: true,
          pantryItemId: soupMain.id,
          substitute: 'Zucca, carote, patate o zucchine'
        },
        ...(soupSec && soupSec.id !== soupMain.id ? [{
          name: soupSec.name,
          baseQty: 100,
          unit: 'g',
          needed: '100g',
          inStock: true,
          pantryItemId: soupSec.id,
          substitute: 'Crostini di pane o parmigiano'
        }] : []),
        {
          name: 'Acqua / Brodo vegetale',
          baseQty: 400,
          unit: 'ml',
          needed: '400ml',
          inStock: true,
          substitute: 'Acqua calda con mezzo dado vegetale'
        }
      ],
      instructions: [
        `Taglia ${soupMain.name} a tocchetti e mettila in una casseruola con un filo d'olio.`,
        `Copri con acqua calda o brodo e lascia sobbollire a fuoco dolce per 12-14 minuti finché non diventa tenera.`,
        `Frulla con un frullatore a immersione fino a ottenere una crema liscia e setosa.`,
        `Regola di sale e servi con un filo d'olio evo a crudo e pepe fresco.`
      ]
    });
  }

  // ========================================================
  // 5. RICETTA 5: DOLCE ESPRESSO O MERENDA SANA
  // ========================================================
  if (dairy.length > 0 || sweets.length > 0 || bakery.length > 0 || eggs.length > 0) {
    const sweetBase = sweets[0] || dairy[0] || eggs[0];
    const sweetSec = bakery[0] || dairy[0];

    const sweetUsed = [sweetBase.name];
    const sweetIds = [sweetBase.id];
    if (sweetSec && sweetSec.id !== sweetBase.id) {
      sweetUsed.push(sweetSec.name);
      sweetIds.push(sweetSec.id);
    }

    recipes.push({
      id: 'recipe-sweet-snack',
      title: `Dolce Espresso Morbido con ${sweetBase.name} & Aromi di Casa`,
      category: 'Dolce & Snack',
      description: `Voglia di qualcosa di buono? Una coccola dolce pronta in pochissimi minuti senza sporcare mille ciotole.`,
      prepTime: '6 min',
      cookTime: '10 min',
      difficulty: 'Facile',
      matchRate: 90,
      caloriesApprox: 220,
      servingsBase: 2,
      aiTip: 'Aggiungi una spolverata di cannella o scorza di limone grattugiata per un aroma irresistibile.',
      storageTip: 'Conservare a temperatura ambiente sotto una campana di vetro per 24 ore.',
      usedFromPantry: sweetUsed,
      matchedItemIds: sweetIds,
      ingredients: [
        {
          name: sweetBase.name,
          baseQty: 100,
          unit: 'g',
          needed: '100g',
          inStock: true,
          pantryItemId: sweetBase.id,
          substitute: 'Frutta matura, miele o marmellata'
        },
        ...(sweetSec && sweetSec.id !== sweetBase.id ? [{
          name: sweetSec.name,
          baseQty: 60,
          unit: 'g',
          needed: '60g',
          inStock: true,
          pantryItemId: sweetSec.id,
          substitute: 'Biscotti sbriciolati o fiocchi d\'avena'
        }] : [])
      ],
      instructions: [
        `Unisci gli ingredienti in una ciotola amalgamando con una forchetta.`,
        `Cuoci in padella a fiamma dolce come un pancake oppure scalda al microonde per 90 secondi.`,
        `Lascia intiepidire e gusta con una spolverata di cacao o zucchero a velo!`
      ]
    });
  }

  // ========================================================
  // 6. RICHIESTA UTENTE PERSONALIZZATA (se c'è un custom prompt)
  // ========================================================
  if (customPrompt && customPrompt.trim()) {
    const matched = inventory.slice(0, 3);
    recipes.unshift({
      id: 'recipe-custom-prompt',
      title: `Creazione dello Chef: "${customPrompt.trim()}"`,
      category: 'Salva Cena',
      description: `Piatto ideato su misura per la tua richiesta abbinando gli alimenti pronti in casa: ${matched.map((i) => i.name).join(', ')}.`,
      prepTime: '12 min',
      cookTime: '10 min',
      difficulty: 'Facile',
      matchRate: 100,
      caloriesApprox: 380,
      servingsBase: 2,
      aiTip: `Questa combinazione esalta la freschezza di ${matched[0]?.name || 'casa'} senza sprecare nulla.`,
      storageTip: 'Riponi eventuali avanzi in un contenitore di vetro in frigorifero.',
      usedFromPantry: matched.map((i) => i.name),
      matchedItemIds: matched.map((i) => i.id),
      ingredients: matched.map((item) => ({
        name: item.name,
        baseQty: Math.max(1, item.quantity),
        unit: item.unit,
        needed: `${item.quantity} ${item.unit}`,
        inStock: true,
        pantryItemId: item.id,
        substitute: 'Sostituibile con qualsiasi alimento affine'
      })),
      instructions: [
        `Prepara sul piano di lavoro gli ingredienti: ${matched.map((i) => i.name).join(', ')}.`,
        `Lavora gli ingredienti a fuoco moderato regolando le consistenze e gli aromi.`,
        `Servi caldo e guarnisci con un tocco d'olio a crudo.`
      ]
    });
  }

  // Filtra per preferenza dietetica
  let filtered = recipes;
  if (dietaryPreference === 'quick') {
    filtered = filtered.filter((r) => parseInt(r.prepTime) <= 12 || r.category === 'Salva Cena');
  } else if (dietaryPreference === 'vegetarian') {
    filtered = filtered.filter((r) =>
      !r.title.toLowerCase().includes('pollo') &&
      !r.title.toLowerCase().includes('carne') &&
      !r.title.toLowerCase().includes('manzo') &&
      !r.title.toLowerCase().includes('salmone') &&
      !r.title.toLowerCase().includes('pesce') &&
      !r.title.toLowerCase().includes('tonno')
    );
  } else if (dietaryPreference === 'lowcal') {
    filtered = filtered.filter((r) => (r.caloriesApprox || 400) <= 350);
  } else if (dietaryPreference === 'antiwaste') {
    filtered = filtered.filter((r) => r.category === 'Anti-Spreco' || r.matchRate === 100);
  } else if (dietaryPreference === 'sweet') {
    filtered = filtered.filter((r) => r.category === 'Dolce & Snack');
  }

  return filtered.length > 0 ? filtered : recipes;
}
