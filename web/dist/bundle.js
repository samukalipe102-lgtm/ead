// Views da plataforma. Todas consomem a API real (window.Api).

function Spinner({
  label
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "text-center py-8 text-xs text-forest-600"
  }, label || 'Carregando...');
}

// Rótulo honesto do estado de vídeo.
function VideoStateBadge({
  status
}) {
  const map = {
    AVAILABLE: {
      t: 'Disponível',
      c: 'bg-forest-100 text-forest-800'
    },
    PROCESSING: {
      t: 'Em processamento',
      c: 'bg-gold-100 text-gold-700'
    },
    UNAVAILABLE: {
      t: 'Vídeo ainda não disponível',
      c: 'bg-ivory-200 text-forest-700'
    },
    ERROR: {
      t: 'Erro ao carregar',
      c: 'bg-red-100 text-red-700'
    }
  };
  const m = map[status] || map.UNAVAILABLE;
  return /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-2 py-0.5 rounded font-bold ${m.c}`
  }, m.t);
}

// ----------------------------- INSTITUCIONAL -----------------------------
function InstitutionalView({
  setTab,
  showToast
}) {
  const [courses, setCourses] = useState(null);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    courseId: 'c6'
  });
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  useEffect(() => {
    Api.catalog().then(d => setCourses(d.courses)).catch(() => setCourses([]));
  }, []);
  const submit = async e => {
    e.preventDefault();
    setSending(true);
    try {
      const r = await Api.requestEnrollment(form.name, form.email, form.courseId);
      setSubmitted(true);
      if (r.notification === 'SENT') showToast('Solicitação registrada! A administração foi notificada por e-mail.');else showToast('Solicitação registrada! (Notificação por e-mail indisponível no servidor — a administração verá no painel.)');
    } catch (err) {
      showToast(err.message || 'Falha ao enviar solicitação.', 'error');
    } finally {
      setSending(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-12 pb-12"
  }, /*#__PURE__*/React.createElement("section", {
    className: "relative bg-gradient-to-b from-forest-900 via-forest-800 to-forest-700 text-ivory-50 py-16 px-4 border-b border-gold-500/30"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-5xl mx-auto text-center space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "inline-block bg-gold-500/10 border border-gold-400/40 text-gold-300 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider"
  }, "Sacerd\xF3cio, Tradi\xE7\xE3o & Conhecimento EAD"), /*#__PURE__*/React.createElement("h1", {
    className: "font-serif text-3xl md:text-5xl font-bold leading-tight"
  }, "Forma\xE7\xE3o Sacerdotal de Umbanda"), /*#__PURE__*/React.createElement("p", {
    className: "text-base md:text-lg text-ivory-200 max-w-3xl mx-auto font-light leading-relaxed"
  }, "Prepare-se para o sacerd\xF3cio e aprofunde seus conhecimentos medi\xFAnicos com 6 forma\xE7\xF5es independentes, videoaulas, textos fundamentados e acompanhamento."), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-center gap-4 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => setModal(true),
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-6 py-3 rounded-xl shadow-lg transition text-xs uppercase tracking-wider"
  }, "Inscrever-se na Forma\xE7\xE3o"), /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('LOGIN'),
    className: "bg-forest-600 hover:bg-forest-500 text-ivory-50 font-semibold px-6 py-3 rounded-xl border border-gold-400/40 transition text-xs uppercase tracking-wider"
  }, "Acessar Portal do Aluno")))), /*#__PURE__*/React.createElement("section", {
    className: "max-w-6xl mx-auto px-4 space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-2"
  }, /*#__PURE__*/React.createElement("h2", {
    className: "font-serif text-2xl md:text-3xl font-bold text-forest-900"
  }, "Cat\xE1logo de Cursos & Forma\xE7\xF5es Independentes"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs md:text-sm text-forest-700 max-w-2xl mx-auto"
  }, "Cada curso possui sua pr\xF3pria inscri\xE7\xE3o, carga hor\xE1ria, aulas, atividades, avalia\xE7\xF5es e certificado correspondente.")), !courses ? /*#__PURE__*/React.createElement(Spinner, null) : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
  }, courses.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "bg-white border border-ivory-300 rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-2.5 py-1 rounded font-bold uppercase ${c.hours === 300 ? 'bg-gold-500 text-forest-900' : 'bg-forest-100 text-forest-800'}`
  }, c.hours, " Horas"), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-forest-600 font-medium"
  }, c.type === 'SACERDOTAL' ? 'Formação Sacerdotal' : 'Especialização')), /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-base text-forest-900 leading-snug"
  }, c.title), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-700 leading-relaxed"
  }, c.description)), /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-ivory-200 space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center text-xs text-forest-600 font-medium"
  }, /*#__PURE__*/React.createElement("span", null, c.moduleCount, " M\xF3dulo(s)"), /*#__PURE__*/React.createElement("span", null, c.hours, "h Certificadas")), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setForm({
        ...form,
        courseId: c.id
      });
      setModal(true);
    },
    className: "w-full bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold py-2 rounded-xl text-xs transition shadow"
  }, "Solicitar Inscri\xE7\xE3o Neste Curso \u2192")))))), modal && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gold-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Formul\xE1rio de Inscri\xE7\xE3o"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(false);
      setSubmitted(false);
    },
    className: "text-forest-600 font-bold"
  }, "\u2715")), submitted ? /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 text-center py-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-forest-100 text-forest-700 rounded-full flex items-center justify-center mx-auto text-2xl"
  }, "\u2713"), /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-forest-900 text-base"
  }, "Inscri\xE7\xE3o Solicitada com Sucesso!"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-700 leading-relaxed"
  }, "Sua solicita\xE7\xE3o foi salva no sistema. A administra\xE7\xE3o analisar\xE1 e notificar\xE1 voc\xEA quando a matr\xEDcula for ativada."), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setModal(false);
      setSubmitted(false);
    },
    className: "w-full bg-forest-700 text-ivory-50 py-2 rounded-xl text-xs font-semibold"
  }, "Fechar")) : /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800 mb-1"
  }, "Nome Completo"), /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    value: form.name,
    onChange: e => setForm({
      ...form,
      name: e.target.value
    }),
    className: "w-full border border-ivory-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600",
    placeholder: "Digite seu nome completo"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800 mb-1"
  }, "E-mail para Acesso"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    required: true,
    value: form.email,
    onChange: e => setForm({
      ...form,
      email: e.target.value
    }),
    className: "w-full border border-ivory-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600",
    placeholder: "seuemail@exemplo.com"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800 mb-1"
  }, "Curso Desejado"), /*#__PURE__*/React.createElement("select", {
    value: form.courseId,
    onChange: e => setForm({
      ...form,
      courseId: e.target.value
    }),
    className: "w-full border border-ivory-300 rounded p-2 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600"
  }, (courses || []).map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.title, " (", c.hours, "h)")))), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: sending,
    className: "w-full bg-gold-500 hover:bg-gold-600 disabled:opacity-60 text-forest-900 font-bold py-2.5 rounded-xl text-xs transition shadow"
  }, sending ? 'Enviando...' : 'Enviar Solicitação de Inscrição')))));
}

// ----------------------------- LOGIN -----------------------------
function LoginView({
  onLogin,
  showToast
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const {
        token,
        user
      } = await Api.login(email, password);
      Api.setToken(token);
      showToast('Bem-vindo(a), ' + user.name + '!');
      onLogin(user);
    } catch (err) {
      setError(err.network ? 'Sem conexão com o servidor.' : err.message || 'Credenciais incorretas.');
      showToast('Falha ao autenticar.', 'error');
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-md mx-auto my-16 px-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-8 shadow-xl space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-12 h-12 bg-forest-100 text-forest-800 rounded-full flex items-center justify-center mx-auto text-xl font-bold"
  }, "\uD83C\uDF3F"), /*#__PURE__*/React.createElement("h2", {
    className: "font-serif font-bold text-2xl text-forest-900"
  }, "Acesso ao Portal EAD"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600"
  }, "Entre com seu e-mail e senha cadastrados")), error && /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 text-red-700 text-xs p-3 rounded-lg border border-red-200"
  }, error), /*#__PURE__*/React.createElement("form", {
    onSubmit: submit,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800 mb-1"
  }, "E-mail cadastrado"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    required: true,
    value: email,
    onChange: e => setEmail(e.target.value),
    className: "w-full border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600"
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800 mb-1"
  }, "Senha de acesso"), /*#__PURE__*/React.createElement("input", {
    type: "password",
    required: true,
    value: password,
    onChange: e => setPassword(e.target.value),
    className: "w-full border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600"
  })), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-60 text-ivory-50 font-bold py-2.5 rounded-xl text-xs shadow transition"
  }, loading ? 'Entrando...' : 'Entrar no Portal de Estudos'))));
}

