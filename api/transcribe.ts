export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Gestione preflight CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // 1. Prendi la chiave GROQ_API_KEY o VITE_GROQ_API_KEY dalle variabili server di Vercel
    const serverApiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    
    // Se il client passa una propria chiave nell'header Authorization, diamo priorità a quella
    const authHeader = request.headers.get('Authorization');
    const clientApiKey = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : null;

    const apiKey = serverApiKey || clientApiKey;

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: 'API_KEY_MISSING',
          message: 'GROQ_API_KEY non configurata nelle variabili ambiente di Vercel.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // 2. Ricevi il FormData inviato dal client (audioBlob)
    const incomingFormData = await request.formData();
    const audioFile = incomingFormData.get('file');

    if (!audioFile) {
      return new Response(JSON.stringify({ error: 'File audio non presente' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // 3. Prepara la richiesta verso Groq Whisper
    const groqFormData = new FormData();
    groqFormData.append('file', audioFile);
    groqFormData.append('model', 'whisper-large-v3-turbo');
    groqFormData.append('language', 'it');
    groqFormData.append('temperature', '0');
    // Prompt guida per Whisper: orienta lo stile del testo in italiano standard
    // senza accenti o simboli strani sui prodotti alimentari
    groqFormData.append('prompt', 'Lista della spesa in italiano per alimenti: latte, caffe, te, pere, mele, pasta, pane, farina.');
    groqFormData.append('response_format', 'json');

    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: groqFormData,
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      return new Response(errorText, {
        status: groqResponse.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const data = await groqResponse.json();
    let transcribedText = data.text || '';

    // Rimozione sistematica di accenti e punteggiatura finale/spuria
    if (transcribedText) {
      transcribedText = transcribedText
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // rimuove accenti
        .replace(/[.,;:!?]+(\s|$)/g, '$1') // rimuove punti, virgole, punti e virgola a fine parola o fine testo
        .replace(/[.]+$/g, '') // rimuove eventuali punti residui a fine riga
        .trim();
    }

    return new Response(JSON.stringify({ text: transcribedText }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: any) {
    console.error('Vercel transcribe error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Errore interno del server' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

