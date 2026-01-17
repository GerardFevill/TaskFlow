import { Router } from 'express';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';
import { CommentsRepository } from './comments.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new CommentsRepository();
const service = new CommentsService(repository);
const controller = new CommentsController(service);

export const commentsRoutes = Router();

// POST /api/comments - Create a comment
commentsRoutes.post('/', asyncHandler(controller.create));

// DELETE /api/comments/:id - Delete a comment
commentsRoutes.delete('/:id', asyncHandler(controller.delete));