// ----------------------------- CERT VERIFY -----------------------------
function CertVerifyView() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const verify = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await Api.verifyCertificate(code.trim());
      setResult(r);
    } catch {
      setResult({
        valid: false
      });
    } finally {
      setLoading(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-xl mx-auto my-16 px-4 space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-8 shadow-xl space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-center space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-3xl"
  }, "\uD83D\uDCDC"), /*#__PURE__*/React.createElement("h2", {
    className: "font-serif font-bold text-2xl text-forest-900"
  }, "Verifica\xE7\xE3o de Autenticidade de Certificados"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600"
  }, "Insira o c\xF3digo impresso no documento para verificar o registro oficial da plataforma.")), /*#__PURE__*/React.createElement("form", {
    onSubmit: verify,
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    required: true,
    value: code,
    onChange: e => setCode(e.target.value),
    placeholder: "Ex: CERT-300-8841",
    className: "w-full border border-ivory-300 rounded p-2.5 text-sm uppercase font-mono focus:outline-none focus:ring-2 focus:ring-forest-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: loading,
    className: "w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-60 text-ivory-50 font-bold py-2.5 rounded-xl text-sm shadow transition"
  }, loading ? 'Verificando...' : 'Verificar no Banco de Dados')), result && /*#__PURE__*/React.createElement("div", {
    className: "pt-4 border-t border-ivory-200"
  }, result.valid ? /*#__PURE__*/React.createElement("div", {
    className: "bg-forest-50 border border-forest-300 p-4 rounded-xl space-y-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-2 text-forest-800 font-bold"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-base"
  }, "\u2713"), /*#__PURE__*/React.createElement("span", null, "CERTIFICADO V\xC1LIDO E AUT\xCANTICO")), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Estudante:"), " ", result.certificate.user_name), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Forma\xE7\xE3o:"), " ", result.certificate.course_title), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Carga Hor\xE1ria:"), " ", result.certificate.hours, " Horas"), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Data de Emiss\xE3o:"), " ", String(result.certificate.issue_date).slice(0, 10))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border border-red-200 p-4 rounded-xl text-xs text-red-700 font-medium text-center"
  }, "Certificado n\xE3o encontrado no registro oficial da plataforma."))));
}
// Área do Aluno. Abas CLARAMENTE separadas:
//  - AULAS (vídeo com estado real + conteúdo + atividade + quiz)
//  - MENSAGENS (área real de mensagens, threads persistentes com a administração)
//  - TUTOR IA (área PRÓPRIA, independente das mensagens)
//  - PROGRESSO / NOTAS / CERTIFICADOS / COMUNICADOS
function StudentView({
  user,
  showToast
}) {
  const [sub, setSub] = useState('CLASSES');
  const tabBtn = (id, label) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(id),
    className: `px-3 py-1.5 rounded-lg text-xs font-bold transition ${sub === id ? 'bg-gold-500 text-forest-900' : 'bg-forest-700 text-ivory-100'}`
  }, label);
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 py-8 space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-forest-800 text-ivory-50 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gold-500/30"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-semibold text-gold-400 uppercase tracking-wide"
  }, "Ambiente do Estudante"), /*#__PURE__*/React.createElement("h2", {
    className: "font-serif font-bold text-2xl"
  }, "Bem-vindo(a), ", user.name), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-ivory-200 mt-1"
  }, "Acompanhe suas aulas, converse com a administra\xE7\xE3o e com o tutor de IA, e emita certificados.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, tabBtn('CLASSES', '📺 Aulas'), tabBtn('MESSAGES', '💬 Mensagens'), tabBtn('AI', '🤖 Tutor de IA'), tabBtn('GRADES', '📝 Notas'), tabBtn('CERTS', '📜 Certificados'), tabBtn('ANN', '📢 Comunicados'))), sub === 'CLASSES' && /*#__PURE__*/React.createElement(ClassesTab, {
    user: user,
    showToast: showToast
  }), sub === 'MESSAGES' && /*#__PURE__*/React.createElement(MessagesTab, {
    user: user,
    showToast: showToast,
    isAdmin: false
  }), sub === 'AI' && /*#__PURE__*/React.createElement(AiTutorTab, {
    showToast: showToast
  }), sub === 'GRADES' && /*#__PURE__*/React.createElement(GradesTab, {
    user: user
  }), sub === 'CERTS' && /*#__PURE__*/React.createElement(CertsTab, {
    user: user,
    showToast: showToast
  }), sub === 'ANN' && /*#__PURE__*/React.createElement(AnnouncementsTab, null));
}
function ClassesTab({
  user,
  showToast
}) {
  const [courses, setCourses] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [lesson, setLesson] = useState(null);
  const [videoErr, setVideoErr] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResult, setQuizResult] = useState(null);
  const load = useCallback(async () => {
    const d = await Api.myCourses();
    setCourses(d.courses);
    if (!activeCourse && d.courses.length) setActiveCourse(d.courses[0]);
  }, [activeCourse]);
  useEffect(() => {
    load();
  }, []);
  const refreshCourse = async courseId => {
    const {
      course
    } = await Api.course(courseId);
    setActiveCourse(course);
    setCourses(prev => prev.map(c => c.id === courseId ? course : c));
    if (lesson) {
      const updated = course.modules.flatMap(m => m.lessons).find(l => l.id === lesson.id);
      if (updated) setLesson(updated);
    }
  };
  const toggleComplete = async () => {
    try {
      await Api.setLessonProgress(lesson.id, !lesson.completed);
      await refreshCourse(activeCourse.id);
      showToast('Progresso atualizado!');
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
  const submitQuiz = () => {
    let correct = 0;
    lesson.quiz.forEach((q, i) => {
      if (quizAnswers[i] === q.correct) correct++;
    });
    setQuizResult({
      correct,
      total: lesson.quiz.length
    });
    showToast('Questionário corrigido: ' + correct + '/' + lesson.quiz.length + ' corretas.');
  };
  const emitCert = async () => {
    try {
      const r = await Api.issueCertificate(activeCourse.id);
      window.UmbandaPDF.certificate(user.name, activeCourse.title, activeCourse.hours, r.certificate.id);
      showToast('Certificado emitido: ' + r.certificate.id);
    } catch (e) {
      showToast(e.data && e.data.error ? e.data.error : e.message || 'Conclua todas as aulas para emitir.', 'error');
    }
  };
  if (!courses) return /*#__PURE__*/React.createElement(Spinner, {
    label: "Carregando seus cursos..."
  });
  if (!courses.length) return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-10 text-center text-sm text-forest-700"
  }, "Voc\xEA ainda n\xE3o tem cursos liberados. Aguarde a aprova\xE7\xE3o da sua inscri\xE7\xE3o.");
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-3 gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Seus Cursos"), courses.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    onClick: () => {
      setActiveCourse(c);
      setLesson(null);
      setVideoErr(false);
    },
    className: `cursor-pointer rounded-2xl p-4 border transition ${activeCourse && activeCourse.id === c.id ? 'bg-forest-700 text-ivory-50 border-gold-400 shadow-md' : 'bg-white text-forest-900 border-ivory-300 hover:border-forest-600'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] font-bold px-2 py-0.5 rounded ${activeCourse && activeCourse.id === c.id ? 'bg-gold-500 text-forest-900' : 'bg-ivory-200 text-forest-800'}`
  }, c.hours, "h"), /*#__PURE__*/React.createElement("span", {
    className: "text-xs opacity-80"
  }, c.modules.length, " M\xF3dulo(s)")), /*#__PURE__*/React.createElement("h4", {
    className: "font-serif font-bold text-sm leading-snug"
  }, c.title))), activeCourse && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-4 space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-xs uppercase tracking-wider text-forest-700 border-b border-ivory-200 pb-2"
  }, "Grade de M\xF3dulos"), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar"
  }, activeCourse.modules.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-semibold text-xs text-forest-900 bg-ivory-100 p-2 rounded-lg"
  }, m.title), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 pl-2"
  }, m.lessons.map(l => /*#__PURE__*/React.createElement("button", {
    key: l.id,
    onClick: () => {
      setLesson(l);
      setVideoErr(false);
      setQuizAnswers({});
      setQuizResult(null);
    },
    className: `w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition ${lesson && lesson.id === l.id ? 'bg-forest-100 text-forest-900 font-bold border-l-4 border-forest-700' : 'hover:bg-ivory-50 text-forest-800'}`
  }, /*#__PURE__*/React.createElement("span", {
    className: "truncate pr-2"
  }, l.title), l.completed ? /*#__PURE__*/React.createElement("span", {
    className: "text-forest-700 font-bold"
  }, "\u2713") : /*#__PURE__*/React.createElement("span", {
    className: "text-ivory-300 text-[10px]"
  }, l.duration))))))))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2 space-y-6"
  }, lesson ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-semibold uppercase text-gold-600 bg-gold-50 px-2.5 py-1 rounded border border-gold-200"
  }, activeCourse.title), /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-xl text-forest-900"
  }, lesson.title), /*#__PURE__*/React.createElement("div", {
    className: "pt-1"
  }, /*#__PURE__*/React.createElement(VideoStateBadge, {
    status: videoErr ? 'ERROR' : lesson.videoStatus
  }))), /*#__PURE__*/React.createElement("div", {
    className: "aspect-video bg-forest-950 rounded-xl border border-forest-800 overflow-hidden relative shadow-inner"
  }, lesson.videoUrl && lesson.videoStatus === 'AVAILABLE' && !videoErr ? /*#__PURE__*/React.createElement("video", {
    controls: true,
    className: "w-full h-full object-contain bg-black",
    src: lesson.videoUrl,
    onError: () => setVideoErr(true)
  }, "Seu navegador n\xE3o suporta reprodu\xE7\xE3o de v\xEDdeo.") : /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-forest-900 via-forest-800 to-forest-950 text-center space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-14 h-14 rounded-full bg-forest-700 border-2 border-gold-400 flex items-center justify-center text-gold-400 text-xl"
  }, "\uD83C\uDFAC"), videoErr ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-red-300"
  }, "N\xE3o foi poss\xEDvel carregar o v\xEDdeo desta aula. O conte\xFAdo em texto abaixo permanece dispon\xEDvel.") : lesson.videoStatus === 'PROCESSING' ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-gold-300"
  }, "O v\xEDdeo desta aula est\xE1 em processamento e ficar\xE1 dispon\xEDvel em breve.") : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-ivory-300"
  }, "O v\xEDdeo desta aula ainda n\xE3o foi disponibilizado. Estude pelo conte\xFAdo e transcri\xE7\xE3o abaixo."))), /*#__PURE__*/React.createElement("div", {
    className: "space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-serif font-bold text-base text-forest-900 border-b border-ivory-200 pb-2"
  }, "Conte\xFAdo Did\xE1tico Completo"), /*#__PURE__*/React.createElement("div", {
    className: "bg-ivory-50 border border-ivory-200 rounded-xl p-5 text-xs text-forest-800 leading-relaxed prose"
  }, /*#__PURE__*/React.createElement("div", {
    className: "whitespace-pre-line"
  }, lesson.content)), lesson.transcript && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-xl p-4 text-xs space-y-1"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-forest-900"
  }, "Transcri\xE7\xE3o da Aula:"), /*#__PURE__*/React.createElement("p", {
    className: "text-forest-700 italic"
  }, "\"", lesson.transcript, "\"")), lesson.activity && /*#__PURE__*/React.createElement("div", {
    className: "bg-gold-100/50 border border-gold-300 rounded-xl p-4 space-y-2 text-xs"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-forest-900"
  }, "\u270D\uFE0F Atividade de Fixa\xE7\xE3o"), /*#__PURE__*/React.createElement("p", {
    className: "text-forest-800"
  }, lesson.activity)), lesson.quiz && lesson.quiz.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-xl p-4 space-y-3 text-xs"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-forest-900"
  }, "\u2753 Question\xE1rio do M\xF3dulo"), lesson.quiz.map((q, qi) => /*#__PURE__*/React.createElement("div", {
    key: qi,
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold text-forest-900"
  }, q.question), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 pl-2"
  }, q.options.map((opt, oi) => /*#__PURE__*/React.createElement("label", {
    key: oi,
    className: `flex items-center space-x-2 cursor-pointer ${quizResult ? oi === q.correct ? 'text-forest-700 font-bold' : quizAnswers[qi] === oi ? 'text-red-600' : '' : ''}`
  }, /*#__PURE__*/React.createElement("input", {
    type: "radio",
    name: 'q' + qi,
    checked: quizAnswers[qi] === oi,
    onChange: () => setQuizAnswers({
      ...quizAnswers,
      [qi]: oi
    })
  }), /*#__PURE__*/React.createElement("span", null, opt, quizResult && oi === q.correct ? ' ✓' : '')))))), /*#__PURE__*/React.createElement("button", {
    onClick: submitQuiz,
    className: "bg-forest-700 text-ivory-50 px-4 py-1.5 rounded-lg font-bold text-xs shadow"
  }, "Corrigir Question\xE1rio"), quizResult && /*#__PURE__*/React.createElement("p", {
    className: "text-forest-700 font-bold"
  }, "Resultado: ", quizResult.correct, "/", quizResult.total, " corretas.")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap justify-between items-center gap-2 pt-2"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: toggleComplete,
    className: `px-4 py-2 rounded-xl text-xs font-bold transition shadow ${lesson.completed ? 'bg-forest-100 text-forest-800 border border-forest-300' : 'bg-forest-700 hover:bg-forest-800 text-ivory-50'}`
  }, lesson.completed ? '✓ Concluída (desmarcar)' : 'Marcar Aula como Concluída'), /*#__PURE__*/React.createElement("button", {
    onClick: emitCert,
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-4 py-2 rounded-xl text-xs shadow transition"
  }, "\uD83D\uDCDC Emitir Certificado (", activeCourse.hours, "h)")), /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-forest-500"
  }, "O certificado s\xF3 \xE9 emitido ap\xF3s a conclus\xE3o de ", /*#__PURE__*/React.createElement("strong", null, "todas"), " as aulas do curso (validado no servidor)."))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-12 text-center space-y-4 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl text-gold-500"
  }, "\uD83D\uDCD6"), /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-xl text-forest-900"
  }, "Selecione uma Aula na Grade"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-700 max-w-md mx-auto"
  }, "Escolha uma aula ao lado para acessar o conte\xFAdo, o v\xEDdeo e as atividades do m\xF3dulo."))));
}

