import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, boards, lists, cards, tags, comments, boardMembers } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Board operations
export async function getUserBoards(userId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(boards).where(eq(boards.userId, userId)).orderBy(desc(boards.createdAt));
}

export async function getBoardById(boardId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(boards).where(eq(boards.id, boardId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createBoard(userId: number, title: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(boards).values({
    userId,
    title,
    description,
  });

  return result;
}

export async function updateBoard(boardId: number, title: string, description?: string, color?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(boards).set({
    title,
    description,
    color,
    updatedAt: new Date(),
  }).where(eq(boards.id, boardId));
}

export async function deleteBoard(boardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(boards).where(eq(boards.id, boardId));
}

// List operations
export async function getBoardLists(boardId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(lists).where(eq(lists.boardId, boardId)).orderBy(lists.position);
}

export async function createList(boardId: number, title: string, position: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(lists).values({
    boardId,
    title,
    position,
  });
}

export async function updateList(listId: number, title: string, position?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    title,
    updatedAt: new Date(),
  };

  if (position !== undefined) {
    updateData.position = position;
  }

  return db.update(lists).set(updateData).where(eq(lists.id, listId));
}

export async function deleteList(listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(lists).where(eq(lists.id, listId));
}

// Card operations
export async function getListCards(listId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(cards).where(eq(cards.listId, listId)).orderBy(cards.position);
}

export async function getCardById(cardId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(cards).where(eq(cards.id, cardId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function createCard(boardId: number, listId: number, title: string, description?: string, dueDate?: Date, priority?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the max position for this list
  const maxPositionResult = await db.select({ maxPos: cards.position }).from(cards).where(eq(cards.listId, listId));
  const maxPosition = maxPositionResult.length > 0 ? (maxPositionResult[0]?.maxPos || 0) + 1 : 0;

  return db.insert(cards).values({
    boardId,
    listId,
    title,
    description,
    dueDate,
    priority: (priority as any) || "medium",
    position: maxPosition,
  });
}

export async function updateCard(cardId: number, title?: string, description?: string, dueDate?: Date | null, priority?: string, listId?: number, position?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (title !== undefined) updateData.title = title;
  if (description !== undefined) updateData.description = description;
  if (dueDate !== undefined) updateData.dueDate = dueDate;
  if (priority !== undefined) updateData.priority = priority;
  if (listId !== undefined) updateData.listId = listId;
  if (position !== undefined) updateData.position = position;

  return db.update(cards).set(updateData).where(eq(cards.id, cardId));
}

export async function deleteCard(cardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(cards).where(eq(cards.id, cardId));
}

export async function moveCard(cardId: number, listId: number, position: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(cards).set({
    listId,
    position,
    updatedAt: new Date(),
  }).where(eq(cards.id, cardId));
}

// Tag operations
export async function getCardTags(cardId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(tags).where(eq(tags.cardId, cardId));
}

export async function createTag(cardId: number, name: string, color: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(tags).values({
    cardId,
    name,
    color,
  });
}

export async function deleteTag(tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(tags).where(eq(tags.id, tagId));
}

// Comment operations
export async function getCardComments(cardId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(comments).where(eq(comments.cardId, cardId)).orderBy(desc(comments.createdAt));
}

export async function createComment(cardId: number, userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(comments).values({
    cardId,
    userId,
    content,
  });
}

export async function updateComment(commentId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(comments).set({
    content,
    updatedAt: new Date(),
  }).where(eq(comments.id, commentId));
}

export async function deleteComment(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(comments).where(eq(comments.id, commentId));
}

// Board Members operations
export async function getBoardMembers(boardId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(boardMembers).where(eq(boardMembers.boardId, boardId));
}

export async function addBoardMember(boardId: number, userId: number, role: string = "editor") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(boardMembers).values({
    boardId,
    userId,
    role: (role as any) || "editor",
  });
}

export async function removeBoardMember(boardId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(boardMembers).where(and(eq(boardMembers.boardId, boardId), eq(boardMembers.userId, userId)));
}
