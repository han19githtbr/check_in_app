# Next Pass.in

Aplicacao em Next.js para gestao de eventos com dois perfis de acesso via Google, controle de inscricoes, check-in, entrega de kit de boas-vindas, reclamacoes de participantes e confirmacao por e-mail a cada inscricao.

## O que foi implementado

### 1. Autenticacao com Google

- Login com conta Google/Gmail para dois perfis:
  - `admin`
  - `participant`
- Fluxo de autenticacao feito com OAuth 2.0 do Google.
- Restricao para uso de contas `@gmail.com`.
- Sessao persistida em cookie HTTP-only.
- Administradores sao definidos por lista de e-mails na variavel `ADMIN_EMAILS`.

### 2. Acesso de administrador

O painel administrativo fica em `/admin` e permite:

- Criar novos eventos.
- Visualizar metricas gerais da plataforma.
- Abrir o painel detalhado de cada evento.
- Cadastrar participantes em eventos.
- Fazer check-in de participantes.
- Marcar ou remover a entrega do kit de boas-vindas.
- Visualizar reclamacoes enviadas pelos usuarios.
- Resolver ou reabrir reclamacoes.

### 3. Acesso do participante

A area do participante fica em `/my-area` e permite:

- Ver o proprio nome e a conta Gmail autenticada.
- Consultar todas as inscricoes vinculadas ao seu e-mail/usuario.
- Saber em qual evento esta inscrito.
- Ver status de check-in.
- Ver status do kit de boas-vindas.
- Abrir reclamacoes por inscricao na secao `Reclame`.
- Consultar historico das reclamacoes enviadas.

### 4. Controle de kit de boas-vindas

Cada inscricao agora possui:

- `welcomeKitDeliveredAt`
- `welcomeKitStatus`

Com isso, o administrador consegue:

- verificar quem recebeu kit
- identificar kits pendentes
- atualizar a entrega diretamente pelo painel

### 5. Reclamacoes dos participantes

Foi criada uma estrutura de reclamacoes vinculada ao usuario autenticado e, opcionalmente, a uma inscricao/evento.

Cada reclamacao armazena:

- usuario
- inscricao
- evento
- mensagem
- status (`open` ou `resolved`)
- data de criacao
- data de resolucao

As reclamacoes aparecem automaticamente no painel administrativo.

### 6. E-mail de confirmacao por inscricao

Sempre que uma inscricao e criada:

- o sistema registra a inscricao na base local
- tenta enviar um e-mail de confirmacao
- grava o resultado no log de e-mails

O envio foi preparado usando a API HTTP da Resend, sem depender de bibliotecas externas.

Se as variaveis de e-mail nao estiverem configuradas, a inscricao continua funcionando, e o sistema registra o envio como `skipped` em `emailLogs`.

### 7. Novo visual

A interface recebeu uma revisao visual para ficar mais moderna:

- fundo mais escuro
- gradientes e brilhos suaves
- cards com glassmorphism leve
- contraste melhorado
- cabecalho com estado de sessao
- responsividade para desktop e mobile

## Estrutura das principais funcionalidades

### Rotas de pagina

- `/` landing page com escolha de perfil e visao geral
- `/admin` painel administrativo
- `/my-area` portal do participante
- `/events/[id]` painel administrativo de um evento
- `/attendees/[attendeeId]/badge` cracha do participante para check-in

### Rotas de API

- `GET /api/session`
- `GET /api/auth/google?role=admin`
- `GET /api/auth/google?role=participant`
- `GET /api/auth/google/callback`
- `POST /api/auth/logout`
- `GET /api/admin`
- `GET /api/portal`
- `POST /api/events`
- `GET /api/events`
- `GET /api/events/[id]`
- `POST /api/events/[id]/attendees`
- `POST /api/attendees/[attendeeId]/check-in`
- `PATCH /api/attendees/[attendeeId]/welcome-kit`
- `POST /api/complaints`
- `PATCH /api/complaints/[complaintId]`

