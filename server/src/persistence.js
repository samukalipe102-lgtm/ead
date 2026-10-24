// Persistência GRATUITA e SEGURA para hospedagens de disco EFÊMERO.
// Faz backup/restauração do banco SQLite + vídeos usando um repositório Git
// PRIVADO como armazenamento (grátis, sem cartão).
//
// SALVAGUARDAS (por conter dados pessoais de alunos — LGPD):
//   - OPT-IN total: desligado a menos que BACKUP_GIT_REPO + BACKUP_GIT_TOKEN existam
//     E BACKUP_GIT_CONFIRM_PRIVATE=yes (confirmação explícita do operador).
//   - VERIFICA via API do GitHub se o repo é PRIVADO. Se for público (ou não der
//     para confirmar), RECUSA o backup — nunca envia dados pessoais a repo público.
//   - LIMITE de tamanho (BACKUP_MAX_MB, padrão 200 MB): se exceder, NÃO faz backup
//     e avisa — nada de "commits infinitos como storage".
//   - RESTAURAÇÃO validada: valida a integridade do .db baixado (PRAGMA
//     integrity_check + leitura das tabelas) ANTES de usá-lo, e só restaura quando
//     não há banco local. Nunca sobrescreve o banco atual automaticamente.
//   - Token NUNCA é logado. Mensagens de erro são sanitizadas.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync, statSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { resolveDbPath, resolveUploadsDir } from './config.js';

const REPO = process.env.BACKUP_GIT_REPO || '';          // ex.: github.com/usuario/umbanda-backup.git
const TOKEN = process.env.BACKUP_GIT_TOKEN || '';         // PAT fine-grained, só desse repo
const BRANCH = process.env.BACKUP_GIT_BRANCH || 'main';
const CONFIRM_PRIVATE = (process.env.BACKUP_GIT_CONFIRM_PRIVATE || '').toLowerCase() === 'yes';
const AUTHOR = process.env.BACKUP_GIT_AUTHOR || 'Umbanda Backup <backup@umbanda.local>';
const INTERVAL_MS = Number(process.env.BACKUP_INTERVAL_MS || 5 * 60 * 1000);
const MAX_MB = Number(process.env.BACKUP_MAX_MB || 200);

const WORK = '/tmp/umbanda-backup-repo';
let timer = null;
let busy = false;
let privateVerified = null; // null=não checado, true/false=resultado

// Remove o token de qualquer string antes de logar.
function sanitize(s) {
  if (!s) return '';
  return String(s).split(TOKEN).join('***').slice(0, 300);
}

export function backupEnabled() {
  return Boolean(REPO && TOKEN);
}

