import { pgTable, serial, integer, unique, index } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const ticketDependencies = pgTable('ticket_dependencies', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  dependsOnId: integer('depends_on_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
}, (table) => [
  unique().on(table.ticketId, table.dependsOnId),
  index('idx_ticket_dependencies_ticket_id').on(table.ticketId),
  index('idx_ticket_dependencies_depends_on_id').on(table.dependsOnId),
]);

export type TicketDependency = typeof ticketDependencies.$inferSelect;
export type NewTicketDependency = typeof ticketDependencies.$inferInsert;
