// Enums
export enum TicketStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done'
}

export enum TicketPriority {
  DO = 'do',
  PLAN = 'plan',
  DELEGATE = 'delegate',
  ELIMINATE = 'eliminate'
}

export enum Recurrence {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

// Epic status
export enum EpicStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed'
}

// Milestone status
export enum MilestoneStatus {
  OPEN = 'open',
  CLOSED = 'closed'
}

// Sprint status
export enum SprintStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

// Labels pour l'UI
export const STATUS_LABELS: Record<TicketStatus, string> = {
  [TicketStatus.TODO]: 'A faire',
  [TicketStatus.IN_PROGRESS]: 'En cours',
  [TicketStatus.DONE]: 'Termine'
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  [TicketPriority.DO]: 'Faire',
  [TicketPriority.PLAN]: 'Planifier',
  [TicketPriority.DELEGATE]: 'Deleguer',
  [TicketPriority.ELIMINATE]: 'Eliminer'
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  [Recurrence.NONE]: 'Aucune',
  [Recurrence.DAILY]: 'Quotidienne',
  [Recurrence.WEEKLY]: 'Hebdomadaire',
  [Recurrence.MONTHLY]: 'Mensuelle',
  [Recurrence.YEARLY]: 'Annuelle'
};

export const EPIC_STATUS_LABELS: Record<EpicStatus, string> = {
  [EpicStatus.OPEN]: 'Ouvert',
  [EpicStatus.IN_PROGRESS]: 'En cours',
  [EpicStatus.COMPLETED]: 'Termine'
};

export const SPRINT_STATUS_LABELS: Record<SprintStatus, string> = {
  [SprintStatus.PLANNING]: 'Planification',
  [SprintStatus.ACTIVE]: 'Actif',
  [SprintStatus.COMPLETED]: 'Termine'
};

// Couleurs
export const PRIORITY_COLORS: Record<TicketPriority, string> = {
  [TicketPriority.DO]: '#ff6b6b',
  [TicketPriority.PLAN]: '#4ecdc4',
  [TicketPriority.DELEGATE]: '#ffa502',
  [TicketPriority.ELIMINATE]: '#636e72'
};

export const STATUS_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.TODO]: '#fdcb6e',
  [TicketStatus.IN_PROGRESS]: '#4ecdc4',
  [TicketStatus.DONE]: '#00b894'
};

// Labels par defaut
export const DEFAULT_LABELS = [
  { name: 'Urgent', color: '#ff6b6b' },
  { name: 'Travail', color: '#4ecdc4' },
  { name: 'Personnel', color: '#ffa502' },
  { name: 'Admin', color: '#636e72' }
];

// Icones projet disponibles
export const PROJECT_ICONS = [
  'fa-folder', 'fa-briefcase', 'fa-home', 'fa-code', 'fa-palette',
  'fa-shopping-cart', 'fa-heart', 'fa-star', 'fa-rocket', 'fa-gamepad',
  'fa-graduation-cap', 'fa-music', 'fa-camera', 'fa-plane', 'fa-car',
  'fa-utensils', 'fa-book', 'fa-film', 'fa-gift', 'fa-leaf'
];
