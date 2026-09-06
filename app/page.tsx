'use client';

import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, LayoutDashboard, ListChecks, LockKeyhole, Plus, Search, Sparkles, Target, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';

type Role = 'gestor' | 'funcionario';
const people = [
  { name: 'Marina Costa', initials: 'MC', role: 'Analista de Operações', done: 18, rate: 92, color: '#e7a93f' },
  { name: 'Rafael Lima', initials: 'RL', role: 'Designer de Produto', done: 15, rate: 86, color: '#5d84d6' },
  { name: 'Ana Souza', initials: 'AS', role: 'Assistente Comercial', done: 13, rate: 78, color: '#d66c77' },
  { name: 'Bruno Alves', initials: 'BA', role: 'Analista Financeiro', done: 11, rate: 71, color: '#42a58e' },
];
const initialTasks = [
  { id: 1, title: 'Atualizar relatório mensal de vendas', owner: 'Marina Costa', due: 'Hoje, 17:00', status: 'em_andamento', tag: 'Relatórios' },
  { id: 2, title: 'Revisar cadastro de novos clientes', owner: 'Marina Costa', due: 'Amanhã, 12:00', status: 'pendente', tag: 'Operações' },
  { id: 3, title: 'Organizar documentos do fechamento', owner: 'Marina Costa', due: '08 set', status: 'pendente', tag: 'Financeiro' },
  { id: 4, title: 'Mapear melhorias no fluxo de atendimento', owner: 'Marina Costa', due: 'Concluída hoje', status: 'concluida', tag: 'Melhoria' },
];

