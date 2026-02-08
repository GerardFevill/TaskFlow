import { z } from 'zod';
import { db } from '../db/index.js';
import { comments } from '../db/schema/index.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerCommentTools(server: McpServer) {
  server.tool(
    'add_comment',
    'Ajouter un commentaire a un ticket',
    {
      ticket_id: z.number().describe('ID du ticket'),
      text: z.string().describe('Texte du commentaire'),
    },
    async ({ ticket_id, text }) => {
      const [newComment] = await db
        .insert(comments)
        .values({
          text,
          ticketId: ticket_id,
        })
        .returning();

      return {
        content: [{ type: 'text' as const, text: JSON.stringify(newComment, null, 2) }],
      };
    }
  );
}
