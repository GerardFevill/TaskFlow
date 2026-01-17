import { db } from '../../db/index.js';
import { tickets, projects, labels, ticketLabels, comments } from '../../db/schema/index.js';
import { eq, and, or, sql, gte, lte, ilike, inArray } from 'drizzle-orm';

export interface AdvancedSearchParams {
  query?: string;
  status?: string[];
  priority?: string[];
  labels?: number[];
  dateFrom?: string;
  dateTo?: string;
  projectId?: number;
  pinned?: boolean;
}

export class SearchService {
  async simpleSearch(query: string) {
    if (!query || query.trim().length === 0) {
      return [];
    }

    const searchQuery = query.trim().split(/\s+/).join(' & ');

    // Full-text search on tickets
    const ticketResults = await db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        status: tickets.status,
        priority: tickets.priority,
        projectId: tickets.projectId,
        projectName: projects.name,
        rank: sql<number>`ts_rank(${tickets.searchVector}, to_tsquery('french', ${searchQuery}))`,
      })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(
        and(
          eq(tickets.archived, false),
          sql`${tickets.searchVector} @@ to_tsquery('french', ${searchQuery})`
        )
      )
      .orderBy(sql`ts_rank(${tickets.searchVector}, to_tsquery('french', ${searchQuery})) DESC`)
      .limit(50);

    // Also search in comments
    const commentResults = await db
      .select({
        id: comments.id,
        text: comments.text,
        ticketId: comments.ticketId,
      })
      .from(comments)
      .where(ilike(comments.text, `%${query}%`))
      .limit(20);

    return {
      tickets: ticketResults.map(t => ({
        ...t,
        project_id: t.projectId,
        project_name: t.projectName,
      })),
      comments: commentResults.map(c => ({
        ...c,
        ticket_id: c.ticketId,
      })),
    };
  }

  async advancedSearch(params: AdvancedSearchParams) {
    const conditions = [eq(tickets.archived, false)];

    if (params.query && params.query.trim().length > 0) {
      const searchQuery = params.query.trim().split(/\s+/).join(' & ');
      conditions.push(sql`${tickets.searchVector} @@ to_tsquery('french', ${searchQuery})`);
    }

    if (params.status && params.status.length > 0) {
      conditions.push(inArray(tickets.status, params.status));
    }

    if (params.priority && params.priority.length > 0) {
      conditions.push(inArray(tickets.priority, params.priority));
    }

    if (params.dateFrom) {
      conditions.push(gte(tickets.dueDate, params.dateFrom));
    }

    if (params.dateTo) {
      conditions.push(lte(tickets.dueDate, params.dateTo));
    }

    if (params.projectId) {
      conditions.push(eq(tickets.projectId, params.projectId));
    }

    if (params.pinned !== undefined) {
      conditions.push(eq(tickets.pinned, params.pinned));
    }

    let query = db
      .select({
        id: tickets.id,
        title: tickets.title,
        description: tickets.description,
        status: tickets.status,
        priority: tickets.priority,
        dueDate: tickets.dueDate,
        pinned: tickets.pinned,
        projectId: tickets.projectId,
        projectName: projects.name,
        projectColor: projects.color,
      })
      .from(tickets)
      .leftJoin(projects, eq(tickets.projectId, projects.id))
      .where(and(...conditions))
      .orderBy(tickets.createdAt)
      .limit(100);

    const results = await query;

    // Filter by labels if specified
    let filteredResults = results;
    if (params.labels && params.labels.length > 0) {
      const ticketIds = results.map(t => t.id);
      if (ticketIds.length > 0) {
        const ticketsWithLabels = await db
          .select({ ticketId: ticketLabels.ticketId })
          .from(ticketLabels)
          .where(
            and(
              inArray(ticketLabels.ticketId, ticketIds),
              inArray(ticketLabels.labelId, params.labels)
            )
          );
        const matchingTicketIds = new Set(ticketsWithLabels.map(t => t.ticketId));
        filteredResults = results.filter(t => matchingTicketIds.has(t.id));
      }
    }

    return filteredResults.map(t => ({
      ...t,
      due_date: t.dueDate,
      project_id: t.projectId,
      project_name: t.projectName,
      project_color: t.projectColor,
    }));
  }
}
