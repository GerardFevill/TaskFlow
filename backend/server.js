const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, param, query, validationResult } = require('express-validator');

const app = express();
const PORT = 3000;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'admin',
    password: process.env.DB_PASSWORD || 'admin123',
    database: process.env.DB_NAME || 'gestion_projet'
});

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS - restrict to frontend origin
const corsOptions = {
    origin: process.env.CORS_ORIGIN || 'http://localhost:10001',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Trop de requetes, veuillez reessayer plus tard.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', limiter);

app.use(express.json({ limit: '1mb' }));

// Validation helper
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

// Sanitize string input
const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    return str.trim().slice(0, 10000); // Max 10000 chars
};

// Initialiser les tables avec retry
async function initDB(retries = 10) {
    for (let i = 0; i < retries; i++) {
        try {
            // Table projects
            await pool.query(`
                CREATE TABLE IF NOT EXISTS projects (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    color VARCHAR(7) DEFAULT '#6c5ce7',
                    icon VARCHAR(50) DEFAULT 'fa-folder',
                    archived BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    -- Nouveaux champs gestion de projet
                    objective TEXT DEFAULT '',
                    start_date DATE,
                    end_date DATE,
                    status VARCHAR(20) DEFAULT 'planning',
                    budget DECIMAL(12,2) DEFAULT 0,
                    budget_spent DECIMAL(12,2) DEFAULT 0,
                    success_criteria TEXT DEFAULT '',
                    constraints TEXT DEFAULT '',
                    deliverables JSONB DEFAULT '[]',
                    resources JSONB DEFAULT '[]',
                    risks JSONB DEFAULT '[]'
                )
            `);

            // Migration: ajouter les nouveaux champs si table existe deja
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='objective') THEN
                        ALTER TABLE projects ADD COLUMN objective TEXT DEFAULT '';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='start_date') THEN
                        ALTER TABLE projects ADD COLUMN start_date DATE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='end_date') THEN
                        ALTER TABLE projects ADD COLUMN end_date DATE;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='status') THEN
                        ALTER TABLE projects ADD COLUMN status VARCHAR(20) DEFAULT 'planning';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='budget') THEN
                        ALTER TABLE projects ADD COLUMN budget DECIMAL(12,2) DEFAULT 0;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='budget_spent') THEN
                        ALTER TABLE projects ADD COLUMN budget_spent DECIMAL(12,2) DEFAULT 0;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='success_criteria') THEN
                        ALTER TABLE projects ADD COLUMN success_criteria TEXT DEFAULT '';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='constraints') THEN
                        ALTER TABLE projects ADD COLUMN constraints TEXT DEFAULT '';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='deliverables') THEN
                        ALTER TABLE projects ADD COLUMN deliverables JSONB DEFAULT '[]';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='resources') THEN
                        ALTER TABLE projects ADD COLUMN resources JSONB DEFAULT '[]';
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='projects' AND column_name='risks') THEN
                        ALTER TABLE projects ADD COLUMN risks JSONB DEFAULT '[]';
                    END IF;
                END $$;
            `);

            // Projet par défaut "Inbox"
            await pool.query(`
                INSERT INTO projects (id, name, description, color, icon)
                VALUES (1, 'Inbox', 'Tickets sans projet', '#6c5ce7', 'fa-inbox')
                ON CONFLICT (id) DO NOTHING
            `);

            // Table tickets
            await pool.query(`
                CREATE TABLE IF NOT EXISTS tickets (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    status VARCHAR(20) DEFAULT 'todo',
                    priority VARCHAR(20) DEFAULT 'do',
                    description TEXT DEFAULT '',
                    due_date DATE,
                    start_date DATE,
                    position INTEGER DEFAULT 0,
                    archived BOOLEAN DEFAULT FALSE,
                    recurrence VARCHAR(20) DEFAULT 'none',
                    reminder_days INTEGER DEFAULT 0,
                    time_estimated INTEGER DEFAULT 0,
                    time_spent INTEGER DEFAULT 0,
                    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL DEFAULT 1,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Ajouter project_id si la colonne n'existe pas (migration)
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='project_id') THEN
                        ALTER TABLE tickets ADD COLUMN project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL DEFAULT 1;
                    END IF;
                END $$;
            `);

            // Table tasks avec ticket_id et parent_id pour sous-tâches
            await pool.query(`
                CREATE TABLE IF NOT EXISTS tasks (
                    id SERIAL PRIMARY KEY,
                    text VARCHAR(255) NOT NULL,
                    done BOOLEAN DEFAULT FALSE,
                    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                    parent_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE
                )
            `);

            // Table attachments
            await pool.query(`
                CREATE TABLE IF NOT EXISTS attachments (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL,
                    original_name VARCHAR(255) NOT NULL,
                    mimetype VARCHAR(100),
                    size INTEGER,
                    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Table activity_log
            await pool.query(`
                CREATE TABLE IF NOT EXISTS activity_log (
                    id SERIAL PRIMARY KEY,
                    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                    action VARCHAR(50) NOT NULL,
                    field VARCHAR(50),
                    old_value TEXT,
                    new_value TEXT,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Table labels
            await pool.query(`
                CREATE TABLE IF NOT EXISTS labels (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(50) NOT NULL,
                    color VARCHAR(7) DEFAULT '#4ecdc4'
                )
            `);

            // Table ticket_labels (relation many-to-many)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS ticket_labels (
                    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                    label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
                    PRIMARY KEY (ticket_id, label_id)
                )
            `);

            // Table comments
            await pool.query(`
                CREATE TABLE IF NOT EXISTS comments (
                    id SERIAL PRIMARY KEY,
                    text TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE
                )
            `);

            // Table comment_reactions (pour reactions emoji)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS comment_reactions (
                    id SERIAL PRIMARY KEY,
                    comment_id INTEGER REFERENCES comments(id) ON DELETE CASCADE,
                    emoji VARCHAR(10) NOT NULL,
                    created_at TIMESTAMP DEFAULT NOW(),
                    UNIQUE(comment_id, emoji)
                )
            `);

            // Table ticket_templates (pour templates)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS ticket_templates (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    priority VARCHAR(20) DEFAULT 'do',
                    project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Table ticket_dependencies (pour dépendances)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS ticket_dependencies (
                    id SERIAL PRIMARY KEY,
                    ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                    depends_on_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                    UNIQUE(ticket_id, depends_on_id)
                )
            `);

            // Ajouter pinned si n'existe pas (migration favoris)
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='pinned') THEN
                        ALTER TABLE tickets ADD COLUMN pinned BOOLEAN DEFAULT FALSE;
                    END IF;
                END $$;
            `);

            // Ajouter position aux tasks si n'existe pas (migration drag & drop)
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='position') THEN
                        ALTER TABLE tasks ADD COLUMN position INTEGER DEFAULT 0;
                    END IF;
                END $$;
            `);

            // Table settings (configuration utilisateur)
            await pool.query(`
                CREATE TABLE IF NOT EXISTS settings (
                    key VARCHAR(100) PRIMARY KEY,
                    value TEXT NOT NULL
                )
            `);

            // Settings par défaut
            await pool.query(`
                INSERT INTO settings (key, value) VALUES
                ('auto_archive_enabled', 'false'),
                ('auto_archive_days', '7')
                ON CONFLICT (key) DO NOTHING
            `);

            // Labels par défaut
            await pool.query(`
                
                INSERT INTO labels (name, color) VALUES
                ('Bug', '#ff6b6b'),
                ('Feature', '#4ecdc4'),
                ('Urgent', '#ffa502'),
                ('Perso', '#a55eea'),
                ('Travail', '#45aaf2')
                ON CONFLICT DO NOTHING
            `);

            // Table epics
            await pool.query(`
                CREATE TABLE IF NOT EXISTS epics (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    color VARCHAR(7) DEFAULT '#6c5ce7',
                    status VARCHAR(20) DEFAULT 'open',
                    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Table milestones
            await pool.query(`
                CREATE TABLE IF NOT EXISTS milestones (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT DEFAULT '',
                    due_date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'open',
                    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Table sprints
            await pool.query(`
                CREATE TABLE IF NOT EXISTS sprints (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    goal TEXT DEFAULT '',
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    status VARCHAR(20) DEFAULT 'planning',
                    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                    created_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Ajouter epic_id, milestone_id, sprint_id aux tickets (migration)
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='epic_id') THEN
                        ALTER TABLE tickets ADD COLUMN epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='milestone_id') THEN
                        ALTER TABLE tickets ADD COLUMN milestone_id INTEGER REFERENCES milestones(id) ON DELETE SET NULL;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='sprint_id') THEN
                        ALTER TABLE tickets ADD COLUMN sprint_id INTEGER REFERENCES sprints(id) ON DELETE SET NULL;
                    END IF;
                END $$;
            `);

            // Performance indexes
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
                CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
                CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
                CREATE INDEX IF NOT EXISTS idx_tickets_archived ON tickets(archived);
                CREATE INDEX IF NOT EXISTS idx_tickets_due_date ON tickets(due_date);
                CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);
                CREATE INDEX IF NOT EXISTS idx_tickets_pinned ON tickets(pinned);
                CREATE INDEX IF NOT EXISTS idx_tasks_ticket_id ON tasks(ticket_id);
                CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
                CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id);
                CREATE INDEX IF NOT EXISTS idx_attachments_ticket_id ON attachments(ticket_id);
                CREATE INDEX IF NOT EXISTS idx_activity_log_ticket_id ON activity_log(ticket_id);
                CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);
                CREATE INDEX IF NOT EXISTS idx_ticket_dependencies_ticket_id ON ticket_dependencies(ticket_id);
                CREATE INDEX IF NOT EXISTS idx_ticket_dependencies_depends_on_id ON ticket_dependencies(depends_on_id);
                CREATE INDEX IF NOT EXISTS idx_epics_project_id ON epics(project_id);
                CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON milestones(project_id);
                CREATE INDEX IF NOT EXISTS idx_sprints_project_id ON sprints(project_id);
                CREATE INDEX IF NOT EXISTS idx_tickets_epic_id ON tickets(epic_id);
                CREATE INDEX IF NOT EXISTS idx_tickets_milestone_id ON tickets(milestone_id);
                CREATE INDEX IF NOT EXISTS idx_tickets_sprint_id ON tickets(sprint_id);
            `);

            // Full-text search: add search_vector column and GIN index
            await pool.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tickets' AND column_name='search_vector') THEN
                        ALTER TABLE tickets ADD COLUMN search_vector tsvector;
                    END IF;
                END $$;
            `);
            await pool.query(`CREATE INDEX IF NOT EXISTS idx_tickets_search ON tickets USING GIN(search_vector)`);

            // Table whiteboards
            await pool.query(`
                CREATE TABLE IF NOT EXISTS whiteboards (
                    id SERIAL PRIMARY KEY,
                    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
                    name VARCHAR(255) NOT NULL DEFAULT 'Whiteboard',
                    description TEXT DEFAULT '',
                    viewport_x DECIMAL(10,2) DEFAULT 0,
                    viewport_y DECIMAL(10,2) DEFAULT 0,
                    viewport_zoom DECIMAL(5,3) DEFAULT 1.0,
                    background_color VARCHAR(9) DEFAULT '#1a1a2e',
                    grid_enabled BOOLEAN DEFAULT TRUE,
                    grid_size INTEGER DEFAULT 20,
                    snap_to_grid BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Table whiteboard_elements
            await pool.query(`
                CREATE TABLE IF NOT EXISTS whiteboard_elements (
                    id SERIAL PRIMARY KEY,
                    board_id INTEGER REFERENCES whiteboards(id) ON DELETE CASCADE,
                    type VARCHAR(20) NOT NULL,
                    x DECIMAL(10,2) NOT NULL DEFAULT 0,
                    y DECIMAL(10,2) NOT NULL DEFAULT 0,
                    width DECIMAL(10,2) DEFAULT 200,
                    height DECIMAL(10,2) DEFAULT 100,
                    rotation DECIMAL(6,2) DEFAULT 0,
                    fill_color VARCHAR(9) DEFAULT '#fef3bd',
                    stroke_color VARCHAR(9) DEFAULT '#333333',
                    stroke_width DECIMAL(4,2) DEFAULT 1,
                    opacity DECIMAL(3,2) DEFAULT 1,
                    text_content TEXT DEFAULT '',
                    font_size INTEGER DEFAULT 14,
                    font_family VARCHAR(100) DEFAULT 'Segoe UI',
                    text_align VARCHAR(10) DEFAULT 'left',
                    line_style VARCHAR(10) DEFAULT 'solid',
                    start_arrow BOOLEAN DEFAULT FALSE,
                    end_arrow BOOLEAN DEFAULT FALSE,
                    start_element_id INTEGER REFERENCES whiteboard_elements(id) ON DELETE SET NULL,
                    end_element_id INTEGER REFERENCES whiteboard_elements(id) ON DELETE SET NULL,
                    start_anchor VARCHAR(10) DEFAULT 'center',
                    end_anchor VARCHAR(10) DEFAULT 'center',
                    path_data TEXT DEFAULT NULL,
                    image_url VARCHAR(500) DEFAULT NULL,
                    image_filename VARCHAR(255) DEFAULT NULL,
                    z_index INTEGER DEFAULT 0,
                    locked BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT NOW(),
                    updated_at TIMESTAMP DEFAULT NOW()
                )
            `);

            // Whiteboard indexes
            await pool.query(`
                CREATE INDEX IF NOT EXISTS idx_whiteboards_project_id ON whiteboards(project_id);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_board_id ON whiteboard_elements(board_id);
                CREATE INDEX IF NOT EXISTS idx_whiteboard_elements_z_index ON whiteboard_elements(z_index);
            `);

            // Update search_vector for existing tickets
            await pool.query(`
                UPDATE tickets SET search_vector = to_tsvector('french', COALESCE(title, '') || ' ' || COALESCE(description, ''))
                WHERE search_vector IS NULL
            `);

            console.log('Base de données connectée');
            return;
        } catch (err) {
            console.log(`Attente PostgreSQL... (${i + 1}/${retries})`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error('Impossible de se connecter à PostgreSQL');
}

// ============ PROJECTS ============

// GET - Liste des projets
app.get('/api/projects', async (req, res) => {
    const result = await pool.query(`
        SELECT p.*,
               COUNT(t.id) as ticket_count,
               COUNT(CASE WHEN t.status = 'done' THEN 1 END) as ticket_done
        FROM projects p
        LEFT JOIN tickets t ON t.project_id = p.id AND NOT t.archived
        WHERE NOT p.archived
        GROUP BY p.id
        ORDER BY p.id
    `);
    res.json(result.rows);
});

// GET - Un projet avec ses stats
app.get('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const project = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (project.rows.length === 0) {
        return res.status(404).json({ error: 'Projet non trouvé' });
    }
    const stats = await pool.query(`
        SELECT
            COUNT(*) as total,
            COUNT(CASE WHEN status = 'todo' THEN 1 END) as todo,
            COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
            COUNT(CASE WHEN status = 'done' THEN 1 END) as done
        FROM tickets WHERE project_id = $1 AND NOT archived
    `, [id]);
    res.json({ ...project.rows[0], stats: stats.rows[0] });
});

// POST - Créer un projet
app.post('/api/projects', async (req, res) => {
    const {
        name, description, color, icon,
        objective, start_date, end_date, status,
        budget, success_criteria, constraints,
        deliverables, resources, risks
    } = req.body;
    const result = await pool.query(
        `INSERT INTO projects (
            name, description, color, icon,
            objective, start_date, end_date, status,
            budget, success_criteria, constraints,
            deliverables, resources, risks
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
        [
            name,
            description || '',
            color || '#6c5ce7',
            icon || 'fa-folder',
            objective || '',
            start_date || null,
            end_date || null,
            status || 'planning',
            budget || 0,
            success_criteria || '',
            constraints || '',
            JSON.stringify(deliverables || []),
            JSON.stringify(resources || []),
            JSON.stringify(risks || [])
        ]
    );
    res.json(result.rows[0]);
});

