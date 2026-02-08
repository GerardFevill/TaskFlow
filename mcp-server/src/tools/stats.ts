import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tickets, projects } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerStatsTools(server: McpServer) {
  server.tool(
    'get_stats',
    'Statistiques globales ou par projet (tickets par statut, priorite, en retard, etc.)',
    {
      project_id: z.number().optional().describe('ID du projet (optionnel, sinon stats globales)'),
    },
    async ({ project_id }) => {
      const conditions = [eq(tickets.archived, false)];
      if (project_id) conditions.push(eq(tickets.projectId, project_id));

      const [stats] = await db
        .select({
          total: sql<number>`count(*)::int`,
          todo: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
          inProgress: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
          done: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
          priorityDo: sql<number>`count(case when ${tickets.priority} = 'do' then 1 end)::int`,
          priorityPlan: sql<number>`count(case when ${tickets.priority} = 'plan' then 1 end)::int`,
          priorityDelegate: sql<number>`count(case when ${tickets.priority} = 'delegate' then 1 end)::int`,
          priorityEliminate: sql<number>`count(case when ${tickets.priority} = 'eliminate' then 1 end)::int`,
          overdue: sql<number>`count(case when ${tickets.dueDate} < current_date and ${tickets.status} != 'done' then 1 end)::int`,
          dueToday: sql<number>`count(case when ${tickets.dueDate} = current_date then 1 end)::int`,
          dueThisWeek: sql<number>`count(case when ${tickets.dueDate} between current_date and current_date + interval '7 days' and ${tickets.status} != 'done' then 1 end)::int`,
          totalTimeEstimated: sql<number>`coalesce(sum(${tickets.timeEstimated}), 0)::int`,
          totalTimeSpent: sql<number>`coalesce(sum(${tickets.timeSpent}), 0)::int`,
        })
        .from(tickets)
        .where(and(...conditions));

      const projectCount = project_id ? undefined : await db
        .select({ count: sql<number>`count(*)::int` })
        .from(projects)
        .where(eq(projects.archived, false));

      const result = {
        ...stats,
        ...(projectCount ? { projectCount: projectCount[0].count } : {}),
      };

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
