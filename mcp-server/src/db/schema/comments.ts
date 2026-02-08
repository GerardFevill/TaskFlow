import { pgTable, serial, text, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const comments = pgTable('comments', {
  id: serial('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
}, (table) => ({
  ticketIdIdx: index('idx_comments_ticket_id').on(table.ticketId),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
