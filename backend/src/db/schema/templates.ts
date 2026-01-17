import { pgTable, serial, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core';
import { projects } from './projects.js';

export const ticketTemplates = pgTable('ticket_templates', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description').default(''),
  priority: varchar('priority', { length: 20 }).default('do'),
  projectId: integer('project_id').references(() => projects.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow(),
});

export type TicketTemplate = typeof ticketTemplates.$inferSelect;
export type NewTicketTemplate = typeof ticketTemplates.$inferInsert;
