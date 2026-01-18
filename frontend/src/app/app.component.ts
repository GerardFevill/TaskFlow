import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TicketService, Project, Ticket } from './data';
import { ToastService, UndoService } from './core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'app-root',
    imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class App implements OnInit {
    private ticketService = inject(TicketService);
    private router = inject(Router);
    toastService = inject(ToastService);
    undoService = inject(UndoService);

    // Theme settings
    lightMode = signal<boolean>(this.getInitialTheme());
    accentColor = signal<string>(localStorage.getItem('accentColor') || 'indigo');
    accentColors = [
        { id: 'indigo', name: 'Indigo', color: '#6366f1' },
        { id: 'blue', name: 'Bleu', color: '#3b82f6' },
        { id: 'green', name: 'Vert', color: '#22c55e' },
        { id: 'purple', name: 'Violet', color: '#a855f7' },
        { id: 'rose', name: 'Rose', color: '#f43f5e' },
        { id: 'orange', name: 'Orange', color: '#f97316' },
        { id: 'cyan', name: 'Cyan', color: '#06b6d4' }
    ];

    reminderCount = signal<number>(0);
    mobileMenuOpen = signal<boolean>(false);
    sidebarCollapsed = signal<boolean>(localStorage.getItem('sidebarCollapsed') === 'true');
    search = '';

    private getInitialTheme(): boolean {
        const savedTheme = localStorage.getItem('lightMode');
        if (savedTheme !== null) {
            return savedTheme === 'true';
        }
        // Detect system preference
        return window.matchMedia?.('(prefers-color-scheme: light)').matches ?? false;
    }

    // Projects
    projects = signal<Project[]>([]);
    currentProjectId = signal<number | null>(null);
    currentProject = signal<Project | null>(null);
    projectDropdownOpen = signal<boolean>(false);

    // Advanced Search
    searchModalOpen = signal<boolean>(false);
    searchResults = signal<Ticket[]>([]);

    // Settings
    settingsModalOpen = signal<boolean>(false);
    settings = signal<Record<string, string>>({});

    // Debounced search
    private searchSubject = new Subject<string>();
    searchLoading = signal<boolean>(false);
    advSearch = {
        query: '',
        statusTodo: false,
        statusInProgress: false,
        statusDone: false,
        priorityDo: false,
        priorityPlan: false,
        priorityDelegate: false,
        priorityEliminate: false,
        dateFrom: '',
        dateTo: '',
        pinnedOnly: false
    };

    @HostListener('document:click', ['$event'])
    handleClick(event: Event) {
        const target = event.target as HTMLElement;
        if (this.projectDropdownOpen() && !target.closest('.project-selector') && !target.closest('.project-dropdown')) {
            this.projectDropdownOpen.set(false);
        }
    }

    @HostListener('document:keydown', ['$event'])
    handleKeydown(event: KeyboardEvent) {
        // Ctrl+K: Open search
        if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
            event.preventDefault();
            this.openSearchModal();
        }
        // Ctrl+Z: Undo
        if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
            event.preventDefault();
            this.performUndo();
        }
        // Ctrl+Y or Ctrl+Shift+Z: Redo
        if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
            event.preventDefault();
            this.performRedo();
        }
        // Escape: Close modals
        if (event.key === 'Escape') {
            if (this.searchModalOpen()) this.closeSearchModal();
            if (this.settingsModalOpen()) this.closeSettingsModal();
        }
    }

    ngOnInit() {
        this.loadReminderCount();
        this.loadProjects();

        const savedProjectId = localStorage.getItem('currentProjectId');
        if (savedProjectId) {
            this.currentProjectId.set(parseInt(savedProjectId));
        }

        // Setup debounced search
        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(query => {
            if (query.trim()) {
                this.doAdvancedSearch();
            }
        });
    }


    loadReminderCount() {
        this.ticketService.getReminders().subscribe(data => this.reminderCount.set(data.length));
    }

    loadProjects() {
        this.ticketService.getProjects().subscribe(data => {
            this.projects.set(data);
            if (this.currentProjectId()) {
                const project = data.find(p => p.id === this.currentProjectId());
                this.currentProject.set(project || null);
            }
        });
    }

    selectProject(project: Project | null) {
        this.currentProjectId.set(project?.id || null);
        this.currentProject.set(project);
        this.projectDropdownOpen.set(false);

        if (project) {
            localStorage.setItem('currentProjectId', project.id.toString());
        } else {
            localStorage.removeItem('currentProjectId');
        }

        if (project) {
            this.router.navigate(['/kanban'], { queryParams: { project: project.id } });
        } else {
            this.router.navigate(['/kanban']);
        }
    }

    getWhiteboardLink(): string[] {
        const projectId = this.currentProjectId();
        if (projectId) {
            return ['/projects', projectId.toString(), 'whiteboard'];
        }
        return ['/projects'];
    }

    doSearch() {
        if (this.search.trim()) {
            window.location.href = `/kanban?q=${encodeURIComponent(this.search)}`;
        }
    }

    exportData(format: 'json' | 'csv') {
        const projectId = this.currentProjectId() || undefined;
        const projectName = this.currentProject()?.name || 'all';
        this.ticketService.export(format, projectId).subscribe(data => {
            const blob = new Blob([typeof data === 'string' ? data : JSON.stringify(data, null, 2)], {
                type: format === 'csv' ? 'text/csv' : 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safeName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
            a.download = `export-${safeName}-${new Date().toISOString().split('T')[0]}.${format}`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    triggerImport() {
        document.querySelector<HTMLInputElement>('input[type="file"]')?.click();
    }

    importFile(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result as string);
                    const tickets = Array.isArray(data) ? data : data.tickets || [];
                    this.ticketService.import(tickets).subscribe(() => {
                        window.location.reload();
                    });
                } catch (e) {
                    console.error('Invalid JSON file');
                }
            };
            reader.readAsText(file);
        }
    }

    quickAdd() {
        this.router.navigate(['/tickets/new']);
    }

    openSearchModal() {
        this.searchModalOpen.set(true);
        this.searchResults.set([]);
    }

    closeSearchModal() {
        this.searchModalOpen.set(false);
    }

    resetAdvSearch() {
        this.advSearch = {
            query: '',
            statusTodo: false,
            statusInProgress: false,
            statusDone: false,
            priorityDo: false,
            priorityPlan: false,
            priorityDelegate: false,
            priorityEliminate: false,
            dateFrom: '',
            dateTo: '',
            pinnedOnly: false
        };
        this.searchResults.set([]);
    }

    onSearchInput(event: Event) {
        const value = (event.target as HTMLInputElement).value;
        this.searchSubject.next(value);
    }

    doAdvancedSearch() {
        this.searchLoading.set(true);
        this.executeAdvSearch();
    }

    executeAdvSearch() {
        const status: string[] = [];
        if (this.advSearch.statusTodo) status.push('todo');
        if (this.advSearch.statusInProgress) status.push('in_progress');
        if (this.advSearch.statusDone) status.push('done');

        const priority: string[] = [];
        if (this.advSearch.priorityDo) priority.push('do');
        if (this.advSearch.priorityPlan) priority.push('plan');
        if (this.advSearch.priorityDelegate) priority.push('delegate');
        if (this.advSearch.priorityEliminate) priority.push('eliminate');

        this.ticketService.advancedSearch({
            query: this.advSearch.query || undefined,
            status: status.length > 0 ? status : undefined,
            priority: priority.length > 0 ? priority : undefined,
            dateFrom: this.advSearch.dateFrom || undefined,
            dateTo: this.advSearch.dateTo || undefined,
            projectId: this.currentProjectId() || undefined,
            pinned: this.advSearch.pinnedOnly ? true : undefined
        }).subscribe(results => {
            this.searchResults.set(results);
            this.searchLoading.set(false);
        });
    }

    openSearchResult(ticket: Ticket) {
        this.closeSearchModal();
        this.router.navigate(['/ticket', ticket.id]);
    }

    getStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            todo: 'A faire',
            in_progress: 'En cours',
            done: 'Termine'
        };
        return labels[status] || status;
    }

    toggleSidebar() {
        const newState = !this.sidebarCollapsed();
        this.sidebarCollapsed.set(newState);
        localStorage.setItem('sidebarCollapsed', String(newState));
    }

    toggleLightMode() {
        const newState = !this.lightMode();
        this.lightMode.set(newState);
        localStorage.setItem('lightMode', String(newState));
    }

    setAccentColor(colorId: string) {
        this.accentColor.set(colorId);
        localStorage.setItem('accentColor', colorId);
    }

    // Settings Modal
    openSettingsModal() {
        this.loadSettings();
        this.settingsModalOpen.set(true);
    }

    closeSettingsModal() {
        this.settingsModalOpen.set(false);
    }

    loadSettings() {
        this.ticketService.getSettings().subscribe(data => {
            this.settings.set(data);
        });
    }

    toggleAutoArchive(event: Event) {
        const checked = (event.target as HTMLInputElement).checked;
        this.ticketService.updateSetting('auto_archive_enabled', String(checked)).subscribe(() => {
            this.loadSettings();
            this.toastService.success(checked ? 'Auto-archivage active' : 'Auto-archivage desactive');
        });
    }

    setAutoArchiveDays(event: Event) {
        const days = (event.target as HTMLSelectElement).value;
        this.ticketService.updateSetting('auto_archive_days', days).subscribe(() => {
            this.loadSettings();
            this.toastService.success(`Delai d'archivage: ${days} jour(s)`);
        });
    }

    runAutoArchive() {
        this.ticketService.runAutoArchive().subscribe(result => {
            if (result.archived > 0) {
                this.toastService.success(`${result.archived} ticket(s) archive(s)`);
            } else {
                this.toastService.info('Aucun ticket a archiver');
            }
        });
    }

    // Undo/Redo
    performUndo() {
        const action = this.undoService.undo();
        if (!action) {
            this.toastService.info('Rien a annuler');
            return;
        }

        // Restore previous state
        switch (action.type) {
            case 'update':
                this.ticketService.update(action.entityId, action.previousData).subscribe(() => {
                    this.toastService.info(`Annule: ${action.description}`);
                });
                break;
            case 'delete':
                // Restore deleted ticket (need backend support)
                this.toastService.info(`Annule: ${action.description}`);
                break;
            case 'archive':
                this.ticketService.update(action.entityId, { archived: false }).subscribe(() => {
                    this.toastService.info(`Annule: ${action.description}`);
                });
                break;
        }
    }

    performRedo() {
        const action = this.undoService.redo();
        if (!action) {
            this.toastService.info('Rien a refaire');
            return;
        }

        // Re-apply action
        switch (action.type) {
            case 'update':
                this.ticketService.update(action.entityId, action.newData).subscribe(() => {
                    this.toastService.info(`Refait: ${action.description}`);
                });
                break;
            case 'archive':
                this.ticketService.update(action.entityId, { archived: true }).subscribe(() => {
                    this.toastService.info(`Refait: ${action.description}`);
                });
                break;
        }
    }
}
