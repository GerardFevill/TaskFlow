import { Router } from 'express';
import { AttachmentsController } from './attachments.controller.js';
import { AttachmentsService } from './attachments.service.js';
import { AttachmentsRepository } from './attachments.repository.js';
import { ActivityRepository } from '../activity/activity.repository.js';
import { asyncHandler } from '../../middleware/index.js';
import { upload } from '../../middleware/upload.js';

const repository = new AttachmentsRepository();
const activityRepository = new ActivityRepository();
const service = new AttachmentsService(repository, activityRepository);
const controller = new AttachmentsController(service);

export const attachmentsRoutes = Router();

// GET /api/tickets/:id/attachments - Get attachments for a ticket
attachmentsRoutes.get('/:id/attachments', asyncHandler(controller.getByTicketId));

// POST /api/tickets/:id/attachments - Upload attachment
attachmentsRoutes.post('/:id/attachments', upload.single('file'), asyncHandler(controller.upload));

// GET /api/attachments/:id/download - Download attachment
attachmentsRoutes.get('/attachments/:id/download', asyncHandler(controller.download));

// DELETE /api/attachments/:id - Delete attachment
attachmentsRoutes.delete('/attachments/:id', asyncHandler(controller.delete));
