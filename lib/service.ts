import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '@/app/chatgpt-auth';
import { type Member } from './access';

export function database() { return env.DB; }
export async function member(): Promise<Member | null> {
  const identity = await getChatGPTUser();
  if (!identity) return null;
  const email = identity.email.toLowerCase().trim();
  const db = database();
  const owner = (env as unknown as Record<string,string>).ADMIN_EMAIL;
  if (owner && email === owner.toLowerCase().trim()) {
    await db.prepare("INSERT INTO users (id,email,name,role,active,created_at) VALUES (?,?,?,'admin',1,?) ON CONFLICT(email) DO NOTHING").bind(crypto.randomUUID(),email,identity.displayName,new Date().toISOString()).run();
  }
  return await db.prepare('SELECT id,email,name,role,active FROM users WHERE email=? AND active=1').bind(email).first<Member>();
}
export function event(user: Member, action: string, detail: unknown) {
  return database().prepare('INSERT INTO audit (actor,action,detail,created_at) VALUES (?,?,?,?)').bind(user.name,action,JSON.stringify(detail),new Date().toISOString());
}
