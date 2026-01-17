import { pgTable, serial, varchar, boolean, integer, index } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const tasks = pgTable('tasks', {
  id: serial('id').primaryKey(),
  text: varchar('text', { length: 255 }).notNull(),
  done: boolean('done').default(false),
  position: integer('position').default(0),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  parentId: integer('parent_id'),
}, (table) => [
  index('idx_tasks_ticket_id').on(table.ticketId),
  index('idx_tasks_parent_id').on(table.parentId),
]);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
