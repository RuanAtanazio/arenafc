import {NextRequest,NextResponse} from 'next/server';

export const runtime='nodejs';

export async function GET(req:NextRequest){
  const clientId=process.env.GOOGLE_CLIENT_ID;
  if(!clientId)return NextResponse.redirect(new URL('/entrar?google=unavailable',req.url));
  const state=crypto.randomUUID(),redirectUri=new URL('/api/google/callback',req.url).toString();
  const authorization=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authorization.searchParams.set('client_id',clientId);
  authorization.searchParams.set('redirect_uri',redirectUri);
  authorization.searchParams.set('response_type','code');
  authorization.searchParams.set('scope','openid email profile');
  authorization.searchParams.set('state',state);
  authorization.searchParams.set('prompt','select_account');
  const response=NextResponse.redirect(authorization);
  response.cookies.set('google_state',state,{httpOnly:true,secure:true,sameSite:'lax',path:'/api/google',maxAge:600});
  return response;
}
