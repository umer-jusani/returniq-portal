import { getSession, jsonError } from "@/lib/auth";
import { listRequests } from "@/lib/airtable";
import { getTenant } from "@/lib/tenant";
import { TAB_STATUSES, type TabKey } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);

  const tenant = await getTenant(session.tenantId);
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const since = url.searchParams.get("since") ?? undefined;

  const requests = await listRequests(tenant, { status, q, since });
  const all = status || q || since ? await listRequests(tenant) : requests;

  const counts = {
    all: all.length,
    awaiting: 0,
    inspection: 0,
    ready: 0,
    shipped: 0,
    review: 0,
    failed: 0,
  };

  for (const row of all) {
    (Object.keys(TAB_STATUSES) as TabKey[]).forEach((key) => {
      if (key === "all") return;
      if (TAB_STATUSES[key]?.includes(row.status)) {
        counts[key] += 1;
      }
    });
  }

  return Response.json({ ok: true, requests, counts, demo: !tenant.airtablePat && !process.env.AIRTABLE_PAT });
}
