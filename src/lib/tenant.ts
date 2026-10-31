import type { Tenant } from "@prisma/client";
import { prisma } from "./db";

export async function getTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error("tenant_not_found");
  return tenant;
}

export function hasAirtable(tenant: Tenant) {
  return Boolean(
    (tenant.airtablePat || process.env.AIRTABLE_PAT) &&
      (tenant.airtableBaseId || process.env.AIRTABLE_BASE_ID) &&
      (tenant.airtableTableId || process.env.AIRTABLE_TABLE_ID),
  );
}

export function airtableConfig(tenant: Tenant) {
  return {
    pat: tenant.airtablePat || process.env.AIRTABLE_PAT || "",
    baseId: tenant.airtableBaseId || process.env.AIRTABLE_BASE_ID || "",
    tableId: tenant.airtableTableId || process.env.AIRTABLE_TABLE_ID || "",
    webhookId: tenant.airtableWebhookId || process.env.AIRTABLE_WEBHOOK_ID || "",
    macSecret: tenant.airtableMacSecret || process.env.AIRTABLE_MAC_SECRET || "",
  };
}

export function n8nConfig(tenant: Tenant) {
  return {
    shipUrl: tenant.n8nShipUrl || process.env.N8N_SHIP_URL || "",
    inspectionUrl: tenant.n8nInspectionUrl || process.env.N8N_INSPECTION_URL || "",
    portalKey: process.env.N8N_PORTAL_KEY?.trim() || tenant.n8nPortalKey?.trim() || "",
  };
}

export function isDemoTenant(tenant: Tenant) {
  return !hasAirtable(tenant);
}
