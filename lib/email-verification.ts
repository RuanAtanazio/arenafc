const encoder=new TextEncoder();

export async function verificationCodeHash(email:string,code:string){
  const secret=process.env.EMAIL_CODE_SECRET||'';
  if(secret.length<32)throw new Error('EMAIL_CODE_SECRET precisa ter pelo menos 32 caracteres.');
  const digest=await crypto.subtle.digest('SHA-256',encoder.encode(`${secret}:${email}:${code}`));
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}

export async function sendVerificationCode(email:string,code:string){
  const apiKey=process.env.RESEND_API_KEY,from=process.env.RESEND_FROM_EMAIL;
  if(!apiKey||!from)throw new Error('Configure RESEND_API_KEY e RESEND_FROM_EMAIL.');
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{authorization:`Bearer ${apiKey}`,'content-type':'application/json'},body:JSON.stringify({from,to:[email],subject:'Seu código de confirmação Arena FC',text:`Seu código Arena FC é ${code}. Ele expira em 10 minutos. Se você não solicitou este cadastro, ignore esta mensagem.`})});
  if(!response.ok)throw new Error(`Falha ao enviar e-mail de confirmação (${response.status}).`);
}