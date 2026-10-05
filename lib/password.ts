// Cloudflare Workers caps WebCrypto PBKDF2 at 100,000 iterations.
export const PASSWORD_ITERATIONS=100000;

export async function hashPassword(password:string,salt?:string){
  salt??=crypto.randomUUID();
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:new TextEncoder().encode(salt),iterations:PASSWORD_ITERATIONS,hash:'SHA-256'},key,256);
  return salt+':'+Array.from(new Uint8Array(bits)).map(v=>v.toString(16).padStart(2,'0')).join('');
}
