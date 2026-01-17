import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'kanban', loadComponent: () => import('./features/kanban/kanban.component').then(m => m.KanbanComponent) },
  { path: 'list', loadComponent: () => import('./features/list/list.component').then(m => m.ListComponent) },
  { path: 'calendar', loadComponent: () => import('./features/calendar/calendar.component').then(m => m.CalendarComponent) },
  { path: 'gantt', loadComponent: () => import('./features/gantt/gantt.component').then(m => m.GanttComponent) },
  { path: 'stats', loadComponent: () => import('./features/stats/stats.component').then(m => m.StatsComponent) },
  { path: 'reminders', loadComponent: () => import('./features/reminders/reminders.component').then(m => m.RemindersComponent) },
  { path: 'archives', loadComponent: () => import('./features/archives/archives.component').then(m => m.ArchivesComponent) },
  { path: 'history', loadComponent: () => import('./features/history/history.component').then(m => m.HistoryComponent) },
  { path: 'projects', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
  { path: 'projects-dashboard', loadComponent: () => import('./features/projects-dashboard/projects-dashboard.component').then(m => m.ProjectsDashboardComponent) },
  { path: 'templates', loadComponent: () => import('./features/templates/templates.component').then(m => m.TemplatesComponent) },
  { path: 'epics', loadComponent: () => import('./features/epics/epics.component').then(m => m.EpicsComponent) },
  { path: 'milestones', loadComponent: () => import('./features/milestones/milestones.component').then(m => m.MilestonesComponent) },
  { path: 'sprints', loadComponent: () => import('./features/sprints/sprints.component').then(m => m.SprintsComponent) },
  { path: 'backlog', loadComponent: () => import('./features/backlog/backlog.component').then(m => m.BacklogComponent) },
  { path: 'tickets/new', loadComponent: () => import('./features/ticket-create/ticket-create.component').then(m => m.TicketCreateComponent) },
  { path: 'ticket/:id', loadComponent: () => import('./features/ticket-detail/ticket-detail.component').then(m => m.TicketDetailComponent) },
  { path: 'projects/:projectId', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
  { path: 'projects/:projectId/whiteboard', loadComponent: () => import('./features/whiteboard/whiteboard.component').then(m => m.WhiteboardComponent) },
  { path: '**', redirectTo: '/dashboard' }
];
