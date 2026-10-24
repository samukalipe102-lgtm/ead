import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync } from 'node:fs';

import { config, resolveDbPath, resolveUploadsDir, effectiveJwtSecret, smtpConfigured, aiConfigured, videoAiConfigured } from './config.js';
import { initDb } from './db/index.js';
import { seed } from './db/seed.js';

import authRoutes from './routes/auth.routes.js';
import coursesRoutes from './routes/courses.routes.js';
import enrollmentsRoutes from './routes/enrollments.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import aiRoutes from './routes/ai.routes.js';
import adminRoutes from './routes/admin.routes.js';
import miscRoutes from './routes/misc.routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Inicialização do banco ---
const dbPath = resolveDbPath();
initDb(dbPath);
seed(); // idempotente: só insere o que falta, nunca sobrescreve dados reais

// Verificação do segredo JWT (falha cedo em produção se ausente)
try { effectiveJwtSecret(); } catch (e) {
  console.error('ERRO DE CONFIGURAÇÃO:', e.message);
  process.exit(1);
}

const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '2mb' }));

// Health/diagnóstico — expõe o estado REAL das integrações (sem segredos).
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    integrations: {
      database: existsSync(dbPath),
      smtp: smtpConfigured(),
      aiTutor: aiConfigured(),
      aiVideo: videoAiConfigured(),
    },
  });
});

// Servir os vídeos gerados por IA (e outros uploads) de forma pública.
app.use('/uploads', express.static(resolveUploadsDir()));

app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/ai-tutor', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', miscRoutes);

// --- Servir o frontend web (SPA) ---
const webDir = join(__dirname, '..', '..', 'web');
if (existsSync(webDir)) {
  app.use(express.static(webDir));
  // Fallback SPA para rotas não-API
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(join(webDir, 'index.html'));
  });
}

// Handler de erro central
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ error: 'Erro interno do servidor.' });
});

export function start() {
  return app.listen(config.port, () => {
    console.log(`\n🌿 Servidor EAD Umbanda ouvindo em http://localhost:${config.port}`);
    console.log(`   Banco:       ${dbPath}`);
    console.log(`   SMTP:        ${smtpConfigured() ? 'configurado' : 'NÃO configurado (e-mails reportarão indisponível)'}`);
    console.log(`   Tutor de IA: ${aiConfigured() ? 'configurado (' + config.ai.provider + ')' : 'NÃO configurado (recurso indisponível)'}`);
    console.log(`   Vídeo IA:    ${videoAiConfigured() ? 'configurado (Hugging Face, ' + config.video.model + ')' : 'NÃO configurado (geração de vídeo indisponível)'}`);
  });
}

// Inicia somente quando executado diretamente (permite testes importarem app).
if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

export { app };
