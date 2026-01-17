import { environment } from '../../../environments/environment';

// API Configuration
export const API_URL = environment.apiUrl;
export const UPLOADS_URL = environment.uploadsUrl;

// Pomodoro
export const POMODORO_DURATION = 25 * 60; // 25 minutes en secondes

// Undo/Redo
export const MAX_UNDO_HISTORY = 50;

// Pagination
export const DEFAULT_PAGE_SIZE = 20;

// Toast durations (ms)
export const TOAST_DURATIONS = {
  success: 3000,
  error: 4000,
  warning: 3500,
  info: 3000
};
