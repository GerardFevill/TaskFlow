import { Injectable, signal, inject } from '@angular/core';
import { ToastService } from './toast.service';

export interface UndoAction {
  id: number;
  type: 'create' | 'update' | 'delete' | 'archive';
  entity: 'ticket' | 'task' | 'label';
  entityId: number;
  previousData: any;
  newData: any;
  description: string;
  timestamp: Date;
}

@Injectable({ providedIn: 'root' })
export class UndoService {
  private toast = inject(ToastService);

  private undoStack = signal<UndoAction[]>([]);
  private redoStack = signal<UndoAction[]>([]);
  private nextId = 0;
  private maxStackSize = 50;

  canUndo = () => this.undoStack().length > 0;
  canRedo = () => this.redoStack().length > 0;

  // Push an action to the undo stack
  push(action: Omit<UndoAction, 'id' | 'timestamp'>) {
    const fullAction: UndoAction = {
      ...action,
      id: this.nextId++,
      timestamp: new Date()
    };

    const stack = this.undoStack();
    if (stack.length >= this.maxStackSize) {
      stack.shift(); // Remove oldest action
    }
    this.undoStack.set([...stack, fullAction]);
    this.redoStack.set([]); // Clear redo stack on new action
  }

  // Get the last action without removing it
  peek(): UndoAction | null {
    const stack = this.undoStack();
    return stack.length > 0 ? stack[stack.length - 1] : null;
  }

  // Undo the last action
  undo(): UndoAction | null {
    const stack = this.undoStack();
    if (stack.length === 0) return null;

    const action = stack.pop()!;
    this.undoStack.set([...stack]);
    this.redoStack.set([...this.redoStack(), action]);

    return action;
  }

  // Redo the last undone action
  redo(): UndoAction | null {
    const stack = this.redoStack();
    if (stack.length === 0) return null;

    const action = stack.pop()!;
    this.redoStack.set([...stack]);
    this.undoStack.set([...this.undoStack(), action]);

    return action;
  }

  // Get undo/redo stack sizes
  getUndoCount(): number {
    return this.undoStack().length;
  }

  getRedoCount(): number {
    return this.redoStack().length;
  }

  // Get last action description
  getLastUndoDescription(): string {
    const action = this.peek();
    return action ? action.description : '';
  }

  getLastRedoDescription(): string {
    const stack = this.redoStack();
    if (stack.length === 0) return '';
    return stack[stack.length - 1].description;
  }

  // Clear all history
  clear() {
    this.undoStack.set([]);
    this.redoStack.set([]);
  }
}
