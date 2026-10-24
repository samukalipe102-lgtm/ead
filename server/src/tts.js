// Narração (text-to-speech) para o motor "assembled" (produção automatizada).
// Precedência honesta, sem fabricar áudio:
//   1) OpenAI TTS (se OPENAI_API_KEY) — qualidade alta, pago por uso.
//   2) espeak-ng / espeak / pico2wave (se instalado no servidor) — offline, grátis.
//   3) Sem nenhum => erro claro informando o que instalar/configurar.
//
// Retorna a DURAÇÃO real do áudio (segundos), medida via ffprobe/ffmpeg, para
// sincronizar o slide com a narração.
import { spawnSync } from 'node:child_process';
import { writeFileSync, existsSync, renameSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config } from './config.js';

function has(bin) {
  try { return spawnSync(bin, ['--version'], { stdio: 'ignore' }).status === 0; }
  catch { return false; }
}

export function ttsBackend() {
  if (config.ai.openaiKey) return 'openai';
  if (has('espeak-ng')) return 'espeak-ng';
  if (has('espeak')) return 'espeak';
  if (spawnSync('pico2wave', ['--help'], { stdio: 'ignore' }).status === 0) return 'pico2wave';
  return null;
}

// Gera o arquivo de áudio em `outMp3Path` e devolve a duração em segundos.
export async function synthesizeNarration(text, outMp3Path) {
  const backend = ttsBackend();
  if (!backend) {
    const e = new Error('TTS_NOT_AVAILABLE: configure OPENAI_API_KEY ou instale espeak-ng/pico2wave no servidor.');
    e.reason = 'TTS_NOT_AVAILABLE';
    throw e;
  }

  if (backend === 'openai') {
    await openaiTts(text, outMp3Path);
  } else if (backend === 'espeak-ng' || backend === 'espeak') {
    espeakTts(backend, text, outMp3Path);
  } else if (backend === 'pico2wave') {
    picoTts(text, outMp3Path);
  }
  return probeDuration(outMp3Path);
}

async function openaiTts(text, outMp3Path) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ai.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'alloy', input: text.slice(0, 4000), format: 'mp3' }),
  });
  if (!res.ok) {
    const e = new Error('OPENAI_TTS_FAILED HTTP ' + res.status);
    e.reason = 'OPENAI_TTS_FAILED';
    throw e;
  }
  writeFileSync(outMp3Path, Buffer.from(await res.arrayBuffer()));
}

// espeak gera WAV; convertemos para MP3 com ffmpeg (pt-br quando disponível).
function espeakTts(bin, text, outMp3Path) {
  const wav = outMp3Path.replace(/\.mp3$/, '.wav');
  const r = spawnSync(bin, ['-v', 'pt-br', '-s', '150', '-w', wav, text], { stdio: 'ignore' });
  if (r.status !== 0) {
    // tenta sem voz pt-br
    const r2 = spawnSync(bin, ['-s', '150', '-w', wav, text], { stdio: 'ignore' });
    if (r2.status !== 0) throw new Error('ESPEAK_FAILED');
  }
  const c = spawnSync(config.video.ffmpegPath, ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', outMp3Path], { stdio: 'ignore' });
  if (c.status !== 0) throw new Error('ESPEAK_CONVERT_FAILED');
}

function picoTts(text, outMp3Path) {
  const wav = outMp3Path.replace(/\.mp3$/, '.wav');
  const r = spawnSync('pico2wave', ['-l', 'pt-BR', '-w', wav, text], { stdio: 'ignore' });
  if (r.status !== 0) throw new Error('PICO_FAILED');
  const c = spawnSync(config.video.ffmpegPath, ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', outMp3Path], { stdio: 'ignore' });
  if (c.status !== 0) throw new Error('PICO_CONVERT_FAILED');
}

// Mede a duração real do áudio com ffprobe; fallback por estimativa de leitura.
function probeDuration(path) {
  const ffprobe = config.video.ffmpegPath.replace(/ffmpeg$/, 'ffprobe');
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], { encoding: 'utf8' });
  const d = parseFloat((r.stdout || '').trim());
  if (!Number.isNaN(d) && d > 0) return d;
  return 5; // fallback seguro
}
