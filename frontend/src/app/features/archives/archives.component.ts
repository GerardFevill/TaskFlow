import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SlicePipe } from '@angular/common';
import { TicketService, Ticket } from '../../data';

@Component({
  selector: 'app-archives',
  imports: [SlicePipe],
  templateUrl: './archives.component.html',
  styleUrl: './archives.component.scss'
})
export class ArchivesComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  allTickets = signal<Ticket[]>([]);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.ticketService.getAll().subscribe(response => {
      this.allTickets.set(response.data);
    });
  }

  archivedTickets(): Ticket[] {
    return this.allTickets().filter(t => t.archived);
  }

  restoreTicket(ticket: Ticket) {
    this.ticketService.update(ticket.id, { archived: false }).subscribe(() => {
      this.loadTickets();
    });
  }

  viewTicket(ticket: Ticket) {
    this.router.navigate(['/ticket', ticket.id]);
  }

  deleteTicket(ticket: Ticket) {
    if (confirm(`Supprimer definitivement "${ticket.title}" ?`)) {
      this.ticketService.delete(ticket.id).subscribe(() => {
        this.loadTickets();
      });
    }
  }

  restoreAll() {
    if (!confirm('Restaurer tous les tickets archives ?')) return;
    const archived = this.archivedTickets();
    let completed = 0;
    archived.forEach(ticket => {
      this.ticketService.update(ticket.id, { archived: false }).subscribe(() => {
        completed++;
        if (completed === archived.length) {
          this.loadTickets();
        }
      });
    });
  }

  deleteAll() {
    if (!confirm('Supprimer definitivement TOUS les tickets archives ? Cette action est irreversible.')) return;
    const archived = this.archivedTickets();
    let completed = 0;
    archived.forEach(ticket => {
      this.ticketService.delete(ticket.id).subscribe(() => {
        completed++;
        if (completed === archived.length) {
          this.loadTickets();
        }
      });
    });
  }

  formatStatus(status: string): string {
    const map: any = { todo: 'A faire', in_progress: 'En cours', done: 'Termine' };
    return map[status] || status;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    if (h > 0) return `${h}h${m}m`;
    return `${m}m`;
  }
}
