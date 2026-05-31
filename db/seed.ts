import { getDb } from "../api/queries/connection";
import { users, machines, residents, settings } from "./schema";
import { hashPin } from "../api/lib/hash";

async function seed() {
  const db = getDb();
  console.log("🌱 Seeding CAE Ebenezer database...\n");

  // ── Admin users ──────────────────────────────────────────────
  console.log("Creating admin users...");
  const adminPin = await hashPin("admin123");

  await db.insert(users).values([
    {
      unionId: "master-admin-1",
      name: "Administrador Master 1",
      email: "admin1@cae-ebenezer.org",
      pinHash: adminPin,
      role: "master_admin",
      preferredLanguage: "pt",
    },
    {
      unionId: "master-admin-2",
      name: "Administrador Master 2",
      email: "admin2@cae-ebenezer.org",
      pinHash: adminPin,
      role: "master_admin",
      preferredLanguage: "pt",
    },
    {
      unionId: "master-admin-3",
      name: "Administrador Master 3",
      email: "admin3@cae-ebenezer.org",
      pinHash: adminPin,
      role: "master_admin",
      preferredLanguage: "pt",
    },
    {
      unionId: "ose-admin-1",
      name: "OSE Gilberto",
      email: "ose1@cae-ebenezer.org",
      pinHash: adminPin,
      role: "ose",
      preferredLanguage: "pt",
    },
    {
      unionId: "ose-admin-2",
      name: "OSE Andressa",
      email: "ose2@cae-ebenezer.org",
      pinHash: adminPin,
      role: "ose",
      preferredLanguage: "pt",
    },
  ]).onDuplicateKeyUpdate({ set: { name: users.name } });

  // ── Machines (matching physical setup) ───────────────────────
  console.log("Creating machines...");
  await db.insert(machines).values([
    { name: "MÁQUINA 01", type: "WASHING_MACHINE", status: "ACTIVE" },
    { name: "MÁQUINA 02", type: "WASHING_MACHINE", status: "ACTIVE" },
    { name: "MÁQUINA 03", type: "WASHING_MACHINE", status: "ACTIVE" },
    { name: "SECADORA 01", type: "DRYER", status: "ACTIVE" },
    { name: "SECADORA 02", type: "DRYER", status: "ACTIVE" },
  ]).onDuplicateKeyUpdate({ set: { name: machines.name } });

  // ── Default settings ──────────────────────────────────────────
  console.log("Creating default settings...");
  await db.insert(settings).values([
    { key: "maxBookingsPerDay", value: "2" },
    { key: "bookingWindowDays", value: "7" },
    { key: "cancellationWindowHours", value: "1" },
    { key: "defaultLanguage", value: "pt" },
    { key: "googleSheetsEnabled", value: "false" },
    { key: "googleCalendarEnabled", value: "false" },
  ]).onDuplicateKeyUpdate({ set: { value: settings.value } });

  // ── Sample approved residents (from physical sheets) ─────────
  console.log("Creating sample residents...");
  const residentPin = await hashPin("1234");
  await db.insert(residents).values([
    { name: "Manuela", roomNumber: "32", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Andressa", roomNumber: "18", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Morena", roomNumber: "5", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Dayana", roomNumber: "18", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Edeilteu", roomNumber: "36", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Joana", roomNumber: "35", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Mourad", roomNumber: "15", pin: residentPin, status: "APPROVED", preferredLanguage: "pt" },
    { name: "Nagaete", roomNumber: "6", pin: residentPin, status: "APPROVED", preferredLanguage: "ar" },
    { name: "Khadija", roomNumber: "9", pin: residentPin, status: "APPROVED", preferredLanguage: "ar" },
  ]).onDuplicateKeyUpdate({ set: { name: residents.name } });

  console.log("\n✅ Seed complete!");
  console.log("\n📋 Admin credentials (change in production!):");
  console.log("   Email: admin1@cae-ebenezer.org");
  console.log("   Password: admin123");
  console.log("\n📋 Sample resident PIN: 1234");
  process.exit(0);
}

seed().catch(e => { console.error("Seed failed:", e); process.exit(1); });
