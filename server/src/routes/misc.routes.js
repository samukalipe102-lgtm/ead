import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../auth.js';
import { audit, uid } from '../util.js';

const router = Router();

// Verificação PÚBLICA de certificado por código.
router.get('/certificates/verify/:code', (req, res) => {
  const cert = get('SELECT * FROM certificates WHERE id = ? AND status = ?',
    [String(req.params.code).toUpperCase(), 'VALID']);
  if (!cert) return res.json({ valid: false });
  res.json({ valid: true, certificate: cert });
});

// Certificados do próprio usuário.
router.get('/certificates/mine', requireAuth, (req, res) => {
  res.json({ certificates: all('SELECT * FROM certificates WHERE user_id = ? ORDER BY issue_date DESC', [req.user.id]) });
});

// Emitir certificado: SOMENTE se o curso foi concluído (todas as aulas) e há acesso.
router.post('/certificates/issue', requireAuth, (req, res) => {
  const { courseId } = req.body || {};
  const course = get('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) return res.status(404).json({ error: 'Curso não encontrado.' });

  if (req.user.role !== 'ADMIN') {
    const access = get('SELECT 1 AS ok FROM course_access WHERE user_id = ? AND course_id = ?', [req.user.id, courseId]);
    if (!access) return res.status(403).json({ error: 'Sem acesso a este curso.' });
  }

  const total = get('SELECT COUNT(*) AS n FROM lessons WHERE course_id = ?', [courseId]).n;
  const done = get(
    'SELECT COUNT(*) AS n FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id WHERE l.course_id = ? AND p.user_id = ? AND p.completed = 1',
    [courseId, req.user.id]
  ).n;
  if (total === 0 || done < total) {
    return res.status(400).json({ error: 'Conclua todas as aulas do curso antes de emitir o certificado.', total, done });
  }

  const existing = get('SELECT * FROM certificates WHERE user_id = ? AND course_id = ? AND status = ?', [req.user.id, courseId, 'VALID']);
  if (existing) return res.json({ ok: true, certificate: existing, reused: true });

  const code = `CERT-${course.hours}-${Math.floor(1000 + Math.random() * 9000)}`;
  run('INSERT INTO certificates (id,user_id,user_name,course_id,course_title,hours,status) VALUES (?,?,?,?,?,?,?)',
    [code, req.user.id, req.user.name, courseId, course.title, course.hours, 'VALID']);
  audit(req.user.email, 'EMISSAO_CERTIFICADO', `Certificado ${code} emitido para ${course.title}`);
  const certificate = get('SELECT * FROM certificates WHERE id = ?', [code]);
  res.status(201).json({ ok: true, certificate });
});

// Notas do próprio aluno.
router.get('/grades/mine', requireAuth, (req, res) => {
  res.json({ grades: all('SELECT * FROM grades WHERE student_id = ? ORDER BY date DESC', [req.user.id]) });
});

// Comunicados (qualquer usuário autenticado).
router.get('/announcements', requireAuth, (req, res) => {
  res.json({ announcements: all('SELECT * FROM announcements ORDER BY pinned DESC, date DESC') });
});

export default router;
