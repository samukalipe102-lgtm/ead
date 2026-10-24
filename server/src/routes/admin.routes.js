import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { audit, uid } from '../util.js';
import { sendEmail, verifySmtp } from '../mailer.js';
import { smtpConfigured, videoAiConfigured } from '../config.js';
import { videoAiStatus } from '../video.js';
import { generateScript } from '../ai.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// =====================================================================
// GERADOR DE VIDEOAULAS COM IA — fluxo assíncrono por tarefas (video_jobs)
// Etapas distintas: (1) gerar/revisar roteiro, (2) criar job, (3) worker
// processa, (4) admin revisa a prévia, (5) admin PUBLICA na aula.
// =====================================================================

// Status honesto do motor de vídeo (provedor ativo + ffmpeg).
router.get('/video-ai/status', (req, res) => {
  res.json(videoAiStatus());
});

// (1) Gerar/revisar roteiro com IA a partir do conteúdo real da aula.
router.post('/video-ai/script', async (req, res) => {
  const { lessonId, instruction, title } = req.body || {};
  const lesson = lessonId ? get('SELECT * FROM lessons WHERE id = ?', [lessonId]) : null;
  const r = await generateScript({
    title: title || (lesson && lesson.title) || 'Videoaula',
    baseContent: lesson ? lesson.content : (req.body && req.body.baseContent) || '',
    instruction,
  });
  res.json({ ok: true, script: r.script, source: r.source });
});

// (2) Criar a tarefa de geração (QUEUED). O worker processa depois.
router.post('/video-ai/jobs', (req, res) => {
  const { lessonId, title, script, engine } = req.body || {};
  const lesson = get('SELECT * FROM lessons WHERE id = ?', [lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });
  if (!script || !script.trim()) return res.status(400).json({ error: 'Roteiro é obrigatório.' });
  if (!videoAiConfigured()) {
    return res.status(503).json({ ok: false, reason: 'VIDEO_AI_NOT_CONFIGURED', message: 'Nenhum motor de vídeo disponível no servidor.' });
  }
  const id = uid('vj_');
  run(`INSERT INTO video_jobs (id,lesson_id,course_id,title,script,engine,status,created_by)
       VALUES (?,?,?,?,?,?,?,?)`,
    [id, lesson.id, lesson.course_id, title || lesson.title, script.trim(), engine || 'auto', 'QUEUED', req.user.email]);
  audit(req.user.email, 'VIDEO_JOB_CRIADO', `Job ${id} enfileirado para a aula ${lesson.id} (motor ${engine || 'auto'})`);
  res.status(201).json({ ok: true, jobId: id, status: 'QUEUED' });
});

// (3) Acompanhar o estado real: lista de jobs e detalhe.
router.get('/video-ai/jobs', (req, res) => {
  const jobs = all(`SELECT j.*, l.title AS lesson_title FROM video_jobs j
    JOIN lessons l ON l.id = j.lesson_id ORDER BY j.created_at DESC LIMIT 100`);
  res.json({ jobs });
});
router.get('/video-ai/jobs/:id', (req, res) => {
  const job = get('SELECT * FROM video_jobs WHERE id = ?', [req.params.id]);
  if (!job) return res.status(404).json({ error: 'Job não encontrado.' });
  res.json({ job });
});

// Reprocessar um job que falhou (sem gerar cobrança duplicada: reusa o mesmo job).
router.post('/video-ai/jobs/:id/retry', (req, res) => {
  const job = get('SELECT * FROM video_jobs WHERE id = ?', [req.params.id]);
  if (!job) return res.status(404).json({ error: 'Job não encontrado.' });
  if (job.status === 'PROCESSING' || job.status === 'SUBMITTING') {
    return res.status(409).json({ error: 'Job ainda em processamento.' });
  }
  run("UPDATE video_jobs SET status = 'QUEUED', error = NULL, progress = NULL, updated_at = datetime('now') WHERE id = ?", [job.id]);
  audit(req.user.email, 'VIDEO_JOB_RETRY', `Job ${job.id} re-enfileirado`);
  res.json({ ok: true, status: 'QUEUED' });
});

// Cancelar um job ainda não concluído.
router.post('/video-ai/jobs/:id/cancel', (req, res) => {
  const job = get('SELECT * FROM video_jobs WHERE id = ?', [req.params.id]);
  if (!job) return res.status(404).json({ error: 'Job não encontrado.' });
  if (job.status === 'COMPLETED') return res.status(409).json({ error: 'Job já concluído.' });
  run("UPDATE video_jobs SET status = 'CANCELED', updated_at = datetime('now') WHERE id = ?", [job.id]);
  res.json({ ok: true, status: 'CANCELED' });
});

