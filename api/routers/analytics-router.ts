import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { bookings, residents, machines } from "@db/schema";
import { eq, sql, gte, lte, and } from "drizzle-orm";

export const analyticsRouter = createRouter({
  // Dashboard summary stats
  summary: publicQuery.query(async () => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [todayBookings] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(eq(bookings.date, today));

    const [confirmedToday] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(eq(bookings.date, today), eq(bookings.status, "CONFIRMED")));

    const [pendingResidents] = await db
      .select({ count: sql<number>`count(*)` })
      .from(residents)
      .where(eq(residents.status, "PENDING"));

    const [outOfServiceMachines] = await db
      .select({ count: sql<number>`count(*)` })
      .from(machines)
      .where(eq(machines.status, "OUT_OF_SERVICE"));

    const [noShowsWeek] = await db
      .select({ count: sql<number>`count(*)` })
      .from(bookings)
      .where(and(gte(bookings.date, sevenDaysAgo), eq(bookings.status, "NO_SHOW")));

    const [totalResidents] = await db
      .select({ count: sql<number>`count(*)` })
      .from(residents)
      .where(eq(residents.status, "APPROVED"));

    return {
      todayBookings: todayBookings?.count ?? 0,
      confirmedToday: confirmedToday?.count ?? 0,
      pendingApprovals: pendingResidents?.count ?? 0,
      machinesOutOfService: outOfServiceMachines?.count ?? 0,
      noShowsWeek: noShowsWeek?.count ?? 0,
      totalResidents: totalResidents?.count ?? 0,
    };
  }),

  // Booking trend over time
  bookingTrend: publicQuery
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select({
          date: bookings.date,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .where(
          and(
            gte(bookings.date, input.startDate),
            lte(bookings.date, input.endDate)
          )
        )
        .groupBy(bookings.date)
        .orderBy(bookings.date);
    }),

  // Machine utilization
  utilization: publicQuery.query(async () => {
    const db = getDb();
    const allMachines = await db.select().from(machines);
    const utilization = [];

    for (const machine of allMachines) {
      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(bookings)
        .where(eq(bookings.machineId, machine.id));

      utilization.push({
        machineId: machine.id,
        machineName: machine.name,
        type: machine.type,
        totalBookings: result?.count ?? 0,
      });
    }

    return utilization;
  }),

  // Top residents by bookings
  topResidents: publicQuery
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select({
          residentId: bookings.residentId,
          count: sql<number>`count(*)`,
        })
        .from(bookings)
        .groupBy(bookings.residentId)
        .orderBy(sql`count(*) DESC`)
        .limit(input.limit);
    }),
});
