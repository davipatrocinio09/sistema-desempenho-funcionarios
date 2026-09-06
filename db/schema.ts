import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['manager', 'employee'] }).notNull().default('employee'),
  active: integer('active').notNull().default(1),
  passwordHash: text('password_hash'),
  passwordSalt: text('password_salt'),
  createdAt: text('created_at').notNull(),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

export const loginAttempts = sqliteTable('login_attempts', {
  email: text('email').primaryKey(),
  attempts: integer('attempts').notNull().default(0),
  windowStart: text('window_start').notNull(),
  lockedUntil: text('locked_until'),
});

export const audit = sqliteTable('audit', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  detail: text('detail').notNull(),
  createdAt: text('created_at').notNull(),
});

export const tasks = sqliteTable('tasks', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: text('employee_id').notNull().references(() => users.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  dueDate: text('due_date'),
  status: text('status', { enum: ['pending', 'in_progress', 'completed', 'reviewed'] }).notNull().default('pending'),
  completionNotes: text('completion_notes').notNull().default(''),
  completedAt: text('completed_at'),
  createdAt: text('created_at').notNull(),
});

export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  taskId: integer('task_id').notNull().unique().references(() => tasks.id),
  managerId: text('manager_id').notNull().references(() => users.id),
  proactivity: integer('proactivity').notNull(),
  comment: text('comment').notNull().default(''),
  createdAt: text('created_at').notNull(),
});

export const goals = sqliteTable('goals', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  employeeId: text('employee_id').notNull().references(() => users.id),
  createdBy: text('created_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  target: integer('target').notNull(),
  dueDate: text('due_date').notNull(),
  createdAt: text('created_at').notNull(),
});
