import { database, member, event } from '@/lib/service';
import { canEdit, isManager, validRole, type Member } from '@/lib/access';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
export async function GET() {
  try {
    const me = await member();
    if (!me) return reply({error:'Seu e-mail ainda não foi cadastrado ou seu acesso está desativado.'},403);
    const db = database(), manager = isManager(me);
    const tasks = await db.prepare('SELECT t.*,u.name AS employee_name,r.proactivity,r.comment FROM tasks t JOIN users u ON u.id=t.employee_id LEFT JOIN reviews r ON r.task_id=t.id '+(manager?'':'WHERE t.employee_id=? ')+'ORDER BY t.id DESC').bind(...(manager?[]:[me.id])).all();
    const goals = await db.prepare('SELECT g.*,u.name AS employee_name FROM goals g JOIN users u ON u.id=g.employee_id '+(manager?'':'WHERE g.employee_id=? ')+'ORDER BY g.id DESC').bind(...(manager?[]:[me.id])).all();
    const users = manager ? (await db.prepare('SELECT id,email,name,role,active FROM users ORDER BY name').all()).results : [me];
    const history = manager ? (await db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()).results : [];
    return reply({me,tasks:tasks.results,goals:goals.results,users,history});
  } catch { return reply({error:'Não foi possível carregar os dados. Tente novamente.'},500); }
}

function str(value: unknown, max=300) { if(typeof value !== 'string' || !value.trim() || value.length>max) throw Error('Preencha os campos corretamente.'); return value.trim(); }
function date(value: unknown) { const result=str(value,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||Number.isNaN(Date.parse(result))) throw Error('Informe uma data válida.'); return result; }
export async function POST(request: Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return reply({error:'Origem não permitida.'},403);
  try {
    const me=await member();
    if(!me) return reply({error:'Acesso não autorizado.'},403);
    const b=await request.json() as Record<string,unknown>, db=database(), now=new Date().toISOString();
    const manager=isManager(me);
    if(b.action==='user') {
      if(me.role!=='admin') return reply({error:'Somente o administrador pode definir os perfis.'},403);
      const name=str(b.name),email=str(b.email).toLowerCase(),role=b.role;
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validRole(role)) throw Error('E-mail ou perfil inválido.');
      const existing=await db.prepare('SELECT * FROM users WHERE email=?').bind(email).first<Member>();
      if(existing?.role==='admin') throw Error('A conta administradora não pode ser alterada aqui.');
      const active=b.active===false?0:1;
      await db.batch([db.prepare('INSERT INTO users (id,email,name,role,active,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(email) DO UPDATE SET name=excluded.name,role=excluded.role,active=excluded.active').bind(crypto.randomUUID(),email,name,role,active,now),event(me,'Usuário atualizado',{name,email,role,active})]);
    } else if(b.action==='create'||b.action==='goal') {
      if(!manager) return reply({error:'Somente gestores podem atribuir atividades e metas.'},403);
      const title=str(b.title),employeeId=str(b.employeeId),due=date(b.due);
      const target=await db.prepare("SELECT id FROM users WHERE id=? AND active=1 AND role='employee'").bind(employeeId).first();
      if(!target) throw Error('Selecione um funcionário ativo.');
      if(b.action==='create') await db.batch([db.prepare('INSERT INTO tasks (employee_id,created_by,title,due_date,created_at) VALUES (?,?,?,?,?)').bind(employeeId,me.id,title,due,now),event(me,'Atividade criada',{title,employeeId,due})]);
      else {
        const target=Number(b.target); if(!Number.isInteger(target)||target<1||target>100000) throw Error('A meta deve ser um número positivo.');
        await db.batch([db.prepare('INSERT INTO goals (employee_id,created_by,title,target,due_date,created_at) VALUES (?,?,?,?,?,?)').bind(employeeId,me.id,title,target,due,now),event(me,'Meta definida',{title,employeeId,target,due})]);
      }
    } else if(b.action==='edit'||b.action==='complete'||b.action==='review') {
      const id=Number(b.id); if(!Number.isInteger(id)) throw Error('Atividade inválida.');
      const task=await db.prepare('SELECT * FROM tasks WHERE id=?').bind(id).first<{employee_id:string;title:string;completion_notes:string;status:string}>();
      if(!task||!canEdit(me,task)) return reply({error:'Atividade não encontrada ou acesso negado.'},403);
      if(b.action==='edit') {
        const title=str(b.title),notes=typeof b.notes==='string'?b.notes:''; if(notes.length>5000) throw Error('O registro deve ter até 5.000 caracteres.');
        await db.batch([db.prepare("UPDATE tasks SET title=?,completion_notes=?,status=CASE WHEN status='reviewed' THEN 'completed' ELSE status END WHERE id=?").bind(title,notes,id),db.prepare('DELETE FROM reviews WHERE task_id=?').bind(id),event(me,'Atividade editada',{id,before:{title:task.title,notes:task.completion_notes},after:{title,notes}})]);
      } else if(b.action==='complete') {
        if(task.status==='completed'||task.status==='reviewed') return reply({ok:true});
        await db.batch([db.prepare("UPDATE tasks SET status='completed',completed_at=? WHERE id=?").bind(now,id),event(me,'Atividade concluída',{id,title:task.title})]);
      } else {
        if(!manager) return reply({error:'Somente gestores podem avaliar.'},403);
        const score=Number(b.score),comment=typeof b.comment==='string'?b.comment:'';
        if(!Number.isInteger(score)||score<1||score>5||comment.length>5000) throw Error('A nota deve ser de 1 a 5.');
        if(task.status!=='completed'&&task.status!=='reviewed') throw Error('A atividade ainda não foi concluída.');
        await db.batch([db.prepare('INSERT INTO reviews (task_id,manager_id,proactivity,comment,created_at) VALUES (?,?,?,?,?) ON CONFLICT(task_id) DO UPDATE SET manager_id=excluded.manager_id,proactivity=excluded.proactivity,comment=excluded.comment,created_at=excluded.created_at').bind(id,me.id,score,comment,now),db.prepare("UPDATE tasks SET status='reviewed' WHERE id=?").bind(id),event(me,'Atividade avaliada',{id,title:task.title,score,comment})]);
      }
    } else throw Error('Ação inválida.');
    return reply({ok:true});
  } catch(error) { return reply({error: error instanceof Error && !/D1|SQLITE|database/i.test(error.message)?error.message:'Não foi possível salvar. Tente novamente.'},400); }
}
