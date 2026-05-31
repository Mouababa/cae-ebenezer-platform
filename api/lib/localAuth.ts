import * as jose from "jose";
import { env } from "./env";

const secret = new TextEncoder().encode(env.jwtSecret);

export type ResidentClaim = {
  type: "resident";
  residentId: number;
  roomNumber: string;
};

export type AdminClaim = {
  type: "admin";
  userId: number;
  role: string;
};

export type SessionClaim = ResidentClaim | AdminClaim;

export async function signToken(claim: SessionClaim): Promise<string> {
  return new jose.SignJWT({ ...claim })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionClaim | null> {
  try {
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as SessionClaim;
  } catch {
    return null;
  }
}

export function extractToken(headers: Headers): string | null {
  // Check Authorization header first
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // Check cookie
  const cookieHeader = headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/cae_token=([^;]+)/);
    if (match) return match[1];
  }
  return null;
}
