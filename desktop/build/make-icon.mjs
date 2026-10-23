// Gerador de ícone SEM dependências externas.
// Rasteriza o símbolo (círculo verde, borda dourada, folha marfim) em PNGs de
// vários tamanhos e empacota em um .ico válido (PNG-embedded) para o Windows,
// além de um icon.png para Linux/preview.
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = dirname(fileURLToPath(import.meta.url));

// --- paleta ---
const C = {
  bgOuter: [8, 28, 21], bgInner: [27, 67, 50],
  gold: [212, 175, 55], goldDim: [197, 160, 40],
  leaf: [45, 106, 79], ivory: [226, 211, 183],
};

function lerp(a, b, t) { return [Math.round(a[0]+(b[0]-a[0])*t), Math.round(a[1]+(b[1]-a[1])*t), Math.round(a[2]+(b[2]-a[2])*t)]; }

// Desenha o ícone num buffer RGBA de tamanho S.
function draw(S) {
  const px = Buffer.alloc(S * S * 4, 0);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= S || y >= S) return;
    const i = (y * S + x) * 4;
    px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a;
  };
  const cx = S / 2, cy = S / 2;
  const rCorner = S * 0.215;        // cantos arredondados do fundo
  const rGold = S * 0.383;          // borda dourada
  const goldW = S * 0.024;
  const rInnerStroke = S * 0.336;

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      // Fundo com cantos arredondados (squircle simples)
      const dxE = Math.max(0, Math.abs(x - cx) - (S/2 - rCorner));
      const dyE = Math.max(0, Math.abs(y - cy) - (S/2 - rCorner));
      if (Math.hypot(dxE, dyE) > rCorner) continue; // fora do rounded rect

      // Gradiente radial do fundo
      const dC = Math.hypot(x - cx, y - cy) / (S * 0.6);
      set(x, y, lerp(C.bgInner, C.bgOuter, Math.min(1, dC)));

      const d = Math.hypot(x - cx, y - cy);
      // Borda dourada externa
      if (Math.abs(d - rGold) <= goldW) set(x, y, C.gold);
      // Linha dourada interna fina
      if (Math.abs(d - rInnerStroke) <= S * 0.006) set(x, y, C.goldDim);
      // Ponto dourado superior
      if (Math.hypot(x - cx, y - (cy - S*0.25)) <= S*0.024) set(x, y, C.gold);
    }
  }

  // Folha: elipse vertical centrada, com nervura dourada.
  const leafTop = cy - S*0.207, leafBot = cy + S*0.227;
  const leafH = (leafBot - leafTop) / 2;
  const leafCy = (leafTop + leafBot) / 2;
  const leafW = S * 0.16;
  for (let y = Math.floor(leafTop); y <= leafBot; y++) {
    for (let x = Math.floor(cx - leafW); x <= cx + leafW; x++) {
      const ny = (y - leafCy) / leafH;
      // largura da folha varia como função (pontas afiladas)
      const w = leafW * Math.cos(ny * 1.15) * (1 - 0.15 * Math.abs(ny));
      if (Math.abs(x - cx) <= w && Math.abs(ny) <= 1) {
        // contorno marfim
        const edge = Math.abs(x - cx) > w - S*0.012;
        set(x, y, edge ? C.ivory : C.leaf);
      }
    }
  }
  // Nervura central dourada + nervuras laterais
  for (let y = Math.floor(leafTop + leafH*0.1); y <= leafBot - leafH*0.1; y++) {
    set(cx, y, C.gold); set(cx+1, y, C.gold);
  }
  return px;
}

// --- Encoder PNG (RGBA) sem dependências ---
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, 'ascii');
  const body = Buffer.concat([t, data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(px, S) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(S, 0); ihdr.writeUInt32BE(S, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit, RGBA
  const raw = Buffer.alloc((S * 4 + 1) * S);
  for (let y = 0; y < S; y++) {
    raw[y * (S*4+1)] = 0; // filter none
    px.copy(raw, y * (S*4+1) + 1, y * S * 4, (y+1) * S * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// --- .ico (com PNGs embutidos) ---
function encodeICO(entries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(entries.length, 4);
  const dir = Buffer.alloc(16 * entries.length);
  let offset = 6 + dir.length;
  const blobs = [];
  entries.forEach((e, i) => {
    const b = i * 16;
    dir[b] = e.size >= 256 ? 0 : e.size;
    dir[b+1] = e.size >= 256 ? 0 : e.size;
    dir[b+2] = 0; dir[b+3] = 0;
    dir.writeUInt16LE(1, b+4); dir.writeUInt16LE(32, b+6);
    dir.writeUInt32LE(e.png.length, b+8);
    dir.writeUInt32LE(offset, b+12);
    offset += e.png.length;
    blobs.push(e.png);
  });
  return Buffer.concat([header, dir, ...blobs]);
}

const icoSizes = [16, 24, 32, 48, 64, 128, 256];
const entries = icoSizes.map((s) => ({ size: s, png: encodePNG(draw(s), s) }));
writeFileSync(join(outDir, 'icon.ico'), encodeICO(entries));
writeFileSync(join(outDir, 'icon.png'), encodePNG(draw(512), 512));
console.log('Ícone gerado: icon.ico (' + icoSizes.join(',') + ') e icon.png (512).');
