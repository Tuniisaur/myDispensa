import { createClient } from '@supabase/supabase-js';

// Leggiamo le variabili d'ambiente (da .env o fallback per mock test)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

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

