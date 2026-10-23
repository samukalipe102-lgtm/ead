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

### Como ativar (grátis)
1. Crie uma conta em **huggingface.co**.
2. Em *Settings → Access Tokens*, gere um token com a permissão **"Inference Providers"**.
3. No servidor, defina as variáveis:
   ```
   HF_TOKEN=hf_xxxxxxxxxxxxxxxxxxxx
   HF_VIDEO_PROVIDER=fal-ai           # opcional (default)
   HF_VIDEO_MODEL=Wan-AI/Wan2.2-TI2V-5B  # opcional (default)
   ```
4. Reinicie o backend. No painel admin, aba **"🎬 Vídeos IA"**, clique em
   *"Gerar vídeo IA"* na aula desejada.

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
