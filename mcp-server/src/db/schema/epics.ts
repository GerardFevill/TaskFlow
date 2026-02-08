import { pgTable, serial, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const epics = pgTable('epics', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  color: varchar('color', { length: 7 }).default('#6c5ce7'),
  status: varchar('status', { length: 20 }).default('open'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  projectIdIdx: index('idx_epics_project_id').on(table.projectId),
}));

export type Epic = typeof epics.$inferSelect;
export type NewEpic = typeof epics.$inferInsert;
