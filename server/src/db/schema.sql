-- Schema da plataforma EAD de Formação Sacerdotal de Umbanda
-- Banco: SQLite (node:sqlite). Migrável para PostgreSQL mantendo a modelagem.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('ADMIN','STUDENT')),
  status        TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','PENDING')),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  hours        INTEGER NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('SACERDOTAL','COMPLEMENTARY')),
  category     TEXT,
  description  TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS modules (
  id         TEXT PRIMARY KEY,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id           TEXT PRIMARY KEY,
  module_id    TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  duration     TEXT,
  content      TEXT,
  transcript   TEXT,
  activity     TEXT,
  quiz_json    TEXT,           -- JSON serializado com as perguntas
  video_url    TEXT,           -- URL do vídeo (pode ser NULL)
  -- Estado real do vídeo: AVAILABLE | PROCESSING | UNAVAILABLE | ERROR
  video_status TEXT NOT NULL DEFAULT 'UNAVAILABLE'
                 CHECK (video_status IN ('AVAILABLE','PROCESSING','UNAVAILABLE','ERROR')),
  ai_video_status TEXT,        -- NULL | REQUESTED | PROCESSING | DONE | FAILED
  ai_video_url    TEXT,
  sort_order   INTEGER NOT NULL DEFAULT 0
);

-- Matrículas / inscrições (fluxo de solicitação -> aprovação/rejeição)
CREATE TABLE IF NOT EXISTS enrollments (
  id           TEXT PRIMARY KEY,
  user_id      TEXT REFERENCES users(id) ON DELETE SET NULL,
  user_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_title TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
  request_date TEXT NOT NULL DEFAULT (datetime('now')),
  decided_at   TEXT,
  notes        TEXT
);

-- Autorização efetiva de acesso do aluno ao curso (após aprovação)
CREATE TABLE IF NOT EXISTS course_access (
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id  TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  granted_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, course_id)
);

-- Progresso: aula concluída por aluno
CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id    TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  completed    INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  PRIMARY KEY (user_id, lesson_id)
);

-- Mensagens: ÁREA REAL de mensagens (threads por usuário), separada do Tutor IA
CREATE TABLE IF NOT EXISTS message_threads (
  id          TEXT PRIMARY KEY,
  student_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  course_id   TEXT REFERENCES courses(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  thread_id  TEXT NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id  TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN','STUDENT')),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Conversas do Tutor de IA (área própria, independente das mensagens)
CREATE TABLE IF NOT EXISTS ai_tutor_messages (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('user','assistant')),
  body       TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS grades (
  id             TEXT PRIMARY KEY,
  student_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  student_name   TEXT NOT NULL,
  course_id      TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_title   TEXT NOT NULL,
  assignment_name TEXT NOT NULL,
  score          REAL NOT NULL,
  max_score      REAL NOT NULL DEFAULT 10,
  feedback       TEXT,
  date           TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  target_group TEXT NOT NULL DEFAULT 'ALL',
  author_name  TEXT,
  date         TEXT NOT NULL DEFAULT (datetime('now')),
  pinned       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS certificates (
  id           TEXT PRIMARY KEY,   -- código de verificação (ex: CERT-300-8841)
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name    TEXT NOT NULL,
  course_id    TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_title TEXT NOT NULL,
  hours        INTEGER NOT NULL,
  issue_date   TEXT NOT NULL DEFAULT (datetime('now')),
  status       TEXT NOT NULL DEFAULT 'VALID' CHECK (status IN ('VALID','REVOKED'))
);

-- Configuração de e-mail (sem segredos: credenciais vêm de variáveis de ambiente)
CREATE TABLE IF NOT EXISTS email_settings (
  id                 INTEGER PRIMARY KEY CHECK (id = 1),
  destination_email  TEXT,
  notify_on_enrollment INTEGER NOT NULL DEFAULT 1,
  notify_on_approval   INTEGER NOT NULL DEFAULT 1,
  notify_on_cert       INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS email_logs (
  id         TEXT PRIMARY KEY,
  timestamp  TEXT NOT NULL DEFAULT (datetime('now')),
  recipient  TEXT NOT NULL,
  subject    TEXT NOT NULL,
  status     TEXT NOT NULL,        -- SUCCESS | ERROR
  error      TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id         TEXT PRIMARY KEY,
  timestamp  TEXT NOT NULL DEFAULT (datetime('now')),
  user_email TEXT,
  action     TEXT NOT NULL,
  details    TEXT
);

-- Tarefas de geração de videoaula por IA (fluxo assíncrono, estados reais).
-- A geração NÃO ocorre na requisição HTTP; um worker processa a fila.
CREATE TABLE IF NOT EXISTS video_jobs (
  id            TEXT PRIMARY KEY,
  lesson_id     TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  course_id     TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title         TEXT,
  script        TEXT,                 -- roteiro final usado na geração
  engine        TEXT NOT NULL,        -- 'auto' | 'huggingface' | 'replicate' | 'custom' | 'assembled'
  -- Estados reais acompanhados no backend:
  -- QUEUED | SUBMITTING | PROCESSING | COMPLETED | FAILED | CANCELED
  status        TEXT NOT NULL DEFAULT 'QUEUED'
                  CHECK (status IN ('QUEUED','SUBMITTING','PROCESSING','COMPLETED','FAILED','CANCELED')),
  provider_job_id TEXT,               -- id da tarefa no provedor (quando houver)
  result_url    TEXT,                 -- caminho público do vídeo gerado
  error         TEXT,
  -- Progresso: só preenchido quando há base real (ex.: provedor informou). Senão NULL.
  progress      INTEGER,
  published     INTEGER NOT NULL DEFAULT 0,   -- 1 após publicação na aula
  created_by    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_video_jobs_status ON video_jobs(status);
CREATE INDEX IF NOT EXISTS idx_video_jobs_lesson ON video_jobs(lesson_id);

CREATE INDEX IF NOT EXISTS idx_modules_course ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_module ON lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_threads_student ON message_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON lesson_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_access_user ON course_access(user_id);