// PUT - Modifier un projet
app.put('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    const {
        name, description, color, icon, archived,
        objective, start_date, end_date, status,
        budget, budget_spent, success_criteria, constraints,
        deliverables, resources, risks
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    const addField = (field, value) => {
        if (value !== undefined) {
            updates.push(`${field} = $${paramIndex}`);
            values.push(field.includes('deliverables') || field.includes('resources') || field.includes('risks')
                ? JSON.stringify(value) : value);
            paramIndex++;
        }
    };

    addField('name', name);
    addField('description', description);
    addField('color', color);
    addField('icon', icon);
    addField('archived', archived);
    addField('objective', objective);
    addField('start_date', start_date);
    addField('end_date', end_date);
    addField('status', status);
    addField('budget', budget);
    addField('budget_spent', budget_spent);
    addField('success_criteria', success_criteria);
    addField('constraints', constraints);
    addField('deliverables', deliverables);
    addField('resources', resources);
    addField('risks', risks);

    if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucun champ a mettre a jour' });
    }

    values.push(id);
    const result = await pool.query(
        `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
        values
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Projet non trouvé' });
    }
    res.json(result.rows[0]);
});

// DELETE - Supprimer un projet (les tickets passent à Inbox)
app.delete('/api/projects/:id', async (req, res) => {
    const { id } = req.params;
    if (id === '1') {
        return res.status(400).json({ error: 'Impossible de supprimer Inbox' });
    }
    // Move tickets to Inbox
    await pool.query('UPDATE tickets SET project_id = 1 WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.json({ success: true });
});

// ============ TICKETS ============

// GET - Liste des tickets (avec compte des tâches)
app.get('/api/tickets', [
    query('project_id').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
    query('status').optional().isIn(['todo', 'in_progress', 'done']),
    query('priority').optional().isIn(['do', 'plan', 'delegate', 'eliminate']),
    query('archived').optional().isBoolean()
], validate, async (req, res) => {
    const { project_id, limit, offset, status, priority, archived } = req.query;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (project_id) {
        conditions.push(`t.project_id = $${paramIndex++}`);
        params.push(project_id);
    }
    if (status) {
        conditions.push(`t.status = $${paramIndex++}`);
        params.push(status);
    }
    if (priority) {
        conditions.push(`t.priority = $${paramIndex++}`);
        params.push(priority);
    }
    if (archived !== undefined) {
        conditions.push(`t.archived = $${paramIndex++}`);
        params.push(archived === 'true');
    }

    let query = `
        SELECT t.*,
               p.name as project_name,
               p.color as project_color,
               COUNT(DISTINCT tk.id) as task_count,
               COUNT(DISTINCT CASE WHEN tk.done THEN tk.id END) as task_done,
               COALESCE(
                   (SELECT json_agg(json_build_object('id', l.id, 'name', l.name, 'color', l.color))
                    FROM ticket_labels tl
                    JOIN labels l ON l.id = tl.label_id
                    WHERE tl.ticket_id = t.id),
                   '[]'::json
               ) as labels
        FROM tickets t
        LEFT JOIN tasks tk ON tk.ticket_id = t.id
        LEFT JOIN projects p ON p.id = t.project_id
    `;

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' GROUP BY t.id, p.name, p.color ORDER BY t.pinned DESC, t.position, t.id';

    // Pagination
    if (limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(parseInt(limit));
    }
    if (offset) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(parseInt(offset));
    }

    const result = await pool.query(query, params);

    // Get total count for pagination info
    let countQuery = 'SELECT COUNT(*) FROM tickets t';
    if (conditions.length > 0) {
        countQuery += ' WHERE ' + conditions.join(' AND ').replace(/\$\d+/g, (match, i) => match);
    }
    const countParams = params.slice(0, conditions.length);
    const countResult = await pool.query(countQuery, countParams);

    res.json({
        data: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: limit ? parseInt(limit) : null,
        offset: offset ? parseInt(offset) : 0
    });
});

// GET - Un ticket avec ses tasks
app.get('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    const ticket = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticket.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
    }
    const tasks = await pool.query('SELECT * FROM tasks WHERE ticket_id = $1 ORDER BY position, id', [id]);
    res.json({ ...ticket.rows[0], tasks: tasks.rows });
});

// POST - Créer un ticket
app.post('/api/tickets', [
    body('title').trim().notEmpty().isLength({ max: 255 }).withMessage('Titre requis (max 255 caracteres)'),
    body('priority').optional().isIn(['do', 'plan', 'delegate', 'eliminate']).withMessage('Priorite invalide'),
    body('project_id').optional().isInt({ min: 1 }).withMessage('Project ID invalide')
], validate, async (req, res) => {
    const { title, priority, project_id } = req.body;
    const sanitizedTitle = sanitizeString(title);
    const result = await pool.query(
        `INSERT INTO tickets (title, priority, project_id, search_vector)
         VALUES ($1, $2, $3, to_tsvector('french', $1))
         RETURNING *`,
        [sanitizedTitle, priority || 'do', project_id || 1]
    );
    res.json(result.rows[0]);
});

// PUT - Modifier un ticket
app.put('/api/tickets/:id', [
    param('id').isInt({ min: 1 }).withMessage('ID invalide'),
    body('title').optional().trim().isLength({ max: 255 }),
    body('status').optional().isIn(['todo', 'in_progress', 'done']),
    body('priority').optional().isIn(['do', 'plan', 'delegate', 'eliminate']),
    body('description').optional().isLength({ max: 10000 }),
    body('archived').optional().isBoolean(),
    body('recurrence').optional().isIn(['none', 'daily', 'weekly', 'monthly', 'yearly']),
    body('reminder_days').optional().isInt({ min: 0, max: 365 }),
    body('time_estimated').optional().isInt({ min: 0 }),
    body('time_spent').optional().isInt({ min: 0 }),
    body('project_id').optional().isInt({ min: 1 })
], validate, async (req, res) => {
    const { id } = req.params;
    const { title, status, priority, description, due_date, start_date, position, archived, recurrence, reminder_days, time_estimated, time_spent, project_id } = req.body;

    // Get old values for activity log
    const oldTicket = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (oldTicket.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
    }
    const old = oldTicket.rows[0];

    const result = await pool.query(
        `UPDATE tickets SET
            title = COALESCE($1, title),
            status = COALESCE($2, status),
            priority = COALESCE($3, priority),
            description = COALESCE($4, description),
            due_date = COALESCE($5, due_date),
            start_date = COALESCE($6, start_date),
            position = COALESCE($7, position),
            archived = COALESCE($8, archived),
            recurrence = COALESCE($9, recurrence),
            reminder_days = COALESCE($10, reminder_days),
            time_estimated = COALESCE($11, time_estimated),
            time_spent = COALESCE($12, time_spent),
            project_id = COALESCE($13, project_id),
            search_vector = to_tsvector('french', COALESCE($1, title) || ' ' || COALESCE($4, description, ''))
        WHERE id = $14 RETURNING *`,
        [title, status, priority, description, due_date, start_date, position, archived, recurrence, reminder_days, time_estimated, time_spent, project_id, id]
    );

    // Log activity for important changes
    const newTicket = result.rows[0];
    const fieldsToLog = ['status', 'priority', 'archived'];
    for (const field of fieldsToLog) {
        if (req.body[field] !== undefined && old[field] !== newTicket[field]) {
            await pool.query(
                'INSERT INTO activity_log (ticket_id, action, field, old_value, new_value) VALUES ($1, $2, $3, $4, $5)',
                [id, 'update', field, String(old[field]), String(newTicket[field])]
            );
        }
    }

    // Handle recurrence - create next ticket when done
    if (status === 'done' && newTicket.recurrence && newTicket.recurrence !== 'none') {
        let nextDate = newTicket.due_date ? new Date(newTicket.due_date) : new Date();
        switch (newTicket.recurrence) {
            case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
            case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }
        await pool.query(
            'INSERT INTO tickets (title, priority, recurrence, reminder_days, due_date) VALUES ($1, $2, $3, $4, $5)',
            [newTicket.title, newTicket.priority, newTicket.recurrence, newTicket.reminder_days, nextDate.toISOString().split('T')[0]]
        );
    }

    res.json(newTicket);
});

// DELETE - Supprimer un ticket
app.delete('/api/tickets/:id', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tickets WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
    }
    res.json({ success: true });
});

// GET - Tasks d'un ticket
app.get('/api/tickets/:id/tasks', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE ticket_id = $1 ORDER BY position, id', [id]);
    res.json(result.rows);
});

// GET - Export (JSON ou CSV)
app.get('/api/export', async (req, res) => {
    const format = req.query.format || 'json';
    const projectId = req.query.project_id;

    let ticketsQuery = 'SELECT * FROM tickets';
    let queryParams = [];

    if (projectId) {
        ticketsQuery += ' WHERE project_id = $1';
        queryParams.push(projectId);
    }
    ticketsQuery += ' ORDER BY id';

    const tickets = await pool.query(ticketsQuery, queryParams);
    const tasks = await pool.query('SELECT * FROM tasks ORDER BY ticket_id, id');

    const data = tickets.rows.map(t => ({
        ...t,
        tasks: tasks.rows.filter(task => task.ticket_id === t.id)
    }));

    // Get project name for filename
    let filename = 'export';
    if (projectId) {
        const projectResult = await pool.query('SELECT name FROM projects WHERE id = $1', [projectId]);
        if (projectResult.rows.length > 0) {
            filename = projectResult.rows[0].name.replace(/[^a-zA-Z0-9]/g, '_');
        }
    }

    if (format === 'csv') {
        let csv = 'id,title,status,priority,description,due_date,archived,tasks_done,tasks_total\n';
        data.forEach(t => {
            const tasksDone = t.tasks.filter(tk => tk.done).length;
            csv += `${t.id},"${t.title}",${t.status},${t.priority},"${t.description || ''}",${t.due_date || ''},${t.archived},${tasksDone},${t.tasks.length}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        return res.send(csv);
    }

    res.json(data);
});

