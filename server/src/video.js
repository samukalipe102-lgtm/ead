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
import { synthesizeNarration, ttsBackendLabel } from './tts.js';
import { renderSlides } from './slides.js';

export function videoAiStatus() {
  const provider = resolveVideoProvider();
  return {
    configured: provider !== null,
    provider,
    model: modelFor(provider),
    ffmpegAvailable: ffmpegAvailable(),
    ttsBackend: ttsBackendLabel(),
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
    let out;
    if (chosen === 'huggingface') out = await viaHuggingFace(text);
    else if (chosen === 'replicate') out = await viaReplicate(text);
    else if (chosen === 'custom') out = await viaCustom(text);
    else if (chosen === 'assembled') out = await viaAssembled({ title, script: text });
    else return { ok: false, reason: 'UNKNOWN_ENGINE' };

    if (out && out.__error) return { ok: false, reason: out.reason, error: out.error };

    // O motor "assembled" devolve { __video, __srt }; os demais devolvem um Buffer.
    const videoBytes = out && out.__video ? out.__video : out;
    const srt = out && out.__srt ? out.__srt : null;
    if (!videoBytes || videoBytes.length < 1024) return { ok: false, reason: 'VIDEO_EMPTY_RESPONSE' };

    const dir = join(resolveUploadsDir(), 'ai-videos');
    mkdirSync(dir, { recursive: true });
    const base = randomUUID();
    const fileName = `${base}.mp4`;
    writeFileSync(join(dir, fileName), videoBytes);
    let subtitlePath = null;
    if (srt) {
      const srtName = `${base}.srt`;
      writeFileSync(join(dir, srtName), srt);
      subtitlePath = `/uploads/ai-videos/${srtName}`;
    }
    // Valida tecnicamente o arquivo (duração/codecs) via ffprobe.
    const meta = probeVideo(join(dir, fileName));
    return {
      ok: true, fileName, publicPath: `/uploads/ai-videos/${fileName}`,
      subtitlePath, bytes: videoBytes.length, engine: chosen, meta,
    };
  } catch (err) {
    return { ok: false, reason: 'VIDEO_REQUEST_FAILED', error: String(err && err.message ? err.message : err) };
  }
}

