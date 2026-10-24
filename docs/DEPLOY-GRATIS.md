# Colocar a plataforma EAD de Umbanda online — 100% GRÁTIS, SEM CARTÃO

Este guia usa **apenas recursos gratuitos e sem cartão de crédito**. Nenhuma etapa
contrata serviço pago. Antes de qualquer decisão com custo, você é avisado.

> **A verdade, sem enrolação:** não existe hoje uma hospedagem **grátis + sem cartão +
> permanente + com worker 24/7 + disco persistente** tudo junto. Esse combo só vem em
> plano pago. Então adotamos uma **arquitetura híbrida gratuita**: cada parte usa um
> recurso grátis adequado, e deixamos claras as limitações.

---

## Opções gratuitas analisadas (out/2026)

| Recurso grátis | Serve para | Limites reais | Cartão? |
|---|---|---|---|
| **Seu próprio PC + Docker** | backend + worker + ffmpeg + banco + vídeos | só no ar enquanto o PC estiver ligado | ❌ não |
| **Back4app Containers (free)** | backend + worker + ffmpeg (nosso Docker) | **URL expira a cada 60 min**; disco **efêmero** | ❌ não |
| **Neon (Postgres free)** | banco persistente | 0,5–1 GB; sem cartão | ❌ não |
| **Repositório Git de backup** | persistir banco + vídeos em disco efêmero | volumes pequenos (poucos vídeos) | ❌ não |
| Render free / HF Spaces | — | Render **dorme** (mata o worker); HF Docker virou **pago** | — |

**Conclusão honesta:** para **testar de graça agora**, o caminho mais simples e
sólido é o **Modo A (seu PC)**. Para ter uma **URL pública grátis**, use o **Modo B
(Back4app)** aceitando que a URL expira em 60 min e que a persistência vem do
**backup em repositório Git** (já implementado, opcional).

---

## MODO A — No seu computador (grátis, permanente enquanto ligado) ⭐ recomendado p/ testar

Pré-requisito: Docker instalado (Docker Desktop no Windows). Nada de cartão.

```bash
git clone https://github.com/samukalipe102-lgtm/ead.git
cd ead
cp server/.env.example .env           # abra o .env e defina JWT_SECRET (um texto longo aleatório)
docker compose up -d --build          # sobe site + API + worker; volume "umbanda-data" persiste tudo
```
Acesse **http://localhost:4000**. O banco e os vídeos ficam no volume `umbanda-data`
(persistem mesmo reiniciando o container). O motor de vídeo gratuito já funciona
(ffmpeg + narração embutidos). Para acesso de outros dispositivos na sua rede, use o
IP local do PC (ex.: `http://192.168.0.10:4000`).

Vantagens: grátis, persistente, sem limite de terceiros, sem cartão.
Limitação: só acessível enquanto seu PC estiver ligado e na mesma rede (ou com um
túnel grátis como o `cloudflared`/`ngrok` para expor uma URL temporária).

---

## MODO B — Back4app Containers (URL pública grátis, sem cartão)

Dá uma **URL pública HTTPS** sem cartão, mas no plano free a **URL expira a cada 60
minutos** (basta reiniciar) e o disco é **efêmero**. Por isso ativamos o **backup em
Git** para não perder banco/vídeos entre reinícios.

### B.1 — Preparar a persistência grátis (backup em repositório Git)
1. Crie um repositório **privado** vazio no GitHub, ex.: `umbanda-backup`.
2. Gere um **Personal Access Token (PAT)** com escopo só desse repositório
   (GitHub → Settings → Developer settings → Fine-grained token → acesso a `umbanda-backup`, permissão Contents: Read/Write).
3. Guarde o token — ele vai **nas variáveis de ambiente do Back4app**, nunca no código.

### B.2 — Publicar no Back4app
1. Crie conta grátis em **back4app.com** (sem cartão) → *Containers* → *Deploy from GitHub*.
2. Selecione o repositório `samukalipe102-lgtm/ead` e aponte o Dockerfile para `server/Dockerfile`.
3. Em *Environment Variables*, defina (valores de exemplo; use os seus):
   ```
   JWT_SECRET=<texto-longo-aleatorio>
   DB_PATH=/app/server/data/umbanda.db
   UPLOADS_DIR=/app/server/data/uploads
   BACKUP_GIT_REPO=github.com/SEU_USUARIO/umbanda-backup.git
   BACKUP_GIT_TOKEN=<seu PAT fine-grained>
   BACKUP_GIT_BRANCH=main
   ```
4. Faça o deploy. O container inicia, **restaura** o último backup (se houver) e passa a
   salvar banco + vídeos no repo de backup a cada 5 min e no encerramento.
5. Copie a **URL pública** gerada (ex.: `https://SEU-APP.back4app.io`).

> Limites honestos do Back4app free: URL expira em ~60 min (reinicie quando precisar),
> sem disco persistente (por isso o backup em Git), e recursos de CPU/RAM limitados —
> suficiente para testar a geração de vídeos curtos.

---

## Conectar o aplicativo Windows (.exe) à URL pública

Com a URL em mãos (Modo A com túnel, ou Modo B):
- No GitHub do projeto: Settings → Secrets and variables → Actions → **Variables** →
  `APP_URL = https://SUA-URL-PUBLICA`
- Gere o novo instalador:
  ```bash
  git tag v1.4.0 && git push origin v1.4.0
  ```
  O workflow anexa o `FormacaoSacerdotalUmbanda-Setup.exe` já apontando para sua URL.

Nenhum segredo entra no `.exe`: ele só guarda a URL pública (que não é secreta).

---

## Testar sem perder o projeto atual

O deploy **não altera** nada no repositório principal nem apaga dados. O seed é
idempotente (nunca sobrescreve usuários/cursos/notas/certificados). Para testar:
1. Acesse a URL (ou localhost) → `GET /api/health` deve mostrar `database:true`, `aiVideo:true`.
2. Login admin (`admin@umbanda.org` / `123`) → **troque a senha**.
3. Painel → 🎬 Gerador de Videoaulas → gere, veja a prévia, **publique**.
4. Entre como aluno → assista à aula publicada.
5. (Modo B) Reinicie o container → o backup em Git restaura banco + vídeo; a aula
   continua lá.

---

## Resumo: o que você pode fazer de graça AGORA
- **Testar tudo localmente (Modo A)** com `docker compose up` — grátis, persistente, sem cartão.
- **Ter URL pública grátis (Modo B)** no Back4app com backup em Git — aceitando que a URL
  expira em 60 min no plano free.
- **Gerar videoaulas reais** (motor gratuito) nos dois modos.
- **Gerar o .exe** conectado à sua URL.

## O que NÃO é possível de graça sem cartão (seja realista)
- URL pública **permanente, 24/7, com disco persistente garantido** — isso exige plano
  pago (Fly.io/Railway/VPS, ~US$2–5/mês). Fica como opção futura, se você quiser.
- Armazenamento **ilimitado** de vídeos — o backup em Git serve a volumes pequenos.
