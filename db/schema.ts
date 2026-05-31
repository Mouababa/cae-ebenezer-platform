import {
  mysqlTable,
  mysqlEnum,
  varchar,
  text,
  timestamp,
  int,
  bigint,
} from "drizzle-orm/mysql-core";

// ── Admin users (KIMI OAuth or local admin) ────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  pinHash: varchar("pinHash", { length: 255 }),      // for local admin login
  role: mysqlEnum("role", ["user", "admin", "master_admin", "ose"]).default("user").notNull(),
  preferredLanguage: varchar("preferredLanguage", { length: 5 }).default("pt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Shelter residents ──────────────────────────────────────────────────
export const residents = mysqlTable("residents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  roomNumber: varchar("roomNumber", { length: 10 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  pin: varchar("pin", { length: 255 }).notNull(),
  photoUrl: text("photoUrl"),
  status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]).default("PENDING").notNull(),
  rejectReason: text("rejectReason"),
  preferredLanguage: varchar("preferredLanguage", { length: 5 }).default("pt"),
  noShowCount: int("noShowCount").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Resident = typeof residents.$inferSelect;
export type InsertResident = typeof residents.$inferInsert;

// ── Machines ───────────────────────────────────────────────────────────
export const machines = mysqlTable("machines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull(),
  type: mysqlEnum("type", ["WASHING_MACHINE", "DRYER"]).notNull(),
  status: mysqlEnum("status", ["ACTIVE", "OUT_OF_SERVICE", "MAINTENANCE"]).default("ACTIVE").notNull(),
  statusNote: text("statusNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Machine = typeof machines.$inferSelect;
export type InsertMachine = typeof machines.$inferInsert;

// ── Bookings ───────────────────────────────────────────────────────────
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  residentId: bigint("residentId", { mode: "number", unsigned: true }).notNull(),
  machineId: bigint("machineId", { mode: "number", unsigned: true }).notNull(),
  date: varchar("date", { length: 10 }).notNull(),         // "2026-06-01"
  startTime: varchar("startTime", { length: 5 }).notNull(), // "08:00"
  endTime: varchar("endTime", { length: 5 }).notNull(),     // "10:00"
  status: mysqlEnum("status", [
    "PENDING_CONFIRMATION",
    "CONFIRMED",
    "CANCELLED_BY_RESIDENT",
    "CANCELLED_BY_ADMIN",
    "COMPLETED",
    "NO_SHOW",
  ]).default("PENDING_CONFIRMATION").notNull(),
  amendedBy: bigint("amendedBy", { mode: "number", unsigned: true }),
  amendReason: text("amendReason"),
  calEventId: varchar("calEventId", { length: 255 }),       // Google Calendar event ID
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

// ── Audit logs ─────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: bigint("userId", { mode: "number", unsigned: true }),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 100 }).notNull(),
  target: varchar("target", { length: 255 }),
  details: text("details"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;

// ── Settings ───────────────────────────────────────────────────────────
export const settings = mysqlTable("settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export type Setting = typeof settings.$inferSelect;
