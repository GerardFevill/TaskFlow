import { Component, inject, signal, OnInit } from '@angular/core';
import { TicketService, Stats, Ticket } from '../../data';

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
  Math = Math;

  ngOnInit() {
    this.loadStats();
    this.loadTickets();
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
