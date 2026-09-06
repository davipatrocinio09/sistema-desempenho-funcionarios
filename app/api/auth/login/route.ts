import { env } from 'cloudflare:workers';
import { database, event } from '@/lib/service';
import { randomSessionToken, sessionTokenHash, verifyPassword } from '@/lib/password';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
const settings = () => env as unknown as Record<string,string|undefined>;

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return reply({error:'Origem não permitida.'},403);
  try {
    const body = await request.json() as Record<string,unknown>;
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim().slice(0,320) : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const db = database(), now = new Date(), nowIso = now.toISOString();
    const attempt = await db.prepare('SELECT attempts,window_start,locked_until FROM login_attempts WHERE email=?').bind(email).first<{attempts:number;window_start:string;locked_until:string|null}>();
    if (attempt?.locked_until && attempt.locked_until > nowIso) return reply({error:'Muitas tentativas. Aguarde 15 minutos e tente novamente.'},429);

    type LoginUser={id:string;email:string;name:string;role:string;active:number;password_hash:string|null;password_salt:string|null};
    let user = await db.prepare('SELECT id,email,name,role,active,password_hash,password_salt FROM users WHERE email=?').bind(email).first<LoginUser>();
    const config = settings(), adminEmail = config.ADMIN_EMAIL?.toLowerCase().trim();
    if (email && email === adminEmail && config.ADMIN_PASSWORD_HASH && config.ADMIN_PASSWORD_SALT) {
      await db.prepare("INSERT INTO users (id,email,name,role,active,password_hash,password_salt,created_at) VALUES (?,?,?,'admin',1,?,?,?) ON CONFLICT(email) DO UPDATE SET role='admin',active=1,password_hash=excluded.password_hash,password_salt=excluded.password_salt").bind(crypto.randomUUID(),email,'Administrador',config.ADMIN_PASSWORD_HASH,config.ADMIN_PASSWORD_SALT,nowIso).run();
      user = await db.prepare('SELECT id,email,name,role,active,password_hash,password_salt FROM users WHERE email=?').bind(email).first<LoginUser>();
    }
    const valid = !!(user?.active && user.password_hash && user.password_salt && password.length <= 200 && await verifyPassword(password,user.password_hash,user.password_salt));
    if (!valid) {
      const fresh = !attempt || Date.parse(attempt.window_start) < now.getTime()-15*60_000;
      const attempts = fresh ? 1 : attempt.attempts+1;
      const lockedUntil = attempts >= 5 ? new Date(now.getTime()+15*60_000).toISOString() : null;
      await db.prepare('INSERT INTO login_attempts (email,attempts,window_start,locked_until) VALUES (?,?,?,?) ON CONFLICT(email) DO UPDATE SET attempts=excluded.attempts,window_start=excluded.window_start,locked_until=excluded.locked_until').bind(email,attempts,fresh?nowIso:attempt!.window_start,lockedUntil).run();
      return reply({error:'E-mail ou senha inválidos.'},401);
    }
    const authenticatedUser = user!;
    await db.prepare('DELETE FROM login_attempts WHERE email=?').bind(email).run();
    const token = randomSessionToken(), expires = new Date(now.getTime()+7*24*60*60_000);
    await db.batch([
      db.prepare('DELETE FROM sessions WHERE expires_at<=?').bind(nowIso),
      db.prepare('INSERT INTO sessions (id,user_id,expires_at,created_at) VALUES (?,?,?,?)').bind(await sessionTokenHash(token),authenticatedUser.id,expires.toISOString(),nowIso),
      event(authenticatedUser,'Login realizado',{email:authenticatedUser.email}),
    ]);
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    return reply({ok:true},200,{'Set-Cookie':`avanca_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secure}`});
  } catch (error) { console.error('Login failed',error); return reply({error:'Não foi possível entrar. Tente novamente.'},400); }
}
