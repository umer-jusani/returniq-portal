import { prisma } from "./db";
import type { AuditEntry, SessionUser } from "./types";

export async function writeAudit(input: {
  tenantId: string;
  userId?: string;
  requestId: string;
  action: string;
  result?: string;
  meta?: Record<string, unknown>;
}) {
  return prisma.auditLog.create({
    data: {
      tenantId: input.tenantId,
      userId: input.userId,
      requestId: input.requestId,
      action: input.action,
      result: input.result,
      meta: input.meta ? JSON.stringify(input.meta) : null,
    },
  });
}

export async function listAudit(tenantId: string, requestId: string): Promise<AuditEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { tenantId, requestId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return rows.map((row) => ({
    id: row.id,
    requestId: row.requestId,
    action: row.action,
    result: row.result,
    meta: row.meta ? (JSON.parse(row.meta) as Record<string, unknown>) : null,
    createdAt: row.createdAt.toISOString(),
    actor: row.user
      ? { name: row.user.name, email: row.user.email, role: row.user.role }
      : null,
  }));
}

export async function actorLabel(session: SessionUser) {
  return session.email;
}