// ============ TASKS ============

// GET - Liste des tasks
app.get('/api/tasks', async (req, res) => {
    const result = await pool.query('SELECT * FROM tasks ORDER BY position, id');
    res.json(result.rows);
});

// POST - Créer une task
app.post('/api/tasks', async (req, res) => {
    const { text, ticket_id } = req.body;
    const result = await pool.query(
        'INSERT INTO tasks (text, done, ticket_id) VALUES ($1, $2, $3) RETURNING *',
        [text, false, ticket_id]
    );
    res.json(result.rows[0]);
});

// PUT - Modifier une task
app.put('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const { text, done } = req.body;
    const result = await pool.query(
        'UPDATE tasks SET text = COALESCE($1, text), done = COALESCE($2, done) WHERE id = $3 RETURNING *',
        [text, done, id]
    );
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json(result.rows[0]);
});

// DELETE - Supprimer une task
app.delete('/api/tasks/:id', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM tasks WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json({ success: true });
});

// ============ TRANSFORMATIONS ============

// POST - Transformer une tâche en ticket
app.post('/api/tasks/:id/to-ticket', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;

    // Récupérer la tâche
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    const task = taskResult.rows[0];

    // Récupérer le ticket parent pour avoir le project_id
    const parentTicket = await pool.query('SELECT project_id FROM tickets WHERE id = $1', [task.ticket_id]);
    const projectId = parentTicket.rows[0]?.project_id || 1;

    // Créer un nouveau ticket avec le texte de la tâche
    const ticketResult = await pool.query(
        `INSERT INTO tickets (title, status, priority, project_id)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [task.text, task.done ? 'done' : 'todo', 'plan', projectId]
    );
    const newTicket = ticketResult.rows[0];

    // Convertir les sous-tâches en tâches du nouveau ticket
    const subtasks = await pool.query('SELECT * FROM tasks WHERE parent_id = $1', [id]);
    for (const subtask of subtasks.rows) {
        await pool.query(
            'INSERT INTO tasks (text, done, ticket_id, position) VALUES ($1, $2, $3, $4)',
            [subtask.text, subtask.done, newTicket.id, subtask.position]
        );
    }

    // Supprimer la tâche originale (et ses sous-tâches via CASCADE)
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    // Log activité
    await pool.query(
        `INSERT INTO activity_log (ticket_id, action, field, new_value) VALUES ($1, $2, $3, $4)`,
        [newTicket.id, 'created', 'from_task', task.text]
    );

    res.json(newTicket);
});

// POST - Transformer un ticket en tâche
app.post('/api/tickets/:id/to-task', param('id').isInt(), body('target_ticket_id').isInt(), validate, async (req, res) => {
    const { id } = req.params;
    const { target_ticket_id } = req.body;

    // Récupérer le ticket
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
    }
    const ticket = ticketResult.rows[0];

    // Vérifier que le ticket cible existe
    const targetResult = await pool.query('SELECT id FROM tickets WHERE id = $1', [target_ticket_id]);
    if (targetResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket cible non trouvé' });
    }

    // Créer une tâche dans le ticket cible
    const maxPos = await pool.query('SELECT COALESCE(MAX(position), 0) as max FROM tasks WHERE ticket_id = $1', [target_ticket_id]);
    const taskResult = await pool.query(
        `INSERT INTO tasks (text, done, ticket_id, position)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [ticket.title, ticket.status === 'done', target_ticket_id, maxPos.rows[0].max + 1]
    );
    const newTask = taskResult.rows[0];

    // Convertir les tâches du ticket en sous-tâches
    const tasks = await pool.query('SELECT * FROM tasks WHERE ticket_id = $1 AND parent_id IS NULL ORDER BY position', [id]);
    for (const t of tasks.rows) {
        await pool.query(
            'INSERT INTO tasks (text, done, ticket_id, parent_id, position) VALUES ($1, $2, $3, $4, $5)',
            [t.text, t.done, target_ticket_id, newTask.id, t.position]
        );
    }

    // Supprimer le ticket original
    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);

    res.json(newTask);
});

// POST - Transformer un ticket en projet
app.post('/api/tickets/:id/to-project', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;

    // Récupérer le ticket
    const ticketResult = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticketResult.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
    }
    const ticket = ticketResult.rows[0];

    // Créer un nouveau projet
    const projectResult = await pool.query(
        `INSERT INTO projects (name, description, color, icon)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [ticket.title, ticket.description || '', '#6c5ce7', 'fa-folder']
    );
    const newProject = projectResult.rows[0];

    // Convertir les tâches en tickets
    const tasks = await pool.query('SELECT * FROM tasks WHERE ticket_id = $1 AND parent_id IS NULL ORDER BY position', [id]);
    for (const task of tasks.rows) {
        const newTicketResult = await pool.query(
            `INSERT INTO tickets (title, status, priority, project_id)
             VALUES ($1, $2, $3, $4) RETURNING *`,
            [task.text, task.done ? 'done' : 'todo', 'plan', newProject.id]
        );

        // Convertir les sous-tâches
        const subtasks = await pool.query('SELECT * FROM tasks WHERE parent_id = $1 ORDER BY position', [task.id]);
        for (const st of subtasks.rows) {
            await pool.query(
                'INSERT INTO tasks (text, done, ticket_id, position) VALUES ($1, $2, $3, $4)',
                [st.text, st.done, newTicketResult.rows[0].id, st.position]
            );
        }
    }

    // Supprimer le ticket original
    await pool.query('DELETE FROM tickets WHERE id = $1', [id]);

    res.json(newProject);
});

// POST - Transformer un projet en ticket
app.post('/api/projects/:id/to-ticket', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;

    // Vérifier que ce n'est pas le projet Inbox (id=1)
    if (parseInt(id) === 1) {
        return res.status(400).json({ error: 'Impossible de convertir le projet Inbox' });
    }

    // Récupérer le projet
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Projet non trouvé' });
    }
    const project = projectResult.rows[0];

    // Créer un ticket avec le nom du projet
    const ticketResult = await pool.query(
        `INSERT INTO tickets (title, description, status, priority, project_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [project.name, project.description || '', 'todo', 'plan', 1]
    );
    const newTicket = ticketResult.rows[0];

    // Convertir les tickets du projet en tâches
    const tickets = await pool.query('SELECT * FROM tickets WHERE project_id = $1 ORDER BY position, id', [id]);
    let position = 1;
    for (const t of tickets.rows) {
        const taskResult = await pool.query(
            'INSERT INTO tasks (text, done, ticket_id, position) VALUES ($1, $2, $3, $4) RETURNING *',
            [t.title, t.status === 'done', newTicket.id, position++]
        );

        // Convertir les tâches du ticket en sous-tâches
        const tasks = await pool.query('SELECT * FROM tasks WHERE ticket_id = $1 AND parent_id IS NULL ORDER BY position', [t.id]);
        let subPos = 1;
        for (const task of tasks.rows) {
            await pool.query(
                'INSERT INTO tasks (text, done, ticket_id, parent_id, position) VALUES ($1, $2, $3, $4, $5)',
                [task.text, task.done, newTicket.id, taskResult.rows[0].id, subPos++]
            );
        }
    }

    // Supprimer le projet (les tickets seront supprimés ou déplacés via la logique existante)
    await pool.query('DELETE FROM tickets WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json(newTicket);
});

