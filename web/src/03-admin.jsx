function AdminView({ user, showToast }) {
  const [sub, setSub] = useState('ENROLLMENTS');
  const tabBtn = (id, label) => (
    <button onClick={() => setSub(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${sub === id ? 'bg-gold-500 text-forest-900' : 'bg-forest-700 text-ivory-100'}`}>{label}</button>
  );
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-forest-800 text-ivory-50 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gold-500/30">
        <div>
          <span className="text-xs font-bold text-gold-400 uppercase tracking-wider">Painel Administrativo</span>
          <h2 className="font-serif font-bold text-2xl">Gestão Institucional & Pedagógica</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabBtn('ENROLLMENTS', '📋 Inscrições')}
          {tabBtn('MESSAGES', '💬 Mensagens')}
          {tabBtn('VIDEOAI', '🎬 Vídeos IA')}
          {tabBtn('EMAIL', '✉️ E-mail')}
          {tabBtn('USERS', '👥 Usuários')}
          {tabBtn('AUDIT', '📜 Logs')}
        </div>
      </div>

      {sub === 'ENROLLMENTS' && <EnrollmentsAdmin showToast={showToast} />}
      {sub === 'MESSAGES' && <MessagesTab user={user} showToast={showToast} isAdmin={true} />}
      {sub === 'VIDEOAI' && <VideoAiAdmin showToast={showToast} />}
      {sub === 'EMAIL' && <EmailAdmin showToast={showToast} />}
      {sub === 'USERS' && <UsersAdmin />}
      {sub === 'AUDIT' && <AuditAdmin />}
    </div>
  );
}

function EnrollmentsAdmin({ showToast }) {
  const [rows, setRows] = useState(null);
  const load = useCallback(() => Api.enrollments().then((d) => setRows(d.enrollments)).catch(() => setRows([])), []);
  useEffect(() => { load(); }, []);

  const act = async (id, approve) => {
    try {
      const r = approve ? await Api.approveEnrollment(id) : await Api.rejectEnrollment(id);
      await load();
      const note = r.notification === 'SENT' ? ' E-mail de notificação enviado.' : ' (E-mail não enviado: ' + (r.notification || '').replace('NOT_SENT:', '') + ')';
      showToast((approve ? 'Inscrição aprovada e acesso liberado.' : 'Inscrição rejeitada.') + note);
    } catch (e) { showToast(e.message, 'error'); }
  };

  if (!rows) return <Spinner />;
  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="font-serif font-bold text-lg text-forest-900">Solicitações de Inscrição</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-forest-800">
          <thead className="bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"><tr><th className="p-3">Candidato</th><th className="p-3">E-mail</th><th className="p-3">Curso</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3 text-right">Ação</th></tr></thead>
          <tbody className="divide-y divide-ivory-200">
            {rows.length === 0 ? <tr><td colSpan="6" className="p-6 text-center italic text-forest-600">Nenhuma solicitação.</td></tr> : rows.map((e) => (
              <tr key={e.id} className="hover:bg-ivory-50">
                <td className="p-3 font-semibold text-forest-900">{e.user_name}</td>
                <td className="p-3">{e.email}</td>
                <td className="p-3">{e.course_title}</td>
                <td className="p-3">{String(e.request_date).slice(0, 10)}</td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded font-bold text-[10px] ${e.status === 'APPROVED' ? 'bg-forest-100 text-forest-800' : e.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gold-100 text-gold-800'}`}>{e.status === 'APPROVED' ? 'APROVADO' : e.status === 'REJECTED' ? 'REJEITADO' : 'PENDENTE'}</span></td>
                <td className="p-3 text-right">
                  {e.status === 'PENDING' && (
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => act(e.id, true)} className="bg-forest-700 hover:bg-forest-800 text-ivory-50 px-3 py-1 rounded font-bold text-[11px]">Aprovar</button>
                      <button onClick={() => act(e.id, false)} className="bg-red-700 hover:bg-red-800 text-ivory-50 px-3 py-1 rounded font-bold text-[11px]">Rejeitar</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmailAdmin({ showToast }) {
  const [settings, setSettings] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [logs, setLogs] = useState([]);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState(false);

  const loadLogs = () => Api.emailLogs().then((d) => setLogs(d.logs)).catch(() => {});
  useEffect(() => {
    Api.emailSettings().then((d) => { setSettings(d.settings); setSmtpConfigured(d.smtpConfigured); setTestTo(d.settings.destination_email || ''); });
    loadLogs();
  }, []);

  const save = async (e) => {
    e.preventDefault();
    await Api.saveEmailSettings({
      destinationEmail: settings.destination_email,
      notifyOnEnrollment: !!settings.notify_on_enrollment,
      notifyOnApproval: !!settings.notify_on_approval,
      notifyOnCert: !!settings.notify_on_cert,
    });
    showToast('Configurações salvas.');
  };

  const verify = async () => {
    setBusy(true);
    try {
      const r = await Api.emailVerify();
      showToast(r.ok ? 'Conexão SMTP verificada com sucesso.' : 'SMTP indisponível: ' + (r.reason || ''), r.ok ? 'success' : 'error');
    } finally { setBusy(false); }
  };

  const test = async () => {
    setBusy(true);
    try {
      await Api.emailTest(testTo);
      showToast('E-mail de teste ENVIADO e confirmado para ' + testTo + '.');
    } catch (e) {
      const reason = e.data && e.data.reason ? e.data.reason : (e.message || '');
      showToast('Falha real no envio: ' + reason + '. Nenhum e-mail foi enviado.', 'error');
    } finally { setBusy(false); loadLogs(); }
  };

  if (!settings) return <Spinner />;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-lg text-forest-900">Configuração de E-mail</h3>
          <span className={`text-[10px] px-2 py-1 rounded font-bold ${smtpConfigured ? 'bg-forest-100 text-forest-800' : 'bg-red-100 text-red-700'}`}>{smtpConfigured ? 'SMTP configurado' : 'SMTP NÃO configurado'}</span>
        </div>
        {!smtpConfigured && (
          <div className="bg-gold-100/60 border border-gold-300 text-forest-800 text-[11px] p-3 rounded-lg">
            As credenciais SMTP ficam no servidor (variáveis <span className="font-mono">SMTP_HOST, SMTP_USER, SMTP_PASS</span>), nunca no app. Enquanto não configuradas, os envios reportarão falha honesta — nunca "enviado" falso.
          </div>
        )}
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-forest-800 mb-1">E-mail de destino das notificações</label>
            <input type="email" value={settings.destination_email || ''} onChange={(e) => setSettings({ ...settings, destination_email: e.target.value })} className="w-full border border-ivory-300 rounded p-2.5 text-xs" />
          </div>
          <div className="space-y-1 text-xs text-forest-800">
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!settings.notify_on_enrollment} onChange={(e) => setSettings({ ...settings, notify_on_enrollment: e.target.checked })} /> Notificar em novas inscrições</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!settings.notify_on_approval} onChange={(e) => setSettings({ ...settings, notify_on_approval: e.target.checked })} /> Notificar em aprovações/rejeições</label>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex-1 bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold py-2.5 rounded-xl text-xs shadow">Salvar</button>
            <button type="button" onClick={verify} disabled={busy} className="bg-ivory-200 hover:bg-ivory-300 text-forest-800 font-bold px-3 py-2.5 rounded-xl text-xs">Verificar SMTP</button>
          </div>
        </form>
        <div className="border-t border-ivory-200 pt-3 space-y-2">
          <label className="block text-xs font-bold text-forest-800">Enviar e-mail de teste real para:</label>
          <div className="flex gap-2">
            <input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} className="flex-1 border border-ivory-300 rounded p-2 text-xs" />
            <button onClick={test} disabled={busy} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-4 py-2 rounded-xl text-xs">Testar</button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between"><h3 className="font-serif font-bold text-lg text-forest-900">Histórico de Disparos</h3><button onClick={loadLogs} className="text-xs text-forest-600 underline">atualizar</button></div>
        <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
          {logs.length === 0 ? <p className="text-xs italic text-forest-600">Nenhum disparo registrado.</p> : logs.map((l) => (
            <div key={l.id} className="p-3 bg-ivory-50 border border-ivory-200 rounded-lg text-xs space-y-1">
              <div className="flex justify-between items-center font-bold text-forest-900">
                <span>{l.subject}</span>
                <span className={`font-mono text-[10px] ${l.status === 'SUCCESS' ? 'text-forest-700' : 'text-red-600'}`}>{l.status}</span>
              </div>
              <p className="text-[11px] text-forest-600">{l.recipient} • {String(l.timestamp).slice(0, 16)}</p>
              {l.error && <p className="text-[10px] text-red-600">{l.error}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UsersAdmin() {
  const [users, setUsers] = useState(null);
  useEffect(() => { Api.adminUsers().then((d) => setUsers(d.users)).catch(() => setUsers([])); }, []);
  if (!users) return <Spinner />;
  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="font-serif font-bold text-lg text-forest-900">Usuários</h3>
      <table className="w-full text-left text-xs text-forest-800">
        <thead className="bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"><tr><th className="p-3">Nome</th><th className="p-3">E-mail</th><th className="p-3">Perfil</th><th className="p-3">Cursos</th></tr></thead>
        <tbody className="divide-y divide-ivory-200">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-ivory-50"><td className="p-3 font-semibold text-forest-900">{u.name}</td><td className="p-3">{u.email}</td><td className="p-3"><span className="font-mono text-[10px] font-bold">{u.role}</span></td><td className="p-3">{u.courses.join(', ') || '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditAdmin() {
  const [logs, setLogs] = useState(null);
  useEffect(() => { Api.adminAuditLogs().then((d) => setLogs(d.logs)).catch(() => setLogs([])); }, []);
  if (!logs) return <Spinner />;
  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="font-serif font-bold text-lg text-forest-900">Logs de Auditoria</h3>
      <table className="w-full text-left text-xs text-forest-800">
        <thead className="bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"><tr><th className="p-3">Data</th><th className="p-3">Usuário</th><th className="p-3">Ação</th><th className="p-3">Detalhes</th></tr></thead>
        <tbody className="divide-y divide-ivory-200 font-mono text-[11px]">
          {logs.map((l) => (
            <tr key={l.id} className="hover:bg-ivory-50"><td className="p-3 text-forest-600">{String(l.timestamp).slice(0, 16)}</td><td className="p-3 font-semibold text-forest-900">{l.user_email}</td><td className="p-3 text-gold-600 font-bold">{l.action}</td><td className="p-3">{l.details}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// GERADOR DE VIDEOAULAS COM IA — fluxo completo e assíncrono.
// Etapas: selecionar curso/módulo/aula -> título + roteiro (gerável por IA) ->
// escolher motor -> criar job -> acompanhar estado real -> prévia -> publicar.
function VideoAiAdmin({ showToast }) {
  const [status, setStatus] = useState(null);
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [title, setTitle] = useState('');
  const [script, setScript] = useState('');
  const [engine, setEngine] = useState('auto');
  const [scriptSource, setScriptSource] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [busy, setBusy] = useState(false);

  const loadJobs = useCallback(() => Api.videoJobs().then((d) => setJobs(d.jobs)).catch(() => {}), []);

  useEffect(() => {
    Api.videoAiStatus().then(setStatus).catch(() => setStatus({ configured: false }));
    Api.myCourses().then((d) => { setCourses(d.courses); if (d.courses[0]) setCourseId(d.courses[0].id); }).catch(() => setCourses([]));
    loadJobs();
  }, []);

  // Polling do estado dos jobs enquanto houver algum em andamento.
  useEffect(() => {
    const active = jobs.some((j) => ['QUEUED', 'SUBMITTING', 'PROCESSING'].includes(j.status));
    if (!active) return;
    const t = setInterval(loadJobs, 3000);
    return () => clearInterval(t);
  }, [jobs]);

  const course = (courses || []).find((c) => c.id === courseId);
  const lessons = course ? course.modules.flatMap((m) => m.lessons.map((l) => ({ ...l, moduleTitle: m.title }))) : [];

  const onSelectLesson = (id) => {
    setLessonId(id);
    const l = lessons.find((x) => x.id === id);
    if (l && !title) setTitle(l.title);
  };

  const genScript = async () => {
    if (!lessonId) { showToast('Selecione a aula primeiro.', 'error'); return; }
    setBusy(true);
    try {
      const r = await Api.generateScript({ lessonId, title });
      setScript(r.script);
      setScriptSource(r.source);
      showToast(r.source === 'ai' ? 'Roteiro gerado pela IA.' : 'Roteiro-base derivado do conteúdo da aula (sem IA).');
    } catch (e) { showToast('Falha ao gerar roteiro: ' + (e.message || ''), 'error'); }
    finally { setBusy(false); }
  };

  const createJob = async () => {
    if (!lessonId || !script.trim()) { showToast('Selecione a aula e informe o roteiro.', 'error'); return; }
    setBusy(true);
    try {
      await Api.createVideoJob({ lessonId, title, script, engine });
      showToast('Tarefa de geração enfileirada. Acompanhe o estado abaixo.');
      await loadJobs();
    } catch (e) {
      const reason = e.data && e.data.reason ? e.data.reason : (e.message || '');
      if (reason === 'VIDEO_AI_NOT_CONFIGURED') showToast('Nenhum motor de vídeo disponível no servidor. Veja as instruções acima.', 'error');
      else showToast('Falha ao criar tarefa: ' + reason, 'error');
    } finally { setBusy(false); }
  };

  const act = async (jobId, kind) => {
    try {
      if (kind === 'publish') { await Api.publishVideoJob(jobId); showToast('Vídeo publicado na aula.'); }
      if (kind === 'retry') { await Api.retryVideoJob(jobId); showToast('Tarefa re-enfileirada.'); }
      if (kind === 'cancel') { await Api.cancelVideoJob(jobId); showToast('Tarefa cancelada.'); }
      await loadJobs();
    } catch (e) { showToast(e.message || 'Falha na ação.', 'error'); }
  };

  const STATE_LABEL = {
    QUEUED: 'Aguardando na fila', SUBMITTING: 'Enviando solicitação', PROCESSING: 'Em processamento',
    COMPLETED: 'Concluído', FAILED: 'Falha', CANCELED: 'Cancelado',
  };
  const STATE_COLOR = {
    QUEUED: 'bg-ivory-200 text-forest-700', SUBMITTING: 'bg-gold-100 text-gold-700', PROCESSING: 'bg-gold-100 text-gold-700',
    COMPLETED: 'bg-forest-100 text-forest-800', FAILED: 'bg-red-100 text-red-700', CANCELED: 'bg-ivory-200 text-forest-600',
  };

  if (!status || !courses) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
          <div>
            <h3 className="font-serif font-bold text-lg text-forest-900">🎬 Gerador de Videoaulas com IA</h3>
            <p className="text-xs text-forest-600">Gera um vídeo real e o associa à aula. A publicação é uma etapa separada.</p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded font-bold ${status.configured ? 'bg-forest-100 text-forest-800' : 'bg-red-100 text-red-700'}`}>
            {status.configured ? 'Motor ativo: ' + status.provider : 'Nenhum motor disponível'}
          </span>
        </div>

        {!status.configured && (
          <div className="bg-gold-100/60 border border-gold-300 text-forest-800 text-xs p-3 rounded-lg leading-relaxed space-y-1">
            <p>Configure <strong>um</strong> motor no servidor (detecção automática):</p>
            <p><strong>Grátis (API, sem cartão):</strong> <span className="font-mono">HF_TOKEN</span> (Hugging Face, perm. "Inference Providers").</p>
            <p><strong>Grátis (sem provedor):</strong> motor <strong>assembled</strong> = roteiro + narração + slides + vídeo via <span className="font-mono">ffmpeg</span> instalado no servidor (+ opcional <span className="font-mono">espeak-ng</span> ou <span className="font-mono">OPENAI_API_KEY</span> para a voz).</p>
            <p><strong>Pago:</strong> <span className="font-mono">REPLICATE_API_TOKEN</span> (~US$0,05/vídeo) ou <span className="font-mono">VIDEO_AI_URL</span>+<span className="font-mono">VIDEO_AI_KEY</span>.</p>
            <p>Sem nenhum, nada é gerado ou fabricado.</p>
          </div>
        )}

        {/* Formulário de criação */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-forest-800 mb-1">Curso</label>
            <select value={courseId} onChange={(e) => { setCourseId(e.target.value); setLessonId(''); }} className="w-full border border-ivory-300 rounded p-2">
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-forest-800 mb-1">Módulo / Aula</label>
            <select value={lessonId} onChange={(e) => onSelectLesson(e.target.value)} className="w-full border border-ivory-300 rounded p-2">
              <option value="">— selecione —</option>
              {lessons.map((l) => <option key={l.id} value={l.id}>{l.moduleTitle} · {l.title}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-bold text-forest-800 mb-1">Título da aula</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-ivory-300 rounded p-2" placeholder="Título exibido no vídeo" />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-forest-800">Roteiro {scriptSource && <span className="text-[10px] text-forest-500">({scriptSource === 'ai' ? 'gerado por IA' : 'derivado do conteúdo'})</span>}</label>
              <button type="button" onClick={genScript} disabled={busy || !lessonId} className="bg-ivory-200 hover:bg-ivory-300 disabled:opacity-40 text-forest-800 font-bold px-3 py-1 rounded text-[11px]">✨ Gerar/Revisar roteiro com IA</button>
            </div>
            <textarea rows={6} value={script} onChange={(e) => setScript(e.target.value)} className="w-full border border-ivory-300 rounded p-2 font-mono" placeholder="Escreva o roteiro ou gere com a IA. Parágrafos separados por linha em branco viram slides." />
          </div>
          <div>
            <label className="block font-bold text-forest-800 mb-1">Motor</label>
            <select value={engine} onChange={(e) => setEngine(e.target.value)} className="w-full border border-ivory-300 rounded p-2">
              <option value="auto">Automático (recomendado)</option>
              <option value="assembled">Produção automatizada (slides + narração)</option>
              <option value="huggingface">Hugging Face (grátis)</option>
              <option value="replicate">Replicate</option>
              <option value="custom">Endpoint próprio</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={createJob} disabled={busy || !status.configured} className="w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-40 text-ivory-50 font-bold py-2.5 rounded-xl shadow">
              Gerar videoaula
            </button>
          </div>
        </div>
      </div>

      {/* Fila / estado real das tarefas */}
      <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-serif font-bold text-base text-forest-900">Tarefas de geração</h4>
          <button onClick={loadJobs} className="text-xs text-forest-600 underline">atualizar</button>
        </div>
        {jobs.length === 0 ? <p className="text-xs italic text-forest-600">Nenhuma tarefa ainda.</p> : (
          <div className="space-y-3">
            {jobs.map((j) => (
              <div key={j.id} className="border border-ivory-200 rounded-xl p-3 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-forest-900">{j.lesson_title || j.title}</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${STATE_COLOR[j.status]}`}>
                    {STATE_LABEL[j.status] || j.status}{typeof j.progress === 'number' ? ' · ' + j.progress + '%' : ''}
                  </span>
                </div>
                <div className="text-[10px] text-forest-500 font-mono">motor: {j.engine} · {String(j.updated_at).slice(0, 16)}{j.published ? ' · PUBLICADO' : ''}</div>
                {j.error && <div className="text-[11px] text-red-600">Erro: {j.error}</div>}
                {j.status === 'COMPLETED' && j.result_url && (
                  <div className="space-y-2">
                    <video controls className="w-full max-w-md rounded-lg border border-ivory-300 bg-black" src={(window.UMBANDA_CONFIG.apiBase.replace('/api','')) + j.result_url} />
                    <div className="flex gap-2">
                      {!j.published && <button onClick={() => act(j.id, 'publish')} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-3 py-1.5 rounded-lg text-[11px]">Publicar na aula</button>}
                      {j.published && <span className="text-forest-700 font-bold">✓ Publicado</span>}
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  {(j.status === 'FAILED' || j.status === 'CANCELED') && <button onClick={() => act(j.id, 'retry')} className="bg-forest-700 text-ivory-50 px-3 py-1 rounded text-[11px] font-bold">Tentar novamente</button>}
                  {['QUEUED', 'PROCESSING', 'SUBMITTING'].includes(j.status) && <button onClick={() => act(j.id, 'cancel')} className="bg-ivory-200 text-forest-700 px-3 py-1 rounded text-[11px] font-bold">Cancelar</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
