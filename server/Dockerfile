# Imagem de produção do backend EAD Umbanda.
# A geração gratuita de videoaulas (motor "assembled") usa:
#  - ffmpeg: fornecido pelo pacote npm "ffmpeg-static" (binário embutido, sem apt).
#  - narração (TTS): "meSpeak" (eSpeak em JS, voz pt embutida) — sem binário de SO.
# Portanto NÃO é necessário instalar ffmpeg/espeak via apt; tudo vem no npm install.
# (Opcional) Para vozes de melhor qualidade, defina OPENAI_API_KEY no ambiente.
FROM node:22-slim

# Dependências de sistema mínimas. ffmpeg-static traz um binário estático próprio;
# ainda assim incluímos libs comuns de fontes/áudio para máxima compatibilidade.
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências primeiro (cache de camada).
COPY server/package*.json ./server/
RUN cd server && npm ci --omit=dev

# Copia o backend e o frontend já compilado (o backend serve o web/).
COPY server ./server
COPY web ./web

# Dados persistentes (banco + uploads/vídeos) em volume. NÃO versionado.
# Em produção, monte um volume em /data para preservar após reinícios.
ENV DB_PATH=/data/umbanda.db \
    UPLOADS_DIR=/data/uploads \
    NODE_ENV=production \
    PORT=4000
VOLUME ["/data"]

EXPOSE 4000
WORKDIR /app/server
CMD ["node", "src/index.js"]
