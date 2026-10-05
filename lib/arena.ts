import {cookies} from 'next/headers';
import {db} from './postgres';
export {hashPassword} from './password';
export {db};
export async function currentUser(){const token=(await cookies()).get('arena_session')?.value;if(!token)return null;return await db().prepare('SELECT u.id,u.username,COALESCE(u.email,u.username) as email,u.name,u.ea_id as eaId,u.discord_id as discordId,u.avatar_key as avatarKey,u.email_login_enabled as emailLoginEnabled,u.role,u.email_verified as emailVerified FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>?').bind(token,Date.now()).first<any>()}
export function id(){return crypto.randomUUID()}
export function str(x:any,n=100){return typeof x==='string'?x.trim().slice(0,n):''}
