import { randomUUID } from 'node:crypto';
import { run } from './db/index.js';

export function audit(userEmail, action, details) {
  try {
    run('INSERT INTO audit_logs (id,user_email,action,details) VALUES (?,?,?,?)',
      [randomUUID(), userEmail || 'SISTEMA', action, details || null]);
  } catch (e) {
    // Log de auditoria nunca deve derrubar a requisição.
    console.error('Falha ao gravar audit log:', e.message);
  }
}

export function uid(prefix = '') {
  return prefix + randomUUID();
}