export default function Home() {
  const [role, setRole] = useState<Role>('gestor');
  const [tasks, setTasks] = useState(initialTasks);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [newTask, setNewTask] = useState({ title: '', due: '', owner: 'Marina Costa' });
  const employee = role === 'funcionario';
  const completed = useMemo(() => tasks.filter((task) => task.status === 'concluida').length, [tasks]);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = (tool: unknown) => Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined);
    void register({
      name: 'create_activity', title: 'Criar atividade',
      description: 'Cria e atribui uma nova atividade a um funcionário com prazo opcional.',
      inputSchema: { type: 'object', properties: { title: { type: 'string' }, owner: { type: 'string' }, due: { type: 'string' } }, required: ['title', 'owner'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const value = input as { title?: string; owner?: string; due?: string };
        if (!value.title?.trim() || !value.owner?.trim()) throw new Error('Título e funcionário são obrigatórios.');
        const id = Date.now();
        setTasks((current) => [{ id, title: value.title!.trim(), owner: value.owner!.trim(), due: value.due?.trim() || 'Sem prazo', status: 'pendente', tag: 'Nova meta' }, ...current]);
        return { id, status: 'pendente' };
      },
    });
    void register({
      name: 'complete_activity', title: 'Concluir atividade',
      description: 'Marca uma atividade existente como concluída e a envia para avaliação do gestor.',
      inputSchema: { type: 'object', properties: { id: { type: 'number' } }, required: ['id'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input: unknown) {
        const id = (input as { id?: number }).id;
        if (!Number.isFinite(id) || !tasks.some((task) => task.id === id)) throw new Error('Atividade não encontrada.');
        setTasks((current) => current.map((task) => task.id === id ? { ...task, status: 'concluida', due: 'Enviada para avaliação' } : task));
        return { id, status: 'concluida', awaitingReview: true };
      },
    });
    return () => lifecycle.abort();
  }, [tasks]);

  function toggleTask(id: number) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, status: task.status === 'concluida' ? 'pendente' : 'concluida', due: task.status === 'concluida' ? 'Hoje, 17:00' : 'Enviada para avaliação' } : task));
    setNotice('Atividade atualizada e o gestor foi avisado.');
    window.setTimeout(() => setNotice(''), 3200);
  }
  function addTask() {
    if (!newTask.title.trim()) return;
    setTasks((current) => [{ id: Date.now(), title: newTask.title, owner: newTask.owner, due: newTask.due || 'Sem prazo', status: 'pendente', tag: 'Nova meta' }, ...current]);
    setNewTask({ title: '', due: '', owner: 'Marina Costa' }); setDialogOpen(false); setNotice('Nova atividade atribuída com sucesso.');
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark"><Check size={17} strokeWidth={3}/></span><span>Avança</span></div>
      <nav aria-label="Navegação principal"><p className="nav-label">ESPAÇO DE TRABALHO</p><button className="nav-item active"><LayoutDashboard size={19}/> Visão geral</button><button className="nav-item"><ListChecks size={19}/> Atividades <span className="nav-count">4</span></button><button className="nav-item"><Target size={19}/> Metas</button>{!employee && <button className="nav-item"><Users size={19}/> Equipe</button>}{!employee && <><p className="nav-label space">GESTÃO</p><button className="nav-item"><Sparkles size={19}/> Avaliações <span className="nav-count gold">3</span></button><button className="nav-item"><LockKeyhole size={18}/> Desempenho</button></>}</nav>
      <div className="profile-card"><span className="avatar">{employee ? 'MC' : 'DP'}</span><div><strong>{employee ? 'Marina Costa' : 'Daniel Pereira'}</strong><span>{employee ? 'Analista' : 'Gestor da equipe'}</span></div><ChevronDown size={17}/></div>
    </aside>
    <section className="workspace">
      <header className="topbar"><div className="search"><Search size={18}/><input aria-label="Buscar" placeholder="Buscar atividade ou pessoa..."/></div><div className="top-actions"><div className="role-switch" aria-label="Alternar perfil de demonstração"><button className={role === 'gestor' ? 'selected' : ''} onClick={() => setRole('gestor')}>Gestor</button><button className={role === 'funcionario' ? 'selected' : ''} onClick={() => setRole('funcionario')}>Funcionário</button></div><button className="icon-button" aria-label="Notificações"><Bell size={19}/><span/></button></div></header>
      <div className="page-content">
        <div className="page-heading"><div><p className="eyebrow">SÁBADO, 5 DE SETEMBRO</p><h1>{employee ? 'Olá, Marina.' : 'Bom dia, Daniel.'}</h1><p>{employee ? 'Você tem 3 atividades para concluir esta semana.' : 'Aqui está o ritmo da sua equipe nesta semana.'}</p></div>{!employee && <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogTrigger render={<Button className="primary-button"/>}><Plus size={18}/> Nova atividade</DialogTrigger><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Atribuir nova atividade</DialogTitle></DialogHeader><div className="form-stack"><div><Label htmlFor="task-title">Atividade</Label><Input id="task-title" value={newTask.title} onChange={(e)=>setNewTask({...newTask,title:e.target.value})} placeholder="Ex.: Preparar relatório semanal"/></div><div><Label htmlFor="task-owner">Funcionário</Label><select id="task-owner" value={newTask.owner} onChange={(e)=>setNewTask({...newTask,owner:e.target.value})}>{people.map((p)=><option key={p.name}>{p.name}</option>)}</select></div><div><Label htmlFor="task-due">Prazo</Label><Input id="task-due" type="date" value={newTask.due} onChange={(e)=>setNewTask({...newTask,due:e.target.value})}/></div><Button onClick={addTask} className="primary-button full">Atribuir atividade</Button></div></DialogContent></Dialog>}</div>
        {notice && <div className="toast"><CheckCircle2 size={18}/>{notice}</div>}
        {employee ? <EmployeeView tasks={tasks} completed={completed} toggleTask={toggleTask}/> : <ManagerView tasks={tasks}/>}
      </div>
    </section>
  </main>;
}

