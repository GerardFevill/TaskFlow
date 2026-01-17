import { Component, inject, signal, OnInit } from '@angular/core';
import { SlicePipe } from '@angular/common';
import { Router } from '@angular/router';
import { TicketService, Ticket } from '../../data';

@Component({
  selector: 'app-calendar',
  imports: [SlicePipe],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.scss'
})
export class CalendarComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  tickets = signal<Ticket[]>([]);
  months = signal<any[]>([]);

  ngOnInit() {
    this.loadTickets();
  }

  loadTickets() {
    this.ticketService.getAll().subscribe(response => {
      this.tickets.set(response.data.filter(t => !t.archived));
      this.generateMonths();
    });
  }

  generateMonths() {
    const now = new Date();
    const monthsData = [];

    for (let m = 0; m < 3; m++) {
      const date = new Date(now.getFullYear(), now.getMonth() + m, 1);
      const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
      const days = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dayDate = new Date(date.getFullYear(), date.getMonth(), d);
        const dayTickets = this.tickets().filter(t => {
          if (!t.due_date) return false;
          const ticketDate = new Date(t.due_date);
          return ticketDate.toDateString() === dayDate.toDateString();
        });
        days.push({ num: d, date: dayDate, tickets: dayTickets });
      }

      monthsData.push({ name: monthName, days });
    }

    this.months.set(monthsData);
  }

  upcomingTickets() {
    return this.tickets()
      .filter(t => t.due_date && t.status !== 'done')
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());
  }

  openTicket(ticket: Ticket) {
    this.router.navigate(['/ticket', ticket.id]);
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isOverdue(ticket: Ticket): boolean {
    if (!ticket.due_date || ticket.status === 'done') return false;
    return new Date(ticket.due_date) < new Date();
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' });
  }

  formatStatus(status: string): string {
    const map: any = { todo: 'A faire', in_progress: 'En cours', done: 'Termine' };
    return map[status] || status;
  }
}
