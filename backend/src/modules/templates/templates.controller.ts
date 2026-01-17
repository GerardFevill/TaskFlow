import { Request, Response } from 'express';
import { TemplatesService } from './templates.service.js';

export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    const templates = await this.service.findAll();
    res.json(templates);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, title, description, priority, project_id } = req.body;
    const template = await this.service.create({
      name,
      title,
      description,
      priority,
      projectId: project_id,
    });
    res.json(template);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };

  saveFromTicket = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { name } = req.body;
    const template = await this.service.saveFromTicket(ticketId, name);
    if (!template) {
      res.status(404).json({ error: 'Ticket non trouve' });
      return;
    }
    res.json(template);
  };

  createTicketFromTemplate = async (req: Request, res: Response): Promise<void> => {
    const templateId = parseInt(req.params.id);
    const ticket = await this.service.createTicketFromTemplate(templateId);
    if (!ticket) {
      res.status(404).json({ error: 'Template non trouve' });
      return;
    }
    res.json(ticket);
  };
}
