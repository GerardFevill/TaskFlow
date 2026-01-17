import { pgTable, serial, varchar, text, date, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const milestones = pgTable('milestones', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  dueDate: date('due_date').notNull(),
  status: varchar('status', { length: 20 }).default('open'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_milestones_project_id').on(table.projectId),
]);

export type Milestone = typeof milestones.$inferSelect;
export type NewMilestone = typeof milestones.$inferInsert;
