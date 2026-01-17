import { Router } from 'express';
import { WhiteboardsController } from './whiteboards.controller.js';
import { WhiteboardsService } from './whiteboards.service.js';
import { WhiteboardsRepository } from './whiteboards.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new WhiteboardsRepository();
const service = new WhiteboardsService(repository);
const controller = new WhiteboardsController(service);

export const whiteboardsRoutes = Router();

// Board routes
whiteboardsRoutes.put('/:id', asyncHandler(controller.update));
whiteboardsRoutes.delete('/:id', asyncHandler(controller.delete));

// Element routes
whiteboardsRoutes.get('/:id/elements', asyncHandler(controller.getElements));
whiteboardsRoutes.post('/:id/elements', asyncHandler(controller.createElement));
whiteboardsRoutes.put('/:id/elements/:elemId', asyncHandler(controller.updateElement));
whiteboardsRoutes.delete('/:id/elements/:elemId', asyncHandler(controller.deleteElement));

// Bulk operations
whiteboardsRoutes.post('/:id/elements/bulk', asyncHandler(controller.bulkCreateElements));
whiteboardsRoutes.delete('/:id/elements/bulk', asyncHandler(controller.bulkDeleteElements));
whiteboardsRoutes.put('/:id/elements/reorder', asyncHandler(controller.reorderElements));

// Duplicate
whiteboardsRoutes.post('/:id/duplicate/:elemId', asyncHandler(controller.duplicateElement));
