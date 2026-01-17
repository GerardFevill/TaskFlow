import { Router } from 'express';
import { DependenciesController } from './dependencies.controller.js';
import { DependenciesService } from './dependencies.service.js';
import { DependenciesRepository } from './dependencies.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new DependenciesRepository();
const service = new DependenciesService(repository);
const controller = new DependenciesController(service);

export const dependenciesRoutes = Router();

// GET /api/tickets/:id/dependencies - Get dependencies for a ticket
dependenciesRoutes.get('/:id/dependencies', asyncHandler(controller.getByTicketId));

// POST /api/tickets/:id/dependencies - Create a dependency
dependenciesRoutes.post('/:id/dependencies', asyncHandler(controller.create));

// DELETE /api/tickets/:id/dependencies/:depId - Delete a dependency
dependenciesRoutes.delete('/:id/dependencies/:depId', asyncHandler(controller.delete));
