import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { get, run } from '../db/index.js';
import { signToken, requireAuth } from '../auth.js';
import { audit } from '../util.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Informe e-mail e senha.' });
  const user = get('SELECT * FROM users WHERE email = ?', [String(email).toLowerCase()]);
  if (!user || user.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }
  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'Credenciais inválidas.' });

  audit(user.email, 'LOGIN', 'Autenticação bem-sucedida');
  const token = signToken(user);
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  });
});

router.get('/me', requireAuth, (req, res) => {
  const user = get('SELECT id,name,email,role FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });
  res.json({ user });
});

// Troca de senha do próprio usuário (nunca trafega/armazena texto puro)
router.post('/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || String(newPassword).length < 6) {
    return res.status(400).json({ error: 'Senha atual e nova (mín. 6 caracteres) são obrigatórias.' });
  }
  const user = get('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }
  run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(newPassword, 10), user.id]);
  audit(user.email, 'TROCA_SENHA', 'Usuário alterou a própria senha');
  res.json({ ok: true });
});

export default router;
