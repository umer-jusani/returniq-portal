import { adminRequestAction } from "@/lib/actions";
import { getSession, jsonError } from "@/lib/auth";
import { N8nError } from "@/lib/n8n";
import { adminActionSchema } from "@/lib/schemas";
import { canAdminAct } from "@/lib/status";
import { getTenant } from "@/lib/tenant";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  if (!canAdminAct(session.role)) return jsonError("unauthorized", 403);

  const { id } = await ctx.params;
  const parsed = adminActionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("invalid_result", 400);

  try {
    const tenant = await getTenant(session.tenantId);
    const result = await adminRequestAction({
      tenant,
      session,
      id,
      action: parsed.data.action,
      note: parsed.data.note,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof N8nError) return jsonError(error.code, error.status);
    return jsonError("n8n_unreachable", 502);
  }
}
