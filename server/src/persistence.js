// Persistência GRATUITA para hospedagens de disco EFÊMERO (ex.: containers free).
// Faz backup/restauração do banco SQLite e dos vídeos gerados usando um
// repositório Git como "armazenamento" (grátis, sem cartão).
//
// É OPCIONAL e desligado por padrão: só ativa quando BACKUP_GIT_REPO e
// BACKUP_GIT_TOKEN estão definidos no ambiente da hospedagem (nunca no código).
//   - No boot: se o banco local não existir, restaura o último backup do repo.
//   - Periodicamente e no encerramento: salva (commit/push) banco + vídeos.
//
// Segurança: o token fica só no ambiente do servidor; nada vai para o .exe/HTML.
// Limite honesto: adequado a VOLUMES PEQUENOS (poucos vídeos). Não é storage
// ilimitado. Para escala, use um bucket/objeto externo ou um host com disco.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { config, resolveDbPath, resolveUploadsDir } from './config.js';

const REPO = process.env.BACKUP_GIT_REPO || '';     // ex.: github.com/usuario/umbanda-backup.git
const TOKEN = process.env.BACKUP_GIT_TOKEN || '';    // PAT com escopo de repositório
const BRANCH = process.env.BACKUP_GIT_BRANCH || 'main';
const AUTHOR = process.env.BACKUP_GIT_AUTHOR || 'Umbanda Backup <backup@umbanda.local>';
const INTERVAL_MS = Number(process.env.BACKUP_INTERVAL_MS || 5 * 60 * 1000); // 5 min

export function backupEnabled() {
  return Boolean(REPO && TOKEN);
}

function repoUrl() {
  // Injeta o token na URL HTTPS (apenas em memória, nunca logado).
  const clean = REPO.replace(/^https?:\/\//, '');
  return `https://x-access-token:${TOKEN}@${clean}`;
}

const WORK = '/tmp/umbanda-backup-repo';
let timer = null;
let busy = false;

function git(args, cwd) {
  return spawnSync('git', args, { cwd, encoding: 'utf8' });
}

function ensureClone() {
  if (existsSync(join(WORK, '.git'))) return true;
  rmSync(WORK, { recursive: true, force: true });
  const r = spawnSync('git', ['clone', '--depth', '1', '--branch', BRANCH, repoUrl(), WORK], { encoding: 'utf8' });
  if (r.status === 0) return true;
  // Branch pode não existir ainda: clona o default e cria a branch.
  const r2 = spawnSync('git', ['clone', '--depth', '1', repoUrl(), WORK], { encoding: 'utf8' });
  if (r2.status !== 0) { console.error('[backup] clone falhou:', (r2.stderr || '').slice(0, 200)); return false; }
  git(['checkout', '-B', BRANCH], WORK);
  return true;
}

// Restaura banco + vídeos do repo de backup, se o banco local ainda não existe.
export function restoreIfNeeded() {
  if (!backupEnabled()) return false;
  const dbPath = resolveDbPath();
  if (existsSync(dbPath)) return false; // já há dados locais; não sobrescreve
  if (!ensureClone()) return false;
  const bkDb = join(WORK, 'data', 'umbanda.db');
  if (existsSync(bkDb)) {
    mkdirSync(dirname(dbPath), { recursive: true });
    cpSync(bkDb, dbPath);
    const bkUploads = join(WORK, 'data', 'uploads');
    if (existsSync(bkUploads)) cpSync(bkUploads, resolveUploadsDir(), { recursive: true });
    console.log('[backup] dados restaurados do repositório de backup.');
    return true;
  }
  return false;
}

// Salva (commit/push) banco + vídeos no repo de backup.
export function backupNow(reason = 'periodic') {
  if (!backupEnabled() || busy) return false;
  busy = true;
  try {
    if (!ensureClone()) return false;
    const dataDir = join(WORK, 'data');
    mkdirSync(join(dataDir, 'uploads'), { recursive: true });
    const dbPath = resolveDbPath();
    if (existsSync(dbPath)) cpSync(dbPath, join(dataDir, 'umbanda.db'));
    const uploads = resolveUploadsDir();
    if (existsSync(uploads)) cpSync(uploads, join(dataDir, 'uploads'), { recursive: true });

    git(['config', 'user.email', AUTHOR.replace(/.*<(.+)>.*/, '$1')], WORK);
    git(['config', 'user.name', AUTHOR.replace(/\s*<.*/, '')], WORK);
    git(['add', '-A'], WORK);
    const st = git(['status', '--porcelain'], WORK);
    if (!st.stdout || !st.stdout.trim()) return true; // nada mudou
    git(['commit', '-m', `backup (${reason}) ${new Date().toISOString()}`], WORK);
    const push = git(['push', repoUrl(), `HEAD:${BRANCH}`], WORK);
    if (push.status !== 0) { console.error('[backup] push falhou:', (push.stderr || '').slice(0, 200)); return false; }
    console.log('[backup] backup enviado ao repositório.');
    return true;
  } finally {
    busy = false;
  }
}

export function startBackupScheduler() {
  if (!backupEnabled() || timer) return;
  restoreIfNeeded();
  timer = setInterval(() => backupNow('periodic'), INTERVAL_MS);
  if (timer.unref) timer.unref();
  const onExit = () => { try { backupNow('shutdown'); } catch {} };
  process.on('SIGTERM', onExit);
  process.on('SIGINT', onExit);
  console.log(`[backup] persistência via Git ATIVA (intervalo ${Math.round(INTERVAL_MS / 1000)}s).`);
}
