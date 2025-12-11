import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Board operations
  boards: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getUserBoards(ctx.user.id);
    }),

    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.createBoard(ctx.user.id, input.title, input.description);
        return result;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const board = await db.getBoardById(input.id);
        if (!board) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Board not found" });
        }
        return board;
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        color: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateBoard(input.id, input.title, input.description, input.color);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteBoard(input.id);
      }),
  }),

  // List operations
  lists: router({
    getByBoard: protectedProcedure
      .input(z.object({ boardId: z.number() }))
      .query(async ({ input }) => {
        return db.getBoardLists(input.boardId);
      }),

    create: protectedProcedure
      .input(z.object({
        boardId: z.number(),
        title: z.string().min(1, "Title is required"),
        position: z.number().default(0),
      }))
      .mutation(async ({ input }) => {
        return db.createList(input.boardId, input.title, input.position);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1),
        position: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateList(input.id, input.title, input.position);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteList(input.id);
      }),
  }),

  // Card operations
  cards: router({
    getByList: protectedProcedure
      .input(z.object({ listId: z.number() }))
      .query(async ({ input }) => {
        return db.getListCards(input.listId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const card = await db.getCardById(input.id);
        if (!card) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Card not found" });
        }
        return card;
      }),

    create: protectedProcedure
      .input(z.object({
        boardId: z.number(),
        listId: z.number(),
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createCard(
          input.boardId,
          input.listId,
          input.title,
          input.description,
          input.dueDate,
          input.priority
        );
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        dueDate: z.date().nullable().optional(),
        priority: z.enum(["low", "medium", "high"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updateData } = input;
        return db.updateCard(id, updateData.title, updateData.description, updateData.dueDate, updateData.priority);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteCard(input.id);
      }),

    move: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        listId: z.number(),
        position: z.number(),
      }))
      .mutation(async ({ input }) => {
        return db.moveCard(input.cardId, input.listId, input.position);
      }),
  }),

  // Tag operations
  tags: router({
    getByCard: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ input }) => {
        return db.getCardTags(input.cardId);
      }),

    create: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        name: z.string().min(1),
        color: z.string().regex(/^#[0-9A-F]{6}$/i),
      }))
      .mutation(async ({ input }) => {
        return db.createTag(input.cardId, input.name, input.color);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteTag(input.id);
      }),
  }),

  // Comment operations
  comments: router({
    getByCard: protectedProcedure
      .input(z.object({ cardId: z.number() }))
      .query(async ({ input }) => {
        return db.getCardComments(input.cardId);
      }),

    create: protectedProcedure
      .input(z.object({
        cardId: z.number(),
        content: z.string().min(1, "Comment cannot be empty"),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createComment(input.cardId, ctx.user.id, input.content);
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        return db.updateComment(input.id, input.content);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteComment(input.id);
      }),
  }),
});

export type AppRouter = typeof appRouter;
