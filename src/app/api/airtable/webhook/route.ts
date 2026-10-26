import { prisma } from "@/lib/db";
import { processAirtablePing, verifyAirtableMac } from "@/lib/airtable-webhook";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const header = request.headers.get("X-Airtable-Content-MAC") || "";

  const tenants = await prisma.tenant.findMany();
  const tenant = tenants.find((row) => {
    const secret = row.airtableMacSecret || process.env.AIRTABLE_MAC_SECRET;
    return secret ? verifyAirtableMac(rawBody, header, secret) : false;
  });

  if (!tenant) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  setTimeout(() => {
    processAirtablePing(tenant).catch((error) => {
      console.error("airtable webhook processing failed", error);
    });
  }, 0);

  return Response.json({ ok: true }, { status: 200 });
}
