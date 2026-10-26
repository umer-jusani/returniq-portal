import { shipRequest } from "@/lib/actions";
import { getSession, jsonError } from "@/lib/auth";
import { N8nError } from "@/lib/n8n";
import { shipSchema } from "@/lib/schemas";
import { canShip } from "@/lib/status";
import { getTenant } from "@/lib/tenant";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  if (!canShip(session.role)) return jsonError("unauthorized", 403);

  const { id } = await ctx.params;
  const parsed = shipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "invalid_result", 400);
  }

  const courier =
    parsed.data.courier === "Other"
      ? parsed.data.courierOther!.trim()
      : parsed.data.courier;

  try {
    const tenant = await getTenant(session.tenantId);
    const result = await shipRequest({
      tenant,
      session,
      id,
      courier,
      tracking_number: parsed.data.tracking_number,
      note: parsed.data.note,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof N8nError) return jsonError(error.code, error.status);
    return jsonError("n8n_unreachable", 502);
  }
}
