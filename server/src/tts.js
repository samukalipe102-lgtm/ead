// Narração (text-to-speech) para o motor "assembled" (produção automatizada).
// Precedência honesta, sem fabricar áudio:
//   1) OpenAI TTS (se OPENAI_API_KEY) — voz natural, pago por uso.
//   2) meSpeak (eSpeak em JS/WASM, voz pt EMBUTIDA) — offline, grátis, sem binário
//      de sistema. É o backend padrão gratuito (funciona em contêiner mínimo).
//   3) espeak-ng / espeak / pico2wave (se instalados no SO) — offline, grátis.
//   4) Sem nenhum => erro claro.
//
// Retorna a DURAÇÃO real do áudio (segundos), medida via ffprobe, para
// sincronizar cena + legenda com a narração.
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { config } from './config.js';

const require = createRequire(import.meta.url);

let _mespeak = null;
function loadMespeak() {
  if (_mespeak !== null) return _mespeak;
  try {
    const m = require('mespeak');
    m.loadConfig(require('mespeak/src/mespeak_config.json'));
    try { m.loadVoice(require('mespeak/voices/pt.json')); }
    catch { m.loadVoice(require('mespeak/voices/pt-pt.json')); }
    _mespeak = m;
  } catch { _mespeak = false; }
  return _mespeak;
}

function hasBin(bin, arg = '--version') {
  try { return spawnSync(bin, [arg], { stdio: 'ignore' }).status === 0; } catch { return false; }
}

export function ttsBackend() {
  if (config.ai.openaiKey) return 'openai';
  if (loadMespeak()) return 'mespeak';
  if (hasBin('espeak-ng')) return 'espeak-ng';
  if (hasBin('espeak')) return 'espeak';
  if (hasBin('pico2wave', '--help')) return 'pico2wave';
  return null;
}

// Gera o áudio em `outMp3Path` e devolve a duração (segundos).
export async function synthesizeNarration(text, outMp3Path) {
  const backend = ttsBackend();
  if (!backend) {
    const e = new Error('TTS_NOT_AVAILABLE');
    e.reason = 'TTS_NOT_AVAILABLE';
    throw e;
  }
  if (backend === 'openai') await openaiTts(text, outMp3Path);
  else if (backend === 'mespeak') mespeakTts(text, outMp3Path);
  else if (backend === 'espeak-ng' || backend === 'espeak') espeakTts(backend, text, outMp3Path);
  else if (backend === 'pico2wave') picoTts(text, outMp3Path);
  return probeDuration(outMp3Path);
}

export function ttsBackendLabel() {
  const b = ttsBackend();
  const map = { openai: 'OpenAI TTS', mespeak: 'meSpeak (pt, offline)', 'espeak-ng': 'espeak-ng (pt-br)', espeak: 'espeak (pt-br)', pico2wave: 'pico2wave (pt-BR)' };
  return b ? map[b] : null;
}

async function openaiTts(text, outMp3Path) {
  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.ai.openaiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'alloy', input: text.slice(0, 4000), format: 'mp3' }),
  });
  if (!res.ok) { const e = new Error('OPENAI_TTS_FAILED HTTP ' + res.status); e.reason = 'OPENAI_TTS_FAILED'; throw e; }
  writeFileSync(outMp3Path, Buffer.from(await res.arrayBuffer()));
}

// meSpeak: gera WAV (buffer) com voz pt embutida; converte para MP3 via ffmpeg.
function mespeakTts(text, outMp3Path) {
  const m = loadMespeak();
  if (!m) throw new Error('MESPEAK_UNAVAILABLE');
  // speed menor => fala mais pausada e inteligível para aula.
  const wavBuf = m.speak(text, { rawdata: 'buffer', speed: 148, pitch: 50, voice: 'pt' });
  if (!wavBuf || !wavBuf.length) throw new Error('MESPEAK_EMPTY');
  const wav = outMp3Path.replace(/\.mp3$/, '.wav');
  writeFileSync(wav, Buffer.from(wavBuf));
  const c = spawnSync(config.video.ffmpegPath, ['-y', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '128k', outMp3Path], { stdio: 'ignore' });
  if (c.status !== 0) throw new Error('MESPEAK_CONVERT_FAILED');
}

function espeakTts(bin, text, outMp3Path) {
  const wav = outMp3Path.replace(/\.mp3$/, '.wav');
  let r = spawnSync(bin, ['-v', 'pt-br', '-s', '150', '-w', wav, text], { stdio: 'ignore' });
  if (r.status !== 0) r = spawnSync(bin, ['-s', '150', '-w', wav, text], { stdio: 'ignore' });
  if (r.status !== 0) throw new Error('ESPEAK_FAILED');
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

function probeDuration(path) {
  const r = spawnSync(config.video.ffprobePath, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], { encoding: 'utf8' });
  const d = parseFloat((r.stdout || '').trim());
  return (!Number.isNaN(d) && d > 0) ? d : 5;
}
