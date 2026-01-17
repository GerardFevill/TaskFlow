import { TemplatesRepository } from './templates.repository.js';
import { db } from '../../db/index.js';
import { tickets, type NewTicketTemplate } from '../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

export class TemplatesService {
  constructor(private readonly repository: TemplatesRepository) {}

  async findAll() {
    return this.repository.findAll();
  }

  async create(data: NewTicketTemplate) {
    return this.repository.create(data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  async saveFromTicket(ticketId: number, templateName: string) {
    const ticketResult = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    const ticket = ticketResult[0];
    if (!ticket) {
      return null;
    }

    return this.repository.create({
      name: templateName,
      title: ticket.title,
      description: ticket.description || '',
      priority: ticket.priority || 'do',
      projectId: ticket.projectId,
    });
  }

  async createTicketFromTemplate(templateId: number) {
    const template = await this.repository.findById(templateId);
    if (!template) {
      return null;
    }

    const result = await db
      .insert(tickets)
      .values({
        title: template.title,
        description: template.description || '',
        priority: template.priority || 'do',
        projectId: template.projectId || 1,
        searchVector: sql`to_tsvector('french', ${template.title})`,
      })
      .returning();

    return result[0];
  }
}
