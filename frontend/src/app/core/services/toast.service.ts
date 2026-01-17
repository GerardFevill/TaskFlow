import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = this.nextId++;
    const toast: Toast = { id, message, type, duration };
    this.toasts.set([...this.toasts(), toast]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }

    return id;
  }

  success(message: string, duration = 3000) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration = 4000) {
    return this.show(message, 'error', duration);
  }

  warning(message: string, duration = 3500) {
    return this.show(message, 'warning', duration);
  }

  info(message: string, duration = 3000) {
    return this.show(message, 'info', duration);
  }

  remove(id: number) {
    this.toasts.set(this.toasts().filter(t => t.id !== id));
  }

  clear() {
    this.toasts.set([]);
  }
}
