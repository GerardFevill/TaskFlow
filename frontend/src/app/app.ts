import { Component, inject, signal, OnInit, HostListener, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { TicketService, Project, Ticket } from './data';
import { ToastService, UndoService } from './core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app" [class.light]="lightMode()" [class.sidebar-collapsed]="sidebarCollapsed()">
      <!-- SIDEBAR -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()" [class.mobile-open]="mobileMenuOpen()">
        <div class="sidebar-header">
          <div class="logo" routerLink="/dashboard">
            <i class="fas fa-tasks"></i>
            <span class="logo-text">TaskFlow</span>
          </div>
          <button class="collapse-btn" (click)="toggleSidebar()">
            <i class="fas" [class.fa-chevron-left]="!sidebarCollapsed()" [class.fa-chevron-right]="sidebarCollapsed()"></i>
          </button>
        </div>

        <!-- Project Selector -->
        <div class="sidebar-section">
          <div class="project-selector" (click)="projectDropdownOpen.set(!projectDropdownOpen())">
            <i class="fas" [class]="currentProject()?.icon || 'fa-layer-group'" [style.color]="currentProject()?.color || 'var(--accent)'"></i>
            <span class="project-name">{{ currentProject()?.name || 'Tous les projets' }}</span>
            <i class="fas fa-chevron-down chevron"></i>
          </div>
          @if (projectDropdownOpen()) {
            <div class="project-dropdown">
              <div class="dropdown-item" [class.active]="!currentProjectId()" (click)="selectProject(null)">
                <i class="fas fa-layer-group"></i>
                <span>Tous les projets</span>
              </div>
              @for (project of projects(); track project.id) {
                <div class="dropdown-item" [class.active]="currentProjectId() === project.id" (click)="selectProject(project)">
                  <i class="fas" [class]="project.icon" [style.color]="project.color"></i>
                  <span>{{ project.name }}</span>
                  <span class="count">{{ project.ticket_count || 0 }}</span>
                </div>
              }
              <div class="dropdown-divider"></div>
              <div class="dropdown-item manage" routerLink="/projects" (click)="projectDropdownOpen.set(false)">
                <i class="fas fa-cog"></i>
                <span>Gerer les projets</span>
              </div>
            </div>
          }
        </div>

        <!-- Search -->
        <div class="sidebar-search" (click)="openSearchModal()">
          <i class="fas fa-search"></i>
          <span>Rechercher...</span>
          <kbd>Ctrl+K</kbd>
        </div>

        <!-- Main Navigation -->
        <nav class="sidebar-nav">
          <div class="nav-group">
            <a routerLink="/dashboard" routerLinkActive="active">
              <i class="fas fa-home"></i>
              <span>Accueil</span>
            </a>
            <a routerLink="/kanban" routerLinkActive="active">
              <i class="fas fa-columns"></i>
              <span>Kanban</span>
            </a>
            <a routerLink="/list" routerLinkActive="active">
              <i class="fas fa-list"></i>
              <span>Liste</span>
            </a>
            <a routerLink="/calendar" routerLinkActive="active">
              <i class="fas fa-calendar-alt"></i>
              <span>Calendrier</span>
            </a>
            <a routerLink="/gantt" routerLinkActive="active">
              <i class="fas fa-bars-staggered"></i>
              <span>Gantt</span>
            </a>
          </div>

          <div class="nav-group">
            <div class="nav-label">Outils</div>
            <a [routerLink]="getWhiteboardLink()" routerLinkActive="active" [class.disabled]="!currentProjectId()">
              <i class="fas fa-chalkboard"></i>
              <span>Whiteboard</span>
            </a>
            <a routerLink="/stats" routerLinkActive="active">
              <i class="fas fa-chart-pie"></i>
              <span>Statistiques</span>
            </a>
            <a routerLink="/projects-dashboard" routerLinkActive="active">
              <i class="fas fa-layer-group"></i>
              <span>Suivi Projets</span>
            </a>
            <a routerLink="/templates" routerLinkActive="active">
              <i class="fas fa-clone"></i>
              <span>Templates</span>
            </a>
            <a routerLink="/reminders" routerLinkActive="active">
              <i class="fas fa-bell"></i>
              <span>Rappels</span>
              @if (reminderCount() > 0) {
                <span class="nav-badge">{{ reminderCount() }}</span>
              }
            </a>
          </div>

          <div class="nav-group">
            <div class="nav-label">Planification</div>
            <a routerLink="/backlog" routerLinkActive="active">
              <i class="fas fa-inbox"></i>
              <span>Backlog</span>
            </a>
            <a routerLink="/epics" routerLinkActive="active">
              <i class="fas fa-flag"></i>
              <span>Epics</span>
            </a>
            <a routerLink="/sprints" routerLinkActive="active">
              <i class="fas fa-rocket"></i>
              <span>Sprints</span>
            </a>
            <a routerLink="/milestones" routerLinkActive="active">
              <i class="fas fa-map-pin"></i>
              <span>Milestones</span>
            </a>
          </div>

          <div class="nav-group">
            <div class="nav-label">Archives</div>
            <a routerLink="/history" routerLinkActive="active">
              <i class="fas fa-history"></i>
              <span>Historique</span>
            </a>
            <a routerLink="/archives" routerLinkActive="active">
              <i class="fas fa-archive"></i>
              <span>Archives</span>
            </a>
          </div>
        </nav>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <button class="footer-btn" (click)="openSettingsModal()" title="Parametres">
            <i class="fas fa-cog"></i>
            <span>Parametres</span>
          </button>
          <button class="footer-btn" (click)="toggleLightMode()" title="Theme">
            <i class="fas" [class.fa-moon]="lightMode()" [class.fa-sun]="!lightMode()"></i>
            <span>{{ lightMode() ? 'Sombre' : 'Clair' }}</span>
          </button>
        </div>
      </aside>

      <!-- MAIN CONTENT -->
      <div class="main-wrapper">
        <!-- Top Bar -->
        <header class="topbar">
          <button class="mobile-menu-btn" (click)="mobileMenuOpen.set(!mobileMenuOpen())">
            <i class="fas fa-bars"></i>
          </button>

          <div class="topbar-search" (click)="openSearchModal()">
            <i class="fas fa-search"></i>
            <input type="text" placeholder="Rechercher..." readonly>
          </div>

          <div class="topbar-actions">
            <button class="action-btn undo-btn" [disabled]="!undoService.canUndo()" (click)="performUndo()" [title]="'Annuler: ' + undoService.getLastUndoDescription()">
              <i class="fas fa-undo"></i>
            </button>
            <button class="action-btn redo-btn" [disabled]="!undoService.canRedo()" (click)="performRedo()" [title]="'Refaire: ' + undoService.getLastRedoDescription()">
              <i class="fas fa-redo"></i>
            </button>
            <button class="action-btn" routerLink="/reminders" title="Rappels">
              <i class="fas fa-bell"></i>
              @if (reminderCount() > 0) {
                <span class="action-badge">{{ reminderCount() }}</span>
              }
            </button>
            <button class="action-btn add-btn" (click)="quickAdd()" title="Nouveau ticket">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        </header>

        <main>
          <router-outlet></router-outlet>
        </main>
      </div>

      <!-- MOBILE SIDEBAR OVERLAY -->
      @if (mobileMenuOpen()) {
        <div class="mobile-overlay" (click)="mobileMenuOpen.set(false)"></div>
      }

      <!-- MOBILE BOTTOM NAV -->
      <nav class="mobile-bottom-nav">
        <a routerLink="/dashboard" routerLinkActive="active">
          <i class="fas fa-home"></i>
        </a>
        <a routerLink="/kanban" routerLinkActive="active">
          <i class="fas fa-columns"></i>
        </a>
        <button class="fab-center" (click)="quickAdd()">
          <i class="fas fa-plus"></i>
        </button>
        <a routerLink="/calendar" routerLinkActive="active">
          <i class="fas fa-calendar-alt"></i>
        </a>
        <a routerLink="/reminders" routerLinkActive="active">
          <i class="fas fa-bell"></i>
          @if (reminderCount() > 0) {
            <span class="badge">{{ reminderCount() }}</span>
          }
        </a>
      </nav>


      <!-- Hidden file input -->
      <input type="file" #fileInput style="display:none" accept=".json" (change)="importFile($event)">

      <!-- SEARCH MODAL -->
      @if (searchModalOpen()) {
        <div class="modal-overlay" (click)="closeSearchModal()">
          <div class="search-modal" (click)="$event.stopPropagation()">
            <div class="search-input-wrapper">
              @if (searchLoading()) {
                <i class="fas fa-spinner fa-spin"></i>
              } @else {
                <i class="fas fa-search"></i>
              }
              <input type="text" [(ngModel)]="advSearch.query" placeholder="Rechercher des tickets..." autofocus (input)="onSearchInput($event)" (keyup.enter)="executeAdvSearch()">
              <kbd>ESC</kbd>
            </div>

            <div class="search-filters">
              <div class="filter-group">
                <span class="filter-label">Statut:</span>
                <label class="filter-chip" [class.active]="advSearch.statusTodo">
                  <input type="checkbox" [(ngModel)]="advSearch.statusTodo"> A faire
                </label>
                <label class="filter-chip" [class.active]="advSearch.statusInProgress">
                  <input type="checkbox" [(ngModel)]="advSearch.statusInProgress"> En cours
                </label>
                <label class="filter-chip" [class.active]="advSearch.statusDone">
                  <input type="checkbox" [(ngModel)]="advSearch.statusDone"> Termine
                </label>
              </div>
              <div class="filter-group">
                <span class="filter-label">Priorite:</span>
                <label class="filter-chip do" [class.active]="advSearch.priorityDo">
                  <input type="checkbox" [(ngModel)]="advSearch.priorityDo"> Faire
                </label>
                <label class="filter-chip plan" [class.active]="advSearch.priorityPlan">
                  <input type="checkbox" [(ngModel)]="advSearch.priorityPlan"> Planifier
                </label>
                <label class="filter-chip delegate" [class.active]="advSearch.priorityDelegate">
                  <input type="checkbox" [(ngModel)]="advSearch.priorityDelegate"> Deleguer
                </label>
                <label class="filter-chip eliminate" [class.active]="advSearch.priorityEliminate">
                  <input type="checkbox" [(ngModel)]="advSearch.priorityEliminate"> Eliminer
                </label>
              </div>
              <div class="filter-row">
                <label class="filter-chip" [class.active]="advSearch.pinnedOnly">
                  <input type="checkbox" [(ngModel)]="advSearch.pinnedOnly">
                  <i class="fas fa-star"></i> Favoris uniquement
                </label>
                <button class="search-btn" (click)="executeAdvSearch()">
                  <i class="fas fa-search"></i> Rechercher
                </button>
              </div>
            </div>

            @if (searchResults().length > 0) {
              <div class="search-results">
                @for (ticket of searchResults(); track ticket.id) {
                  <div class="result-item" (click)="openSearchResult(ticket)">
                    <span class="result-priority" [class]="ticket.priority"></span>
                    <span class="result-title">{{ ticket.title }}</span>
                    <span class="result-status" [class]="ticket.status">{{ getStatusLabel(ticket.status) }}</span>
                    <i class="fas fa-arrow-right"></i>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- TOAST NOTIFICATIONS -->
      <div class="toast-container">
        @for (toast of toastService.toasts(); track toast.id) {
          <div class="toast" [class]="toast.type" (click)="toastService.remove(toast.id)">
            <i class="fas" [class.fa-check-circle]="toast.type === 'success'"
               [class.fa-exclamation-circle]="toast.type === 'error'"
               [class.fa-exclamation-triangle]="toast.type === 'warning'"
               [class.fa-info-circle]="toast.type === 'info'"></i>
            <span>{{ toast.message }}</span>
            <button class="toast-close"><i class="fas fa-times"></i></button>
          </div>
        }
      </div>

      <!-- SETTINGS MODAL -->
      @if (settingsModalOpen()) {
        <div class="modal-overlay" (click)="closeSettingsModal()">
          <div class="settings-modal" (click)="$event.stopPropagation()">
            <div class="settings-header">
              <h3><i class="fas fa-cog"></i> Parametres</h3>
              <button (click)="closeSettingsModal()"><i class="fas fa-times"></i></button>
            </div>
            <div class="settings-body">
              <!-- Import/Export Section -->
              <div class="settings-section">
                <h4><i class="fas fa-file-alt"></i> Donnees</h4>
                <div class="settings-row">
                  <button class="settings-btn" (click)="triggerImport()">
                    <i class="fas fa-file-import"></i> Importer JSON
                  </button>
                  <button class="settings-btn" (click)="exportData('json')">
                    <i class="fas fa-file-code"></i> Exporter JSON
                  </button>
                  <button class="settings-btn" (click)="exportData('csv')">
                    <i class="fas fa-file-csv"></i> Exporter CSV
                  </button>
                </div>
              </div>

              <!-- Auto-Archive Section -->
              <div class="settings-section">
                <h4><i class="fas fa-archive"></i> Auto-archivage</h4>
                <div class="settings-option">
                  <label class="toggle-switch">
                    <input type="checkbox" [checked]="settings()['auto_archive_enabled'] === 'true'" (change)="toggleAutoArchive($event)">
                    <span class="toggle-slider"></span>
                  </label>
                  <span>Archiver automatiquement les tickets termines</span>
                </div>
                @if (settings()['auto_archive_enabled'] === 'true') {
                  <div class="settings-option indent">
                    <span>Apres</span>
                    <select [value]="settings()['auto_archive_days'] || '7'" (change)="setAutoArchiveDays($event)">
                      <option value="1">1 jour</option>
                      <option value="3">3 jours</option>
                      <option value="7">7 jours</option>
                      <option value="14">14 jours</option>
                      <option value="30">30 jours</option>
                    </select>
                  </div>
                  <button class="settings-btn accent" (click)="runAutoArchive()">
                    <i class="fas fa-play"></i> Archiver maintenant
                  </button>
                }
              </div>

              <!-- Appearance Section -->
              <div class="settings-section">
                <h4><i class="fas fa-palette"></i> Apparence</h4>
                <div class="settings-option">
                  <label class="toggle-switch">
                    <input type="checkbox" [checked]="lightMode()" (change)="toggleLightMode()">
                    <span class="toggle-slider"></span>
                  </label>
                  <span>Mode clair</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; min-height: 100vh; }

    .app {
      --bg-primary: #0a0a0f;
      --bg-secondary: #12121a;
      --bg-tertiary: #1a1a24;
      --bg-hover: #22222e;
      --border: #2a2a3a;
      --text: #e8e8f0;
      --text-muted: #6b6b80;
      --accent: #6c5ce7;
      --accent-hover: #7d6ef0;
      --do: #ff6b6b;
      --plan: #4ecdc4;
      --delegate: #ffa502;
      --eliminate: #636e72;
      --success: #00b894;
      --warning: #fdcb6e;
      --danger: #d63031;
      --sidebar-width: 260px;
      --sidebar-collapsed: 70px;
      --topbar-height: 60px;
      font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
      background: var(--bg-primary);
      color: var(--text);
      min-height: 100vh;
      display: flex;
    }

    .app.light {
      --bg-primary: #f8f9fa;
      --bg-secondary: #ffffff;
      --bg-tertiary: #f1f3f4;
      --bg-hover: #e8eaed;
      --border: #dadce0;
      --text: #202124;
      --text-muted: #5f6368;
    }

    /* SCROLLBAR DARK */
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-primary); }
    ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
    ::-webkit-scrollbar-corner { background: var(--bg-primary); }
    * { scrollbar-width: thin; scrollbar-color: var(--border) var(--bg-primary); }

    /* SIDEBAR */
    .sidebar {
      width: var(--sidebar-width);
      height: 100vh;
      position: fixed;
      left: 0;
      top: 0;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      z-index: 100;
      transition: width 0.2s ease;
    }

    .sidebar.collapsed {
      width: var(--sidebar-collapsed);
    }

    .sidebar.collapsed .logo-text,
    .sidebar.collapsed .project-name,
    .sidebar.collapsed .chevron,
    .sidebar.collapsed .sidebar-search span,
    .sidebar.collapsed .sidebar-search kbd,
    .sidebar.collapsed .nav-label,
    .sidebar.collapsed .sidebar-nav a span,
    .sidebar.collapsed .nav-badge,
    .sidebar.collapsed .footer-btn span,
    .sidebar.collapsed .project-dropdown {
      display: none;
    }

    .sidebar.collapsed .sidebar-search {
      justify-content: center;
      padding: 12px;
    }

    .sidebar.collapsed .sidebar-nav a {
      justify-content: center;
      padding: 12px;
    }

    .sidebar.collapsed .footer-btn {
      justify-content: center;
    }

    .sidebar.collapsed .project-selector {
      justify-content: center;
      padding: 12px;
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      border-bottom: 1px solid var(--border);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .logo i {
      font-size: 24px;
      color: var(--accent);
    }

    .logo-text {
      font-size: 18px;
      font-weight: 700;
      background: linear-gradient(135deg, var(--accent), #a29bfe);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

    .collapse-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .collapse-btn:hover {
      background: var(--bg-hover);
      color: var(--text);
    }

    /* Project Selector */
    .sidebar-section {
      padding: 12px;
      position: relative;
    }

    .project-selector {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .project-selector:hover {
      background: var(--bg-hover);
      border-color: var(--accent);
    }

    .project-selector i:first-child {
      font-size: 16px;
    }

    .project-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .chevron {
      font-size: 10px;
      color: var(--text-muted);
    }

    .project-dropdown {
      position: absolute;
      top: 100%;
      left: 12px;
      right: 12px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 8px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
      z-index: 200;
      margin-top: 4px;
      overflow: hidden;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      cursor: pointer;
      transition: all 0.15s;
      font-size: 13px;
    }

    .dropdown-item:hover {
      background: var(--bg-hover);
    }

    .dropdown-item.active {
      background: var(--accent);
      color: white;
    }

    .dropdown-item.active i { color: white !important; }

    .dropdown-item .count {
      margin-left: auto;
      font-size: 11px;
      color: var(--text-muted);
      background: var(--bg-tertiary);
      padding: 2px 8px;
      border-radius: 10px;
    }

    .dropdown-item.active .count {
      background: rgba(255,255,255,0.2);
      color: white;
    }

    .dropdown-item.manage { color: var(--accent); }

    .dropdown-divider {
      height: 1px;
      background: var(--border);
      margin: 4px 0;
    }

    /* Search */
    .sidebar-search {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 12px 12px;
      padding: 10px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 13px;
      transition: all 0.2s;
    }

    .sidebar-search:hover {
      background: var(--bg-hover);
      border-color: var(--accent);
      color: var(--text);
    }

    .sidebar-search kbd {
      margin-left: auto;
      font-size: 10px;
      padding: 2px 6px;
      background: var(--bg-primary);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: inherit;
    }

    /* Navigation */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 0 12px;
    }

    .nav-group {
      margin-bottom: 16px;
    }

    .nav-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 12px 6px;
    }

    .sidebar-nav a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      color: var(--text-muted);
      text-decoration: none;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.15s;
      position: relative;
    }

    .sidebar-nav a:hover {
      background: var(--bg-hover);
      color: var(--text);
    }

    .sidebar-nav a.active {
      background: var(--accent);
      color: white;
    }

    .sidebar-nav a.disabled {
      opacity: 0.4;
      pointer-events: none;
      cursor: not-allowed;
    }

    .sidebar-nav a i {
      width: 18px;
      text-align: center;
      font-size: 15px;
    }

    .nav-badge {
      margin-left: auto;
      background: var(--danger);
      color: white;
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 10px;
      font-weight: 600;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      padding: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .footer-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 8px;
      font-size: 13px;
      text-align: left;
      transition: all 0.15s;
    }

    .footer-btn:hover {
      background: var(--bg-hover);
      color: var(--text);
    }

    .footer-btn i {
      width: 18px;
      text-align: center;
    }

    /* MAIN WRAPPER */
    .main-wrapper {
      flex: 1;
      margin-left: var(--sidebar-width);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: margin-left 0.2s ease;
      overflow-x: hidden;
      max-width: calc(100vw - var(--sidebar-width));
    }

    .sidebar-collapsed .main-wrapper {
      margin-left: var(--sidebar-collapsed);
      max-width: calc(100vw - var(--sidebar-collapsed));
    }

    /* TOPBAR */
    .topbar {
      height: var(--topbar-height);
      background: var(--bg-secondary);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 0 20px;
      position: sticky;
      top: 0;
      z-index: 50;
    }

    .mobile-menu-btn {
      display: none;
      width: 40px;
      height: 40px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
      font-size: 18px;
    }

    .topbar-search {
      flex: 1;
      max-width: 400px;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 16px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .topbar-search:hover {
      border-color: var(--accent);
    }

    .topbar-search i { color: var(--text-muted); }

    .topbar-search input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 14px;
      cursor: pointer;
      outline: none;
    }

    .topbar-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-left: auto;
    }

    .action-btn {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      color: var(--text-muted);
      cursor: pointer;
      position: relative;
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--bg-hover);
      color: var(--text);
      border-color: var(--accent);
    }

    .action-btn.add-btn {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    .action-btn.add-btn:hover {
      background: var(--accent-hover);
    }

    .action-btn.undo-btn,
    .action-btn.redo-btn {
      font-size: 14px;
    }

    .action-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .action-btn:disabled:hover {
      background: var(--bg-tertiary);
      border-color: var(--border);
      color: var(--text-muted);
    }

    .action-badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: var(--danger);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
      font-weight: 600;
    }

    /* MAIN */
    main {
      flex: 1;
      padding: 24px;
      overflow-x: hidden;
      min-width: 0;
    }

    /* MOBILE */
    .mobile-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 99;
    }

    .mobile-bottom-nav {
      display: none;
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--bg-secondary);
      border-top: 1px solid var(--border);
      padding: 10px 0;
      z-index: 100;
    }

    .mobile-bottom-nav a {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      color: var(--text-muted);
      text-decoration: none;
      font-size: 20px;
      padding: 8px;
      position: relative;
    }

    .mobile-bottom-nav a.active { color: var(--accent); }

    .mobile-bottom-nav .badge {
      position: absolute;
      top: 2px;
      right: 50%;
      transform: translateX(80%);
      background: var(--danger);
      color: white;
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 10px;
    }

    .fab-center {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--accent);
      border: none;
      color: white;
      font-size: 22px;
      cursor: pointer;
      margin-top: -25px;
      box-shadow: 0 4px 15px rgba(108,92,231,0.4);
    }

    /* SEARCH MODAL */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.7);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding-top: 100px;
      z-index: 1000;
    }

    .search-modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 12px;
      width: 90%;
      max-width: 600px;
      overflow: hidden;
      box-shadow: 0 20px 60px rgba(0,0,0,0.5);
    }

    .search-input-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }

    .search-input-wrapper i { color: var(--text-muted); font-size: 18px; }

    .search-input-wrapper input {
      flex: 1;
      background: transparent;
      border: none;
      color: var(--text);
      font-size: 16px;
      outline: none;
    }

    .search-input-wrapper kbd {
      font-size: 11px;
      padding: 4px 8px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 4px;
      color: var(--text-muted);
    }

    .search-filters {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      border-bottom: 1px solid var(--border);
    }

    .filter-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .filter-label {
      font-size: 12px;
      color: var(--text-muted);
      min-width: 60px;
    }

    .filter-chip {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 20px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .filter-chip input { display: none; }

    .filter-chip:hover { background: var(--bg-hover); }

    .filter-chip.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    .filter-chip.do.active { background: var(--do); border-color: var(--do); }
    .filter-chip.plan.active { background: var(--plan); border-color: var(--plan); }
    .filter-chip.delegate.active { background: var(--delegate); border-color: var(--delegate); }
    .filter-chip.eliminate.active { background: var(--eliminate); border-color: var(--eliminate); }

    .filter-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .search-btn {
      padding: 8px 16px;
      background: var(--accent);
      border: none;
      border-radius: 8px;
      color: white;
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .search-btn:hover { background: var(--accent-hover); }

    .search-results {
      max-height: 300px;
      overflow-y: auto;
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 20px;
      cursor: pointer;
      transition: background 0.15s;
    }

    .result-item:hover { background: var(--bg-hover); }

    .result-priority {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }

    .result-priority.do { background: var(--do); }
    .result-priority.plan { background: var(--plan); }
    .result-priority.delegate { background: var(--delegate); }
    .result-priority.eliminate { background: var(--eliminate); }

    .result-title { flex: 1; font-size: 14px; }

    .result-status {
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 12px;
    }

    .result-status.todo { background: rgba(253,203,110,0.2); color: var(--warning); }
    .result-status.in_progress { background: rgba(78,205,196,0.2); color: var(--plan); }
    .result-status.done { background: rgba(0,184,148,0.2); color: var(--success); }

    .result-item i { color: var(--text-muted); font-size: 12px; }

    /* RESPONSIVE */
    @media (max-width: 1024px) {
      .sidebar {
        transform: translateX(-100%);
      }

      .sidebar.mobile-open {
        transform: translateX(0);
      }

      .main-wrapper {
        margin-left: 0;
        max-width: 100vw;
      }

      .mobile-menu-btn { display: flex; align-items: center; justify-content: center; }
      .mobile-overlay { display: block; }
    }

    @media (max-width: 768px) {
      .topbar-search { display: none; }

      main {
        padding: 16px;
        padding-bottom: 100px;
      }

      .mobile-bottom-nav { display: flex; }
    }

    /* TOAST NOTIFICATIONS */
    .toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 14px 18px;
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 10px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
      cursor: pointer;
      animation: slideIn 0.3s ease, fadeIn 0.3s ease;
      transition: transform 0.2s, opacity 0.2s;
    }

    .toast:hover {
      transform: translateX(-5px);
    }

    .toast i {
      font-size: 18px;
    }

    .toast span {
      flex: 1;
      font-size: 14px;
    }

    .toast-close {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
    }

    .toast.success {
      border-left: 4px solid var(--success);
    }
    .toast.success i { color: var(--success); }

    .toast.error {
      border-left: 4px solid var(--danger);
    }
    .toast.error i { color: var(--danger); }

    .toast.warning {
      border-left: 4px solid var(--warning);
    }
    .toast.warning i { color: var(--warning); }

    .toast.info {
      border-left: 4px solid var(--accent);
    }
    .toast.info i { color: var(--accent); }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ANIMATIONS & TRANSITIONS */
    .sidebar,
    .main-wrapper,
    .project-dropdown,
    .modal-overlay,
    .search-modal {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .modal-overlay {
      animation: fadeIn 0.2s ease;
    }

    .search-modal {
      animation: slideDown 0.25s ease;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Hover animations for interactive elements */
    .sidebar-nav a,
    .footer-btn,
    .action-btn,
    .dropdown-item {
      transition: all 0.15s ease;
    }

    .sidebar-nav a:hover {
      transform: translateX(4px);
    }

    .action-btn:hover {
      transform: scale(1.05);
    }

    /* Skeleton loader animation */
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }

    .skeleton {
      background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-hover) 50%, var(--bg-tertiary) 75%);
      background-size: 200% 100%;
      animation: shimmer 1.5s infinite;
      border-radius: 4px;
    }

    /* SETTINGS MODAL */
    .settings-modal {
      background: var(--bg-secondary);
      border: 1px solid var(--border);
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow: auto;
      animation: slideDown 0.25s ease;
    }

    .settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }

    .settings-header h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 18px;
    }

    .settings-header button {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      font-size: 18px;
      padding: 4px;
    }

    .settings-header button:hover { color: var(--text); }

    .settings-body {
      padding: 20px 24px;
    }

    .settings-section {
      margin-bottom: 24px;
    }

    .settings-section:last-child { margin-bottom: 0; }

    .settings-section h4 {
      margin: 0 0 16px 0;
      font-size: 13px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .settings-row {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .settings-btn {
      padding: 10px 16px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text);
      cursor: pointer;
      font-size: 13px;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .settings-btn:hover {
      background: var(--bg-hover);
      border-color: var(--accent);
    }

    .settings-btn.accent {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }

    .settings-btn.accent:hover {
      background: var(--accent-hover);
    }

    .settings-option {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
      font-size: 14px;
    }

    .settings-option.indent {
      padding-left: 52px;
    }

    .settings-option select {
      padding: 8px 12px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      font-size: 13px;
    }

    /* Toggle Switch */
    .toggle-switch {
      position: relative;
      width: 44px;
      height: 24px;
      display: inline-block;
    }

    .toggle-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-tertiary);
      border: 1px solid var(--border);
      border-radius: 24px;
      transition: all 0.3s;
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 18px;
      width: 18px;
      left: 2px;
      bottom: 2px;
      background: var(--text-muted);
      border-radius: 50%;
      transition: all 0.3s;
    }

    .toggle-switch input:checked + .toggle-slider {
      background: var(--accent);
      border-color: var(--accent);
    }

    .toggle-switch input:checked + .toggle-slider:before {
      transform: translateX(20px);
      background: white;
    }
  `]
})
export class App implements OnInit {
  private ticketService = inject(TicketService);
  private router = inject(Router);
  toastService = inject(ToastService);
  undoService = inject(UndoService);

  lightMode = signal<boolean>(localStorage.getItem('lightMode') === 'true');
  reminderCount = signal<number>(0);
  mobileMenuOpen = signal<boolean>(false);
  sidebarCollapsed = signal<boolean>(localStorage.getItem('sidebarCollapsed') === 'true');
  search = '';

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
