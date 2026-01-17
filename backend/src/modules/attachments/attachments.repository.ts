import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { attachments, type Attachment, type NewAttachment } from '../../db/schema/index.js';

export class AttachmentsRepository {
  async findByTicketId(ticketId: number): Promise<Attachment[]> {
    return db.select().from(attachments).where(eq(attachments.ticketId, ticketId));
  }

  async findById(id: number): Promise<Attachment | undefined> {
    const result = await db.select().from(attachments).where(eq(attachments.id, id));
    return result[0];
  }

  async create(data: NewAttachment): Promise<Attachment> {
    const result = await db.insert(attachments).values(data).returning();
    return result[0];
  }

  async delete(id: number): Promise<Attachment | undefined> {
    const result = await db.delete(attachments).where(eq(attachments.id, id)).returning();
    return result[0];
  }
}
