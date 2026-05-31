import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { auditLogs } from "@db/schema";
import { desc, eq, gte, and } from "drizzle-orm";

export const auditRouter = createRouter({
  list: publicQuery
    .input(z.object({
      limit: z.number().default(100),
      action: z.string().optional(),
      startDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.action) conditions.push(eq(auditLogs.action, input.action));
      if (input?.startDate) conditions.push(gte(auditLogs.createdAt, new Date(input.startDate)));
      const query = db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(input?.limit ?? 100);
      if (conditions.length > 0) return query.where(and(...conditions));
      return query;
    }),

  append: publicQuery
    .input(z.object({
      userId: z.number().optional(),
      userName: z.string(),
      action: z.string(),
      target: z.string().optional(),
      details: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.insert(auditLogs).values({
        userId: input.userId,
        userName: input.userName,
        action: input.action,
        target: input.target ?? null,
        details: input.details ?? null,
      });
      return { success: true };
    }),
});
