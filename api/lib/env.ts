import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

function optional(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const env = {
  appId: optional("APP_ID", "cae-ebenezer"),
  appSecret: required("APP_SECRET"),
  jwtSecret: optional("JWT_SECRET", "dev-jwt-secret-change-in-production"),
  sessionSecret: optional("SESSION_SECRET", "dev-session-secret"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  // KIMI OAuth (optional - legacy)
  kimiAuthUrl: optional("KIMI_AUTH_URL"),
  kimiOpenUrl: optional("KIMI_OPEN_URL"),
  ownerUnionId: optional("OWNER_UNION_ID"),
  // Google
  googleServiceAccountEmail: optional("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  googleServiceAccountKey: optional("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"),
  googleSheetsId: optional("GOOGLE_SHEETS_ID"),
  googleCalendarId: optional("GOOGLE_CALENDAR_ID"),
};
