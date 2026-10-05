## Contas com nickname

O cadastro e login atuais usam nickname exclusivo e senha; o campo de email não é obrigatório. Times e inscrições pertencem à conta autenticada e ficam no PostgreSQL do Neon usado pela Vercel. No perfil, a conta aparece pelo nickname.
# Arena FC — abrir no VS Code

Código da versão 14, commit 6542abbe3a06484a98d0423407e5fb01415b7357.

## Primeiro acesso
1. Extraia o ZIP e abra a pasta arena-fc no VS Code.
2. Instale Node.js 22.13 ou superior (Node.js 24 recomendado).
3. No terminal do VS Code, execute:

```sh
npm install -g pnpm@11.25.0
pnpm install --frozen-lockfile
```

4. Copie `.dev.vars.example` para `.dev.vars`. Preencha um código de ativação local escolhido por você. Este arquivo é apenas para o seu ambiente local.
5. Prepare um banco local vazio:

```sh
node scripts/setup-local-db.mjs
```

6. Inicie:

```sh
pnpm dev
```

Abra http://localhost:5173. Para ativar o proprietário, vá a /admin/entrar, clique em Ativar conta do administrador e use o e-mail e o código de `.dev.vars`. Crie sua senha no formulário.

## Onde alterar
- `app/ui.tsx`: telas, menu, formulários e apresentação.
- `app/globals.css`: cores, espaçamentos e layout responsivo.
- `public/`: logos e imagens.
- `app/api/arena/route.ts`: regras de autenticação, administradores e campeonatos.
- `lib/bracket.ts`: grupos, classificação e mata-mata.
- `app/api/discord/`: conexão com Discord.
- `db/schema.ts` e `drizzle/`: estrutura e migrações do banco.

## Verificar alterações
```sh
pnpm exec tsc --noEmit
node --experimental-strip-types --test tests/bracket.test.mjs tests/community.test.mjs
pnpm build
```

## Discord
O convite do servidor já está configurado. Login e vinculação exigem um aplicativo no Discord Developer Portal e `DISCORD_CLIENT_ID`/`DISCORD_CLIENT_SECRET` em `.dev.vars`. Configure o redirecionamento local http://localhost:5173/api/discord/callback no aplicativo. Para produção use o endereço do site seguido de /api/discord/callback.

## Dados e publicação
Este pacote contém o código completo e as migrações, mas não copia usuários, pagamentos, chats, fotos enviadas nem segredos do ambiente publicado. O banco local começa vazio. Alterações no VS Code só afetam sua cópia; para atualizar o site publicado é necessário publicar novamente.

A aplicação usa React, TypeScript, Vinext/Vite e recursos Cloudflare D1/R2. Não é um projeto de HTML estático. `wrangler.local.json` é somente para preparar o banco local; a publicação existente usa `.openai/hosting.json`.
