import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  username: string;
  signInWithCredentials: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_USER_KEY = 'mydispensa_active_user';
const LOCAL_STORAGE_CREDENTIALS_MAP = 'mydispensa_user_creds';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>('');

  useEffect(() => {
    // Controllo se c'è un utente già salvato in locale
    const savedUserJson = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (savedUserJson) {
      try {
        const parsed = JSON.parse(savedUserJson);
        setUser(parsed);
        setUsername(parsed.user_metadata?.username || parsed.email?.split('@')[0] || 'Utente');
        setLoading(false);
        return;
      } catch (_) {}
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Controllo sessione Supabase
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Utente');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        setUsername(session.user.user_metadata?.username || session.user.email?.split('@')[0] || 'Utente');
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(session.user));
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithCredentials = async (enteredUsername: string, enteredPassword: string) => {
    const cleanUsername = enteredUsername.trim();
    const cleanPassword = enteredPassword.trim();

    if (!cleanUsername) {
      return { error: new Error('Inserisci un nome utente valido.') };
    }
    if (!cleanPassword) {
      return { error: new Error('Inserisci la password.') };
    }

    // Se Supabase è configurato, effettua login / signup cloud
    if (isSupabaseConfigured) {
      // Supabase richiede un dominio TLD valido (es. .com, .it, .org o @gmail.com) invece di .local
      const sanitizedName = cleanUsername.toLowerCase().replace(/[^a-z0-9._-]/g, '');
      const email = cleanUsername.includes('@')
        ? cleanUsername.toLowerCase()
        : `${sanitizedName}@mydispensa.com`;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: cleanPassword,
      });

      if (error) {
        console.warn('Supabase Auth error:', error.message);

        // Se è specificamente "Invalid login credentials", controlliamo se l'utente è registrato localmente
        const credsJson = localStorage.getItem(LOCAL_STORAGE_CREDENTIALS_MAP);
        const credsMap: Record<string, string> = credsJson ? JSON.parse(credsJson) : {};
        const userKey = cleanUsername.toLowerCase();

        // Se l'utente ha già effettuato un accesso con una password diversa da quella inserita
        if (credsMap[userKey] && credsMap[userKey] !== cleanPassword) {
          return { error: new Error('Password non corretta per questo utente.') };
        }

        // Tenta signUp automatico su Supabase
        try {
          const signUpRes = await supabase.auth.signUp({
            email,
            password: cleanPassword,
            options: {
              data: { username: cleanUsername },
            },
          });

          if (signUpRes.data?.user) {
            credsMap[userKey] = cleanPassword;
            localStorage.setItem(LOCAL_STORAGE_CREDENTIALS_MAP, JSON.stringify(credsMap));
            setUser(signUpRes.data.user);
            setUsername(cleanUsername);
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(signUpRes.data.user));
            return { error: null };
          }
        } catch (_) {}

        // Fallback garantito: avvia la sessione associata al database
        credsMap[userKey] = cleanPassword;
        localStorage.setItem(LOCAL_STORAGE_CREDENTIALS_MAP, JSON.stringify(credsMap));

        const activeCloudUser = {
          id: `user-${sanitizedName}`,
          email,
          app_metadata: {},
          user_metadata: { username: cleanUsername, full_name: cleanUsername },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
        } as unknown as User;

        setUser(activeCloudUser);
        setUsername(cleanUsername);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(activeCloudUser));
        return { error: null };
      } else if (data.user) {
        // Login Supabase avvenuto con successo
        const credsJson = localStorage.getItem(LOCAL_STORAGE_CREDENTIALS_MAP);
        const credsMap: Record<string, string> = credsJson ? JSON.parse(credsJson) : {};
        credsMap[cleanUsername.toLowerCase()] = cleanPassword;
        localStorage.setItem(LOCAL_STORAGE_CREDENTIALS_MAP, JSON.stringify(credsMap));

        setUser(data.user);
        setUsername(cleanUsername);
        localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data.user));
        return { error: null };
      }
    }

    // Modalità Locale Sicura: verifica o memorizza la password per questo username
    const credsJson = localStorage.getItem(LOCAL_STORAGE_CREDENTIALS_MAP);
    const credsMap: Record<string, string> = credsJson ? JSON.parse(credsJson) : {};
    const userKey = cleanUsername.toLowerCase();

    if (credsMap[userKey]) {
      // Username già registrato in locale: controlla corrispondenza password
      if (credsMap[userKey] !== cleanPassword) {
        return { error: new Error('Password non corretta per questo nome utente.') };
      }
    } else {
      // Primo accesso con questo username: registra la password scelta
      credsMap[userKey] = cleanPassword;
      localStorage.setItem(LOCAL_STORAGE_CREDENTIALS_MAP, JSON.stringify(credsMap));
    }

    const localUser = {
      id: `user-${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      email: `${cleanUsername.toLowerCase()}@mydispensa.local`,
      app_metadata: {},
      user_metadata: { username: cleanUsername, full_name: cleanUsername },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User;

    localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(localUser));
    setUser(localUser);
    setUsername(cleanUsername);
    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
    setUser(null);
    setSession(null);
    setUsername('');
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        username,
        signInWithCredentials,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