## Persistencia

Os dados agora sao persistidos em PostgreSQL, com foco em deploy na Vercel.

O projeto foi preparado para usar:

- `POSTGRES_URL` injetada pela Vercel Marketplace
- ou `DATABASE_URL` como fallback para desenvolvimento local

As tabelas criadas automaticamente pela aplicacao sao:

- `events`
- `users`
- `sessions`
- `attendees`
- `check_ins`
- `complaints`
- `email_logs`

O modelo cobre:

- `users`
- `sessions`
- `attendees.userId`
- `attendees.welcomeKitDeliveredAt`
- `complaints`
- `emailLogs`

## Variaveis de ambiente

Crie um arquivo `.env.local` baseado em `.env.example`.

```env
POSTGRES_URL=
DATABASE_URL=

NEXT_PUBLIC_APP_URL=http://localhost:3000

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
ADMIN_EMAILS=admin@gmail.com

RESEND_API_KEY=
EMAIL_FROM=Pass.in <onboarding@seudominio.com>
```

### Descricao das variaveis

- `POSTGRES_URL`
  - Variavel principal usada pela aplicacao para conectar ao Postgres na Vercel.
- `DATABASE_URL`
  - Fallback compativel para desenvolvimento local ou outros provedores Postgres.
- `NEXT_PUBLIC_APP_URL`
  - URL base da aplicacao. Necessaria para montar o callback do Google.
- `GOOGLE_CLIENT_ID`
  - Client ID do app criado no Google Cloud.
- `GOOGLE_CLIENT_SECRET`
  - Client Secret do app criado no Google Cloud.
- `ADMIN_EMAILS`
  - Lista de e-mails Gmail autorizados como administrador, separados por virgula.
- `RESEND_API_KEY`
  - Chave da API da Resend para envio de e-mails.
- `EMAIL_FROM`
  - Remetente usado nos e-mails de confirmacao.

## Como configurar o Postgres na Vercel

### 1. Criar o banco no projeto Vercel

No dashboard da Vercel:

1. Abra o projeto.
2. Entre em `Storage`.
3. Crie um banco Postgres pelo Marketplace.
4. Conecte o banco ao projeto.

Depois disso, a Vercel normalmente injeta automaticamente variaveis como:

- `POSTGRES_URL`
- `POSTGRES_HOST`
- `POSTGRES_DATABASE`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

Para esta aplicacao, a principal e:

```env
POSTGRES_URL=...
```

### 2. Configurar o ambiente local

Para desenvolver localmente, voce pode:

1. usar a mesma `POSTGRES_URL` do banco conectado na Vercel
2. ou usar uma `DATABASE_URL` de outro Postgres compativel

Exemplo:

```env
POSTGRES_URL=postgres://user:password@host:5432/database
```

### 3. Popular o banco

Depois de configurar a conexao:

```bash
npm run seed
```

Se voce quiser importar os dados antigos do JSON:

```bash
npm run migrate:json
```

## Como configurar o login Google

### 1. Criar credenciais no Google Cloud

No Google Cloud Console:

1. Crie ou selecione um projeto.
2. Configure a tela de consentimento OAuth.
3. Crie um `OAuth Client ID` do tipo `Web application`.
4. Adicione a URL de callback exata:

```txt
http://localhost:3000/api/auth/google/callback
```

Se for publicar, adicione tambem a URL real do ambiente:

```txt
https://seudominio.com/api/auth/google/callback
```

Regras importantes:

- a `redirect_uri` precisa ser exatamente igual a uma URI autorizada
- em desenvolvimento, `http://localhost` e aceito
- em producao, use `https`

### 1.1 Configurar a tela de consentimento OAuth

No menu do Google Cloud, abra `Google Auth Platform`.

Se for a primeira configuracao do projeto:

