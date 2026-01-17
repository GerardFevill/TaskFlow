import { Component, inject, signal, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TicketService, Ticket, Stats, Project } from '../../data';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  tickets = signal<Ticket[]>([]);
  stats = signal<Stats | null>(null);
  currentProject = signal<Project | null>(null);
  currentProjectId = signal<number | null>(null);
  loading = signal<boolean>(true);

  ngOnInit() {
    this.loadProject();
    this.loadData();
  }

  loadProject() {
    const savedProjectId = localStorage.getItem('currentProjectId');
    if (savedProjectId) {
      const projectId = parseInt(savedProjectId);
      this.currentProjectId.set(projectId);
      this.ticketService.getProject(projectId).subscribe({
        next: (project) => this.currentProject.set(project),
        error: () => {
          localStorage.removeItem('currentProjectId');
          this.currentProjectId.set(null);
        }
      });
    }
  }

  loadData() {
    this.loading.set(true);
    const projectId = this.currentProjectId() || undefined;
    this.ticketService.getAll(projectId).subscribe(response => {
      this.tickets.set(response.data.filter(t => !t.archived));
      this.loading.set(false);
    });
    this.ticketService.getStats().subscribe(data => {
      this.stats.set(data);
    });
  }

  projectStats() {
    const tickets = this.tickets();
    const total = tickets.length;
    const todo = tickets.filter(t => t.status === 'todo').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const done = tickets.filter(t => t.status === 'done').length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, todo, inProgress, done, progress };
  }

  overdueTickets(): Ticket[] {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this.tickets()
      .filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }

  todayTickets(): Ticket[] {
    const today = new Date().toDateString();
    return this.tickets()
      .filter(t => t.due_date && new Date(t.due_date).toDateString() === today && t.status !== 'done');
  }

  inProgressTickets(): Ticket[] {
    return this.tickets().filter(t => t.status === 'in_progress');
  }

  thisWeekTickets(): Ticket[] {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);
    return this.tickets()
      .filter(t => {
        if (!t.due_date || t.status === 'done') return false;
        const due = new Date(t.due_date);
        return due >= now && due <= endOfWeek;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }

  recentTickets(): Ticket[] {
    return [...this.tickets()]
      .sort((a, b) => (b.id || 0) - (a.id || 0));
  }

  openTicket(ticket: Ticket) {
    this.router.navigate(['/ticket', ticket.id]);
  }

  getProgress(ticket: Ticket): number {
    if (!ticket.time_estimated) return 0;
    return Math.min(100, ((ticket.time_spent || 0) / ticket.time_estimated) * 100);
  }

  formatStatus(status: string): string {
    const map: any = { todo: 'A faire', in_progress: 'En cours', done: 'Termine' };
    return map[status] || status;
  }

  formatRelativeDate(date: string): string {
    const diff = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Hier';
    return `${diff}j retard`;
  }

  formatShortDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' });
  }
}
