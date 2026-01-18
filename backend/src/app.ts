import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from './config/index.js';
import { errorHandler, notFoundHandler } from './middleware/index.js';

// Routes imports
import { settingsRoutes } from './modules/settings/settings.routes.js';
import { labelsRoutes } from './modules/labels/labels.routes.js';
import { commentsRoutes } from './modules/comments/comments.routes.js';
import { activityRoutes } from './modules/activity/activity.routes.js';
import { projectsRoutes } from './modules/projects/projects.routes.js';
import { templatesRoutes } from './modules/templates/templates.routes.js';
import { dependenciesRoutes } from './modules/dependencies/dependencies.routes.js';
import { statsRoutes } from './modules/stats/stats.routes.js';
import { tasksRoutes } from './modules/tasks/tasks.routes.js';
import { ticketsRoutes } from './modules/tickets/tickets.routes.js';
import { searchRoutes } from './modules/search/search.routes.js';
import { epicsRoutes } from './modules/epics/epics.routes.js';
import { milestonesRoutes } from './modules/milestones/milestones.routes.js';
import { sprintsRoutes } from './modules/sprints/sprints.routes.js';
import { whiteboardsRoutes } from './modules/whiteboards/whiteboards.routes.js';
import { transformationsRoutes } from './modules/transformations/transformations.routes.js';
import { importExportRoutes } from './modules/import-export/import-export.routes.js';
import { attachmentsRoutes } from './modules/attachments/attachments.routes.js';
import { remindersRoutes } from './modules/reminders/reminders.routes.js';
import { WhiteboardsService } from './modules/whiteboards/whiteboards.service.js';
import { WhiteboardsRepository } from './modules/whiteboards/whiteboards.repository.js';
import { asyncHandler } from './middleware/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS
  const allowedOrigins = env.CORS_ORIGIN.split(',').map(o => o.trim());
  app.use(cors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Rate limiting
  app.use('/api/', rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    message: { error: 'Trop de requetes, veuillez reessayer plus tard.' },
    standardHeaders: true,
    legacyHeaders: false
  }));

  // Body parser
  app.use(express.json({ limit: '1mb' }));

  // Static files for uploads
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  // API Routes
  app.use('/api/settings', settingsRoutes);
  app.use('/api/labels', labelsRoutes);
  app.use('/api/comments', commentsRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/projects', projectsRoutes);
  app.use('/api/templates', templatesRoutes);
  app.use('/api/tickets', ticketsRoutes);
  app.use('/api/tasks', tasksRoutes);
  app.use('/api/search', searchRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/epics', epicsRoutes);
  app.use('/api/milestones', milestonesRoutes);
  app.use('/api/sprints', sprintsRoutes);
  app.use('/api/whiteboards', whiteboardsRoutes);
  app.use('/api/reminders', remindersRoutes);
  app.use('/api/export', importExportRoutes);
  app.use('/api/import', importExportRoutes);

  // Nested routes (dependencies, attachments on tickets)
  app.use('/api/tickets', dependenciesRoutes);
  app.use('/api/tickets', attachmentsRoutes);

  // Transformation routes
  app.use('/api', transformationsRoutes);

  // Project whiteboard route
  const whiteboardsRepository = new WhiteboardsRepository();
  const whiteboardsService = new WhiteboardsService(whiteboardsRepository);
  app.get('/api/projects/:projectId/whiteboard', asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const whiteboard = await whiteboardsService.getOrCreateForProject(projectId);
    res.json(whiteboard);
  }));

  // Gantt route
  app.get('/api/gantt', asyncHandler(async (req, res) => {
    const { RemindersService } = await import('./modules/reminders/reminders.service.js');
    const service = new RemindersService();
    const data = await service.getGanttData();
    res.json(data);
  }));

  // Auto-archive route (shortcut)
  app.post('/api/auto-archive', asyncHandler(async (req, res) => {
    const { SettingsService } = await import('./modules/settings/settings.service.js');
    const { SettingsRepository } = await import('./modules/settings/settings.repository.js');
    const repository = new SettingsRepository();
    const service = new SettingsService(repository);
    const count = await service.runAutoArchive();
    res.json({ archived: count });
  }));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
