import jwt from 'jsonwebtoken';
import { effectiveJwtSecret } from './config.js';

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, name: user.name },
    effectiveJwtSecret(),
    { expiresIn: '7d' }
  );
}

// Middleware: exige token válido. Popula req.user a partir do JWT (fonte da verdade
// no servidor — o cliente NÃO pode forjar o papel editando HTML/localStorage).
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Não autenticado.' });
  try {
    const payload = jwt.verify(token, effectiveJwtSecret());
    req.user = { id: payload.sub, role: payload.role, email: payload.email, name: payload.name };
    next();
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' });
  }
}

// Middleware: exige papel ADMIN, validado no servidor.
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Acesso restrito à administração.' });
  }
  next();
}
