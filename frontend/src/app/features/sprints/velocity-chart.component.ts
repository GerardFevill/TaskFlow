import { Component, input, computed, inject, OnInit, signal, effect } from '@angular/core';
import { SprintService, VelocityData } from '../../data/services/sprint.service';

@Component({
  selector: 'app-velocity-chart',
  standalone: true,
  templateUrl: './velocity-chart.component.html',
  styleUrl: './velocity-chart.component.scss'
})
export class VelocityChartComponent implements OnInit {
  private sprintService = inject(SprintService);

  // Inputs
  projectId = input<number>();

  // State
  data = signal<VelocityData | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    // React to projectId changes
    effect(() => {
      const id = this.projectId();
      this.loadData(id);
    });
  }

  ngOnInit() {
    // Initial load handled by effect
  }

  private loadData(projectId?: number) {
    this.loading.set(true);
    this.error.set(null);

    this.sprintService.getVelocity(projectId, 10).subscribe({
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
  maxVelocity = computed(() => {
    const d = this.data();
    if (!d || d.sprints.length === 0) return 10;
    return Math.max(...d.sprints.map(s => s.velocity), 1);
  });

  yAxisLabels = computed(() => {
    const max = this.maxVelocity();
    const labels = [];
    const step = Math.ceil(max / 4);

    for (let i = 0; i <= max; i += step) {
      labels.push({
        value: i,
        percent: (i / max) * 100
      });
    }
    return labels;
  });

  // Helper methods
  getBarHeight(velocity: number): number {
    const max = this.maxVelocity();
    if (max === 0) return 0;
    return (velocity / max) * 100;
  }

  getShortName(name: string): string {
    // Extract sprint number or abbreviate
    const match = name.match(/\d+/);
    if (match) return `S${match[0]}`;
    return name.slice(0, 3);
  }
}
