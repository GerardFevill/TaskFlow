import { TicketsRepository, type TicketQuery } from './tickets.repository.js';
import { ActivityRepository } from '../activity/activity.repository.js';
import { db } from '../../db/index.js';
import { tickets, ticketLabels, labels } from '../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';
import { sanitizeString } from '../../utils/index.js';
import type { NewTicket } from '../../db/schema/index.js';

export class TicketsService {
  constructor(
    private readonly repository: TicketsRepository,
    private readonly activityRepository: ActivityRepository
  ) {}

  async findAll(query: TicketQuery) {
    const result = await this.repository.findAll(query);
    return {
      data: result.data,
      total: result.total,
      limit: query.limit || null,
      offset: query.offset || 0,
    };
  }

  async findById(id: number) {
    return this.repository.findWithTasks(id);
  }

  async findPinned() {
    return this.repository.findPinned();
  }

  async create(data: { title: string; priority?: string; project_id?: number }) {
    const sanitizedTitle = sanitizeString(data.title);
    return this.repository.create({
      title: sanitizedTitle,
      priority: data.priority || 'do',
      projectId: data.project_id || 1,
    });
  }

  async update(id: number, data: Partial<NewTicket & { project_id?: number; due_date?: string; start_date?: string }>) {
    const oldTicket = await this.repository.findById(id);
    if (!oldTicket) return null;

    // Map snake_case to camelCase
    const updateData: Partial<NewTicket> = {
      title: data.title,
      status: data.status,
      priority: data.priority,
      description: data.description,
      dueDate: data.due_date || data.dueDate,
      startDate: data.start_date || data.startDate,
      position: data.position,
      archived: data.archived,
      recurrence: data.recurrence,
      reminderDays: data.reminderDays,
      timeEstimated: data.timeEstimated,
      timeSpent: data.timeSpent,
      projectId: data.project_id || data.projectId,
      epicId: data.epicId,
      milestoneId: data.milestoneId,
      sprintId: data.sprintId,
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key as keyof typeof updateData] === undefined) {
        delete updateData[key as keyof typeof updateData];
      }
    });

    const newTicket = await this.repository.update(id, updateData);
    if (!newTicket) return null;

    // Log activity for important changes
    const fieldsToLog = ['status', 'priority', 'archived'];
    for (const field of fieldsToLog) {
      const oldValue = oldTicket[field as keyof typeof oldTicket];
      const newValue = newTicket[field as keyof typeof newTicket];
      if (data[field as keyof typeof data] !== undefined && oldValue !== newValue) {
        await this.activityRepository.create({
          ticketId: id,
          action: 'update',
          field,
          oldValue: String(oldValue),
          newValue: String(newValue),
        });
      }
    }

    // Handle recurrence
    if (data.status === 'done' && newTicket.recurrence && newTicket.recurrence !== 'none') {
      await this.createRecurringTicket(newTicket);
    }

    return newTicket;
  }

  private async createRecurringTicket(ticket: any) {
    let nextDate = ticket.dueDate ? new Date(ticket.dueDate) : new Date();
    switch (ticket.recurrence) {
      case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
      case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
      case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
      case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
    }

    await this.repository.create({
      title: ticket.title,
      priority: ticket.priority,
      recurrence: ticket.recurrence,
      reminderDays: ticket.reminderDays,
      dueDate: nextDate.toISOString().split('T')[0],
      projectId: ticket.projectId,
    });
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  async togglePin(id: number) {
    return this.repository.togglePin(id);
  }

  async duplicate(id: number) {
    return this.repository.duplicate(id);
  }

  async addTime(id: number, minutes: number) {
    const ticket = await this.repository.addTime(id, minutes);
    if (ticket) {
      await this.activityRepository.create({
        ticketId: id,
        action: 'time_added',
        field: 'time_spent',
        newValue: `${minutes} minutes`,
      });
    }
    return ticket;
  }

  async getLabels(ticketId: number) {
    const result = await db
      .select({
        id: labels.id,
        name: labels.name,
        color: labels.color,
      })
      .from(labels)
      .innerJoin(ticketLabels, eq(ticketLabels.labelId, labels.id))
      .where(eq(ticketLabels.ticketId, ticketId));
    return result;
  }

  async addLabel(ticketId: number, labelId: number) {
    await db
      .insert(ticketLabels)
      .values({ ticketId, labelId })
      .onConflictDoNothing();
    return this.getLabels(ticketId);
  }

  async removeLabel(ticketId: number, labelId: number) {
    await db
      .delete(ticketLabels)
      .where(eq(ticketLabels.ticketId, ticketId));
    return { success: true };
  }

  async saveAsTemplate(ticketId: number, name: string) {
    const ticket = await this.repository.findById(ticketId);
    if (!ticket) return null;

    const result = await db.insert(tickets).values({
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      projectId: ticket.projectId,
    }).returning();

    return result[0];
  }
}
