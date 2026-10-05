# Publicar Arena FC na Vercel

Este projeto usa o runtime padrão do Next.js e Neon/PostgreSQL para persistência. Cadastro e login principal são por nickname exclusivo e senha; não precisam de email ou Resend. Vercel Blob armazena imagens e Google OAuth é opcional.

## Serviços necessários

1. Crie um banco PostgreSQL no Neon e copie a URL de conexão para `DATABASE_URL`.
2. Resend é opcional: o cadastro normal não envia email. Configure-o apenas se for usar recursos antigos de confirmação por email.
3. Crie um armazenamento Vercel Blob e configure `BLOB_READ_WRITE_TOKEN`.
4. Gere `ARENA_ADMIN_SETUP_TOKEN` como segredo aleatório forte (mínimo 32 caracteres). `EMAIL_CODE_SECRET` só é necessário para recursos legados de verificação de email.
5. Para conectar/criar conta com Google, crie um OAuth Client ID do tipo Web no Google Cloud Console e configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Adicione `https://SEU-DOMINIO/api/google/callback` como URI de redirecionamento autorizado no cliente OAuth.

Configure essas variáveis em **Vercel → Project → Settings → Environment Variables** e também no ambiente local, se for executar migrações ou testar. Nunca publique `.env`, `.env.local`, `.dev.vars`, tokens, senhas ou URLs de banco com credenciais.

Use `.env.example` apenas como lista de nomes das variáveis. Configure `ARENA_ADMIN_NICKNAME=atanazioruan5` para reservar o nickname do proprietário, que recebe todas as permissões. Configure também um `ARENA_ADMIN_SETUP_TOKEN` forte e ative a conta em `/admin/entrar` com esse nickname, o token e uma senha nova de pelo menos 12 caracteres. Contas antigas ainda podem ser reconhecidas pelo `ARENA_ADMIN_EMAIL` opcional. Admins secundários existentes não bloqueiam o bootstrap do dono.

## Banco de dados

Depois de configurar `DATABASE_URL`, aplique todas as migrações pendentes com `pnpm db:migrate`. A migração `0002_usernames` mantém os registros atuais e atribui um nickname aos usuários antigos; emails existentes são preservados, mas deixam de ser obrigatórios para contas novas. As versões executadas ficam registradas em `schema_migrations`; cada migração roda em transação e não é repetida em deploys seguintes. A Vercel não executa migrações automaticamente durante cada build. Não apague nem recrie o projeto Neon para fazer deploy.

Contas, perfis, clubes/times, inscrições, torneios, resultados, conversas e configurações ficam nas tabelas PostgreSQL do Neon. O app não oferece exclusão de contas ou times; logout remove apenas a sessão de login. Deploys/rebuilds da Vercel não apagam o banco externo. Para recuperação contra exclusão acidental ou problema no provedor, habilite e confira backups/PITR do Neon conforme o plano, e teste periodicamente a restauração. Imagens usam Vercel Blob e precisam de backup separado se sua conta/plano não garantir retenção suficiente.

O projeto não transfere os dados do Cloudflare D1/R2 para Neon/Blob. Se houver dados em produção no Cloudflare, exporte e migre-os separadamente antes de direcionar o domínio para a Vercel; não aponte a aplicação para o novo banco vazio esperando encontrar as contas antigas.

## GitHub e deploy

Importe o repositório GitHub na Vercel e selecione a pasta `arena-fc` como diretório raiz se os arquivos do site permanecerem dentro dessa subpasta. Framework: Next.js; comando de build: `pnpm build` (ou o padrão detectado pela Vercel). Após configurar as variáveis e aplicar a migração do banco, faça um deploy de produção.

Para o OAuth opcional do Discord, configure `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET` e registre `https://SEU-DOMINIO/api/discord/callback` como URL de redirecionamento no aplicativo Discord.

## Cadastro e administradores

O cadastro solicita nickname exclusivo (3–30 caracteres) e senha. O nickname não pode ser reutilizado; o login aceita nickname e senha. Cada conta, sessão, time, inscrição, campeonato e resultado é salvo no PostgreSQL configurado em `DATABASE_URL`. O botão “Continuar com Google” continua opcional se OAuth estiver configurado. Contas antigas podem continuar entrando pelo email até adotarem o nickname migrado no perfil.

As contas não têm ação de exclusão no site e permanecem no PostgreSQL até uma operação explícita de manutenção do banco. Administradores convidados precisam confirmar o próprio e-mail; o proprietário pode selecionar permissões individuais para campeonatos, pagamentos, resultados, configurações e comunidade. Somente o proprietário pode convidar, remover ou alterar permissões de administradores.