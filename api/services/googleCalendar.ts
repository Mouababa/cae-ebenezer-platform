import { env } from "../lib/env";

const SCOPES = ["https://www.googleapis.com/auth/calendar"];
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!env.googleServiceAccountEmail || !env.googleServiceAccountKey) {
    throw new Error("Google Service Account not configured");
  }
  if (cachedToken && Date.now() < cachedToken.exp - 60000) return cachedToken.token;

  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  const payload = btoa(JSON.stringify({
    iss: env.googleServiceAccountEmail,
    scope: SCOPES.join(" "),
    aud: TOKEN_URL,
    exp: now + 3600,
    iat: now,
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const signingInput = `${header}.${payload}`;
  const privateKeyPem = env.googleServiceAccountKey
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(signingInput));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwt = `${signingInput}.${sigB64}`;
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!resp.ok) throw new Error(`Google Calendar token error: ${await resp.text()}`);
  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedToken = { token: data.access_token, exp: Date.now() + data.expires_in * 1000 };
  return cachedToken.token;
}

async function calRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  if (!env.googleCalendarId) return null;
  const token = await getAccessToken();
  const base = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.googleCalendarId)}`;
  const resp = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok) { console.error(`Calendar API error (${resp.status}): ${await resp.text()}`); return null; }
  return resp.ok && resp.status !== 204 ? resp.json() : null;
}

function toCalDateTime(date: string, time: string): string {
  // date: "2026-06-01", time: "08:00" → "2026-06-01T08:00:00"
  return `${date}T${time}:00`;
}

// Color IDs: 1=lavender,2=sage,3=grape,4=flamingo,5=banana,6=tangerine,7=peacock(blue),8=graphite,9=blueberry,10=basil(green),11=tomato
const COLOR_MAP: Record<string, string> = {
  WASHING_MACHINE: "7", // peacock blue
  DRYER: "10",          // basil green
};

export async function createCalendarEvent(data: {
  bookingId: number;
  machineName: string;
  machineType: string;
  residentName: string;
  roomNumber: string;
  date: string;
  startTime: string;
  endTime: string;
}): Promise<string | null> {
  if (!env.googleCalendarId) return null;
  try {
    const event = await calRequest("POST", "/events", {
      summary: `[${data.machineName}] ${data.residentName} (Quarto ${data.roomNumber})`,
      description: `Agendamento #${data.bookingId}\nMáquina: ${data.machineName}\nConvivente: ${data.residentName}\nQuarto: ${data.roomNumber}`,
      start: { dateTime: toCalDateTime(data.date, data.startTime), timeZone: "America/Sao_Paulo" },
      end: { dateTime: toCalDateTime(data.date, data.endTime), timeZone: "America/Sao_Paulo" },
      colorId: COLOR_MAP[data.machineType] ?? "7",
      extendedProperties: { private: { caeBookingId: String(data.bookingId) } },
    }) as { id: string } | null;
    return event?.id ?? null;
  } catch (e) {
    console.error("createCalendarEvent error:", e);
    return null;
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  if (!env.googleCalendarId || !eventId) return;
  try {
    await calRequest("DELETE", `/events/${eventId}`);
  } catch (e) {
    console.error("deleteCalendarEvent error:", e);
  }
}

export async function updateCalendarEvent(eventId: string, data: {
  machineName: string;
  residentName: string;
  roomNumber: string;
  date: string;
  startTime: string;
  endTime: string;
  machineType: string;
}): Promise<void> {
  if (!env.googleCalendarId || !eventId) return;
  try {
    await calRequest("PATCH", `/events/${eventId}`, {
      summary: `[${data.machineName}] ${data.residentName} (Quarto ${data.roomNumber})`,
      start: { dateTime: toCalDateTime(data.date, data.startTime), timeZone: "America/Sao_Paulo" },
      end: { dateTime: toCalDateTime(data.date, data.endTime), timeZone: "America/Sao_Paulo" },
      colorId: COLOR_MAP[data.machineType] ?? "7",
    });
  } catch (e) {
    console.error("updateCalendarEvent error:", e);
  }
}

export const googleCalendar = { createCalendarEvent, deleteCalendarEvent, updateCalendarEvent };
