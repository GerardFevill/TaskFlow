import { Router } from 'express';
import { TransformationsController } from './transformations.controller.js';
import { TransformationsService } from './transformations.service.js';
import { asyncHandler } from '../../middleware/index.js';

const service = new TransformationsService();
const controller = new TransformationsController(service);

export const transformationsRoutes = Router();

// Task transformations
transformationsRoutes.post('/tasks/:id/to-ticket', asyncHandler(controller.taskToTicket));
transformationsRoutes.post('/tasks/:id/to-project', asyncHandler(controller.taskToProject));

// Ticket transformations
transformationsRoutes.post('/tickets/:id/to-task', asyncHandler(controller.ticketToTask));
transformationsRoutes.post('/tickets/:id/to-project', asyncHandler(controller.ticketToProject));

// Project transformations
transformationsRoutes.post('/projects/:id/to-ticket', asyncHandler(controller.projectToTicket));
transformationsRoutes.post('/projects/:id/to-task', asyncHandler(controller.projectToTask));
