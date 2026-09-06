import { env } from 'cloudflare:workers';
import { cookies } from 'next/headers';
import { type Member } from './access';
import { sessionTokenHash } from './password';

export function database() { return env.DB; }
export async function member(): Promise<Member | null> {
  const token = (await cookies()).get('avanca_session')?.value;
  if (!token) return null;
  const db = database();
  return await db.prepare('SELECT u.id,u.email,u.name,u.role,u.active,u.department,u.access_scope FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.id=? AND s.expires_at>? AND u.active=1').bind(await sessionTokenHash(token),new Date().toISOString()).first<Member>();
}
export function event(user: Member, action: string, detail: unknown) {
  return database().prepare('INSERT INTO audit (actor,action,detail,created_at) VALUES (?,?,?,?)').bind(user.name,action,JSON.stringify(detail),new Date().toISOString());
}
