import { db } from '../../db/index.js';
import { tickets, tasks, projects } from '../../db/schema/index.js';
import { eq, sql } from 'drizzle-orm';

export class ImportExportService {
  async exportData(format: 'json' | 'csv', projectId?: number) {
    let ticketQuery = db.select().from(tickets);
    const queryParams: any[] = [];

    if (projectId) {
      ticketQuery = ticketQuery.where(eq(tickets.projectId, projectId)) as any;
    }

    const ticketsData = await ticketQuery.orderBy(tickets.id);
    const tasksData = await db.select().from(tasks).orderBy(tasks.ticketId, tasks.id);

    const data = ticketsData.map(t => ({
      ...t,
      tasks: tasksData.filter(task => task.ticketId === t.id),
    }));

    // Get project name for filename
    let filename = 'export';
    if (projectId) {
      const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
      if (projectResult[0]) {
        filename = projectResult[0].name.replace(/[^a-zA-Z0-9]/g, '_');
      }
    }

    if (format === 'csv') {
      let csv = 'id,title,status,priority,description,due_date,archived,tasks_done,tasks_total\n';
      data.forEach(t => {
        const tasksDone = t.tasks.filter(tk => tk.done).length;
        const desc = (t.description || '').replace(/"/g, '""');
        csv += `${t.id},"${t.title}",${t.status},${t.priority},"${desc}",${t.dueDate || ''},${t.archived},${tasksDone},${t.tasks.length}\n`;
      });
      return { data: csv, filename: `${filename}.csv`, contentType: 'text/csv' };
    }

    return { data: JSON.stringify(data, null, 2), filename: `${filename}.json`, contentType: 'application/json' };
  }

  async importData(data: any[]) {
    let imported = 0;

    for (const item of data) {
      // Create ticket
      const ticketResult = await db
        .insert(tickets)
        .values({
          title: item.title,
          status: item.status || 'todo',
          priority: item.priority || 'do',
          description: item.description || '',
          dueDate: item.due_date || item.dueDate,
          archived: item.archived || false,
          projectId: item.project_id || item.projectId || 1,
          searchVector: sql`to_tsvector('french', ${item.title})`,
        })
        .returning();

      const newTicket = ticketResult[0];
      imported++;

      // Create tasks if any
      if (item.tasks && Array.isArray(item.tasks)) {
        for (const task of item.tasks) {
          await db.insert(tasks).values({
            text: task.text,
            done: task.done || false,
            ticketId: newTicket.id,
            position: task.position || 0,
          });
        }
      }
    }

    return { imported };
  }
}
