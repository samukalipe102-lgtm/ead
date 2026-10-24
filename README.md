# Formação Sacerdotal de Umbanda — Plataforma EAD

Plataforma EAD de Formação Sacerdotal de Umbanda, evoluída de um protótipo HTML (frontend-only, com dados simulados no `localStorage`) para uma arquitetura real com **backend, banco de dados e aplicativo desktop Windows**.

A plataforma é acessível de duas formas, **compartilhando o mesmo backend e banco de dados**:

1. **Site web** (navegador) — servido pelo backend.
2. **Aplicativo desktop Windows** (`.exe`, Electron) — abre a plataforma em janela própria.

---

## Estrutura do projeto (monorepo)

```
.
├── server/        # Backend Node.js + Express + SQLite (API REST, auth, e-mail, uploads)
├── web/           # Frontend web (SPA React servida pelo backend)
├── desktop/       # App Electron (empacota o .exe do Windows)
├── .github/workflows/  # CI: compila o instalador .exe no runner Windows
└── docs/          # Documentação (diagnóstico, operação, testes)
```

## Preservação do projeto original

- **Todo o conteúdo dos 6 cursos** (módulos, aulas, textos, transcrições, atividades, quizzes) foi preservado e migrado para o seed do banco (`server/src/db/seed.js`).
- **Identidade visual** (paleta verde / dourado / marfim, tipografia, layout) preservada no frontend.
- **Regras de carga horária**: Formação Sacerdotal = 300h; cursos complementares = 100h (configuráveis pelo admin).
- **Dois perfis**: `ADMIN` e `STUDENT`.

## O que mudou em relação ao protótipo (resumo)

| Antes (protótipo HTML)                      | Agora (plataforma real)                                   |
|---------------------------------------------|-----------------------------------------------------------|
| Dados no `localStorage` do navegador        | Banco de dados real (SQLite → PostgreSQL)                 |
| Sem sincronização web/desktop               | Mesmo backend e banco para web e desktop                  |
| Controle de acesso só visual                | Permissões validadas no servidor (JWT + verificação)     |
| Senhas em texto puro (`password: '123'`)    | Hash com bcrypt, nunca trafegadas em texto                |
| "E-mail enviado" sempre `SUCCESS` (falso)   | Envio real por SMTP; sem credencial → reporta indisponível|
| Mensagens misturadas com "tutor"            | Área de mensagens própria + Tutor IA em área separada     |
| Vídeos de amostra / `null`                  | Estados reais: disponível / processando / indisponível    |
| Geração de vídeo por IA inexistente         | Integração real e **gratuita** via Hugging Face (opcional) |

Consulte **`docs/DIAGNOSTICO.md`** para o diagnóstico completo do protótipo e **`docs/OPERACAO.md`** para instalação, variáveis de ambiente e testes.

Para colocar online: **`docs/DEPLOY-GRATIS.md`** (100% grátis, sem cartão — Modo A: seu PC; Modo B: Back4app + backup em Git) ou **`docs/DEPLOY.md`** (opções pagas ~US$2–5/mês com URL permanente).
