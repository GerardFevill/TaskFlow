import { Component, input, computed, inject, OnInit, signal, effect } from '@angular/core';
import { SprintService, BurndownData } from '../../data/services/sprint.service';

@Component({
  selector: 'app-burndown-chart',
  standalone: true,
  templateUrl: './burndown-chart.component.html',
  styleUrl: './burndown-chart.component.scss'
})
export class BurndownChartComponent implements OnInit {
  private sprintService = inject(SprintService);

  // Inputs
  sprintId = input.required<number>();

  // State
  data = signal<BurndownData | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // Chart dimensions
  width = 400;
  height = 200;
  padding = { top: 20, right: 20, bottom: 30, left: 40 };

  constructor() {
    // React to sprintId changes
    effect(() => {
      const id = this.sprintId();
      if (id) {
        this.loadData(id);
      }
    });
  }

  ngOnInit() {
    // Initial load handled by effect
  }

  private loadData(sprintId: number) {
    this.loading.set(true);
    this.error.set(null);

    this.sprintService.getBurndown(sprintId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set('Erreur de chargement');
        this.loading.set(false);
      }
    });
  }

  // Computed values
  maxValue = computed(() => {
    const d = this.data();
    if (!d) return 0;
    return Math.max(d.totalTickets, 1);
  });

  chartWidth = computed(() => this.width - this.padding.left - this.padding.right);
  chartHeight = computed(() => this.height - this.padding.top - this.padding.bottom);

  gridLines = computed(() => {
    const max = this.maxValue();
    const lines = [];
    const step = Math.ceil(max / 4);

    for (let i = 0; i <= max; i += step) {
      lines.push({
        value: i,
        y: this.getY(i)
      });
    }
    return lines;
  });

  xLabels = computed(() => {
    const d = this.data();
    if (!d || d.days.length === 0) return [];

    const labels = [];
    const step = Math.max(1, Math.floor(d.days.length / 5));

    for (let i = 0; i < d.days.length; i += step) {
      const date = new Date(d.days[i]);
      labels.push({
        x: this.getX(i),
        text: date.getDate().toString()
      });
    }
    return labels;
  });

  dataPoints = computed(() => {
    const d = this.data();
    if (!d) return [];

    return d.actual.map((value, index) => ({
      x: this.getX(index),
      y: this.getY(value),
      value,
      date: this.formatDate(d.days[index])
    }));
  });

  actualPoints = computed(() => {
    const points = this.dataPoints();
    return points.map(p => `${p.x},${p.y}`).join(' ');
  });

  todayIndex = computed(() => {
    const d = this.data();
    if (!d) return -1;

    const today = new Date().toISOString().split('T')[0];
    return d.days.findIndex(day => day === today);
  });

  // Helper methods
  getX(index: number): number {
    const d = this.data();
    if (!d || d.days.length <= 1) return this.padding.left;

    const xScale = this.chartWidth() / (d.days.length - 1);
    return this.padding.left + index * xScale;
  }

  getY(value: number): number {
    const max = this.maxValue();
    if (max === 0) return this.height - this.padding.bottom;

    const yScale = this.chartHeight() / max;
    return this.height - this.padding.bottom - value * yScale;
  }

  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}