// POST - Transformer une tâche en projet
app.post('/api/tasks/:id/to-project', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;

    // Récupérer la tâche
    const taskResult = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (taskResult.rows.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    const task = taskResult.rows[0];

    // Créer un projet
    const projectResult = await pool.query(
        `INSERT INTO projects (name, description, color, icon) VALUES ($1, $2, $3, $4) RETURNING *`,
        [task.text, '', '#6c5ce7', 'fa-folder']
    );
    const newProject = projectResult.rows[0];

    // Convertir les sous-tâches en tickets
    const subtasks = await pool.query('SELECT * FROM tasks WHERE parent_id = $1 ORDER BY position', [id]);
    for (const sub of subtasks.rows) {
        await pool.query(
            `INSERT INTO tickets (title, status, priority, project_id) VALUES ($1, $2, $3, $4)`,
            [sub.text, sub.done ? 'done' : 'todo', 'plan', newProject.id]
        );
    }

    // Supprimer la tâche originale (les sous-tâches seront supprimées en cascade)
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);

    res.json(newProject);
});

// POST - Transformer un projet en tâche
app.post('/api/projects/:id/to-task',
    param('id').isInt(),
    body('target_ticket_id').isInt(),
    validate,
    async (req, res) => {
    const { id } = req.params;
    const { target_ticket_id } = req.body;

    // Vérifier que ce n'est pas le projet Inbox (id=1)
    if (parseInt(id) === 1) {
        return res.status(400).json({ error: 'Impossible de convertir le projet Inbox' });
    }

    // Récupérer le projet
    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (projectResult.rows.length === 0) {
        return res.status(404).json({ error: 'Projet non trouvé' });
    }
    const project = projectResult.rows[0];

    // Vérifier que le ticket cible existe
    const targetTicket = await pool.query('SELECT * FROM tickets WHERE id = $1', [target_ticket_id]);
    if (targetTicket.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket cible non trouvé' });
    }

    // Créer une tâche principale
    const taskResult = await pool.query(
        'INSERT INTO tasks (text, done, ticket_id) VALUES ($1, $2, $3) RETURNING *',
        [project.name, false, target_ticket_id]
    );
    const newTask = taskResult.rows[0];

    // Convertir les tickets du projet en sous-tâches
    const tickets = await pool.query('SELECT * FROM tickets WHERE project_id = $1 ORDER BY position, id', [id]);
    let position = 1;
    for (const t of tickets.rows) {
        await pool.query(
            'INSERT INTO tasks (text, done, ticket_id, parent_id, position) VALUES ($1, $2, $3, $4, $5)',
            [t.title, t.status === 'done', target_ticket_id, newTask.id, position++]
        );
    }

    // Supprimer le projet et ses tickets
    await pool.query('DELETE FROM tickets WHERE project_id = $1', [id]);
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);

    res.json(newTask);
});

// ============ LABELS ============

// GET - Liste des labels
app.get('/api/labels', async (req, res) => {
    const result = await pool.query('SELECT * FROM labels ORDER BY id');
    res.json(result.rows);
});

// POST - Créer un label
app.post('/api/labels', async (req, res) => {
    const { name, color } = req.body;
    const result = await pool.query(
        'INSERT INTO labels (name, color) VALUES ($1, $2) RETURNING *',
        [name, color || '#4ecdc4']
    );
    res.json(result.rows[0]);
});

// DELETE - Supprimer un label
app.delete('/api/labels/:id', async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM labels WHERE id = $1', [id]);
    res.json({ success: true });
});

// GET - Labels d'un ticket
app.get('/api/tickets/:id/labels', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(`
        SELECT l.* FROM labels l
        JOIN ticket_labels tl ON tl.label_id = l.id
        WHERE tl.ticket_id = $1
    `, [id]);
    res.json(result.rows);
});

// POST - Ajouter label à un ticket
app.post('/api/tickets/:id/labels', async (req, res) => {
    const { id } = req.params;
    const { label_id } = req.body;
    await pool.query(
        'INSERT INTO ticket_labels (ticket_id, label_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [id, label_id]
    );
    res.json({ success: true });
});

// DELETE - Retirer label d'un ticket
app.delete('/api/tickets/:ticketId/labels/:labelId', async (req, res) => {
    const { ticketId, labelId } = req.params;
    await pool.query('DELETE FROM ticket_labels WHERE ticket_id = $1 AND label_id = $2', [ticketId, labelId]);
    res.json({ success: true });
});

// ============ COMMENTS ============

// GET - Commentaires d'un ticket (avec reactions)
app.get('/api/tickets/:id/comments', async (req, res) => {
    const { id } = req.params;
    const commentsResult = await pool.query('SELECT * FROM comments WHERE ticket_id = $1 ORDER BY created_at DESC', [id]);
    const comments = commentsResult.rows;

    // Charger les reactions pour chaque commentaire
    for (const comment of comments) {
        const reactionsResult = await pool.query(
            'SELECT emoji, COUNT(*) as count FROM comment_reactions WHERE comment_id = $1 GROUP BY emoji',
            [comment.id]
        );
        comment.reactions = reactionsResult.rows.map(r => ({ emoji: r.emoji, count: parseInt(r.count) }));
    }

    res.json(comments);
});

// POST - Ajouter un commentaire
app.post('/api/comments', async (req, res) => {
    const { text, ticket_id } = req.body;
    const result = await pool.query(
        'INSERT INTO comments (text, ticket_id) VALUES ($1, $2) RETURNING *',
        [text, ticket_id]
    );
    const comment = result.rows[0];
    comment.reactions = [];
    res.json(comment);
});

// DELETE - Supprimer un commentaire
app.delete('/api/comments/:id', async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM comments WHERE id = $1', [id]);
    res.json({ success: true });
});

// ============ COMMENT REACTIONS ============

// GET - Reactions d'un commentaire
app.get('/api/comments/:id/reactions', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        'SELECT emoji, COUNT(*) as count FROM comment_reactions WHERE comment_id = $1 GROUP BY emoji',
        [id]
    );
    res.json(result.rows.map(r => ({ emoji: r.emoji, count: parseInt(r.count) })));
});

// POST - Ajouter/Toggle une reaction
app.post('/api/comments/:id/reactions', async (req, res) => {
    const { id } = req.params;
    const { emoji } = req.body;

    // Verifier si la reaction existe deja
    const existing = await pool.query(
        'SELECT id FROM comment_reactions WHERE comment_id = $1 AND emoji = $2',
        [id, emoji]
    );

    if (existing.rows.length > 0) {
        // Supprimer si existe (toggle off)
        await pool.query('DELETE FROM comment_reactions WHERE comment_id = $1 AND emoji = $2', [id, emoji]);
        res.json({ action: 'removed', emoji });
    } else {
        // Ajouter si n'existe pas (toggle on)
        await pool.query(
            'INSERT INTO comment_reactions (comment_id, emoji) VALUES ($1, $2)',
            [id, emoji]
        );
        res.json({ action: 'added', emoji });
    }
});

// DELETE - Supprimer une reaction specifique
app.delete('/api/comments/:id/reactions/:emoji', async (req, res) => {
    const { id, emoji } = req.params;
    await pool.query('DELETE FROM comment_reactions WHERE comment_id = $1 AND emoji = $2', [id, emoji]);
    res.json({ success: true });
});

// ============ IMPORT ============

// POST - Import JSON
app.post('/api/import', async (req, res) => {
    const { tickets } = req.body;
    for (const t of tickets) {
        const result = await pool.query(
            'INSERT INTO tickets (title, status, priority, description, due_date) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [t.title, t.status || 'todo', t.priority || 'do', t.description || '', t.due_date || null]
        );
        if (t.tasks) {
            for (const task of t.tasks) {
                await pool.query(
                    'INSERT INTO tasks (text, done, ticket_id) VALUES ($1, $2, $3)',
                    [task.text, task.done || false, result.rows[0].id]
                );
            }
        }
    }
    res.json({ success: true, count: tickets.length });
});

// ============ DUPLICATE ============

