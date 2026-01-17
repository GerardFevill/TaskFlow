import { pgTable, serial, varchar, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const activityLog = pgTable('activity_log', {
  id: serial('id').primaryKey(),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(),
  field: varchar('field', { length: 50 }),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_activity_log_ticket_id').on(table.ticketId),
  index('idx_activity_log_created_at').on(table.createdAt),
]);

export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type NewActivityLogEntry = typeof activityLog.$inferInsert;
