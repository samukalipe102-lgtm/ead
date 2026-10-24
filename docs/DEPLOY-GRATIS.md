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

## MODO A — No seu Windows (grátis, persistente, sem cartão) ⭐ comece por aqui

### O que instalar (grátis)
1. **Docker Desktop para Windows** — https://www.docker.com/products/docker-desktop/
   (inclui Docker Compose). Instale, abra e espere ficar "Running". Nada de cartão.
2. **Git para Windows** — https://git-scm.com/download/win (para clonar o projeto).

### Comandos exatos (PowerShell ou Git Bash)
```powershell
git clone https://github.com/samukalipe102-lgtm/ead.git
cd ead

# 1) crie o arquivo .env a partir do exemplo
copy server\.env.example .env           # no Git Bash use: cp server/.env.example .env

# 2) gere um JWT_SECRET forte e cole no .env (linha JWT_SECRET=...)
docker run --rm node:22-slim node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
#   copie o valor impresso e edite o .env: JWT_SECRET=<valor>

# 3) suba a plataforma (site + API + worker + ffmpeg + narração, tudo embutido)
docker compose up -d --build
```

Abra **http://localhost:4000** no navegador. Pronto — está rodando no seu PC, de graça.

### Onde ficam os dados (persistência real)
Banco e vídeos ficam no volume Docker **`umbanda-data`** (montado em `/data`).
Eles **sobrevivem a reinícios** do container e do PC:
```powershell
docker compose restart         # reinicia; dados continuam
docker compose down            # para os serviços; o volume NÃO é apagado
docker compose up -d           # sobe de novo; dados continuam lá
# (só perde os dados se rodar "docker compose down -v", que apaga o volume — não faça isso)
```

### Acessar de outro dispositivo da sua casa
Use o IP local do PC (ex.: `http://192.168.0.10:4000`). Para uma URL pública
temporária e gratuita, use um túnel como `cloudflared` (Cloudflare Tunnel) — opcional.

**Vantagens:** grátis, persistente, sem limites de terceiros, sem cartão, seus dados
não saem do seu PC. **Limitação:** só no ar enquanto o PC estiver ligado.

---

## MODO B — Back4app Containers (URL pública grátis, sem cartão)

Dá uma **URL pública HTTPS** sem cartão, mas no plano free a **URL expira a cada 60
minutos** (basta reiniciar) e o disco é **efêmero**. Por isso ativamos o **backup em
Git** para não perder banco/vídeos entre reinícios.

### B.1 — Preparar a persistência grátis (backup em repositório Git PRIVADO)

> ⚠️ **ATENÇÃO — dados pessoais (LGPD):** o backup inclui o banco com dados de
> alunos. Ele **só pode ir para um repositório PRIVADO**. O sistema **verifica via
> API do GitHub se o repo é privado e RECUSA** o backup caso seja público (ou caso
> não consiga confirmar). Ainda assim, a responsabilidade de manter o repo privado
> é sua. Se tiver qualquer dúvida sobre LGPD, use o **Modo A (seu PC)**, que não
> envia dados para lugar nenhum.

1. Crie um repositório **PRIVADO** vazio no GitHub, ex.: `umbanda-backup`
   (na criação, marque **Private**).
2. Gere um **Personal Access Token fine-grained** com acesso **só** a esse repositório
   (GitHub → Settings → Developer settings → Fine-grained tokens → Repository access:
   somente `umbanda-backup` → Permissions → **Contents: Read and write**).
3. O token vai **nas variáveis de ambiente do Back4app**, nunca no código/`.exe`/chat.

Salvaguardas já implementadas (não precisam de ação sua, mas é bom saber):
- **Opt-in duplo:** só ativa com `BACKUP_GIT_REPO` + `BACKUP_GIT_TOKEN` **e**
  `BACKUP_GIT_CONFIRM_PRIVATE=yes`.
- **Recusa repo público** (checagem via API do GitHub).
- **Limite de tamanho** `BACKUP_MAX_MB` (padrão **200 MB**): acima disso, o backup é
  abortado — não usa o Git como storage ilimitado.
