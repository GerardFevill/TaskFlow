import { z } from 'zod';
import { eq, desc } from 'drizzle-orm';
import { db } from '../db/index.js';
import { activityLog, tickets } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerActivityTools(server: McpServer) {
  server.tool(
    'get_activity',
    'Historique d\'activite recent (global ou pour un ticket)',
    {
      ticket_id: z.number().optional().describe('Filtrer par ticket'),
      limit: z.number().optional().default(30).describe('Nombre max de resultats (defaut: 30)'),
    },
    async ({ ticket_id, limit }) => {
      const query = db
        .select({
          id: activityLog.id,
          ticketId: activityLog.ticketId,
          ticketTitle: tickets.title,
          action: activityLog.action,
          field: activityLog.field,
          oldValue: activityLog.oldValue,
          newValue: activityLog.newValue,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .leftJoin(tickets, eq(activityLog.ticketId, tickets.id))
        .orderBy(desc(activityLog.createdAt))
        .limit(limit || 30);

      if (ticket_id) {
        const result = await db
          .select({
            id: activityLog.id,
            ticketId: activityLog.ticketId,
            ticketTitle: tickets.title,
            action: activityLog.action,
            field: activityLog.field,
            oldValue: activityLog.oldValue,
            newValue: activityLog.newValue,
            createdAt: activityLog.createdAt,
          })
          .from(activityLog)
          .leftJoin(tickets, eq(activityLog.ticketId, tickets.id))
          .where(eq(activityLog.ticketId, ticket_id))
          .orderBy(desc(activityLog.createdAt))
          .limit(limit || 30);

        return {
          content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
        };
      }

      const result = await query;
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );
}
