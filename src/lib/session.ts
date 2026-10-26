import { jwtVerify, SignJWT } from "jose";
import type { SessionUser } from "./types";

export const SESSION_COOKIE = "riq_session";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    return new TextEncoder().encode("dev-returniq-session-secret-change-before-prod-32");
  }
  return new TextEncoder().encode(value);
}

export async function signSession(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function readSessionToken(token: string | undefined | null): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (!payload.userId || !payload.email || !payload.role || !payload.tenantId) {
      return null;
    }
    return {
      userId: String(payload.userId),
      email: String(payload.email),
      name: String(payload.name || ""),
      role: payload.role as SessionUser["role"],
      tenantId: String(payload.tenantId),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}