// POST - Dupliquer un ticket
app.post('/api/tickets/:id/duplicate', async (req, res) => {
    const { id } = req.params;
    const ticket = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticket.rows.length === 0) {
        return res.status(404).json({ error: 'Ticket non trouvé' });
    }
    const t = ticket.rows[0];
    const result = await pool.query(
        `INSERT INTO tickets (title, status, priority, description, due_date, start_date, recurrence, reminder_days, time_estimated)
         VALUES ($1, 'todo', $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [`${t.title} (copie)`, t.priority, t.description, t.due_date, t.start_date, t.recurrence, t.reminder_days, t.time_estimated]
    );

    // Copy tasks
    const tasks = await pool.query('SELECT * FROM tasks WHERE ticket_id = $1 AND parent_id IS NULL', [id]);
    for (const task of tasks.rows) {
        await pool.query('INSERT INTO tasks (text, done, ticket_id) VALUES ($1, false, $2)', [task.text, result.rows[0].id]);
    }

    // Log activity
    await pool.query(
        'INSERT INTO activity_log (ticket_id, action, new_value) VALUES ($1, $2, $3)',
        [result.rows[0].id, 'create', 'Dupliqué depuis #' + id]
    );

    res.json(result.rows[0]);
});

// ============ SEARCH ============

// GET - Recherche avancée avec full-text search
app.get('/api/search', async (req, res) => {
    const { q } = req.query;
    if (!q) return res.json([]);

    // Prepare search query for PostgreSQL full-text search
    const searchTerms = q.trim().split(/\s+/).filter(t => t.length > 0).join(' & ');

    const result = await pool.query(`
        SELECT DISTINCT t.*, ts_rank(t.search_vector, to_tsquery('french', $1)) as rank
        FROM tickets t
        LEFT JOIN comments c ON c.ticket_id = t.id
        WHERE t.search_vector @@ to_tsquery('french', $1)
           OR LOWER(c.text) LIKE $2
        ORDER BY rank DESC, t.id DESC
        LIMIT 50
    `, [searchTerms, `%${q.toLowerCase()}%`]);
    res.json(result.rows);
});

// ============ ACTIVITY LOG ============

// GET - Historique d'un ticket
app.get('/api/tickets/:id/activity', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        'SELECT * FROM activity_log WHERE ticket_id = $1 ORDER BY created_at DESC LIMIT 50',
        [id]
    );
    res.json(result.rows);
});

// ============ ATTACHMENTS ============

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Create uploads directory
const uploadsDir = './uploads';
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv', 'text/markdown',
    'application/zip', 'application/x-rar-compressed', 'application/gzip',
    'application/json', 'application/xml'
];

// Sanitize filename
const sanitizeFilename = (filename) => {
    return filename
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 200);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const safeName = sanitizeFilename(path.basename(file.originalname, ext));
        cb(null, Date.now() + '-' + safeName + ext);
    }
});

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorise'), false);
    }
};

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter
});

// GET - Attachments d'un ticket
app.get('/api/tickets/:id/attachments', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM attachments WHERE ticket_id = $1 ORDER BY created_at DESC', [id]);
    res.json(result.rows);
});

// POST - Upload attachment
app.post('/api/tickets/:id/attachments', upload.single('file'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const result = await pool.query(
        'INSERT INTO attachments (filename, original_name, mimetype, size, ticket_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, id]
    );

    // Log activity
    await pool.query(
        'INSERT INTO activity_log (ticket_id, action, new_value) VALUES ($1, $2, $3)',
        [id, 'attachment', req.file.originalname]
    );

    res.json(result.rows[0]);
});

// GET - Download attachment
app.get('/api/attachments/:id/download', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM attachments WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Attachment not found' });

    const attachment = result.rows[0];
    const filePath = path.join(uploadsDir, attachment.filename);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    res.download(filePath, attachment.original_name);
});

// DELETE - Supprimer attachment
app.delete('/api/attachments/:id', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM attachments WHERE id = $1', [id]);
    if (result.rows.length > 0) {
        const filePath = path.join(uploadsDir, result.rows[0].filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        await pool.query('DELETE FROM attachments WHERE id = $1', [id]);
    }
    res.json({ success: true });
});

// Serve uploads statically
app.use('/uploads', express.static(uploadsDir));

// ============ TIME TRACKING ============

// POST - Ajouter du temps
app.post('/api/tickets/:id/time', async (req, res) => {
    const { id } = req.params;
    const { minutes } = req.body;
    const result = await pool.query(
        'UPDATE tickets SET time_spent = time_spent + $1 WHERE id = $2 RETURNING *',
        [minutes, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    // Log activity
    await pool.query(
        'INSERT INTO activity_log (ticket_id, action, new_value) VALUES ($1, $2, $3)',
        [id, 'time', `+${minutes} min`]
    );

    res.json(result.rows[0]);
});

// ============ REMINDERS ============

// GET - Tickets avec rappel pour aujourd'hui
app.get('/api/reminders', async (req, res) => {
    const result = await pool.query(`
        SELECT * FROM tickets
        WHERE due_date IS NOT NULL
          AND reminder_days > 0
          AND status != 'done'
          AND NOT archived
          AND due_date - reminder_days <= CURRENT_DATE
          AND due_date >= CURRENT_DATE
        ORDER BY due_date
    `);
    res.json(result.rows);
});

// ============ GANTT ============

// GET - Données pour vue Gantt
app.get('/api/gantt', async (req, res) => {
    const result = await pool.query(`
        SELECT id, title, status, priority, start_date, due_date, time_estimated, time_spent
        FROM tickets
        WHERE NOT archived AND (start_date IS NOT NULL OR due_date IS NOT NULL)
        ORDER BY COALESCE(start_date, due_date)
    `);
    res.json(result.rows);
});

// ============ SUBTASKS ============

// POST - Créer une sous-tâche
app.post('/api/tasks/:id/subtasks', async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    const parent = await pool.query('SELECT ticket_id FROM tasks WHERE id = $1', [id]);
    if (parent.rows.length === 0) return res.status(404).json({ error: 'Parent task not found' });

    const result = await pool.query(
        'INSERT INTO tasks (text, done, ticket_id, parent_id) VALUES ($1, false, $2, $3) RETURNING *',
        [text, parent.rows[0].ticket_id, id]
    );
    res.json(result.rows[0]);
});

// GET - Sous-tâches d'une tâche
app.get('/api/tasks/:id/subtasks', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tasks WHERE parent_id = $1 ORDER BY id', [id]);
    res.json(result.rows);
});

// ============ STATS ============

// GET - Statistiques
app.get('/api/stats', async (req, res) => {
    const total = await pool.query('SELECT COUNT(*) FROM tickets WHERE NOT archived');
    const byStatus = await pool.query(`
        SELECT status, COUNT(*) as count FROM tickets WHERE NOT archived GROUP BY status
    `);
    const byPriority = await pool.query(`
        SELECT priority, COUNT(*) as count FROM tickets WHERE NOT archived GROUP BY priority
    `);
    const overdue = await pool.query(`
        SELECT COUNT(*) FROM tickets WHERE due_date < CURRENT_DATE AND status != 'done' AND NOT archived
    `);
    const completedThisWeek = await pool.query(`
        SELECT COUNT(*) FROM tickets WHERE status = 'done' AND NOT archived
    `);

    res.json({
        total: parseInt(total.rows[0].count),
        byStatus: byStatus.rows,
        byPriority: byPriority.rows,
        overdue: parseInt(overdue.rows[0].count),
        completedThisWeek: parseInt(completedThisWeek.rows[0].count)
    });
});

// GET - Statistiques de productivite (8 dernieres semaines)
app.get('/api/stats/productivity', async (req, res) => {
    const projectId = req.query.project_id;

    let projectFilter = '';
    const params = [];

    if (projectId) {
        projectFilter = ' AND project_id = $1';
        params.push(projectId);
    }

    // Tickets crees par semaine (8 dernieres semaines)
    const created = await pool.query(`
        SELECT
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as count
        FROM tickets
        WHERE created_at >= NOW() - INTERVAL '8 weeks'
        ${projectFilter}
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
    `, params);

    // Tickets completes par semaine (via activity_log)
    const completed = await pool.query(`
        SELECT
            DATE_TRUNC('week', created_at) as week,
            COUNT(*) as count
        FROM activity_log
        WHERE action = 'status_changed'
            AND new_value = 'done'
            AND created_at >= NOW() - INTERVAL '8 weeks'
            ${projectId ? `AND ticket_id IN (SELECT id FROM tickets WHERE project_id = $1)` : ''}
        GROUP BY DATE_TRUNC('week', created_at)
        ORDER BY week
    `, params);

    // Generer les 8 dernieres semaines
    const weeks = [];
    for (let i = 7; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weeks.push({
            week: weekStart.toISOString().split('T')[0],
            label: `S${Math.ceil((weekStart.getDate() + (new Date(weekStart.getFullYear(), 0, 1).getDay())) / 7)}`
        });
    }

    // Mapper les donnees aux semaines
    const result = weeks.map(w => {
        const createdItem = created.rows.find(r => r.week && r.week.toISOString().split('T')[0] === w.week);
        const completedItem = completed.rows.find(r => r.week && r.week.toISOString().split('T')[0] === w.week);
        return {
            week: w.week,
            label: w.label,
            created: createdItem ? parseInt(createdItem.count) : 0,
            completed: completedItem ? parseInt(completedItem.count) : 0
        };
    });

    res.json(result);
});

// GET - Distribution par statut et priorite (pour pie charts)
app.get('/api/stats/distribution', async (req, res) => {
    const projectId = req.query.project_id;

    let projectFilter = '';
    const params = [];

    if (projectId) {
        projectFilter = ' AND project_id = $1';
        params.push(projectId);
    }

    const byStatus = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM tickets
        WHERE NOT archived ${projectFilter}
        GROUP BY status
    `, params);

    const byPriority = await pool.query(`
        SELECT priority, COUNT(*) as count
        FROM tickets
        WHERE NOT archived ${projectFilter}
        GROUP BY priority
    `, params);

    const total = byStatus.rows.reduce((sum, r) => sum + parseInt(r.count), 0);

    res.json({
        byStatus: byStatus.rows.map(r => ({
            status: r.status,
            count: parseInt(r.count),
            percentage: total > 0 ? Math.round((parseInt(r.count) / total) * 100) : 0
        })),
        byPriority: byPriority.rows.map(r => ({
            priority: r.priority,
            count: parseInt(r.count),
            percentage: total > 0 ? Math.round((parseInt(r.count) / total) * 100) : 0
        })),
        total
    });
});

// ============ ADVANCED SEARCH ============

// POST - Recherche avancée avec filtres
app.post('/api/search/advanced', async (req, res) => {
    const { query, status, priority, labels, dateFrom, dateTo, projectId, pinned } = req.body;

    let sql = `
        SELECT DISTINCT t.*, p.name as project_name, p.color as project_color
        FROM tickets t
        LEFT JOIN projects p ON p.id = t.project_id
        LEFT JOIN ticket_labels tl ON tl.ticket_id = t.id
        LEFT JOIN labels l ON l.id = tl.label_id
        WHERE NOT t.archived
    `;
    const params = [];
    let paramIndex = 1;

    if (query) {
        const searchTerms = query.trim().split(/\s+/).filter(t => t.length > 0).join(' & ');
        if (searchTerms) {
            sql += ` AND t.search_vector @@ to_tsquery('french', $${paramIndex})`;
            params.push(searchTerms);
            paramIndex++;
        }
    }

    if (status && status.length > 0) {
        sql += ` AND t.status = ANY($${paramIndex})`;
        params.push(status);
        paramIndex++;
    }

    if (priority && priority.length > 0) {
        sql += ` AND t.priority = ANY($${paramIndex})`;
        params.push(priority);
        paramIndex++;
    }

    if (labels && labels.length > 0) {
        sql += ` AND l.id = ANY($${paramIndex})`;
        params.push(labels);
        paramIndex++;
    }

    if (dateFrom) {
        sql += ` AND t.due_date >= $${paramIndex}`;
        params.push(dateFrom);
        paramIndex++;
    }

    if (dateTo) {
        sql += ` AND t.due_date <= $${paramIndex}`;
        params.push(dateTo);
        paramIndex++;
    }

    if (projectId) {
        sql += ` AND t.project_id = $${paramIndex}`;
        params.push(projectId);
        paramIndex++;
    }

    if (pinned !== undefined) {
        sql += ` AND t.pinned = $${paramIndex}`;
        params.push(pinned);
        paramIndex++;
    }

    sql += ' ORDER BY t.pinned DESC, t.id DESC';

    const result = await pool.query(sql, params);
    res.json(result.rows);
});

// ============ PINNED / FAVORITES ============

// PUT - Toggle pinned
app.put('/api/tickets/:id/pin', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        'UPDATE tickets SET pinned = NOT COALESCE(pinned, false) WHERE id = $1 RETURNING *',
        [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
});

// GET - Pinned tickets
app.get('/api/tickets/pinned', async (req, res) => {
    const result = await pool.query(
        'SELECT * FROM tickets WHERE pinned = true AND NOT archived ORDER BY id DESC'
    );
    res.json(result.rows);
});

// ============ TEMPLATES ============

