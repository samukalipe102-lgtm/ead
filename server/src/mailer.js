// Envio de e-mail REAL via SMTP (Nodemailer).
// Regra de ouro: nunca registrar SUCCESS sem confirmação efetiva do envio.
// Sem credenciais SMTP configuradas, a função reporta claramente "não configurado".
import { randomUUID } from 'node:crypto';
import nodemailer from 'nodemailer';
import { config, smtpConfigured } from './config.js';
import { run } from './db/index.js';

let transporter = null;

function getTransporter() {
  if (!smtpConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: { user: config.smtp.user, pass: config.smtp.pass },
    });
  }
  return transporter;
}

function logEmail(recipient, subject, status, error) {
  run('INSERT INTO email_logs (id,recipient,subject,status,error) VALUES (?,?,?,?,?)',
    [randomUUID(), recipient, subject, status, error || null]);
}

// Retorna { ok, reason }. ok=true somente se o provedor aceitou a mensagem.
export async function sendEmail({ to, subject, text, html }) {
  const t = getTransporter();
  if (!t) {
    logEmail(to || '(sem destino)', subject, 'ERROR', 'SMTP não configurado no servidor');
    return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };
  }
  if (!to) {
    logEmail('(sem destino)', subject, 'ERROR', 'Destinatário ausente');
    return { ok: false, reason: 'NO_RECIPIENT' };
  }
  try {
    const info = await t.sendMail({ from: config.smtp.from, to, subject, text, html });
    // Considera sucesso apenas se o SMTP aceitou o destinatário.
    const accepted = (info.accepted || []).length > 0;
    logEmail(to, subject, accepted ? 'SUCCESS' : 'ERROR', accepted ? null : 'Destinatário rejeitado pelo servidor SMTP');
    return accepted ? { ok: true } : { ok: false, reason: 'REJECTED' };
  } catch (err) {
    logEmail(to, subject, 'ERROR', String(err && err.message ? err.message : err));
    return { ok: false, reason: 'SEND_FAILED', error: String(err && err.message ? err.message : err) };
  }
}

export async function verifySmtp() {
  const t = getTransporter();
  if (!t) return { ok: false, reason: 'SMTP_NOT_CONFIGURED' };
  try {
    await t.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'VERIFY_FAILED', error: String(err && err.message ? err.message : err) };
  }
}
