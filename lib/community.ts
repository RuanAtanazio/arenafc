export function inviteUrl(value:string,kind:'whatsapp'|'discord'){
  if(!value)return '';
  try{
    const u=new URL(value);
    if(u.protocol!=='https:'||u.username||u.password||u.port)return null;
    if(kind==='whatsapp'&&u.hostname==='chat.whatsapp.com'&&u.pathname.length>1)return u.toString();
    if(kind==='discord'&&(u.hostname==='discord.gg'&&u.pathname.length>1||u.hostname==='discord.com'&&u.pathname.startsWith('/invite/')&&u.pathname.length>8))return u.toString();
  }catch{}
  return null;
}
