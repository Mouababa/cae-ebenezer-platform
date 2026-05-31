import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { settings } from "@db/schema";
import { eq } from "drizzle-orm";

const DEFAULT_SETTINGS: Record<string, string> = {
  maxBookingsPerDay: "2",
  bookingWindowDays: "7",
  cancellationWindowHours: "1",
  defaultLanguage: "pt",
  googleSheetsEnabled: "false",
  googleCalendarEnabled: "false",
};

export const settingsRouter = createRouter({
  getAll: publicQuery.query(async () => {
    const db = getDb();
    const rows = await db.select().from(settings);
    const result: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      if (row.key && row.value) result[row.key] = row.value;
    }
    return result;
  }),

  set: publicQuery
    .input(z.object({ key: z.string(), value: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(settings).where(eq(settings.key, input.key));
      if (existing.length > 0) {
        await db.update(settings).set({ value: input.value }).where(eq(settings.key, input.key));
      } else {
        await db.insert(settings).values({ key: input.key, value: input.value });
      }
      return { success: true };
    }),

  setBulk: publicQuery
    .input(z.record(z.string()))
    .mutation(async ({ input }) => {
      const db = getDb();
      for (const [key, value] of Object.entries(input)) {
        const existing = await db.select().from(settings).where(eq(settings.key, key));
        if (existing.length > 0) {
          await db.update(settings).set({ value }).where(eq(settings.key, key));
        } else {
          await db.insert(settings).values({ key, value });
        }
      }
      return { success: true };
    }),
});
