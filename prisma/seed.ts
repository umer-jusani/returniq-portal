import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("ReturnIQ!2026", 12);

  const existing = await prisma.tenant.findFirst({
    where: { slug: { in: ["ddu", "returniq"] } },
  });

  const data = {
    name: "ReturnIQ",
    slug: "returniq",
    airtableBaseId: process.env.AIRTABLE_BASE_ID || "appeYSqwZlQlwRCf9",
    airtableTableId: process.env.AIRTABLE_TABLE_ID || "tblOUYWhqtCfLL4nW",
    airtablePat: process.env.AIRTABLE_PAT || null,
    airtableWebhookId: process.env.AIRTABLE_WEBHOOK_ID || null,
    airtableMacSecret: process.env.AIRTABLE_MAC_SECRET || null,
    n8nShipUrl: process.env.N8N_SHIP_URL || null,
    n8nInspectionUrl: process.env.N8N_INSPECTION_URL || null,
    n8nPortalKey: process.env.N8N_PORTAL_KEY || null,
    timezone: "Asia/Karachi",
  };

  const tenant = existing
    ? await prisma.tenant.update({ where: { id: existing.id }, data })
    : await prisma.tenant.create({ data });

  const people = [
    { email: "uma.s@example.org", name: "Umer Jusani", role: "admin" },
    { email: "uma.s@example.org", name: "Warehouse Desk", role: "warehouse" },
    { email: "xavier.y@example.org", name: "Support Desk", role: "support" },
  ];

  for (const person of people) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: { name: person.name, role: person.role, tenantId: tenant.id, passwordHash },
      create: { ...person, tenantId: tenant.id, passwordHash },
    });
  }

  console.log("Seeded ReturnIQ tenant with admin / warehouse / support.");
  console.log("Login: uma.s@example.org / ReturnIQ!2026");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
