import {NextRequest,NextResponse} from 'next/server';
import {db,hashPassword,id,str} from '@/lib/arena';

export const runtime='nodejs';

function finish(req:NextRequest,status:string,session?:string){
  const response=NextResponse.redirect(new URL(`/entrar?google=${encodeURIComponent(status)}`,req.url));
  response.cookies.set('google_state','',{httpOnly:true,secure:true,sameSite:'lax',path:'/api/google',maxAge:0});
  if(session)response.cookies.set('arena_session',session,{httpOnly:true,secure:true,sameSite:'lax',path:'/',maxAge:30*86400});
  return response;
}

export async function GET(req:NextRequest){
  const state=req.cookies.get('google_state')?.value,code=req.nextUrl.searchParams.get('code');
  if(!state||req.nextUrl.searchParams.get('state')!==state)return finish(req,'invalid');
  if(req.nextUrl.searchParams.has('error')||!code)return finish(req,'cancelled');
  const clientId=process.env.GOOGLE_CLIENT_ID,clientSecret=process.env.GOOGLE_CLIENT_SECRET;
  if(!clientId||!clientSecret)return finish(req,'unavailable');
  try{
    const redirectUri=new URL('/api/google/callback',req.url).toString();
    const tokenResponse=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:clientId,client_secret:clientSecret,code,grant_type:'authorization_code',redirect_uri:redirectUri})});
    if(!tokenResponse.ok)return finish(req,'failed');
    const token=await tokenResponse.json() as {access_token?:string};
    if(!token.access_token)return finish(req,'failed');
    const profileResponse=await fetch('https://openidconnect.googleapis.com/v1/userinfo',{headers:{authorization:`Bearer ${token.access_token}`}});
    if(!profileResponse.ok)return finish(req,'failed');
    const profile=await profileResponse.json() as {sub?:string;email?:string;email_verified?:boolean;name?:string};
    const email=str(profile.email,200).toLowerCase();
    if(!profile.sub||profile.email_verified!==true||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return finish(req,'unverified');

    const ownerEmail=process.env.ARENA_ADMIN_EMAIL?.trim().toLowerCase();
    let account=await db().prepare('SELECT id,role FROM users WHERE email=?').bind(email).first<any>();
    const invite=await db().prepare('SELECT email FROM admin_invites WHERE email=?').bind(email).first<any>();
    const owner=email===ownerEmail;
    if(!account){
      const accountId=id(),session=id(),role=owner||invite?'admin':'player';
      const statements=[
        db().prepare('INSERT INTO users(id,email,password,email_login_enabled,email_verified,name,role,created_at) VALUES(?,?,?,0,1,?,?,?)').bind(accountId,email,await hashPassword(crypto.randomUUID()),str(profile.name,80)||'Jogador',role,Date.now()),
        db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(session,accountId,Date.now()+30*86400000),
      ];
      if(invite)statements.push(db().prepare('DELETE FROM admin_invites WHERE email=?').bind(email));
      await db().batch(statements);
      return finish(req,'connected',session);
    }

    const statements=[];
    if(owner||invite||account.role==='admin')statements.push(db().prepare("UPDATE users SET email_verified=1,role=CASE WHEN ? THEN 'admin' ELSE role END WHERE id=?").bind(owner||!!invite,account.id));
    else statements.push(db().prepare('UPDATE users SET email_verified=1 WHERE id=?').bind(account.id));
    const session=id();
    statements.push(db().prepare('INSERT INTO sessions VALUES(?,?,?)').bind(session,account.id,Date.now()+30*86400000));
    if(invite)statements.push(db().prepare('DELETE FROM admin_invites WHERE email=?').bind(email));
    await db().batch(statements);
    return finish(req,'connected',session);
  }catch(error){
    console.error('Google OAuth callback failed',error);
    return finish(req,'failed');
  }
}
