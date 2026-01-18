import { Component, inject, signal, OnInit } from '@angular/core';
import { TicketService, Stats, Ticket, ProductivityData, DistributionData } from '../../data';

@Component({
  selector: 'app-stats',
  imports: [],
  templateUrl: './stats.component.html',
  styleUrl: './stats.component.scss'
})
export class StatsComponent implements OnInit {
  private ticketService = inject(TicketService);

  stats = signal<Stats | null>(null);
  tickets = signal<Ticket[]>([]);
  productivityData = signal<ProductivityData[]>([]);
  distributionData = signal<DistributionData | null>(null);
  Math = Math;

  // Chart colors
  statusColors: Record<string, string> = {
    todo: '#f59e0b',
    in_progress: '#3b82f6',
    done: '#22c55e'
  };

  priorityColors: Record<string, string> = {
    do: '#ef4444',
    plan: '#3b82f6',
    delegate: '#f97316',
    eliminate: '#6b7280'
  };

  ngOnInit() {
    this.loadStats();
    this.loadTickets();
    this.loadProductivityStats();
    this.loadDistributionStats();
  }

  loadStats() {
    const projectId = localStorage.getItem('currentProjectId');
    if (projectId) {
      this.ticketService.getProjectStats(parseInt(projectId)).subscribe(data => this.stats.set(data));
    } else {
      this.ticketService.getStats().subscribe(data => this.stats.set(data));
    }
  }

  loadTickets() {
    const projectId = localStorage.getItem('currentProjectId');
    this.ticketService.getAll(projectId ? parseInt(projectId) : undefined).subscribe(response => this.tickets.set(response.data));
  }

  loadProductivityStats() {
    const projectId = localStorage.getItem('currentProjectId');
    this.ticketService.getProductivityStats(projectId ? parseInt(projectId) : undefined)
      .subscribe(data => this.productivityData.set(data));
  }

  loadDistributionStats() {
    const projectId = localStorage.getItem('currentProjectId');
    this.ticketService.getDistributionStats(projectId ? parseInt(projectId) : undefined)
      .subscribe(data => this.distributionData.set(data));
  }

  // Line chart helpers
  getMaxProductivity(): number {
    const data = this.productivityData();
    if (!data.length) return 10;
    const max = Math.max(...data.map(d => Math.max(d.created, d.completed)));
    return Math.max(max, 1);
  }

  getProductivityY(value: number): number {
    return 150 - (value / this.getMaxProductivity()) * 130;
  }

  getCreatedPath(): string {
    const data = this.productivityData();
    if (!data.length) return '';
    const step = 480 / (data.length - 1 || 1);
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${i * step},${this.getProductivityY(d.created)}`).join(' ');
  }

  getCompletedPath(): string {
    const data = this.productivityData();
    if (!data.length) return '';
    const step = 480 / (data.length - 1 || 1);
    return data.map((d, i) => `${i === 0 ? 'M' : 'L'}${i * step},${this.getProductivityY(d.completed)}`).join(' ');
  }

  // Pie chart helpers
  getPieSlices(type: 'status' | 'priority'): { path: string; color: string; label: string; percentage: number }[] {
    const data = this.distributionData();
    if (!data) return [];

    const items = type === 'status' ? data.byStatus : data.byPriority;
    const colors = type === 'status' ? this.statusColors : this.priorityColors;
    const total = items.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) return [];

    const slices: { path: string; color: string; label: string; percentage: number }[] = [];
    let startAngle = -90;

    items.forEach(item => {
      const key = type === 'status' ? item.status! : item.priority!;
      const percentage = (item.count / total) * 100;
      const angle = (item.count / total) * 360;
      const endAngle = startAngle + angle;

      const path = this.describeArc(75, 75, 60, startAngle, endAngle);
      slices.push({
        path,
        color: colors[key] || '#6b7280',
        label: this.formatLabel(key, type),
        percentage: Math.round(percentage)
      });

      startAngle = endAngle;
    });

    return slices;
  }

  private describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
    const start = this.polarToCartesian(x, y, radius, endAngle);
    const end = this.polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${x} ${y} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  private polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad)
    };
  }

  private formatLabel(key: string, type: 'status' | 'priority'): string {
    if (type === 'status') {
      const labels: Record<string, string> = { todo: 'A faire', in_progress: 'En cours', done: 'Termine' };
      return labels[key] || key;
    } else {
      const labels: Record<string, string> = { do: 'Faire', plan: 'Planifier', delegate: 'Deleguer', eliminate: 'Eliminer' };
      return labels[key] || key;
    }
  }

  getStatByStatus(status: string) {
    return this.stats()?.byStatus.find(s => s.status === status)?.count || 0;
  }

  getPercentage(count: number): number {
    const total = this.stats()?.total || 1;
    return (count / total) * 100;
  }

  totalEstimated(): number {
    return this.tickets().reduce((sum, t) => sum + (t.time_estimated || 0), 0);
  }

  totalSpent(): number {
    return this.tickets().reduce((sum, t) => sum + (t.time_spent || 0), 0);
  }

  efficiency(): number {
    const estimated = this.totalEstimated();
    if (!estimated) return 0;
    return (this.totalSpent() / estimated) * 100;
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  formatPriority(priority: string): string {
    const map: any = { do: 'Faire', plan: 'Planifier', delegate: 'Deleguer', eliminate: 'Eliminer' };
    return map[priority] || priority;
  }

  formatStatus(status: string): string {
    const map: any = { todo: 'A faire', in_progress: 'En cours', done: 'Termine' };
    return map[status] || status;
  }
}
