import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService, Ticket } from '../../data';

@Component({
  selector: 'app-reminders',
  imports: [],
  templateUrl: './reminders.component.html',
  styleUrl: './reminders.component.scss'
})
export class RemindersComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  tickets = signal<Ticket[]>([]);
  reminders = signal<Ticket[]>([]);

  ngOnInit() {
    this.loadTickets();
    this.loadReminders();
  }

  loadTickets() {
    this.ticketService.getAll().subscribe(response => {
      this.tickets.set(response.data.filter(t => !t.archived && t.status !== 'done'));
    });
  }

  loadReminders() {
    this.ticketService.getReminders().subscribe(data => this.reminders.set(data));
  }

  overdueTickets() {
    const now = new Date();
    return this.tickets()
      .filter(t => t.due_date && new Date(t.due_date) < now)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }

  upcomingTickets() {
    const now = new Date();
    const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return this.tickets()
      .filter(t => {
        if (!t.due_date) return false;
        const dueDate = new Date(t.due_date);
        return dueDate >= now && dueDate <= nextWeek;
      })
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }

  openTicket(ticket: Ticket) {
    this.router.navigate(['/ticket', ticket.id]);
  }

  getDaysOverdue(ticket: Ticket): number {
    if (!ticket.due_date) return 0;
    const diff = new Date().getTime() - new Date(ticket.due_date).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  getDaysUntil(ticket: Ticket): number {
    if (!ticket.due_date) return 0;
    const diff = new Date(ticket.due_date).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  }
}
