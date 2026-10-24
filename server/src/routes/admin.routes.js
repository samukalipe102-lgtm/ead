import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { audit } from '../util.js';
import { sendEmail, verifySmtp } from '../mailer.js';
import { smtpConfigured, videoAiConfigured } from '../config.js';
import { generateVideo, videoAiStatus } from '../video.js';

const router = Router();
router.use(requireAuth, requireAdmin);

// ---- Geração de vídeo por IA (gratuita via Hugging Face) ----

// Status honesto da integração de vídeo.
router.get('/video-ai/status', (req, res) => {
  res.json(videoAiStatus());
});

// Solicita a geração de vídeo para uma aula. Estados reais na própria aula:
// PROCESSING durante a geração; DONE + video_url/video_status=AVAILABLE no sucesso;
// FAILED em erro. Nunca marca sucesso sem ter o arquivo de vídeo real.
router.post('/video-ai/lessons/:lessonId/generate', async (req, res) => {
  const lesson = get('SELECT * FROM lessons WHERE id = ?', [req.params.lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });
  if (!videoAiConfigured()) {
    return res.status(503).json({
      ok: false,
      reason: 'VIDEO_AI_NOT_CONFIGURED',
      message: 'Geração de vídeo por IA não configurada. Defina HF_TOKEN (Hugging Face, gratuito) no servidor.',
    });
  }

  // Monta o prompt a partir do conteúdo real da aula (sem inventar conteúdo).
  const prompt = (req.body && req.body.prompt && req.body.prompt.trim())
    || `Vídeo educativo ilustrativo e sóbrio sobre: ${lesson.title}. Estilo respeitoso e didático.`;

  run('UPDATE lessons SET ai_video_status = ? WHERE id = ?', ['PROCESSING', lesson.id]);
  audit(req.user.email, 'VIDEO_IA_SOLICITADO', `Geração de vídeo IA para a aula ${lesson.id}`);

  const result = await generateVideo(prompt);

  if (!result.ok) {
    const status = result.reason === 'MODEL_LOADING' ? 'PROCESSING' : 'FAILED';
    run('UPDATE lessons SET ai_video_status = ? WHERE id = ?', [status, lesson.id]);
    audit(req.user.email, 'VIDEO_IA_FALHA', `Falha (${result.reason}) na aula ${lesson.id}`);
    const code = result.reason === 'MODEL_LOADING' ? 202 : 502;
    return res.status(code).json({ ok: false, reason: result.reason, error: result.error, status });
  }

  // Sucesso REAL: arquivo salvo. Associa à aula e marca o vídeo como disponível.
  run('UPDATE lessons SET ai_video_status = ?, ai_video_url = ?, video_url = ?, video_status = ? WHERE id = ?',
    ['DONE', result.publicPath, result.publicPath, 'AVAILABLE', lesson.id]);
  audit(req.user.email, 'VIDEO_IA_CONCLUIDO', `Vídeo IA (${result.bytes} bytes) associado à aula ${lesson.id}`);
  res.json({ ok: true, videoUrl: result.publicPath, aiVideoStatus: 'DONE' });
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