// Extrai owner/repo de "github.com/owner/repo.git".
function parseOwnerRepo() {
  const m = REPO.replace(/^https?:\/\//, '').replace(/\.git$/, '').match(/github\.com\/([^/]+)\/([^/]+)/i);
  return m ? { owner: m[1], repo: m[2] } : null;
}

function repoUrl() {
  const clean = REPO.replace(/^https?:\/\//, '');
  return `https://x-access-token:${TOKEN}@${clean}`;
}

// Confirma via API do GitHub que o repositório é PRIVADO. Recusa em qualquer
// dúvida. Isto evita vazar PII de alunos para um repositório público.
async function ensureRepoIsPrivate() {
  if (privateVerified !== null) return privateVerified;
  const pr = parseOwnerRepo();
  if (!pr) { console.error('[backup] BACKUP_GIT_REPO inválido (esperado github.com/owner/repo.git).'); privateVerified = false; return false; }
  try {
    const res = await fetch(`https://api.github.com/repos/${pr.owner}/${pr.repo}`, {
      headers: { Authorization: `Bearer ${TOKEN}`, 'User-Agent': 'umbanda-backup', Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) { console.error('[backup] não foi possível verificar o repo (HTTP ' + res.status + '). Backup RECUSADO por segurança.'); privateVerified = false; return false; }
    const data = await res.json();
    if (data.private !== true) {
      console.error('[backup] RECUSADO: o repositório de backup é PÚBLICO. Dados de alunos não podem ir para repo público. Use um repositório PRIVADO.');
      privateVerified = false; return false;
    }
    privateVerified = true;
    return true;
  } catch (e) {
    console.error('[backup] falha ao verificar privacidade do repo:', sanitize(e.message)); privateVerified = false; return false;
  }
}

function git(args, cwd) { return spawnSync('git', args, { cwd, encoding: 'utf8' }); }

function ensureClone() {
  if (existsSync(join(WORK, '.git'))) return true;
  rmSync(WORK, { recursive: true, force: true });
  let r = spawnSync('git', ['clone', '--depth', '1', '--branch', BRANCH, repoUrl(), WORK], { encoding: 'utf8' });
  if (r.status === 0) return true;
  r = spawnSync('git', ['clone', '--depth', '1', repoUrl(), WORK], { encoding: 'utf8' });
  if (r.status !== 0) { console.error('[backup] clone falhou:', sanitize(r.stderr)); return false; }
  git(['checkout', '-B', BRANCH], WORK);
  return true;
}

function dirSizeMB(dir) {
  let total = 0;
  const walk = (d) => {
    if (!existsSync(d)) return;
    for (const name of readdirSync(d)) {
      if (name === '.git') continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) walk(p); else total += st.size;
    }
  };
  walk(dir);
  return total / (1024 * 1024);
}

// Valida a INTEGRIDADE de um arquivo .db SQLite antes de confiar nele.
function isValidSqlite(path) {
  if (!existsSync(path) || statSync(path).size < 1024) return false;
  try {
    const d = new DatabaseSync(path);
    const chk = d.prepare('PRAGMA integrity_check').get();
    const ok = chk && (chk.integrity_check === 'ok' || Object.values(chk)[0] === 'ok');
    // Confere se as tabelas essenciais existem.
    const t = d.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','courses','lessons')").all();
    d.close();
    return Boolean(ok) && t.length === 3;
  } catch { return false; }
}

// Restaura SOMENTE se não há banco local E o backup é íntegro.
export async function restoreIfNeeded() {
  if (!backupEnabled()) return false;
  if (!CONFIRM_PRIVATE) { console.error('[backup] desativado: defina BACKUP_GIT_CONFIRM_PRIVATE=yes após garantir repo PRIVADO.'); return false; }
  const dbPath = resolveDbPath();
  if (existsSync(dbPath)) return false; // nunca sobrescreve dados locais
  if (!(await ensureRepoIsPrivate())) return false;
  if (!ensureClone()) return false;
  const bkDb = join(WORK, 'data', 'umbanda.db');
  if (!isValidSqlite(bkDb)) {
    console.error('[backup] backup ausente ou inválido — iniciando com banco novo (nada foi sobrescrito).');
    return false;
  }
  mkdirSync(dirname(dbPath), { recursive: true });
  cpSync(bkDb, dbPath);
  const bkUploads = join(WORK, 'data', 'uploads');
  if (existsSync(bkUploads)) cpSync(bkUploads, resolveUploadsDir(), { recursive: true });
  console.log('[backup] dados restaurados do repositório privado (banco validado).');
  return true;
}

export async function backupNow(reason = 'periodic') {
  if (!backupEnabled() || !CONFIRM_PRIVATE || busy) return false;
  busy = true;
  try {
    if (!(await ensureRepoIsPrivate())) return false;
    if (!ensureClone()) return false;
    const dataDir = join(WORK, 'data');
    mkdirSync(join(dataDir, 'uploads'), { recursive: true });
    const dbPath = resolveDbPath();
    const uploads = resolveUploadsDir();

    // Só faz backup de um banco ÍNTEGRO.
    if (!isValidSqlite(dbPath)) { console.error('[backup] banco local inválido/ausente — backup abortado.'); return false; }

    // LIMITE de tamanho: evita usar o repo como storage ilimitado.
    const projectedMB = (existsSync(dbPath) ? statSync(dbPath).size / 1048576 : 0) + dirSizeMB(uploads);
    if (projectedMB > MAX_MB) {
      console.error(`[backup] ABORTADO: tamanho ${projectedMB.toFixed(1)} MB excede o limite de ${MAX_MB} MB. ` +
        'Aumente BACKUP_MAX_MB conscientemente ou use storage externo. Nada foi enviado.');
      return false;
    }

    cpSync(dbPath, join(dataDir, 'umbanda.db'));
    if (existsSync(uploads)) cpSync(uploads, join(dataDir, 'uploads'), { recursive: true });

    git(['config', 'user.email', AUTHOR.replace(/.*<(.+)>.*/, '$1')], WORK);
    git(['config', 'user.name', AUTHOR.replace(/\s*<.*/, '')], WORK);
    git(['add', '-A'], WORK);
    const st = git(['status', '--porcelain'], WORK);
    if (!st.stdout || !st.stdout.trim()) return true; // nada mudou
    git(['commit', '-m', `backup (${reason}) ${new Date().toISOString()}`], WORK);
    const push = git(['push', repoUrl(), `HEAD:${BRANCH}`], WORK);
    if (push.status !== 0) { console.error('[backup] push falhou:', sanitize(push.stderr)); return false; }
    console.log(`[backup] enviado ao repositório privado (${projectedMB.toFixed(1)} MB).`);
    return true;
  } finally {
    busy = false;
  }
}

export async function startBackupScheduler() {
  if (!backupEnabled() || timer) return;
  if (!CONFIRM_PRIVATE) {
    console.error('[backup] configurado mas INATIVO: defina BACKUP_GIT_CONFIRM_PRIVATE=yes (confirmando repo PRIVADO) para ativar.');
    return;
  }
  await restoreIfNeeded();
  timer = setInterval(() => { backupNow('periodic').catch(() => {}); }, INTERVAL_MS);
  if (timer.unref) timer.unref();
  const onExit = () => { backupNow('shutdown').catch(() => {}); };
  process.on('SIGTERM', onExit);
  process.on('SIGINT', onExit);
  console.log(`[backup] persistência via Git PRIVADO ativa (intervalo ${Math.round(INTERVAL_MS / 1000)}s, limite ${MAX_MB} MB).`);
}
