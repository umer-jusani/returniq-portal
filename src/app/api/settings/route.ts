import { getSession, jsonError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { airtableConfig, getTenant, isDemoTenant, n8nConfig } from "@/lib/tenant";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);
  const tenant = await getTenant(session.tenantId);
  const airtable = airtableConfig(tenant);
  const n8n = n8nConfig(tenant);
  const team = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  let airtableOk: "connected" | "waiting" | "error" = "waiting";
  if (airtable.pat && airtable.baseId && airtable.tableId) {
    try {
      const res = await fetch(
        `https://api.airtable.com/v0/${airtable.baseId}/${airtable.tableId}?maxRecords=1`,
        { headers: { Authorization: `Bearer ${airtable.pat}` }, cache: "no-store" },
      );
      airtableOk = res.ok ? "connected" : "error";
    } catch {
      airtableOk = "error";
    }
  }

  return Response.json({
    ok: true,
    tenant: {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      timezone: tenant.timezone,
      demo: isDemoTenant(tenant),
    },
    connections: {
      airtable: {
        status: airtableOk,
        baseId: airtable.baseId || null,
        tableId: airtable.tableId || null,
        webhook: airtable.webhookId ? "configured" : "waiting",
      },
      n8n: {
        ship: n8n.shipUrl ? (n8n.portalKey ? "configured" : "waiting") : "waiting",
        inspection: n8n.inspectionUrl ? "configured" : "waiting",
      },
    },
    team,
  });
}
