// Configuração do frontend.
// A base da API é descoberta em runtime:
//  - No app desktop (Electron), window.__UMBANDA_API_BASE__ é injetado pelo preload
//    apontando para o backend de PRODUÇÃO.
//  - No navegador, usa a mesma origem que serviu a página (o backend serve o web/).
//  - Em desenvolvimento local, cai para http://localhost:4000.
window.UMBANDA_CONFIG = (function () {
  const injected = window.__UMBANDA_API_BASE__;
  if (injected) return { apiBase: injected.replace(/\/$/, '') + '/api' };

  const origin = window.location.origin;
  if (origin && origin.startsWith('http')) {
    return { apiBase: origin + '/api' };
  }
  // file:// ou origem desconhecida -> dev local
  return { apiBase: 'http://localhost:4000/api' };
})();
