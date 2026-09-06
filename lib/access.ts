export type Member = { id: string; email: string; name: string; role: string; active: number; department: string; access_scope: string };
export function isManager(user: Member) { return user.role === 'admin' || user.role === 'manager'; }
export function hasAllDepartments(user: Member) { return user.role === 'admin' || (user.role === 'manager' && user.access_scope === 'all'); }
export function canManageDepartment(user: Member, department: string) { return hasAllDepartments(user) || (user.role === 'manager' && user.department === department); }
export function canEdit(user: Member, task: { employee_id: string; department?: string }) { return task.employee_id === user.id || (isManager(user) && !!task.department && canManageDepartment(user,task.department)); }
export function validRole(role: unknown): role is string { return role === 'manager' || role === 'employee'; }
