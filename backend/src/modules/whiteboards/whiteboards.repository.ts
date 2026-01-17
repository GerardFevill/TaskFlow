import { eq, asc } from 'drizzle-orm';
import { db } from '../../db/index.js';
import { whiteboards, whiteboardElements, type Whiteboard, type NewWhiteboard, type WhiteboardElement, type NewWhiteboardElement } from '../../db/schema/index.js';

export class WhiteboardsRepository {
  async findByProjectId(projectId: number): Promise<Whiteboard | undefined> {
    const result = await db.select().from(whiteboards).where(eq(whiteboards.projectId, projectId));
    return result[0];
  }

  async findById(id: number): Promise<Whiteboard | undefined> {
    const result = await db.select().from(whiteboards).where(eq(whiteboards.id, id));
    return result[0];
  }

  async create(data: NewWhiteboard): Promise<Whiteboard> {
    const result = await db.insert(whiteboards).values(data).returning();
    return result[0];
  }

  async update(id: number, data: Partial<NewWhiteboard>): Promise<Whiteboard | undefined> {
    const result = await db
      .update(whiteboards)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whiteboards.id, id))
      .returning();
    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(whiteboards).where(eq(whiteboards.id, id)).returning();
    return result.length > 0;
  }

  // Elements
  async getElements(boardId: number): Promise<WhiteboardElement[]> {
    return db
      .select()
      .from(whiteboardElements)
      .where(eq(whiteboardElements.boardId, boardId))
      .orderBy(asc(whiteboardElements.zIndex));
  }

  async getElementById(id: number): Promise<WhiteboardElement | undefined> {
    const result = await db.select().from(whiteboardElements).where(eq(whiteboardElements.id, id));
    return result[0];
  }

  async createElement(data: NewWhiteboardElement): Promise<WhiteboardElement> {
    const result = await db.insert(whiteboardElements).values(data).returning();
    return result[0];
  }

  async updateElement(id: number, data: Partial<NewWhiteboardElement>): Promise<WhiteboardElement | undefined> {
    const result = await db
      .update(whiteboardElements)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(whiteboardElements.id, id))
      .returning();
    return result[0];
  }

  async deleteElement(id: number): Promise<boolean> {
    const result = await db.delete(whiteboardElements).where(eq(whiteboardElements.id, id)).returning();
    return result.length > 0;
  }

  async bulkCreateElements(elements: NewWhiteboardElement[]): Promise<WhiteboardElement[]> {
    if (elements.length === 0) return [];
    const result = await db.insert(whiteboardElements).values(elements).returning();
    return result;
  }

  async bulkDeleteElements(ids: number[]): Promise<number> {
    let deleted = 0;
    for (const id of ids) {
      const result = await db.delete(whiteboardElements).where(eq(whiteboardElements.id, id)).returning();
      if (result.length > 0) deleted++;
    }
    return deleted;
  }

  async reorderElements(boardId: number, elementIds: number[]): Promise<void> {
    for (let i = 0; i < elementIds.length; i++) {
      await db
        .update(whiteboardElements)
        .set({ zIndex: i })
        .where(eq(whiteboardElements.id, elementIds[i]));
    }
  }

  async duplicateElement(id: number): Promise<WhiteboardElement | null> {
    const original = await this.getElementById(id);
    if (!original) return null;

    const newElement: NewWhiteboardElement = {
      boardId: original.boardId,
      type: original.type,
      x: String(parseFloat(original.x || '0') + 20),
      y: String(parseFloat(original.y || '0') + 20),
      width: original.width,
      height: original.height,
      rotation: original.rotation,
      fillColor: original.fillColor,
      strokeColor: original.strokeColor,
      strokeWidth: original.strokeWidth,
      opacity: original.opacity,
      textContent: original.textContent,
      fontSize: original.fontSize,
      fontFamily: original.fontFamily,
      textAlign: original.textAlign,
      lineStyle: original.lineStyle,
      startArrow: original.startArrow,
      endArrow: original.endArrow,
      pathData: original.pathData,
      imageUrl: original.imageUrl,
      imageFilename: original.imageFilename,
      zIndex: (original.zIndex || 0) + 1,
      locked: false,
    };

    return this.createElement(newElement);
  }
}
