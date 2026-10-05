import {NextRequest,NextResponse} from 'next/server';
import {currentUser,db,hashPassword,id,str} from '@/lib/arena';
import {uniqueUsername} from '@/lib/username';

function finish(req:NextRequest,location:string,session?:string){
  const res=NextResponse.redirect(new URL(location,req.url));
  res.cookies.set('discord_state','',{path:'/api/discord',maxAge:0});
  res.cookies.set('discord_mode','',{path:'/api/discord',maxAge:0});
  if(session)res.cookies.set('arena_session',session,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400});
  return res;
}

export async function GET(req:NextRequest){
  const state=req.cookies.get('discord_state')?.value,mode=req.cookies.get('discord_mode')?.value;
  if(!state||req.nextUrl.searchParams.get('state')!==state||!['login','link'].includes(mode||''))return finish(req,'/entrar?discord=invalid');
  if(req.nextUrl.searchParams.has('error'))return finish(req,'/entrar?discord=cancelled');
  const cid=process.env.DISCORD_CLIENT_ID,secret=process.env.DISCORD_CLIENT_SECRET;
  if(!cid||!secret)return finish(req,'/entrar?discord=unavailable');
  const user=mode==='link'?await currentUser():null;
  if(mode==='link'&&!user)return finish(req,'/entrar?discord=login-required');
  try{
    const redirect=new URL('/api/discord/callback',req.url).toString();
    const token=await fetch('https://discord.com/api/oauth2/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:cid,client_secret:secret,grant_type:'authorization_code',code:req.nextUrl.searchParams.get('code')||'',redirect_uri:redirect})});
    if(!token.ok)return finish(req,'/entrar?discord=failed');
    const data=await token.json() as {access_token?:string};
    if(!data.access_token)return finish(req,'/entrar?discord=failed');
    const profile=await fetch('https://discord.com/api/users/@me',{headers:{Authorization:`Bearer ${data.access_token}`}});
    if(!profile.ok)return finish(req,'/entrar?discord=failed');
    const discord=await profile.json() as {id?:string;email?:string;verified?:boolean;global_name?:string;username?:string};
    if(!discord.id)return finish(req,'/entrar?discord=failed');
    const linked=await db().prepare('SELECT id FROM users WHERE discord_id=?').bind(discord.id).first<{id:string}>();
    if(mode==='link'){
      if(linked&&linked.id!==user.id)return finish(req,'/perfil?discord=already-linked');
      await db().prepare('UPDATE users SET discord_id=? WHERE id=?').bind(discord.id,user.id).run();
      return finish(req,'/perfil?discord=connected');
    }
    let accountId=linked?.id;
    if(!accountId){
      const email=str(discord.email,200).toLowerCase();
      if(!discord.verified||!/^\S+@\S+\.\S+$/.test(email))return finish(req,'/entrar?discord=verify-email');
      if(await db().prepare('SELECT id FROM users WHERE email=?').bind(email).first())return finish(req,'/entrar?discord=link-required');
      accountId=id();
      const ownerEmail=process.env.ARENA_ADMIN_EMAIL?.trim().toLowerCase(),ownerNickname=(process.env.ARENA_ADMIN_NICKNAME||ownerEmail?.split('@')[0]||'').trim().toLowerCase(),username=email===ownerEmail?ownerNickname:await uniqueUsername(email.split('@')[0],async(candidate)=>!!await db().prepare('SELECT id FROM users WHERE username=?').bind(candidate).first()),role=email===ownerEmail?'admin':'player';
      await db().prepare('INSERT INTO users(id,username,email,password,email_login_enabled,email_verified,name,discord_id,role,created_at) VALUES(?,?,?,?,0,1,?,?,?,?)').bind(accountId,username,email,await hashPassword(crypto.randomUUID()),str(discord.global_name||discord.username,80)||username,discord.id,role,Date.now()).run();
    }
    const session=id();await db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(session,accountId,Date.now()+30*86400000).run();
    return finish(req,'/perfil?discord=connected',session);
  }catch(e){console.error('Discord OAuth',e);return finish(req,'/entrar?discord=failed')}
}
