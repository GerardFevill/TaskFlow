import { pgTable, serial, varchar, text, boolean, timestamp } from 'drizzle-orm/pg-core';

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').default(''),
  color: varchar('color', { length: 7 }).default('#6c5ce7'),
  icon: varchar('icon', { length: 50 }).default('fa-folder'),
  archived: boolean('archived').default(false),
  createdAt: timestamp('created_at').defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
