import { z } from 'zod';
import { eq, and, desc, sql, ilike } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tickets, tasks, labels, ticketLabels, comments } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTicketTools(server: McpServer) {
  server.tool(
    'list_tickets',
    'Liste les tickets avec filtres optionnels (projet, statut, priorite)',
    {
      project_id: z.number().optional().describe('Filtrer par projet'),
      status: z.enum(['todo', 'in_progress', 'done']).optional().describe('Filtrer par statut'),
      priority: z.enum(['do', 'plan', 'delegate', 'eliminate']).optional().describe('Filtrer par priorite'),
      limit: z.number().optional().default(50).describe('Nombre max de resultats (defaut: 50)'),
    },
    async ({ project_id, status, priority, limit }) => {
      const conditions = [eq(tickets.archived, false)];
      if (project_id) conditions.push(eq(tickets.projectId, project_id));
      if (status) conditions.push(eq(tickets.status, status));
      if (priority) conditions.push(eq(tickets.priority, priority));

      const result = await db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          dueDate: tickets.dueDate,
          projectId: tickets.projectId,
          pinned: tickets.pinned,
          timeEstimated: tickets.timeEstimated,
          timeSpent: tickets.timeSpent,
          createdAt: tickets.createdAt,
        })
        .from(tickets)
        .where(and(...conditions))
        .orderBy(desc(tickets.pinned), desc(tickets.createdAt))
        .limit(limit || 50);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'get_ticket',
    'Detail complet d\'un ticket avec tasks, labels et commentaires',
    { ticket_id: z.number().describe('ID du ticket') },
    async ({ ticket_id }) => {
      const [ticket] = await db
        .select()
        .from(tickets)
        .where(eq(tickets.id, ticket_id));

      if (!ticket) {
        return { content: [{ type: 'text' as const, text: `Ticket #${ticket_id} non trouve` }] };
      }

      const ticketTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.ticketId, ticket_id))
        .orderBy(tasks.position);

      const ticketLabelRows = await db
        .select({ id: labels.id, name: labels.name, color: labels.color })
        .from(ticketLabels)
        .innerJoin(labels, eq(ticketLabels.labelId, labels.id))
        .where(eq(ticketLabels.ticketId, ticket_id));

      const ticketComments = await db
        .select()
        .from(comments)
        .where(eq(comments.ticketId, ticket_id))
        .orderBy(desc(comments.createdAt));

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify({
            ...ticket,
            tasks: ticketTasks,
            labels: ticketLabelRows,
            comments: ticketComments,
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    'search_tickets',
    'Recherche de tickets par texte (titre et description)',
    {
      query: z.string().describe('Terme de recherche'),
      project_id: z.number().optional().describe('Filtrer par projet'),
    },
    async ({ query, project_id }) => {
      const conditions = [
        eq(tickets.archived, false),
        sql`(${tickets.title} ILIKE ${'%' + query + '%'} OR ${tickets.description} ILIKE ${'%' + query + '%'})`,
      ];
      if (project_id) conditions.push(eq(tickets.projectId, project_id));

      const result = await db
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          priority: tickets.priority,
          description: tickets.description,
          projectId: tickets.projectId,
          dueDate: tickets.dueDate,
        })
        .from(tickets)
        .where(and(...conditions))
        .limit(20);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'create_ticket',
    'Creer un nouveau ticket',
    {
      title: z.string().describe('Titre du ticket'),
      project_id: z.number().optional().describe('ID du projet'),
      status: z.enum(['todo', 'in_progress', 'done']).optional().default('todo').describe('Statut'),
      priority: z.enum(['do', 'plan', 'delegate', 'eliminate']).optional().default('do').describe('Priorite'),
      description: z.string().optional().default('').describe('Description'),
      due_date: z.string().optional().describe('Date d\'echeance (YYYY-MM-DD)'),
    },
    async ({ title, project_id, status, priority, description, due_date }) => {
      const [maxPos] = await db
        .select({ max: sql<number>`coalesce(max(${tickets.position}), 0)` })
        .from(tickets);

      const [newTicket] = await db
        .insert(tickets)
        .values({
          title,
          status: status || 'todo',
          priority: priority || 'do',
          description: description || '',
          dueDate: due_date || null,
          projectId: project_id || 1,
          position: (maxPos?.max || 0) + 1,
        })
        .returning();

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(newTicket, null, 2) }],
      };
    }
  );

  server.tool(
    'update_ticket',
    'Modifier un ticket existant',
    {
      ticket_id: z.number().describe('ID du ticket'),
      title: z.string().optional().describe('Nouveau titre'),
      status: z.enum(['todo', 'in_progress', 'done']).optional().describe('Nouveau statut'),
      priority: z.enum(['do', 'plan', 'delegate', 'eliminate']).optional().describe('Nouvelle priorite'),
      description: z.string().optional().describe('Nouvelle description'),
      due_date: z.string().optional().describe('Nouvelle date d\'echeance (YYYY-MM-DD)'),
      archived: z.boolean().optional().describe('Archiver/desarchiver'),
    },
    async ({ ticket_id, title, status, priority, description, due_date, archived }) => {
      const updates: Record<string, unknown> = {};
      if (title !== undefined) updates.title = title;
      if (status !== undefined) updates.status = status;
      if (priority !== undefined) updates.priority = priority;
      if (description !== undefined) updates.description = description;
      if (due_date !== undefined) updates.dueDate = due_date;
      if (archived !== undefined) updates.archived = archived;

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: 'text' as const, text: 'Aucune modification specifiee' }] };
      }

      const [updated] = await db
        .update(tickets)
        .set(updates)
        .where(eq(tickets.id, ticket_id))
        .returning();

      if (!updated) {
        return { content: [{ type: 'text' as const, text: `Ticket #${ticket_id} non trouve` }] };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }],
      };
    }
  );
}
