import {db} from './postgres';

export const ADMIN_PERMISSIONS=[
  'manage_tournaments',
  'manage_payments',
  'manage_results',
  'manage_settings',
  'manage_community',
] as const;
export type AdminPermission=typeof ADMIN_PERMISSIONS[number];

export function isOwnerAccount(user:any){
  const ownerEmail=process.env.ARENA_ADMIN_EMAIL?.trim().toLowerCase();
  return !!user&&user.role==='admin'&&!!ownerEmail&&String(user.email).toLowerCase()===ownerEmail;
}

export async function permissionsFor(user:any):Promise<AdminPermission[]>{
  if(!user||user.role!=='admin')return [];
  if(isOwnerAccount(user))return [...ADMIN_PERMISSIONS];
  const rows=await db().prepare('SELECT permission FROM admin_permissions WHERE user_id=?').bind(user.id).all<any>();
  return rows.results.map((row:any)=>row.permission).filter((value:unknown):value is AdminPermission=>ADMIN_PERMISSIONS.includes(value as AdminPermission));
}

export async function canAdmin(user:any,permission:AdminPermission){
  return user?.role==='admin'&&(isOwnerAccount(user)||(await permissionsFor(user)).includes(permission));
}