// GET - Liste des templates
app.get('/api/templates', async (req, res) => {
    const result = await pool.query(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM ticket_templates t
        LEFT JOIN projects p ON p.id = t.project_id
        ORDER BY t.name
    `);
    res.json(result.rows);
});

// POST - Créer un template
app.post('/api/templates', async (req, res) => {
    const { name, title, description, priority, project_id } = req.body;
    const result = await pool.query(
        'INSERT INTO ticket_templates (name, title, description, priority, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, title, description || '', priority || 'do', project_id]
    );
    res.json(result.rows[0]);
});

// POST - Créer un template depuis un ticket existant
app.post('/api/tickets/:id/save-template', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const ticket = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
    if (ticket.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const t = ticket.rows[0];
    const result = await pool.query(
        'INSERT INTO ticket_templates (name, title, description, priority, project_id) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, t.title, t.description, t.priority, t.project_id]
    );
    res.json(result.rows[0]);
});

// POST - Créer un ticket depuis un template
app.post('/api/templates/:id/create-ticket', async (req, res) => {
    const { id } = req.params;
    const { title, project_id } = req.body;
    const template = await pool.query('SELECT * FROM ticket_templates WHERE id = $1', [id]);
    if (template.rows.length === 0) return res.status(404).json({ error: 'Template not found' });

    const t = template.rows[0];
    const finalTitle = title || t.title;
    const finalProjectId = project_id || t.project_id || 1;
    const result = await pool.query(
        'INSERT INTO tickets (title, description, priority, project_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [finalTitle, t.description, t.priority, finalProjectId, 'todo']
    );

    await pool.query(
        'INSERT INTO activity_log (ticket_id, action, new_value) VALUES ($1, $2, $3)',
        [result.rows[0].id, 'create', 'Créé depuis template: ' + t.name]
    );

    res.json(result.rows[0]);
});

// DELETE - Supprimer un template
app.delete('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM ticket_templates WHERE id = $1', [id]);
    res.json({ success: true });
});

// ============ DEPENDENCIES ============

// GET - Dépendances d'un ticket
app.get('/api/tickets/:id/dependencies', async (req, res) => {
    const { id } = req.params;
    const blockedBy = await pool.query(`
        SELECT t.id, t.title, t.status, t.priority
        FROM ticket_dependencies d
        JOIN tickets t ON t.id = d.depends_on_id
        WHERE d.ticket_id = $1
    `, [id]);
    const blocks = await pool.query(`
        SELECT t.id, t.title, t.status, t.priority
        FROM ticket_dependencies d
        JOIN tickets t ON t.id = d.ticket_id
        WHERE d.depends_on_id = $1
    `, [id]);
    res.json({ blockedBy: blockedBy.rows, blocks: blocks.rows });
});

// POST - Ajouter une dépendance
app.post('/api/tickets/:id/dependencies', async (req, res) => {
    const { id } = req.params;
    const { depends_on_id } = req.body;
    if (parseInt(id) === parseInt(depends_on_id)) {
        return res.status(400).json({ error: 'Cannot depend on itself' });
    }
    try {
        await pool.query(
            'INSERT INTO ticket_dependencies (ticket_id, depends_on_id) VALUES ($1, $2)',
            [id, depends_on_id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(400).json({ error: 'Dependency already exists' });
    }
});

// DELETE - Supprimer une dépendance
app.delete('/api/tickets/:id/dependencies/:depId', async (req, res) => {
    const { id, depId } = req.params;
    await pool.query(
        'DELETE FROM ticket_dependencies WHERE ticket_id = $1 AND depends_on_id = $2',
        [id, depId]
    );
    res.json({ success: true });
});

// ============ TASK REORDERING ============

// PUT - Réordonner les tâches
app.put('/api/tickets/:id/tasks/reorder', async (req, res) => {
    const { id } = req.params;
    const { taskIds } = req.body; // Array of task IDs in new order

    for (let i = 0; i < taskIds.length; i++) {
        await pool.query('UPDATE tasks SET position = $1 WHERE id = $2 AND ticket_id = $3', [i, taskIds[i], id]);
    }
    res.json({ success: true });
});

// ============ GLOBAL ACTIVITY ============

// GET - Historique global (tous les tickets)
app.get('/api/activity', async (req, res) => {
    const limit = req.query.limit || 50;
    const result = await pool.query(`
        SELECT a.*, t.title as ticket_title
        FROM activity_log a
        JOIN tickets t ON t.id = a.ticket_id
        ORDER BY a.created_at DESC
        LIMIT $1
    `, [limit]);
    res.json(result.rows);
});

// ============ STATS PAR PROJET ============

// GET - Statistiques d'un projet
app.get('/api/projects/:id/stats', async (req, res) => {
    const { id } = req.params;
    const total = await pool.query('SELECT COUNT(*) FROM tickets WHERE project_id = $1 AND NOT archived', [id]);
    const byStatus = await pool.query(`
        SELECT status, COUNT(*) as count FROM tickets WHERE project_id = $1 AND NOT archived GROUP BY status
    `, [id]);
    const byPriority = await pool.query(`
        SELECT priority, COUNT(*) as count FROM tickets WHERE project_id = $1 AND NOT archived GROUP BY priority
    `, [id]);
    const overdue = await pool.query(`
        SELECT COUNT(*) FROM tickets WHERE project_id = $1 AND due_date < CURRENT_DATE AND status != 'done' AND NOT archived
    `, [id]);
    const completedThisWeek = await pool.query(`
        SELECT COUNT(*) FROM tickets WHERE project_id = $1 AND status = 'done' AND NOT archived
    `, [id]);

    res.json({
        total: parseInt(total.rows[0].count),
        byStatus: byStatus.rows,
        byPriority: byPriority.rows,
        overdue: parseInt(overdue.rows[0].count),
        completedThisWeek: parseInt(completedThisWeek.rows[0].count)
    });
});

// ============ SETTINGS ============

// GET - Toutes les settings
app.get('/api/settings', async (req, res) => {
    const result = await pool.query('SELECT * FROM settings');
    const settings = {};
    result.rows.forEach(row => {
        settings[row.key] = row.value;
    });
    res.json(settings);
});

// PUT - Modifier une setting
app.put('/api/settings/:key', async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    await pool.query(
        'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
        [key, value]
    );
    res.json({ success: true });
});

// POST - Auto-archiver les tickets terminés
app.post('/api/auto-archive', async (req, res) => {
    const settingsResult = await pool.query("SELECT * FROM settings WHERE key IN ('auto_archive_enabled', 'auto_archive_days')");
    const settings = {};
    settingsResult.rows.forEach(row => {
        settings[row.key] = row.value;
    });

    if (settings.auto_archive_enabled !== 'true') {
        return res.json({ archived: 0, message: 'Auto-archive is disabled' });
    }

    const days = parseInt(settings.auto_archive_days) || 7;
    const result = await pool.query(`
        UPDATE tickets
        SET archived = true
        WHERE status = 'done'
        AND NOT archived
        AND created_at < NOW() - INTERVAL '1 day' * $1
        RETURNING id
    `, [parseInt(days) || 7]);
    res.json({ archived: result.rowCount, message: `Archived ${result.rowCount} ticket(s)` });
});

// ============ EPICS ============

// GET - Liste des epics
app.get('/api/epics', async (req, res) => {
    const { project_id } = req.query;
    let query = `
        SELECT e.*, p.name as project_name, p.color as project_color,
               (SELECT COUNT(*) FROM tickets t WHERE t.epic_id = e.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.epic_id = e.id AND t.status = 'done') as ticket_done
        FROM epics e
        LEFT JOIN projects p ON e.project_id = p.id
    `;
    const params = [];
    if (project_id) {
        query += ' WHERE e.project_id = $1';
        params.push(project_id);
    }
    query += ' ORDER BY e.created_at DESC';
    const result = await pool.query(query, params);

    // Calculate progress
    const epics = result.rows.map(epic => ({
        ...epic,
        progress: epic.ticket_count > 0 ? Math.round((epic.ticket_done / epic.ticket_count) * 100) : 0
    }));
    res.json(epics);
});

// GET - Un epic par ID
app.get('/api/epics/:id', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query(`
        SELECT e.*, p.name as project_name, p.color as project_color,
               (SELECT COUNT(*) FROM tickets t WHERE t.epic_id = e.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.epic_id = e.id AND t.status = 'done') as ticket_done
        FROM epics e
        LEFT JOIN projects p ON e.project_id = p.id
        WHERE e.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Epic non trouve' });
    const epic = result.rows[0];
    epic.progress = epic.ticket_count > 0 ? Math.round((epic.ticket_done / epic.ticket_count) * 100) : 0;
    res.json(epic);
});

// POST - Creer un epic
app.post('/api/epics',
    body('name').notEmpty().trim().escape(),
    body('description').optional().trim(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('status').optional().isIn(['open', 'in_progress', 'completed']),
    body('project_id').optional().isInt(),
    validate,
    async (req, res) => {
        const { name, description, color, status, project_id } = req.body;
        const result = await pool.query(
            `INSERT INTO epics (name, description, color, status, project_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [sanitizeString(name), sanitizeString(description || ''), color || '#6c5ce7', status || 'open', project_id || null]
        );
        res.status(201).json(result.rows[0]);
    }
);

// PUT - Modifier un epic
app.put('/api/epics/:id',
    param('id').isInt(),
    body('name').optional().trim().escape(),
    body('description').optional().trim(),
    body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
    body('status').optional().isIn(['open', 'in_progress', 'completed']),
    body('project_id').optional().isInt(),
    validate,
    async (req, res) => {
        const { name, description, color, status, project_id } = req.body;
        const updates = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(sanitizeString(name)); }
        if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(sanitizeString(description)); }
        if (color !== undefined) { updates.push(`color = $${idx++}`); values.push(color); }
        if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
        if (project_id !== undefined) { updates.push(`project_id = $${idx++}`); values.push(project_id); }

        if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier' });

        values.push(req.params.id);
        const result = await pool.query(
            `UPDATE epics SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Epic non trouve' });
        res.json(result.rows[0]);
    }
);

// DELETE - Supprimer un epic
app.delete('/api/epics/:id', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query('DELETE FROM epics WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Epic non trouve' });
    res.json({ message: 'Epic supprime' });
});

// ============ MILESTONES ============

// GET - Liste des milestones
app.get('/api/milestones', async (req, res) => {
    const { project_id } = req.query;
    let query = `
        SELECT m.*, p.name as project_name, p.color as project_color,
               (SELECT COUNT(*) FROM tickets t WHERE t.milestone_id = m.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.milestone_id = m.id AND t.status = 'done') as ticket_done
        FROM milestones m
        LEFT JOIN projects p ON m.project_id = p.id
    `;
    const params = [];
    if (project_id) {
        query += ' WHERE m.project_id = $1';
        params.push(project_id);
    }
    query += ' ORDER BY m.due_date ASC';
    const result = await pool.query(query, params);

    const milestones = result.rows.map(m => ({
        ...m,
        progress: m.ticket_count > 0 ? Math.round((m.ticket_done / m.ticket_count) * 100) : 0
    }));
    res.json(milestones);
});

// GET - Un milestone par ID
app.get('/api/milestones/:id', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query(`
        SELECT m.*, p.name as project_name, p.color as project_color,
               (SELECT COUNT(*) FROM tickets t WHERE t.milestone_id = m.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.milestone_id = m.id AND t.status = 'done') as ticket_done
        FROM milestones m
        LEFT JOIN projects p ON m.project_id = p.id
        WHERE m.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone non trouve' });
    const milestone = result.rows[0];
    milestone.progress = milestone.ticket_count > 0 ? Math.round((milestone.ticket_done / milestone.ticket_count) * 100) : 0;
    res.json(milestone);
});

// POST - Creer un milestone
app.post('/api/milestones',
    body('name').notEmpty().trim().escape(),
    body('description').optional().trim(),
    body('due_date').notEmpty().isISO8601(),
    body('status').optional().isIn(['open', 'closed']),
    body('project_id').optional().isInt(),
    validate,
    async (req, res) => {
        const { name, description, due_date, status, project_id } = req.body;
        const result = await pool.query(
            `INSERT INTO milestones (name, description, due_date, status, project_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [sanitizeString(name), sanitizeString(description || ''), due_date, status || 'open', project_id || null]
        );
        res.status(201).json(result.rows[0]);
    }
);

// PUT - Modifier un milestone
app.put('/api/milestones/:id',
    param('id').isInt(),
    body('name').optional().trim().escape(),
    body('description').optional().trim(),
    body('due_date').optional().isISO8601(),
    body('status').optional().isIn(['open', 'closed']),
    body('project_id').optional().isInt(),
    validate,
    async (req, res) => {
        const { name, description, due_date, status, project_id } = req.body;
        const updates = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(sanitizeString(name)); }
        if (description !== undefined) { updates.push(`description = $${idx++}`); values.push(sanitizeString(description)); }
        if (due_date !== undefined) { updates.push(`due_date = $${idx++}`); values.push(due_date); }
        if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
        if (project_id !== undefined) { updates.push(`project_id = $${idx++}`); values.push(project_id); }

        if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier' });

        values.push(req.params.id);
        const result = await pool.query(
            `UPDATE milestones SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone non trouve' });
        res.json(result.rows[0]);
    }
);

// DELETE - Supprimer un milestone
app.delete('/api/milestones/:id', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query('DELETE FROM milestones WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Milestone non trouve' });
    res.json({ message: 'Milestone supprime' });
});

// ============ SPRINTS ============

// GET - Liste des sprints
app.get('/api/sprints', async (req, res) => {
    const { project_id } = req.query;
    let query = `
        SELECT s.*, p.name as project_name, p.color as project_color,
               (SELECT COUNT(*) FROM tickets t WHERE t.sprint_id = s.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.sprint_id = s.id AND t.status = 'done') as ticket_done
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
    `;
    const params = [];
    if (project_id) {
        query += ' WHERE s.project_id = $1';
        params.push(project_id);
    }
    query += ' ORDER BY s.start_date DESC';
    const result = await pool.query(query, params);

    const sprints = result.rows.map(s => ({
        ...s,
        progress: s.ticket_count > 0 ? Math.round((s.ticket_done / s.ticket_count) * 100) : 0
    }));
    res.json(sprints);
});

// GET - Velocity data pour tous les sprints completes (AVANT :id pour eviter conflit)
app.get('/api/sprints/velocity', async (req, res) => {
    const { project_id, limit } = req.query;

    let query = `
        SELECT s.id, s.name, s.start_date, s.end_date,
               (SELECT COUNT(*) FROM tickets t WHERE t.sprint_id = s.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.sprint_id = s.id AND t.status = 'done') as ticket_done
        FROM sprints s
        WHERE s.status = 'completed'
    `;
    const params = [];
    let paramIndex = 1;

    if (project_id) {
        query += ` AND s.project_id = $${paramIndex++}`;
        params.push(project_id);
    }

    query += ' ORDER BY s.end_date DESC';

    if (limit) {
        query += ` LIMIT $${paramIndex++}`;
        params.push(parseInt(limit));
    } else {
        query += ' LIMIT 10';
    }

    const result = await pool.query(query, params);

    const sprints = result.rows.map(s => ({
        id: s.id,
        name: s.name,
        start_date: s.start_date,
        end_date: s.end_date,
        ticket_count: parseInt(s.ticket_count),
        ticket_done: parseInt(s.ticket_done),
        velocity: parseInt(s.ticket_done)
    }));

    sprints.reverse();

    const totalVelocity = sprints.reduce((sum, s) => sum + s.velocity, 0);
    const averageVelocity = sprints.length > 0 ? Math.round(totalVelocity / sprints.length * 10) / 10 : 0;

    res.json({
        sprints,
        averageVelocity,
        totalSprints: sprints.length
    });
});

// GET - Un sprint par ID
app.get('/api/sprints/:id', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query(`
        SELECT s.*, p.name as project_name, p.color as project_color,
               (SELECT COUNT(*) FROM tickets t WHERE t.sprint_id = s.id) as ticket_count,
               (SELECT COUNT(*) FROM tickets t WHERE t.sprint_id = s.id AND t.status = 'done') as ticket_done
        FROM sprints s
        LEFT JOIN projects p ON s.project_id = p.id
        WHERE s.id = $1
    `, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sprint non trouve' });
    const sprint = result.rows[0];
    sprint.progress = sprint.ticket_count > 0 ? Math.round((sprint.ticket_done / sprint.ticket_count) * 100) : 0;
    res.json(sprint);
});

// GET - Tickets d'un sprint
app.get('/api/sprints/:id/tickets', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query(`
        SELECT t.*, p.name as project_name, p.color as project_color
        FROM tickets t
        LEFT JOIN projects p ON t.project_id = p.id
        WHERE t.sprint_id = $1
        ORDER BY t.position, t.id
    `, [req.params.id]);
    res.json(result.rows);
});

// POST - Creer un sprint
app.post('/api/sprints',
    body('name').notEmpty().trim().escape(),
    body('goal').optional().trim(),
    body('start_date').notEmpty().isISO8601(),
    body('end_date').notEmpty().isISO8601(),
    body('status').optional().isIn(['planning', 'active', 'completed']),
    body('project_id').optional().isInt(),
    validate,
    async (req, res) => {
        const { name, goal, start_date, end_date, status, project_id } = req.body;
        const result = await pool.query(
            `INSERT INTO sprints (name, goal, start_date, end_date, status, project_id)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
            [sanitizeString(name), sanitizeString(goal || ''), start_date, end_date, status || 'planning', project_id || null]
        );
        res.status(201).json(result.rows[0]);
    }
);