1. Clique em `Get started`.
2. Em `App information`, informe o nome da aplicacao.
3. Em `User support email`, escolha um e-mail que voce monitora.
4. Avance para a configuracao de audiencia.
5. Escolha o tipo de audiencia:
   - use `External` se pessoas fora da sua organizacao poderao entrar
   - use `Internal` se isso for um projeto apenas da sua organizacao Google Workspace
6. Se estiver usando `External`, mantenha o app em modo de teste no inicio.
7. Adicione os `Test users` que poderao autenticar enquanto o app nao estiver publicado.
8. Revise as informacoes e conclua a configuracao.

Depois disso, revise estas areas dentro de `Google Auth Platform`:

- `Branding`
  - confirme nome da aplicacao, e-mail de suporte e links relevantes
- `Audience`
  - confira se o app esta como `External` ou `Internal`
  - se estiver em teste, garanta que os Gmail usados nos testes estejam em `Test users`
- `Data Access`
  - para este projeto, o fluxo usa apenas dados basicos de login e perfil

Observacoes:

- o Google informa que apps `External` comecam em modo de teste
- usuarios fora da lista de teste nao conseguem autenticar enquanto o app nao for publicado
- se voce passar a pedir escopos sensiveis ou restritos, pode precisar de verificacao adicional

### 1.2 Criar um OAuth Client do tipo Web application

Com a tela de consentimento configurada:

1. Ainda em `Google Auth Platform`, abra `Clients`.
2. Clique em `Create client`.
3. Em tipo de aplicacao, escolha `Web application`.
4. Defina um nome para o client, por exemplo `Next Passin Local`.
5. Em `Authorized redirect URIs`, adicione:

```txt
http://localhost:3000/api/auth/google/callback
```

Se for publicar, adicione tambem a URI do ambiente real:

```txt
https://seudominio.com/api/auth/google/callback
```

Se sua configuracao no Google mostrar o campo `Authorized JavaScript origins`, voce pode adicionar:

```txt
http://localhost:3000
https://seudominio.com
```

Depois:

1. Clique em `Create`.
2. Copie o `Client ID`.
3. Copie o `Client Secret`.
4. Preencha no `.env.local`:

```env
GOOGLE_CLIENT_ID=seu_client_id
GOOGLE_CLIENT_SECRET=seu_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAILS=admin@gmail.com
```

Importante:

- o `Client Secret` normalmente e exibido no momento da criacao, entao guarde com cuidado
- se aparecer erro de `redirect_uri_mismatch`, quase sempre a URI cadastrada no Google nao bate exatamente com a usada pelo app

### 2. Preencher o `.env.local`

Copie `.env.example` para `.env.local` e informe os valores.

### 3. Definir administradores

Exemplo:

```env
ADMIN_EMAILS=empresa.admin@gmail.com,outro.admin@gmail.com
```

Somente esses e-mails conseguirao entrar no fluxo de administrador.

## Como configurar o envio de e-mail

### Com Resend

1. Crie uma conta na Resend.
2. Adicione e verifique um dominio ou subdominio de envio.
3. Gere a API Key.
4. Configure um remetente valido.
5. Preencha no `.env.local`:

```env
RESEND_API_KEY=...
EMAIL_FROM=Pass.in <onboarding@seudominio.com>
```

Se o e-mail nao estiver configurado:

- a inscricao continua funcionando
- o sistema registra o status do envio em `emailLogs`

Boas praticas:

- prefira um subdominio como `mail.seudominio.com` ou `updates.seudominio.com`
- depois que o dominio for verificado, voce pode enviar com qualquer endereco desse dominio

### 1.1 Passo a passo da configuracao na Resend

Depois de criar sua conta:

1. Entre no dashboard da Resend.
2. Abra a area de `Domains`.
3. Clique em `Add domain`.
4. Informe o dominio ou subdominio que sera usado no envio.
   - exemplo recomendado: `mail.seudominio.com`
5. A Resend vai mostrar os registros DNS necessarios.
6. No provedor do seu dominio, crie exatamente os registros pedidos pela Resend.
   - normalmente incluem registros de verificacao e autenticacao como SPF e DKIM
