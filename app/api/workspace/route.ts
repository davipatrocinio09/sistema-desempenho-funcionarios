import { database, member, event } from '@/lib/service';
import { canEdit, canManageDepartment, hasAllDepartments, isManager, validRole, type Member } from '@/lib/access';
import { hashPassword, validatePassword } from '@/lib/password';

export const dynamic = 'force-dynamic';
const reply = (body: unknown, status = 200) => Response.json(body, {status, headers:{'Cache-Control':'no-store'}});
export async function GET() {
  try {
    const me = await member();
    if (!me) return reply({error:'Faça login para continuar.'},401);
    const db = database(), manager = isManager(me), allDepartments = hasAllDepartments(me);
    const taskFilter=allDepartments?'':manager?'WHERE u.department=? ':'WHERE t.employee_id=? ', taskArg=manager?me.department:me.id;
    const tasks = await db.prepare('SELECT t.*,u.name AS employee_name,u.department FROM tasks t JOIN users u ON u.id=t.employee_id '+taskFilter+'ORDER BY t.id DESC').bind(...(allDepartments?[]:[taskArg])).all();
    const goalFilter=allDepartments?'':manager?'WHERE u.department=? ':'WHERE g.employee_id=? ';
    const goals = await db.prepare('SELECT g.*,u.name AS employee_name,u.department FROM goals g JOIN users u ON u.id=g.employee_id '+goalFilter+'ORDER BY g.id DESC').bind(...(allDepartments?[]:[taskArg])).all();
    const users = manager ? (await db.prepare('SELECT id,email,name,role,active,department,access_scope FROM users '+(allDepartments?'':'WHERE department=? ')+'ORDER BY name').bind(...(allDepartments?[]:[me.department])).all()).results : [me];
    const history = allDepartments ? (await db.prepare('SELECT * FROM audit ORDER BY id DESC LIMIT 200').all()).results : [];
    return reply({me,tasks:tasks.results,goals:goals.results,users,history});
  } catch { return reply({error:'Não foi possível carregar os dados. Tente novamente.'},500); }
}

