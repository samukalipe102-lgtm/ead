// Área do Aluno. Abas CLARAMENTE separadas:
//  - AULAS (vídeo com estado real + conteúdo + atividade + quiz)
//  - MENSAGENS (área real de mensagens, threads persistentes com a administração)
//  - TUTOR IA (área PRÓPRIA, independente das mensagens)
//  - PROGRESSO / NOTAS / CERTIFICADOS / COMUNICADOS
function StudentView({ user, showToast }) {
  const [sub, setSub] = useState('CLASSES');
  const tabBtn = (id, label) => (
    <button onClick={() => setSub(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${sub === id ? 'bg-gold-500 text-forest-900' : 'bg-forest-700 text-ivory-100'}`}>{label}</button>
  );
  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <div className="bg-forest-800 text-ivory-50 rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border border-gold-500/30">
        <div>
          <span className="text-xs font-semibold text-gold-400 uppercase tracking-wide">Ambiente do Estudante</span>
          <h2 className="font-serif font-bold text-2xl">Bem-vindo(a), {user.name}</h2>
          <p className="text-xs text-ivory-200 mt-1">Acompanhe suas aulas, converse com a administração e com o tutor de IA, e emita certificados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tabBtn('CLASSES', '📺 Aulas')}
          {tabBtn('MESSAGES', '💬 Mensagens')}
          {tabBtn('AI', '🤖 Tutor de IA')}
          {tabBtn('GRADES', '📝 Notas')}
          {tabBtn('CERTS', '📜 Certificados')}
          {tabBtn('ANN', '📢 Comunicados')}
        </div>
      </div>

      {sub === 'CLASSES' && <ClassesTab user={user} showToast={showToast} />}
      {sub === 'MESSAGES' && <MessagesTab user={user} showToast={showToast} isAdmin={false} />}
      {sub === 'AI' && <AiTutorTab showToast={showToast} />}
      {sub === 'GRADES' && <GradesTab user={user} />}
      {sub === 'CERTS' && <CertsTab user={user} showToast={showToast} />}
      {sub === 'ANN' && <AnnouncementsTab />}
    </div>
  );
}

function ClassesTab({ user, showToast }) {
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

  useEffect(() => { load(); }, []);

  const refreshCourse = async (courseId) => {
    const { course } = await Api.course(courseId);
    setActiveCourse(course);
    setCourses((prev) => prev.map((c) => (c.id === courseId ? course : c)));
    if (lesson) {
      const updated = course.modules.flatMap((m) => m.lessons).find((l) => l.id === lesson.id);
      if (updated) setLesson(updated);
    }
  };

  const toggleComplete = async () => {
    try {
      await Api.setLessonProgress(lesson.id, !lesson.completed);
      await refreshCourse(activeCourse.id);
      showToast('Progresso atualizado!');
    } catch (e) { showToast(e.message, 'error'); }
  };

  const submitQuiz = () => {
    let correct = 0;
    lesson.quiz.forEach((q, i) => { if (quizAnswers[i] === q.correct) correct++; });
    setQuizResult({ correct, total: lesson.quiz.length });
    showToast('Questionário corrigido: ' + correct + '/' + lesson.quiz.length + ' corretas.');
  };

  const emitCert = async () => {
    try {
      const r = await Api.issueCertificate(activeCourse.id);
      window.UmbandaPDF.certificate(user.name, activeCourse.title, activeCourse.hours, r.certificate.id);
      showToast('Certificado emitido: ' + r.certificate.id);
    } catch (e) {
      showToast(e.data && e.data.error ? e.data.error : (e.message || 'Conclua todas as aulas para emitir.'), 'error');
    }
  };

  if (!courses) return <Spinner label="Carregando seus cursos..." />;
  if (!courses.length) return <div className="bg-white border border-ivory-300 rounded-2xl p-10 text-center text-sm text-forest-700">Você ainda não tem cursos liberados. Aguarde a aprovação da sua inscrição.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="space-y-4">
        <h3 className="font-serif font-bold text-lg text-forest-900">Seus Cursos</h3>
        {courses.map((c) => (
          <div key={c.id} onClick={() => { setActiveCourse(c); setLesson(null); setVideoErr(false); }} className={`cursor-pointer rounded-2xl p-4 border transition ${activeCourse && activeCourse.id === c.id ? 'bg-forest-700 text-ivory-50 border-gold-400 shadow-md' : 'bg-white text-forest-900 border-ivory-300 hover:border-forest-600'}`}>
            <div className="flex justify-between items-center mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${activeCourse && activeCourse.id === c.id ? 'bg-gold-500 text-forest-900' : 'bg-ivory-200 text-forest-800'}`}>{c.hours}h</span>
              <span className="text-xs opacity-80">{c.modules.length} Módulo(s)</span>
            </div>
            <h4 className="font-serif font-bold text-sm leading-snug">{c.title}</h4>
          </div>
        ))}
        {activeCourse && (
          <div className="bg-white border border-ivory-300 rounded-2xl p-4 space-y-4 shadow-sm">
            <h4 className="font-bold text-xs uppercase tracking-wider text-forest-700 border-b border-ivory-200 pb-2">Grade de Módulos</h4>
            <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
              {activeCourse.modules.map((m) => (
                <div key={m.id} className="space-y-2">
                  <h5 className="font-semibold text-xs text-forest-900 bg-ivory-100 p-2 rounded-lg">{m.title}</h5>
                  <div className="space-y-1 pl-2">
                    {m.lessons.map((l) => (
                      <button key={l.id} onClick={() => { setLesson(l); setVideoErr(false); setQuizAnswers({}); setQuizResult(null); }} className={`w-full text-left p-2 rounded-lg text-xs flex items-center justify-between transition ${lesson && lesson.id === l.id ? 'bg-forest-100 text-forest-900 font-bold border-l-4 border-forest-700' : 'hover:bg-ivory-50 text-forest-800'}`}>
                        <span className="truncate pr-2">{l.title}</span>
                        {l.completed ? <span className="text-forest-700 font-bold">✓</span> : <span className="text-ivory-300 text-[10px]">{l.duration}</span>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="lg:col-span-2 space-y-6">
        {lesson ? (
          <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="space-y-1">
              <span className="text-[11px] font-semibold uppercase text-gold-600 bg-gold-50 px-2.5 py-1 rounded border border-gold-200">{activeCourse.title}</span>
              <h3 className="font-serif font-bold text-xl text-forest-900">{lesson.title}</h3>
              <div className="pt-1"><VideoStateBadge status={videoErr ? 'ERROR' : lesson.videoStatus} /></div>
            </div>

            <div className="aspect-video bg-forest-950 rounded-xl border border-forest-800 overflow-hidden relative shadow-inner">
              {lesson.videoUrl && lesson.videoStatus === 'AVAILABLE' && !videoErr ? (
                <video controls className="w-full h-full object-contain bg-black" src={lesson.videoUrl} onError={() => setVideoErr(true)}>
                  Seu navegador não suporta reprodução de vídeo.
                </video>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-forest-900 via-forest-800 to-forest-950 text-center space-y-3">
                  <div className="w-14 h-14 rounded-full bg-forest-700 border-2 border-gold-400 flex items-center justify-center text-gold-400 text-xl">🎬</div>
                  {videoErr ? (
                    <p className="text-xs text-red-300">Não foi possível carregar o vídeo desta aula. O conteúdo em texto abaixo permanece disponível.</p>
                  ) : lesson.videoStatus === 'PROCESSING' ? (
                    <p className="text-xs text-gold-300">O vídeo desta aula está em processamento e ficará disponível em breve.</p>
                  ) : (
                    <p className="text-xs text-ivory-300">O vídeo desta aula ainda não foi disponibilizado. Estude pelo conteúdo e transcrição abaixo.</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-serif font-bold text-base text-forest-900 border-b border-ivory-200 pb-2">Conteúdo Didático Completo</h4>
              <div className="bg-ivory-50 border border-ivory-200 rounded-xl p-5 text-xs text-forest-800 leading-relaxed prose"><div className="whitespace-pre-line">{lesson.content}</div></div>
              {lesson.transcript && (
                <div className="bg-white border border-ivory-300 rounded-xl p-4 text-xs space-y-1">
                  <h5 className="font-bold text-forest-900">Transcrição da Aula:</h5>
                  <p className="text-forest-700 italic">"{lesson.transcript}"</p>
                </div>
              )}
              {lesson.activity && (
                <div className="bg-gold-100/50 border border-gold-300 rounded-xl p-4 space-y-2 text-xs">
                  <h5 className="font-bold text-forest-900">✍️ Atividade de Fixação</h5>
                  <p className="text-forest-800">{lesson.activity}</p>
                </div>
              )}
              {lesson.quiz && lesson.quiz.length > 0 && (
                <div className="bg-white border border-ivory-300 rounded-xl p-4 space-y-3 text-xs">
                  <h5 className="font-bold text-forest-900">❓ Questionário do Módulo</h5>
                  {lesson.quiz.map((q, qi) => (
                    <div key={qi} className="space-y-2">
                      <p className="font-semibold text-forest-900">{q.question}</p>
                      <div className="space-y-1 pl-2">
                        {q.options.map((opt, oi) => (
                          <label key={oi} className={`flex items-center space-x-2 cursor-pointer ${quizResult ? (oi === q.correct ? 'text-forest-700 font-bold' : (quizAnswers[qi] === oi ? 'text-red-600' : '')) : ''}`}>
                            <input type="radio" name={'q' + qi} checked={quizAnswers[qi] === oi} onChange={() => setQuizAnswers({ ...quizAnswers, [qi]: oi })} />
                            <span>{opt}{quizResult && oi === q.correct ? ' ✓' : ''}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                  <button onClick={submitQuiz} className="bg-forest-700 text-ivory-50 px-4 py-1.5 rounded-lg font-bold text-xs shadow">Corrigir Questionário</button>
                  {quizResult && <p className="text-forest-700 font-bold">Resultado: {quizResult.correct}/{quizResult.total} corretas.</p>}
                </div>
              )}

              <div className="flex flex-wrap justify-between items-center gap-2 pt-2">
                <button onClick={toggleComplete} className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow ${lesson.completed ? 'bg-forest-100 text-forest-800 border border-forest-300' : 'bg-forest-700 hover:bg-forest-800 text-ivory-50'}`}>{lesson.completed ? '✓ Concluída (desmarcar)' : 'Marcar Aula como Concluída'}</button>
                <button onClick={emitCert} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-4 py-2 rounded-xl text-xs shadow transition">📜 Emitir Certificado ({activeCourse.hours}h)</button>
              </div>
              <p className="text-[10px] text-forest-500">O certificado só é emitido após a conclusão de <strong>todas</strong> as aulas do curso (validado no servidor).</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-ivory-300 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <div className="text-4xl text-gold-500">📖</div>
            <h3 className="font-serif font-bold text-xl text-forest-900">Selecione uma Aula na Grade</h3>
            <p className="text-xs text-forest-700 max-w-md mx-auto">Escolha uma aula ao lado para acessar o conteúdo, o vídeo e as atividades do módulo.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ÁREA REAL DE MENSAGENS (reutilizada por aluno e admin).
function MessagesTab({ user, showToast, isAdmin }) {
  const [threads, setThreads] = useState(null);
  const [active, setActive] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [newOpen, setNewOpen] = useState(false);
  const [newThread, setNewThread] = useState({ subject: '', body: '' });

  const loadThreads = useCallback(async () => {
    const d = await Api.threads();
    setThreads(d.threads);
  }, []);
  useEffect(() => { loadThreads(); }, []);

  const openThread = async (t) => {
    setActive(t);
    const d = await Api.thread(t.id);
    setMessages(d.messages);
  };

  const sendReply = async (e) => {
    e.preventDefault();
    if (!reply.trim()) return;
    await Api.replyThread(active.id, reply.trim());
    setReply('');
    const d = await Api.thread(active.id);
    setMessages(d.messages);
    showToast('Mensagem enviada.');
  };

  const createThread = async (e) => {
    e.preventDefault();
    await Api.createThread({ subject: newThread.subject, body: newThread.body });
    setNewOpen(false); setNewThread({ subject: '', body: '' });
    await loadThreads();
    showToast('Conversa iniciada.');
  };

  if (!threads) return <Spinner label="Carregando mensagens..." />;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="font-serif font-bold text-lg text-forest-900">{isAdmin ? 'Conversas dos Alunos' : 'Minhas Conversas'}</h3>
          {!isAdmin && <button onClick={() => setNewOpen(true)} className="bg-forest-700 text-ivory-50 px-3 py-1.5 rounded-lg text-xs font-bold">+ Nova</button>}
        </div>
        {threads.length === 0 ? <p className="text-xs text-forest-600 italic">Nenhuma conversa ainda.</p> : threads.map((t) => (
          <button key={t.id} onClick={() => openThread(t)} className={`w-full text-left rounded-xl p-3 border text-xs transition ${active && active.id === t.id ? 'bg-forest-700 text-ivory-50 border-gold-400' : 'bg-white text-forest-900 border-ivory-300 hover:border-forest-600'}`}>
            <div className="font-bold">{t.subject}</div>
            <div className="opacity-80 mt-0.5">{isAdmin ? t.student_name + ' • ' : ''}{t.message_count} mensagem(ns)</div>
          </button>
        ))}
      </div>

      <div className="lg:col-span-2">
        {active ? (
          <div className="bg-white border border-ivory-300 rounded-2xl p-5 shadow-sm space-y-4">
            <h4 className="font-serif font-bold text-base text-forest-900 border-b border-ivory-200 pb-2">{active.subject}</h4>
            <div className="space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar">
              {messages.map((m) => (
                <div key={m.id} className={`rounded-xl p-3 text-xs ${m.sender_role === 'ADMIN' ? 'bg-gold-50 border border-gold-200' : 'bg-ivory-50 border border-ivory-200'}`}>
                  <div className="flex justify-between items-center font-bold text-forest-900">
                    <span>{m.sender_name} {m.sender_role === 'ADMIN' ? '[Administração]' : '[Aluno]'}</span>
                    <span className="text-[10px] text-forest-600 font-normal">{String(m.created_at).slice(0, 16)}</span>
                  </div>
                  <p className="text-forest-800 mt-1 leading-relaxed whitespace-pre-line">{m.body}</p>
                </div>
              ))}
            </div>
            <form onSubmit={sendReply} className="space-y-2">
              <textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Escreva sua resposta..." className="w-full border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600" />
              <button type="submit" className="bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold px-4 py-2 rounded-xl text-xs shadow">Enviar</button>
            </form>
          </div>
        ) : (
          <div className="bg-white border border-ivory-300 rounded-2xl p-12 text-center text-xs text-forest-700">Selecione uma conversa para visualizar as mensagens.</div>
        )}
      </div>

      {newOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <form onSubmit={createThread} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-gold-400">
            <div className="flex justify-between items-center"><h3 className="font-serif font-bold text-lg text-forest-900">Nova Conversa</h3><button type="button" onClick={() => setNewOpen(false)} className="text-forest-600 font-bold">✕</button></div>
            <input required placeholder="Assunto" value={newThread.subject} onChange={(e) => setNewThread({ ...newThread, subject: e.target.value })} className="w-full border border-ivory-300 rounded p-2 text-xs" />
            <textarea required rows={4} placeholder="Escreva sua mensagem para a administração..." value={newThread.body} onChange={(e) => setNewThread({ ...newThread, body: e.target.value })} className="w-full border border-ivory-300 rounded p-2 text-xs" />
            <button type="submit" className="w-full bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold py-2.5 rounded-xl text-xs">Enviar Mensagem</button>
          </form>
        </div>
      )}
    </div>
  );
}

// ÁREA PRÓPRIA DO TUTOR DE IA — independente das mensagens.
function AiTutorTab({ showToast }) {
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    Api.aiStatus().then(setStatus).catch(() => setStatus({ configured: false }));
    Api.aiHistory().then((d) => setHistory(d.messages)).catch(() => {});
  }, []);
  useEffect(() => { if (endRef.current) endRef.current.scrollIntoView(); }, [history, thinking]);

  const ask = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const q = input.trim();
    setHistory((h) => [...h, { id: 'tmp', role: 'user', body: q }]);
    setInput(''); setThinking(true);
    try {
      const r = await Api.aiAsk(q);
      setHistory((h) => [...h, { id: 'tmp2', role: 'assistant', body: r.reply }]);
    } catch (err) {
      const msg = err.data && err.data.message ? err.data.message : 'Tutor de IA indisponível.';
      showToast(msg, 'error');
      setHistory((h) => [...h, { id: 'tmperr', role: 'assistant', body: '⚠️ ' + msg }]);
    } finally { setThinking(false); }
  };

  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4 max-w-3xl mx-auto">
      <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
        <h3 className="font-serif font-bold text-lg text-forest-900">🤖 Tutor de Estudos com IA</h3>
        {status && (
          <span className={`text-[10px] px-2 py-1 rounded font-bold ${status.configured ? 'bg-forest-100 text-forest-800' : 'bg-ivory-200 text-forest-700'}`}>
            {status.configured ? 'IA ativa (' + (status.provider || '') + ')' : 'IA não configurada'}
          </span>
        )}
      </div>
      {status && !status.configured && (
        <div className="bg-gold-100/60 border border-gold-300 text-forest-800 text-xs p-3 rounded-lg">
          O Tutor de IA ainda não foi ativado neste servidor. Ele funcionará assim que o administrador configurar uma chave de provedor (Gemini ou OpenAI) nas variáveis de ambiente. Esta área é totalmente independente das suas mensagens com a administração.
        </div>
      )}
      <div className="space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto custom-scrollbar">
        {history.length === 0 && <p className="text-xs text-forest-600 italic">Faça uma pergunta de estudos. O tutor responde de forma didática, respeitando a diversidade das tradições.</p>}
        {history.map((m, i) => (
          <div key={i} className={`rounded-xl p-3 text-xs ${m.role === 'user' ? 'bg-forest-700 text-ivory-50 ml-8' : 'bg-ivory-50 border border-ivory-200 text-forest-800 mr-8'}`}>
            <div className="font-bold mb-1">{m.role === 'user' ? 'Você' : 'Tutor IA'}</div>
            <p className="whitespace-pre-line leading-relaxed">{m.body}</p>
          </div>
        ))}
        {thinking && <div className="text-xs text-forest-600 italic mr-8">Tutor IA está pensando...</div>}
        <div ref={endRef} />
      </div>
      <form onSubmit={ask} className="flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pergunte algo sobre os estudos..." className="flex-1 border border-ivory-300 rounded p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-forest-600" disabled={status && !status.configured} />
        <button type="submit" disabled={thinking || (status && !status.configured)} className="bg-gold-500 hover:bg-gold-600 disabled:opacity-50 text-forest-900 font-bold px-4 py-2 rounded-xl text-xs shadow">Enviar</button>
      </form>
    </div>
  );
}

function GradesTab({ user }) {
  const [grades, setGrades] = useState(null);
  useEffect(() => { Api.myGrades().then((d) => setGrades(d.grades)).catch(() => setGrades([])); }, []);
  if (!grades) return <Spinner />;
  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-6">
      <div className="flex justify-between items-center border-b border-ivory-200 pb-4">
        <div><h3 className="font-serif font-bold text-lg text-forest-900">Boletim Oficial de Avaliações</h3><p className="text-xs text-forest-600">Histórico de notas registradas</p></div>
        <button onClick={() => window.UmbandaPDF.bulletin(user.name, grades)} className="bg-forest-700 hover:bg-forest-800 text-ivory-50 font-bold px-4 py-2 rounded-xl text-xs shadow">📄 Baixar Boletim em PDF</button>
      </div>
      <table className="w-full text-left text-xs text-forest-800">
        <thead className="bg-ivory-100 uppercase text-[10px] text-forest-700 font-bold border-b border-ivory-200"><tr><th className="p-3">Curso</th><th className="p-3">Avaliação</th><th className="p-3">Nota</th><th className="p-3">Feedback</th><th className="p-3">Data</th></tr></thead>
        <tbody className="divide-y divide-ivory-200">
          {grades.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-forest-600 italic">Nenhuma nota registrada.</td></tr> : grades.map((g) => (
            <tr key={g.id} className="hover:bg-ivory-50"><td className="p-3 font-semibold text-forest-900">{g.course_title}</td><td className="p-3">{g.assignment_name}</td><td className="p-3 font-bold">{g.score} / {g.max_score}</td><td className="p-3 italic text-forest-700">{g.feedback}</td><td className="p-3 text-forest-600">{String(g.date).slice(0, 10)}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CertsTab({ user, showToast }) {
  const [certs, setCerts] = useState(null);
  useEffect(() => { Api.myCertificates().then((d) => setCerts(d.certificates)).catch(() => setCerts([])); }, []);
  if (!certs) return <Spinner />;
  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="font-serif font-bold text-lg text-forest-900">Meus Certificados</h3>
      {certs.length === 0 ? <p className="text-xs text-forest-600 italic">Você ainda não possui certificados. Conclua um curso para emiti-lo.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certs.map((c) => (
            <div key={c.id} className="border border-ivory-300 rounded-xl p-4 bg-ivory-50 space-y-2 text-xs">
              <div className="font-bold text-forest-900">{c.course_title}</div>
              <div className="text-forest-700">{c.hours}h • Código: <span className="font-mono">{c.id}</span></div>
              <div className="text-forest-600">Emitido em {String(c.issue_date).slice(0, 10)}</div>
              <button onClick={() => window.UmbandaPDF.certificate(user.name, c.course_title, c.hours, c.id)} className="bg-gold-500 hover:bg-gold-600 text-forest-900 font-bold px-3 py-1.5 rounded-lg text-xs">Baixar PDF</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnnouncementsTab() {
  const [anns, setAnns] = useState(null);
  useEffect(() => { Api.announcements().then((d) => setAnns(d.announcements)).catch(() => setAnns([])); }, []);
  if (!anns) return <Spinner />;
  return (
    <div className="bg-white border border-ivory-300 rounded-2xl p-6 shadow-sm space-y-4">
      <h3 className="font-serif font-bold text-lg text-forest-900">Comunicados Institucionais</h3>
      {anns.map((a) => (
        <div key={a.id} className="p-4 bg-ivory-50 border border-ivory-200 rounded-xl space-y-2">
          <div className="flex justify-between items-center"><span className="font-serif font-bold text-sm text-forest-900">{a.title}</span><span className="text-[10px] text-forest-600">{String(a.date).slice(0, 10)} • {a.author_name}</span></div>
          <p className="text-xs text-forest-800 leading-relaxed">{a.content}</p>
        </div>
      ))}
    </div>
  );
}
