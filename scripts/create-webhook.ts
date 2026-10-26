import { PrismaClient } from "@prisma/client";
import { ensureWebhook } from "../src/lib/airtable-webhook";

const prisma = new PrismaClient();

async function main() {
  const domain = process.env.PORTAL_DOMAIN;
  if (!domain) {
    throw new Error("Set PORTAL_DOMAIN e.g. https://portal.example.com");
  }
  const tenant = await prisma.tenant.findFirst({ where: { slug: "ddu" } });
  if (!tenant) throw new Error("Seed the database first");

  const result = await ensureWebhook(tenant, `${domain.replace(/\/$/, "")}/api/airtable/webhook`);
  console.log(result);
  if (result.created && result.macSecretBase64) {
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        airtableWebhookId: result.id,
        airtableMacSecret: result.macSecretBase64,
      },
    });
    console.log("Stored webhook id. Save AIRTABLE_MAC_SECRET from the response; it is shown only once.");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
