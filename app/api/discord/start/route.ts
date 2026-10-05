import {NextRequest,NextResponse} from 'next/server';
import {currentUser} from '@/lib/arena';

export async function GET(req:NextRequest){
  const cid=process.env.DISCORD_CLIENT_ID,secret=process.env.DISCORD_CLIENT_SECRET;
  if(!cid||!secret)return NextResponse.redirect(new URL('/entrar?discord=unavailable',req.url));
  const mode=req.nextUrl.searchParams.get('mode')==='link'?'link':'login';
  if(mode==='link'&&!await currentUser())return NextResponse.redirect(new URL('/entrar?discord=login-required',req.url));
  const state=crypto.randomUUID(),redirect=new URL('/api/discord/callback',req.url).toString();
  const url=new URL('https://discord.com/oauth2/authorize');
  url.searchParams.set('client_id',cid);
  url.searchParams.set('response_type','code');
  url.searchParams.set('redirect_uri',redirect);
  url.searchParams.set('scope','identify email');
  url.searchParams.set('state',state);
  const res=NextResponse.redirect(url);
  for(const [name,value] of [['discord_state',state],['discord_mode',mode]])res.cookies.set(name,value,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/discord',maxAge:600});
  return res;
}
