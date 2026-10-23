# Diagnóstico do protótipo original e correções aplicadas

## Resumo

O arquivo entregue (`umbanda-sacerdotal-ead-platform.html`) era um **protótipo
100% frontend**: um único HTML com React via CDN e Babel no navegador, cujo
"banco de dados" era o `localStorage`. **Não havia backend, banco de dados,
servidor, envio de e-mail, player conectado a conteúdo real nem tutor de IA.**

Por isso, os "bugs" descritos no pedido não podiam ser corrigidos no protótipo —
eles eram consequência direta da ausência de uma arquitetura real. A solução foi
**construir a plataforma real preservando 100% do conteúdo e da identidade visual**.

---

## Problemas encontrados (evidências no código original)

| # | Problema | Evidência no protótipo | Causa raiz |
|---|----------|------------------------|------------|
| 1 | Dados não sincronizam entre usuários/dispositivos | `localStorage.setItem(DB_KEY, ...)` | Não havia banco de dados; cada navegador tinha sua cópia isolada |
| 2 | Controle de acesso apenas visual | Papel definido em `useState` no cliente | Sem validação no servidor; editar o HTML dava acesso admin |
| 3 | Senhas em texto puro | `password: '123'` nos dados-semente | Sem hash; inseguro |
| 4 | "E-mail enviado" sempre falso | `handleTestEmailDispatch` só grava `status: 'SUCCESS'` no localStorage | Nenhuma chamada SMTP/API real |
| 5 | Vídeos de amostra / `null` | `videoUrl` apontando para Big Buck Bunny ou `null` | Sem armazenamento/estado real de vídeo |
| 6 | Geração de vídeo por IA | **Inexistente** no código | Recurso não implementado |
| 7 | Tutor de IA vs. Mensagens | O protótipo tinha apenas um "fórum por aula"; não havia tutor de IA separado | Ausência de áreas distintas |
| 8 | Inscrição sem fluxo real | Aprovação mexia só no array em memória do navegador | Sem persistência nem notificação real |

> Observação sobre o bug 3.1 do pedido ("mensagens abrem o tutor de IA"): esse
> comportamento **não existia no HTML entregue** (não há tutor de IA nele). Ainda
> assim, a nova plataforma implementa as **duas áreas totalmente separadas**, com
> endpoints, telas e dados distintos, resolvendo definitivamente a confusão.

---

## Correções implementadas (na plataforma real)

1. **Banco de dados real** (`server/src/db`, SQLite via `node:sqlite`, migrável a PostgreSQL).
   Web e desktop compartilham o mesmo backend/banco → dados sincronizados (requisito 7).
2. **Autenticação e autorização no servidor** (`server/src/auth.js`): JWT + `bcrypt`.
   Papel `ADMIN`/`STUDENT` vem do token verificado no servidor; aluno não vira admin
   editando o cliente. Testado: aluno em rota admin → 403; aluno sem acesso ao curso → 403.
3. **Senhas com hash** (`bcrypt`), nunca trafegadas/armazenadas em texto. Senha temporária
   de aprovação é descartada e nunca enviada por e-mail.
4. **E-mail real por SMTP** (`server/src/mailer.js`, Nodemailer). Sucesso só é registrado
   quando o servidor SMTP aceita a mensagem. Sem credenciais, reporta `SMTP_NOT_CONFIGURED`
   (nunca "enviado" falso). Há teste de envio e verificação de conexão no painel.
5. **Estados reais de vídeo** (`video_status`: `AVAILABLE | PROCESSING | UNAVAILABLE | ERROR`),
   refletidos na UI com rótulos honestos. Player só aparece quando há vídeo disponível.
6. **Tutor de IA em área própria** (`server/src/ai.js`, `/api/ai-tutor`), separada de
   `/api/messages`. Integração real e opcional (Gemini/OpenAI). Sem chave → responde
   "indisponível" de forma honesta, sem fabricar resposta.
7. **Área real de mensagens** (`/api/messages`): threads persistentes por aluno, admin
   responde, permissões impedem um aluno de ver conversa de outro (testado: 403).
8. **Fluxo de inscrição real**: solicitar → admin aprovar/rejeitar → criação de usuário e
   concessão de acesso em transação; notificação por e-mail com resultado honesto.
9. **App desktop Electron** (`desktop/`) apontando para o backend de produção, com tela de
   offline, ícone profissional e empacotamento `.exe` (NSIS + portátil) via GitHub Actions.

## Pendências que dependem de você (fora do executável)

Ver `docs/OPERACAO.md` seção "Serviços e credenciais". Em resumo:
- **Hospedagem do backend** (URL pública HTTPS) — necessária para o modo EAD.
- **Credenciais SMTP** — para e-mail real.
- **Chave de IA (Gemini ou OpenAI)** — opcional, para o tutor de IA.
- **Geração de vídeo por IA**: não foi implementada uma integração "fantasma". É preciso
  escolher um provedor real e compatível (e assinatura/chave) antes de ativar. Ver OPERACAO.
