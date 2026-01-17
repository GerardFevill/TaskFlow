import { Request, Response } from 'express';
import { CommentsService } from './comments.service.js';

export class CommentsController {
  constructor(private readonly service: CommentsService) {}

  getByTicketId = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const comments = await this.service.findByTicketId(ticketId);
    res.json(comments);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const { text, ticket_id } = req.body;
    const comment = await this.service.create({ text, ticketId: ticket_id });
    res.json(comment);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    await this.service.delete(id);
    res.json({ success: true });
  };
}
