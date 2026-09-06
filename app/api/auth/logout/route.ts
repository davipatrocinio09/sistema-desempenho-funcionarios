import { cookies } from 'next/headers';
import { database } from '@/lib/service';
import { sessionTokenHash } from '@/lib/password';

export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return Response.json({error:'Origem não permitida.'},{status:403});
  const token = (await cookies()).get('avanca_session')?.value;
  if (token) await database().prepare('DELETE FROM sessions WHERE id=?').bind(await sessionTokenHash(token)).run();
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return Response.json({ok:true},{headers:{'Cache-Control':'no-store','Set-Cookie':`avanca_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`}});
}
