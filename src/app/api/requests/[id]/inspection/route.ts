import { inspectRequest } from "@/lib/actions";
import { getSession, jsonError } from "@/lib/auth";
import { canInspect } from "@/lib/status";
import { inspectionSchema } from "@/lib/schemas";
import { getTenant } from "@/lib/tenant";
import { N8nError } from "@/lib/n8n";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/requests/[id]">,
) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  if (!canInspect(session.role)) return jsonError("unauthorized", 403);

  const { id } = await ctx.params;
  const parsed = inspectionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message || "invalid_result", 400);
  }

  try {
    const tenant = await getTenant(session.tenantId);
    const result = await inspectRequest({
      tenant,
      session,
      id,
      result: parsed.data.result,
      note: parsed.data.note,
    });
    return Response.json(result);
  } catch (error) {
    if (error instanceof N8nError) return jsonError(error.code, error.status);
    return jsonError("n8n_unreachable", 502);
  }
}