function str(value: unknown, max=300) { if(typeof value !== 'string' || !value.trim() || value.length>max) throw Error('Preencha os campos corretamente.'); return value.trim(); }
function date(value: unknown) { const result=str(value,10); if(!/^\d{4}-\d{2}-\d{2}$/.test(result)||Number.isNaN(Date.parse(result))) throw Error('Informe uma data válida.'); return result; }
export async function POST(request: Request) {
  if(request.headers.get('origin')!==new URL(request.url).origin) return reply({error:'Origem não permitida.'},403);
  try {
    const me=await member();
    if(!me) return reply({error:'Acesso não autorizado.'},401);
    const b=await request.json() as Record<string,unknown>, db=database(), now=new Date().toISOString();
    const manager=isManager(me);
    if(b.action==='user') {
      if(me.role!=='admin') return reply({error:'Somente o administrador pode definir os perfis.'},403);
      const name=str(b.name),email=str(b.email).toLowerCase(),role=b.role,department=str(b.department,80),accessScope=role==='manager'&&b.accessScope==='all'?'all':'own';
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validRole(role)) throw Error('E-mail ou perfil inválido.');
      const existing=await db.prepare('SELECT id,email,name,role,active,password_hash,department,access_scope FROM users WHERE email=?').bind(email).first<Member&{password_hash:string|null}>();
      if(existing?.role==='admin') throw Error('A conta administradora não pode ser alterada aqui.');
      const active=b.active===false?0:1;
      const password=typeof b.password==='string'&&b.password?validatePassword(b.password):null;
      if(!existing&&!password) throw Error('Defina uma senha inicial para o novo usuário.');
      const credentials=password?await hashPassword(password):null;
      if(existing) {
        const statements=[credentials
          ? db.prepare('UPDATE users SET name=?,role=?,active=?,department=?,access_scope=?,password_hash=?,password_salt=? WHERE id=?').bind(name,role,active,department,accessScope,credentials.hash,credentials.salt,existing.id)
          : db.prepare('UPDATE users SET name=?,role=?,active=?,department=?,access_scope=? WHERE id=?').bind(name,role,active,department,accessScope,existing.id),
          event(me,'Usuário atualizado',{name,email,role,department,accessScope,active,passwordChanged:!!credentials})];
        if(credentials||existing.role!==role||existing.active!==active||existing.department!==department||existing.access_scope!==accessScope)statements.push(db.prepare('DELETE FROM sessions WHERE user_id=?').bind(existing.id));
        await db.batch(statements);
      } else await db.batch([db.prepare('INSERT INTO users (id,email,name,role,active,password_hash,password_salt,department,access_scope,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),email,name,role,active,credentials!.hash,credentials!.salt,department,accessScope,now),event(me,'Usuário cadastrado',{name,email,role,department,accessScope,active})]);
    } else if(b.action==='change_password') {
      const password=validatePassword(b.password), credentials=await hashPassword(password);
      await db.batch([db.prepare('UPDATE users SET password_hash=?,password_salt=? WHERE id=?').bind(credentials.hash,credentials.salt,me.id),db.prepare('DELETE FROM sessions WHERE user_id=?').bind(me.id),event(me,'Senha alterada',{userId:me.id})]);
      return reply({ok:true,forceLogout:true});
    } else if(b.action==='create'||b.action==='goal') {
      if(!manager) return reply({error:'Somente gestores podem atribuir atividades e metas.'},403);
      const title=str(b.title),employeeId=str(b.employeeId),due=date(b.due);
      const target=await db.prepare("SELECT id,department FROM users WHERE id=? AND active=1 AND role='employee'").bind(employeeId).first<{id:string;department:string}>();
      if(!target||!canManageDepartment(me,target.department)) throw Error('Selecione um funcionário do setor autorizado.');
      if(b.action==='create') await db.batch([db.prepare('INSERT INTO tasks (employee_id,created_by,title,due_date,created_at) VALUES (?,?,?,?,?)').bind(employeeId,me.id,title,due,now),event(me,'Atividade criada',{title,employeeId,due})]);
      else {
        const target=Number(b.target); if(!Number.isInteger(target)||target<1||target>100000) throw Error('A meta deve ser um número positivo.');
        await db.batch([db.prepare('INSERT INTO goals (employee_id,created_by,title,target,due_date,created_at) VALUES (?,?,?,?,?,?)').bind(employeeId,me.id,title,target,due,now),event(me,'Meta definida',{title,employeeId,target,due})]);
      }
    } else if(b.action==='edit'||b.action==='complete') {
      const id=Number(b.id); if(!Number.isInteger(id)) throw Error('Atividade inválida.');
      const task=await db.prepare('SELECT t.*,u.department FROM tasks t JOIN users u ON u.id=t.employee_id WHERE t.id=?').bind(id).first<{employee_id:string;title:string;completion_notes:string;status:string;department:string}>();
      if(!task||!canEdit(me,task)) return reply({error:'Atividade não encontrada ou acesso negado.'},403);
      if(b.action==='edit') {
        const title=str(b.title),notes=typeof b.notes==='string'?b.notes:''; if(notes.length>5000) throw Error('O registro deve ter até 5.000 caracteres.');
        await db.batch([db.prepare("UPDATE tasks SET title=?,completion_notes=?,status=CASE WHEN status='reviewed' THEN 'completed' ELSE status END WHERE id=?").bind(title,notes,id),event(me,'Atividade editada',{id,before:{title:task.title,notes:task.completion_notes},after:{title,notes}})]);
      } else if(b.action==='complete') {
        if(task.status==='completed'||task.status==='reviewed') return reply({ok:true});
        await db.batch([db.prepare("UPDATE tasks SET status='completed',completed_at=? WHERE id=?").bind(now,id),event(me,'Atividade concluída',{id,title:task.title})]);
      }
    } else throw Error('Ação inválida.');
    return reply({ok:true});
  } catch(error) { return reply({error: error instanceof Error && !/D1|SQLITE|database/i.test(error.message)?error.message:'Não foi possível salvar. Tente novamente.'},400); }
}