// ÁREA REAL DE MENSAGENS (reutilizada por aluno e admin).
function MessagesTab({
  user,
  showToast,
  isAdmin
}) {
  const [threads, setThreads] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [newThread, setNewThread] = useState({
    subject: '',
    body: ''
  });
  const loadThreads = useCallback(async () => {
    const d = await Api.threads();
    setThreads(d.threads);
  }, []);
  useEffect(() => {
    loadThreads();
  }, []);
  const openThread = async t => {
    setActive(t);
    const d = await Api.thread(t.id);
    setMessages(d.messages);
  };
  const sendReply = async e => {
    e.preventDefault();
    if (!reply.trim()) return;
    await Api.replyThread(active.id, reply.trim());
    setReply('');
    const d = await Api.thread(active.id);
    setMessages(d.messages);
    showToast('Mensagem enviada.');
  };
  const createThread = async e => {
    e.preventDefault();
    await Api.createThread({
      subject: newThread.subject,
      body: newThread.body
    });
    setNewOpen(false);
    setNewThread({
      subject: '',
      body: ''
    });
    await loadThreads();
    showToast('Conversa iniciada.');
  };
  if (!threads) return /*#__PURE__*/React.createElement(Spinner, {
    label: "Carregando mensagens..."
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 lg:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, isAdmin ? 'Conversas dos Alunos' : 'Minhas Conversas'), !isAdmin && /*#__PURE__*/React.createElement("button", {
    onClick: () => setNewOpen(true),
    className: "bg-forest-700 text-ivory-50 px-3 py-1.5 rounded-lg text-xs font-bold"
  }, "+ Nova")), threads.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600 italic"
  }, "Nenhuma conversa ainda.") : threads.map(t => /*#__PURE__*/React.createElement("button", {
    key: t.id,
    onClick: () => openThread(t),
    className: `w-full text-left rounded-xl p-3 border text-xs transition ${active && active.id === t.id ? 'bg-forest-700 text-ivory-50 border-gold-400' : 'bg-white text-forest-900 border-ivory-300 hover:border-forest-600'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold"
  }, t.subject), /*#__PURE__*/React.createElement("div", {
    className: "opacity-80 mt-0.5"
  }, isAdmin ? t.student_name + ' • ' : '', t.message_count, " mensagem(ns)")))), /*#__PURE__*/React.createElement("div", {
    className: "lg:col-span-2"
  }, active ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-5 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-serif font-bold text-base text-forest-900 border-b border-ivory-200 pb-2"
  }, active.subject), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar"
  }, messages.map(m => /*#__PURE__*/React.createElement("div", {
    key: m.id,
    className: `rounded-xl p-3 text-xs ${m.sender_role === 'ADMIN' ? 'bg-gold-50 border border-gold-200' : 'bg-ivory-50 border border-ivory-200'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center font-bold text-forest-900"
  }, /*#__PURE__*/React.createElement("span", null, m.sender_name, " ", m.sender_role === 'ADMIN' ? '[Administração]' : '[Aluno]'), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-forest-600 font-normal"
  }, String(m.created_at).slice(0, 16))), /*#__PURE__*/React.createElement("p", {
    className: "text-forest-800 mt-1 leading-relaxed whitespace-pre-line"
  }, m.body)))), /*#__PURE__*/React.createElement("form", {
    onSubmit: sendReply,
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("textarea", {
    rows: 2,
    value: reply,
    onChange: e => setReply(e.target.value),
    placeholder: "Escreva sua resposta...",
    className: "w-full border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600"
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold px-4 py-2 rounded-xl text-xs shadow"
  }, "Enviar"))) : /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-12 text-center text-xs text-forest-700"
  }, "Selecione uma conversa para visualizar as mensagens.")), newOpen && /*#__PURE__*/React.createElement("div", {
    className: "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
  }, /*#__PURE__*/React.createElement("form", {
    onSubmit: createThread,
    className: "bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-gold-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Nova Conversa"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setNewOpen(false),
    className: "text-forest-600 font-bold"
  }, "\u2715")), /*#__PURE__*/React.createElement("input", {
    required: true,
    placeholder: "Assunto",
    value: newThread.subject,
    onChange: e => setNewThread({
      ...newThread,
      subject: e.target.value
    }),
    className: "w-full border border-ivory-300 rounded p-2 text-xs"
  }), /*#__PURE__*/React.createElement("textarea", {
    required: true,
    rows: 4,
    placeholder: "Escreva sua mensagem para a administra\xE7\xE3o...",
    value: newThread.body,
    onChange: e => setNewThread({
      ...newThread,
      body: e.target.value
    }),
    className: "w-full border border-ivory-300 rounded p-2 text-xs"
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "w-full bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold py-2.5 rounded-xl text-xs"
  }, "Enviar Mensagem"))));
}

