# Colocar a plataforma EAD de Umbanda em produção

Este guia leva a plataforma ao ar de verdade. O backend (site + API + worker de
vídeo + ffmpeg + banco + armazenamento) roda em um host; o `.exe` e o site usam
esse mesmo backend.

> **Por que você precisa executar esta etapa:** hospedar exige uma **conta de nuvem
> sua** (e, na maioria dos provedores, um cartão no cadastro — mesmo para usar de
> graça/barato). Eu não crio contas no seu nome nem uso cartão sem sua autorização.
> Deixei tudo pronto; os comandos abaixo são o que falta rodar.

---

## 1. Comparação de hospedagem (preços/limites — out/2026)

Precisamos de um host que rode **backend Node + worker assíncrono + ffmpeg + disco
persistente + HTTPS**. Hospedagem estática (GitHub Pages, Netlify) **não serve**.

| Opção | Custo real | Disco persistente | Cartão no cadastro? | Observações |
|---|---|---|---|---|
| **Fly.io** (recomendado) | menor máquina sempre-ligada ~**US$ 2–3/mês**; RAM US$6/GB/mês; volume ~US$0,15/GB/mês | **Sim** (volumes) | Sim (cobra só o uso) | Roda Docker; região de São Paulo (gru); worker fica ativo |
| **Railway** | **Hobby US$ 5/mês** (inclui US$5 de uso); trial único de US$5 | Sim (volumes) | Sim | Simples via GitHub; bom DX |
| **Render** | Web Service pago a partir de ~US$7/mês; **free spin-down** (dorme e perde o worker) | Disco pago | Sim | O plano free dorme → ruim para worker de vídeo |
| **VPS** (Hetzner/Contabo/etc.) | ~US$ 4–6/mês | Sim (disco do VPS) | Sim | Você gerencia o SO; use `docker compose` |

*Valores reformulados para conformidade de licenciamento; confirme na página oficial
de cada provedor antes de contratar. Fontes: páginas de pricing de Fly.io, Railway, Render.*

**Recomendação:** **Fly.io**, menor custo para um backend sempre-ligado com worker e
volume persistente, com região no Brasil. Alternativa igualmente simples: **Railway**.

> **Autorização:** não contrate nada antes de decidir. O custo mínimo realista para
> manter isto no ar é da ordem de **US$ 2 a 5/mês**. A geração de vídeo pelo motor
> gratuito (`assembled`) **não tem custo por vídeo** — só o custo do servidor.

---

## 2. Deploy no Fly.io (passo a passo)

