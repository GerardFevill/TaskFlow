import { eq, desc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { activityLog, tickets, type ActivityLogEntry, type NewActivityLogEntry } from '../../db/schema/index.js';

export class ActivityRepository {
  async findByTicketId(ticketId: number, limit = 50): Promise<ActivityLogEntry[]> {
    return db
      .select()
      .from(activityLog)
      .where(eq(activityLog.ticketId, ticketId))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async findAll(limit = 50): Promise<(ActivityLogEntry & { ticketTitle?: string })[]> {
    const result = await db
      .select({
        id: activityLog.id,
        ticketId: activityLog.ticketId,
        action: activityLog.action,
        field: activityLog.field,
        oldValue: activityLog.oldValue,
        newValue: activityLog.newValue,
        createdAt: activityLog.createdAt,
        ticketTitle: tickets.title,
      })
      .from(activityLog)
      .leftJoin(tickets, eq(activityLog.ticketId, tickets.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);

    return result.map(row => ({
      id: row.id,
      ticketId: row.ticketId,
      action: row.action,
      field: row.field,
      oldValue: row.oldValue,
      newValue: row.newValue,
      createdAt: row.createdAt,
      ticketTitle: row.ticketTitle ?? undefined,
    }));
  }

  async create(data: NewActivityLogEntry): Promise<ActivityLogEntry> {
    const result = await db.insert(activityLog).values(data).returning();
    return result[0];
  }
}
