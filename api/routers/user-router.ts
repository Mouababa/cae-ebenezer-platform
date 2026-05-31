import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { residents, users } from "@db/schema";
import { eq } from "drizzle-orm";

export const userRouter = createRouter({
  // Get all residents (for admin)
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(residents);
  }),

  // Get a single resident
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(residents).where(eq(residents.id, input.id));
      return result[0] ?? null;
    }),

  // Update resident status (approve/reject/suspend)
  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]),
        rejectReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(residents)
        .set({
          status: input.status,
          rejectReason: input.rejectReason ?? null,
        })
        .where(eq(residents.id, input.id));
      return { success: true };
    }),

  // Update user language preference (auth user)
  updateLanguage: publicQuery
    .input(z.object({ language: z.enum(["pt", "es", "en", "fr", "ar", "fa"]) }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      if (ctx.user) {
        await db
          .update(users)
          .set({ preferredLanguage: input.language })
          .where(eq(users.id, ctx.user.id));
      }
      return { success: true, language: input.language };
    }),

  // Update resident language preference
  updateResidentLanguage: publicQuery
    .input(
      z.object({
        residentId: z.number(),
        language: z.enum(["pt", "es", "en", "fr", "ar", "fa"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(residents)
        .set({ preferredLanguage: input.language })
        .where(eq(residents.id, input.residentId));
      return { success: true };
    }),
});
