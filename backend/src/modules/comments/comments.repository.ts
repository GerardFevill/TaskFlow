import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { comments, type Comment, type NewComment } from '../../db/schema/index.js';

export class CommentsRepository {
  async findByTicketId(ticketId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.ticketId, ticketId))
      .orderBy(desc(comments.createdAt));
  }

  async create(data: NewComment): Promise<Comment> {
    const result = await db.insert(comments).values(data).returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(comments).where(eq(comments.id, id)).returning();
    return result.length > 0;
  }
}
