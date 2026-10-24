# Operação: instalação, variáveis de ambiente, build do .exe e testes

## 1. Rodar a plataforma (backend + site web) localmente

Pré-requisitos: **Node.js 22+**.

```bash
# Backend (serve também o site web em http://localhost:4000)
cd server
cp .env.example .env            # edite e defina ao menos JWT_SECRET
npm install
npm run seed                    # cria o banco com os 6 cursos (idempotente)
npm start
```

Acesse `http://localhost:4000`. Contas-semente (troque as senhas após o 1º acesso):
- Admin: `admin@umbanda.org` / `123`
- Aluno: `aluno@umbanda.org` / `123`

Após alterar o frontend (arquivos em `web/src/*.jsx`), recompile o bundle:
```bash
cd web && npm install && npm run build
```

## 2. Variáveis de ambiente (ficam no SERVIDOR, nunca no .exe)

| Variável | Obrigatória | Função |
|----------|-------------|--------|
| `JWT_SECRET` | Sim (produção) | Assina os tokens de sessão |
| `PORT` | Não (4000) | Porta do backend |
| `DB_PATH` | Não | Caminho do SQLite (use volume persistente em produção) |
| `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/`SMTP_PASS`/`SMTP_FROM` | Para e-mail real | Credenciais SMTP |
| `SMTP_SECURE` | Não (false) | TLS implícito (porta 465) |
| `AI_PROVIDER` + `GEMINI_API_KEY` **ou** `OPENAI_API_KEY` | Para tutor de IA | Ativa o tutor |
| `CORS_ORIGIN` | Produção | URL do site (restrinja o CORS) |

## 3. Publicar o backend (necessário para o modo EAD)

O app desktop e o site precisam de um backend acessível por HTTPS. Opções: um VPS
com Node + proxy reverso (nginx/Caddy com TLS), ou um PaaS. Passos gerais:
1. Suba `server/` no host, configure as variáveis acima (sobretudo `JWT_SECRET` e SMTP).
2. Garanta HTTPS (certificado válido).
3. Para alta escala/multiusuário, migre o SQLite para **PostgreSQL** (a modelagem em
   `server/src/db/schema.sql` é compatível; troque a camada `db/index.js` por um driver
   `pg`/ORM e reaplique o schema). Faça **backup** antes de qualquer migração.

Anote a URL pública (ex.: `https://ead.suaorg.org`). Ela vai no build do desktop.

## 4. Gerar o instalador Windows `.exe`

> **Importante:** o ambiente do Kiro roda em Linux e **não compila/executa `.exe`
> do Windows**. O `.exe` é gerado de verdade no **GitHub Actions (runner Windows)**
> pelo workflow `.github/workflows/desktop-build.yml`. Nenhum instalador foi
> "inventado" aqui — ele é produzido pela CI.

### Opção A — via GitHub Actions (recomendado, sem precisar de Windows)
1. Faça push do repositório para o GitHub.
2. Crie uma tag de versão:
   ```bash
   git tag v1.0.0 && git push origin v1.0.0
   ```
3. O workflow roda em `windows-latest`, compila e **anexa** `FormacaoSacerdotalUmbanda-Setup.exe`
   (instalador NSIS) e `FormacaoSacerdotalUmbanda-Portatil.exe` à Release.
4. Para apontar a uma URL de produção específica, use o disparo manual
   ("Run workflow") informando `app_url`, ou ajuste o default no workflow.

### Opção B — em uma máquina Windows própria
```bash
cd desktop
set UMBANDA_APP_URL=https://ead.suaorg.org
npm install
node build/make-icon.mjs
npm run dist:win
# Saída em desktop/release/FormacaoSacerdotalUmbanda-Setup.exe
```

## 5. Instalar e testar no Windows
1. Baixe `FormacaoSacerdotalUmbanda-Setup.exe` da Release.
2. Execute; o instalador NSIS permite escolher a pasta e cria atalhos.
3. Abra o app pelo atalho. Ele abre a plataforma em janela própria.
4. Sem internet, o app mostra a **tela de "Sem conexão"** com botão de tentar novamente.

## 6. Como rodar os testes automatizados (reais)

```bash
cd server && node --test     # 13 testes end-to-end contra a API real
```

Esses testes sobem o servidor em memória, usam um banco temporário e exercitam:
login dos dois perfis, controle de acesso no servidor, isolamento de mensagens,
tutor de IA separado, falha honesta de e-mail sem SMTP, fluxo de inscrição/aprovação,
emissão de certificado condicionada à conclusão, verificação pública e progresso.
Ver resultados em `docs/RESULTADOS_TESTES.md`.

## 7. Geração de vídeo por IA — GRATUITA via Hugging Face

