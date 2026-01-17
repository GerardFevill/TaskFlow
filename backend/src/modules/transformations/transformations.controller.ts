import { Request, Response } from 'express';
import { TransformationsService } from './transformations.service.js';

export class TransformationsController {
  constructor(private readonly service: TransformationsService) {}

  taskToTicket = async (req: Request, res: Response): Promise<void> => {
    const taskId = parseInt(req.params.id);
    const result = await this.service.taskToTicket(taskId);
    if (!result) {
      res.status(404).json({ error: 'Tache non trouvee' });
      return;
    }
    res.json(result);
  };

  ticketToTask = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { target_ticket_id } = req.body;
    const result = await this.service.ticketToTask(ticketId, target_ticket_id);
    if (!result) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(result);
  };

  ticketToProject = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const result = await this.service.ticketToProject(ticketId);
    if (!result) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(result);
  };

  projectToTicket = async (req: Request, res: Response): Promise<void> => {
    const projectId = parseInt(req.params.id);
    try {
      const result = await this.service.projectToTicket(projectId);
      if (!result) {
        res.status(404).json({ error: 'Projet non trouve' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };

  taskToProject = async (req: Request, res: Response): Promise<void> => {
    const taskId = parseInt(req.params.id);
    const result = await this.service.taskToProject(taskId);
    if (!result) {
      res.status(404).json({ error: 'Tache non trouvee' });
      return;
    }
    res.json(result);
  };

  projectToTask = async (req: Request, res: Response): Promise<void> => {
    const projectId = parseInt(req.params.id);
    const { target_ticket_id } = req.body;
    try {
      const result = await this.service.projectToTask(projectId, target_ticket_id);
      if (!result) {
        res.status(404).json({ error: 'Projet non trouve' });
        return;
      }
      res.json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  };
}
