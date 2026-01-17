import { Request, Response } from 'express';
import { TasksService } from './tasks.service.js';

export class TasksController {
  constructor(private readonly service: TasksService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    const tasks = await this.service.findAll();
    res.json(tasks);
  };

  getByTicketId = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const tasks = await this.service.findByTicketId(ticketId);
    res.json(tasks);
  };

  getSubtasks = async (req: Request, res: Response): Promise<void> => {
    const parentId = parseInt(req.params.id);
    const subtasks = await this.service.findSubtasks(parentId);
    res.json(subtasks);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { text, ticket_id } = req.body;
    const task = await this.service.create({ text, ticketId: ticket_id });
    res.json(task);
  };

  createSubtask = async (req: Request, res: Response): Promise<void> => {
    const parentId = parseInt(req.params.id);
    const { text } = req.body;
    const subtask = await this.service.createSubtask(parentId, text);
    if (!subtask) {
      res.status(404).json({ error: 'Tache parente non trouvee' });
      return;
    }
    res.json(subtask);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { text, done } = req.body;
    const task = await this.service.update(id, { text, done });
    if (!task) {
      res.status(404).json({ error: 'Tache non trouvee' });
      return;
    }
    res.json(task);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const result = await this.service.delete(id);
    if (!result) {
      res.status(404).json({ error: 'Tache non trouvee' });
      return;
    }
    res.json({ success: true });
  };

  reorder = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { taskIds } = req.body;
    const tasks = await this.service.reorder(ticketId, taskIds);
    res.json(tasks);
  };
}
