import { pgTable, serial, varchar, text, boolean, integer, date, timestamp, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const tickets = pgTable('tickets', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 20 }).default('todo'),
  priority: varchar('priority', { length: 20 }).default('do'),
  description: text('description').default(''),
  dueDate: date('due_date'),
  startDate: date('start_date'),
  position: integer('position').default(0),
  archived: boolean('archived').default(false),
  pinned: boolean('pinned').default(false),
  recurrence: varchar('recurrence', { length: 20 }).default('none'),
  reminderDays: integer('reminder_days').default(0),
  timeEstimated: integer('time_estimated').default(0),
  timeSpent: integer('time_spent').default(0),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }).default(1),
  epicId: integer('epic_id'),
  milestoneId: integer('milestone_id'),
  sprintId: integer('sprint_id'),
  searchVector: text('search_vector'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_tickets_project_id').on(table.projectId),
  index('idx_tickets_status').on(table.status),
  index('idx_tickets_priority').on(table.priority),
  index('idx_tickets_archived').on(table.archived),
  index('idx_tickets_due_date').on(table.dueDate),
  index('idx_tickets_pinned').on(table.pinned),
]);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
