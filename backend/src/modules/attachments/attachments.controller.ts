import { Request, Response } from 'express';
import { AttachmentsService } from './attachments.service.js';
import path from 'path';

export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  getByTicketId = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const attachments = await this.service.findByTicketId(ticketId);
    res.json(attachments);
  };

  upload = async (req: Request, res: Response): Promise<void> => {
    const ticketId = parseInt(req.params.id);
    const file = req.file;

    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const attachment = await this.service.create(ticketId, file);
    res.json(attachment);
  };

  download = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const attachment = await this.service.findById(id);

    if (!attachment) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    const filePath = path.join('uploads', attachment.filename);
    res.download(filePath, attachment.originalName);
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params.id);
    const result = await this.service.delete(id);

    if (!result) {
      res.status(404).json({ error: 'Attachment not found' });
      return;
    }

    res.json({ success: true });
  };
}
