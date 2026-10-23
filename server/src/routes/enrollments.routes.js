import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { all, get, run, tx } from '../db/index.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { audit, uid } from '../util.js';
import { sendEmail } from '../mailer.js';
import { config } from '../config.js';

const router = Router();

// Solicitação pública de inscrição (fluxo: PENDING -> ADMIN decide).
router.post('/request', async (req, res) => {
  const { name, email, courseId } = req.body || {};
  if (!name || !email || !courseId) {
    return res.status(400).json({ error: 'Nome, e-mail e curso são obrigatórios.' });
  }
  const course = get('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) return res.status(404).json({ error: 'Curso não encontrado.' });

  const id = uid('e_');
  run('INSERT INTO enrollments (id,user_name,email,course_id,course_title,status,notes) VALUES (?,?,?,?,?,?,?)',
    [id, name, String(email).toLowerCase(), courseId, course.title, 'PENDING', 'Solicitação via formulário do portal']);
  audit(email, 'SOLICITACAO_MATRICULA', `Nova solicitação de ${name} para ${course.title}`);

  // Notificação REAL ao admin (se configurado). O resultado do envio é honesto.
  const settings = get('SELECT * FROM email_settings WHERE id = 1');
  let emailResult = { ok: false, reason: 'NOTIFY_DISABLED' };
  if (settings && settings.notify_on_enrollment && settings.destination_email) {
    emailResult = await sendEmail({
      to: settings.destination_email,
      subject: `Nova solicitação de matrícula — ${name}`,
      text: `Nova solicitação de inscrição.\n\nCandidato: ${name}\nE-mail: ${email}\nCurso: ${course.title}\n\nAcesse o painel administrativo para aprovar ou rejeitar.`,
    });
  }

  res.status(201).json({
    ok: true,
    enrollmentId: id,
    // Reporta o estado REAL da notificação por e-mail (sem fingir sucesso).
    notification: emailResult.ok ? 'SENT' : `NOT_SENT:${emailResult.reason || 'UNKNOWN'}`,
  });
});

// Lista de inscrições (admin).
router.get('/', requireAuth, requireAdmin, (req, res) => {
  const rows = all('SELECT * FROM enrollments ORDER BY request_date DESC');
  res.json({ enrollments: rows });
});

async function notifyDecision(enrollment, approved) {
  const settings = get('SELECT * FROM email_settings WHERE id = 1');
  if (!settings || !settings.notify_on_approval) return { ok: false, reason: 'NOTIFY_DISABLED' };
  return sendEmail({
    to: enrollment.email,
    subject: approved ? 'Sua matrícula foi aprovada' : 'Atualização sobre sua solicitação de matrícula',
    text: approved
      ? `Olá, ${enrollment.user_name}.\n\nSua matrícula no curso "${enrollment.course_title}" foi APROVADA. Você já pode acessar o portal EAD.\n\nPor segurança, defina uma nova senha no primeiro acesso.`
      : `Olá, ${enrollment.user_name}.\n\nSua solicitação de matrícula no curso "${enrollment.course_title}" não foi aprovada no momento. Entre em contato com a administração para mais informações.`,
  });
}

// Aprovar inscrição: cria/atualiza usuário e concede acesso, tudo em transação.
router.post('/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const enrollment = get('SELECT * FROM enrollments WHERE id = ?', [req.params.id]);
  if (!enrollment) return res.status(404).json({ error: 'Inscrição não encontrada.' });
  if (enrollment.status === 'APPROVED') return res.status(409).json({ error: 'Inscrição já aprovada.' });

  // Senha temporária gerada no servidor; NUNCA enviada em texto por e-mail.
  // O aluno define a senha no primeiro acesso (fluxo de redefinição).
  const tempPassword = uid('tmp_');

  tx(() => {
    let user = get('SELECT * FROM users WHERE email = ?', [enrollment.email]);
    if (!user) {
      const userId = enrollment.user_id || uid('u_');
      run('INSERT INTO users (id,name,email,password_hash,role,status) VALUES (?,?,?,?,?,?)',
        [userId, enrollment.user_name, enrollment.email, bcrypt.hashSync(tempPassword, 10), 'STUDENT', 'ACTIVE']);
      user = { id: userId };
    }
    run('INSERT OR IGNORE INTO course_access (user_id,course_id) VALUES (?,?)', [user.id, enrollment.course_id]);
    run('UPDATE enrollments SET status = ?, decided_at = ?, user_id = ? WHERE id = ?',
      ['APPROVED', new Date().toISOString(), user.id, enrollment.id]);
  });

  audit(req.user.email, 'APROVACAO_INSCRICAO', `Inscrição de ${enrollment.user_name} em ${enrollment.course_title} aprovada`);
  const emailResult = await notifyDecision(enrollment, true);
  res.json({ ok: true, notification: emailResult.ok ? 'SENT' : `NOT_SENT:${emailResult.reason || 'UNKNOWN'}` });
});

router.post('/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const enrollment = get('SELECT * FROM enrollments WHERE id = ?', [req.params.id]);
  if (!enrollment) return res.status(404).json({ error: 'Inscrição não encontrada.' });
  run('UPDATE enrollments SET status = ?, decided_at = ? WHERE id = ?',
    ['REJECTED', new Date().toISOString(), enrollment.id]);
  audit(req.user.email, 'REJEICAO_INSCRICAO', `Inscrição de ${enrollment.user_name} rejeitada`);
  const emailResult = await notifyDecision(enrollment, false);
  res.json({ ok: true, notification: emailResult.ok ? 'SENT' : `NOT_SENT:${emailResult.reason || 'UNKNOWN'}` });
});

export default router;
