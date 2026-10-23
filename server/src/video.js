// Geração de vídeo por IA — integração REAL e GRATUITA via Hugging Face
// Inference Providers (modelos text-to-video de código aberto).
//
// Honestidade:
//  - A chave (HF_TOKEN) fica SOMENTE no servidor (nunca no frontend/executável).
//  - Sem token, a função reporta "não configurado" (não fabrica vídeo/links).
//  - Estados reais: a aula passa por REQUESTED -> PROCESSING -> DONE | FAILED.
//  - O vídeo é salvo em disco e associado à aula; nada é inventado.
//
// Referência: https://huggingface.co/docs/inference-providers/tasks/text-to-video
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { config, videoAiConfigured, resolveUploadsDir } from './config.js';

export function videoAiStatus() {
  return {
    configured: videoAiConfigured(),
    provider: videoAiConfigured() ? config.video.hfProvider : null,
    model: videoAiConfigured() ? config.video.model : null,
  };
}

// Gera o vídeo a partir do prompt. Retorna { ok, fileName } ou { ok:false, reason }.
// Guarda o arquivo em uploads/ai-videos/<id>.mp4 e devolve a URL pública servida
// pelo backend em /uploads/ai-videos/<id>.mp4.
export async function generateVideo(prompt) {
  if (!videoAiConfigured()) {
    return { ok: false, reason: 'VIDEO_AI_NOT_CONFIGURED' };
  }
  if (!prompt || !prompt.trim()) {
    return { ok: false, reason: 'EMPTY_PROMPT' };
  }

  // Endpoint do roteador de Inference Providers do Hugging Face.
  const url = `https://router.huggingface.co/${config.video.hfProvider}/v1/video/generations`;

  // Alguns provedores expõem a task via o endpoint unificado do HF Hub.
  // Usamos o formato documentado (inputs + model) com fallback de parsing.
  const hubUrl = `https://api-inference.huggingface.co/models/${config.video.model}`;

  try {
    // 1ª tentativa: endpoint de modelo do HF (retorna bytes do vídeo direto).
    let res = await fetch(hubUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.video.hfToken}`,
        'Content-Type': 'application/json',
        Accept: 'video/mp4',
      },
      body: JSON.stringify({
        inputs: prompt.trim(),
        parameters: { num_frames: 49, num_inference_steps: 25 },
      }),
    });

    if (res.status === 503) {
      // Modelo carregando (cold start). Sinaliza processamento ao chamador.
      return { ok: false, reason: 'MODEL_LOADING' };
    }
    if (!res.ok) {
      const detail = await safeText(res);
      return { ok: false, reason: 'VIDEO_REQUEST_FAILED', error: `HTTP ${res.status} ${detail}` };
    }

    const contentType = res.headers.get('content-type') || '';
    let bytes;
    if (contentType.startsWith('video/')) {
      bytes = Buffer.from(await res.arrayBuffer());
    } else {
      // Alguns provedores retornam JSON com URL do vídeo; buscamos os bytes.
      const data = await res.json();
      const videoUrl = data?.video?.url || data?.url || (Array.isArray(data) && data[0]?.url);
      if (!videoUrl) return { ok: false, reason: 'VIDEO_EMPTY_RESPONSE' };
      const vr = await fetch(videoUrl);
      if (!vr.ok) return { ok: false, reason: 'VIDEO_DOWNLOAD_FAILED' };
      bytes = Buffer.from(await vr.arrayBuffer());
    }

    if (!bytes || bytes.length < 1024) {
      return { ok: false, reason: 'VIDEO_EMPTY_RESPONSE' };
    }

    const dir = join(resolveUploadsDir(), 'ai-videos');
    mkdirSync(dir, { recursive: true });
    const fileName = `${randomUUID()}.mp4`;
    writeFileSync(join(dir, fileName), bytes);
    return { ok: true, fileName, publicPath: `/uploads/ai-videos/${fileName}`, bytes: bytes.length };
  } catch (err) {
    return { ok: false, reason: 'VIDEO_REQUEST_FAILED', error: String(err && err.message ? err.message : err) };
  }
}

async function safeText(res) {
  try { return (await res.text()).slice(0, 200); } catch { return ''; }
}
