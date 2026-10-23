// Tutor de IA — área PRÓPRIA, separada do sistema de mensagens.
// Integração real e opcional: sem chave configurada, responde indisponível de
// forma honesta (nunca finge uma resposta de IA).
import { config, aiConfigured } from './config.js';

const SYSTEM_PROMPT =
  'Você é um tutor de estudos da plataforma de Formação Sacerdotal de Umbanda. ' +
  'Responda com respeito à diversidade das tradições da Umbanda, de forma didática e sóbria. ' +
  'Não invente fundamentos religiosos, fontes ou certificados. Quando não souber, diga que não sabe. ' +
  'Oriente sempre procurar profissionais de saúde para questões médicas ou psicológicas.';

export function aiStatus() {
  return {
    configured: aiConfigured(),
    provider: config.ai.provider || null,
  };
}

// Retorna { ok, reply } ou { ok:false, reason }. Nunca fabrica conteúdo.
export async function askTutor(history) {
  if (!aiConfigured()) {
    return { ok: false, reason: 'AI_NOT_CONFIGURED' };
  }
  try {
    if (config.ai.provider === 'gemini') return await askGemini(history);
    if (config.ai.provider === 'openai') return await askOpenAI(history);
    return { ok: false, reason: 'AI_NOT_CONFIGURED' };
  } catch (err) {
    return { ok: false, reason: 'AI_REQUEST_FAILED', error: String(err && err.message ? err.message : err) };
  }
}

async function askGemini(history) {
  const model = 'gemini-1.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.ai.geminiKey}`;
  const contents = history.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.body }],
  }));
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents,
    }),
  });
  if (!res.ok) return { ok: false, reason: 'AI_REQUEST_FAILED', error: `HTTP ${res.status}` };
  const data = await res.json();
  const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) return { ok: false, reason: 'AI_EMPTY_RESPONSE' };
  return { ok: true, reply };
}

async function askOpenAI(history) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.ai.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history.map((m) => ({ role: m.role, content: m.body })),
      ],
    }),
  });
  if (!res.ok) return { ok: false, reason: 'AI_REQUEST_FAILED', error: `HTTP ${res.status}` };
  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content;
  if (!reply) return { ok: false, reason: 'AI_EMPTY_RESPONSE' };
  return { ok: true, reply };
}
