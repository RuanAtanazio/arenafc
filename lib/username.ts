const USERNAME_PATTERN=/^[a-z0-9][a-z0-9_.-]{2,29}$/;

export function normalizeUsername(value:string){
  return value.trim().toLowerCase();
}

export function isValidUsername(value:string){
  return USERNAME_PATTERN.test(value);
}

export async function uniqueUsername(value:string,exists:(username:string)=>Promise<boolean>){
  const base=normalizeUsername(value).replace(/[^a-z0-9_.-]+/g,'_').replace(/^[^a-z0-9]+/,'').slice(0,21)||'jogador';
  if(base.length>=3&&!await exists(base))return base;
  for(let attempt=0;attempt<8;attempt++){
    const suffix=crypto.randomUUID().replace(/-/g,'').slice(0,7);
    const candidate=`${base.slice(0,21)}_${suffix}`;
    if(!await exists(candidate))return candidate;
  }
  throw new Error('Não foi possível gerar um nickname exclusivo. Tente novamente.');
}
