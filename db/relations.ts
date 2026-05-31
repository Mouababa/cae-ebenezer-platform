import { relations } from "drizzle-orm";
import { users, residents, machines, bookings, auditLogs } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const residentsRelations = relations(residents, ({ many }) => ({
  bookings: many(bookings),
}));

export const machinesRelations = relations(machines, ({ many }) => ({
  bookings: many(bookings),
}));

export const bookingsRelations = relations(bookings, ({ one }) => ({
  resident: one(residents, {
    fields: [bookings.residentId],
    references: [residents.id],
  }),
  machine: one(machines, {
    fields: [bookings.machineId],
    references: [machines.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));