// ÁREA PRÓPRIA DO TUTOR DE IA — independente das mensagens.
function AiTutorTab({
  showToast
}) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);
  useEffect(() => {
    Api.aiStatus().then(setStatus).catch(() => setStatus({
      configured: false
    }));
    Api.aiHistory().then(d => setHistory(d.messages)).catch(() => {});
  }, []);
  useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView();
  }, [history, thinking]);
  const ask = async e => {
    e.preventDefault();
    if (!input.trim()) return;
    const q = input.trim();
    setHistory(h => [...h, {
      id: 'tmp',
      role: 'user',
      body: q
    }]);
    setInput('');
    setThinking(true);
    try {
      const r = await Api.aiAsk(q);
      setHistory(h => [...h, {
        id: 'tmp2',
        role: 'assistant',
        body: r.reply
      }]);
    } catch (err) {
      const msg = err.data && err.data.message ? err.data.message : 'Tutor de IA indisponível.';
      showToast(msg, 'error');
      setHistory(h => [...h, {
        id: 'tmperr',
        role: 'assistant',
        body: '⚠️ ' + msg
      }]);
    } finally {
      setThinking(false);
    }
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4 max-w-3xl mx-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-ivory-200 pb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "\uD83E\uDD16 Tutor de Estudos com IA"), status && /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-2 py-1 rounded font-bold ${status.configured ? 'bg-forest-100 text-forest-800' : 'bg-ivory-200 text-forest-700'}`
  }, status.configured ? 'IA ativa (' + (status.provider || '') + ')' : 'IA não configurada')), status && !status.configured && /*#__PURE__*/React.createElement("div", {
    className: "bg-gold-100/60 border border-gold-300 text-forest-800 text-xs p-3 rounded-lg"
  }, "O Tutor de IA ainda n\xE3o foi ativado neste servidor. Ele funcionar\xE1 assim que o administrador configurar uma chave de provedor (Gemini ou OpenAI) nas vari\xE1veis de ambiente. Esta \xE1rea \xE9 totalmente independente das suas mensagens com a administra\xE7\xE3o."), /*#__PURE__*/React.createElement("div", {
    className: "space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar"
  }, history.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600 italic"
  }, "Fa\xE7a uma pergunta de estudos. O tutor responde de forma did\xE1tica, respeitando a diversidade das tradi\xE7\xF5es."), history.map((m, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    className: `rounded-xl p-3 text-xs ${m.role === 'user' ? 'bg-forest-700 text-ivory-50 ml-8' : 'bg-ivory-50 border border-ivory-200 text-forest-800 mr-8'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold mb-1"
  }, m.role === 'user' ? 'Você' : 'Tutor IA'), /*#__PURE__*/React.createElement("p", {
    className: "whitespace-pre-line leading-relaxed"
  }, m.body))), thinking && /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-forest-600 italic mr-8"
  }, "Tutor IA est\xE1 pensando..."), /*#__PURE__*/React.createElement("div", {
    ref: endRef
  })), /*#__PURE__*/React.createElement("form", {
    onSubmit: ask,
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    value: input,
    onChange: e => setInput(e.target.value),
    placeholder: "Pergunte algo sobre os estudos...",
    className: "flex-1 border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600",
    disabled: status && !status.configured
  }), /*#__PURE__*/React.createElement("button", {
    type: "submit",
    disabled: thinking || status && !status.configured,
    className: "bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-forest-900 font-bold px-4 py-2 rounded-xl text-xs shadow"
  }, "Enviar")));
}
function GradesTab({
  user
}) {
  const [grades, setGrades] = useState(null);
  useEffect(() => {
    Api.myGrades().then(d => setGrades(d.grades)).catch(() => setGrades([]));
  }, []);
  if (!grades) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center border-b border-ivory-200 pb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Boletim Oficial de Avalia\xE7\xF5es"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600"
  }, "Hist\xF3rico de notas registradas")), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.UmbandaPDF.bulletin(user.name, grades),
    className: "bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold px-4 py-2 rounded-xl text-xs shadow"
  }, "\uD83D\uDCC4 Baixar Boletim em PDF")), /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-xs text-forest-800"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Curso"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Avalia\xE7\xE3o"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Nota"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Feedback"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Data"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-ivory-200"
  }, grades.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "5",
    className: "p-6 text-center text-forest-600 italic"
  }, "Nenhuma nota registrada.")) : grades.map(g => /*#__PURE__*/React.createElement("tr", {
    key: g.id,
    className: "hover:bg-ivory-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "p-3 font-semibold text-forest-900"
  }, g.course_title), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, g.assignment_name), /*#__PURE__*/React.createElement("td", {
    className: "p-3 font-bold"
  }, g.score, " / ", g.max_score), /*#__PURE__*/React.createElement("td", {
    className: "p-3 italic text-forest-700"
  }, g.feedback), /*#__PURE__*/React.createElement("td", {
    className: "p-3 text-forest-600"
  }, String(g.date).slice(0, 10)))))));
}
function CertsTab({
  user,
  showToast
}) {
  const [certs, setCerts] = useState(null);
  useEffect(() => {
    Api.myCertificates().then(d => setCerts(d.certificates)).catch(() => setCerts([]));
  }, []);
  if (!certs) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Meus Certificados"), certs.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600 italic"
  }, "Voc\xEA ainda n\xE3o possui certificados. Conclua um curso para emiti-lo.") : /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, certs.map(c => /*#__PURE__*/React.createElement("div", {
    key: c.id,
    className: "border border-ivory-300 rounded-xl p-4 bg-ivory-50 space-y-2 text-xs"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold text-forest-900"
  }, c.course_title), /*#__PURE__*/React.createElement("div", {
    className: "text-forest-700"
  }, c.hours, "h \u2022 C\xF3digo: ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, c.id)), /*#__PURE__*/React.createElement("div", {
    className: "text-forest-600"
  }, "Emitido em ", String(c.issue_date).slice(0, 10)), /*#__PURE__*/React.createElement("button", {
    onClick: () => window.UmbandaPDF.certificate(user.name, c.course_title, c.hours, c.id),
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-3 py-1.5 rounded-lg text-xs"
  }, "Baixar PDF")))));
}
function AnnouncementsTab() {
  const [anns, setAnns] = useState(null);
  useEffect(() => {
    Api.announcements().then(d => setAnns(d.announcements)).catch(() => setAnns([]));
  }, []);
  if (!anns) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Comunicados Institucionais"), anns.map(a => /*#__PURE__*/React.createElement("div", {
    key: a.id,
    className: "p-4 bg-ivory-50 border border-ivory-200 rounded-xl space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-serif font-bold text-sm text-forest-900"
  }, a.title), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-forest-600"
  }, String(a.date).slice(0, 10), " \u2022 ", a.author_name)), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-800 leading-relaxed"
  }, a.content))));
}
function AdminView({
  user,
  showToast
}) {
  const [sub, setSub] = useState('ENROLLMENTS');
  const tabBtn = (id, label) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setSub(id),
    className: `px-3 py-1.5 rounded-lg text-xs font-bold transition ${sub === id ? 'bg-gold-500 text-forest-900' : 'bg-forest-700 text-ivory-100'}`
  }, label);
  return /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 py-8 space-y-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-forest-800 text-ivory-50 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gold-500/30"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-gold-400 uppercase tracking-wider"
  }, "Painel Administrativo"), /*#__PURE__*/React.createElement("h2", {
    className: "font-serif font-bold text-2xl"
  }, "Gest\xE3o Institucional & Pedag\xF3gica")), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-2"
  }, tabBtn('ENROLLMENTS', '📋 Inscrições'), tabBtn('MESSAGES', '💬 Mensagens'), tabBtn('VIDEOAI', '🎬 Vídeos IA'), tabBtn('EMAIL', '✉️ E-mail'), tabBtn('USERS', '👥 Usuários'), tabBtn('AUDIT', '📜 Logs'))), sub === 'ENROLLMENTS' && /*#__PURE__*/React.createElement(EnrollmentsAdmin, {
    showToast: showToast
  }), sub === 'MESSAGES' && /*#__PURE__*/React.createElement(MessagesTab, {
    user: user,
    showToast: showToast,
    isAdmin: true
  }), sub === 'VIDEOAI' && /*#__PURE__*/React.createElement(VideoAiAdmin, {
    showToast: showToast
  }), sub === 'EMAIL' && /*#__PURE__*/React.createElement(EmailAdmin, {
    showToast: showToast
  }), sub === 'USERS' && /*#__PURE__*/React.createElement(UsersAdmin, null), sub === 'AUDIT' && /*#__PURE__*/React.createElement(AuditAdmin, null));
}
function EnrollmentsAdmin({
  showToast
}) {
  const [rows, setRows] = useState(null);
  const load = useCallback(() => Api.enrollments().then(d => setRows(d.enrollments)).catch(() => setRows([])), []);
  useEffect(() => {
    load();
  }, []);
  const act = async (id, approve) => {
    try {
      const r = approve ? await Api.approveEnrollment(id) : await Api.rejectEnrollment(id);
      await load();
      const note = r.notification === 'SENT' ? ' E-mail de notificação enviado.' : ' (E-mail não enviado: ' + (r.notification || '').replace('NOT_SENT:', '') + ')';
      showToast((approve ? 'Inscrição aprovada e acesso liberado.' : 'Inscrição rejeitada.') + note);
    } catch (e) {
      showToast(e.message, 'error');
    }
  };
  if (!rows) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Solicita\xE7\xF5es de Inscri\xE7\xE3o"), /*#__PURE__*/React.createElement("div", {
    className: "overflow-x-auto"
  }, /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-xs text-forest-800"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Candidato"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "E-mail"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Curso"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Data"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Status"), /*#__PURE__*/React.createElement("th", {
    className: "p-3 text-right"
  }, "A\xE7\xE3o"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-ivory-200"
  }, rows.length === 0 ? /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("td", {
    colSpan: "6",
    className: "p-6 text-center italic text-forest-600"
  }, "Nenhuma solicita\xE7\xE3o.")) : rows.map(e => /*#__PURE__*/React.createElement("tr", {
    key: e.id,
    className: "hover:bg-ivory-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "p-3 font-semibold text-forest-900"
  }, e.user_name), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, e.email), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, e.course_title), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, String(e.request_date).slice(0, 10)), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: `px-2 py-0.5 rounded font-bold text-[10px] ${e.status === 'APPROVED' ? 'bg-forest-100 text-forest-800' : e.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-gold-100 text-gold-800'}`
  }, e.status === 'APPROVED' ? 'APROVADO' : e.status === 'REJECTED' ? 'REJEITADO' : 'PENDENTE')), /*#__PURE__*/React.createElement("td", {
    className: "p-3 text-right"
  }, e.status === 'PENDING' && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-1 justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => act(e.id, true),
    className: "bg-forest-700 hover:bg-forest-800 text-ivory-50 px-3 py-1 rounded font-bold text-[11px]"
  }, "Aprovar"), /*#__PURE__*/React.createElement("button", {
    onClick: () => act(e.id, false),
    className: "bg-red-700 hover:bg-red-800 text-ivory-50 px-3 py-1 rounded font-bold text-[11px]"
  }, "Rejeitar")))))))));
}
function EmailAdmin({
  showToast
}) {
  const [settings, setSettings] = useState(null);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [logs, setLogs] = useState([]);
  const [testTo, setTestTo] = useState('');
  const [busy, setBusy] = useState(false);
  const loadLogs = () => Api.emailLogs().then(d => setLogs(d.logs)).catch(() => {});
  useEffect(() => {
    Api.emailSettings().then(d => {
      setSettings(d.settings);
      setSmtpConfigured(d.smtpConfigured);
      setTestTo(d.settings.destination_email || '');
    });
    loadLogs();
  }, []);
  const save = async e => {
    e.preventDefault();
    await Api.saveEmailSettings({
      destinationEmail: settings.destination_email,
      notifyOnEnrollment: !!settings.notify_on_enrollment,
      notifyOnApproval: !!settings.notify_on_approval,
      notifyOnCert: !!settings.notify_on_cert
    });
    showToast('Configurações salvas.');
  };
  const verify = async () => {
    setBusy(true);
    try {
      const r = await Api.emailVerify();
      showToast(r.ok ? 'Conexão SMTP verificada com sucesso.' : 'SMTP indisponível: ' + (r.reason || ''), r.ok ? 'success' : 'error');
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    try {
      await Api.emailTest(testTo);
      showToast('E-mail de teste ENVIADO e confirmado para ' + testTo + '.');
    } catch (e) {
      const reason = e.data && e.data.reason ? e.data.reason : e.message || '';
      showToast('Falha real no envio: ' + reason + '. Nenhum e-mail foi enviado.', 'error');
    } finally {
      setBusy(false);
      loadLogs();
    }
  };
  if (!settings) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Configura\xE7\xE3o de E-mail"), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-2 py-1 rounded font-bold ${smtpConfigured ? 'bg-forest-100 text-forest-800' : 'bg-red-100 text-red-700'}`
  }, smtpConfigured ? 'SMTP configurado' : 'SMTP NÃO configurado')), !smtpConfigured && /*#__PURE__*/React.createElement("div", {
    className: "bg-gold-100/60 border border-gold-300 text-forest-800 text-[11px] p-3 rounded-lg"
  }, "As credenciais SMTP ficam no servidor (vari\xE1veis ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "SMTP_HOST, SMTP_USER, SMTP_PASS"), "), nunca no app. Enquanto n\xE3o configuradas, os envios reportar\xE3o falha honesta \u2014 nunca \"enviado\" falso."), /*#__PURE__*/React.createElement("form", {
    onSubmit: save,
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800 mb-1"
  }, "E-mail de destino das notifica\xE7\xF5es"), /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: settings.destination_email || '',
    onChange: e => setSettings({
      ...settings,
      destination_email: e.target.value
    }),
    className: "w-full border border-ivory-300 rounded p-2.5 text-xs"
  })), /*#__PURE__*/React.createElement("div", {
    className: "space-y-1 text-xs text-forest-800"
  }, /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!settings.notify_on_enrollment,
    onChange: e => setSettings({
      ...settings,
      notify_on_enrollment: e.target.checked
    })
  }), " Notificar em novas inscri\xE7\xF5es"), /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!settings.notify_on_approval,
    onChange: e => setSettings({
      ...settings,
      notify_on_approval: e.target.checked
    })
  }), " Notificar em aprova\xE7\xF5es/rejei\xE7\xF5es")), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "submit",
    className: "flex-1 bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold py-2.5 rounded-xl text-xs shadow"
  }, "Salvar"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: verify,
    disabled: busy,
    className: "bg-ivory-200 hover:bg-ivory-300 text-forest-800 font-bold px-3 py-2.5 rounded-xl text-xs"
  }, "Verificar SMTP"))), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-ivory-200 pt-3 space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-xs font-bold text-forest-800"
  }, "Enviar e-mail de teste real para:"), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    type: "email",
    value: testTo,
    onChange: e => setTestTo(e.target.value),
    className: "flex-1 border border-ivory-300 rounded p-2 text-xs"
  }), /*#__PURE__*/React.createElement("button", {
    onClick: test,
    disabled: busy,
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-4 py-2 rounded-xl text-xs"
  }, "Testar")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Hist\xF3rico de Disparos"), /*#__PURE__*/React.createElement("button", {
    onClick: loadLogs,
    className: "text-xs text-forest-600 underline"
  }, "atualizar")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar"
  }, logs.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs italic text-forest-600"
  }, "Nenhum disparo registrado.") : logs.map(l => /*#__PURE__*/React.createElement("div", {
    key: l.id,
    className: "p-3 bg-ivory-50 border border-ivory-200 rounded-lg text-xs space-y-1"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center font-bold text-forest-900"
  }, /*#__PURE__*/React.createElement("span", null, l.subject), /*#__PURE__*/React.createElement("span", {
    className: `font-mono text-[10px] ${l.status === 'SUCCESS' ? 'text-forest-700' : 'text-red-600'}`
  }, l.status)), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-forest-600"
  }, l.recipient, " \u2022 ", String(l.timestamp).slice(0, 16)), l.error && /*#__PURE__*/React.createElement("p", {
    className: "text-[10px] text-red-600"
  }, l.error))))));
}
function UsersAdmin() {
  const [users, setUsers] = useState(null);
  useEffect(() => {
    Api.adminUsers().then(d => setUsers(d.users)).catch(() => setUsers([]));
  }, []);
  if (!users) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Usu\xE1rios"), /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-xs text-forest-800"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Nome"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "E-mail"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Perfil"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Cursos"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-ivory-200"
  }, users.map(u => /*#__PURE__*/React.createElement("tr", {
    key: u.id,
    className: "hover:bg-ivory-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "p-3 font-semibold text-forest-900"
  }, u.name), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, u.email), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-mono text-[10px] font-bold"
  }, u.role)), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, u.courses.join(', ') || '—'))))));
}
function AuditAdmin() {
  const [logs, setLogs] = useState(null);
  useEffect(() => {
    Api.adminAuditLogs().then(d => setLogs(d.logs)).catch(() => setLogs([]));
  }, []);
  if (!logs) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "Logs de Auditoria"), /*#__PURE__*/React.createElement("table", {
    className: "w-full text-left text-xs text-forest-800"
  }, /*#__PURE__*/React.createElement("thead", {
    className: "bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Data"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Usu\xE1rio"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "A\xE7\xE3o"), /*#__PURE__*/React.createElement("th", {
    className: "p-3"
  }, "Detalhes"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-ivory-200 font-mono text-[11px]"
  }, logs.map(l => /*#__PURE__*/React.createElement("tr", {
    key: l.id,
    className: "hover:bg-ivory-50"
  }, /*#__PURE__*/React.createElement("td", {
    className: "p-3 text-forest-600"
  }, String(l.timestamp).slice(0, 16)), /*#__PURE__*/React.createElement("td", {
    className: "p-3 font-semibold text-forest-900"
  }, l.user_email), /*#__PURE__*/React.createElement("td", {
    className: "p-3 text-gold-600 font-bold"
  }, l.action), /*#__PURE__*/React.createElement("td", {
    className: "p-3"
  }, l.details))))));
}

