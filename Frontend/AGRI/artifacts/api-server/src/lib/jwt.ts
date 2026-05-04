import crypto from "crypto";
import { logger } from "./logger";

const JWT_SECRET = process.env["JWT_SECRET"] ?? "bhuvigyan-dev-secret-change-in-prod";
const IS_DEV = process.env["NODE_ENV"] !== "production";
const ACCESS_TOKEN_TTL = IS_DEV ? 8 * 60 * 60 : 15 * 60; // 8h dev / 15m prod
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function sign(payload: object, expiresIn: number): string {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + expiresIn;
  const claims = base64url(JSON.stringify({ ...payload, iat, exp }));
  const sig = base64url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${claims}`).digest(),
  );
  return `${header}.${claims}.${sig}`;
}

function verify<T>(token: string): T {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Invalid token format");
  const [header, claims, sig] = parts as [string, string, string];
  const expectedSig = base64url(
    crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${claims}`).digest(),
  );
  if (sig !== expectedSig) throw new Error("Invalid token signature");
  const payload = JSON.parse(Buffer.from(claims, "base64url").toString()) as T & { exp: number };
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error("Token expired");
  return payload;
}

export function signAccessToken(payload: Record<string, unknown>): string {
  return sign(payload, ACCESS_TOKEN_TTL);
}

export function signFarmerAccessToken(farmerId: string, udlrn: string, state: string): string {
  return sign({ sub: `farmer:${farmerId}`, role: "FARMER", farmerId, udlrn, state }, ACCESS_TOKEN_TTL);
}

export function signAdminAccessToken(adminId: string, email: string, role: string, jurisdiction: object): string {
  return sign({ sub: `admin:${email}`, role, adminId, email, jurisdiction }, ACCESS_TOKEN_TTL);
}

export function signRefreshToken(subject: string): string {
  return sign({ sub: subject, type: "refresh", jti: crypto.randomUUID() }, REFRESH_TOKEN_TTL);
}

export function verifyAccessToken(token: string) {
  return verify<{
    sub: string;
    role: string;
    farmerId?: string;
    adminId?: string;
    udlrn?: string;
    state?: string;
    email?: string;
    jurisdiction?: object;
    iat: number;
    exp: number;
  }>(token);
}

export function verifyRefreshToken(token: string) {
  return verify<{ sub: string; type: string }>(token);
}