// PUT - Modifier un sprint
app.put('/api/sprints/:id',
    param('id').isInt(),
    body('name').optional().trim().escape(),
    body('goal').optional().trim(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('status').optional().isIn(['planning', 'active', 'completed']),
    body('project_id').optional().isInt(),
    validate,
    async (req, res) => {
        const { name, goal, start_date, end_date, status, project_id } = req.body;
        const sprintId = parseInt(req.params.id);

        // Si on active un sprint, désactiver les autres sprints actifs
        if (status === 'active') {
            await pool.query(
                `UPDATE sprints SET status = 'completed' WHERE status = 'active' AND id != $1`,
                [sprintId]
            );
        }

        const updates = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(sanitizeString(name)); }
        if (goal !== undefined) { updates.push(`goal = $${idx++}`); values.push(sanitizeString(goal)); }
        if (start_date !== undefined) { updates.push(`start_date = $${idx++}`); values.push(start_date); }
        if (end_date !== undefined) { updates.push(`end_date = $${idx++}`); values.push(end_date); }
        if (status !== undefined) { updates.push(`status = $${idx++}`); values.push(status); }
        if (project_id !== undefined) { updates.push(`project_id = $${idx++}`); values.push(project_id); }

        if (updates.length === 0) return res.status(400).json({ error: 'Aucun champ a modifier' });

        values.push(sprintId);
        const result = await pool.query(
            `UPDATE sprints SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
            values
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Sprint non trouve' });
        res.json(result.rows[0]);
    }
);

// DELETE - Supprimer un sprint
app.delete('/api/sprints/:id', param('id').isInt(), validate, async (req, res) => {
    const result = await pool.query('DELETE FROM sprints WHERE id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sprint non trouve' });
    res.json({ message: 'Sprint supprime' });
});

// GET - Burndown data pour un sprint
app.get('/api/sprints/:id/burndown', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;

    // Get sprint info
    const sprintResult = await pool.query('SELECT * FROM sprints WHERE id = $1', [id]);
    if (sprintResult.rows.length === 0) return res.status(404).json({ error: 'Sprint non trouve' });
    const sprint = sprintResult.rows[0];

    // Get total tickets in sprint
    const ticketCountResult = await pool.query(
        'SELECT COUNT(*) as total FROM tickets WHERE sprint_id = $1',
        [id]
    );
    const totalTickets = parseInt(ticketCountResult.rows[0].total);

    // Get activity log for tickets completed during sprint
    const completionResult = await pool.query(`
        SELECT DATE(a.created_at) as date, COUNT(*) as count
        FROM activity_log a
        JOIN tickets t ON t.id = a.ticket_id
        WHERE t.sprint_id = $1
          AND a.action = 'update'
          AND a.field = 'status'
          AND a.new_value = 'done'
          AND DATE(a.created_at) BETWEEN $2 AND $3
        GROUP BY DATE(a.created_at)
        ORDER BY date
    `, [id, sprint.start_date, sprint.end_date]);

    // Build day-by-day data
    const startDate = new Date(sprint.start_date);
    const endDate = new Date(sprint.end_date);
    const days = [];
    const ideal = [];
    const actual = [];

    // Calculate total days
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const idealDecrement = totalTickets / (totalDays - 1);

    // Build completion map
    const completionMap = {};
    completionResult.rows.forEach(row => {
        completionMap[row.date.toISOString().split('T')[0]] = parseInt(row.count);
    });

    // Generate data points
    let remaining = totalTickets;
    let idealRemaining = totalTickets;
    const currentDate = new Date(startDate);
    let dayIndex = 0;

    while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        days.push(dateStr);

        // Ideal burndown (linear)
        ideal.push(Math.max(0, Math.round(idealRemaining * 10) / 10));
        idealRemaining -= idealDecrement;

        // Actual burndown
        const completedToday = completionMap[dateStr] || 0;
        remaining -= completedToday;
        actual.push(Math.max(0, remaining));

        currentDate.setDate(currentDate.getDate() + 1);
        dayIndex++;
    }

    res.json({
        sprint: {
            id: sprint.id,
            name: sprint.name,
            start_date: sprint.start_date,
            end_date: sprint.end_date
        },
        totalTickets,
        days,
        ideal,
        actual
    });
});

// ============ WHITEBOARDS ============

// GET - Whiteboard d'un projet (auto-create si n'existe pas)
app.get('/api/projects/:projectId/whiteboard', param('projectId').isInt(), validate, async (req, res) => {
    const { projectId } = req.params;

    // Verifier que le projet existe
    const project = await pool.query('SELECT id FROM projects WHERE id = $1', [projectId]);
    if (project.rows.length === 0) {
        return res.status(404).json({ error: 'Projet non trouve' });
    }

    // Chercher ou creer le whiteboard
    let result = await pool.query('SELECT * FROM whiteboards WHERE project_id = $1', [projectId]);

    if (result.rows.length === 0) {
        // Creer automatiquement
        result = await pool.query(
            'INSERT INTO whiteboards (project_id, name) VALUES ($1, $2) RETURNING *',
            [projectId, 'Whiteboard']
        );
    }

    const board = result.rows[0];

    // Compter les elements
    const countResult = await pool.query('SELECT COUNT(*) FROM whiteboard_elements WHERE board_id = $1', [board.id]);
    board.element_count = parseInt(countResult.rows[0].count);

    res.json(board);
});

// PUT - Modifier un whiteboard
app.put('/api/whiteboards/:id', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;
    const { name, description, viewport_x, viewport_y, viewport_zoom, background_color, grid_enabled, grid_size, snap_to_grid } = req.body;

    const result = await pool.query(
        `UPDATE whiteboards SET
            name = COALESCE($1, name),
            description = COALESCE($2, description),
            viewport_x = COALESCE($3, viewport_x),
            viewport_y = COALESCE($4, viewport_y),
            viewport_zoom = COALESCE($5, viewport_zoom),
            background_color = COALESCE($6, background_color),
            grid_enabled = COALESCE($7, grid_enabled),
            grid_size = COALESCE($8, grid_size),
            snap_to_grid = COALESCE($9, snap_to_grid),
            updated_at = NOW()
        WHERE id = $10 RETURNING *`,
        [name, description, viewport_x, viewport_y, viewport_zoom, background_color, grid_enabled, grid_size, snap_to_grid, id]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Whiteboard non trouve' });
    }
    res.json(result.rows[0]);
});

// DELETE - Supprimer un whiteboard
app.delete('/api/whiteboards/:id', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;
    await pool.query('DELETE FROM whiteboards WHERE id = $1', [id]);
    res.json({ success: true });
});

// GET - Liste des elements d'un whiteboard
app.get('/api/whiteboards/:id/elements', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        'SELECT * FROM whiteboard_elements WHERE board_id = $1 ORDER BY z_index, id',
        [id]
    );
    res.json(result.rows);
});

// POST - Creer un element
app.post('/api/whiteboards/:id/elements', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;
    const { type, x, y, width, height, rotation, fill_color, stroke_color, stroke_width, opacity, text_content, font_size, font_family, text_align, line_style, start_arrow, end_arrow, path_data, image_url, image_filename, z_index, locked } = req.body;

    // Get max z_index
    const maxZ = await pool.query('SELECT COALESCE(MAX(z_index), 0) as max FROM whiteboard_elements WHERE board_id = $1', [id]);
    const newZIndex = z_index !== undefined ? z_index : maxZ.rows[0].max + 1;

    const result = await pool.query(
        `INSERT INTO whiteboard_elements
         (board_id, type, x, y, width, height, rotation, fill_color, stroke_color, stroke_width, opacity, text_content, font_size, font_family, text_align, line_style, start_arrow, end_arrow, path_data, image_url, image_filename, z_index, locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         RETURNING *`,
        [id, type, x || 0, y || 0, width || 200, height || 100, rotation || 0, fill_color || '#fef3bd', stroke_color || '#333333', stroke_width || 1, opacity || 1, text_content || '', font_size || 14, font_family || 'Segoe UI', text_align || 'left', line_style || 'solid', start_arrow || false, end_arrow || false, path_data, image_url, image_filename, newZIndex, locked || false]
    );

    // Update whiteboard timestamp
    await pool.query('UPDATE whiteboards SET updated_at = NOW() WHERE id = $1', [id]);

    res.json(result.rows[0]);
});

// PUT - Modifier un element
app.put('/api/whiteboards/:id/elements/:elemId', [param('id').isInt(), param('elemId').isInt()], validate, async (req, res) => {
    const { elemId } = req.params;
    const { type, x, y, width, height, rotation, fill_color, stroke_color, stroke_width, opacity, text_content, font_size, font_family, text_align, line_style, start_arrow, end_arrow, start_element_id, end_element_id, start_anchor, end_anchor, path_data, image_url, image_filename, z_index, locked } = req.body;

    const result = await pool.query(
        `UPDATE whiteboard_elements SET
            type = COALESCE($1, type),
            x = COALESCE($2, x),
            y = COALESCE($3, y),
            width = COALESCE($4, width),
            height = COALESCE($5, height),
            rotation = COALESCE($6, rotation),
            fill_color = COALESCE($7, fill_color),
            stroke_color = COALESCE($8, stroke_color),
            stroke_width = COALESCE($9, stroke_width),
            opacity = COALESCE($10, opacity),
            text_content = COALESCE($11, text_content),
            font_size = COALESCE($12, font_size),
            font_family = COALESCE($13, font_family),
            text_align = COALESCE($14, text_align),
            line_style = COALESCE($15, line_style),
            start_arrow = COALESCE($16, start_arrow),
            end_arrow = COALESCE($17, end_arrow),
            start_element_id = $18,
            end_element_id = $19,
            start_anchor = COALESCE($20, start_anchor),
            end_anchor = COALESCE($21, end_anchor),
            path_data = COALESCE($22, path_data),
            image_url = COALESCE($23, image_url),
            image_filename = COALESCE($24, image_filename),
            z_index = COALESCE($25, z_index),
            locked = COALESCE($26, locked),
            updated_at = NOW()
        WHERE id = $27 RETURNING *`,
        [type, x, y, width, height, rotation, fill_color, stroke_color, stroke_width, opacity, text_content, font_size, font_family, text_align, line_style, start_arrow, end_arrow, start_element_id, end_element_id, start_anchor, end_anchor, path_data, image_url, image_filename, z_index, locked, elemId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Element non trouve' });
    }
    res.json(result.rows[0]);
});

// DELETE - Supprimer un element
app.delete('/api/whiteboards/:id/elements/:elemId', [param('id').isInt(), param('elemId').isInt()], validate, async (req, res) => {
    const { elemId } = req.params;
    await pool.query('DELETE FROM whiteboard_elements WHERE id = $1', [elemId]);
    res.json({ success: true });
});

// POST - Bulk create/update elements
app.post('/api/whiteboards/:id/elements/bulk', param('id').isInt(), validate, async (req, res) => {
    const { id } = req.params;
    const { elements } = req.body;

    const results = [];
    for (const elem of elements) {
        if (elem.id) {
            // Update existing
            const result = await pool.query(
                `UPDATE whiteboard_elements SET
                    x = COALESCE($1, x), y = COALESCE($2, y),
                    width = COALESCE($3, width), height = COALESCE($4, height),
                    rotation = COALESCE($5, rotation), fill_color = COALESCE($6, fill_color),
                    text_content = COALESCE($7, text_content), z_index = COALESCE($8, z_index),
                    updated_at = NOW()
                WHERE id = $9 RETURNING *`,
                [elem.x, elem.y, elem.width, elem.height, elem.rotation, elem.fill_color, elem.text_content, elem.z_index, elem.id]
            );
            if (result.rows.length > 0) results.push(result.rows[0]);
        } else {
            // Create new
            const maxZ = await pool.query('SELECT COALESCE(MAX(z_index), 0) as max FROM whiteboard_elements WHERE board_id = $1', [id]);
            const result = await pool.query(
                `INSERT INTO whiteboard_elements (board_id, type, x, y, width, height, fill_color, text_content, z_index)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
                [id, elem.type || 'sticky_note', elem.x || 0, elem.y || 0, elem.width || 200, elem.height || 100, elem.fill_color || '#fef3bd', elem.text_content || '', maxZ.rows[0].max + 1]
            );
            results.push(result.rows[0]);
        }
    }

    await pool.query('UPDATE whiteboards SET updated_at = NOW() WHERE id = $1', [id]);
    res.json(results);
});

