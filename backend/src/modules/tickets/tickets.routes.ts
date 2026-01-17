import { Router } from 'express';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { TicketsRepository } from './tickets.repository.js';
import { TasksService } from '../tasks/tasks.service.js';
import { TasksRepository } from '../tasks/tasks.repository.js';
import { CommentsService } from '../comments/comments.service.js';
import { CommentsRepository } from '../comments/comments.repository.js';
import { ActivityService } from '../activity/activity.service.js';
import { ActivityRepository } from '../activity/activity.repository.js';
import { asyncHandler } from '../../middleware/index.js';

const ticketsRepository = new TicketsRepository();
const activityRepository = new ActivityRepository();
const tasksRepository = new TasksRepository();
const commentsRepository = new CommentsRepository();

const ticketsService = new TicketsService(ticketsRepository, activityRepository);
const tasksService = new TasksService(tasksRepository);
const commentsService = new CommentsService(commentsRepository);
const activityService = new ActivityService(activityRepository);

const controller = new TicketsController(ticketsService, tasksService, commentsService, activityService);

export const ticketsRoutes = Router();

// GET /api/tickets - Get all tickets
ticketsRoutes.get('/', asyncHandler(controller.getAll));

// GET /api/tickets/pinned - Get pinned tickets
ticketsRoutes.get('/pinned', asyncHandler(controller.getPinned));

// GET /api/tickets/:id - Get a ticket by ID
ticketsRoutes.get('/:id', asyncHandler(controller.getById));

// POST /api/tickets - Create a ticket
ticketsRoutes.post('/', asyncHandler(controller.create));

// PUT /api/tickets/:id - Update a ticket
ticketsRoutes.put('/:id', asyncHandler(controller.update));

// DELETE /api/tickets/:id - Delete a ticket
ticketsRoutes.delete('/:id', asyncHandler(controller.delete));

// PUT /api/tickets/:id/pin - Toggle pin
ticketsRoutes.put('/:id/pin', asyncHandler(controller.togglePin));

// POST /api/tickets/:id/duplicate - Duplicate a ticket
ticketsRoutes.post('/:id/duplicate', asyncHandler(controller.duplicate));

// POST /api/tickets/:id/time - Add time spent
ticketsRoutes.post('/:id/time', asyncHandler(controller.addTime));

// GET /api/tickets/:id/tasks - Get tasks for a ticket
ticketsRoutes.get('/:id/tasks', asyncHandler(controller.getTasks));

// PUT /api/tickets/:id/tasks/reorder - Reorder tasks
ticketsRoutes.put('/:id/tasks/reorder', asyncHandler(controller.reorderTasks));

// GET /api/tickets/:id/labels - Get labels for a ticket
ticketsRoutes.get('/:id/labels', asyncHandler(controller.getLabels));

// POST /api/tickets/:id/labels - Add label to ticket
ticketsRoutes.post('/:id/labels', asyncHandler(controller.addLabel));

// DELETE /api/tickets/:ticketId/labels/:labelId - Remove label from ticket
ticketsRoutes.delete('/:ticketId/labels/:labelId', asyncHandler(controller.removeLabel));

// GET /api/tickets/:id/comments - Get comments for a ticket
ticketsRoutes.get('/:id/comments', asyncHandler(controller.getComments));

// GET /api/tickets/:id/activity - Get activity for a ticket
ticketsRoutes.get('/:id/activity', asyncHandler(controller.getActivity));

// POST /api/tickets/:id/save-template - Save as template
ticketsRoutes.post('/:id/save-template', asyncHandler(controller.saveAsTemplate));
