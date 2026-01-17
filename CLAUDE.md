# TaskFlow - Gestion de Projet

## Regles Git
- Ne JAMAIS ajouter "Co-Authored-By: Claude" dans les commits
- Ne pas mentionner Claude Code dans les commits ou PR

## Stack
- **Frontend**: Angular 19 + Signals (port 10001)
- **Backend**: Node.js + Express + Multer (port 10000)
- **BDD**: PostgreSQL
- **Conteneurs**: Docker

## Principes
- Simplicite, pas de sur-ingenierie
- Code lisible et direct

## Structure
```
frontend/src/app/
├── app.ts, app.config.ts, app.routes.ts
├── shared.styles.ts
├── ticket.service.ts, task.service.ts
├── toast.service.ts, undo.service.ts
├── dashboard.component.ts      # /dashboard
├── kanban.component.ts         # /kanban
├── list.component.ts           # /list
├── calendar.component.ts       # /calendar
├── gantt.component.ts          # /gantt
├── stats.component.ts          # /stats
├── reminders.component.ts      # /reminders
├── archives.component.ts       # /archives
├── templates.component.ts      # /templates
├── history.component.ts        # /history
├── projects.component.ts       # /projects
└── ticket-detail.component.ts  # /ticket/:id

backend/
├── server.js
├── uploads/
└── package.json
```

## Modele de donnees

### Hierarchie
Project → Ticket → Task → Subtask

### Tables

**Project**: id, name, description, color (#hex), icon (fa-*), archived, created_at

**Ticket**: id, title, status, priority, description, due_date, start_date, position, archived, pinned, recurrence, reminder_days, time_estimated, time_spent, project_id, created_at

**Task**: id, text, done, position, ticket_id, parent_id (pour subtasks)

**Label**: id, name, color

**Comment**: id, text, created_at, ticket_id

**Attachment**: id, filename, original_name, mimetype, size, ticket_id, created_at

**Activity_Log**: id, ticket_id, action, field, old_value, new_value, created_at

**Ticket_Templates**: id, name, title, description, priority, project_id, created_at

**Ticket_Dependencies**: id, ticket_id, depends_on_id

### Valeurs

**Status**: `todo`, `in_progress`, `done`

**Priority** (Eisenhower):
- `do` (rouge #ff6b6b) - Urgent + Important
- `plan` (turquoise #4ecdc4) - Important
- `delegate` (orange #ffa502) - Urgent
- `eliminate` (gris #636e72) - Ni l'un ni l'autre

**Recurrence**: `none`, `daily`, `weekly`, `monthly`, `yearly`

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
- `GET /api/search?q=terme` - Recherche simple
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
- Dashboard avec stats projet
- Templates reutilisables
- Dependances entre tickets
- Timer Pomodoro (25min)
- Suivi du temps
- Import/Export JSON/CSV
- Auto-archivage configurable
- Undo/Redo (50 actions)
- Toast notifications
- Recherche avancee multi-criteres

**Acces**: http://localhost:10001

