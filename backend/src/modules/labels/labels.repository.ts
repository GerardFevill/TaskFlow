import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { labels, ticketLabels, type Label, type NewLabel } from '../../db/schema/index.js';

export class LabelsRepository {
  async findAll(): Promise<Label[]> {
    return db.select().from(labels).orderBy(labels.id);
  }

  async findById(id: number): Promise<Label | undefined> {
    const result = await db.select().from(labels).where(eq(labels.id, id));
    return result[0];
  }

  async create(data: NewLabel): Promise<Label> {
    const result = await db.insert(labels).values(data).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(labels).where(eq(labels.id, id)).returning();
    return result.length > 0;
  }

  async findByTicketId(ticketId: number): Promise<Label[]> {
    const result = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(labels)
      .innerJoin(ticketLabels, eq(ticketLabels.labelId, labels.id))
      .where(eq(ticketLabels.ticketId, ticketId));
    return result;
  }

  async addToTicket(ticketId: number, labelId: number): Promise<void> {
    await db
      .insert(ticketLabels)
      .values({ ticketId, labelId })
      .onConflictDoNothing();
  }

  async removeFromTicket(ticketId: number, labelId: number): Promise<void> {
    await db
      .delete(ticketLabels)
      .where(
        eq(ticketLabels.ticketId, ticketId)
      );
  }
}
