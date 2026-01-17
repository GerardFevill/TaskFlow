import { Request, Response } from 'express';
import { TicketsService } from './tickets.service.js';
import { TasksService } from '../tasks/tasks.service.js';
import { CommentsService } from '../comments/comments.service.js';
import { ActivityService } from '../activity/activity.service.js';

export class TicketsController {
  constructor(
    private readonly service: TicketsService,
    private readonly tasksService: TasksService,
    private readonly commentsService: CommentsService,
    private readonly activityService: ActivityService
  ) {}

  getAll = async (req: Request, res: Response): Promise<void> => {
    const query = {
      projectId: req.query.project_id ? parseInt(req.query.project_id as string) : undefined,
      status: req.query.status as string | undefined,
      priority: req.query.priority as string | undefined,
      archived: req.query.archived !== undefined ? req.query.archived === 'true' : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
    };
    const result = await this.service.findAll(query);
    res.json(result);
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const ticket = await this.service.findById(id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(ticket);
  };

  getPinned = async (_req: Request, res: Response): Promise<void> => {
    const tickets = await this.service.findPinned();
    res.json(tickets);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { title, priority, project_id } = req.body;
    const ticket = await this.service.create({ title, priority, project_id });
    res.json(ticket);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const ticket = await this.service.update(id, req.body);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(ticket);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const result = await this.service.delete(id);
    if (!result) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json({ success: true });
  };

  togglePin = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const ticket = await this.service.togglePin(id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(ticket);
  };

  duplicate = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const ticket = await this.service.duplicate(id);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(ticket);
  };

  addTime = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const { minutes } = req.body;
    const ticket = await this.service.addTime(id, minutes);
    if (!ticket) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(ticket);
  };

  // Tasks routes
  getTasks = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const tasks = await this.tasksService.findByTicketId(ticketId);
    res.json(tasks);
  };

  reorderTasks = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { taskIds } = req.body;
    const tasks = await this.tasksService.reorder(ticketId, taskIds);
    res.json(tasks);
  };

  // Labels routes
  getLabels = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const labels = await this.service.getLabels(ticketId);
    res.json(labels);
  };

  addLabel = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { label_id } = req.body;
    const labels = await this.service.addLabel(ticketId, label_id);
    res.json(labels);
  };

  removeLabel = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.ticketId);
    const labelId = parseInt(req.params.labelId);
    const result = await this.service.removeLabel(ticketId, labelId);
    res.json(result);
  };

  // Comments routes
  getComments = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const comments = await this.commentsService.findByTicketId(ticketId);
    res.json(comments);
  };

  // Activity routes
  getActivity = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const activity = await this.activityService.findByTicketId(ticketId);
    res.json(activity);
  };

  // Save as template
  saveAsTemplate = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { name } = req.body;
    const template = await this.service.saveAsTemplate(ticketId, name);
    if (!template) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(template);
  };
}
