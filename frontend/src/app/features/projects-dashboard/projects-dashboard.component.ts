import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { TicketService, Project } from '../../data';

@Component({
    selector: 'app-projects-dashboard',
    imports: [],
    templateUrl: './projects-dashboard.component.html',
    styleUrl: './projects-dashboard.component.scss'
})
export class ProjectsDashboardComponent implements OnInit {
    private ticketService = inject(TicketService);
    private router = inject(Router);

    projects = signal<Project[]>([]);
    loading = signal<boolean>(true);

    // Computed stats
    totalProjects = computed(() => this.projects().length);

    activeProjects = computed(() =>
        this.projects().filter(p => this.getProgress(p) < 100 && this.getTicketCount(p) > 0)
    );

    completedProjects = computed(() =>
        this.projects().filter(p => this.getProgress(p) === 100 && this.getTicketCount(p) > 0)
    );

    emptyProjects = computed(() =>
        this.projects().filter(p => this.getTicketCount(p) === 0)
    );

    totalTickets = computed(() =>
        this.projects().reduce((sum, p) => sum + this.getTicketCount(p), 0)
    );

    totalDone = computed(() =>
        this.projects().reduce((sum, p) => sum + (p.ticket_done || 0), 0)
    );

    totalInProgress = computed(() =>
        this.projects().reduce((sum, p) => sum + (p.ticket_in_progress || 0), 0)
    );

    globalProgress = computed(() => {
        const total = this.totalTickets();
        const done = this.totalDone();
        return total > 0 ? Math.round((done / total) * 100) : 0;
    });

    // Projects sorted by activity
    mostActiveProjects = computed(() =>
        [...this.projects()]
            .filter(p => this.getTicketCount(p) > 0)
            .sort((a, b) => (b.ticket_in_progress || 0) - (a.ticket_in_progress || 0))
            .slice(0, 5)
    );

    // Projects needing attention (low progress, has tickets)
    needsAttention = computed(() =>
        [...this.projects()]
            .filter(p => this.getTicketCount(p) > 0 && this.getProgress(p) < 30)
            .sort((a, b) => this.getProgress(a) - this.getProgress(b))
            .slice(0, 5)
    );

    ngOnInit() {
        this.loadProjects();
    }

    loadProjects() {
        this.loading.set(true);
        this.ticketService.getProjects().subscribe({
            next: (data) => {
                this.projects.set(data);
                this.loading.set(false);
            },
            error: () => this.loading.set(false)
        });
    }

    // Helper methods for project stats
    getTicketCount(project: Project): number {
        return project.ticket_count || 0;
    }

    getTicketDone(project: Project): number {
        return project.ticket_done || 0;
    }

    getTicketTodo(project: Project): number {
        return project.ticket_todo || 0;
    }

    getTicketInProgress(project: Project): number {
        return project.ticket_in_progress || 0;
    }

    getProgress(project: Project): number {
        const count = this.getTicketCount(project);
        if (count === 0) return 0;
        return Math.round((this.getTicketDone(project) / count) * 100);
    }

    getProgressClass(progress: number): string {
        if (progress >= 75) return 'high';
        if (progress >= 40) return 'medium';
        return 'low';
    }

    openProject(project: Project) {
        // Set as current project and navigate to dashboard
        localStorage.setItem('currentProjectId', project.id.toString());
        this.router.navigate(['/dashboard']);
    }

    openKanban(project: Project) {
        this.router.navigate(['/kanban'], { queryParams: { project: project.id } });
    }

    openWhiteboard(project: Project) {
        this.router.navigate(['/projects', project.id, 'whiteboard']);
    }

    manageProjects() {
        this.router.navigate(['/projects']);
    }
}

