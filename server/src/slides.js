// Renderização de slides (PNG) SEM dependências externas, na identidade visual
// verde/dourado/marfim. Serve de quadro-base para o motor "assembled": o ffmpeg
// aplica movimento de câmera (zoompan) e fades sobre este quadro, e as legendas
// são queimadas depois — o MP4 final é um vídeo animado real com narração.
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { font5x7 } from './font5x7.js';

const COL = {
  bg: [8, 28, 21], bgBand: [20, 54, 39], gold: [212, 175, 55], ivory: [247, 243, 233], dim: [226, 211, 183],
};

function deaccent(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\x7F]/g, (c) => ({ 'Ç': 'C', 'ç': 'c', '“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...' }[c] || ' '));
}
function wrap(text, maxChars) {
  const words = String(text).replace(/\s+/g, ' ').trim().split(' ');
  const lines = []; let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars) { if (cur) lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines;
}

function makeDrawer(px, W, H) {
  const setPx = (x, y, c) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
  };
  const drawChar = (ch, x, y, scale, color) => {
    const glyph = font5x7[ch] || font5x7['?'];
    for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) {
      if (glyph[r] & (1 << (4 - c))) for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) setPx(x + c * scale + sx, y + r * scale + sy, color);
    }
  };
  const drawText = (text, x, y, scale, color) => {
    const up = deaccent(text).toUpperCase(); let cx = x;
    for (const ch of up) { drawChar(ch, cx, y, scale, color); cx += (5 + 1) * scale; }
  };
  return { setPx, drawText };
}

function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(px, W, H) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

export function renderSlides({ title, heading, body, index, total, outPath, width = 1280, height = 720 }) {
  const W = width, H = height;
  const px = Buffer.alloc(W * H * 4, 255);
  const { setPx, drawText } = makeDrawer(px, W, H);
  const S = W / 1280; // fator de escala proporcional
  const sc = (n) => Math.max(1, Math.round(n * S));

  // fundo
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) setPx(x, y, COL.bg);
  // faixas douradas (topo/base)
  const band = sc(10);
  for (let y = 0; y < band; y++) for (let x = 0; x < W; x++) setPx(x, y, COL.gold);
  for (let y = H - band; y < H; y++) for (let x = 0; x < W; x++) setPx(x, y, COL.gold);

  const marginX = sc(60);
  // Título do curso
  drawText((title || '').slice(0, 54), marginX, sc(50), sc(3), COL.gold);
  // linha divisória
  for (let x = marginX; x < W - marginX; x++) setPx(x, sc(110), COL.gold);
  // Cabeçalho do segmento
  let y = sc(150);
  for (const l of wrap(heading || '', 46).slice(0, 2)) { drawText(l, marginX, y, sc(4), COL.ivory); y += sc(44); }
  y += sc(20);
  // Corpo
  for (const l of wrap(body || '', 58).slice(0, 11)) { drawText(l, marginX, y, sc(3), COL.dim); y += sc(34); }
  // Rodapé: numeração
  drawText(`${index + 1} / ${total}`, W - sc(200), H - sc(55), sc(3), COL.gold);

  writeFileSync(outPath, encodePNG(px, W, H));
}
