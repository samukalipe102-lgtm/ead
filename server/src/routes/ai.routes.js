// Tutor de IA — endpoint PRÓPRIO, separado de /messages.
import { Router } from 'express';
import { all, get, run } from '../db/index.js';
import { requireAuth } from '../auth.js';
import { uid } from '../util.js';
import { askTutor, aiStatus } from '../ai.js';

const router = Router();

// Status honesto: diz se a IA está configurada ou não.
router.get('/status', requireAuth, (req, res) => {
  res.json(aiStatus());
});

// Histórico da conversa do próprio usuário com o tutor.
router.get('/history', requireAuth, (req, res) => {
  const messages = all('SELECT id,role,body,created_at FROM ai_tutor_messages WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);
  res.json({ messages });
});

// Enviar pergunta ao tutor de IA. Se não configurado, responde indisponível (sem fabricar).
router.post('/ask', requireAuth, async (req, res) => {
  const { message } = req.body || {};
  if (!message || !message.trim()) return res.status(400).json({ error: 'Mensagem vazia.' });

  run('INSERT INTO ai_tutor_messages (id,user_id,role,body) VALUES (?,?,?,?)',
    [uid('ai_'), req.user.id, 'user', message.trim()]);

  const history = all('SELECT role,body FROM ai_tutor_messages WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);
  const result = await askTutor(history);

  if (!result.ok) {
    return res.status(503).json({
      ok: false,
      reason: result.reason,
      message: result.reason === 'AI_NOT_CONFIGURED'
        ? 'O Tutor de IA não está configurado neste servidor. Configure uma chave de provedor (GEMINI_API_KEY ou OPENAI_API_KEY) para ativá-lo.'
        : 'Não foi possível obter resposta do Tutor de IA no momento.',
    });
  }

  run('INSERT INTO ai_tutor_messages (id,user_id,role,body) VALUES (?,?,?,?)',
    [uid('ai_'), req.user.id, 'assistant', result.reply]);
  res.json({ ok: true, reply: result.reply });
});

export default router;
