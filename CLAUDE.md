# TaskFlow - Gestion de Projet

## Regles Git
- Ne JAMAIS ajouter "Co-Authored-By: Claude" dans les commits
- Ne pas mentionner Claude Code dans les commits ou PR

## Stack
- **Frontend**: Angular 21 + Signals + Tailwind CSS (port 10001)
- **Backend**: Node.js + Express + Drizzle ORM + TypeScript (port 10000)
- **BDD**: PostgreSQL 16
- **Conteneurs**: Docker

## Principes
- Simplicite, pas de sur-ingenierie
- Code lisible et direct

## Structure
```
frontend/src/app/
├── app.component.ts, app.config.ts, app.routes.ts
├── core/services/
│   ├── toast.service.ts
│   └── undo.service.ts
├── data/
│   ├── models/
│   │   ├── project.model.ts, ticket.model.ts, task.model.ts
│   │   ├── label.model.ts, comment.model.ts, attachment.model.ts
│   │   ├── activity.model.ts, template.model.ts, dependency.model.ts
│   │   ├── epic.model.ts, milestone.model.ts, sprint.model.ts
│   │   ├── widget.model.ts, whiteboard.model.ts
│   │   ├── search.model.ts, stats.model.ts
│   │   └── index.ts
│   └── services/
│       ├── ticket.service.ts, task.service.ts
│       ├── epic.service.ts, milestone.service.ts, sprint.service.ts
│       ├── whiteboard.service.ts, widget.service.ts
│       └── index.ts
├── features/
│   ├── dashboard/             # /dashboard (widgets personnalisables)
│   ├── kanban/                # /kanban
│   ├── list/                  # /list
│   ├── calendar/              # /calendar
│   ├── gantt/                 # /gantt
│   ├── stats/                 # /stats
│   ├── reminders/             # /reminders
│   ├── archives/              # /archives
│   ├── templates/             # /templates
│   ├── history/               # /history
│   ├── projects/              # /projects
│   ├── projects-dashboard/    # /projects/dashboard
│   ├── project-detail/        # /projects/:id
│   ├── epics/                 # /epics
│   ├── milestones/            # /milestones
│   ├── sprints/               # /sprints (+ burndown, velocity charts)
│   ├── backlog/               # /backlog
│   ├── whiteboard/            # /whiteboard/:id
│   ├── ticket-create/         # /tickets/new
│   └── ticket-detail/         # /tickets/:id
└── shared/components/
    └── progress-ring.component.ts

backend/src/
├── index.ts                   # Entry point
├── app.ts                     # Express app factory
├── config/
│   ├── database.ts            # Drizzle ORM client
│   └── environment.ts         # Env variables
├── middleware/
│   ├── error-handler.ts
│   ├── upload.ts              # Multer config
│   └── validate.ts
├── db/schema/                 # Drizzle schemas (15 tables)
└── modules/                   # 18 API modules
    ├── projects/
    ├── tickets/
    ├── tasks/
    ├── labels/
    ├── comments/
    ├── attachments/
    ├── activity/
    ├── templates/
    ├── dependencies/
    ├── settings/
    ├── epics/
    ├── milestones/
    ├── sprints/
    ├── whiteboards/
    ├── reminders/
    ├── search/
    ├── stats/
    ├── transformations/
    └── import-export/
```

## Modele de donnees

### Hierarchie
Project → Epic → Milestone → Sprint → Ticket → Task → Subtask

### Tables (15)

