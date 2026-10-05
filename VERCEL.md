# Publicar Arena FC na Vercel

Este projeto usa o runtime padrão do Next.js, Neon/PostgreSQL para persistência, Resend para confirmação de e-mail e Vercel Blob para imagens.

## Serviços necessários

1. Crie um banco PostgreSQL no Neon e copie a URL de conexão para `DATABASE_URL`.
2. No Resend, valide um domínio de envio e crie `RESEND_API_KEY`. `RESEND_FROM_EMAIL` precisa usar esse domínio validado.
3. Crie um armazenamento Vercel Blob e configure `BLOB_READ_WRITE_TOKEN`.
4. Gere segredos aleatórios diferentes para `EMAIL_CODE_SECRET` e `ARENA_ADMIN_SETUP_TOKEN` (mínimo de 32 caracteres).

Configure essas variáveis em **Vercel → Project → Settings → Environment Variables** e também no ambiente local, se for executar migrações ou testar. Nunca publique `.env`, `.env.local`, `.dev.vars`, tokens, senhas ou URLs de banco com credenciais.

Use `.env.example` apenas como lista de nomes das variáveis. O endereço configurado em `ARENA_ADMIN_EMAIL` será o proprietário do painel. O primeiro acesso administrativo é ativado em `/admin/entrar` usando esse e-mail, uma senha nova de pelo menos 12 caracteres e `ARENA_ADMIN_SETUP_TOKEN`.

## Banco de dados

Depois de configurar `DATABASE_URL`, aplique o schema inicial uma vez com `pnpm db:migrate`. A migração cria tabelas se ainda não existirem e não apaga contas nem dados. A Vercel não executa essa migração automaticamente durante cada build.

O projeto não transfere os dados do Cloudflare D1/R2 para Neon/Blob. Se houver dados em produção no Cloudflare, exporte e migre-os separadamente antes de direcionar o domínio para a Vercel; não aponte a aplicação para o novo banco vazio esperando encontrar as contas antigas.

## GitHub e deploy

Importe o repositório GitHub na Vercel e selecione a pasta `arena-fc` como diretório raiz se os arquivos do site permanecerem dentro dessa subpasta. Framework: Next.js; comando de build: `pnpm build` (ou o padrão detectado pela Vercel). Após configurar as variáveis e aplicar a migração do banco, faça um deploy de produção.

Para o OAuth opcional do Discord, configure `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET` e registre `https://SEU-DOMINIO/api/discord/callback` como URL de redirecionamento no aplicativo Discord.

## Cadastro e administradores

O cadastro envia um código de seis dígitos por Resend. O endereço só vira conta e recebe sessão após a confirmação. Os códigos expiram em 10 minutos e têm no máximo cinco tentativas. O endereço Gmail é usado como e-mail de contato/login; isso não é login OAuth “Entrar com Google”.

As contas não têm ação de exclusão no site e permanecem no PostgreSQL até uma operação explícita de manutenção do banco. Administradores convidados precisam confirmar o próprio e-mail; o proprietário pode selecionar permissões individuais para campeonatos, pagamentos, resultados, configurações e comunidade. Somente o proprietário pode convidar, remover ou alterar permissões de administradores.