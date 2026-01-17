import { pgTable, serial, varchar, text, date, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const sprints = pgTable('sprints', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  goal: text('goal').default(''),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: varchar('status', { length: 20 }).default('planning'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_sprints_project_id').on(table.projectId),
]);

export type Sprint = typeof sprints.$inferSelect;
export type NewSprint = typeof sprints.$inferInsert;
