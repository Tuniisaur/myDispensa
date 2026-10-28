/**
 * Utility per la trascrizione vocale ultra-affidabile su iOS, Android e Desktop
 * Usa MediaRecorder (supportato nativamente al 100% su iOS Safari e PWA) + Groq Whisper
 * 
 * Flusso:
 * 1. Prova prima l'endpoint serverless `/api/transcribe` (dove puoi impostare GROQ_API_KEY su Vercel per tutti gli utenti senza esporla)
 * 2. Se non è configurata sul server, fa fallback sulla chiave locale impostata dall'utente (localStorage / env client)
 */

export const GROQ_STORAGE_KEY = 'mydispensa_groq_api_key';

export function getGroqApiKey(): string {
  // 1. Chiave salvata dall'utente in localStorage
  const saved = localStorage.getItem(GROQ_STORAGE_KEY);
  if (saved && saved.trim()) return saved.trim();

  // 2. Chiave definita in .env (se presente)
  const envKey = (import.meta as any).env?.VITE_GROQ_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }

  return '';
}

export function saveGroqApiKey(key: string): void {
  if (key && key.trim()) {
    localStorage.setItem(GROQ_STORAGE_KEY, key.trim());
  } else {
    localStorage.removeItem(GROQ_STORAGE_KEY);
  }
}

/**
 * Trascrive un file audio (Blob):
 * - Prima tenta l'API serverless `/api/transcribe` (usando la chiave di Vercel centralizzata).
 * - Se risponde con API_KEY_MISSING, usa la chiave locale se presente, altrimenti lancia API_KEY_MISSING.
 */
export async function transcribeAudioWithGroq(audioBlob: Blob, userApiKey?: string): Promise<string> {
  const localKey = userApiKey || getGroqApiKey();

  // Prepara il file audio con estensione corretta
  const ext = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  const file = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type || 'audio/webm' });

  const formData = new FormData();
  formData.append('file', file);

  // 1. Prova a chiamare l'endpoint Vercel `/api/transcribe`
  try {
    const headers: Record<string, string> = {};
    if (localKey) {
      headers['Authorization'] = `Bearer ${localKey}`;
    }

    const serverRes = await fetch('/api/transcribe', {
      method: 'POST',
      headers,
      body: formData,
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      return data.text || '';
    }

    // Se l'errore è 404 (es. ambiente dev locale Vite senza Vercel Edge Server) o 401
    const errData = await serverRes.json().catch(() => ({}));
    if (serverRes.status !== 401 && serverRes.status !== 404) {
      throw new Error(errData?.message || errData?.error || `Errore trascrizione server: ${serverRes.status}`);
    }
  } catch (serverErr: any) {
    // Se è un errore diverso da 401 / 404 e abbiamo una ragione specifica, propagala solo se non c'è fallback
    if (!localKey && serverErr?.message && !serverErr.message.includes('404') && !serverErr.message.includes('401')) {
      throw serverErr;
    }
  }

  // 2. Fallback diretto client-side verso Groq (se l'utente ha inserito una chiave locale o in .env locale)
  if (!localKey) {
    throw new Error('API_KEY_MISSING');
  }

  const directFormData = new FormData();
  directFormData.append('file', file);
  directFormData.append('model', 'whisper-large-v3-turbo');
  directFormData.append('language', 'it');
  directFormData.append('temperature', '0');
  directFormData.append('prompt', 'Lista della spesa in italiano per alimenti: latte, caffe, te, pere, mele, pasta, pane, farina.');
  directFormData.append('response_format', 'json');

  const directRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${localKey}`,
    },
    body: directFormData,
  });

  if (!directRes.ok) {
    const errorData = await directRes.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${directRes.status}: ${directRes.statusText}`;
    throw new Error(`Errore trascrizione Groq: ${message}`);
  }

  const result = await directRes.json();
  let text = result.text || '';
  if (text) {
    // Normalizzazione senza accenti
    text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  return text;
}
