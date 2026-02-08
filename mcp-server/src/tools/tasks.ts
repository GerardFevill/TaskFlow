import { z } from 'zod';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { tasks } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerTaskTools(server: McpServer) {
  server.tool(
    'list_tasks',
    'Liste les tasks d\'un ticket',
    { ticket_id: z.number().describe('ID du ticket') },
    async ({ ticket_id }) => {
      const result = await db
        .select()
        .from(tasks)
        .where(eq(tasks.ticketId, ticket_id))
        .orderBy(tasks.position);

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    }
  );

  server.tool(
    'create_task',
    'Ajouter une task a un ticket',
    {
      ticket_id: z.number().describe('ID du ticket'),
      text: z.string().describe('Texte de la task'),
      parent_id: z.number().optional().describe('ID de la task parente (pour sous-tache)'),
    },
    async ({ ticket_id, text, parent_id }) => {
      const [maxPos] = await db
        .select({ max: sql<number>`coalesce(max(${tasks.position}), 0)` })
        .from(tasks)
        .where(eq(tasks.ticketId, ticket_id));

      const [newTask] = await db
        .insert(tasks)
        .values({
          text,
          ticketId: ticket_id,
          parentId: parent_id || null,
          position: (maxPos?.max || 0) + 1,
        })
        .returning();

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(newTask, null, 2) }],
      };
    }
  );

  server.tool(
    'update_task',
    'Modifier une task (texte ou statut done)',
    {
      task_id: z.number().describe('ID de la task'),
      text: z.string().optional().describe('Nouveau texte'),
      done: z.boolean().optional().describe('Marquer comme terminee'),
    },
    async ({ task_id, text, done }) => {
      const updates: Record<string, unknown> = {};
      if (text !== undefined) updates.text = text;
      if (done !== undefined) updates.done = done;

      if (Object.keys(updates).length === 0) {
        return { content: [{ type: 'text' as const, text: 'Aucune modification specifiee' }] };
      }

      const [updated] = await db
        .update(tasks)
        .set(updates)
        .where(eq(tasks.id, task_id))
        .returning();

      if (!updated) {
        return { content: [{ type: 'text' as const, text: `Task #${task_id} non trouvee` }] };
      }

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(updated, null, 2) }],
      };
    }
  );
}