**Project**: id, name, description, color (#hex), icon (fa-*), archived, created_at

**Epic**: id, name, description, color, status, project_id, created_at

**Milestone**: id, name, description, due_date, status, project_id, created_at

**Sprint**: id, name, goal, start_date, end_date, status, project_id, created_at

**Ticket**: id, title, status, priority, description, due_date, start_date, position, archived, pinned, recurrence, reminder_days, time_estimated, time_spent, project_id, epic_id, milestone_id, sprint_id, search_vector, created_at

**Task**: id, text, done, position, ticket_id, parent_id (pour subtasks)

**Label**: id, name, color

**Ticket_Labels**: ticket_id, label_id (junction table)

**Comment**: id, text, created_at, ticket_id

**Attachment**: id, filename, original_name, mimetype, size, ticket_id, created_at

**Activity_Log**: id, ticket_id, action, field, old_value, new_value, created_at

**Ticket_Templates**: id, name, title, description, priority, project_id, created_at

**Ticket_Dependencies**: id, ticket_id, depends_on_id

**Whiteboard**: id, project_id, name, description, viewport_x, viewport_y, viewport_zoom, background_color, grid_enabled, grid_size, snap_to_grid, created_at, updated_at

**Whiteboard_Elements**: id, board_id, type, x, y, width, height, rotation, fill_color, stroke_color, stroke_width, opacity, text_content, font_size, font_family, text_align, line_style, start_arrow, end_arrow, start_element_id, end_element_id, start_anchor, end_anchor, path_data, image_url, image_filename, z_index, locked, created_at, updated_at

**Settings**: key, value (KV store)

### Valeurs

**Ticket Status**: `todo`, `in_progress`, `done`

**Priority** (Eisenhower):
- `do` (rouge #ff6b6b) - Urgent + Important
- `plan` (turquoise #4ecdc4) - Important
- `delegate` (orange #ffa502) - Urgent
- `eliminate` (gris #636e72) - Ni l'un ni l'autre

**Recurrence**: `none`, `daily`, `weekly`, `monthly`, `yearly`

**Epic Status**: `open`, `in_progress`, `completed`

**Milestone Status**: `open`, `closed`

**Sprint Status**: `planning`, `active`, `completed`

**Whiteboard Element Types**: `sticky_note`, `rectangle`, `circle`, `triangle`, `diamond`, `line`, `arrow`, `text`, `image`, `connector`, `freehand`

## Commandes Docker
```bash
docker-compose up -d              # Demarrer
docker-compose down               # Arreter
docker-compose up --build -d      # Reconstruire
docker-compose down -v && docker-compose up --build -d  # Reset complet
docker-compose logs -f            # Logs
```

## API REST

### Projects
- `GET /api/projects` - Liste (avec stats)
- `GET /api/projects/:id` - Un projet
- `POST /api/projects` - Creer
- `PUT /api/projects/:id` - Modifier
- `DELETE /api/projects/:id` - Supprimer

### Tickets
- `GET /api/tickets` - Liste
- `GET /api/tickets?project_id=X` - Filtrer par projet
- `GET /api/tickets/:id` - Un ticket + tasks
- `POST /api/tickets` - Creer
- `PUT /api/tickets/:id` - Modifier
- `DELETE /api/tickets/:id` - Supprimer
- `POST /api/tickets/:id/duplicate` - Dupliquer
- `PUT /api/tickets/:id/pin` - Toggle favori
- `GET /api/tickets/pinned` - Liste epingles

### Tasks
- `GET /api/tasks` - Liste
- `POST /api/tasks` - Creer
- `PUT /api/tasks/:id` - Modifier
- `DELETE /api/tasks/:id` - Supprimer
- `GET /api/tasks/:id/subtasks` - Sous-taches
- `POST /api/tasks/:id/subtasks` - Creer sous-tache
- `PUT /api/tickets/:id/tasks/reorder` - Body: `{ taskIds: [] }`

### Labels
- `GET /api/labels` - Liste
- `POST /api/labels` - Creer
- `DELETE /api/labels/:id` - Supprimer
- `GET /api/tickets/:id/labels` - Labels d'un ticket
- `POST /api/tickets/:id/labels` - Ajouter
- `DELETE /api/tickets/:tid/labels/:lid` - Retirer

### Comments
- `GET /api/tickets/:id/comments` - Liste
- `POST /api/comments` - Ajouter
- `DELETE /api/comments/:id` - Supprimer

### Attachments
- `GET /api/tickets/:id/attachments` - Liste
- `POST /api/tickets/:id/attachments` - Upload (multipart)
- `DELETE /api/attachments/:id` - Supprimer
- `GET /uploads/:filename` - Telecharger

### Activity
- `GET /api/tickets/:id/activity` - Historique ticket
- `GET /api/activity` - Historique global
- `GET /api/activity?limit=50` - Avec limite

### Time Tracking
- `POST /api/tickets/:id/time` - Ajouter temps (minutes)

### Search
- `GET /api/search?q=terme` - Recherche simple (full-text FR)
- `POST /api/search/advanced` - Body: `{ query, status[], priority[], labels[], dateFrom, dateTo, projectId, pinned }`

### Templates
- `GET /api/templates` - Liste
- `POST /api/templates` - Creer
- `DELETE /api/templates/:id` - Supprimer
- `POST /api/tickets/:id/save-template` - Sauver comme template
- `POST /api/templates/:id/create-ticket` - Creer depuis template

### Dependencies
- `GET /api/tickets/:id/dependencies` - Liste
- `POST /api/tickets/:id/dependencies` - Ajouter
- `DELETE /api/tickets/:id/dependencies/:depId` - Supprimer

### Epics
- `GET /api/epics` - Liste
- `GET /api/epics?project_id=X` - Filtrer par projet
- `GET /api/epics/:id` - Un epic avec tickets
- `POST /api/epics` - Creer
- `PUT /api/epics/:id` - Modifier
- `DELETE /api/epics/:id` - Supprimer

### Milestones
- `GET /api/milestones` - Liste
- `GET /api/milestones?project_id=X` - Filtrer par projet
- `GET /api/milestones/:id` - Un milestone avec tickets
- `POST /api/milestones` - Creer
- `PUT /api/milestones/:id` - Modifier
- `DELETE /api/milestones/:id` - Supprimer

### Sprints
- `GET /api/sprints` - Liste
- `GET /api/sprints?project_id=X` - Filtrer par projet
- `GET /api/sprints/:id` - Un sprint avec tickets
- `POST /api/sprints` - Creer
- `PUT /api/sprints/:id` - Modifier
- `DELETE /api/sprints/:id` - Supprimer
- `GET /api/sprints/:id/burndown` - Donnees burndown chart
- `GET /api/sprints/:id/velocity` - Donnees velocity chart

### Whiteboards
- `GET /api/whiteboards` - Liste
- `GET /api/whiteboards?project_id=X` - Filtrer par projet
- `GET /api/whiteboards/:id` - Un whiteboard avec elements
- `POST /api/whiteboards` - Creer
- `PUT /api/whiteboards/:id` - Modifier (viewport, settings)
- `DELETE /api/whiteboards/:id` - Supprimer
- `POST /api/whiteboards/:id/elements` - Ajouter element
- `PUT /api/whiteboards/:id/elements/:eid` - Modifier element
- `DELETE /api/whiteboards/:id/elements/:eid` - Supprimer element

### Transformations
- `POST /api/tasks/:id/to-ticket` - Convertir task en ticket
- `POST /api/tasks/:id/to-project` - Convertir task en projet
- `POST /api/tickets/:id/to-task` - Convertir ticket en task
- `POST /api/tickets/:id/to-project` - Convertir ticket en projet
- `POST /api/projects/:id/to-ticket` - Convertir projet en ticket
- `POST /api/projects/:id/to-task` - Convertir projet en task

### Stats & Export
- `GET /api/stats` - Stats globales
- `GET /api/projects/:id/stats` - Stats projet
- `GET /api/reminders` - Rappels a venir
- `GET /api/gantt` - Donnees Gantt
- `GET /api/export?format=json|csv` - Export
- `GET /api/export?format=json&project_id=X` - Export filtre
- `POST /api/import` - Import JSON

### Settings
- `GET /api/settings` - Liste
- `PUT /api/settings/:key` - Modifier (`auto_archive_enabled`, `auto_archive_days`)
- `POST /api/auto-archive` - Lancer archivage

## Dashboard Widgets

10 types de widgets personnalisables:
- `stats-summary` - Resume des statistiques
- `overdue` - Tickets en retard
- `today` - Tickets du jour
- `in-progress` - Tickets en cours
- `this-week` - Tickets de la semaine
- `recent` - Activite recente
- `project-progress` - Progression des projets
- `priority-chart` - Repartition par priorite
- `quick-actions` - Actions rapides
- `calendar-mini` - Mini calendrier

## Whiteboard

### Elements (11 types)
- `sticky_note` - Post-it avec 8 couleurs predefinies
- `rectangle`, `circle`, `triangle`, `diamond` - Formes geometriques
- `line`, `arrow` - Lignes et fleches
- `text` - Texte libre
- `image` - Images uploadees
- `connector` - Connecteurs intelligents entre elements
- `freehand` - Dessin libre

### Outils
- Selection, pan, sticky note, rectangle, circle, triangle
- Diamond, line, arrow, text, connector, freehand, eraser

### Couleurs predefinies
- Sticky: #fef3c7, #fce7f3, #dbeafe, #d1fae5, #e9d5ff, #fed7aa, #f3f4f6, #fecaca
- Shapes: #fbbf24, #f472b6, #60a5fa, #34d399, #a78bfa, #fb923c, #9ca3af, #f87171

## Theme (Enterprise Dark)

### Palette
- **Fond**: #09090b (Zinc-950)
- **Panel**: #18181b (Zinc-900)
- **Primaire**: #6366f1 (Indigo-500)
- **Texte**: #fafafa (Zinc-50)
- **Bordures**: rgba(255,255,255,0.08)

### Typography
- **Headings**: 'Space Grotesk' (Google Fonts)
- **Body**: 'Inter' (Google Fonts)

## Labels par defaut
- Urgent: #ff6b6b
- Travail: #4ecdc4
- Personnel: #ffa502
- Admin: #636e72

## Icones projet (Font Awesome)
fa-folder, fa-briefcase, fa-home, fa-code, fa-palette, fa-shopping-cart, fa-heart, fa-star, fa-rocket, fa-gamepad, fa-graduation-cap, fa-music, fa-camera, fa-plane, fa-car, fa-utensils, fa-book, fa-film, fa-gift, fa-leaf

## Raccourcis clavier (Kanban)
- `Ctrl+K`: Focus recherche
- `N`: Nouveau ticket
- `S`: Mode selection
- `1-4`: Filtrer priorite
- `0`: Tout afficher
- `L`: Filtre labels
- `J/K` ou fleches: Navigation
- `Enter`: Ouvrir ticket
- `Ctrl+Z/Y`: Undo/Redo
- `Esc`: Fermer/Quitter

## Responsive
- Desktop (>1024px): Sidebar 260px
- Tablet (768-1024px): Sidebar collapsible
- Mobile (<768px): Navigation bottom

## Fonctionnalites cles
- Kanban drag & drop avec quick edit (dblclick titre, click priorite)
- Actions groupees (selection multiple)
- Dashboard avec widgets personnalisables
- Epics, Milestones et Sprints (gestion agile)
- Burndown et Velocity charts
- Whiteboard collaboratif (11 types d'elements)
- Transformations (task ↔ ticket ↔ project)
- Templates reutilisables
- Dependances entre tickets
- Timer Pomodoro (25min)
- Suivi du temps (time_estimated, time_spent)
- Import/Export JSON/CSV
- Auto-archivage configurable
- Recherche full-text (FR) multi-criteres
- Undo/Redo (50 actions)
- Toast notifications
- Tickets epingles (favoris)
- Recurrence (daily, weekly, monthly, yearly)

**Acces**: http://localhost:10001
