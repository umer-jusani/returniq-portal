import bcrypt from "bcryptjs";
import { getSession, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { inviteSchema } from "@/lib/schemas";
import { canManageTeam } from "@/lib/status";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  if (!canManageTeam(session.role)) return jsonError("unauthorized", 403);

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "Invalid team member", 400);
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (existing) return jsonError("A user with this email already exists", 409);

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email.toLowerCase(),
      role: parsed.data.role,
      tenantId: session.tenantId,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });

  return Response.json({ ok: true, user });
}
