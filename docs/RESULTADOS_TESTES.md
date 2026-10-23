# Resultados reais dos testes

Data da execução: 23/10/2026. Ambiente: Node.js v22.23.4 (Linux, sandbox Kiro).

## ✅ Testes executados e APROVADOS (backend, end-to-end reais)

Comando: `cd server && node --test` — sobe a API real em memória, banco temporário.

| # | Teste | Resultado |
|---|-------|-----------|
| 1 | `/health` reporta estado honesto das integrações (db=true, smtp=false, ia=false) | **PASS** |
| 2 | Login admin e aluno funcionam; senha errada → 401 | **PASS** |
| 3 | Aluno vê apenas cursos autorizados (c1, c2, c6) | **PASS** |
| 4 | Aluno sem matrícula → 403 ao acessar curso | **PASS** |
| 5 | Admin acessa qualquer curso → 200 | **PASS** |
| 6 | Aluno em rota admin → 403; sem token → 401 | **PASS** |
| 7 | Estados de vídeo reais (AVAILABLE vs UNAVAILABLE) | **PASS** |
| 8 | Mensagens: área real, persistente e **isolada por usuário** (Carlos não vê thread da Maria → 403) | **PASS** |
| 9 | Tutor de IA **separado** das mensagens; sem chave → 503 "não configurado" | **PASS** |
| 10 | E-mail de teste sem SMTP → 502 com `SMTP_NOT_CONFIGURED` (**não finge sucesso**) | **PASS** |
| 11 | Vídeo IA: status honesto; sem HF_TOKEN → 503 "não configurado"; aluno → 403 | **PASS** |
| 12 | Inscrição: solicitar → aprovar cria usuário e concede acesso real | **PASS** |
| 13 | Certificado só emite após concluir todas as aulas; verificação pública funciona | **PASS** |
| 14 | Progresso: percentual reflete aulas concluídas | **PASS** |

**Total: 14/14 aprovados, 0 falhas.**

## ✅ Verificações de serving (backend + site web juntos)

Servidor iniciado e checado via HTTP real (mesma origem serve site e API):
- `GET /` → HTML da SPA (título correto) — **200**
- `GET /dist/bundle.js` → bundle compilado (73 KB) — **200**
- `GET /config.js`, `GET /lib/api.js` — **200**
- Fallback SPA (`GET /painel`) — **200**
- `GET /api/health` — **200** (integrações reportadas honestamente)

## ✅ Validações de build/estáticas

- `node --check` em `server/src/index.js`, `web/dist/bundle.js`, `desktop/src/main.js`,
  `desktop/src/preload.cjs`, `web/config.js`, `web/lib/*.js` → **sem erros de sintaxe**.
- Bundle do frontend compila com Babel e contém todos os componentes-chave
  (App, StudentView, AdminView, **MessagesTab e AiTutorTab separados**, VideoStateBadge,
  OfflineScreen).
- `npm audit` no backend → **0 vulnerabilidades** (nodemailer atualizado).
- Ícone `.ico` gerado → arquivo Windows válido com 7 tamanhos (16–256px) + PNG 512.
- `desktop/package.json` (electron-builder) válido; alvos Windows: **nsis + portable**;
  `artifactName = FormacaoSacerdotalUmbanda-Setup.${ext}`.

## ⚠️ Testes que NÃO puderam ser executados neste ambiente (com o motivo)

Sou explícito sobre o que **não** foi possível validar aqui, conforme solicitado:

1. **Envio REAL de e-mail por SMTP** — o sandbox **não tem egress SMTP** (tentativa de
   criar conta de teste Ethereal expirou; `curl` a provedores SMTP retorna conexão
   recusada). O código usa `nodemailer.sendMail` padrão e registra SUCCESS apenas quando
   o servidor aceita a mensagem. **Como validar:** configure SMTP real no `.env` e use o
   botão "Enviar e-mail de teste" no painel admin, ou `POST /api/admin/email-test`.
2. **Tutor de IA com resposta real** — requer chave (Gemini/OpenAI) e egress à API do
   provedor, indisponíveis no sandbox. A separação de áreas e o estado "não configurado"
   **foram** testados (teste 9). **Como validar:** defina `AI_PROVIDER` + chave e pergunte
   algo na aba "Tutor de IA".
3. **Renderização visual da UI em navegador** — o Chromium do sandbox falha ao iniciar
   (crashpad/socket) e processos de servidor não persistem entre chamadas isoladas, então
   não foi possível capturar screenshots navegando pela SPA. A SPA foi validada por:
   sintaxe do bundle, serving HTTP real de todos os assets, e cobertura total da API que
   ela consome (13 testes). **Como validar:** rode `cd server && npm start` e abra
   `http://localhost:4000`.
4. **Compilação e instalação do `.exe` no Windows** — o sandbox é Linux e não compila/
   executa binários Windows. O empacotamento é feito pela CI em `windows-latest`
   (`.github/workflows/desktop-build.yml`). **Como validar:** push + tag `v1.0.0` → baixar
   o instalador da Release e instalar no Windows (ver `docs/OPERACAO.md`).
5. **Geração de vídeo por IA (gratuita via Hugging Face)** — **implementada**. O caminho
   "não configurado" (sem `HF_TOKEN`) é testado automaticamente (teste 11). O envio real
   ao Hugging Face **não** pôde rodar no sandbox (sem egress de rede ao provedor). **Como
   validar:** defina `HF_TOKEN` (grátis) e clique em "Gerar vídeo IA" na aba "Vídeos IA"
   do painel admin. Ver `docs/OPERACAO.md §7`.

## Observação sobre persistência e preservação

O seed é **idempotente** (só insere o que falta; nunca sobrescreve usuários, mensagens,
notas ou certificados existentes). Dados sensíveis (banco, uploads) são git-ignored.
