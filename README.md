# 🥗 myDispensa - Web App Mobile di Gestione Cibo Domestico

Un'applicazione web reattiva e ottimizzata specificamente per **smartphone** (mobile-first con bottom navigation bar, safe areas per iOS/Android e controlli touch rapidi) per tenere traccia di cibi e scadenze tra **Frigorifero**, **Freezer** e **Dispensa**, con integrata una **Lista della Spesa** interattiva e supporto all'autenticazione tramite **Supabase**.

---

## 🚀 Caratteristiche Principali

- 📱 **Mobile First Experience**: Interfaccia studiata per l'uso con una sola mano da smartphone (bottom bar, swipe/tap rapidi, badge di avviso ben visibili).
- 🧊 **3 Zone di Conservazione separate**:
  - **Frigorifero** (latticini, carne fresca, verdura)
  - **Freezer** (surgelati, scorte a lungo termine)
  - **Dispensa** (pasta, scatolame, conserve, biscotti)
- ⏱️ **Monitoraggio Scadenze & Avvisi**:
  - Pillola scadenza dinamica con calcolo automatico dei giorni rimanenti.
  - Avviso visivo prioritario per cibi in scadenza nei prossimi 3 giorni o già scaduti.
  - Indicatore di confezione **"Aperta / Sigillata"**.
- 🛒 **Lista della Spesa Sincronizzata**:
  - Aggiunta con 1 tap di qualsiasi cibo dall'inventario alla lista della spesa.
  - Spunta dei prodotti nel carrello durante gli acquisti al supermercato.
  - Pulsante **"Riponi"** per trasferire direttamente l'articolo acquistato nel reparto corretto.
- 🔐 **Autenticazione & Database con Supabase**:
  - Registrazione ed accesso tramite Email & Password personali.
  - Row Level Security (RLS): ciascun utente vede esclusivamente la propria dispensa.
  - **Modalità Demo offline istantanea**: puoi testare subito l'app anche prima di aver collegato Supabase.

---

## 🛠️ Configurazione Supabase

### 1. Crea le tabelle nel Database di Supabase
1. Vai sulla tua [Dashboard di Supabase](https://supabase.com).
2. Seleziona il tuo progetto (o creane uno gratuito).
3. Apri la sezione **SQL Editor** nel menu a sinistra.
4. Apri il file [`supabase_schema.sql`](./supabase_schema.sql) presente in questa cartella, copiane il contenuto, incollalo nell'editor ed esegui (**Run**).

Questo creerà:
- La tabella `food_items` con indici su scadenze e utente.
- La tabella `shopping_items`.
- Le policy RLS (Row Level Security) per isolare in sicurezza i dati di ogni utente.

### 2. Configura le variabili d'ambiente
1. Apri la sezione **Project Settings -> API** su Supabase.
2. Copia l'**URL del progetto** e l'**Anon / Public API Key**.
3. Apri il file `.env` nel progetto e inseriscili:
```env
VITE_SUPABASE_URL=https://tuo-progetto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
```

---

## 📲 Avvio dell'Applicazione

1. Installa i pacchetti (se non già fatto):
```bash
npm install
```

2. Avvia il server di sviluppo locale:
```bash
npm run dev
```

3. **Come visualizzarla sul telefono:**
   - Nel terminale Vite mostrerà sia l'indirizzo locale `http://localhost:3000` sia l'indirizzo di rete `http://192.168.x.x:3000`.
   - Assicurati che il tuo telefono sia connesso alla stessa rete Wi-Fi del computer e apri l'indirizzo IP indicato dal browser del telefono.
   - Su Safari (iOS) puoi fare: **Condividi -> Aggiungi a schermata Home** per usarla a schermo intero come una vera app nativa!

