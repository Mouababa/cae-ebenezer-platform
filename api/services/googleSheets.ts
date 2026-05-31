import { env } from "../lib/env";

/**
 * Google Sheets integration via REST API using a Service Account.
 * No googleapis npm package needed — pure fetch calls.
 */

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets"];
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedToken: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!env.googleServiceAccountEmail || !env.googleServiceAccountKey) {
    throw new Error("Google Service Account not configured");
  }

  // Return cached token if valid
  if (cachedToken && Date.now() < cachedToken.exp - 60000) {
    return cachedToken.token;
  }

  // Build JWT for service account auth
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

  // Import private key and sign
  const privateKeyPem = env.googleServiceAccountKey
    .replace(/\\n/g, "\n")
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(privateKeyPem), c => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const jwt = `${signingInput}.${sigB64}`;

  // Exchange JWT for access token
  const resp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Google token error: ${text}`);
  }

  const data = await resp.json() as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    exp: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

async function sheetsRequest(
  method: string,
  path: string,
  body?: unknown
): Promise<unknown> {
  const token = await getAccessToken();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${env.googleSheetsId}${path}`;

  const resp = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error(`Sheets API error (${resp.status}): ${text}`);
    throw new Error(`Sheets API error: ${resp.status}`);
  }

  return resp.json();
}

// ── Ensure sheets exist ────────────────────────────────────────────────

export async function ensureSheets(): Promise<void> {
  if (!env.googleSheetsId) return;
  try {
    const info = await sheetsRequest("GET", "") as { sheets: Array<{ properties: { title: string } }> };
    const existing = info.sheets.map(s => s.properties.title);
    const needed = ["Agendamentos", "Secadoras", "Conviventes", "Emendas", "Auditoria"];
    const toCreate = needed.filter(n => !existing.includes(n));

    if (toCreate.length > 0) {
      await sheetsRequest("POST", ":batchUpdate", {
        requests: toCreate.map(title => ({
          addSheet: { properties: { title } },
        })),
      });

      // Add headers to each new sheet
      const headers: Record<string, string[]> = {
        Agendamentos: ["DATA", "HORÁRIO", "MÁQUINA", "TIPO", "NOME", "QUARTO", "STATUS", "OSE", "AGENDADO EM", "OBSERVAÇÃO"],
        Secadoras: ["DATA", "HORÁRIO", "SECADORA", "NOME", "QUARTO", "STATUS", "OSE", "AGENDADO EM", "OBSERVAÇÃO"],
        Conviventes: ["ID", "NOME", "QUARTO", "TELEFONE", "STATUS", "IDIOMA", "NO-SHOWS", "DATA CADASTRO"],
        Emendas: ["DATA", "ADMIN", "MOTIVO", "ID AGENDAMENTO", "STATUS ANTERIOR", "NOVO STATUS"],
        Auditoria: ["DATA/HORA", "USUÁRIO", "AÇÃO", "ALVO", "DETALHES"],
      };

      for (const sheet of toCreate) {
        await sheetsRequest("PUT", `/values/${encodeURIComponent(sheet)}!A1:J1?valueInputOption=RAW`, {
          values: [headers[sheet] ?? []],
        });
      }
    }
  } catch (e) {
    console.error("ensureSheets error:", e);
  }
}

// ── Append a booking row ───────────────────────────────────────────────

export async function appendBooking(data: {
  date: string;
  startTime: string;
  endTime: string;
  machineName: string;
  machineType: string;
  residentName: string;
  roomNumber: string;
  status: string;
  adminNote?: string;
}): Promise<void> {
  if (!env.googleSheetsId) return;
  const sheet = data.machineType === "DRYER" ? "Secadoras" : "Agendamentos";
  const row = [
    data.date,
    `${data.startTime} - ${data.endTime}`,
    data.machineName,
    data.machineType === "DRYER" ? "Secadora" : "Máquina de Lavar",
    data.residentName,
    data.roomNumber,
    data.status,
    "", // OSE - filled manually or via separate update
    new Date().toISOString(),
    data.adminNote ?? "",
  ];
  try {
    await sheetsRequest("POST", `/values/${encodeURIComponent(sheet)}!A:J:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      values: [row],
    });
  } catch (e) {
    console.error("appendBooking error:", e);
  }
}

// ── Append amendment ──────────────────────────────────────────────────

export async function appendAmendment(data: {
  adminName: string;
  reason: string;
  bookingId: number;
  oldStatus: string;
  newStatus: string;
}): Promise<void> {
  if (!env.googleSheetsId) return;
  const row = [
    new Date().toISOString(),
    data.adminName,
    data.reason,
    String(data.bookingId),
    data.oldStatus,
    data.newStatus,
  ];
  try {
    await sheetsRequest("POST", `/values/Emendas!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      values: [row],
    });
  } catch (e) {
    console.error("appendAmendment error:", e);
  }
}

// ── Upsert resident row ────────────────────────────────────────────────

export async function upsertResidentInSheet(data: {
  id: number;
  name: string;
  roomNumber: string;
  phone: string | null;
  status: string;
  preferredLanguage: string | null;
  noShowCount: number | null;
  createdAt: Date;
}): Promise<void> {
  if (!env.googleSheetsId) return;
  const row = [
    String(data.id),
    data.name,
    data.roomNumber,
    data.phone ?? "",
    data.status,
    data.preferredLanguage ?? "pt",
    String(data.noShowCount ?? 0),
    data.createdAt.toISOString().split("T")[0],
  ];
  try {
    await sheetsRequest("POST", `/values/Conviventes!A:H:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      values: [row],
    });
  } catch (e) {
    console.error("upsertResidentInSheet error:", e);
  }
}

// ── Append audit log ──────────────────────────────────────────────────

export async function appendAuditLog(data: {
  userName: string;
  action: string;
  target: string;
  details: string;
}): Promise<void> {
  if (!env.googleSheetsId) return;
  const row = [
    new Date().toISOString(),
    data.userName,
    data.action,
    data.target,
    data.details,
  ];
  try {
    await sheetsRequest("POST", `/values/Auditoria!A:E:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, {
      values: [row],
    });
  } catch (e) {
    console.error("appendAuditLog error:", e);
  }
}

export const googleSheets = {
  ensureSheets,
  appendBooking,
  appendAmendment,
  upsertResidentInSheet,
  appendAuditLog,
};
