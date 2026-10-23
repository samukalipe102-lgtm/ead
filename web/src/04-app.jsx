const { useState, useEffect, useRef, useCallback } = React;
const Api = window.Api;

// ---------------------------------------------------------------------------
// App raiz: autenticação real (JWT), roteamento por abas, detecção de offline.
// ---------------------------------------------------------------------------
function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const [online, setOnline] = useState(true);
  const [tab, setTab] = useState('INSTITUTIONAL');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Sessão persistente: se há token, recupera o usuário do servidor.
  useEffect(() => {
    (async () => {
      try {
        await Api.health();
        setOnline(true);
        if (Api.getToken()) {
          const { user } = await Api.me();
          setUser(user);
          setTab(user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
        }
      } catch (e) {
        if (e.network) setOnline(false);
        else Api.setToken(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const handleLogout = () => {
    Api.setToken(null);
    setUser(null);
    setTab('INSTITUTIONAL');
    showToast('Sessão encerrada.');
  };

  if (booting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ivory-50">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-forest-700 border-2 border-gold-400 flex items-center justify-center text-gold-400 text-2xl mx-auto animate-pulse">🌿</div>
          <p className="text-xs text-forest-700">Conectando ao portal...</p>
        </div>
      </div>
    );
  }

  if (!online) {
    return <OfflineScreen onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="flex flex-col min-h-screen selection:bg-gold-300 selection:text-forest-900">
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-900 text-ivory-50 border-red-700' : 'bg-forest-800 text-gold-400 border-gold-400'}`}>
          <span>{toast.type === 'error' ? '⚠️' : '✨'}</span>
          <span>{toast.msg}</span>
        </div>
      )}

      <Header user={user} tab={tab} setTab={setTab} onLogout={handleLogout} />

      <main className="flex-1 bg-ivory-50">
        {tab === 'INSTITUTIONAL' && <InstitutionalView setTab={setTab} showToast={showToast} />}
        {tab === 'LOGIN' && <LoginView onLogin={(u) => { setUser(u); setTab(u.role === 'ADMIN' ? 'ADMIN' : 'STUDENT'); }} showToast={showToast} />}
        {tab === 'STUDENT' && user && <StudentView user={user} showToast={showToast} />}
        {tab === 'ADMIN' && user && user.role === 'ADMIN' && <AdminView user={user} showToast={showToast} />}
        {tab === 'CERT_VERIFY' && <CertVerifyView />}
      </main>

      <Footer setTab={setTab} />
    </div>
  );
}

function OfflineScreen({ onRetry }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-forest-900 text-ivory-50 p-6">
      <div className="max-w-md text-center space-y-5 bg-forest-800 border border-gold-500/30 rounded-2xl p-8">
        <div className="text-5xl">📡</div>
        <h1 className="font-serif font-bold text-2xl text-gold-400">Sem conexão com o servidor</h1>
        <p className="text-sm text-ivory-200 leading-relaxed">
          A plataforma é EAD e precisa de internet para acessar os cursos, mensagens e certificados.
          Verifique sua conexão e tente novamente.
        </p>
        <button onClick={onRetry} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-6 py-2.5 rounded-xl text-xs shadow">
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function Header({ user, tab, setTab, onLogout }) {
  const navBtn = (id, label) => (
    <button onClick={() => setTab(id)} className={`hover:text-gold-400 transition py-1 ${tab === id ? 'text-gold-400 font-bold border-b-2 border-gold-400' : 'text-ivory-100'}`}>{label}</button>
  );
  return (
    <header className="bg-forest-900 text-ivory-50 border-b border-gold-500/30 sticky top-0 z-40 shadow-md">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setTab('INSTITUTIONAL')}>
          <div className="w-10 h-10 rounded-full bg-forest-700 border-2 border-gold-400 flex items-center justify-center text-gold-400 font-bold text-lg shadow">🌿</div>
          <div>
            <h1 className="font-serif font-bold text-base md:text-lg tracking-wide leading-tight">Formação Sacerdotal de Umbanda</h1>
            <p className="text-[11px] text-gold-400 font-medium">Tradição, Sabedoria & Espiritualidade</p>
          </div>
        </div>
        <nav className="hidden md:flex items-center space-x-6 text-xs font-semibold">
          {navBtn('INSTITUTIONAL', 'Página Inicial & Cursos')}
          {user && user.role === 'STUDENT' && navBtn('STUDENT', 'Área do Aluno (EAD)')}
          {user && user.role === 'ADMIN' && navBtn('ADMIN', 'Painel Administrativo')}
          {navBtn('CERT_VERIFY', 'Validar Certificado')}
        </nav>
        <div className="flex items-center space-x-3">
          {user ? (
            <div className="flex items-center space-x-3 bg-forest-950/80 px-3 py-1.5 rounded-xl border border-forest-700">
              <div className="text-right text-xs">
                <p className="font-semibold leading-tight">{user.name}</p>
                <span className="text-gold-400 text-[10px] uppercase font-mono font-bold tracking-wider">{user.role === 'ADMIN' ? 'Administrador' : 'Aluno'}</span>
              </div>
              <button onClick={onLogout} className="bg-forest-800 hover:bg-forest-700 text-ivory-100 px-2.5 py-1 rounded text-xs transition border border-forest-600">Sair</button>
            </div>
          ) : (
            <button onClick={() => setTab('LOGIN')} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-4 py-1.5 rounded-lg text-xs shadow transition">Acessar Portal EAD</button>
          )}
        </div>
      </div>
    </header>
  );
}

function Footer({ setTab }) {
  return (
    <footer className="bg-forest-900 text-ivory-200 border-t border-forest-800 text-xs py-8">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <h3 className="font-serif font-bold text-sm text-gold-400 mb-2">Formação Sacerdotal de Umbanda</h3>
          <p className="text-ivory-300 leading-relaxed">Plataforma EAD independente para preservação, ensino e formação sacerdotal fundamentada na caridade, na tradição e na ética umbandista.</p>
        </div>
        <div>
          <h4 className="font-semibold text-ivory-100 mb-2">Links Rápidos</h4>
          <ul className="space-y-1 text-ivory-300">
            <li><button onClick={() => setTab('CERT_VERIFY')} className="hover:underline">Verificação Autêntica de Certificados</button></li>
            <li><button onClick={() => setTab('INSTITUTIONAL')} className="hover:underline">Grade Curricular de 6 Cursos</button></li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-ivory-100 mb-2">Segurança e LGPD</h4>
          <p className="text-ivory-300 mb-2">Todos os dados dos alunos são protegidos. O conteúdo pedagógico respeita a diversidade de tradições.</p>
          <p className="text-gold-400/80">© 2026 Formação Sacerdotal de Umbanda.</p>
        </div>
      </div>
    </footer>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
