import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { bookings, residents, machines } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { googleSheets } from "../services/googleSheets";
import { env } from "../lib/env";

export const googleRouter = createRouter({
  // Check configuration status
  status: publicQuery.query(() => {
    return {
      sheetsConfigured: !!(env.googleServiceAccountEmail && env.googleSheetsId),
      calendarConfigured: !!(env.googleServiceAccountEmail && env.googleCalendarId),
      sheetsId: env.googleSheetsId ? `...${env.googleSheetsId.slice(-6)}` : null,
      calendarId: env.googleCalendarId ? `...${env.googleCalendarId.slice(-6)}` : null,
    };
  }),

  // Full re-sync of all bookings to Google Sheets
  syncAll: publicQuery.mutation(async () => {
    if (!env.googleSheetsId) {
      return { success: false, message: "Google Sheets not configured" };
    }
    const db = getDb();
    try {
      await googleSheets.ensureSheets();

      // Sync all bookings
      const allBookings = await db.select().from(bookings);
      const allResidents = await db.select().from(residents);
      const allMachines = await db.select().from(machines);

      const residentMap = Object.fromEntries(allResidents.map(r => [r.id, r]));
      const machineMap = Object.fromEntries(allMachines.map(m => [m.id, m]));

      for (const b of allBookings) {
        const resident = residentMap[b.residentId];
        const machine = machineMap[b.machineId];
        if (!resident || !machine) continue;
        await googleSheets.appendBooking({
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          machineName: machine.name,
          machineType: machine.type,
          residentName: resident.name,
          roomNumber: resident.roomNumber,
          status: b.status,
          adminNote: b.amendReason ?? undefined,
        });
      }

      // Sync all residents
      for (const r of allResidents) {
        await googleSheets.upsertResidentInSheet({
          id: r.id,
          name: r.name,
          roomNumber: r.roomNumber,
          phone: r.phone ?? null,
          status: r.status,
          preferredLanguage: r.preferredLanguage ?? "pt",
          noShowCount: r.noShowCount ?? 0,
          createdAt: r.createdAt,
        });
      }

      return { success: true, bookingsSynced: allBookings.length, residentsSynced: allResidents.length };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, message: msg };
    }
  }),

  // Ensure sheet tabs exist
  ensureSheets: publicQuery.mutation(async () => {
    try {
      await googleSheets.ensureSheets();
      return { success: true };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, message: msg };
    }
  }),
});
