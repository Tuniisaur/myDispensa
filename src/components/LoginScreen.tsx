import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, User as UserIcon, Lock } from 'lucide-react';

export const LoginScreen: React.FC = () => {
  const { signInWithCredentials } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await signInWithCredentials(username, password);
      if (error) {
        setErrorMessage(error.message);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Si è verificato un errore');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-gradient-to-b from-emerald-50/60 via-[#f6f8f7] to-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 selection:bg-emerald-600 selection:text-white">
      {/* Contenitore centrato con respiro */}
      <div className="w-full max-w-sm flex flex-col items-center">
        
        {/* IMMAGINE LOGIN.PNG IN CENTRO E IN ALTO INGRANDITA */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-52 h-52 sm:w-60 sm:h-60 drop-shadow-xl transition-transform hover:scale-105 duration-200">
            <img
              src="/login.png"
              alt="myDispensa"
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
          <div className="flex flex-col items-center justify-center -mt-6 sm:-mt-8 relative z-10">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-800/80 mb-0.5">
              Benvenuto in
            </span>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 leading-none drop-shadow-xs">
              my<span className="text-emerald-600">Dispensa</span>
            </h1>
          </div>
        </div>

        {/* CARD FORM DI LOGIN CON USERNAME E PASSWORD */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-7 shadow-xl shadow-emerald-950/5 border border-zinc-200/90 relative animate-in fade-in duration-200">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-2xl text-xs mb-4 font-semibold">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                Nome Utente
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Inserisci il tuo username..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5 px-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:border-emerald-600 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username.trim() || !password.trim()}
              className="w-full py-3.5 bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm shadow-emerald-700/25 transition-all mt-2 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <LogIn size={16} />
              {loading ? 'Accesso in corso...' : 'Entra'}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
};