// Validação técnica do MP4: duração, resolução, codecs de vídeo/áudio.
export function probeVideo(filePath) {
  try {
    const r = spawnSync(config.video.ffprobePath, [
      '-v', 'error', '-show_entries',
      'format=duration:stream=codec_type,codec_name,width,height',
      '-of', 'json', filePath,
    ], { encoding: 'utf8' });
    const data = JSON.parse(r.stdout || '{}');
    const v = (data.streams || []).find((s) => s.codec_type === 'video') || {};
    const a = (data.streams || []).find((s) => s.codec_type === 'audio') || {};
    return {
      duration: parseFloat((data.format && data.format.duration) || 0),
      width: v.width || null, height: v.height || null,
      videoCodec: v.codec_name || null, audioCodec: a.codec_name || null,
      hasAudio: Boolean(a.codec_name),
    };
  } catch { return null; }
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

// ---- Produção automatizada (gratuita): cenas ANIMADAS + narração + legendas ----
// Para cada cena (segmento do roteiro):
//   - gera a narração (TTS pt) e mede a duração REAL do áudio;
//   - renderiza um slide base (PNG, identidade visual) em alta resolução;
//   - anima com ffmpeg (zoompan = movimento de câmera lento + fade in/out);
// Depois concatena as cenas, adiciona a trilha de narração contínua e QUEIMA as
// legendas (SRT sincronizado) no vídeo. Resultado: MP4 H.264/AAC real.
async function viaAssembled({ title, script }) {
  if (!ffmpegAvailable()) {
    return errObj('FFMPEG_NOT_AVAILABLE', 'ffmpeg não encontrado. Os binários estáticos (ffmpeg-static) não resolveram; defina FFMPEG_PATH.');
  }
  const { readFileSync } = await import('node:fs');
  const work = join(resolveUploadsDir(), 'ai-videos', 'work-' + randomUUID());
  mkdirSync(work, { recursive: true });
  const FF = config.video.ffmpegPath;
  const W = 1280, H = 720, FPS = 30;
  try {
    const segments = segmentScript(script);

    const scenes = [];
    let subtitles = [];
    let tStart = 0;
    const audioParts = [];

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      // 1) Narração da cena (pt) + duração real.
      const audioPath = join(work, `a${i}.mp3`);
      let dur;
      try {
        dur = await synthesizeNarration(seg.text, audioPath);
      } catch (e) {
        // Falha de TTS NÃO deve gerar vídeo silencioso "como pronto".
        return errObj('TTS_FAILED', 'Falha ao sintetizar a narração: ' + (e.reason || e.message));
      }
      dur = Math.max(2.5, dur + 0.6); // folga para respiração entre cenas
      audioParts.push({ path: audioPath, dur });

      // 2) Slide base (maior que o frame p/ o zoompan ter o que "passear").
      const slidePath = join(work, `s${i}.png`);
      renderSlides({ title, heading: seg.heading, body: seg.text, index: i, total: segments.length, outPath: slidePath, width: 1600, height: 900 });

      // 3) Anima a cena: zoompan (câmera lenta) + fade in/out, escala p/ 1280x720.
      const framesTotal = Math.round(dur * FPS);
      const zoomExpr = `min(zoom+0.0006,1.12)`;
      const scenePath = join(work, `scene${i}.mp4`);
      const vf = [
        `scale=1600:900`,
        `zoompan=z='${zoomExpr}':d=${framesTotal}:s=${W}x${H}:fps=${FPS}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'`,
        `fade=t=in:st=0:d=0.5`,
        `fade=t=out:st=${(dur - 0.5).toFixed(2)}:d=0.5`,
        `format=yuv420p`,
      ].join(',');
      const r = spawnSync(FF, [
        '-y', '-loop', '1', '-i', slidePath,
        '-i', audioPath,
        '-filter_complex', `[0:v]${vf}[v]`,
        '-map', '[v]', '-map', '1:a',
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '128k',
        '-t', dur.toFixed(2), '-r', String(FPS),
        scenePath,
      ], { stdio: 'ignore' });
      if (r.status !== 0) return errObj('VIDEO_ASSEMBLY_FAILED', 'Falha ao animar a cena ' + i);
      scenes.push(scenePath);

      // 4) Legendas da cena a partir do TEXTO NARRADO (não do rótulo),
      //    fatiadas em trechos curtos e distribuídas ao longo da duração.
      const chunks = splitForCaptions(seg.text);
      const per = dur / chunks.length;
      for (let k = 0; k < chunks.length; k++) {
        subtitles.push({ start: tStart + k * per, end: tStart + (k + 1) * per, text: chunks[k] });
      }
      tStart += dur;
    }

    // 5) Concatena as cenas em um vídeo contínuo.
    const listFile = join(work, 'list.txt');
    writeFileSync(listFile, scenes.map((p) => `file '${p}'`).join('\n'));
    const joined = join(work, 'joined.mp4');
    const rc = spawnSync(FF, ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', joined], { stdio: 'ignore' });
    if (rc.status !== 0) return errObj('VIDEO_ASSEMBLY_FAILED', 'Falha ao concatenar as cenas');

    // 6) Gera o SRT e QUEIMA as legendas no vídeo final.
    const srtPath = join(work, 'legendas.srt');
    writeFileSync(srtPath, buildSrt(subtitles));
    const finalPath = join(work, 'final.mp4');
    // Caminho do SRT escapado para o filtro subtitles do ffmpeg.
    const srtEsc = srtPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    const style = "FontSize=22,PrimaryColour=&H00F3F7FA,OutlineColour=&H00143627,BorderStyle=3,Outline=1,Alignment=2,MarginV=30";
    const rb = spawnSync(FF, [
      '-y', '-i', joined,
      '-vf', `subtitles='${srtEsc}':force_style='${style}'`,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-c:a', 'copy',
      finalPath,
    ], { stdio: 'ignore' });
    if (rb.status !== 0) return errObj('VIDEO_ASSEMBLY_FAILED', 'Falha ao gravar as legendas');

    return { __video: readFileSync(finalPath), __srt: readFileSync(srtPath), __subtitles: subtitles };
  } finally {
    try { rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

// Divide o texto da cena em trechos curtos de legenda (por sentença, com limite
// de caracteres), para exibir o que está sendo narrado.
function splitForCaptions(text, maxLen = 64) {
  const clean = String(text).replace(/\s+/g, ' ').trim();
  const sentences = clean.split(/(?<=[.!?])\s+/).filter(Boolean);
  const out = [];
  for (const s of sentences.length ? sentences : [clean]) {
    if (s.length <= maxLen) { out.push(s); continue; }
    // quebra frases longas por palavras
    let cur = '';
    for (const w of s.split(' ')) {
      if ((cur + ' ' + w).trim().length > maxLen) { if (cur) out.push(cur); cur = w; }
      else cur = (cur + ' ' + w).trim();
    }
    if (cur) out.push(cur);
  }
  return out.length ? out : [clean];
}

function pad2(n) { return String(n).padStart(2, '0'); }
function srtTime(sec) {
  const ms = Math.round((sec % 1) * 1000);
  const s = Math.floor(sec) % 60, m = Math.floor(sec / 60) % 60, h = Math.floor(sec / 3600);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${String(ms).padStart(3, '0')}`;
}
function buildSrt(subs) {
  return subs.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.text}\n`).join('\n');
}

function segmentScript(script) {
  // Divide por parágrafos; a 1ª linha curta vira o "heading" da cena. Quando o
  // parágrafo é um texto corrido, usa o começo da 1ª frase como título (sem
  // "Parte N" genérico), preservando sentido do conteúdo.
  const blocks = String(script).split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const chosen = blocks.length ? blocks : [String(script).trim()];
  return chosen.map((b) => {
    const lines = b.split('\n');
    let heading;
    if (lines[0].length <= 70) heading = lines[0];
    else {
      const firstSentence = b.replace(/\s+/g, ' ').split(/(?<=[.!?])\s/)[0];
      heading = firstSentence.length <= 70 ? firstSentence : firstSentence.slice(0, 67).trim() + '...';
    }
    return { heading, text: b };
  });
}
