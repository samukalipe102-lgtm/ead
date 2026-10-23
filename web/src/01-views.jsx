// Views da plataforma. Todas consomem a API real (window.Api).

function Spinner({ label }) {
  return <div className="text-center py-8 text-xs text-forest-600">{label || 'Carregando...'}</div>;
}

// Rótulo honesto do estado de vídeo.
function VideoStateBadge({ status }) {
  const map = {
    AVAILABLE: { t: 'Disponível', c: 'bg-forest-100 text-forest-800' },
    PROCESSING: { t: 'Em processamento', c: 'bg-gold-100 text-gold-700' },
    UNAVAILABLE: { t: 'Vídeo ainda não disponível', c: 'bg-ivory-200 text-forest-700' },
    ERROR: { t: 'Erro ao carregar', c: 'bg-red-100 text-red-700' },
  };
  const m = map[status] || map.UNAVAILABLE;
  return <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${m.c}`}>{m.t}</span>;
}

// ----------------------------- INSTITUCIONAL -----------------------------
function InstitutionalView({ setTab, showToast }) {
  const [courses, setCourses] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', courseId: 'c6' });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    Api.catalog().then((d) => setCourses(d.courses)).catch(() => setCourses([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await Api.requestEnrollment(form.name, form.email, form.courseId);
      setSubmitted(true);
      if (r.notification === 'SENT') showToast('Solicitação registrada! A administração foi notificada por e-mail.');
      else showToast('Solicitação registrada! (Notificação por e-mail indisponível no servidor — a administração verá no painel.)');
    } catch (err) {
      showToast(err.message || 'Falha ao enviar solicitação.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-12 pb-12">
      <section className="relative bg-gradient-to-b from-forest-900 via-forest-800 to-forest-700 text-ivory-50 py-16 px-4 border-b border-gold-500/30">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-block bg-gold-500/10 border border-gold-400/40 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider">Sacerdócio, Tradição & Conhecimento EAD</div>
          <h1 className="font-serif text-3xl md:text-5xl font-bold leading-tight">Formação Sacerdotal de Umbanda</h1>
          <p className="text-base md:text-lg text-ivory-200 max-w-3xl mx-auto font-light leading-relaxed">Prepare-se para o sacerdócio e aprofunde seus conhecimentos mediúnicos com 6 formações independentes, videoaulas, textos fundamentados e acompanhamento.</p>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <button onClick={() => setModal(true)} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-6 py-3 rounded-xl shadow-lg transition text-xs uppercase tracking-wider">Inscrever-se na Formação</button>
            <button onClick={() => setTab('LOGIN')} className="bg-forest-600 hover:bg-forest-500 text-ivory-50 font-semibold px-6 py-3 rounded-xl border border-gold-400/40 transition text-xs uppercase tracking-wider">Acessar Portal do Aluno</button>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="font-serif text-2xl md:text-3xl font-bold text-forest-900">Catálogo de Cursos & Formações Independentes</h2>
          <p className="text-xs md:text-sm text-forest-700 max-w-2xl mx-auto">Cada curso possui sua própria inscrição, carga horária, aulas, atividades, avaliações e certificado correspondente.</p>
        </div>
        {!courses ? <Spinner /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((c) => (
              <div key={c.id} className="bg-white border border-ivory-300 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <span className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase ${c.hours === 300 ? 'bg-gold-500 text-forest-900' : 'bg-forest-100 text-forest-800'}`}>{c.hours} Horas</span>
                    <span className="text-[11px] text-forest-600 font-medium">{c.type === 'SACERDOTAL' ? 'Formação Sacerdotal' : 'Especialização'}</span>
                  </div>
                  <h3 className="font-serif font-bold text-base text-forest-900 leading-snug">{c.title}</h3>
                  <p className="text-xs text-forest-700 leading-relaxed">{c.description}</p>
                </div>
                <div className="pt-4 border-t border-ivory-200 space-y-3">
                  <div className="flex justify-between items-center text-xs text-forest-600 font-medium">
                    <span>{c.moduleCount} Módulo(s)</span><span>{c.hours}h Certificadas</span>
                  </div>
                  <button onClick={() => { setForm({ ...form, courseId: c.id }); setModal(true); }} className="w-full bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold py-2 rounded-xl text-xs transition shadow">Solicitar Inscrição Neste Curso →</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gold-400">
            <div className="flex justify-between items-center">
              <h3 className="font-serif font-bold text-lg text-forest-900">Formulário de Inscrição</h3>
              <button onClick={() => { setModal(false); setSubmitted(false); }} className="text-forest-600 font-bold">✕</button>
            </div>
            {submitted ? (
              <div className="space-y-4 text-center py-4">
                <div className="w-12 h-12 bg-forest-100 text-forest-700 rounded-full flex items-center justify-center mx-auto text-2xl">✓</div>
                <h4 className="font-bold text-forest-900 text-base">Inscrição Solicitada com Sucesso!</h4>
                <p className="text-xs text-forest-700 leading-relaxed">Sua solicitação foi salva no sistema. A administração analisará e notificará você quando a matrícula for ativada.</p>
                <button onClick={() => { setModal(false); setSubmitted(false); }} className="w-full bg-forest-700 text-ivory-50 py-2 rounded-xl text-xs font-semibold">Fechar</button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">Nome Completo</label>
                  <input type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-ivory-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600" placeholder="Digite seu nome completo" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">E-mail para Acesso</label>
                  <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="w-full border border-ivory-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600" placeholder="seuemail@exemplo.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-forest-800 mb-1">Curso Desejado</label>
                  <select value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} className="w-full border border-ivory-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600">
                    {(courses || []).map((c) => <option key={c.id} value={c.id}>{c.title} ({c.hours}h)</option>)}
                  </select>
                </div>
                <button type="submit" disabled={sending} className="w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-forest-900 font-bold py-2.5 rounded-xl text-xs transition shadow">{sending ? 'Enviando...' : 'Enviar Solicitação de Inscrição'}</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------- LOGIN -----------------------------
function LoginView({ onLogin, showToast }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { token, user } = await Api.login(email, password);
      Api.setToken(token);
      showToast('Bem-vindo(a), ' + user.name + '!');
      onLogin(user);
    } catch (err) {
      setError(err.network ? 'Sem conexão com o servidor.' : (err.message || 'Credenciais incorretas.'));
      showToast('Falha ao autenticar.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-16 px-4">
      <div className="bg-white border border-ivory-300 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-forest-100 text-forest-800 rounded-full flex items-center justify-center mx-auto text-xl font-bold">🌿</div>
          <h2 className="font-serif font-bold text-2xl text-forest-900">Acesso ao Portal EAD</h2>
          <p className="text-xs text-forest-600">Entre com seu e-mail e senha cadastrados</p>
        </div>
        {error && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-forest-800 mb-1">E-mail cadastrado</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600" />
          </div>
          <div>
            <label className="block text-xs font-bold text-forest-800 mb-1">Senha de acesso</label>
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-60 text-ivory-50 font-bold py-2.5 rounded-xl text-xs shadow transition">{loading ? 'Entrando...' : 'Entrar no Portal de Estudos'}</button>
        </form>
      </div>
    </div>
  );
}

// ----------------------------- CERT VERIFY -----------------------------
function CertVerifyView() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const verify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await Api.verifyCertificate(code.trim());
      setResult(r);
    } catch { setResult({ valid: false }); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-xl mx-auto my-16 px-4 space-y-6">
      <div className="bg-white border border-ivory-300 rounded-2xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="text-3xl">📜</div>
          <h2 className="font-serif font-bold text-2xl text-forest-900">Verificação de Autenticidade de Certificados</h2>
          <p className="text-xs text-forest-600">Insira o código impresso no documento para verificar o registro oficial da plataforma.</p>
        </div>
        <form onSubmit={verify} className="space-y-4">
          <input type="text" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="Ex: CERT-300-8841" className="w-full border border-ivory-300 rounded p-2.5 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-forest-600" />
          <button type="submit" disabled={loading} className="w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-60 text-ivory-50 font-bold py-2.5 rounded-xl text-sm shadow transition">{loading ? 'Verificando...' : 'Verificar no Banco de Dados'}</button>
        </form>
        {result && (
          <div className="pt-4 border-t border-ivory-200">
            {result.valid ? (
              <div className="bg-forest-50 border border-forest-300 p-4 rounded-xl space-y-2 text-xs">
                <div className="flex items-center space-x-2 text-forest-800 font-bold"><span className="text-base">✓</span><span>CERTIFICADO VÁLIDO E AUTÊNTICO</span></div>
                <p><strong>Estudante:</strong> {result.certificate.user_name}</p>
                <p><strong>Formação:</strong> {result.certificate.course_title}</p>
                <p><strong>Carga Horária:</strong> {result.certificate.hours} Horas</p>
                <p><strong>Data de Emissão:</strong> {String(result.certificate.issue_date).slice(0, 10)}</p>
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-700 font-medium text-center">Certificado não encontrado no registro oficial da plataforma.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
