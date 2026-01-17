import { db } from '../../db/index.js';
import { tasks, tickets, projects } from '../../db/schema/index.js';
import { eq, sql, asc } from 'drizzle-orm';

export class TransformationsService {
  // Task → Ticket
  async taskToTicket(taskId: number) {
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId));
    const task = taskResult[0];
    if (!task) return null;

    // Get parent ticket's project
    const parentTicket = await db.select().from(tickets).where(eq(tickets.id, task.ticketId!));
    const projectId = parentTicket[0]?.projectId || 1;

    // Create new ticket
    const newTicketResult = await db
      .insert(tickets)
      .values({
        title: task.text,
        status: task.done ? 'done' : 'todo',
        priority: 'plan',
        projectId,
        searchVector: sql`to_tsvector('french', ${task.text})`,
      })
      .returning();
    const newTicket = newTicketResult[0];

    // Convert subtasks to tasks
    const subtasks = await db.select().from(tasks).where(eq(tasks.parentId, taskId));
    for (const subtask of subtasks) {
      await db.insert(tasks).values({
        text: subtask.text,
        done: subtask.done,
        ticketId: newTicket.id,
        position: subtask.position,
      });
    }

    // Delete original task
    await db.delete(tasks).where(eq(tasks.id, taskId));

    return newTicket;
  }

  // Ticket → Task
  async ticketToTask(ticketId: number, targetTicketId: number) {
    const ticketResult = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    const ticket = ticketResult[0];
    if (!ticket) return null;

    const targetResult = await db.select().from(tickets).where(eq(tickets.id, targetTicketId));
    if (targetResult.length === 0) return null;

    // Get max position
    const maxPosResult = await db
      .select({ maxPos: sql<number>`coalesce(max(position), 0)::int` })
      .from(tasks)
      .where(eq(tasks.ticketId, targetTicketId));
    const maxPos = maxPosResult[0]?.maxPos || 0;

    // Create task
    const newTaskResult = await db
      .insert(tasks)
      .values({
        text: ticket.title,
        done: ticket.status === 'done',
        ticketId: targetTicketId,
        position: maxPos + 1,
      })
      .returning();
    const newTask = newTaskResult[0];

    // Convert ticket's tasks to subtasks
    const ticketTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId))
      .orderBy(asc(tasks.position));

    for (const t of ticketTasks) {
      await db.insert(tasks).values({
        text: t.text,
        done: t.done,
        ticketId: targetTicketId,
        parentId: newTask.id,
        position: t.position,
      });
    }

    // Delete original ticket
    await db.delete(tickets).where(eq(tickets.id, ticketId));

    return newTask;
  }

  // Ticket → Project
  async ticketToProject(ticketId: number) {
    const ticketResult = await db.select().from(tickets).where(eq(tickets.id, ticketId));
    const ticket = ticketResult[0];
    if (!ticket) return null;

    // Create project
    const newProjectResult = await db
      .insert(projects)
      .values({
        name: ticket.title,
        description: ticket.description || '',
        color: '#6c5ce7',
        icon: 'fa-folder',
      })
      .returning();
    const newProject = newProjectResult[0];

    // Convert tasks to tickets
    const ticketTasks = await db
      .select()
      .from(tasks)
      .where(eq(tasks.ticketId, ticketId))
      .orderBy(asc(tasks.position));

    for (const task of ticketTasks) {
      if (!task.parentId) {
        const newTicketResult = await db
          .insert(tickets)
          .values({
            title: task.text,
            status: task.done ? 'done' : 'todo',
            priority: 'plan',
            projectId: newProject.id,
          })
          .returning();

        // Convert subtasks
        const subtasks = await db.select().from(tasks).where(eq(tasks.parentId, task.id));
        for (const st of subtasks) {
          await db.insert(tasks).values({
            text: st.text,
            done: st.done,
            ticketId: newTicketResult[0].id,
            position: st.position,
          });
        }
      }
    }

    // Delete original ticket
    await db.delete(tickets).where(eq(tickets.id, ticketId));

    return newProject;
  }

  // Project → Ticket
  async projectToTicket(projectId: number) {
    if (projectId === 1) {
      throw new Error('Cannot convert Inbox');
    }

    const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
    const project = projectResult[0];
    if (!project) return null;

    // Create ticket
    const newTicketResult = await db
      .insert(tickets)
      .values({
        title: project.name,
        description: project.description || '',
        status: 'todo',
        priority: 'plan',
        projectId: 1,
        searchVector: sql`to_tsvector('french', ${project.name})`,
      })
      .returning();
    const newTicket = newTicketResult[0];

    // Convert project tickets to tasks
    const projectTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.projectId, projectId))
      .orderBy(asc(tickets.position), asc(tickets.id));

    let position = 1;
    for (const t of projectTickets) {
      const taskResult = await db
        .insert(tasks)
        .values({
          text: t.title,
          done: t.status === 'done',
          ticketId: newTicket.id,
          position: position++,
        })
        .returning();

      // Convert ticket's tasks to subtasks
      const ticketTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.ticketId, t.id))
        .orderBy(asc(tasks.position));

      let subPos = 1;
      for (const task of ticketTasks) {
        if (!task.parentId) {
          await db.insert(tasks).values({
            text: task.text,
            done: task.done,
            ticketId: newTicket.id,
            parentId: taskResult[0].id,
            position: subPos++,
          });
        }
      }
    }

    // Delete project tickets and project
    await db.delete(tickets).where(eq(tickets.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));

    return newTicket;
  }

  // Task → Project
  async taskToProject(taskId: number) {
    const taskResult = await db.select().from(tasks).where(eq(tasks.id, taskId));
    const task = taskResult[0];
    if (!task) return null;

    // Create project
    const newProjectResult = await db
      .insert(projects)
      .values({
        name: task.text,
        description: '',
        color: '#6c5ce7',
        icon: 'fa-folder',
      })
      .returning();
    const newProject = newProjectResult[0];

    // Convert subtasks to tickets
    const subtasks = await db.select().from(tasks).where(eq(tasks.parentId, taskId));
    for (const sub of subtasks) {
      await db.insert(tickets).values({
        title: sub.text,
        status: sub.done ? 'done' : 'todo',
        priority: 'plan',
        projectId: newProject.id,
      });
    }

    // Delete original task
    await db.delete(tasks).where(eq(tasks.id, taskId));

    return newProject;
  }

  // Project → Task
  async projectToTask(projectId: number, targetTicketId: number) {
    if (projectId === 1) {
      throw new Error('Cannot convert Inbox');
    }

    const projectResult = await db.select().from(projects).where(eq(projects.id, projectId));
    const project = projectResult[0];
    if (!project) return null;

    const targetResult = await db.select().from(tickets).where(eq(tickets.id, targetTicketId));
    if (targetResult.length === 0) return null;

    // Create task
    const taskResult = await db
      .insert(tasks)
      .values({
        text: project.name,
        done: false,
        ticketId: targetTicketId,
      })
      .returning();
    const newTask = taskResult[0];

    // Convert project tickets to subtasks
    const projectTickets = await db
      .select()
      .from(tickets)
      .where(eq(tickets.projectId, projectId))
      .orderBy(asc(tickets.position), asc(tickets.id));

    let position = 1;
    for (const t of projectTickets) {
      await db.insert(tasks).values({
        text: t.title,
        done: t.status === 'done',
        ticketId: targetTicketId,
        parentId: newTask.id,
        position: position++,
      });
    }

    // Delete project
    await db.delete(tickets).where(eq(tickets.projectId, projectId));
    await db.delete(projects).where(eq(projects.id, projectId));

    return newTask;
  }
}