// GERADOR DE VIDEOAULAS COM IA — fluxo completo e assíncrono.
// Etapas: selecionar curso/módulo/aula -> título + roteiro (gerável por IA) ->
// escolher motor -> criar job -> acompanhar estado real -> prévia -> publicar.
function VideoAiAdmin({
  showToast
}) {
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
  const loadJobs = useCallback(() => Api.videoJobs().then(d => setJobs(d.jobs)).catch(() => {}), []);
  useEffect(() => {
    Api.videoAiStatus().then(setStatus).catch(() => setStatus({
      configured: false
    }));
    Api.myCourses().then(d => {
      setCourses(d.courses);
      if (d.courses[0]) setCourseId(d.courses[0].id);
    }).catch(() => setCourses([]));
    loadJobs();
  }, []);

  // Polling do estado dos jobs enquanto houver algum em andamento.
  useEffect(() => {
    const active = jobs.some(j => ['QUEUED', 'SUBMITTING', 'PROCESSING'].includes(j.status));
    if (!active) return;
    const t = setInterval(loadJobs, 3000);
    return () => clearInterval(t);
  }, [jobs]);
  const course = (courses || []).find(c => c.id === courseId);
  const lessons = course ? course.modules.flatMap(m => m.lessons.map(l => ({
    ...l,
    moduleTitle: m.title
  }))) : [];
  const onSelectLesson = id => {
    setLessonId(id);
    const l = lessons.find(x => x.id === id);
    if (l && !title) setTitle(l.title);
  };
  const genScript = async () => {
    if (!lessonId) {
      showToast('Selecione a aula primeiro.', 'error');
      return;
    }
    setBusy(true);
    try {
      const r = await Api.generateScript({
        lessonId,
        title
      });
      setScript(r.script);
      setScriptSource(r.source);
      showToast(r.source === 'ai' ? 'Roteiro gerado pela IA.' : 'Roteiro-base derivado do conteúdo da aula (sem IA).');
    } catch (e) {
      showToast('Falha ao gerar roteiro: ' + (e.message || ''), 'error');
    } finally {
      setBusy(false);
    }
  };
  const createJob = async () => {
    if (!lessonId || !script.trim()) {
      showToast('Selecione a aula e informe o roteiro.', 'error');
      return;
    }
    setBusy(true);
    try {
      await Api.createVideoJob({
        lessonId,
        title,
        script,
        engine
      });
      showToast('Tarefa de geração enfileirada. Acompanhe o estado abaixo.');
      await loadJobs();
    } catch (e) {
      const reason = e.data && e.data.reason ? e.data.reason : e.message || '';
      if (reason === 'VIDEO_AI_NOT_CONFIGURED') showToast('Nenhum motor de vídeo disponível no servidor. Veja as instruções acima.', 'error');else showToast('Falha ao criar tarefa: ' + reason, 'error');
    } finally {
      setBusy(false);
    }
  };
  const act = async (jobId, kind) => {
    try {
      if (kind === 'publish') {
        await Api.publishVideoJob(jobId);
        showToast('Vídeo publicado na aula.');
      }
      if (kind === 'retry') {
        await Api.retryVideoJob(jobId);
        showToast('Tarefa re-enfileirada.');
      }
      if (kind === 'cancel') {
        await Api.cancelVideoJob(jobId);
        showToast('Tarefa cancelada.');
      }
      await loadJobs();
    } catch (e) {
      showToast(e.message || 'Falha na ação.', 'error');
    }
  };
  const STATE_LABEL = {
    QUEUED: 'Aguardando na fila',
    SUBMITTING: 'Enviando solicitação',
    PROCESSING: 'Em processamento',
    COMPLETED: 'Concluído',
    FAILED: 'Falha',
    CANCELED: 'Cancelado'
  };
  const STATE_COLOR = {
    QUEUED: 'bg-ivory-200 text-forest-700',
    SUBMITTING: 'bg-gold-100 text-gold-700',
    PROCESSING: 'bg-gold-100 text-gold-700',
    COMPLETED: 'bg-forest-100 text-forest-800',
    FAILED: 'bg-red-100 text-red-700',
    CANCELED: 'bg-ivory-200 text-forest-600'
  };
  if (!status || !courses) return /*#__PURE__*/React.createElement(Spinner, null);
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-5"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between border-b border-ivory-200 pb-3"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-lg text-forest-900"
  }, "\uD83C\uDFAC Gerador de Videoaulas com IA"), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-forest-600"
  }, "Gera um v\xEDdeo real e o associa \xE0 aula. A publica\xE7\xE3o \xE9 uma etapa separada.")), /*#__PURE__*/React.createElement("span", {
    className: `text-[10px] px-2 py-1 rounded font-bold ${status.configured ? 'bg-forest-100 text-forest-800' : 'bg-red-100 text-red-700'}`
  }, status.configured ? 'Motor ativo: ' + status.provider : 'Nenhum motor disponível')), !status.configured && /*#__PURE__*/React.createElement("div", {
    className: "bg-gold-100/60 border border-gold-300 text-forest-800 text-xs p-3 rounded-lg leading-relaxed space-y-1"
  }, /*#__PURE__*/React.createElement("p", null, "Configure ", /*#__PURE__*/React.createElement("strong", null, "um"), " motor no servidor (detec\xE7\xE3o autom\xE1tica):"), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Gr\xE1tis (API, sem cart\xE3o):"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "HF_TOKEN"), " (Hugging Face, perm. \"Inference Providers\")."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Gr\xE1tis (sem provedor):"), " motor ", /*#__PURE__*/React.createElement("strong", null, "assembled"), " = roteiro + narra\xE7\xE3o + slides + v\xEDdeo via ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "ffmpeg"), " instalado no servidor (+ opcional ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "espeak-ng"), " ou ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "OPENAI_API_KEY"), " para a voz)."), /*#__PURE__*/React.createElement("p", null, /*#__PURE__*/React.createElement("strong", null, "Pago:"), " ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "REPLICATE_API_TOKEN"), " (~US$0,05/v\xEDdeo) ou ", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "VIDEO_AI_URL"), "+", /*#__PURE__*/React.createElement("span", {
    className: "font-mono"
  }, "VIDEO_AI_KEY"), "."), /*#__PURE__*/React.createElement("p", null, "Sem nenhum, nada \xE9 gerado ou fabricado.")), status.configured && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-forest-600"
  }, "Motor: ", /*#__PURE__*/React.createElement("strong", null, status.provider), status.ttsBackend ? ' · narração: ' + status.ttsBackend : '', status.ffmpegAvailable ? ' · ffmpeg ✓' : ''), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4 text-xs"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block font-bold text-forest-800 mb-1"
  }, "Curso"), /*#__PURE__*/React.createElement("select", {
    value: courseId,
    onChange: e => {
      setCourseId(e.target.value);
      setLessonId('');
    },
    className: "w-full border border-ivory-300 rounded p-2"
  }, courses.map(c => /*#__PURE__*/React.createElement("option", {
    key: c.id,
    value: c.id
  }, c.title)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block font-bold text-forest-800 mb-1"
  }, "M\xF3dulo / Aula"), /*#__PURE__*/React.createElement("select", {
    value: lessonId,
    onChange: e => onSelectLesson(e.target.value),
    className: "w-full border border-ivory-300 rounded p-2"
  }, /*#__PURE__*/React.createElement("option", {
    value: ""
  }, "\u2014 selecione \u2014"), lessons.map(l => /*#__PURE__*/React.createElement("option", {
    key: l.id,
    value: l.id
  }, l.moduleTitle, " \xB7 ", l.title)))), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block font-bold text-forest-800 mb-1"
  }, "T\xEDtulo da aula"), /*#__PURE__*/React.createElement("input", {
    value: title,
    onChange: e => setTitle(e.target.value),
    className: "w-full border border-ivory-300 rounded p-2",
    placeholder: "T\xEDtulo exibido no v\xEDdeo"
  })), /*#__PURE__*/React.createElement("div", {
    className: "md:col-span-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-1"
  }, /*#__PURE__*/React.createElement("label", {
    className: "font-bold text-forest-800"
  }, "Roteiro ", scriptSource && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-forest-500"
  }, "(", scriptSource === 'ai' ? 'gerado por IA' : 'derivado do conteúdo', ")")), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: genScript,
    disabled: busy || !lessonId,
    className: "bg-ivory-200 hover:bg-ivory-300 disabled:opacity-40 text-forest-800 font-bold px-3 py-1 rounded text-[11px]"
  }, "\u2728 Gerar/Revisar roteiro com IA")), /*#__PURE__*/React.createElement("textarea", {
    rows: 6,
    value: script,
    onChange: e => setScript(e.target.value),
    className: "w-full border border-ivory-300 rounded p-2 font-mono",
    placeholder: "Escreva o roteiro ou gere com a IA. Par\xE1grafos separados por linha em branco viram slides."
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("label", {
    className: "block font-bold text-forest-800 mb-1"
  }, "Motor"), /*#__PURE__*/React.createElement("select", {
    value: engine,
    onChange: e => setEngine(e.target.value),
    className: "w-full border border-ivory-300 rounded p-2"
  }, /*#__PURE__*/React.createElement("option", {
    value: "auto"
  }, "Autom\xE1tico (recomendado)"), /*#__PURE__*/React.createElement("option", {
    value: "assembled"
  }, "Produ\xE7\xE3o automatizada (slides + narra\xE7\xE3o)"), /*#__PURE__*/React.createElement("option", {
    value: "huggingface"
  }, "Hugging Face (gr\xE1tis)"), /*#__PURE__*/React.createElement("option", {
    value: "replicate"
  }, "Replicate"), /*#__PURE__*/React.createElement("option", {
    value: "custom"
  }, "Endpoint pr\xF3prio"))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: createJob,
    disabled: busy || !status.configured,
    className: "w-full bg-forest-700 hover:bg-forest-800 disabled:opacity-40 text-ivory-50 font-bold py-2.5 rounded-xl shadow"
  }, "Gerar videoaula")))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-serif font-bold text-base text-forest-900"
  }, "Tarefas de gera\xE7\xE3o"), /*#__PURE__*/React.createElement("button", {
    onClick: loadJobs,
    className: "text-xs text-forest-600 underline"
  }, "atualizar")), jobs.length === 0 ? /*#__PURE__*/React.createElement("p", {
    className: "text-xs italic text-forest-600"
  }, "Nenhuma tarefa ainda.") : /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, jobs.map(j => /*#__PURE__*/React.createElement("div", {
    key: j.id,
    className: "border border-ivory-200 rounded-xl p-3 text-xs space-y-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-forest-900"
  }, j.lesson_title || j.title), /*#__PURE__*/React.createElement("span", {
    className: `px-2 py-0.5 rounded font-bold text-[10px] ${STATE_COLOR[j.status]}`
  }, STATE_LABEL[j.status] || j.status, typeof j.progress === 'number' ? ' · ' + j.progress + '%' : '')), /*#__PURE__*/React.createElement("div", {
    className: "text-[10px] text-forest-500 font-mono"
  }, "motor: ", j.engine, " \xB7 ", String(j.updated_at).slice(0, 16), j.published ? ' · PUBLICADO' : ''), j.error && /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-red-600"
  }, "Erro: ", j.error), j.status === 'COMPLETED' && j.result_url && /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("video", {
    controls: true,
    className: "w-full max-w-md rounded-lg border border-ivory-300 bg-black",
    src: window.UMBANDA_CONFIG.apiBase.replace('/api', '') + j.result_url
  }), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, !j.published && /*#__PURE__*/React.createElement("button", {
    onClick: () => act(j.id, 'publish'),
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-3 py-1.5 rounded-lg text-[11px]"
  }, "Publicar na aula"), j.published && /*#__PURE__*/React.createElement("span", {
    className: "text-forest-700 font-bold"
  }, "\u2713 Publicado"))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, (j.status === 'FAILED' || j.status === 'CANCELED') && /*#__PURE__*/React.createElement("button", {
    onClick: () => act(j.id, 'retry'),
    className: "bg-forest-700 text-ivory-50 px-3 py-1 rounded text-[11px] font-bold"
  }, "Tentar novamente"), ['QUEUED', 'PROCESSING', 'SUBMITTING'].includes(j.status) && /*#__PURE__*/React.createElement("button", {
    onClick: () => act(j.id, 'cancel'),
    className: "bg-ivory-200 text-forest-700 px-3 py-1 rounded text-[11px] font-bold"
  }, "Cancelar")))))));
}
const {
  useState,
  useEffect,
  useRef,
  useCallback
} = React;
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
    setToast({
      msg,
      type
    });
    setTimeout(() => setToast(null), 4500);
  }, []);

  // Sessão persistente: se há token, recupera o usuário do servidor.
  useEffect(() => {
    (async () => {
      try {
        await Api.health();
        setOnline(true);
        if (Api.getToken()) {
          const {
            user
          } = await Api.me();
          setUser(user);
          setTab(user.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
        }
      } catch (e) {
        if (e.network) setOnline(false);else Api.setToken(null);
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
    return /*#__PURE__*/React.createElement("div", {
      className: "min-h-screen flex items-center justify-center bg-ivory-50"
    }, /*#__PURE__*/React.createElement("div", {
      className: "text-center space-y-3"
    }, /*#__PURE__*/React.createElement("div", {
      className: "w-14 h-14 rounded-full bg-forest-700 border-2 border-gold-400 flex items-center justify-center text-gold-400 text-2xl mx-auto animate-pulse"
    }, "\uD83C\uDF3F"), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-forest-700"
    }, "Conectando ao portal...")));
  }
  if (!online) {
    return /*#__PURE__*/React.createElement(OfflineScreen, {
      onRetry: () => window.location.reload()
    });
  }
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col min-h-screen selection:bg-gold-300 selection:text-forest-900"
  }, toast && /*#__PURE__*/React.createElement("div", {
    className: `fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2 ${toast.type === 'error' ? 'bg-red-900 text-ivory-50 border-red-700' : 'bg-forest-800 text-gold-400 border-gold-400'}`
  }, /*#__PURE__*/React.createElement("span", null, toast.type === 'error' ? '⚠️' : '✨'), /*#__PURE__*/React.createElement("span", null, toast.msg)), /*#__PURE__*/React.createElement(Header, {
    user: user,
    tab: tab,
    setTab: setTab,
    onLogout: handleLogout
  }), /*#__PURE__*/React.createElement("main", {
    className: "flex-1 bg-ivory-50"
  }, tab === 'INSTITUTIONAL' && /*#__PURE__*/React.createElement(InstitutionalView, {
    setTab: setTab,
    showToast: showToast
  }), tab === 'LOGIN' && /*#__PURE__*/React.createElement(LoginView, {
    onLogin: u => {
      setUser(u);
      setTab(u.role === 'ADMIN' ? 'ADMIN' : 'STUDENT');
    },
    showToast: showToast
  }), tab === 'STUDENT' && user && /*#__PURE__*/React.createElement(StudentView, {
    user: user,
    showToast: showToast
  }), tab === 'ADMIN' && user && user.role === 'ADMIN' && /*#__PURE__*/React.createElement(AdminView, {
    user: user,
    showToast: showToast
  }), tab === 'CERT_VERIFY' && /*#__PURE__*/React.createElement(CertVerifyView, null)), /*#__PURE__*/React.createElement(Footer, {
    setTab: setTab
  }));
}
function OfflineScreen({
  onRetry
}) {
  return /*#__PURE__*/React.createElement("div", {
    className: "min-h-screen flex items-center justify-center bg-forest-900 text-ivory-50 p-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-md text-center space-y-5 bg-forest-800 border border-gold-500/30 rounded-2xl p-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-5xl"
  }, "\uD83D\uDCE1"), /*#__PURE__*/React.createElement("h1", {
    className: "font-serif font-bold text-2xl text-gold-400"
  }, "Sem conex\xE3o com o servidor"), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-ivory-200 leading-relaxed"
  }, "A plataforma \xE9 EAD e precisa de internet para acessar os cursos, mensagens e certificados. Verifique sua conex\xE3o e tente novamente."), /*#__PURE__*/React.createElement("button", {
    onClick: onRetry,
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-6 py-2.5 rounded-xl text-xs shadow"
  }, "Tentar novamente")));
}
function Header({
  user,
  tab,
  setTab,
  onLogout
}) {
  const navBtn = (id, label) => /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab(id),
    className: `hover:text-gold-400 transition py-1 ${tab === id ? 'text-gold-400 font-bold border-b-2 border-gold-400' : 'text-ivory-100'}`
  }, label);
  return /*#__PURE__*/React.createElement("header", {
    className: "bg-forest-900 text-ivory-50 border-b border-gold-500/30 sticky top-0 z-40 shadow-md"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 py-3 flex items-center justify-between"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 cursor-pointer",
    onClick: () => setTab('INSTITUTIONAL')
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-10 h-10 rounded-full bg-forest-700 border-2 border-gold-400 flex items-center justify-center text-gold-400 font-bold text-lg shadow"
  }, "\uD83C\uDF3F"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h1", {
    className: "font-serif font-bold text-base md:text-lg tracking-wide leading-tight"
  }, "Forma\xE7\xE3o Sacerdotal de Umbanda"), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-gold-400 font-medium"
  }, "Tradi\xE7\xE3o, Sabedoria & Espiritualidade"))), /*#__PURE__*/React.createElement("nav", {
    className: "hidden md:flex items-center space-x-6 text-xs font-semibold"
  }, navBtn('INSTITUTIONAL', 'Página Inicial & Cursos'), user && user.role === 'STUDENT' && navBtn('STUDENT', 'Área do Aluno (EAD)'), user && user.role === 'ADMIN' && navBtn('ADMIN', 'Painel Administrativo'), navBtn('CERT_VERIFY', 'Validar Certificado')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3"
  }, user ? /*#__PURE__*/React.createElement("div", {
    className: "flex items-center space-x-3 bg-forest-950/80 px-3 py-1.5 rounded-xl border border-forest-700"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-right text-xs"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-semibold leading-tight"
  }, user.name), /*#__PURE__*/React.createElement("span", {
    className: "text-gold-400 text-[10px] uppercase font-mono font-bold tracking-wider"
  }, user.role === 'ADMIN' ? 'Administrador' : 'Aluno')), /*#__PURE__*/React.createElement("button", {
    onClick: onLogout,
    className: "bg-forest-800 hover:bg-forest-700 text-ivory-100 px-2.5 py-1 rounded text-xs transition border border-forest-600"
  }, "Sair")) : /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('LOGIN'),
    className: "bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-4 py-1.5 rounded-lg text-xs shadow transition"
  }, "Acessar Portal EAD"))));
}
function Footer({
  setTab
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "bg-forest-900 text-ivory-200 border-t border-forest-800 text-xs py-8"
  }, /*#__PURE__*/React.createElement("div", {
    className: "max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h3", {
    className: "font-serif font-bold text-sm text-gold-400 mb-2"
  }, "Forma\xE7\xE3o Sacerdotal de Umbanda"), /*#__PURE__*/React.createElement("p", {
    className: "text-ivory-300 leading-relaxed"
  }, "Plataforma EAD independente para preserva\xE7\xE3o, ensino e forma\xE7\xE3o sacerdotal fundamentada na caridade, na tradi\xE7\xE3o e na \xE9tica umbandista.")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-ivory-100 mb-2"
  }, "Links R\xE1pidos"), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1 text-ivory-300"
  }, /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('CERT_VERIFY'),
    className: "hover:underline"
  }, "Verifica\xE7\xE3o Aut\xEAntica de Certificados")), /*#__PURE__*/React.createElement("li", null, /*#__PURE__*/React.createElement("button", {
    onClick: () => setTab('INSTITUTIONAL'),
    className: "hover:underline"
  }, "Grade Curricular de 6 Cursos")))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-semibold text-ivory-100 mb-2"
  }, "Seguran\xE7a e LGPD"), /*#__PURE__*/React.createElement("p", {
    className: "text-ivory-300 mb-2"
  }, "Todos os dados dos alunos s\xE3o protegidos. O conte\xFAdo pedag\xF3gico respeita a diversidade de tradi\xE7\xF5es."), /*#__PURE__*/React.createElement("p", {
    className: "text-gold-400/80"
  }, "\xA9 2026 Forma\xE7\xE3o Sacerdotal de Umbanda."))));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
