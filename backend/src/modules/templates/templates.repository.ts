import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ticketTemplates, type TicketTemplate, type NewTicketTemplate } from '../../db/schema/index.js';

export class TemplatesRepository {
  async findAll(): Promise<TicketTemplate[]> {
    return db.select().from(ticketTemplates).orderBy(ticketTemplates.createdAt);
  }

  async findById(id: number): Promise<TicketTemplate | undefined> {
    const result = await db.select().from(ticketTemplates).where(eq(ticketTemplates.id, id));
    return result[0];
  }

  async create(data: NewTicketTemplate): Promise<TicketTemplate> {
    const result = await db.insert(ticketTemplates).values(data).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(ticketTemplates).where(eq(ticketTemplates.id, id)).returning();
    return result.length > 0;
  }
}
