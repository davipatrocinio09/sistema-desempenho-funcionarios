export type Member = { id: string; email: string; name: string; role: string; active: number };
export function isManager(user: Member) { return user.role === 'admin' || user.role === 'manager'; }
export function canEdit(user: Member, task: { employee_id: string }) { return isManager(user) || task.employee_id === user.id; }
export function validRole(role: unknown): role is string { return role === 'manager' || role === 'employee'; }
