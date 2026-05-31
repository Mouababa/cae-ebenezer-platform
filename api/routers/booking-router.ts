import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { bookings, residents, machines, auditLogs } from "@db/schema";
import { eq, and, gte, lte, ne } from "drizzle-orm";
import { googleSheets } from "../services/googleSheets";
import { googleCalendar } from "../services/googleCalendar";

export const bookingRouter = createRouter({
  // ── List bookings ─────────────────────────────────────────────
  list: publicQuery
    .input(z.object({
      residentId: z.number().optional(),
      date: z.string().optional(),
      status: z.string().optional(),
      machineId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.residentId) conditions.push(eq(bookings.residentId, input.residentId));
      if (input?.date) conditions.push(eq(bookings.date, input.date));
      if (input?.status) conditions.push(eq(bookings.status, input.status as any));
      if (input?.machineId) conditions.push(eq(bookings.machineId, input.machineId));
      const query = db.select().from(bookings);
      if (conditions.length > 0) return query.where(and(...conditions));
      return query;
    }),

  // ── List with resident+machine details joined ─────────────────
  listWithDetails: publicQuery
    .input(z.object({
      date: z.string().optional(),
      residentId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const allBookings = input?.date
        ? await db.select().from(bookings).where(eq(bookings.date, input.date))
        : input?.residentId
        ? await db.select().from(bookings).where(eq(bookings.residentId, input.residentId))
        : await db.select().from(bookings);

      const allResidents = await db.select().from(residents);
      const allMachines = await db.select().from(machines);
      const resMap = Object.fromEntries(allResidents.map(r => [r.id, r]));
      const machMap = Object.fromEntries(allMachines.map(m => [m.id, m]));

      return allBookings.map(b => ({
        ...b,
        residentName: resMap[b.residentId]?.name ?? "—",
        residentRoom: resMap[b.residentId]?.roomNumber ?? "—",
        machineName: machMap[b.machineId]?.name ?? "—",
        machineType: machMap[b.machineId]?.type ?? "WASHING_MACHINE",
      }));
    }),

  // ── Create booking ────────────────────────────────────────────
  create: publicQuery
    .input(z.object({
      residentId: z.number(),
      machineId: z.number(),
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Rule: no two bookings at same time for same resident
      const doubleBooking = await db.select().from(bookings).where(
        and(
          eq(bookings.residentId, input.residentId),
          eq(bookings.date, input.date),
          eq(bookings.startTime, input.startTime),
          ne(bookings.status, "CANCELLED_BY_RESIDENT"),
          ne(bookings.status, "CANCELLED_BY_ADMIN"),
        )
      );
      if (doubleBooking.length > 0) throw new Error("DOUBLE_BOOKING");

      // Rule: slot must not be taken
      const slotTaken = await db.select().from(bookings).where(
        and(
          eq(bookings.machineId, input.machineId),
          eq(bookings.date, input.date),
          eq(bookings.startTime, input.startTime),
          ne(bookings.status, "CANCELLED_BY_RESIDENT"),
          ne(bookings.status, "CANCELLED_BY_ADMIN"),
        )
      );
      if (slotTaken.length > 0) throw new Error("SLOT_TAKEN");

      // Rule: machine must be ACTIVE
      const machineRows = await db.select().from(machines).where(eq(machines.id, input.machineId));
      const machine = machineRows[0];
      if (!machine || machine.status !== "ACTIVE") throw new Error("MACHINE_OUT_OF_SERVICE");

      const result = await db.insert(bookings).values({
        residentId: input.residentId,
        machineId: input.machineId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
        status: "PENDING_CONFIRMATION",
      });

      const bookingId = Number(result[0].insertId);

      // Sync to Google Sheets async (non-blocking)
      const residentRows = await db.select().from(residents).where(eq(residents.id, input.residentId));
      const resident = residentRows[0];
      if (resident && machine) {
        googleSheets.appendBooking({
          date: input.date, startTime: input.startTime, endTime: input.endTime,
          machineName: machine.name, machineType: machine.type,
          residentName: resident.name, roomNumber: resident.roomNumber,
          status: "PENDING_CONFIRMATION",
        }).catch(e => console.error("Sheets sync error:", e));
      }

      return { success: true, id: bookingId };
    }),

  // ── Update status (confirm / cancel / complete / no-show) ─────
  updateStatus: publicQuery
    .input(z.object({
      id: z.number(),
      status: z.enum(["PENDING_CONFIRMATION","CONFIRMED","CANCELLED_BY_RESIDENT","CANCELLED_BY_ADMIN","COMPLETED","NO_SHOW"]),
      amendedBy: z.number().optional(),
      amendReason: z.string().optional(),
      adminName: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();

      // Get existing booking
      const existing = await db.select().from(bookings).where(eq(bookings.id, input.id));
      const booking = existing[0];
      if (!booking) throw new Error("BOOKING_NOT_FOUND");
      const oldStatus = booking.status;

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.amendedBy) updateData.amendedBy = input.amendedBy;
      if (input.amendReason) updateData.amendReason = input.amendReason;

      await db.update(bookings).set(updateData as any).where(eq(bookings.id, input.id));

      // If confirming: create Google Calendar event
      if (input.status === "CONFIRMED" && !booking.calEventId) {
        const machineRows = await db.select().from(machines).where(eq(machines.id, booking.machineId));
        const residentRows = await db.select().from(residents).where(eq(residents.id, booking.residentId));
        const machine = machineRows[0];
        const resident = residentRows[0];
        if (machine && resident) {
          const calEventId = await googleCalendar.createCalendarEvent({
            bookingId: booking.id,
            machineName: machine.name, machineType: machine.type,
            residentName: resident.name, roomNumber: resident.roomNumber,
            date: booking.date, startTime: booking.startTime, endTime: booking.endTime,
          });
          if (calEventId) {
            await db.update(bookings).set({ calEventId }).where(eq(bookings.id, input.id));
          }
        }
      }

      // If cancelling: delete Google Calendar event
      if ((input.status === "CANCELLED_BY_ADMIN" || input.status === "CANCELLED_BY_RESIDENT") && booking.calEventId) {
        googleCalendar.deleteCalendarEvent(booking.calEventId).catch(console.error);
      }

      // Sync amendment to Sheets
      if (input.amendReason) {
        googleSheets.appendAmendment({
          adminName: input.adminName ?? "Admin",
          reason: input.amendReason,
          bookingId: input.id,
          oldStatus,
          newStatus: input.status,
        }).catch(console.error);
      }

      // Audit log
      await db.insert(auditLogs).values({
        userId: input.amendedBy,
        userName: input.adminName ?? "System",
        action: `BOOKING_${input.status}`,
        target: `Booking #${input.id}`,
        details: input.amendReason ?? null,
      });

      return { success: true };
    }),

  // ── Get bookings for date range ───────────────────────────────
  byDateRange: publicQuery
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(bookings).where(
        and(gte(bookings.date, input.startDate), lte(bookings.date, input.endDate))
      );
    }),

  // ── Get slot availability for a date ─────────────────────────
  availability: publicQuery
    .input(z.object({ date: z.string(), machineType: z.enum(["WASHING_MACHINE", "DRYER"]).optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const allMachines = await db.select().from(machines);
      const dayBookings = await db.select().from(bookings).where(
        and(
          eq(bookings.date, input.date),
          ne(bookings.status, "CANCELLED_BY_RESIDENT"),
          ne(bookings.status, "CANCELLED_BY_ADMIN"),
        )
      );

      const filtered = input.machineType
        ? allMachines.filter(m => m.type === input.machineType)
        : allMachines;

      // Slot definitions
      const WASHING_SLOTS = [
        { start: "08:00", end: "10:00" }, { start: "10:00", end: "12:00" },
        { start: "12:00", end: "14:00" }, { start: "14:00", end: "16:00" },
        { start: "16:00", end: "18:00" }, { start: "18:00", end: "20:00" },
        { start: "20:00", end: "22:00" },
      ];
      const DRYER_SLOTS = [
        { start: "05:00", end: "11:00" }, { start: "09:00", end: "11:00" },
        { start: "14:00", end: "16:00" }, { start: "20:00", end: "22:00" },
      ];

      return filtered.map(machine => {
        const slots = machine.type === "DRYER" ? DRYER_SLOTS : WASHING_SLOTS;
        return {
          machine,
          slots: slots.map(slot => {
            const booking = dayBookings.find(
              b => b.machineId === machine.id && b.startTime === slot.start
            );
            return {
              ...slot,
              status: machine.status !== "ACTIVE" ? "OUT_OF_SERVICE"
                : booking ? booking.status === "PENDING_CONFIRMATION" ? "PENDING" : "OCCUPIED"
                : "AVAILABLE",
              bookingId: booking?.id ?? null,
              residentId: booking?.residentId ?? null,
            };
          }),
        };
      });
    }),
});
