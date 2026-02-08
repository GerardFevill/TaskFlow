import { pgTable, serial, varchar, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const attachments = pgTable('attachments', {
  id: serial('id').primaryKey(),
  filename: varchar('filename', { length: 255 }).notNull(),
  originalName: varchar('original_name', { length: 255 }).notNull(),
  mimetype: varchar('mimetype', { length: 100 }),
  size: integer('size'),
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  ticketIdIdx: index('idx_attachments_ticket_id').on(table.ticketId),
}));

export type Attachment = typeof attachments.$inferSelect;
export type NewAttachment = typeof attachments.$inferInsert;
