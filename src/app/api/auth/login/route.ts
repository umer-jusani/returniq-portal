import { cookies } from "next/headers";
import { authenticate, sessionCookieOptions, signSession, SESSION_COOKIE, jsonError } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`login:${ip}`);
  if (!limited.ok) {
    return jsonError("Too many login attempts. Try again in 15 minutes.", 429);
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid credentials", 400);
  }

  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return jsonError("Invalid email or password", 401);

  const token = await signSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "admin" | "warehouse" | "support",
    tenantId: user.tenantId,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return Response.json({
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  });
}
