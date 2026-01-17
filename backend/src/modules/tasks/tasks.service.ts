import { TasksRepository } from './tasks.repository.js';
import type { NewTask } from '../../db/schema/index.js';

export class TasksService {
  constructor(private readonly repository: TasksRepository) {}

  async findAll() {
    return this.repository.findAll();
  }

  async findByTicketId(ticketId: number) {
    return this.repository.findByTicketId(ticketId);
  }

  async findSubtasks(parentId: number) {
    return this.repository.findSubtasks(parentId);
  }

  async create(data: NewTask) {
    return this.repository.create({
      text: data.text,
      done: data.done ?? false,
      ticketId: data.ticketId,
      parentId: data.parentId,
    });
  }

  async createSubtask(parentId: number, text: string) {
    const parentTask = await this.repository.findById(parentId);
    if (!parentTask) {
      return null;
    }
    return this.repository.create({
      text,
      done: false,
      ticketId: parentTask.ticketId,
      parentId,
    });
  }

  async update(id: number, data: Partial<NewTask>) {
    return this.repository.update(id, data);
  }

  async delete(id: number) {
    return this.repository.delete(id);
  }

  async reorder(ticketId: number, taskIds: number[]) {
    await this.repository.reorder(ticketId, taskIds);
    return this.repository.findByTicketId(ticketId);
  }
}
