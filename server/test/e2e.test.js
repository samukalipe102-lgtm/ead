// Testes end-to-end reais: sobem o app Express em memória (porta efêmera),
// usam um banco temporário próprio e exercitam os fluxos críticos via HTTP real.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Banco temporário ANTES de importar o app (config lê env no import).
const tmp = mkdtempSync(join(tmpdir(), 'umbanda-test-'));
process.env.DB_PATH = join(tmp, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.NODE_ENV = 'test';

const { app } = await import('../src/index.js');

let server, base;
before(async () => {
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://localhost:${server.address().port}/api`;
});
after(() => {
  server.close();
  rmSync(tmp, { recursive: true, force: true });
});

async function api(method, path, { token, body } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, json };
}

let adminToken, studentToken;

test('health reporta estado honesto das integrações', async () => {
  const r = await api('GET', '/health');
  assert.equal(r.status, 200);
  assert.equal(r.json.integrations.database, true);
  assert.equal(r.json.integrations.smtp, false);   // sem SMTP no teste
  assert.equal(r.json.integrations.aiTutor, false); // sem IA no teste
  assert.equal(r.json.integrations.aiVideo, false); // sem HF_TOKEN no teste
});

test('login admin e student funcionam; senha errada é rejeitada', async () => {
  const a = await api('POST', '/auth/login', { body: { email: 'admin@umbanda.org', password: '123' } });
  assert.equal(a.status, 200);
  assert.equal(a.json.user.role, 'ADMIN');
  adminToken = a.json.token;

  const s = await api('POST', '/auth/login', { body: { email: 'aluno@umbanda.org', password: '123' } });
  assert.equal(s.status, 200);
  assert.equal(s.json.user.role, 'STUDENT');
  studentToken = s.json.token;

  const bad = await api('POST', '/auth/login', { body: { email: 'admin@umbanda.org', password: 'errada' } });
  assert.equal(bad.status, 401);
});

test('controle de acesso: aluno só vê cursos autorizados', async () => {
  const mine = await api('GET', '/courses/mine', { token: studentToken });
  assert.equal(mine.status, 200);
  const ids = mine.json.courses.map((c) => c.id).sort();
  assert.deepEqual(ids, ['c1', 'c2', 'c6']);
});

test('controle de acesso: aluno NÃO acessa curso sem matrícula (403)', async () => {
  const r = await api('GET', '/courses/c3', { token: studentToken });
  assert.equal(r.status, 403);
});

test('admin acessa qualquer curso (200)', async () => {
  const r = await api('GET', '/courses/c3', { token: adminToken });
  assert.equal(r.status, 200);
});

test('aluno não acessa rota de admin (403) e sem token é 401', async () => {
  const forbidden = await api('GET', '/admin/users', { token: studentToken });
  assert.equal(forbidden.status, 403);
  const unauth = await api('GET', '/courses/mine');
  assert.equal(unauth.status, 401);
});

test('estados de vídeo são reais (AVAILABLE vs UNAVAILABLE)', async () => {
  const c1 = await api('GET', '/courses/c1', { token: studentToken });
  const lessons = c1.json.course.modules.flatMap((m) => m.lessons);
  const withVideo = lessons.find((l) => l.videoUrl);
  const withoutVideo = lessons.find((l) => !l.videoUrl);
  assert.equal(withVideo.videoStatus, 'AVAILABLE');
  assert.equal(withoutVideo.videoStatus, 'UNAVAILABLE');
});

test('MENSAGENS: área real, persistente e isolada por usuário', async () => {
  // Aluno cria thread
  const created = await api('POST', '/messages/threads', {
    token: studentToken,
    body: { subject: 'Dúvida sobre a Aula 1', body: 'Qual o material complementar?' },
  });
  assert.equal(created.status, 201);
  const threadId = created.json.threadId;

  // Admin vê a thread e responde
  const adminThreads = await api('GET', '/messages/threads', { token: adminToken });
  assert.ok(adminThreads.json.threads.some((t) => t.id === threadId));
  const reply = await api('POST', `/messages/threads/${threadId}/reply`, {
    token: adminToken, body: { body: 'O material está anexo na aula.' },
  });
  assert.equal(reply.status, 201);

  // Aluno vê a resposta (persistência)
  const convo = await api('GET', `/messages/threads/${threadId}`, { token: studentToken });
  assert.equal(convo.json.messages.length, 2);
  assert.equal(convo.json.messages[1].body, 'O material está anexo na aula.');

  // Carlos (outro aluno) NÃO pode ver a thread da Maria (403)
  const carlos = await api('POST', '/auth/login', { body: { email: 'carlos@gmail.com', password: '123' } });
  const other = await api('GET', `/messages/threads/${threadId}`, { token: carlos.json.token });
  assert.equal(other.status, 403);
});

