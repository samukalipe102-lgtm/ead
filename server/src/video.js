// Geração de vídeo por IA — MÚLTIPLOS motores reais, com fluxo assíncrono.
// Motores:
//   - huggingface  (GRATUITO, sem cartão) — Hugging Face Inference Providers
//   - replicate    — Replicate (pré-pago, ~US$0,05/vídeo)
//   - custom       — qualquer endpoint compatível que você apontar
//   - assembled    — PRODUÇÃO AUTOMATIZADA (gratuita): roteiro -> narração (TTS)
//                    -> slides -> montagem em MP4 com ffmpeg. Gera ARQUIVO real.
//
// Honestidade (igual para todos):
//  - Chaves ficam SOMENTE no servidor (nunca no frontend/executável).
//  - Sem motor viável, reporta "não configurado" (não fabrica vídeo/links).
//  - O worker (video-worker.js) acompanha estados reais; aqui ficam os adaptadores.
//  - O vídeo é salvo em disco e associado à aula; nada é inventado.
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { config, resolveVideoProvider, resolveUploadsDir } from './config.js';
import { synthesizeNarration } from './tts.js';
import { renderSlides } from './slides.js';

export function videoAiStatus() {
  const provider = resolveVideoProvider();
  return {
    configured: provider !== null,
    provider,
    model: modelFor(provider),
    ffmpegAvailable: ffmpegAvailable(),
  };
}

function modelFor(provider) {
  if (provider === 'huggingface') return config.video.hfModel;
  if (provider === 'replicate') return config.video.replicateModel;
  if (provider === 'custom') return config.video.customModel || '(custom)';
  if (provider === 'assembled') return 'produção automatizada (TTS + slides + ffmpeg)';
  return null;
}

export function ffmpegAvailable() {
  try {
    const r = spawnSync(config.video.ffmpegPath, ['-version'], { stdio: 'ignore' });
    return r.status === 0;
  } catch { return false; }
}

// Dispara a geração para um motor específico (ou 'auto'). Retorna
// { ok, publicPath, bytes, engine } ou { ok:false, reason }.
export async function generateVideo({ prompt, script, title, engine = 'auto' }) {
  let chosen = engine === 'auto' ? resolveVideoProvider() : engine;
  if (!chosen) return { ok: false, reason: 'VIDEO_AI_NOT_CONFIGURED' };

  const text = (script && script.trim()) || (prompt && prompt.trim());
  if (!text) return { ok: false, reason: 'EMPTY_PROMPT' };

  try {
    let bytes;
    if (chosen === 'huggingface') bytes = await viaHuggingFace(text);
    else if (chosen === 'replicate') bytes = await viaReplicate(text);
    else if (chosen === 'custom') bytes = await viaCustom(text);
    else if (chosen === 'assembled') bytes = await viaAssembled({ title, script: text });
    else return { ok: false, reason: 'UNKNOWN_ENGINE' };

    if (bytes && bytes.__error) return { ok: false, reason: bytes.reason, error: bytes.error };
    if (!bytes || bytes.length < 1024) return { ok: false, reason: 'VIDEO_EMPTY_RESPONSE' };

    const dir = join(resolveUploadsDir(), 'ai-videos');
    mkdirSync(dir, { recursive: true });
    const fileName = `${randomUUID()}.mp4`;
    writeFileSync(join(dir, fileName), bytes);
    return { ok: true, fileName, publicPath: `/uploads/ai-videos/${fileName}`, bytes: bytes.length, engine: chosen };
  } catch (err) {
    return { ok: false, reason: 'VIDEO_REQUEST_FAILED', error: String(err && err.message ? err.message : err) };
  }
}

async function safeText(res) { try { return (await res.text()).slice(0, 200); } catch { return ''; } }
function errObj(reason, error) { return { __error: true, reason, error }; }

// ---- Hugging Face (gratuito) ----
async function viaHuggingFace(prompt) {
  const url = `https://api-inference.huggingface.co/models/${config.video.hfModel}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.video.hfToken}`, 'Content-Type': 'application/json', Accept: 'video/mp4' },
    body: JSON.stringify({ inputs: prompt, parameters: { num_frames: 49, num_inference_steps: 25 } }),
  });
  if (res.status === 503) return errObj('MODEL_LOADING');
  if (!res.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${res.status} ${await safeText(res)}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.startsWith('video/')) return Buffer.from(await res.arrayBuffer());
  const data = await res.json().catch(() => null);
  const vurl = data?.video?.url || data?.url || (Array.isArray(data) && data[0]?.url);
  if (!vurl) return errObj('VIDEO_EMPTY_RESPONSE');
  const vr = await fetch(vurl); if (!vr.ok) return errObj('VIDEO_DOWNLOAD_FAILED');
  return Buffer.from(await vr.arrayBuffer());
}

