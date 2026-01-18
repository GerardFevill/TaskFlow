export type WidgetType =
  | 'stats-summary'
  | 'overdue'
  | 'today'
  | 'in-progress'
  | 'this-week'
  | 'recent'
  | 'project-progress'
  | 'priority-chart'
  | 'quick-actions'
  | 'calendar-mini';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  icon: string;
  size: WidgetSize;
  visible: boolean;
  position: number;
}

export interface DashboardLayout {
  widgets: WidgetConfig[];
  columns: number;
}

export const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w1', type: 'stats-summary', title: 'Statistiques', icon: 'fa-chart-bar', size: 'large', visible: true, position: 0 },
  { id: 'w2', type: 'overdue', title: 'En retard', icon: 'fa-fire', size: 'medium', visible: true, position: 1 },
  { id: 'w3', type: 'today', title: "Aujourd'hui", icon: 'fa-calendar-day', size: 'medium', visible: true, position: 2 },
  { id: 'w4', type: 'in-progress', title: 'En cours', icon: 'fa-spinner', size: 'medium', visible: true, position: 3 },
  { id: 'w5', type: 'this-week', title: 'Cette semaine', icon: 'fa-calendar-week', size: 'medium', visible: true, position: 4 },
  { id: 'w6', type: 'recent', title: 'Recents', icon: 'fa-history', size: 'large', visible: true, position: 5 },
  { id: 'w7', type: 'project-progress', title: 'Progression projet', icon: 'fa-tasks', size: 'medium', visible: false, position: 6 },
  { id: 'w8', type: 'priority-chart', title: 'Par priorite', icon: 'fa-chart-pie', size: 'medium', visible: false, position: 7 },
  { id: 'w9', type: 'quick-actions', title: 'Actions rapides', icon: 'fa-bolt', size: 'small', visible: false, position: 8 },
  { id: 'w10', type: 'calendar-mini', title: 'Calendrier', icon: 'fa-calendar', size: 'medium', visible: false, position: 9 }
];

export const WIDGET_CATALOG: { type: WidgetType; title: string; icon: string; description: string }[] = [
  { type: 'stats-summary', title: 'Statistiques', icon: 'fa-chart-bar', description: 'Resume des tickets' },
  { type: 'overdue', title: 'En retard', icon: 'fa-fire', description: 'Tickets en retard' },
  { type: 'today', title: "Aujourd'hui", icon: 'fa-calendar-day', description: "Echeances du jour" },
  { type: 'in-progress', title: 'En cours', icon: 'fa-spinner', description: 'Tickets en cours' },
  { type: 'this-week', title: 'Cette semaine', icon: 'fa-calendar-week', description: 'Echeances de la semaine' },
  { type: 'recent', title: 'Recents', icon: 'fa-history', description: 'Derniers tickets modifies' },
  { type: 'project-progress', title: 'Progression projet', icon: 'fa-tasks', description: 'Avancement du projet actif' },
  { type: 'priority-chart', title: 'Par priorite', icon: 'fa-chart-pie', description: 'Repartition par priorite' },
  { type: 'quick-actions', title: 'Actions rapides', icon: 'fa-bolt', description: 'Raccourcis frequents' },
  { type: 'calendar-mini', title: 'Calendrier', icon: 'fa-calendar', description: 'Vue calendrier compacte' }
];
