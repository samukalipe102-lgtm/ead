import 'dotenv/config';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export const config = {
  port: Number(process.env.PORT || 4000),
  // JWT: segredo OBRIGATÓRIO em produção. Em dev gera um aviso.
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // Caminho do banco. Default: ./data/umbanda.db (não versionado).
  dbPath: process.env.DB_PATH || join(ROOT, 'data', 'umbanda.db'),
  uploadsDir: process.env.UPLOADS_DIR || join(ROOT, 'data', 'uploads'),

  // SMTP — credenciais ficam SOMENTE no servidor, nunca no frontend/executável.
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  },

  // Tutor de IA (opcional). Sem chave => recurso reporta-se indisponível.
  ai: {
    provider: process.env.AI_PROVIDER || '', // 'gemini' | 'openai' | ''
    geminiKey: process.env.GEMINI_API_KEY || '',
    openaiKey: process.env.OPENAI_API_KEY || '',
  },

  // Geração de vídeo por IA — MÚLTIPLOS provedores. O servidor detecta
  // automaticamente qual usar pela chave presente (precedência: VIDEO_AI_PROVIDER
  // explícito > Hugging Face > Replicate > endpoint genérico). As chaves ficam
  // SOMENTE no servidor (nunca no frontend/executável).
  video: {
    // Força um provedor específico: 'huggingface' | 'replicate' | 'custom'.
    provider: process.env.VIDEO_AI_PROVIDER || '',

    // Hugging Face Inference Providers (GRATUITO, sem cartão).
    hfToken: process.env.HF_TOKEN || '',
    hfProvider: process.env.HF_VIDEO_PROVIDER || 'fal-ai',
    hfModel: process.env.HF_VIDEO_MODEL || 'Wan-AI/Wan2.2-TI2V-5B',

    // Replicate (tem créditos free/trial; muitos modelos text-to-video).
    replicateToken: process.env.REPLICATE_API_TOKEN || '',
    // Versão do modelo no Replicate (owner/name ou hash de versão).
    replicateModel: process.env.REPLICATE_VIDEO_MODEL || 'wan-video/wan-2.2-t2v-fast',

    // Endpoint genérico (qualquer API compatível OpenAI-like de vídeo, self-host, etc.).
    customUrl: process.env.VIDEO_AI_URL || '',
    customKey: process.env.VIDEO_AI_KEY || '',
    customModel: process.env.VIDEO_AI_MODEL || '',
  },

  corsOrigin: process.env.CORS_ORIGIN || '*',
  isProd: process.env.NODE_ENV === 'production',
};

export function resolveDbPath() {
  const p = isAbsolute(config.dbPath) ? config.dbPath : join(ROOT, config.dbPath);
  mkdirSync(dirname(p), { recursive: true });
  return p;
}

export function resolveUploadsDir() {
  const p = isAbsolute(config.uploadsDir) ? config.uploadsDir : join(ROOT, config.uploadsDir);
  mkdirSync(p, { recursive: true });
  return p;
}

// Segredo efetivo do JWT: em produção exige configuração explícita.
export function effectiveJwtSecret() {
  if (config.jwtSecret) return config.jwtSecret;
  if (config.isProd) {
    throw new Error('JWT_SECRET não definido. Configure a variável de ambiente em produção.');
  }
  return 'dev-insecure-secret-change-me';
}

export function smtpConfigured() {
  return Boolean(config.smtp.host && config.smtp.user && config.smtp.pass);
}

export function aiConfigured() {
  if (config.ai.provider === 'gemini') return Boolean(config.ai.geminiKey);
  if (config.ai.provider === 'openai') return Boolean(config.ai.openaiKey);
  return false;
}

// Resolve qual provedor de vídeo está ativo, pela chave presente ou escolha explícita.
// Retorna 'huggingface' | 'replicate' | 'custom' | null.
export function resolveVideoProvider() {
  const v = config.video;
  if (v.provider) {
    if (v.provider === 'huggingface' && v.hfToken) return 'huggingface';
    if (v.provider === 'replicate' && v.replicateToken) return 'replicate';
    if (v.provider === 'custom' && v.customUrl) return 'custom';
    return null; // forçado mas sem credencial
  }
  if (v.hfToken) return 'huggingface';
  if (v.replicateToken) return 'replicate';
  if (v.customUrl) return 'custom';
  return null;
}

export function videoAiConfigured() {
  return resolveVideoProvider() !== null;
}
