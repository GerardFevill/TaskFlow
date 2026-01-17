import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService, GlobalActivity } from '../../data';

@Component({
  selector: 'app-history',
  imports: [],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
})
export class HistoryComponent implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);

  activities = signal<GlobalActivity[]>([]);

  ngOnInit() {
    this.loadActivity();
  }

  loadActivity() {
    this.ticketService.getGlobalActivity(100).subscribe(data => {
      this.activities.set(data);
    });
  }

  openTicket(ticketId: number) {
    this.router.navigate(['/ticket', ticketId]);
  }

  getActivityIcon(action: string): string {
    const icons: Record<string, string> = {
      create: 'fa-plus',
      update: 'fa-edit',
      delete: 'fa-trash',
      status: 'fa-exchange-alt',
      time: 'fa-stopwatch',
      attachment: 'fa-paperclip',
      comment: 'fa-comment'
    };
    return icons[action] || 'fa-circle';
  }

  getActivityClass(action: string): string {
    return action;
  }

  getActivityDescription(activity: GlobalActivity): string {
    switch (activity.action) {
      case 'create':
        return activity.new_value || 'Ticket cree';
      case 'update':
        if (activity.field) {
          return `${activity.field}: ${activity.old_value || '-'} → ${activity.new_value || '-'}`;
        }
        return 'Ticket modifie';
      case 'status':
        return `Statut: ${activity.old_value} → ${activity.new_value}`;
      case 'time':
        return `Temps ajoute: ${activity.new_value}`;
      case 'attachment':
        return `Fichier ajoute: ${activity.new_value}`;
      case 'comment':
        return 'Commentaire ajoute';
      default:
        return activity.action;
    }
  }

  formatTime(date: string): string {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "A l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days < 7) return `Il y a ${days}j`;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  }
}
