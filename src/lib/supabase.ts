import { createClient } from '@supabase/supabase-js';

// Leggiamo le variabili d'ambiente con fallback sicuro alle chiavi di produzione
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://rlvfiiltmrkfzuryjudm.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  'sb_publishable_0sbkokq9Z1x02kr5vO09jw_bLNAErkt';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('TUO-PROGETTO') &&
  supabaseUrl.startsWith('https://')
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://mock-instance.supabase.co', 'mock-key', {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

