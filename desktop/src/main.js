// Processo principal do Electron.
// A plataforma é EAD: o app carrega a aplicação web servida pelo backend de
// PRODUÇÃO. Nenhum segredo/credencial é embutido no executável.
import { app, BrowserWindow, shell, Menu, dialog } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// URL de produção da plataforma. Configurável por variável de ambiente no build/CI
// (UMBANDA_APP_URL). NÃO aponta para localhost de desenvolvimento por padrão.
const APP_URL = process.env.UMBANDA_APP_URL || 'https://ead.umbanda.org';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#081c15',
    title: 'Formação Sacerdotal de Umbanda',
    icon: join(__dirname, '..', 'build', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      // Segurança: sem Node no renderer, com isolamento de contexto.
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(__dirname, 'preload.cjs'),
    },
  });

  // Abre links externos (ex.: Google Sites) no navegador padrão, não na janela do app.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  loadApp();

  // Tela de erro clara quando não há conexão / servidor inacessível.
  mainWindow.webContents.on('did-fail-load', (_e, errorCode, errorDesc, validatedURL) => {
    // Ignora cancelamentos de navegação normais.
    if (errorCode === -3) return;
    showOfflinePage(errorDesc);
  });
}

function loadApp() {
  mainWindow.loadURL(APP_URL).catch(() => showOfflinePage('Falha ao carregar a plataforma.'));
}

function showOfflinePage(detail) {
  const html = `
    <!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8">
    <style>
      body{margin:0;height:100vh;display:flex;align-items:center;justify-content:center;
        background:#081c15;color:#f7f3e9;font-family:system-ui,Segoe UI,sans-serif;text-align:center}
      .card{max-width:520px;padding:40px;border:1px solid rgba(212,175,55,.3);border-radius:18px;background:#143627}
      h1{color:#d4af37;font-size:24px;margin:12px 0}
      p{color:#e2d3b7;line-height:1.6;font-size:14px}
      button{margin-top:18px;background:#c5a028;color:#081c15;border:none;font-weight:700;
        padding:12px 26px;border-radius:10px;cursor:pointer;font-size:13px}
      .detail{color:#886606;font-size:11px;margin-top:14px}
    </style></head>
    <body><div class="card">
      <div style="font-size:48px">📡</div>
      <h1>Sem conexão com o servidor</h1>
      <p>A plataforma de Formação Sacerdotal de Umbanda é EAD e precisa de internet
      para acessar cursos, mensagens e certificados. Verifique sua conexão e tente novamente.</p>
      <button onclick="location.reload()">Tentar novamente</button>
      <div class="detail">${(detail || '').replace(/[<>&]/g, '')}</div>
    </div></body></html>`;
  mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
}

app.whenReady().then(() => {
  // Menu enxuto em português.
  const template = [
    { label: 'Arquivo', submenu: [{ role: 'quit', label: 'Sair' }] },
    { label: 'Navegação', submenu: [
      { label: 'Recarregar', accelerator: 'CmdOrCtrl+R', click: () => loadApp() },
      { label: 'Página Inicial', click: () => loadApp() },
    ]},
    { label: 'Ajuda', submenu: [{
      label: 'Sobre',
      click: () => dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Sobre',
        message: 'Formação Sacerdotal de Umbanda',
        detail: 'Aplicativo desktop da plataforma EAD.\nVersão ' + app.getVersion() + '\nServidor: ' + APP_URL,
      }),
    }]},
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