function ManagerView({ tasks }: { tasks: typeof initialTasks }) {
  const reviewTasks = tasks.filter(t=>t.status==='concluida').concat([{...tasks[0],id:5,title:'Criar apresentação de resultados',owner:'Rafael Lima'},{...tasks[1],id:6,title:'Conferir propostas comerciais',owner:'Ana Souza'}]).slice(0,3);
  return <><div className="stats-grid"><article className="stat-card featured"><div className="stat-icon"><ListChecks/></div><div><span>Atividades concluídas</span><strong>57</strong><small><b>+12%</b> comparado à semana passada</small></div><div className="mini-bars">{[35,52,42,66,55,88,74].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></article><article className="stat-card"><div className="stat-icon blue"><Clock3/></div><div><span>No prazo</span><strong>89%</strong><small>51 de 57 atividades</small></div></article><article className="stat-card"><div className="stat-icon rose"><Sparkles/></div><div><span>Aguardando avaliação</span><strong>3</strong><small>Precisam da sua atenção</small></div></article></div>
    <div className="dashboard-grid"><section className="panel activity-panel"><div className="panel-head"><div><h2>Atividade da equipe</h2><p>Atividades concluídas nos últimos 7 dias</p></div><button>Esta semana <ChevronDown size={15}/></button></div><div className="chart"><div className="y-labels"><span>20</span><span>15</span><span>10</span><span>5</span><span>0</span></div><div className="plot"><div className="chart-lines"><i/><i/><i/><i/><i/></div><svg viewBox="0 0 700 190" preserveAspectRatio="none" aria-label="Gráfico de atividades"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#26564f" stopOpacity=".2"/><stop offset="1" stopColor="#26564f" stopOpacity="0"/></linearGradient></defs><path d="M0 130 C50 115,55 80,110 93 S175 126,220 80 S290 44,330 65 S395 120,440 90 S510 28,550 48 S640 78,700 30 L700 190 L0 190Z" fill="url(#area)"/><path d="M0 130 C50 115,55 80,110 93 S175 126,220 80 S290 44,330 65 S395 120,440 90 S510 28,550 48 S640 78,700 30" fill="none" stroke="#26564f" strokeWidth="3" vectorEffect="non-scaling-stroke"/></svg><div className="x-labels">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map(d=><span key={d}>{d}</span>)}</div></div></div></section>
      <section className="panel review-panel"><div className="panel-head"><div><h2>Para avaliar</h2><p>Concluídas pela equipe</p></div><button className="text-button">Ver todas</button></div><div className="review-list">{reviewTasks.map((task,i)=><div className="review-item" key={task.id}><span className="small-avatar" style={{background:people[i]?.color}}>{people[i]?.initials}</span><div><strong>{task.title}</strong><span>{task.owner} · concluída {i===0?'hoje':'ontem'}</span></div><Button variant="outline" size="sm">Avaliar</Button></div>)}</div></section></div>
    <section className="panel team-panel"><div className="panel-head"><div><h2>Desempenho da equipe</h2><p>Acompanhamento deste mês</p></div><span className="private-label"><LockKeyhole size={14}/> Visível apenas para gestores</span></div><div className="people-table"><div className="table-row table-header"><span>FUNCIONÁRIO</span><span>CONCLUÍDAS</span><span>NO PRAZO</span><span>PROGRESSO</span></div>{people.map(p=><div className="table-row" key={p.name}><div className="person"><span className="small-avatar" style={{background:p.color}}>{p.initials}</span><div><strong>{p.name}</strong><span>{p.role}</span></div></div><strong>{p.done}</strong><span>{p.rate}%</span><div className="progress-wrap"><Progress value={p.rate}/><small>{p.rate}%</small></div></div>)}</div></section></>;
}

function EmployeeView({ tasks, completed, toggleTask }: { tasks: typeof initialTasks; completed:number; toggleTask:(id:number)=>void }) {
  const [editing,setEditing]=useState<number|null>(null);
  return <><div className="employee-summary"><div className="score-ring"><span>87<small>/100</small></span></div><div><span>Seu desempenho no mês</span><h2>Muito bom, siga assim!</h2><p>Você concluiu {completed+13} atividades e manteve 92% das entregas no prazo.</p></div><div className="goal-progress"><span>Meta mensal <b>16 de 20</b></span><Progress value={80}/><small>Faltam 4 atividades</small></div></div>
    <section className="panel tasks-panel"><div className="panel-head"><div><h2>Minhas atividades</h2><p>Marque quando finalizar ou edite o que foi realizado.</p></div><span className="task-total">{tasks.filter(t=>t.status!=='concluida').length} em aberto</span></div><div className="task-list">{tasks.map(task=><div className={`task-row ${task.status==='concluida'?'done':''}`} key={task.id}><Checkbox checked={task.status==='concluida'} onCheckedChange={()=>toggleTask(task.id)} aria-label={`Concluir ${task.title}`}/><div className="task-main"><strong>{task.title}</strong><span><em>{task.tag}</em><CalendarDays size={14}/>{task.due}</span>{editing===task.id&&<div className="edit-box"><Textarea defaultValue="Atividade realizada conforme solicitado. Registrei os detalhes e resultados para acompanhamento."/><div><Button size="sm" onClick={()=>setEditing(null)}>Salvar registro</Button><Button size="sm" variant="ghost" onClick={()=>setEditing(null)}>Cancelar</Button></div></div>}</div><Button variant="ghost" size="sm" onClick={()=>setEditing(editing===task.id?null:task.id)}>Editar registro</Button></div>)}</div></section><section className="employee-note"><LockKeyhole size={18}/><div><strong>Seus dados são privados</strong><p>Você vê apenas suas atividades, metas e resultados. Os gráficos gerais da equipe são exclusivos do gestor.</p></div></section></>;
}
