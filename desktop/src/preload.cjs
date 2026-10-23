// Preload: injeta a base da API de PRODUÇÃO no window da aplicação web,
// de forma segura (contextIsolation). Nenhum segredo é exposto aqui — apenas a
// URL pública do backend, a mesma usada pelo site.
const { contextBridge } = require('electron');

const APP_URL = process.env.UMBANDA_APP_URL || 'https://ead.umbanda.org';

// A SPA lê window.__UMBANDA_API_BASE__ (ver web/config.js) para montar apiBase.
contextBridge.exposeInMainWorld('__UMBANDA_API_BASE__', APP_URL);

// Marcador para a aplicação saber que está rodando no desktop.
contextBridge.exposeInMainWorld('__UMBANDA_DESKTOP__', true);
