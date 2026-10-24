// Geração de vídeo por IA — MÚLTIPLOS provedores reais.
// O servidor escolhe automaticamente o provedor pela chave presente:
//   - huggingface  (GRATUITO, sem cartão) — Hugging Face Inference Providers
//   - replicate    — Replicate (créditos free/trial)
//   - custom       — qualquer endpoint compatível que você apontar
//
// Honestidade (igual para todos os provedores):
//  - A chave fica SOMENTE no servidor (nunca no frontend/executável).
//  - Sem provedor configurado, reporta "não configurado" (não fabrica vídeo/links).
//  - Estados reais: a aula passa por PROCESSING -> DONE | FAILED.
//  - O vídeo é salvo em disco e associado à aula; nada é inventado.
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config, resolveVideoProvider, resolveUploadsDir } from './config.js';

export function videoAiStatus() {
  const provider = resolveVideoProvider();
  return {
    configured: provider !== null,
    provider,
    model: modelFor(provider),
  };
}

function modelFor(provider) {
  if (provider === 'huggingface') return config.video.hfModel;
  if (provider === 'replicate') return config.video.replicateModel;
  if (provider === 'custom') return config.video.customModel || '(custom)';
  return null;
}

// Gera o vídeo a partir do prompt. Retorna { ok, publicPath, bytes } ou
// { ok:false, reason }. Salva em uploads/ai-videos/<id>.mp4.
export async function generateVideo(prompt) {
  const provider = resolveVideoProvider();
  if (!provider) return { ok: false, reason: 'VIDEO_AI_NOT_CONFIGURED' };
  if (!prompt || !prompt.trim()) return { ok: false, reason: 'EMPTY_PROMPT' };

  try {
    let bytes;
    if (provider === 'huggingface') bytes = await viaHuggingFace(prompt.trim());
    else if (provider === 'replicate') bytes = await viaReplicate(prompt.trim());
    else if (provider === 'custom') bytes = await viaCustom(prompt.trim());

    // Adaptadores podem retornar um objeto de erro controlado.
    if (bytes && bytes.__error) return { ok: false, reason: bytes.reason, error: bytes.error };
    if (!bytes || bytes.length < 1024) return { ok: false, reason: 'VIDEO_EMPTY_RESPONSE' };

    const dir = join(resolveUploadsDir(), 'ai-videos');
    mkdirSync(dir, { recursive: true });
    const fileName = `${randomUUID()}.mp4`;
    writeFileSync(join(dir, fileName), bytes);
    return { ok: true, fileName, publicPath: `/uploads/ai-videos/${fileName}`, bytes: bytes.length, provider };
  } catch (err) {
    return { ok: false, reason: 'VIDEO_REQUEST_FAILED', error: String(err && err.message ? err.message : err) };
  }
}

async function safeText(res) {
  try { return (await res.text()).slice(0, 200); } catch { return ''; }
}
function errObj(reason, error) { return { __error: true, reason, error }; }

// ---- Hugging Face (gratuito) ----
async function viaHuggingFace(prompt) {
  const url = `https://api-inference.huggingface.co/models/${config.video.hfModel}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.video.hfToken}`,
      'Content-Type': 'application/json',
      Accept: 'video/mp4',
    },
    body: JSON.stringify({ inputs: prompt, parameters: { num_frames: 49, num_inference_steps: 25 } }),
  });
  if (res.status === 503) return errObj('MODEL_LOADING'); // cold start
  if (!res.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${res.status} ${await safeText(res)}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.startsWith('video/')) return Buffer.from(await res.arrayBuffer());
  const data = await res.json().catch(() => null);
  const vurl = data?.video?.url || data?.url || (Array.isArray(data) && data[0]?.url);
  if (!vurl) return errObj('VIDEO_EMPTY_RESPONSE');
  const vr = await fetch(vurl);
  if (!vr.ok) return errObj('VIDEO_DOWNLOAD_FAILED');
  return Buffer.from(await vr.arrayBuffer());
}

// ---- Replicate (predições assíncronas com polling) ----
async function viaReplicate(prompt) {
  const token = config.video.replicateToken;
  const model = config.video.replicateModel; // owner/name
  // Cria a predição via endpoint de modelo (resolve a última versão automaticamente).
  const createUrl = model.includes('/')
    ? `https://api.replicate.com/v1/models/${model}/predictions`
    : `https://api.replicate.com/v1/predictions`;
  const body = model.includes('/')
    ? { input: { prompt } }
    : { version: model, input: { prompt } };

  let res = await fetch(createUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${res.status} ${await safeText(res)}`);
  let pred = await res.json();

  // Faz polling até concluir (máx ~5 min).
  const deadline = Date.now() + 5 * 60 * 1000;
  while (pred.status !== 'succeeded' && pred.status !== 'failed' && pred.status !== 'canceled') {
    if (Date.now() > deadline) return errObj('VIDEO_TIMEOUT');
    await new Promise((r) => setTimeout(r, 2500));
    const pr = await fetch(pred.urls.get, { headers: { Authorization: `Bearer ${token}` } });
    if (!pr.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${pr.status}`);
    pred = await pr.json();
  }
  if (pred.status !== 'succeeded') return errObj('VIDEO_GENERATION_FAILED', JSON.stringify(pred.error || pred.status));

  const out = pred.output;
  const vurl = Array.isArray(out) ? out[out.length - 1] : (typeof out === 'string' ? out : out?.url);
  if (!vurl) return errObj('VIDEO_EMPTY_RESPONSE');
  const vr = await fetch(vurl);
  if (!vr.ok) return errObj('VIDEO_DOWNLOAD_FAILED');
  return Buffer.from(await vr.arrayBuffer());
}

// ---- Endpoint genérico/custom (self-host ou outro provedor) ----
// Espera: POST {prompt, model} -> ou bytes de vídeo, ou JSON { url }.
async function viaCustom(prompt) {
  const res = await fetch(config.video.customUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(config.video.customKey ? { Authorization: `Bearer ${config.video.customKey}` } : {}),
    },
    body: JSON.stringify({ prompt, model: config.video.customModel || undefined }),
  });
  if (!res.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${res.status} ${await safeText(res)}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.startsWith('video/')) return Buffer.from(await res.arrayBuffer());
  const data = await res.json().catch(() => null);
  const vurl = data?.url || data?.video?.url || (Array.isArray(data?.output) && data.output[0]);
  if (!vurl) return errObj('VIDEO_EMPTY_RESPONSE');
  const vr = await fetch(vurl);
  if (!vr.ok) return errObj('VIDEO_DOWNLOAD_FAILED');
  return Buffer.from(await vr.arrayBuffer());
}
