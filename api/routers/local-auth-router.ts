import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { residents, users } from "@db/schema";
import { eq, and } from "drizzle-orm";
import { hashPin, verifyPin } from "../lib/hash";
import { signToken, verifyToken, extractToken } from "../lib/localAuth";
import { TRPCError } from "@trpc/server";

export const localAuthRouter = createRouter({
  // ── Resident Registration ──────────────────────────────────────
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2),
        roomNumber: z.string().min(1),
        phone: z.string().optional(),
        pin: z.string().length(4).regex(/^\d{4}$/),
        photoUrl: z.string().optional(),
        preferredLanguage: z.enum(["pt", "es", "en", "fr", "ar", "fa"]).default("pt"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check if room already has a PENDING or APPROVED resident
      const existing = await db
        .select()
        .from(residents)
        .where(eq(residents.roomNumber, input.roomNumber));

      const active = existing.find(r => r.status === "APPROVED" || r.status === "PENDING");
      if (active) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "ROOM_ALREADY_REGISTERED",
        });
      }

      const pinHash = await hashPin(input.pin);

      const result = await db.insert(residents).values({
        name: input.name,
        roomNumber: input.roomNumber,
        phone: input.phone ?? null,
        pin: pinHash,
        photoUrl: input.photoUrl ?? null,
        status: "PENDING",
        preferredLanguage: input.preferredLanguage,
      });

      return { success: true, id: Number(result[0].insertId) };
    }),

  // ── Resident Login ─────────────────────────────────────────────
  login: publicQuery
    .input(
      z.object({
        roomNumber: z.string(),
        pin: z.string().length(4),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const result = await db
        .select()
        .from(residents)
        .where(eq(residents.roomNumber, input.roomNumber));

      const resident = result[0];

      if (!resident) {
        throw new TRPCError({ code: "NOT_FOUND", message: "RESIDENT_NOT_FOUND" });
      }

      if (resident.status === "PENDING") {
        throw new TRPCError({ code: "FORBIDDEN", message: "PENDING_APPROVAL" });
      }
      if (resident.status === "REJECTED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "REGISTRATION_REJECTED" });
      }
      if (resident.status === "SUSPENDED") {
        throw new TRPCError({ code: "FORBIDDEN", message: "ACCOUNT_SUSPENDED" });
      }

      const valid = await verifyPin(input.pin, resident.pin);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "INVALID_PIN" });
      }

      const token = await signToken({
        type: "resident",
        residentId: resident.id,
        roomNumber: resident.roomNumber,
      });

      return {
        token,
        resident: {
          id: resident.id,
          name: resident.name,
          roomNumber: resident.roomNumber,
          preferredLanguage: resident.preferredLanguage,
          status: resident.status,
        },
      };
    }),

  // ── Admin Login (by admin token stored in users table) ─────────
  adminLogin: publicQuery
    .input(z.object({ email: z.string().email(), password: z.string() }))
    .mutation(async ({ input }) => {
      const db = getDb();

      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email));

      const user = result[0];
      if (!user || !user.pinHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "INVALID_CREDENTIALS" });
      }

      const valid = await verifyPin(input.password, user.pinHash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "INVALID_CREDENTIALS" });
      }

      const token = await signToken({
        type: "admin",
        userId: user.id,
        role: user.role,
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
        },
      };
    }),

  // ── Get current resident session ───────────────────────────────
  me: publicQuery.query(async ({ ctx }) => {
    const token = extractToken(ctx.req.headers);
    if (!token) return null;

    const claim = await verifyToken(token);
    if (!claim) return null;

    const db = getDb();

    if (claim.type === "resident") {
      const result = await db
        .select()
        .from(residents)
        .where(eq(residents.id, claim.residentId));
      const resident = result[0];
      if (!resident) return null;
      return {
        type: "resident" as const,
        id: resident.id,
        name: resident.name,
        roomNumber: resident.roomNumber,
        photoUrl: resident.photoUrl,
        status: resident.status,
        preferredLanguage: resident.preferredLanguage,
        noShowCount: resident.noShowCount,
      };
    }

    if (claim.type === "admin") {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, claim.userId));
      const user = result[0];
      if (!user) return null;
      return {
        type: "admin" as const,
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        preferredLanguage: user.preferredLanguage,
      };
    }

    return null;
  }),
});
