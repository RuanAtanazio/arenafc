import {NextRequest,NextResponse} from 'next/server';import {db,currentUser,hashPassword,id,str} from '@/lib/arena';import {bracketSeeds,leagueFixtures,groupAssignments,groupName,groupStandings,qualifierSeeding} from '@/lib/bracket';import {inviteUrl} from '@/lib/community';
import {sendVerificationCode,verificationCodeHash} from '@/lib/email-verification';
import {ADMIN_PERMISSIONS,canAdmin,isOwnerAccount,permissionsFor} from '@/lib/admin';
import {isValidUsername,normalizeUsername,uniqueUsername} from '@/lib/username';
export const runtime='nodejs';
const ok=(message='Salvo.')=>NextResponse.json({message});const fail=(error:string,status=400)=>NextResponse.json({error},{status});const query=async(sql:string,...values:any[])=>db().prepare(sql).bind(...values).all<any>();
async function createKnockout(tournamentId:string,teamIds:string[],now:number){
  const stmts:any[]=[];
  for(const node of bracketSeeds(teamIds)){
    const matchId=node.homeId&&node.awayId&&!node.winnerId?id():null;
    stmts.push(db().prepare('INSERT INTO bracket_slots(id,tournament_id,round,slot,home_id,away_id,winner_id,match_id) VALUES(?,?,?,?,?,?,?,?)').bind(id(),tournamentId,node.round,node.slot,node.homeId,node.awayId,node.winnerId,matchId));
    if(matchId)stmts.push(db().prepare('INSERT INTO matches(id,tournament_id,home_id,away_id,home_goals,away_goals,status,round,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(matchId,tournamentId,node.homeId,node.awayId,null,null,'scheduled',node.round,now+stmts.length));
  }
  await db().batch(stmts);
}
export async function GET(){try{const user=await currentUser();const [t,teams,m,groups,bracket,msg,subs,users,settings,stats,clubs,posts,interests]=await Promise.all([query('SELECT * FROM tournaments ORDER BY created_at DESC'),query('SELECT id,tournament_id as tournamentId,captain_id as captainId,club_id as clubId,group_id as groupId,name,platform,ea_id as eaId,payment_status as paymentStatus FROM teams'),query('SELECT id,tournament_id as tournamentId,group_id as groupId,home_id as homeId,away_id as awayId,home_goals as homeGoals,away_goals as awayGoals,home_penalties as homePenalties,away_penalties as awayPenalties,status,round FROM matches ORDER BY tournament_id,round,created_at,id'),query('SELECT id,tournament_id as tournamentId,name,ordinal FROM tournament_groups ORDER BY tournament_id,ordinal'),query('SELECT id,tournament_id as tournamentId,round,slot,home_id as homeId,away_id as awayId,winner_id as winnerId,match_id as matchId FROM bracket_slots ORDER BY round,slot'),query('SELECT id,match_id as matchId,user_id as userId,body,created_at as createdAt FROM messages ORDER BY created_at'),query('SELECT id,match_id as matchId,user_id as userId,home_goals as homeGoals,away_goals as awayGoals,home_penalties as homePenalties,away_penalties as awayPenalties FROM submissions'),query('SELECT id,name FROM users'),query('SELECT key,value FROM settings'),query('SELECT id,match_id as matchId,user_id as userId,player_name as playerName,goals,assists,approved FROM player_stats'),query('SELECT id,owner_id as ownerId,name,game,mode,platform,ea_id as eaId,description,roster,crest_key as crestKey,created_at as createdAt FROM clubs ORDER BY created_at DESC'),query('SELECT id,club_id as clubId,owner_id as ownerId,position,description,created_at as createdAt FROM recruitment ORDER BY created_at DESC'),query('SELECT id,post_id as postId,user_id as userId,message,created_at as createdAt FROM recruitment_interest ORDER BY created_at DESC')]);const config:any={};for(const x of settings.results)config[x.key]=x.value;config.discordInvite ||= 'https://discord.gg/J43UKPftVx';const runtime=process.env;config.discordReady=!!(runtime.DISCORD_CLIENT_ID&&runtime.DISCORD_CLIENT_SECRET);config.googleReady=!!(runtime.GOOGLE_CLIENT_ID&&runtime.GOOGLE_CLIENT_SECRET);
const ownerEmail=process.env.ARENA_ADMIN_EMAIL?.trim().toLowerCase()||'',ownerNickname=normalizeUsername(process.env.ARENA_ADMIN_NICKNAME||ownerEmail.split('@')[0]||'');
config.adminSetupAvailable=!!((ownerNickname||ownerEmail)&&runtime.ARENA_ADMIN_SETUP_TOKEN)&&!(await db().prepare("SELECT id FROM users WHERE role='admin' AND (username=? OR email=?) LIMIT 1").bind(ownerNickname,ownerEmail||null).first());
config.ownerNickname=ownerNickname;config.isOwner=isOwnerAccount(user);
const adminPermissionRows=config.isOwner?(await query('SELECT user_id as userId,permission FROM admin_permissions')).results:[];const adminUsers=config.isOwner?(await query("SELECT id,email,username,name,role FROM users WHERE role='admin' ORDER BY created_at")).results.map((admin:any)=>({...admin,email:admin.email||admin.username,permissions:adminPermissionRows.filter((row:any)=>row.userId===admin.id).map((row:any)=>row.permission)})):[];const adminInvites=config.isOwner?(await query('SELECT email,created_by as createdBy,created_at as createdAt FROM admin_invites ORDER BY created_at DESC')).results:[];
const visibleTeams=teams.results.filter((x:any)=>x.paymentStatus==='approved'||user?.role==='admin'||x.captainId===user?.id);const visibleMatchIds=new Set(m.results.filter((x:any)=>user?.role==='admin'||visibleTeams.some((z:any)=>z.captainId===user?.id&&(z.id===x.homeId||z.id===x.awayId))).map((x:any)=>x.id));return NextResponse.json({user,tournaments:t.results.map((x:any)=>({id:x.id,name:x.name,game:x.game,format:x.format,fee:x.fee,capacity:x.capacity,rules:x.rules,prize:x.prize,mode:x.mode,startsAt:x.starts_at,status:x.status,ownerId:x.owner_id})),teams:visibleTeams,matches:m.results,groups:groups.results,bracket:bracket.results,messages:msg.results.filter((x:any)=>visibleMatchIds.has(x.matchId)),submissions:subs.results.filter((x:any)=>visibleMatchIds.has(x.matchId)),users:users.results.filter((x:any)=>user?.role==='admin'||visibleTeams.some((z:any)=>z.captainId===x.id)||msg.results.some((z:any)=>visibleMatchIds.has(z.matchId)&&z.userId===x.id)||interests.results.some((i:any)=>i.userId===x.id&&posts.results.some((p:any)=>p.id===i.postId&&p.ownerId===user?.id))),stats:stats.results.filter((x:any)=>x.approved||user?.role==='admin'||x.userId===user?.id),clubs:clubs.results.map((x:any)=>({...x,roster:x.ownerId===user?.id||user?.role==='admin'?JSON.parse(x.roster||'[]'):[]})),posts:posts.results,adminUsers,adminInvites,interests:interests.results.filter((x:any)=>x.userId===user?.id||user?.role==='admin'||posts.results.some((p:any)=>p.id===x.postId&&p.ownerId===user?.id)),config})}catch(e){console.error(e);return fail('Dados indisponíveis. Tente novamente.',503)}}
async function advance(match:any){
  const tournament=await db().prepare('SELECT format FROM tournaments WHERE id=?').bind(match.tournament_id).first<any>();
  if(tournament?.format==='league'){
    const pending=await db().prepare("SELECT id FROM matches WHERE tournament_id=? AND status!='final' LIMIT 1").bind(match.tournament_id).first();
    if(!pending)await db().prepare("UPDATE tournaments SET status='finished' WHERE id=?").bind(match.tournament_id).run();
    return;
  }
  if(tournament?.format==='groups'&&match.group_id){
    const pending=await db().prepare("SELECT id FROM matches WHERE tournament_id=? AND group_id IS NOT NULL AND status!='final' LIMIT 1").bind(match.tournament_id).first();
    if(pending)return;
    if(await db().prepare('SELECT id FROM bracket_slots WHERE tournament_id=? LIMIT 1').bind(match.tournament_id).first())return;
    const groups=(await query('SELECT id FROM tournament_groups WHERE tournament_id=? ORDER BY ordinal',match.tournament_id)).results;
    const qualified:{id:string;first:string;second:string}[]=[];
    for(const group of groups){
      const members=(await query("SELECT id FROM teams WHERE group_id=? AND payment_status='approved' ORDER BY created_at,id",group.id)).results;
      const fixtures=(await query('SELECT home_id as homeId,away_id as awayId,home_goals as homeGoals,away_goals as awayGoals,status FROM matches WHERE group_id=?',group.id)).results;
      const ranking=groupStandings(members.map((x:any)=>x.id),fixtures);
      if(ranking.length<2)return;
      qualified.push({id:group.id,first:ranking[0].id,second:ranking[1].id});
    }
    await createKnockout(match.tournament_id,qualifierSeeding(qualified),Date.now());
    return;
  }
  if(tournament?.format!=='knockout'&&tournament?.format!=='groups')return;
  const winner=match.home_goals>match.away_goals||match.home_goals===match.away_goals&&match.home_penalties>match.away_penalties?match.home_id:match.away_id;
  const node=await db().prepare('SELECT * FROM bracket_slots WHERE match_id=?').bind(match.id).first<any>();
  if(node){
    if(node.winner_id)return;
    await db().prepare('UPDATE bracket_slots SET winner_id=? WHERE id=? AND winner_id IS NULL').bind(winner,node.id).run();
    const parent=await db().prepare('SELECT * FROM bracket_slots WHERE tournament_id=? AND round=? AND slot=?').bind(match.tournament_id,node.round+1,Math.floor(node.slot/2)).first<any>();
    if(!parent){await db().prepare("UPDATE tournaments SET status='finished' WHERE id=?").bind(match.tournament_id).run();return}
    const side=node.slot%2?'away_id':'home_id';
    await db().prepare(`UPDATE bracket_slots SET ${side}=? WHERE id=?`).bind(winner,parent.id).run();
    const ready=await db().prepare('SELECT * FROM bracket_slots WHERE id=?').bind(parent.id).first<any>();
    if(ready.home_id&&ready.away_id&&!ready.match_id){
      const nextId=id();
      await db().batch([db().prepare('INSERT INTO matches(id,tournament_id,home_id,away_id,home_goals,away_goals,status,round,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(nextId,match.tournament_id,ready.home_id,ready.away_id,null,null,'scheduled',ready.round,Date.now()),db().prepare('UPDATE bracket_slots SET match_id=? WHERE id=? AND match_id IS NULL').bind(nextId,ready.id)]);
    }
    return;
  }
  // Tournaments started before bracket slots existed keep advancing, including repeated byes.
  const games=(await query('SELECT * FROM matches WHERE tournament_id=? AND round=? ORDER BY created_at,id',match.tournament_id,match.round)).results;
  if(games.some((x:any)=>x.status!=='final'))return;
  if(await db().prepare('SELECT id FROM matches WHERE tournament_id=? AND round=? LIMIT 1').bind(match.tournament_id,match.round+1).first())return;
  const allGames=(await query('SELECT * FROM matches WHERE tournament_id=?',match.tournament_id)).results;
  const eliminated=new Set(allGames.filter((x:any)=>x.status==='final').map((x:any)=>x.home_goals>x.away_goals||x.home_goals===x.away_goals&&x.home_penalties>x.away_penalties?x.away_id:x.home_id));
  const survivors=(await query("SELECT id FROM teams WHERE tournament_id=? AND payment_status='approved' ORDER BY created_at,id",match.tournament_id)).results.filter((x:any)=>!eliminated.has(x.id));
  if(survivors.length<=1){await db().prepare("UPDATE tournaments SET status='finished' WHERE id=?").bind(match.tournament_id).run();return}
  const stmts=[];for(let i=0;i+1<survivors.length;i+=2)stmts.push(db().prepare('INSERT INTO matches(id,tournament_id,home_id,away_id,home_goals,away_goals,status,round,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(),match.tournament_id,survivors[i].id,survivors[i+1].id,null,null,'scheduled',match.round+1,Date.now()+i));
  if(stmts.length)await db().batch(stmts);
}
export async function POST(req:NextRequest){try{const b:any=await req.json(),kind=str(b.kind,30);const user=await currentUser(),now=Date.now(),ownerEmailLegacy=process.env.ARENA_ADMIN_EMAIL?.trim().toLowerCase()||'',ownerNickname=normalizeUsername(process.env.ARENA_ADMIN_NICKNAME||ownerEmailLegacy.split('@')[0]||'');if(kind==='register'){
  const username=normalizeUsername(str(b.username||b.nickname,30)),emailValue=str(b.email,200).toLowerCase(),email=emailValue||null,password=str(b.password,200),name=str(b.name,80)||username,eaId=str(b.eaId,80);
  if(!isValidUsername(username)||password.length<8)return fail('Escolha um nickname de 3 a 30 caracteres (letras, números, ponto, traço ou sublinhado) e senha de pelo menos 8 caracteres.');
  if(username===ownerNickname)return fail('Este nickname é reservado ao proprietário do site. Use “Ativar conta do proprietário” na área administrativa.');
  if(email&&!/^\S+@\S+\.\S+$/.test(email))return fail('O e-mail opcional está inválido. Remova-o ou informe um endereço válido.');
  if(await db().prepare('SELECT id FROM users WHERE username=?').bind(username).first())return fail('Este nickname já está em uso. Escolha outro.',409);
  if(email&&await db().prepare('SELECT id FROM users WHERE email=?').bind(email).first())return fail('Este e-mail já está associado a outra conta.');
  const uid=id(),token=id(),passwordHash=await hashPassword(password);
  await db().batch([db().prepare('INSERT INTO users(id,username,email,password,email_login_enabled,email_verified,name,ea_id,role,created_at) VALUES(?,?,?,?,1,?,?,?, ?,?)').bind(uid,username,email,passwordHash,email?0:1,name,eaId||null,'player',now),db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(token,uid,now+30*86400000)]);
  const response=ok('Conta criada. Seu nickname é exclusivo e já pode ser usado para entrar.');response.cookies.set('arena_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400});return response;
}
if(kind==='resendRegistrationCode'){
  const email=str(b.email,200).toLowerCase();
  if(!/^\S+@\S+\.\S+$/.test(email))return fail('Informe um e-mail válido.');
  const pending=await db().prepare('SELECT created_at as createdAt FROM email_verifications WHERE email=?').bind(email).first<any>();
  if(!pending)return fail('Não há cadastro aguardando confirmação. Comece o cadastro novamente.',404);
  if(now-pending.createdAt<60000)return fail('Aguarde um minuto antes de pedir outro código.',429);
  const code=String(crypto.getRandomValues(new Uint32Array(1))[0]%900000+100000),codeHash=await verificationCodeHash(email,code);
  try{await sendVerificationCode(email,code)}catch(error){
    const reason=error instanceof Error?error.message:'';
    return fail(reason==='EmailServiceNotConfigured'?'O envio de e-mail ainda não foi configurado na Vercel.':'Não foi possível enviar o código. Tente novamente em instantes.',reason==='EmailServiceNotConfigured'?503:502);
  }
  await db().prepare('UPDATE email_verifications SET code_hash=?,attempts=0,expires_at=?,created_at=? WHERE email=?').bind(codeHash,now+10*60000,now,email).run();
  return ok('Enviamos um novo código. Confira também a pasta de spam.');
}
if(kind==='verifyRegistration'){
  const email=str(b.email,200).toLowerCase(),code=str(b.code,6);
  if(!/^\S+@\S+\.\S+$/.test(email)||!/^\d{6}$/.test(code))return fail('Informe o e-mail e o código de seis dígitos.');
  const pending=await db().prepare('SELECT * FROM email_verifications WHERE email=?').bind(email).first<any>();
  if(!pending||pending.expires_at<now)return fail('Código expirado ou inexistente. Inicie o cadastro novamente.');
  if(pending.attempts>=5)return fail('Limite de tentativas atingido. Solicite um novo código.');
  if(await verificationCodeHash(email,code)!==pending.code_hash){await db().prepare('UPDATE email_verifications SET attempts=attempts+1 WHERE email=?').bind(email).run();return fail('Código incorreto. Confira o e-mail e tente novamente.',401)}
  if(await db().prepare('SELECT id FROM users WHERE email=?').bind(email).first())return fail('E-mail já cadastrado.');
  const invite=await db().prepare('SELECT email FROM admin_invites WHERE email=?').bind(email).first<any>(),uid=id(),token=id(),username=email===ownerEmailLegacy?ownerNickname:await uniqueUsername(pending.name||email.split('@')[0],async(candidate)=>!!await db().prepare('SELECT id FROM users WHERE username=?').bind(candidate).first()),role=email===ownerEmailLegacy||invite?'admin':'player';
  const actions=[db().prepare('INSERT INTO users(id,username,email,password,email_login_enabled,email_verified,name,ea_id,role,created_at) VALUES(?,?,?,?,1,1,?,?,?,?)').bind(uid,username,email,pending.password,pending.name,pending.ea_id,role,now),db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(token,uid,now+30*86400000),db().prepare('DELETE FROM email_verifications WHERE email=?').bind(email)];
  if(invite)actions.push(db().prepare('DELETE FROM admin_invites WHERE email=?').bind(email));
  await db().batch(actions);
  const r=ok('E-mail confirmado e conta criada.');r.cookies.set('arena_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400});return r;
}
if(kind==='adminSetup'){
  const username=normalizeUsername(str(b.username||b.nickname,30)),code=str(b.setupCode,200),password=str(b.password,200),name=str(b.name,80)||username;
  if(!ownerNickname||!isValidUsername(username)||username!==ownerNickname||!process.env.ARENA_ADMIN_SETUP_TOKEN||code!==process.env.ARENA_ADMIN_SETUP_TOKEN||password.length<12)return fail('Nickname do proprietário, código ou senha inválidos. A senha precisa ter 12 caracteres.',403);
  const existing=await db().prepare('SELECT id,role FROM users WHERE username=?').bind(username).first<any>();
  if(existing?.role==='admin')return fail('A conta proprietária já está ativada. Entre com seu nickname e senha.',409);
  const uid=existing?.id||id(),token=id(),passwordHash=await hashPassword(password);
  const actions=existing?[db().prepare('UPDATE users SET password=?,name=?,email_login_enabled=1,email_verified=1,role=? WHERE id=?').bind(passwordHash,name,'admin',uid),db().prepare('DELETE FROM sessions WHERE user_id=?').bind(uid)]:[db().prepare('INSERT INTO users(id,username,email,password,email_login_enabled,email_verified,name,role,created_at) VALUES(?,?,NULL,?,1,1,? ,?,?)').bind(uid,username,passwordHash,name,'admin',now)];
  actions.push(db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(token,uid,now+30*86400000));
  await db().batch(actions);const r=ok('Administrador ativado.');r.cookies.set('arena_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400});return r;
}
if(kind==='login'||kind==='adminLogin'){
  const identifier=str(b.identifier||b.username||b.email,200).toLowerCase(),row=await db().prepare('SELECT id,username,email,password,email_login_enabled as emailLoginEnabled,email_verified as emailVerified,role FROM users WHERE username=? OR email=? LIMIT 1').bind(identifier,identifier).first<any>(),usingEmail=!!row?.email&&row.email.toLowerCase()===identifier;
  if(!row||usingEmail&&(!row.emailLoginEnabled||!row.emailVerified)||await hashPassword(str(b.password,200),row.password.split(':')[0])!==row.password)return fail('Nickname ou senha inválidos.',401);
  if((row.username===ownerNickname||row.email===ownerEmailLegacy)&&row.role!=='admin'){
    await db().prepare("UPDATE users SET role='admin' WHERE id=?").bind(row.id).run();
    row.role='admin';
  }
  if(kind==='adminLogin'&&row.role!=='admin')return fail('Esta conta não tem acesso ao painel de administração.',403);
  const token=id();await db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(token,row.id,now+30*86400000).run();
  const r=ok('Bem-vindo!');r.cookies.set('arena_session',token,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400});return r;
}
if(kind==='logout'){const token=(await import('next/headers')).cookies;const c=await token();const v=c.get('arena_session')?.value;if(v)await db().prepare('DELETE FROM sessions WHERE id=?').bind(v).run();const r=ok('Você saiu.');r.cookies.delete('arena_session');return r}
if(!user)return fail('Entre na sua conta para continuar.',401);const admin=user.role==='admin';if(kind==='submit')return fail('Somente o administrador pode registrar o placar. Use o chat da partida para enviar o resultado.',403);
if(kind==='setPassword'){if(user.emailLoginEnabled)return fail('Sua conta já possui senha de e-mail.');const password=str(b.password,200);if(password.length<8)return fail('Use uma senha de pelo menos 8 caracteres.');await db().prepare('UPDATE users SET password=?,email_login_enabled=1 WHERE id=? AND email_login_enabled=0').bind(await hashPassword(password),user.id).run();return ok('Login por e-mail ativado.')}
if(kind==='profile'){const name=str(b.name,80),username=normalizeUsername(str(b.username,30)||String(user.username||''));if(name.length<2||!isValidUsername(username))return fail('Informe um nickname válido e um nome público.');if(username!==user.username&&await db().prepare('SELECT id FROM users WHERE username=? AND id<>?').bind(username,user.id).first())return fail('Este nickname já está em uso. Escolha outro.',409);if(isOwnerAccount(user)&&username!==ownerNickname)return fail('O nickname do proprietário é reservado e não pode ser alterado por aqui.',403);await db().prepare('UPDATE users SET username=?,name=?,ea_id=? WHERE id=?').bind(username,name,str(b.eaId,80),user.id).run();return ok('Perfil atualizado.')}
if(kind==='club'){const name=str(b.name,80),game=str(b.game,20),mode=str(b.mode,30),platform=str(b.platform,30),eaId=str(b.eaId,80),description=str(b.description,600);if(!name||!['EA FC 26','EA FC 27'].includes(game)||!['Ultimate Team','Pro Clubs'].includes(mode)||!['PC','Xbox','PlayStation'].includes(platform)||!eaId)return fail('Dados do time inválidos.');await db().prepare('INSERT INTO clubs(id,owner_id,name,game,mode,platform,ea_id,description,roster,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),user.id,name,game,mode,platform,eaId,description,'[]',now).run();return ok('Time criado. Agora você pode inscrevê-lo em um campeonato.')}if(kind==='clubUpdate'){const club=await db().prepare('SELECT * FROM clubs WHERE id=? AND owner_id=?').bind(str(b.clubId,50),user.id).first<any>();if(!club)return fail('Time não encontrado.',404);const name=str(b.name,80),description=str(b.description,600),members=str(b.roster,1000).split('\n').map((x:string)=>x.trim()).filter(Boolean).slice(0,25);if(!name)return fail('Informe o nome do time.');await db().prepare('UPDATE clubs SET name=?,description=?,roster=? WHERE id=?').bind(name,description,JSON.stringify(members),club.id).run();return ok('Time atualizado.')}
if(kind==='recruit'){const club=await db().prepare('SELECT id FROM clubs WHERE id=? AND owner_id=?').bind(str(b.clubId,50),user.id).first();if(!club)return fail('Selecione um time seu.',403);const position=str(b.position,60),description=str(b.description,500);if(!position||!description)return fail('Informe a posição e os detalhes.');await db().prepare('INSERT INTO recruitment VALUES(?,?,?,?,?,?)').bind(id(),club.id,user.id,position,description,now).run();return ok('Vaga publicada.')}if(kind==='interest'){const post=await db().prepare('SELECT owner_id FROM recruitment WHERE id=?').bind(str(b.postId,50)).first<any>();if(!post||post.owner_id===user.id)return fail('Vaga indisponível.');const message=str(b.message,400);if(!message)return fail('Escreva uma apresentação.');await db().prepare('INSERT INTO recruitment_interest VALUES(?,?,?,?,?) ON CONFLICT(post_id,user_id) DO UPDATE SET message=excluded.message,created_at=excluded.created_at').bind(id(),str(b.postId,50),user.id,message,now).run();return ok('Seu interesse foi enviado ao capitão.')}
const owner=isOwnerAccount(user),permissionByAction:Record<string,any>={tournament:'manage_tournaments',generate:'manage_tournaments',approve:'manage_payments',resolve:'manage_results',approveStat:'manage_results',settings:'manage_settings',communitySettings:'manage_community'},requiredPermission=permissionByAction[kind];
if(requiredPermission&&!await canAdmin(user,requiredPermission))return fail('Seu perfil de administrador não tem permissão para esta ação.',403);
if(['adminAdd','adminRemove','adminPermissions'].includes(kind)&&!owner)return fail('Somente o proprietário pode gerenciar administradores.',403);
const ownerEmail=process.env.ARENA_ADMIN_EMAIL?.toLowerCase()||'';
if(kind==='adminAdd'||kind==='adminRemove'){
  const identifier=str(b.identifier||b.username||b.email,200).toLowerCase(),isEmail=/^\S+@\S+\.\S+$/.test(identifier);
  if(!identifier||identifier===ownerEmail||identifier===ownerNickname)return fail('Informe um nickname ou e-mail de administrador válido.');
  if(kind==='adminAdd'){
    const existing=await db().prepare('SELECT id,role,email_verified as emailVerified FROM users WHERE username=? OR email=? LIMIT 1').bind(identifier,isEmail?identifier:null).first<any>();
    if(existing){if(existing.role==='admin')return fail('Este usuário já é administrador.');if(existing.email&&!existing.emailVerified)return fail('O endereço precisa ser confirmado antes de virar administrador.');await db().prepare("UPDATE users SET role='admin' WHERE id=?").bind(existing.id).run();return ok('Administrador adicionado pelo nickname.');}
    if(!isEmail)return fail('Não encontrei uma conta com esse nickname. Peça à pessoa para criar a conta primeiro.');
    await db().prepare('INSERT INTO admin_invites(email,created_by,created_at) VALUES(?,?,?) ON CONFLICT(email) DO UPDATE SET created_by=excluded.created_by,created_at=excluded.created_at').bind(identifier,user.id,now).run();return ok('Convite por e-mail criado; o endereço precisará ser verificado.');
  }
  const existing=await db().prepare('SELECT id,role,email FROM users WHERE username=? OR email=? LIMIT 1').bind(identifier,isEmail?identifier:null).first<any>();
  if(existing?.role==='admin')await db().prepare("UPDATE users SET role='player' WHERE id=?").bind(existing.id).run();
  if(existing)await db().prepare('DELETE FROM admin_permissions WHERE user_id=?').bind(existing.id).run();
  if(isEmail)await db().prepare('DELETE FROM admin_invites WHERE email=?').bind(identifier).run();
  return ok('Acesso de administrador removido.');
}
if(kind==='adminPermissions'){
  const identifier=str(b.identifier||b.username||b.email,200).toLowerCase(),target=await db().prepare("SELECT id FROM users WHERE (username=? OR email=?) AND role='admin'").bind(identifier,identifier).first<any>();
  if(!target||identifier===ownerEmail||identifier===ownerNickname)return fail('Selecione uma conta de administrador cadastrada.');
  const requested=Array.isArray(b.permissions)?b.permissions.filter((permission:unknown)=>ADMIN_PERMISSIONS.includes(permission as any)):[];
  const statements=[db().prepare('DELETE FROM admin_permissions WHERE user_id=?').bind(target.id),...requested.map((permission:string)=>db().prepare('INSERT INTO admin_permissions(user_id,permission) VALUES(?,?)').bind(target.id,permission))];
  await db().batch(statements);
  return ok('Permissões do administrador atualizadas.');
}
if(kind==='settings'){for(const key of ['pixKey','pixName','pixCity'])await db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key,str(b[key],120)).run();return ok('Dados Pix salvos.')}
if(kind==='communitySettings'){
  const whatsapp=inviteUrl(str(b.whatsappInvite,350),'whatsapp'),discord=inviteUrl(str(b.discordInvite,350),'discord');
  if(whatsapp===null||discord===null)return fail('Informe convites HTTPS válidos do grupo WhatsApp e do servidor Discord.');
  await db().batch([db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('whatsappInvite',whatsapp),db().prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind('discordInvite',discord)]);
  return ok('Links da comunidade atualizados.');
}
if(kind==='tournament'){const name=str(b.name,120),game=str(b.game,20),format=str(b.format,20),fee=Math.round(Number(b.fee)*100),capacity=Number(b.capacity);if(!name||!['EA FC 26','EA FC 27'].includes(game)||!['Pro Clubs','Ultimate Team'].includes(str(b.mode,30))||!['league','knockout','groups'].includes(format)||!Number.isInteger(fee)||fee<0||!Number.isInteger(capacity)||capacity<(format==='groups'?4:2)||capacity>(format==='league'?32:128))return fail('Formato ou vagas inválidos: grupos exigem 4 a 128 equipes; pontos corridos aceitam até 32.');await db().prepare('INSERT INTO tournaments(id,name,game,format,fee,capacity,rules,prize,mode,starts_at,status,owner_id,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id(),name,game,format,fee,capacity,str(b.rules,2000),str(b.prize,200),str(b.mode,30)||'Ultimate Team',str(b.startsAt,30)||null,'open',user.id,now).run();return ok('Campeonato criado.')}
const tournament=await db().prepare('SELECT * FROM tournaments WHERE id=?').bind(str(b.tournamentId,50)).first<any>();if(kind==='team'){if(!tournament||tournament.status!=='open')return fail('Inscrições encerradas.');const count=await db().prepare("SELECT count(*) as n FROM teams WHERE tournament_id=? AND payment_status='approved'").bind(tournament.id).first<any>();if(count.n>=tournament.capacity)return fail('Vagas encerradas.');const club=await db().prepare('SELECT * FROM clubs WHERE id=? AND owner_id=?').bind(str(b.clubId,50),user.id).first<any>();if(!club)return fail('Crie ou selecione um time seu antes de se inscrever.');if(club.game!==tournament.game||(club.mode!==tournament.mode&&!(club.mode==='Ultimate Team'&&tournament.mode==='X1')))return fail('O jogo e a modalidade do time devem corresponder ao campeonato.');const name=club.name,eaId=club.ea_id,platform=club.platform;if(await db().prepare('SELECT id FROM teams WHERE tournament_id=? AND captain_id=?').bind(tournament.id,user.id).first())return fail('Você já inscreveu uma equipe.');await db().prepare('INSERT INTO teams(id,tournament_id,captain_id,club_id,name,platform,ea_id,payment_status,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(),tournament.id,user.id,club.id,name,platform,eaId,'pending',now).run();return ok('Inscrição solicitada. Aguarde a confirmação do pagamento.')}
if(kind==='approve'){const team=await db().prepare('SELECT * FROM teams WHERE id=?').bind(str(b.teamId,50)).first<any>();if(!team)return fail('Equipe não encontrada.');const t=await db().prepare('SELECT capacity,status FROM tournaments WHERE id=?').bind(team.tournament_id).first<any>();if(!t||t.status!=='open')return fail('Inscrições encerradas.');const count=await db().prepare("SELECT count(*) as n FROM teams WHERE tournament_id=? AND payment_status='approved'").bind(team.tournament_id).first<any>();if(count.n>=t.capacity)return fail('Não há vagas disponíveis.');await db().prepare("UPDATE teams SET payment_status='approved' WHERE id=? AND payment_status='pending'").bind(team.id).run();return ok('Pagamento confirmado e equipe ativada.')}
if(kind==='generate'){
  if(!tournament)return fail('Campeonato não encontrado.');
  if(tournament.status!=='open')return fail('O campeonato já foi iniciado.');
  if(await db().prepare('SELECT id FROM matches WHERE tournament_id=? LIMIT 1').bind(tournament.id).first())return fail('Confrontos já gerados.');
  const approved=(await query("SELECT id FROM teams WHERE tournament_id=? AND payment_status='approved' ORDER BY created_at,id",tournament.id)).results;
  if(approved.length<(tournament.format==='groups'?4:2))return fail(tournament.format==='groups'?'Confirme ao menos quatro equipes para a fase de grupos.':'Confirme ao menos duas equipes.');
  if(tournament.format==='league'&&approved.length>32)return fail('Pontos corridos aceita até 32 equipes.');
  const stmts:any[]=[];
  if(tournament.format==='league'){
    for(const fixture of leagueFixtures(approved.map((x:any)=>x.id)))stmts.push(db().prepare('INSERT INTO matches(id,tournament_id,home_id,away_id,home_goals,away_goals,status,round,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id(),tournament.id,fixture.homeId,fixture.awayId,null,null,'scheduled',fixture.round,now+stmts.length));
  }else if(tournament.format==='groups'){
    const assignments=groupAssignments(approved.map((x:any)=>x.id));
    for(let ordinal=0;ordinal<assignments.length;ordinal++){
      const groupId=id(),members=assignments[ordinal];
      stmts.push(db().prepare('INSERT INTO tournament_groups(id,tournament_id,name,ordinal) VALUES(?,?,?,?)').bind(groupId,tournament.id,groupName(ordinal),ordinal));
      stmts.push(db().prepare(`UPDATE teams SET group_id=? WHERE id IN (${members.map(()=>'?').join(',')})`).bind(groupId,...members));
      for(const fixture of leagueFixtures(members))stmts.push(db().prepare('INSERT INTO matches(id,tournament_id,group_id,home_id,away_id,home_goals,away_goals,status,round,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)').bind(id(),tournament.id,groupId,fixture.homeId,fixture.awayId,null,null,'scheduled',fixture.round,now+stmts.length));
    }
  }else if(tournament.format==='knockout'){
    await createKnockout(tournament.id,approved.map((x:any)=>x.id),now);
  }else return fail('Formato do campeonato inválido.');
  stmts.push(db().prepare("UPDATE tournaments SET status='started' WHERE id=? AND status='open'").bind(tournament.id));
  await db().batch(stmts);
  return ok(tournament.format==='groups'?'Grupos e rodadas gerados. Os dois primeiros de cada grupo avançam após a última partida.':tournament.format==='knockout'?'Chave gerada com avanço automático até a final.':'Rodadas e confrontos gerados.');
}
const match=await db().prepare('SELECT * FROM matches WHERE id=?').bind(str(b.matchId,50)).first<any>();if(['message','submit','resolve','stat','approveStat'].includes(kind)&&!match)return fail('Partida não encontrada.');const sides=match?await query('SELECT id,captain_id as captainId FROM teams WHERE id IN (?,?)',match.home_id,match.away_id):{results:[]};const allowed=(await canAdmin(user,'manage_results'))||sides.results.some((x:any)=>x.captainId===user.id);if(['message','submit','resolve','stat','approveStat'].includes(kind)&&!allowed)return fail('Somente capitães e administradores podem participar.',403);
if(kind==='stat'){if(admin)return fail('O registro é feito pelo capitão.');const goals=Number(b.goals),assists=Number(b.assists);if(!Number.isInteger(goals)||!Number.isInteger(assists)||goals<0||assists<0||goals>99||assists>99)return fail('Estatística inválida.');const playerName=str(b.playerName,80)||user.eaId||user.name;if(!playerName)return fail('Informe o jogador.');await db().prepare('DELETE FROM player_stats WHERE match_id=? AND user_id=? AND lower(player_name)=lower(?)').bind(match.id,user.id,playerName).run();await db().prepare('INSERT INTO player_stats(id,match_id,user_id,player_name,goals,assists,approved) VALUES(?,?,?,?,?,?,?)').bind(id(),match.id,user.id,playerName,goals,assists,0).run();return ok('Estatística de '+playerName+' enviada para validação.')}if(kind==='approveStat'){if(!admin)return fail('Acesso restrito.',403);await db().prepare('UPDATE player_stats SET approved=1 WHERE id=? AND match_id=?').bind(str(b.statId,50),match.id).run();return ok('Estatística aprovada.')}if(kind==='message'){const body=str(b.body,1000);if(!body)return fail('Escreva uma mensagem.');await db().prepare('INSERT INTO messages VALUES(?,?,?,?,?)').bind(id(),match.id,user.id,body,now).run();return ok('Mensagem enviada.')}
if(kind==='resolve'){
  const h=Number(b.homeGoals),a=Number(b.awayGoals);
  if(!Number.isInteger(h)||!Number.isInteger(a)||h<0||a<0||h>99||a>99)return fail('Placar inválido.');
  if(match.status==='final')return fail('Resultado já confirmado.');
  const mt=await db().prepare('SELECT format FROM tournaments WHERE id=?').bind(match.tournament_id).first<any>();
  const elimination=mt?.format==='knockout'||mt?.format==='groups'&&!match.group_id;
  const tied=elimination&&h===a;
  const hp=b.homePenalties===''||b.homePenalties==null?null:Number(b.homePenalties),ap=b.awayPenalties===''||b.awayPenalties==null?null:Number(b.awayPenalties);
  if(tied&&(!Number.isInteger(hp)||!Number.isInteger(ap)||hp!<0||ap!<0||hp!>99||ap!>99||hp===ap))return fail('No mata-mata empatado, informe os pênaltis com um vencedor.');
  if(!tied&&(hp!==null||ap!==null))return fail('Informe pênaltis somente quando o mata-mata terminar empatado.');
  await db().prepare("UPDATE matches SET home_goals=?,away_goals=?,home_penalties=?,away_penalties=?,status='final' WHERE id=? AND status!='final'").bind(h,a,hp,ap,match.id).run();
  await advance({...match,home_goals:h,away_goals:a,home_penalties:hp,away_penalties:ap});
  return ok('Resultado confirmado pelo administrador.');
}
return fail('Ação desconhecida.')
}catch(e){console.error(e);const reason=e instanceof Error?e.message:'';if(reason.includes('DATABASE_URL')||reason.includes('EMAIL_CODE_SECRET'))return fail('A configuração do cadastro no servidor está incompleta. Confira as variáveis da Vercel e tente novamente.',503);return fail('Não foi possível acessar ou salvar os dados. Confira a conexão e a migração do banco Neon e tente novamente.',503)}}
