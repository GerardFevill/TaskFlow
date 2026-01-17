import { Request, Response } from 'express';
import { LabelsService } from './labels.service.js';

export class LabelsController {
  constructor(private readonly service: LabelsService) {}

  getAll = async (_req: Request, res: Response): Promise<void> => {
    const labels = await this.service.findAll();
    res.json(labels);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { name, color } = req.body;
    const label = await this.service.create({ name, color });
    res.json(label);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };

  getByTicketId = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const labels = await this.service.findByTicketId(ticketId);
    res.json(labels);
  };

  addToTicket = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const { label_id } = req.body;
    const labels = await this.service.addToTicket(ticketId, label_id);
    res.json(labels);
  };

  removeFromTicket = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.ticketId);
    const labelId = parseInt(req.params.labelId);
    const result = await this.service.removeFromTicket(ticketId, labelId);
    res.json(result);
  };
}
