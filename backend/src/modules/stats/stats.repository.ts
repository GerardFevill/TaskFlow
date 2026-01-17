import { eq, and, sql, gte } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { tickets, projects } from '../../db/schema/index.js';

export class StatsRepository {
  async getGlobalStats() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalResult = await db
      .select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        inProgress: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
        done: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        overdue: sql<number>`count(case when ${tickets.dueDate} < current_date and ${tickets.status} != 'done' then 1 end)::int`,
      })
      .from(tickets)
      .where(eq(tickets.archived, false));

    const completedThisWeek = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tickets)
      .where(
        and(
          eq(tickets.status, 'done'),
          gte(tickets.createdAt, weekAgo)
        )
      );

    const byPriority = await db
      .select({
        priority: tickets.priority,
        count: sql<number>`count(*)::int`,
      })
      .from(tickets)
      .where(eq(tickets.archived, false))
      .groupBy(tickets.priority);

    const stats = totalResult[0] || { total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 };

    return {
      total: stats.total,
      byStatus: {
        todo: stats.todo,
        in_progress: stats.inProgress,
        done: stats.done,
      },
      byPriority: byPriority.reduce((acc, p) => {
        acc[p.priority || 'do'] = p.count;
        return acc;
      }, {} as Record<string, number>),
      overdue: stats.overdue,
      completedThisWeek: completedThisWeek[0]?.count || 0,
    };
  }

  async getProjectStats(projectId: number) {
    const result = await db
      .select({
        total: sql<number>`count(*)::int`,
        todo: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
        inProgress: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
        done: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
      })
      .from(tickets)
      .where(and(eq(tickets.projectId, projectId), eq(tickets.archived, false)));

    return result[0] || { total: 0, todo: 0, inProgress: 0, done: 0 };
  }
}
