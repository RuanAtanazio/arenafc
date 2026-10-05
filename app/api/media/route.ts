import {NextRequest,NextResponse} from 'next/server';
import {put} from '@vercel/blob';
import {currentUser,db,id} from '@/lib/arena';

export const runtime='nodejs';

export async function GET(req:NextRequest){
  const raw=new URL(req.url).searchParams.get('key')||'';
  try{
    const url=new URL(raw);
    if(url.protocol!=='https:'||!url.hostname.endsWith('.public.blob.vercel-storage.com'))return new Response('Imagem não encontrada',{status:404});
    return NextResponse.redirect(url,{headers:{'cache-control':'public, max-age=3600','x-content-type-options':'nosniff'}});
  }catch{return new Response('Imagem não encontrada',{status:404})}
}

export async function POST(req:NextRequest){
  const user=await currentUser();
  if(!user)return NextResponse.json({error:'Entre na sua conta.'},{status:401});
  const form=await req.formData(),file=form.get('file'),target=String(form.get('target')||'');
  if(!(file instanceof File)||!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024||file.size<100)return NextResponse.json({error:'Envie PNG, JPEG ou WebP de até 2 MB.'},{status:400});
  const bytes=new Uint8Array(await file.arrayBuffer());
  const png=bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71,jpg=bytes[0]===255&&bytes[1]===216,webp=String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP';
  if(!((file.type==='image/png'&&png)||(file.type==='image/jpeg'&&jpg)||(file.type==='image/webp'&&webp)))return NextResponse.json({error:'Arquivo de imagem inválido.'},{status:400});
  const ext=png?'png':jpg?'jpg':'webp';
  let key:string,clubId='';
  if(target==='crest'){
    clubId=String(form.get('clubId')||'');
    const club=await db().prepare('SELECT id FROM clubs WHERE id=? AND owner_id=?').bind(clubId,user.id).first();
    if(!club)return NextResponse.json({error:'Time não encontrado.'},{status:403});
    key=`crest/${id()}.${ext}`;
  }else if(target==='avatar')key=`avatar/${id()}.${ext}`;
  else return NextResponse.json({error:'Destino inválido.'},{status:400});
  const blob=await put(key,Buffer.from(bytes),{access:'public',contentType:file.type,addRandomSuffix:false});
  if(target==='crest')await db().prepare('UPDATE clubs SET crest_key=? WHERE id=?').bind(blob.url,clubId).run();
  else await db().prepare('UPDATE users SET avatar_key=? WHERE id=?').bind(blob.url,user.id).run();
  return NextResponse.json({message:'Imagem atualizada.',key:blob.url});
}
