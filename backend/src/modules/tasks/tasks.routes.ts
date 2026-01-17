import { Router } from 'express';
import { TasksController } from './tasks.controller.js';
import { TasksService } from './tasks.service.js';
import { TasksRepository } from './tasks.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const repository = new TasksRepository();
const service = new TasksService(repository);
const controller = new TasksController(service);

export const tasksRoutes = Router();

// GET /api/tasks - Get all tasks
tasksRoutes.get('/', asyncHandler(controller.getAll));

// POST /api/tasks - Create a task
tasksRoutes.post('/', asyncHandler(controller.create));

// PUT /api/tasks/:id - Update a task
tasksRoutes.put('/:id', asyncHandler(controller.update));

// DELETE /api/tasks/:id - Delete a task
tasksRoutes.delete('/:id', asyncHandler(controller.delete));

// GET /api/tasks/:id/subtasks - Get subtasks
tasksRoutes.get('/:id/subtasks', asyncHandler(controller.getSubtasks));

// POST /api/tasks/:id/subtasks - Create subtask
tasksRoutes.post('/:id/subtasks', asyncHandler(controller.createSubtask));
