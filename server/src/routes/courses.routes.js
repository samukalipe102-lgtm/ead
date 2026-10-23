import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../auth.js';

const router = Router();

// Catálogo público (sem conteúdo sensível das aulas): usado na home institucional.
router.get('/catalog', (req, res) => {
  const courses = all('SELECT id,title,hours,type,category,description FROM courses ORDER BY sort_order');
  const withCounts = courses.map((c) => {
    const mods = get('SELECT COUNT(*) AS n FROM modules WHERE course_id = ?', [c.id]).n;
    return { ...c, moduleCount: mods };
  });
  res.json({ courses: withCounts });
});

function buildCourseTree(courseId, userId, isAdmin) {
  const course = get('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) return null;
  const modules = all('SELECT * FROM modules WHERE course_id = ? ORDER BY sort_order', [courseId]);
  const tree = { ...course, modules: [] };
  for (const m of modules) {
    const lessons = all('SELECT * FROM lessons WHERE module_id = ? ORDER BY sort_order', [m.id]);
    tree.modules.push({
      id: m.id, title: m.title, order: m.sort_order,
      lessons: lessons.map((l) => {
        let completed = false;
        if (userId) {
          const p = get('SELECT completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [userId, l.id]);
          completed = Boolean(p && p.completed);
        }
        return {
          id: l.id, title: l.title, duration: l.duration,
          content: l.content, transcript: l.transcript, activity: l.activity,
          quiz: JSON.parse(l.quiz_json || '[]'),
          videoUrl: l.video_url, videoStatus: l.video_status,
          aiVideoStatus: l.ai_video_status, aiVideoUrl: l.ai_video_url,
          completed,
        };
      }),
    });
  }
  return tree;
}

// Cursos que o usuário autenticado pode acessar (verificado NO SERVIDOR).
router.get('/mine', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  let courses;
  if (isAdmin) {
    courses = all('SELECT id FROM courses ORDER BY sort_order');
  } else {
    courses = all('SELECT course_id AS id FROM course_access WHERE user_id = ?', [req.user.id]);
  }
  const trees = courses.map((c) => buildCourseTree(c.id, req.user.id, isAdmin)).filter(Boolean);
  res.json({ courses: trees });
});

// Detalhe de um curso — bloqueia aluno sem acesso (autorização no servidor).
router.get('/:id', requireAuth, (req, res) => {
  const isAdmin = req.user.role === 'ADMIN';
  if (!isAdmin) {
    const access = get('SELECT 1 AS ok FROM course_access WHERE user_id = ? AND course_id = ?', [req.user.id, req.params.id]);
    if (!access) return res.status(403).json({ error: 'Você não tem acesso a este curso.' });
  }
  const tree = buildCourseTree(req.params.id, req.user.id, isAdmin);
  if (!tree) return res.status(404).json({ error: 'Curso não encontrado.' });
  res.json({ course: tree });
});

// Marcar/desmarcar aula concluída (somente aulas de cursos autorizados).
router.post('/lessons/:lessonId/progress', requireAuth, (req, res) => {
  const lesson = get('SELECT * FROM lessons WHERE id = ?', [req.params.lessonId]);
  if (!lesson) return res.status(404).json({ error: 'Aula não encontrada.' });
  if (req.user.role !== 'ADMIN') {
    const access = get('SELECT 1 AS ok FROM course_access WHERE user_id = ? AND course_id = ?', [req.user.id, lesson.course_id]);
    if (!access) return res.status(403).json({ error: 'Sem acesso a este curso.' });
  }
  const completed = req.body?.completed ? 1 : 0;
  const existing = get('SELECT * FROM lesson_progress WHERE user_id = ? AND lesson_id = ?', [req.user.id, req.params.lessonId]);
  if (existing) {
    run('UPDATE lesson_progress SET completed = ?, completed_at = ? WHERE user_id = ? AND lesson_id = ?',
      [completed, completed ? new Date().toISOString() : null, req.user.id, req.params.lessonId]);
  } else {
    run('INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (?,?,?,?)',
      [req.user.id, req.params.lessonId, completed, completed ? new Date().toISOString() : null]);
  }
  res.json({ ok: true, completed: Boolean(completed) });
});

// Progresso agregado de um curso para o usuário autenticado.
router.get('/:id/progress', requireAuth, (req, res) => {
  const total = get('SELECT COUNT(*) AS n FROM lessons WHERE course_id = ?', [req.params.id]).n;
  const done = get(
    'SELECT COUNT(*) AS n FROM lesson_progress p JOIN lessons l ON l.id = p.lesson_id WHERE l.course_id = ? AND p.user_id = ? AND p.completed = 1',
    [req.params.id, req.user.id]
  ).n;
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  res.json({ total, done, percent, completed: total > 0 && done === total });
});

export default router;
