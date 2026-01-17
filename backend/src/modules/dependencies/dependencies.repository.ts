import { eq } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { ticketDependencies, tickets, type TicketDependency, type NewTicketDependency } from '../../db/schema/index.js';

export class DependenciesRepository {
  async findByTicketId(ticketId: number) {
    const blockedBy = await db
      .select({
        id: ticketDependencies.id,
        ticketId: ticketDependencies.ticketId,
        dependsOnId: ticketDependencies.dependsOnId,
        dependsOnTitle: tickets.title,
        dependsOnStatus: tickets.status,
      })
      .from(ticketDependencies)
      .innerJoin(tickets, eq(ticketDependencies.dependsOnId, tickets.id))
      .where(eq(ticketDependencies.ticketId, ticketId));

    const blocks = await db
      .select({
        id: ticketDependencies.id,
        ticketId: ticketDependencies.ticketId,
        dependsOnId: ticketDependencies.dependsOnId,
        blocksTitle: tickets.title,
        blocksStatus: tickets.status,
      })
      .from(ticketDependencies)
      .innerJoin(tickets, eq(ticketDependencies.ticketId, tickets.id))
      .where(eq(ticketDependencies.dependsOnId, ticketId));

    return {
      blockedBy: blockedBy.map(b => ({
        id: b.id,
        ticket_id: b.ticketId,
        depends_on_id: b.dependsOnId,
        depends_on_title: b.dependsOnTitle,
        depends_on_status: b.dependsOnStatus,
      })),
      blocks: blocks.map(b => ({
        id: b.id,
        ticket_id: b.ticketId,
        depends_on_id: b.dependsOnId,
        blocks_title: b.blocksTitle,
        blocks_status: b.blocksStatus,
      })),
    };
  }

  async create(data: NewTicketDependency): Promise<TicketDependency> {
    const result = await db
      .insert(ticketDependencies)
      .values(data)
      .returning();
    return result[0];
  }

  async delete(ticketId: number, dependsOnId: number): Promise<boolean> {
    const result = await db
      .delete(ticketDependencies)
      .where(eq(ticketDependencies.ticketId, ticketId))
      .returning();
    return result.length > 0;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await db
      .delete(ticketDependencies)
      .where(eq(ticketDependencies.id, id))
      .returning();
    return result.length > 0;
  }
}
