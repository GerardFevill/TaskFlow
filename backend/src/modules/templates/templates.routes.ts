import { Router } from 'express';
import { TemplatesController } from './templates.controller.js';
import { TemplatesService } from './templates.service.js';
import { TemplatesRepository } from './templates.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new TemplatesRepository();
const service = new TemplatesService(repository);
const controller = new TemplatesController(service);

export const templatesRoutes = Router();

// GET /api/templates - Get all templates
templatesRoutes.get('/', asyncHandler(controller.getAll));

// POST /api/templates - Create a template
templatesRoutes.post('/', asyncHandler(controller.create));

// DELETE /api/templates/:id - Delete a template
templatesRoutes.delete('/:id', asyncHandler(controller.delete));

// POST /api/templates/:id/create-ticket - Create ticket from template
templatesRoutes.post('/:id/create-ticket', asyncHandler(controller.createTicketFromTemplate));
