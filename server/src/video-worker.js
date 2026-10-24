// Worker assíncrono da fila de geração de videoaulas.
// NÃO roda a geração dentro da requisição HTTP: a rota apenas cria o job (QUEUED);
// este worker processa um job por vez, atualizando os estados REAIS no banco:
//   QUEUED -> SUBMITTING -> PROCESSING -> COMPLETED | FAILED
// O vídeo gerado fica associado ao job (result_url) e só é publicado na aula
// quando o administrador aprovar (etapa separada).
import { all, get, run } from './db/index.js';
import { generateVideo } from './video.js';
import { audit } from './util.js';

let running = false;
let timer = null;

function nowIso() { return new Date().toISOString(); }

async function processOne() {
  if (running) return;
  // Pega o job mais antigo em QUEUED.
  const job = get("SELECT * FROM video_jobs WHERE status = 'QUEUED' ORDER BY created_at ASC LIMIT 1");
  if (!job) return;
  running = true;
  try {
    run("UPDATE video_jobs SET status = 'SUBMITTING', updated_at = ? WHERE id = ?", [nowIso(), job.id]);
    run("UPDATE video_jobs SET status = 'PROCESSING', updated_at = ? WHERE id = ?", [nowIso(), job.id]);

    const result = await generateVideo({
      title: job.title,
      script: job.script,
      prompt: job.title,
      engine: job.engine || 'auto',
    });

    if (!result.ok) {
      run("UPDATE video_jobs SET status = 'FAILED', error = ?, updated_at = ? WHERE id = ?",
        [result.reason + (result.error ? ' - ' + result.error : ''), nowIso(), job.id]);
      audit(job.created_by, 'VIDEO_JOB_FALHA', `Job ${job.id} (aula ${job.lesson_id}) falhou: ${result.reason}`);
      return;
    }

    run("UPDATE video_jobs SET status = 'COMPLETED', result_url = ?, engine = ?, progress = 100, updated_at = ? WHERE id = ?",
      [result.publicPath, result.engine, nowIso(), job.id]);
    audit(job.created_by, 'VIDEO_JOB_CONCLUIDO', `Job ${job.id} concluído (${result.bytes} bytes, motor ${result.engine})`);
  } catch (err) {
    run("UPDATE video_jobs SET status = 'FAILED', error = ?, updated_at = ? WHERE id = ?",
      ['WORKER_ERROR - ' + String(err && err.message ? err.message : err), nowIso(), job.id]);
  } finally {
    running = false;
  }
}

export function startVideoWorker(intervalMs = 3000) {
  if (timer) return;
  // Recupera jobs que ficaram "presos" em estados intermediários (reinício do servidor).
  run("UPDATE video_jobs SET status = 'QUEUED', updated_at = ? WHERE status IN ('SUBMITTING','PROCESSING')", [nowIso()]);
  timer = setInterval(() => { processOne().catch(() => {}); }, intervalMs);
  if (timer.unref) timer.unref();
}

export function stopVideoWorker() {
  if (timer) { clearInterval(timer); timer = null; }
}
