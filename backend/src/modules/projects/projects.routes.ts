import { Router } from 'express';
import { ProjectsController } from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsRepository } from './projects.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new ProjectsRepository();
const service = new ProjectsService(repository);
const controller = new ProjectsController(service);

export const projectsRoutes = Router();

// GET /api/projects - Get all projects
projectsRoutes.get('/', asyncHandler(controller.getAll));

// GET /api/projects/:id - Get a project by ID
projectsRoutes.get('/:id', asyncHandler(controller.getById));

// GET /api/projects/:id/stats - Get project stats
projectsRoutes.get('/:id/stats', asyncHandler(controller.getStats));

// POST /api/projects - Create a project
projectsRoutes.post('/', asyncHandler(controller.create));

// PUT /api/projects/:id - Update a project
projectsRoutes.put('/:id', asyncHandler(controller.update));

// DELETE /api/projects/:id - Delete a project
projectsRoutes.delete('/:id', asyncHandler(controller.delete));
