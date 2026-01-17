import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService, GanttItem } from '../../data';

@Component({
  selector: 'app-gantt',
  imports: [],
  templateUrl: './gantt.component.html',
  styleUrl: './gantt.component.scss'
})
export class GanttComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  ganttData = signal<GanttItem[]>([]);
  days = signal<any[]>([]);

  ngOnInit() {
    this.generateDays();
    this.loadGanttData();
  }

  generateDays() {
    const daysData = [];
    const today = new Date();
    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

    for (let i = -7; i < 21; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      daysData.push({
        date: d,
        num: d.getDate(),
        dayName: dayNames[d.getDay()]
      });
    }

    this.days.set(daysData);
  }

  loadGanttData() {
    this.ticketService.getGanttData().subscribe(data => {
      this.ganttData.set(data);
    });
  }

  openTicket(id: number) {
    this.router.navigate(['/ticket', id]);
  }

  isToday(date: Date): boolean {
    return date.toDateString() === new Date().toDateString();
  }

  isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  getBarLeft(item: GanttItem): number {
    const days = this.days();
    if (!days.length) return 0;
    const start = item.start_date ? new Date(item.start_date) : new Date();
    const firstDay = days[0].date;
    const diffTime = start.getTime() - firstDay.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, (diffDays / days.length) * 100);
  }

  getBarWidth(item: GanttItem): number {
    const days = this.days();
    if (!days.length) return 0;
    const start = item.start_date ? new Date(item.start_date) : new Date();
    const end = item.due_date ? new Date(item.due_date) : new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    return Math.min((diffDays / days.length) * 100, 100 - this.getBarLeft(item));
  }

  getBarTooltip(item: GanttItem): string {
    let tooltip = item.title;
    if (item.start_date) tooltip += `\nDebut: ${new Date(item.start_date).toLocaleDateString('fr-FR')}`;
    if (item.due_date) tooltip += `\nFin: ${new Date(item.due_date).toLocaleDateString('fr-FR')}`;
    if (item.time_estimated) tooltip += `\nEstime: ${item.time_estimated}min`;
    if (item.time_spent) tooltip += `\nPasse: ${item.time_spent}min`;
    return tooltip;
  }

  formatStatus(status: string): string {
    const map: any = { todo: 'A faire', in_progress: 'En cours', done: 'Termine' };
    return map[status] || status;
  }
}
