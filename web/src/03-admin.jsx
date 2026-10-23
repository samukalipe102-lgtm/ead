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
          {tabBtn('EMAIL', '✉️ E-mail')}
          {tabBtn('USERS', '👥 Usuários')}
          {tabBtn('AUDIT', '📜 Logs')}
        </div>
      </div>

      {sub === 'ENROLLMENTS' && <EnrollmentsAdmin showToast={showToast} />}
      {sub === 'MESSAGES' && <MessagesTab user={user} showToast={showToast} isAdmin={true} />}
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
