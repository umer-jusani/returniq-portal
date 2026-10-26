import { getSession, jsonError } from "@/lib/auth";
import { getTenant, isDemoTenant } from "@/lib/tenant";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  const tenant = await getTenant(session.tenantId);
  return Response.json({
    ok: true,
    user: session,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      demo: isDemoTenant(tenant),
    },
  });
}
