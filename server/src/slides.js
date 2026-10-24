// Renderização de slides (PNG) SEM dependências externas, na identidade visual
// verde/dourado/marfim. Cada slide tem fundo, faixa dourada, título do curso,
// cabeçalho do segmento e o corpo do texto quebrado em linhas.
//
// Nota: é um gerador de bitmap simples (fonte própria de blocos). O objetivo é
// produzir quadros legíveis para a videoaula montada (motor "assembled"). O MP4
// final é um vídeo real (com narração), não uma sequência de imagens isoladas.
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { font5x7 } from './font5x7.js';

const W = 1280, H = 720;
const COL = {
  bg: [8, 28, 21], bgBand: [20, 54, 39], gold: [212, 175, 55], ivory: [247, 243, 233], dim: [226, 211, 183],
};

function newCanvas() {
  const px = Buffer.alloc(W * H * 4, 255);
  // fundo
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) setPx(px, x, y, COL.bg);
  // faixa superior dourada
  for (let y = 0; y < 10; y++) for (let x = 0; x < W; x++) setPx(px, x, y, COL.gold);
  for (let y = H - 10; y < H; y++) for (let x = 0; x < W; x++) setPx(px, x, y, COL.gold);
  return px;
}
function setPx(px, x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4; px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 255;
}

// Desenha um caractere escalado a partir da fonte 5x7.
function drawChar(px, ch, x, y, scale, color) {
  const glyph = font5x7[ch] || font5x7['?'];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (glyph[r] & (1 << (4 - c))) {
        for (let sy = 0; sy < scale; sy++) for (let sx = 0; sx < scale; sx++) setPx(px, x + c * scale + sx, y + r * scale + sy, color);
      }
    }
  }
}
// Transliteração: a fonte bitmap é ASCII; convertemos acentos do português para
// as letras-base (É->E, Ç->C, Ã->A, etc.) para evitar caracteres quebrados.
function deaccent(s) {
  return String(s)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/[^\x00-\x7F]/g, (c) => ({ 'Ç': 'C', 'ç': 'c', '“': '"', '”': '"', '‘': "'", '’': "'", '–': '-', '—': '-', '…': '...' }[c] || ' '));
}
function drawText(px, text, x, y, scale, color) {
  const up = deaccent(text).toUpperCase();
  let cx = x;
  for (const ch of up) { drawChar(px, ch, cx, y, scale, color); cx += (5 + 1) * scale; }
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

// Codificador PNG mínimo (RGBA).
function crc32(buf) { let c = ~0; for (let i = 0; i < buf.length; i++) { c ^= buf[i]; for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1)); } return ~c >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(px) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((W * 4 + 1) * H);
  for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; px.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4); }
  const idat = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

export function renderSlides({ title, heading, body, index, total, outPath }) {
  const px = newCanvas();
  // Título do curso (topo)
  drawText(px, (title || '').slice(0, 54), 60, 50, 3, COL.gold);
  // Linha divisória dourada
  for (let x = 60; x < W - 60; x++) setPx(px, x, 110, COL.gold);
  // Cabeçalho do segmento
  const headLines = wrap(heading || '', 46);
  let y = 150;
  for (const l of headLines.slice(0, 2)) { drawText(px, l, 60, y, 4, COL.ivory); y += 44; }
  y += 20;
  // Corpo
  const bodyLines = wrap(body || '', 58);
  for (const l of bodyLines.slice(0, 11)) { drawText(px, l, 60, y, 3, COL.dim); y += 34; }
  // Rodapé: numeração do slide
  drawText(px, `${index + 1} / ${total}`, W - 200, H - 55, 3, COL.gold);
  writeFileSync(outPath, encodePNG(px));
}
