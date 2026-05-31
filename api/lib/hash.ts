// Simple PIN hashing using Web Crypto (no bcrypt dependency needed)
async function sha256(text: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function hashPin(pin: string): Promise<string> {
  return sha256(pin + "cae-ebenezer-salt");
}

export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  const hashed = await hashPin(pin);
  return hashed === hash;
}
