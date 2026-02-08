import { z } from 'zod';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { epics, milestones, sprints, tickets } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerAgileTools(server: McpServer) {
  server.tool(
    'list_epics',
    'Liste les epics avec progression (nombre de tickets par statut)',
    {
      project_id: z.number().optional().describe('Filtrer par projet'),
    },
    async ({ project_id }) => {
      const conditions = project_id ? [eq(epics.projectId, project_id)] : [];

      const result = await db
        .select({
          id: epics.id,
          name: epics.name,
          description: epics.description,
          color: epics.color,
          status: epics.status,
          projectId: epics.projectId,
          createdAt: epics.createdAt,
          totalTickets: sql<number>`count(${tickets.id})::int`,
          doneTickets: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        })
        .from(epics)
        .leftJoin(tickets, eq(tickets.epicId, epics.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(epics.id)
        .orderBy(epics.name);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'list_milestones',
    'Liste les milestones avec progression',
    {
      project_id: z.number().optional().describe('Filtrer par projet'),
    },
    async ({ project_id }) => {
      const conditions = project_id ? [eq(milestones.projectId, project_id)] : [];

      const result = await db
        .select({
          id: milestones.id,
          name: milestones.name,
          description: milestones.description,
          dueDate: milestones.dueDate,
          status: milestones.status,
          projectId: milestones.projectId,
          createdAt: milestones.createdAt,
          totalTickets: sql<number>`count(${tickets.id})::int`,
          doneTickets: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        })
        .from(milestones)
        .leftJoin(tickets, eq(tickets.milestoneId, milestones.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(milestones.id)
        .orderBy(milestones.dueDate);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'list_sprints',
    'Liste les sprints avec progression',
    {
      project_id: z.number().optional().describe('Filtrer par projet'),
    },
    async ({ project_id }) => {
      const conditions = project_id ? [eq(sprints.projectId, project_id)] : [];

      const result = await db
        .select({
          id: sprints.id,
          name: sprints.name,
          goal: sprints.goal,
          startDate: sprints.startDate,
          endDate: sprints.endDate,
          status: sprints.status,
          projectId: sprints.projectId,
          createdAt: sprints.createdAt,
          totalTickets: sql<number>`count(${tickets.id})::int`,
          doneTickets: sql<number>`count(case when ${tickets.status} = 'done' then 1 end)::int`,
        })
        .from(sprints)
        .leftJoin(tickets, eq(tickets.sprintId, sprints.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(sprints.id)
        .orderBy(sprints.startDate);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
