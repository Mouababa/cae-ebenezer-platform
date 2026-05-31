import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { machines } from "@db/schema";
import { eq } from "drizzle-orm";

export const machineRouter = createRouter({
  // List all machines
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(machines);
  }),

  // Get machine by ID
  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(machines).where(eq(machines.id, input.id));
      return result[0] ?? null;
    }),

  // Create a new machine
  create: publicQuery
    .input(
      z.object({
        name: z.string().min(1),
        type: z.enum(["WASHING_MACHINE", "DRYER"]),
        status: z.enum(["ACTIVE", "OUT_OF_SERVICE", "MAINTENANCE"]).default("ACTIVE"),
        statusNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(machines).values({
        name: input.name,
        type: input.type,
        status: input.status,
        statusNote: input.statusNote ?? null,
      });
      return { success: true, id: Number(result[0].insertId) };
    }),

  // Update machine status
  updateStatus: publicQuery
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["ACTIVE", "OUT_OF_SERVICE", "MAINTENANCE"]),
        statusNote: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(machines)
        .set({
          status: input.status,
          statusNote: input.statusNote ?? null,
        })
        .where(eq(machines.id, input.id));
      return { success: true };
    }),

  // Delete a machine
  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(machines).where(eq(machines.id, input.id));
      return { success: true };
    }),
});
