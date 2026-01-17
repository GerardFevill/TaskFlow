import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TicketService, Ticket, Label } from '../../data';

@Component({
  selector: 'app-list',
  imports: [FormsModule],
  templateUrl: './list.component.html',
  styleUrl: './list.component.scss'
})
export class ListComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  tickets = signal<Ticket[]>([]);
  filteredTickets = signal<Ticket[]>([]);

  searchQuery = '';
  statusFilter = '';
  priorityFilter = '';
  sortBy = 'id-desc';

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    const projectId = localStorage.getItem('currentProjectId');
    this.ticketService.getAll(projectId ? parseInt(projectId) : undefined).subscribe(response => {
      // Labels are now included directly in the API response
      this.tickets.set(response.data.filter(t => !t.archived));
      this.applyFilters();
    });
  }

  applyFilters() {
    let result = [...this.tickets()];

    // Search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (this.statusFilter) {
      result = result.filter(t => t.status === this.statusFilter);
    }

    // Priority filter
    if (this.priorityFilter) {
      result = result.filter(t => t.priority === this.priorityFilter);
    }

    // Sort
    result = this.sortTickets(result);

    // Pinned first
    result.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    this.filteredTickets.set(result);
  }

  sortTickets(tickets: Ticket[]): Ticket[] {
    const [field, order] = this.sortBy.split('-');
    return tickets.sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case 'id':
          comparison = a.id - b.id;
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'due':
          if (!a.due_date && !b.due_date) comparison = 0;
          else if (!a.due_date) comparison = 1;
          else if (!b.due_date) comparison = -1;
          else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
          break;
        case 'priority':
          const priorityOrder: Record<string, number> = { do: 0, plan: 1, delegate: 2, eliminate: 3 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
      }
      return order === 'desc' ? -comparison : comparison;
    });
  }

  togglePin(ticket: Ticket, event: Event) {
    event.stopPropagation();
    this.ticketService.togglePin(ticket.id).subscribe(updated => {
      ticket.pinned = updated.pinned;
      this.applyFilters();
    });
  }

  openTicket(ticket: Ticket) {
    this.router.navigate(['/ticket', ticket.id]);
  }

  deleteTicket(ticket: Ticket) {
    if (confirm(`Supprimer "${ticket.title}" ?`)) {
      this.ticketService.delete(ticket.id).subscribe(() => {
        this.loadTickets();
      });
    }
  }

  getProgress(ticket: Ticket): number {
    if (!ticket.task_count) return 0;
    return (ticket.task_done! / ticket.task_count) * 100;
  }

  isOverdue(ticket: Ticket): boolean {
    if (!ticket.due_date || ticket.status === 'done') return false;
    return new Date(ticket.due_date) < new Date();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      do: 'Faire',
      plan: 'Planifier',
      delegate: 'Deleguer',
      eliminate: 'Eliminer'
    };
    return labels[priority] || priority;
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      todo: 'A faire',
      in_progress: 'En cours',
      done: 'Termine'
    };
    return labels[status] || status;
  }
}
