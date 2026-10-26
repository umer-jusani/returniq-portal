import { getSession, jsonError } from "@/lib/auth";
import { getRequest } from "@/lib/airtable";
import { listAudit } from "@/lib/audit";
import { getTenant } from "@/lib/tenant";

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  const { id } = await ctx.params;
  const tenant = await getTenant(session.tenantId);
  const request = await getRequest(tenant, id);
  if (!request) return jsonError("session_not_found", 404);
  const audit = await listAudit(tenant.id, id);
  return Response.json({ ok: true, request, audit });
}
