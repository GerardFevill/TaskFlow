import { AttachmentsRepository } from './attachments.repository.js';
import { ActivityRepository } from '../activity/activity.repository.js';
import type { NewAttachment } from '../../db/schema/index.js';
import fs from 'fs';
import path from 'path';

export class AttachmentsService {
  constructor(
    private readonly repository: AttachmentsRepository,
    private readonly activityRepository: ActivityRepository
  ) {}

  async findByTicketId(ticketId: number) {
    return this.repository.findByTicketId(ticketId);
  }

  async findById(id: number) {
    return this.repository.findById(id);
  }

  async create(ticketId: number, file: Express.Multer.File) {
    const attachment = await this.repository.create({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      ticketId,
    });

    await this.activityRepository.create({
      ticketId,
      action: 'attachment_added',
      field: 'attachments',
      newValue: file.originalname,
    });

    return attachment;
  }

  async delete(id: number) {
    const attachment = await this.repository.findById(id);
    if (!attachment) return null;

    // Delete file from disk
    const filePath = path.join('uploads', attachment.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return this.repository.delete(id);
  }
}