Pré-requisito: instalar o CLI `flyctl` (https://fly.io/docs/flyctl/install/).

```bash
# 1) Autentique-se (abre o navegador; aqui você cria/entra na sua conta Fly)
fly auth login

# 2) Na raiz do repositório (onde está o fly.toml):
#    Escolha um nome único de app e ajuste no fly.toml (campo "app").
#    Crie o app SEM fazer deploy ainda:
fly apps create umbanda-ead-SEUNOME

#    (ajuste o mesmo nome no fly.toml)

# 3) Crie o VOLUME persistente (banco + vídeos). 3 GB é um bom começo:
fly volumes create umbanda_data --region gru --size 3 --app umbanda-ead-SEUNOME

# 4) Defina os SEGREDOS no ambiente da hospedagem (NUNCA no código):
#    JWT forte gerado localmente:
fly secrets set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")" --app umbanda-ead-SEUNOME
#    (opcionais) e-mail real e IA de melhor qualidade:
# fly secrets set SMTP_HOST=... SMTP_USER=... SMTP_PASS=... SMTP_FROM=... --app umbanda-ead-SEUNOME
# fly secrets set OPENAI_API_KEY=...  --app umbanda-ead-SEUNOME     # voz TTS melhor (opcional)
# fly secrets set HF_TOKEN=...        --app umbanda-ead-SEUNOME     # motor HF (opcional)

# 5) Deploy:
fly deploy --app umbanda-ead-SEUNOME

# 6) Descubra a URL pública:
fly info --app umbanda-ead-SEUNOME     # algo como https://umbanda-ead-SEUNOME.fly.dev
```

Depois do 1º deploy, fixe o CORS na própria URL pública e refaça o deploy:
```bash
fly secrets set CORS_ORIGIN="https://umbanda-ead-SEUNOME.fly.dev" --app umbanda-ead-SEUNOME
fly deploy --app umbanda-ead-SEUNOME
```

## 2-ALT. Deploy no Railway
1. railway.com → New Project → Deploy from GitHub → selecione `samukalipe102-lgtm/ead`.
2. Em *Settings*, defina o root/Docker como `server/Dockerfile` (ou use o compose).
3. Adicione um **Volume** montado em `/data`.
4. Em *Variables*, defina `JWT_SECRET`, `DB_PATH=/data/umbanda.db`, `UPLOADS_DIR=/data/uploads`.
5. Deploy. A URL pública aparece em *Settings → Networking → Public Domain*.

## 2-ALT. Deploy em VPS (Docker)
```bash
git clone https://github.com/samukalipe102-lgtm/ead.git && cd ead
cp server/.env.example .env          # defina JWT_SECRET
docker compose up -d --build         # volume "umbanda-data" persiste banco + vídeos
# publique com HTTPS via um proxy (Caddy/nginx) apontando para a porta 4000
```

---

## 3. Conectar o aplicativo Windows (.exe) à produção

Com a URL pública em mãos (ex.: `https://umbanda-ead-SEUNOME.fly.dev`):

Opção simples (sem editar nada no repo) — defina a **variável de repositório** no GitHub:
- Settings → Secrets and variables → Actions → **Variables** → New variable:
  `APP_URL = https://umbanda-ead-SEUNOME.fly.dev`

Depois, gere um novo instalador apontando para produção:
```bash
git tag v1.3.1 && git push origin v1.3.1
```
O workflow **Build Desktop (.exe)** usará `APP_URL` e anexará o novo
`FormacaoSacerdotalUmbanda-Setup.exe` à Release, já conectado ao backend real.
(Também dá para rodar o workflow manualmente informando a URL no campo `app_url`.)

---

## 4. Testes reais obrigatórios (execute após o deploy)

1. Abra a URL pública → a home institucional carrega (HTTPS).
2. `GET /api/health` → deve mostrar `database:true` e `aiVideo:true`.
3. Login admin (`admin@umbanda.org` / `123`) → **troque a senha** em seguida.
4. Painel → **🎬 Gerador de Videoaulas com IA** → selecione curso/módulo/aula →
   gere o roteiro → **Gerar videoaula** → acompanhe o estado → veja a **prévia**.
5. Confirme o MP4 (duração, imagem, narração pt, legendas). **Publique** na aula.
6. Entre como aluno autorizado → a aula publicada reproduz no player.
7. Reinicie a máquina (`fly apps restart` / redeploy) → o vídeo **continua disponível**
   (volume persistente).

## 5. Backup e preservação
- Banco e vídeos ficam no volume `/data`. Faça snapshot do volume periodicamente
  (`fly volumes snapshots list/create`) ou copie `/data` no VPS.
- O seed é idempotente: **nunca** apaga usuários, cursos, notas ou certificados reais.
- Troque as senhas-semente (`123`) no primeiro acesso. Não há segredos no código/`.exe`.

## 6. Custos, limites e pendências (resumo honesto)
- **Servidor:** ~US$ 2–5/mês (Fly.io/Railway/VPS). **Requer cartão e sua autorização.**
- **Geração de vídeo (motor gratuito):** US$ 0 por vídeo.
- **Pendência única para ir ao ar:** você executar o deploy (itens 2) com sua conta.
  Tudo o mais já está implementado, testado e versionado neste repositório.
