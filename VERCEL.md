# Publicar Arena FC na Vercel

Este projeto usa o runtime padrão do Next.js, Neon/PostgreSQL para persistência, Resend para confirmação de e-mail e Vercel Blob para imagens.

## Serviços necessários

1. Crie um banco PostgreSQL no Neon e copie a URL de conexão para `DATABASE_URL`.
2. No Resend, valide um domínio de envio e crie `RESEND_API_KEY`. `RESEND_FROM_EMAIL` precisa usar esse domínio validado. Sem essas variáveis, o cadastro por código retorna erro explícito em vez de indicar falsamente que enviou a mensagem.
3. Crie um armazenamento Vercel Blob e configure `BLOB_READ_WRITE_TOKEN`.
4. Gere segredos aleatórios diferentes para `EMAIL_CODE_SECRET` e `ARENA_ADMIN_SETUP_TOKEN` (mínimo de 32 caracteres).
5. Para conectar/criar conta com Google, crie um OAuth Client ID do tipo Web no Google Cloud Console e configure `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`. Adicione `https://SEU-DOMINIO/api/google/callback` como URI de redirecionamento autorizado no cliente OAuth.

Configure essas variáveis em **Vercel → Project → Settings → Environment Variables** e também no ambiente local, se for executar migrações ou testar. Nunca publique `.env`, `.env.local`, `.dev.vars`, tokens, senhas ou URLs de banco com credenciais.

Use `.env.example` apenas como lista de nomes das variáveis. Configure `ARENA_ADMIN_EMAIL=atanazioruan5@gmail.com`; esse endereço será o proprietário e receberá todas as permissões. A conta se torna proprietária ao concluir o cadastro verificado nesse e-mail ou ao entrar com Google. Alternativamente, ative em `/admin/entrar` com uma senha nova de pelo menos 12 caracteres e `ARENA_ADMIN_SETUP_TOKEN`. Admins secundários existentes não bloqueiam o bootstrap do dono.

## Banco de dados

Depois de configurar `DATABASE_URL`, aplique o schema inicial uma vez com `pnpm db:migrate`. A migração cria tabelas se ainda não existirem e não apaga contas nem dados. A Vercel não executa essa migração automaticamente durante cada build.

O projeto não transfere os dados do Cloudflare D1/R2 para Neon/Blob. Se houver dados em produção no Cloudflare, exporte e migre-os separadamente antes de direcionar o domínio para a Vercel; não aponte a aplicação para o novo banco vazio esperando encontrar as contas antigas.

## GitHub e deploy

Importe o repositório GitHub na Vercel e selecione a pasta `arena-fc` como diretório raiz se os arquivos do site permanecerem dentro dessa subpasta. Framework: Next.js; comando de build: `pnpm build` (ou o padrão detectado pela Vercel). Após configurar as variáveis e aplicar a migração do banco, faça um deploy de produção.

Para o OAuth opcional do Discord, configure `DISCORD_CLIENT_ID` e `DISCORD_CLIENT_SECRET` e registre `https://SEU-DOMINIO/api/discord/callback` como URL de redirecionamento no aplicativo Discord.

## Cadastro e administradores

O cadastro por e-mail envia um código de seis dígitos pelo Resend. O endereço só vira conta e recebe sessão após a confirmação; os códigos expiram em 10 minutos, têm no máximo cinco tentativas e podem ser reenviados após um minuto. O botão “Continuar com Google” oferece OAuth Google quando as duas variáveis Google estiverem configuradas. O OAuth confirma que a conta do Google controla o endereço e não precisa do Resend.

As contas não têm ação de exclusão no site e permanecem no PostgreSQL até uma operação explícita de manutenção do banco. Administradores convidados precisam confirmar o próprio e-mail; o proprietário pode selecionar permissões individuais para campeonatos, pagamentos, resultados, configurações e comunidade. Somente o proprietário pode convidar, remover ou alterar permissões de administradores.