- **Restauração validada:** valida a integridade do `.db` (PRAGMA integrity_check +
  tabelas essenciais) **antes** de usar; e **nunca sobrescreve** um banco já existente.

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
   BACKUP_GIT_CONFIRM_PRIVATE=yes
   BACKUP_MAX_MB=200
   ```
   Sem `BACKUP_GIT_CONFIRM_PRIVATE=yes`, o backup fica inativo de propósito (trava de
   segurança). O limite de 200 MB evita acúmulo ilimitado de vídeos no repositório.
4. Faça o deploy. O container inicia, **restaura** o último backup (se houver) e passa a
   salvar banco + vídeos no repo de backup a cada 5 min e no encerramento.
5. Copie a **URL pública** gerada (ex.: `https://SEU-APP.back4app.io`).

> Limites honestos do Back4app free: URL expira em ~60 min (reinicie quando precisar),
> sem disco persistente (por isso o backup em Git), e recursos de CPU/RAM limitados —
> suficiente para testar a geração de vídeos curtos.

---

## Conectar o aplicativo Windows (.exe) à URL pública

> **Ainda NÃO geramos um novo `.exe`.** O instalador só deve ser recriado **depois**
> que você decidir qual endereço de backend ele vai usar (sua URL do Modo A com túnel,
> ou do Modo B). Gerar antes disso produziria um `.exe` apontando para um endereço
> errado. Quando você tiver a URL, siga abaixo.

Com a URL pública definida:
- No GitHub do projeto: Settings → Secrets and variables → Actions → **Variables** →
  `APP_URL = https://SUA-URL-PUBLICA`
- Gere o novo instalador (escolha a próxima versão, ex.: v1.4.0):
  ```bash
  git tag v1.4.0 && git push origin v1.4.0
  ```
  O workflow anexa o `FormacaoSacerdotalUmbanda-Setup.exe` já apontando para sua URL.

Nenhum segredo entra no `.exe`: ele só guarda a URL pública (que não é secreta).
Enquanto não houver URL, use a plataforma pelo **navegador** em `http://localhost:4000`.

---

## Testar no seu Windows (comandos exatos)

O deploy **não altera** o repositório principal nem apaga dados. O seed é idempotente
(nunca sobrescreve usuários/cursos/notas/certificados). Passo a passo:

```powershell
# (depois de "docker compose up -d --build")

# 1) o backend está saudável? (mostra database:true e aiVideo:true)
curl http://localhost:4000/api/health

# 2) abra http://localhost:4000 no navegador e faça login como admin:
#    e-mail: admin@umbanda.org   senha: 123   -> TROQUE a senha em seguida.

# 3) Painel → aba "🎬 Gerador de Videoaulas com IA":
#    selecione Curso → Módulo/Aula → gere o roteiro → "Gerar videoaula"
#    acompanhe o estado até CONCLUÍDO → veja a PRÉVIA no player.

# 4) clique em "Publicar na aula". Entre como aluno (aluno@umbanda.org / 123)
#    e confirme que a aula publicada reproduz no player.

# 5) TESTE DE PERSISTÊNCIA — reinicie o backend e confirme que o vídeo continua:
docker compose restart
curl http://localhost:4000/api/health
#    recarregue a página: a videoaula publicada deve continuar disponível.
```

### O que já validei por você (fora do seu PC)
Rodei o fluxo real neste ambiente de desenvolvimento (Linux) e comprovei:
- **Vídeo real gerado** pelo motor gratuito `assembled`: MP4 **H.264 + AAC**, com
  **narração pt** (meSpeak), **animação** (zoompan + fades) e **legendas**.
- **Reprodução**: o MP4 é servido e baixado (HTTP 200, bytes conferem).
- **Persistência após reiniciar o backend**: o job segue `COMPLETED/published`, o
  vídeo continua sendo servido e a aula mantém `videoUrl`/`AVAILABLE`.
- **Ciclo de backup→restauração** (para o Modo B): backup num repo Git e restauração
  trouxe o banco **byte a byte idêntico** + vídeo, com integridade validada.

### O que só dá para validar no SEU ambiente
- Rodar **`docker compose`** de fato (o runtime de contêiner deste sandbox está
  quebrado, então não executei o compose aqui — apenas validei o Dockerfile, o
  `npm ci --omit=dev` e os binários ffmpeg/meSpeak, que funcionam).
- A **URL pública** (Modo B/túnel) e o **`.exe` conectado** a ela.

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
