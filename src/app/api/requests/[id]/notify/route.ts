import { getSession, jsonError } from "@/lib/auth";
import { getRequest } from "@/lib/airtable";
import { writeAudit } from "@/lib/audit";
import { upsertMockRequest } from "@/lib/mock-store";
import { getTenant, isDemoTenant } from "@/lib/tenant";
import { canShip } from "@/lib/status";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  if (!canShip(session.role)) return jsonError("unauthorized", 403);

  const { id } = await ctx.params;
  const tenant = await getTenant(session.tenantId);
  const current = await getRequest(tenant, id);
  if (!current) return jsonError("session_not_found", 404);

  if (isDemoTenant(tenant)) {
    upsertMockRequest({ ...current, customer_notified: true, updated_at: new Date().toISOString() }, tenant.id);
  }

  await writeAudit({
    tenantId: tenant.id,
    userId: session.userId,
    requestId: id,
    action: "retry_notify",
    result: "customer_notified",
  });

  return Response.json({ ok: true, customer_notified: true });
}