// DELETE - Bulk delete elements
app.delete('/api/whiteboards/:id/elements/bulk', param('id').isInt(), validate, async (req, res) => {
    const { ids } = req.body;
    if (ids && ids.length > 0) {
        await pool.query('DELETE FROM whiteboard_elements WHERE id = ANY($1)', [ids]);
    }
    res.json({ success: true });
});

// PUT - Reorder elements (z-index)
app.put('/api/whiteboards/:id/elements/reorder', param('id').isInt(), validate, async (req, res) => {
    const { elementIds } = req.body;

    for (let i = 0; i < elementIds.length; i++) {
        await pool.query('UPDATE whiteboard_elements SET z_index = $1 WHERE id = $2', [i, elementIds[i]]);
    }
    res.json({ success: true });
});

// POST - Duplicate element
app.post('/api/whiteboards/:id/duplicate/:elemId', [param('id').isInt(), param('elemId').isInt()], validate, async (req, res) => {
    const { id, elemId } = req.params;

    const original = await pool.query('SELECT * FROM whiteboard_elements WHERE id = $1', [elemId]);
    if (original.rows.length === 0) {
        return res.status(404).json({ error: 'Element non trouve' });
    }

    const elem = original.rows[0];
    const maxZ = await pool.query('SELECT COALESCE(MAX(z_index), 0) as max FROM whiteboard_elements WHERE board_id = $1', [id]);

    const result = await pool.query(
        `INSERT INTO whiteboard_elements
         (board_id, type, x, y, width, height, rotation, fill_color, stroke_color, stroke_width, opacity, text_content, font_size, font_family, text_align, line_style, start_arrow, end_arrow, path_data, image_url, image_filename, z_index, locked)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
         RETURNING *`,
        [id, elem.type, elem.x + 20, elem.y + 20, elem.width, elem.height, elem.rotation, elem.fill_color, elem.stroke_color, elem.stroke_width, elem.opacity, elem.text_content, elem.font_size, elem.font_family, elem.text_align, elem.line_style, elem.start_arrow, elem.end_arrow, elem.path_data, elem.image_url, elem.image_filename, maxZ.rows[0].max + 1, false]
    );

    res.json(result.rows[0]);
});

// POST - Upload image to whiteboard
app.post('/api/whiteboards/:id/images', param('id').isInt(), validate, upload.single('file'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Only allow images
    if (!req.file.mimetype.startsWith('image/')) {
        fs.unlinkSync(path.join(uploadsDir, req.file.filename));
        return res.status(400).json({ error: 'Only images allowed' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    // Create image element
    const maxZ = await pool.query('SELECT COALESCE(MAX(z_index), 0) as max FROM whiteboard_elements WHERE board_id = $1', [id]);
    const result = await pool.query(
        `INSERT INTO whiteboard_elements
         (board_id, type, x, y, width, height, image_url, image_filename, z_index)
         VALUES ($1, 'image', 100, 100, 300, 200, $2, $3, $4)
         RETURNING *`,
        [id, imageUrl, req.file.originalname, maxZ.rows[0].max + 1]
    );

    res.json(result.rows[0]);
});

// Error handler for multer and validation errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Fichier trop volumineux (max 10MB)' });
        }
        return res.status(400).json({ error: err.message });
    }
    if (err.message === 'Type de fichier non autorise') {
        return res.status(400).json({ error: err.message });
    }
    console.error('Server error:', err);
    res.status(500).json({ error: 'Erreur serveur' });
});

// Démarrer
initDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
});
