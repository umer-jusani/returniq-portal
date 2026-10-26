import { PrismaClient } from "@prisma/client";
import { ensureWebhook, refreshWebhook } from "../src/lib/airtable-webhook";

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  for (const tenant of tenants) {
    const ok = await refreshWebhook(tenant);
    if (!ok && process.env.PORTAL_DOMAIN) {
      await ensureWebhook(tenant, `${process.env.PORTAL_DOMAIN.replace(/\/$/, "")}/api/airtable/webhook`);
    }
    console.log(`${tenant.slug}: webhook ${ok ? "refreshed" : "needs recreate"}`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