// (5) PUBLICAR na aula — etapa separada e explícita. Só publica job COMPLETED.
// Não apaga histórico: o vídeo anterior da aula é preservado em lessons? Não há
// versionamento de vídeo além do campo atual; registramos no audit a substituição.
router.post('/video-ai/jobs/:id/publish', (req, res) => {
  const job = get('SELECT * FROM video_jobs WHERE id = ?', [req.params.id]);
  if (!job) return res.status(404).json({ error: 'Job não encontrado.' });
  if (job.status !== 'COMPLETED' || !job.result_url) {
    return res.status(400).json({ error: 'Só é possível publicar um vídeo concluído.' });
  }
  const lesson = get('SELECT * FROM lessons WHERE id = ?', [job.lesson_id]);
  const previous = lesson ? lesson.video_url : null;
  run('UPDATE lessons SET video_url = ?, video_status = ?, ai_video_url = ?, ai_video_status = ? WHERE id = ?',
    [job.result_url, 'AVAILABLE', job.result_url, 'DONE', job.lesson_id]);
  run("UPDATE video_jobs SET published = 1, updated_at = datetime('now') WHERE id = ?", [job.id]);
  audit(req.user.email, 'VIDEO_IA_PUBLICADO',
    `Vídeo do job ${job.id} publicado na aula ${job.lesson_id}` + (previous ? ` (substituiu ${previous})` : ''));
  res.json({ ok: true, lessonId: job.lesson_id, videoUrl: job.result_url });
});

// ---- Configuração de e-mail ----
router.get('/email-settings', (req, res) => {
  const s = get('SELECT * FROM email_settings WHERE id = 1') || {};
  res.json({ settings: s, smtpConfigured: smtpConfigured() });
});

router.put('/email-settings', (req, res) => {
  const { destinationEmail, notifyOnEnrollment, notifyOnApproval, notifyOnCert } = req.body || {};
  run(`UPDATE email_settings SET destination_email = ?, notify_on_enrollment = ?, notify_on_approval = ?, notify_on_cert = ? WHERE id = 1`,
    [destinationEmail || null, notifyOnEnrollment ? 1 : 0, notifyOnApproval ? 1 : 0, notifyOnCert ? 1 : 0]);
  audit(req.user.email, 'CONFIG_EMAIL', `Config de e-mail atualizada (destino: ${destinationEmail})`);
  res.json({ ok: true });
});

router.get('/email-logs', (req, res) => {
  res.json({ logs: all('SELECT * FROM email_logs ORDER BY timestamp DESC LIMIT 100') });
});

// Verifica conexão SMTP (sem enviar) — diagnóstico honesto.
router.get('/email-verify', async (req, res) => {
  const result = await verifySmtp();
  res.json(result);
});

// Envia e-mail de TESTE real. Reporta o resultado efetivo (não finge sucesso).
router.post('/email-test', async (req, res) => {
  const s = get('SELECT * FROM email_settings WHERE id = 1');
  const to = (req.body && req.body.to) || (s && s.destination_email);
  if (!to) return res.status(400).json({ error: 'Nenhum e-mail de destino configurado.' });
  const result = await sendEmail({
    to,
    subject: 'Teste de Notificação — Formação Sacerdotal de Umbanda',
    text: 'Este é um e-mail de teste do painel administrativo. Se você recebeu, o envio real por SMTP está funcionando.',
  });
  audit(req.user.email, 'EMAIL_TESTE', `Teste de envio para ${to}: ${result.ok ? 'SUCCESS' : 'FALHA/' + result.reason}`);
  if (result.ok) return res.json({ ok: true });
  res.status(502).json({ ok: false, reason: result.reason, error: result.error });
});

// ---- Usuários ----
router.get('/users', (req, res) => {
  const users = all('SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at DESC');
  const withCourses = users.map((u) => ({
    ...u,
    courses: all('SELECT course_id FROM course_access WHERE user_id = ?', [u.id]).map((r) => r.course_id),
  }));
  res.json({ users: withCourses });
});

// ---- Mensagens (admin) ----
// (as rotas de mensagens em /messages já cobrem admin; aqui só um resumo)
router.get('/messages-summary', (req, res) => {
  const threads = get('SELECT COUNT(*) AS n FROM message_threads').n;
  const messages = get('SELECT COUNT(*) AS n FROM messages').n;
  res.json({ threads, messages });
});

// ---- Notas ----
router.get('/grades', (req, res) => {
  res.json({ grades: all('SELECT * FROM grades ORDER BY date DESC') });
});

// ---- Logs de auditoria ----
router.get('/audit-logs', (req, res) => {
  res.json({ logs: all('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 200') });
});

export default router;
