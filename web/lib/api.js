// Cliente de API com tratamento honesto de erros e detecção de offline.
window.Api = (function () {
  const base = window.UMBANDA_CONFIG.apiBase;
  const TOKEN_KEY = 'umbanda_token';

  function getToken() { return localStorage.getItem(TOKEN_KEY); }
  function setToken(t) { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); }

  async function request(method, path, body) {
    const token = getToken();
    let res;
    try {
      res = await fetch(base + path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: 'Bearer ' + token } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch (networkErr) {
      // Falha de rede: servidor inacessível / sem internet.
      const e = new Error('NETWORK');
      e.network = true;
      throw e;
    }
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const e = new Error((data && data.error) || ('Erro ' + res.status));
      e.status = res.status;
      e.data = data;
      throw e;
    }
    return data;
  }

  return {
    base,
    getToken, setToken,
    health: () => request('GET', '/health'),
    login: (email, password) => request('POST', '/auth/login', { email, password }),
    me: () => request('GET', '/auth/me'),
    changePassword: (currentPassword, newPassword) => request('POST', '/auth/change-password', { currentPassword, newPassword }),

    catalog: () => request('GET', '/courses/catalog'),
    myCourses: () => request('GET', '/courses/mine'),
    course: (id) => request('GET', '/courses/' + id),
    courseProgress: (id) => request('GET', '/courses/' + id + '/progress'),
    setLessonProgress: (lessonId, completed) => request('POST', '/courses/lessons/' + lessonId + '/progress', { completed }),

    requestEnrollment: (name, email, courseId) => request('POST', '/enrollments/request', { name, email, courseId }),
    enrollments: () => request('GET', '/enrollments'),
    approveEnrollment: (id) => request('POST', '/enrollments/' + id + '/approve'),
    rejectEnrollment: (id) => request('POST', '/enrollments/' + id + '/reject'),

    threads: () => request('GET', '/messages/threads'),
    createThread: (payload) => request('POST', '/messages/threads', payload),
    thread: (id) => request('GET', '/messages/threads/' + id),
    replyThread: (id, body) => request('POST', '/messages/threads/' + id + '/reply', { body }),

    aiStatus: () => request('GET', '/ai-tutor/status'),
    aiHistory: () => request('GET', '/ai-tutor/history'),
    aiAsk: (message) => request('POST', '/ai-tutor/ask', { message }),

    announcements: () => request('GET', '/announcements'),
    myGrades: () => request('GET', '/grades/mine'),
    myCertificates: () => request('GET', '/certificates/mine'),
    issueCertificate: (courseId) => request('POST', '/certificates/issue', { courseId }),
    verifyCertificate: (code) => request('GET', '/certificates/verify/' + encodeURIComponent(code)),

    // Admin
    adminUsers: () => request('GET', '/admin/users'),
    adminAuditLogs: () => request('GET', '/admin/audit-logs'),
    adminGrades: () => request('GET', '/admin/grades'),
    emailSettings: () => request('GET', '/admin/email-settings'),
    saveEmailSettings: (s) => request('PUT', '/admin/email-settings', s),
    emailLogs: () => request('GET', '/admin/email-logs'),
    emailVerify: () => request('GET', '/admin/email-verify'),
    emailTest: (to) => request('POST', '/admin/email-test', { to }),
    videoAiStatus: () => request('GET', '/admin/video-ai/status'),
    generateScript: (payload) => request('POST', '/admin/video-ai/script', payload),
    createVideoJob: (payload) => request('POST', '/admin/video-ai/jobs', payload),
    videoJobs: () => request('GET', '/admin/video-ai/jobs'),
    videoJob: (id) => request('GET', '/admin/video-ai/jobs/' + id),
    retryVideoJob: (id) => request('POST', '/admin/video-ai/jobs/' + id + '/retry'),
    cancelVideoJob: (id) => request('POST', '/admin/video-ai/jobs/' + id + '/cancel'),
    publishVideoJob: (id) => request('POST', '/admin/video-ai/jobs/' + id + '/publish'),
  };
})();