7. Volte para a Resend e clique para verificar o dominio.
8. Aguarde o status mudar para verificado.

Depois que o dominio estiver verificado:

1. Abra `API Keys`.
2. Clique em `Create API Key`.
3. Dê um nome para a chave, por exemplo `next-passin-local`.
4. Escolha permissao:
   - `Sending access` costuma ser suficiente para este projeto
   - `Full access` so se voce realmente precisar
5. Se escolher `Sending access`, restrinja ao dominio configurado.
6. Crie a chave e copie o valor imediatamente.

Em seguida, escolha o remetente que sera usado:

```env
EMAIL_FROM=Pass.in <onboarding@mail.seudominio.com>
RESEND_API_KEY=re_xxxxxxxxx
```

Regras praticas:

- o endereco em `EMAIL_FROM` precisa pertencer ao dominio ou subdominio verificado
- se o dominio ainda nao estiver verificado, o envio real nao vai funcionar
- se a chave da API nao estiver configurada, o projeto continua cadastrando inscricoes e registra o envio como `skipped`

## Como rodar o projeto

```bash
npm install
npm run seed
npm run dev
```

A aplicacao ficara disponivel em:

```txt
http://localhost:3000
```

## Seed inicial

Foi adicionado um seed local para facilitar testes:

```bash
npm run seed
```

Esse comando popula o Postgres configurado em `POSTGRES_URL` ou `DATABASE_URL` com:

- 1 administrador: `admin@gmail.com`
- 1 participante: `participante@gmail.com`
- 1 evento de exemplo
- 1 inscricao de exemplo
- 1 reclamacao aberta sobre kit
- 1 log de e-mail de exemplo

Observacoes:

- o seed nao cria sessao ativa
- o login real continua dependendo da configuracao do Google OAuth

## Migrar o conteudo antigo de `data/db.json`

Se voce ainda tiver dados no JSON antigo e quiser importar para o Postgres:

```bash
npm run migrate:json
```

Esse comando:

- le `data/db.json`
- recria o conteudo das tabelas no Postgres
- preserva eventos, usuarios, sessoes, inscricoes, check-ins, reclamacoes e logs

Observacao:

- a migracao substitui os dados atuais das tabelas

## Como validar os fluxos

### Administrador

1. Entrar pela home com `Entrar com Gmail` no card de administrador.
2. Ir para `/admin`.
3. Criar um evento.
4. Abrir o evento.
5. Cadastrar um participante.
6. Abrir o cracha.
7. Fazer check-in.
8. Marcar a entrega do kit.
9. Acompanhar reclamacoes no painel.

### Participante

1. Entrar pela home com `Acessar minha area`.
2. Ir para `/my-area`.
3. Conferir se a inscricao aparece.
4. Ver o status do kit.
5. Abrir a secao `Reclame`.
6. Enviar uma mensagem como `Nao recebi meu kit de boas-vindas`.
7. Confirmar que a reclamacao aparece para o administrador.

## Arquivos principais alterados

- `src/lib/auth.ts`
- `src/lib/db.ts`
- `src/lib/services/events.ts`
- `src/lib/services/attendees.ts`
- `src/lib/services/portal.ts`
- `src/lib/services/email.ts`
- `src/app/page.tsx`
- `src/app/admin/page.tsx`
- `src/app/my-area/page.tsx`
- `src/app/events/[id]/page.tsx`
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/types/domain.ts`
- `scripts/seed.mjs`
- `scripts/migrate-json-to-postgres.mjs`
- `.env.example`

## Observacoes importantes

- O login de administrador depende da variavel `ADMIN_EMAILS`.
- O envio real de e-mails depende da configuracao da Resend.
- Sem variaveis de ambiente do Google, o login nao funciona.
- Em deploy na Vercel, a persistencia deve usar Postgres; `data/db.json` nao e mais a base principal.

## Validacao realizada

Build de producao executado com sucesso:

```bash
npm run build
```
