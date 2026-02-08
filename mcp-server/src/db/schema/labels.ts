import { pgTable, serial, varchar, integer, primaryKey } from 'drizzle-orm/pg-core';
import { tickets } from './tickets.js';

export const labels = pgTable('labels', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  color: varchar('color', { length: 7 }).default('#4ecdc4'),
});

export const ticketLabels = pgTable('ticket_labels', {
  ticketId: integer('ticket_id').references(() => tickets.id, { onDelete: 'cascade' }).notNull(),
  labelId: integer('label_id').references(() => labels.id, { onDelete: 'cascade' }).notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.ticketId, table.labelId] }),
}));

export type Label = typeof labels.$inferSelect;
export type NewLabel = typeof labels.$inferInsert;