A geração de vídeo por IA foi implementada de forma **real e gratuita** usando os
**Hugging Face Inference Providers** (modelos text-to-video de código aberto).
A conta e o token do Hugging Face são **gratuitos e sem cartão de crédito**, com
uma cota mensal de créditos de inferência.

### Por que Hugging Face (e não Veo/Runway/Kling/Sora)
Pesquisa de mercado (out/2026): os fabricantes dos grandes modelos de vídeo
(Google Veo, Runway, Kling, Pika, Luma, xAI, MiniMax) **não oferecem free tier de
API** — seus "grátis" são via interface web, não por API programática. O caminho
gratuito e documentado para **API** é o roteador de Inference Providers do Hugging
Face com modelos abertos (ex.: `Wan-AI/Wan2.2-TI2V-5B`, LTX-Video, HunyuanVideo).

### Fluxo (igual para todos os motores)
No painel admin → aba **"🎬 Gerador de Videoaulas com IA"**:
1. Selecione curso → módulo/aula → título.
2. Escreva o roteiro ou clique em **"Gerar/Revisar roteiro com IA"** (deriva do
   conteúdo real da aula; usa IA de texto se configurada).
3. Escolha o motor (ou deixe "Automático") e clique em **"Gerar videoaula"**.
4. A tarefa entra na **fila** (estados reais: na fila → processando → concluído/falha).
   O processamento roda em um **worker no backend**, fora da requisição HTTP.
5. Veja a **prévia** do vídeo concluído e clique em **"Publicar na aula"** (etapa
   separada). Em falha, use **"Tentar novamente"**; **"Cancelar"** interrompe a fila.

### Motores — configure UM; o servidor detecta sozinho
Seleção automática (ou force com `VIDEO_AI_PROVIDER`):

**(A) Hugging Face — grátis, sem cartão:**
- Conta em **huggingface.co** → token com permissão **"Inference Providers"** → `HF_TOKEN=hf_...`.

**(B) Replicate — pago (~US$0,05/vídeo), tem créditos free/trial:**
- `REPLICATE_API_TOKEN=r8_...` (opcional: `REPLICATE_VIDEO_MODEL`).

**(C) Endpoint próprio/outro provedor:**
- `VIDEO_AI_URL=...` + `VIDEO_AI_KEY=...` (+ `VIDEO_AI_MODEL`). Resposta: bytes de vídeo ou JSON `{ url }`.

**(D) Produção automatizada ("assembled") — grátis, sem provedor de vídeo:**
- Gera um **MP4 real** a partir de roteiro → narração (TTS) → slides → montagem com **ffmpeg**.
- Requisitos no servidor: `ffmpeg` (ex.: `apt install ffmpeg`) e, para a voz,
  `OPENAI_API_KEY` **ou** `espeak-ng`/`pico2wave` (ex.: `apt install espeak-ng`).
- É o fallback automático quando não há chave de provedor de vídeo, desde que o ffmpeg exista.

### Custos reais (preços oficiais, out/2026)
- **Hugging Face:** gratuito (cota mensal de inferência, sem cartão).
- **Produção automatizada (D):** gratuita (ffmpeg + espeak-ng); ou centavos se usar OpenAI TTS.
- **Replicate (Wan 2.2):** ~**US$ 0,05 por vídeo** (fonte: blog oficial Replicate).
- **HeyGen (avatar narrado, Alternativa B):** pay-as-you-go, ~US$ 0,05/seg (~US$ 3/min);
  plano grátis dá 3 vídeos/mês. (Fonte: HeyGen pricing/docs.) *Valores reformulados p/ conformidade.*

### Comportamento honesto
- A chave fica **apenas no servidor** (nunca no frontend/executável).
- Estados reais na aula: `PROCESSING` → `DONE` (com o arquivo salvo e associado) ou
  `FAILED`. Cold start do modelo retorna `MODEL_LOADING` (tente de novo em ~1 min).
- Sem `HF_TOKEN`, a geração reporta **"não configurado"** — **nenhum vídeo, link ou
  progresso é fabricado**.
- O vídeo gerado é salvo em `server/data/uploads/ai-videos/` e servido em
  `/uploads/ai-videos/<arquivo>.mp4`. (Em produção, aponte os uploads para um volume
  persistente ou storage externo via `UPLOADS_DIR`.)
- **Conteúdo religioso:** o vídeo gerado é ilustrativo/didático a partir do título da
  aula. A IA não cria fundamento religioso, fonte ou certificado.

> Observação de teste: o envio ao Hugging Face não pôde ser executado no sandbox do
> Kiro (sem egress de rede ao provedor). O caminho "não configurado" está coberto por
> teste automatizado. Para validar a geração real, configure `HF_TOKEN` e use o botão
> no painel admin.
