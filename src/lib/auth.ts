import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import type { SessionUser } from "./types";
import { prisma } from "./db";
import { readSessionToken, SESSION_COOKIE } from "./session";

export { SESSION_COOKIE, signSession, sessionCookieOptions, readSessionToken } from "./session";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    const error = new Error("unauthorized");
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  return session;
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return user;
}

export function jsonError(error: string, status = 400) {
  return Response.json({ ok: false, error }, { status });
}
