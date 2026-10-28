/**
 * Utility per la trascrizione vocale ultra-affidabile su iOS, Android e Desktop
 * Usa MediaRecorder (supportato nativamente al 100% su iOS Safari e PWA) + Groq Whisper API
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
 * Trascrive un file audio (Blob) inviandolo a Groq Whisper
 */
export async function transcribeAudioWithGroq(audioBlob: Blob, apiKey?: string): Promise<string> {
  const token = apiKey || getGroqApiKey();
  if (!token) {
    throw new Error('API_KEY_MISSING');
  }

  // Prepara il form data per l'endpoint OpenAI-compatibile di Groq
  const formData = new FormData();
  
  // Determina estensione dal mimeType
  const ext = audioBlob.type.includes('mp4') ? 'm4a' : audioBlob.type.includes('ogg') ? 'ogg' : 'webm';
  const file = new File([audioBlob], `recording.${ext}`, { type: audioBlob.type || 'audio/webm' });
  
  formData.append('file', file);
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'it');
  formData.append('temperature', '0');
  formData.append('response_format', 'json');

  const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData?.error?.message || `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(`Errore trascrizione Groq: ${message}`);
  }

  const result = await response.json();
  return result.text || '';
}
