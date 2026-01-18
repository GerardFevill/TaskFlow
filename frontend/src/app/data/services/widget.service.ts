import { Injectable, signal } from '@angular/core';
import { WidgetConfig, DashboardLayout, DEFAULT_WIDGETS } from '../models/widget.model';

const STORAGE_KEY = 'dashboard_widgets';

@Injectable({ providedIn: 'root' })
export class WidgetService {
  private widgets = signal<WidgetConfig[]>([]);

  constructor() {
    this.loadWidgets();
  }

  getWidgets() {
    return this.widgets;
  }

  getVisibleWidgets(): WidgetConfig[] {
    return this.widgets()
      .filter(w => w.visible)
      .sort((a, b) => a.position - b.position);
  }

  getAllWidgets(): WidgetConfig[] {
    return this.widgets().sort((a, b) => a.position - b.position);
  }

  loadWidgets() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as WidgetConfig[];
        // Merge with defaults to include new widgets
        const merged = this.mergeWithDefaults(parsed);
        this.widgets.set(merged);
      } catch {
        this.widgets.set([...DEFAULT_WIDGETS]);
      }
    } else {
      this.widgets.set([...DEFAULT_WIDGETS]);
    }
  }

  private mergeWithDefaults(saved: WidgetConfig[]): WidgetConfig[] {
    const result = [...saved];
    const savedIds = new Set(saved.map(w => w.id));

    // Add any new default widgets that aren't in saved config
    for (const defaultWidget of DEFAULT_WIDGETS) {
      if (!savedIds.has(defaultWidget.id)) {
        result.push({ ...defaultWidget, position: result.length });
      }
    }

    return result;
  }

  saveWidgets() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.widgets()));
  }

  toggleWidget(id: string) {
    const widgets = this.widgets();
    const widget = widgets.find(w => w.id === id);
    if (widget) {
      widget.visible = !widget.visible;
      this.widgets.set([...widgets]);
      this.saveWidgets();
    }
  }

  showWidget(id: string) {
    const widgets = this.widgets();
    const widget = widgets.find(w => w.id === id);
    if (widget) {
      widget.visible = true;
      this.widgets.set([...widgets]);
      this.saveWidgets();
    }
  }

  hideWidget(id: string) {
    const widgets = this.widgets();
    const widget = widgets.find(w => w.id === id);
    if (widget) {
      widget.visible = false;
      this.widgets.set([...widgets]);
      this.saveWidgets();
    }
  }

  moveWidget(fromIndex: number, toIndex: number) {
    const widgets = this.getVisibleWidgets();
    const [moved] = widgets.splice(fromIndex, 1);
    widgets.splice(toIndex, 0, moved);

    // Update positions
    widgets.forEach((w, i) => {
      const original = this.widgets().find(ow => ow.id === w.id);
      if (original) {
        original.position = i;
      }
    });

    this.widgets.set([...this.widgets()]);
    this.saveWidgets();
  }

  reorderWidgets(orderedIds: string[]) {
    const widgets = this.widgets();
    orderedIds.forEach((id, index) => {
      const widget = widgets.find(w => w.id === id);
      if (widget) {
        widget.position = index;
      }
    });
    this.widgets.set([...widgets]);
    this.saveWidgets();
  }

  resizeWidget(id: string, size: 'small' | 'medium' | 'large') {
    const widgets = this.widgets();
    const widget = widgets.find(w => w.id === id);
    if (widget) {
      widget.size = size;
      this.widgets.set([...widgets]);
      this.saveWidgets();
    }
  }

  resetToDefault() {
    this.widgets.set([...DEFAULT_WIDGETS]);
    this.saveWidgets();
  }
}