test('TUTOR IA: separado das mensagens; sem chave responde indisponível (503)', async () => {
  const status = await api('GET', '/ai-tutor/status', { token: studentToken });
  assert.equal(status.json.configured, false);
  const ask = await api('POST', '/ai-tutor/ask', { token: studentToken, body: { message: 'O que é a Umbanda?' } });
  assert.equal(ask.status, 503);
  assert.equal(ask.json.reason, 'AI_NOT_CONFIGURED');
});

test('E-MAIL: teste sem SMTP reporta falha honesta (502), não finge sucesso', async () => {
  const r = await api('POST', '/admin/email-test', { token: adminToken, body: { to: 'teste@exemplo.org' } });
  assert.equal(r.status, 502);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.reason, 'SMTP_NOT_CONFIGURED');
});

test('VÍDEO IA: status honesto; sem HF_TOKEN a geração reporta não configurado (503)', async () => {
  const status = await api('GET', '/admin/video-ai/status', { token: adminToken });
  assert.equal(status.status, 200);
  assert.equal(status.json.configured, false); // sem HF_TOKEN no ambiente de teste
  // Solicitar geração para uma aula existente sem chave -> 503, sem fabricar vídeo
  const gen = await api('POST', '/admin/video-ai/lessons/c1_m1_l1/generate', { token: adminToken });
  assert.equal(gen.status, 503);
  assert.equal(gen.json.reason, 'VIDEO_AI_NOT_CONFIGURED');
  // E a rota exige admin: aluno recebe 403
  const asStudent = await api('POST', '/admin/video-ai/lessons/c1_m1_l1/generate', { token: studentToken });
  assert.equal(asStudent.status, 403);
});

test('INSCRIÇÃO: fluxo solicitar -> aprovar concede acesso real', async () => {
  const req = await api('POST', '/enrollments/request', {
    body: { name: 'Novo Aluno Teste', email: 'novo.teste@exemplo.org', courseId: 'c4' },
  });
  assert.equal(req.status, 201);
  // Sem SMTP, a notificação é reportada como NÃO enviada (honesto)
  assert.match(req.json.notification, /^NOT_SENT:/);
  const enrollmentId = req.json.enrollmentId;

  const approve = await api('POST', `/enrollments/${enrollmentId}/approve`, { token: adminToken });
  assert.equal(approve.status, 200);

  // O novo usuário foi criado e tem acesso ao c4
  const users = await api('GET', '/admin/users', { token: adminToken });
  const novo = users.json.users.find((u) => u.email === 'novo.teste@exemplo.org');
  assert.ok(novo, 'usuário deve ter sido criado na aprovação');
  assert.ok(novo.courses.includes('c4'), 'usuário deve ter acesso ao c4');
});

test('CERTIFICADO: só emite após concluir todas as aulas; verificação pública funciona', async () => {
  // c2 tem 1 aula. Tenta emitir sem concluir -> 400
  const early = await api('POST', '/certificates/issue', { token: studentToken, body: { courseId: 'c2' } });
  assert.equal(early.status, 400);

  // Conclui a única aula do c2
  const c2 = await api('GET', '/courses/c2', { token: studentToken });
  const lesson = c2.json.course.modules[0].lessons[0];
  await api('POST', `/courses/lessons/${lesson.id}/progress`, { token: studentToken, body: { completed: true } });

  // Agora emite -> 201
  const issued = await api('POST', '/certificates/issue', { token: studentToken, body: { courseId: 'c2' } });
  assert.equal(issued.status, 201);
  const code = issued.json.certificate.id;

  // Verificação pública (sem token)
  const verify = await api('GET', `/certificates/verify/${code}`);
  assert.equal(verify.json.valid, true);
  assert.equal(verify.json.certificate.course_id, 'c2');

  // Código inexistente -> inválido
  const bad = await api('GET', '/certificates/verify/CERT-NAO-EXISTE');
  assert.equal(bad.json.valid, false);
});

test('PROGRESSO: cálculo de percentual reflete aulas concluídas', async () => {
  const p = await api('GET', '/courses/c2/progress', { token: studentToken });
  assert.equal(p.json.percent, 100); // concluímos a única aula no teste anterior
  assert.equal(p.json.completed, true);
});
