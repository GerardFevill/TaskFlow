import { z } from 'zod';
import { eq, sql, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { projects, tickets } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerProjectTools(server: McpServer) {
  server.tool(
    'list_projects',
    'Liste tous les projets actifs avec le nombre de tickets par statut',
    {},
    async () => {
      const allProjects = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          color: projects.color,
          icon: projects.icon,
          archived: projects.archived,
          createdAt: projects.createdAt,
          totalTickets: sql<number>`count(${tickets.id})::int`,
          todoCount: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
          inProgressCount: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
          doneCount: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        })
        .from(projects)
        .leftJoin(tickets, and(eq(tickets.projectId, projects.id), eq(tickets.archived, false)))
        .where(eq(projects.archived, false))
        .groupBy(projects.id)
        .orderBy(projects.name);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(allProjects, null, 2),
        }],
      };
    }
  );

  server.tool(
    'get_project',
    'Detail d\'un projet avec ses statistiques',
    { project_id: z.number().describe('ID du projet') },
    async ({ project_id }) => {
      const [project] = await db
        .select({
          id: projects.id,
          name: projects.name,
          description: projects.description,
          color: projects.color,
          icon: projects.icon,
          archived: projects.archived,
          createdAt: projects.createdAt,
          totalTickets: sql<number>`count(${tickets.id})::int`,
          todoCount: sql<number>`count(case when ${tickets.status} = 'todo' then 1 end)::int`,
          inProgressCount: sql<number>`count(case when ${tickets.status} = 'in_progress' then 1 end)::int`,
          doneCount: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        })
        .from(projects)
        .leftJoin(tickets, and(eq(tickets.projectId, projects.id), eq(tickets.archived, false)))
        .where(eq(projects.id, project_id))
        .groupBy(projects.id);

      if (!project) {
        return { content: [{ type: 'text' as const, text: `Projet #${project_id} non trouve` }] };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(project, null, 2) }],
      };
    }
  );
}