// ---- Replicate (polling de predição) ----
async function viaReplicate(prompt) {
  const token = config.video.replicateToken;
  const model = config.video.replicateModel;
  const createUrl = model.includes('/')
    ? `https://api.replicate.com/v1/models/${model}/predictions`
    : `https://api.replicate.com/v1/predictions`;
  const body = model.includes('/') ? { input: { prompt } } : { version: model, input: { prompt } };
  let res = await fetch(createUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${res.status} ${await safeText(res)}`);
  let pred = await res.json();
  const deadline = Date.now() + 5 * 60 * 1000;
  while (!['succeeded', 'failed', 'canceled'].includes(pred.status)) {
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
  const vr = await fetch(vurl); if (!vr.ok) return errObj('VIDEO_DOWNLOAD_FAILED');
  return Buffer.from(await vr.arrayBuffer());
}

// ---- Endpoint genérico ----
async function viaCustom(prompt) {
  const res = await fetch(config.video.customUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(config.video.customKey ? { Authorization: `Bearer ${config.video.customKey}` } : {}) },
    body: JSON.stringify({ prompt, model: config.video.customModel || undefined }),
  });
  if (!res.ok) return errObj('VIDEO_REQUEST_FAILED', `HTTP ${res.status} ${await safeText(res)}`);
  const ct = res.headers.get('content-type') || '';
  if (ct.startsWith('video/')) return Buffer.from(await res.arrayBuffer());
  const data = await res.json().catch(() => null);
  const vurl = data?.url || data?.video?.url || (Array.isArray(data?.output) && data.output[0]);
  if (!vurl) return errObj('VIDEO_EMPTY_RESPONSE');
  const vr = await fetch(vurl); if (!vr.ok) return errObj('VIDEO_DOWNLOAD_FAILED');
  return Buffer.from(await vr.arrayBuffer());
}

// ---- Produção automatizada (gratuita): slides + narração + ffmpeg ----
// Divide o roteiro em segmentos, gera narração por segmento (TTS), renderiza um
// slide por segmento e monta um MP4 real com áudio sincronizado.
async function viaAssembled({ title, script }) {
  if (!ffmpegAvailable()) {
    return errObj('FFMPEG_NOT_AVAILABLE', 'ffmpeg não encontrado no servidor. Instale ffmpeg (ex.: apt install ffmpeg) ou defina FFMPEG_PATH.');
  }
  const work = join(resolveUploadsDir(), 'ai-videos', 'work-' + randomUUID());
  mkdirSync(work, { recursive: true });
  try {
    // 1) Segmenta o roteiro em "parágrafos de slide".
    const segments = segmentScript(script);

    // 2) Para cada segmento: narração (TTS) + slide (PNG).
    const concatLines = [];
    const audioInputs = [];
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const audioPath = join(work, `a${i}.mp3`);
      const dur = await synthesizeNarration(seg.text, audioPath); // segundos reais do áudio
      const slidePath = join(work, `s${i}.png`);
      renderSlides({ title, heading: seg.heading, body: seg.text, index: i, total: segments.length, outPath: slidePath });
      concatLines.push({ slidePath, audioPath, duration: dur });
      audioInputs.push(audioPath);
    }

    // 3) Monta cada segmento (imagem + áudio) e concatena em um MP4 final.
    const partPaths = [];
    for (let i = 0; i < concatLines.length; i++) {
      const c = concatLines[i];
      const partPath = join(work, `part${i}.mp4`);
      const r = spawnSync(config.video.ffmpegPath, [
        '-y', '-loop', '1', '-i', c.slidePath, '-i', c.audioPath,
        '-c:v', 'libx264', '-tune', 'stillimage', '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k', '-shortest', '-vf', 'scale=1280:720',
        partPath,
      ], { stdio: 'ignore' });
      if (r.status !== 0) return errObj('VIDEO_ASSEMBLY_FAILED', 'Falha ao montar o segmento ' + i);
      partPaths.push(partPath);
    }

    const listFile = join(work, 'list.txt');
    writeFileSync(listFile, partPaths.map((p) => `file '${p}'`).join('\n'));
    const finalPath = join(work, 'final.mp4');
    const rc = spawnSync(config.video.ffmpegPath, [
      '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', finalPath,
    ], { stdio: 'ignore' });
    if (rc.status !== 0) return errObj('VIDEO_ASSEMBLY_FAILED', 'Falha ao concatenar os segmentos');

    const bytes = await import('node:fs').then((fs) => fs.readFileSync(finalPath));
    return bytes;
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

function segmentScript(script) {
  // Divide por parágrafos; usa a 1ª linha como "heading" quando curta.
  const blocks = script.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const chosen = blocks.length ? blocks : [script.trim()];
  return chosen.map((b, i) => {
    const lines = b.split('\n');
    const heading = lines[0].length <= 70 ? lines[0] : `Parte ${i + 1}`;
    return { heading, text: b };
  });
}
