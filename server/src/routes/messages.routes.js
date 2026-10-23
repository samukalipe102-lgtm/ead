// ÁREA REAL DE MENSAGENS — totalmente separada do Tutor de IA.
// Alunos criam threads e conversam com a administração; cada conversa é associada
// ao aluno correto. Permissões garantem que um aluno NÃO veja conversas de outros.
import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth, requireAdmin } from '../auth.js';
import { audit, uid } from '../util.js';

const router = Router();

// Lista threads: aluno vê só as suas; admin vê todas.
router.get('/threads', requireAuth, (req, res) => {
  let threads;
  if (req.user.role === 'ADMIN') {
    threads = all(`SELECT t.*, u.name AS student_name,
      (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id) AS message_count
      FROM message_threads t JOIN users u ON u.id = t.student_id ORDER BY t.updated_at DESC`);
  } else {
    threads = all(`SELECT t.*, 
      (SELECT COUNT(*) FROM messages m WHERE m.thread_id = t.id) AS message_count
      FROM message_threads t WHERE t.student_id = ? ORDER BY t.updated_at DESC`, [req.user.id]);
  }
  res.json({ threads });
});

// Cria nova thread (aluno). Admin também pode iniciar, mas precisa informar studentId.
router.post('/threads', requireAuth, (req, res) => {
  const { subject, courseId, body } = req.body || {};
  if (!subject || !body) return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios.' });

  let studentId = req.user.id;
  if (req.user.role === 'ADMIN') {
    if (!req.body.studentId) return res.status(400).json({ error: 'Admin deve informar studentId.' });
    studentId = req.body.studentId;
  }
  const threadId = uid('t_');
  run('INSERT INTO message_threads (id,student_id,subject,course_id) VALUES (?,?,?,?)',
    [threadId, studentId, subject, courseId || null]);
  run('INSERT INTO messages (id,thread_id,sender_id,sender_role,body) VALUES (?,?,?,?,?)',
    [uid('m_'), threadId, req.user.id, req.user.role, body]);
  audit(req.user.email, 'MENSAGEM_NOVA_THREAD', `Nova conversa: ${subject}`);
  res.status(201).json({ ok: true, threadId });
});

// Garante que o usuário pode acessar a thread (dono ou admin).
function canAccessThread(user, thread) {
  if (!thread) return false;
  return user.role === 'ADMIN' || thread.student_id === user.id;
}

// Mensagens de uma thread.
router.get('/threads/:id', requireAuth, (req, res) => {
  const thread = get('SELECT * FROM message_threads WHERE id = ?', [req.params.id]);
  if (!canAccessThread(req.user, thread)) {
    return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' });
  }
  const messages = all(`SELECT m.*, u.name AS sender_name
    FROM messages m JOIN users u ON u.id = m.sender_id
    WHERE m.thread_id = ? ORDER BY m.created_at ASC`, [req.params.id]);
  res.json({ thread, messages });
});

// Responder em uma thread (aluno dono ou admin).
router.post('/threads/:id/reply', requireAuth, (req, res) => {
  const thread = get('SELECT * FROM message_threads WHERE id = ?', [req.params.id]);
  if (!canAccessThread(req.user, thread)) {
    return res.status(403).json({ error: 'Você não tem acesso a esta conversa.' });
  }
  const { body } = req.body || {};
  if (!body || !body.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });
  run('INSERT INTO messages (id,thread_id,sender_id,sender_role,body) VALUES (?,?,?,?,?)',
    [uid('m_'), req.params.id, req.user.id, req.user.role, body.trim()]);
  run('UPDATE message_threads SET updated_at = ? WHERE id = ?', [new Date().toISOString(), req.params.id]);
  res.status(201).json({ ok: true });
});

export default router;
