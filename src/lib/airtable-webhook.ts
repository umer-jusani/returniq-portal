import crypto from "crypto";
import type { Tenant } from "@prisma/client";
import { prisma } from "./db";
import { airtableConfig } from "./tenant";
import { loadChangedRecord } from "./airtable";

export function verifyAirtableMac(
  rawBody: string,
  header: string,
  macSecretBase64: string,
) {
  try {
    const key = Buffer.from(macSecretBase64, "base64");
    const expected =
      "hmac-sha256=" + crypto.createHmac("sha256", key).update(rawBody).digest("hex");
    const a = Buffer.from(expected);
    const b = Buffer.from(header || "");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function getCursor(tenantId: string) {
  const row = await prisma.webhookCursor.findUnique({
    where: { tenantId_key: { tenantId, key: "airtable_cursor" } },
  });
  return row?.cursor ?? 1;
}

export async function setCursor(tenantId: string, cursor: number) {
  await prisma.webhookCursor.upsert({
    where: { tenantId_key: { tenantId, key: "airtable_cursor" } },
    update: { cursor },
    create: { tenantId, key: "airtable_cursor", cursor },
  });
}

export async function processAirtablePing(tenant: Tenant) {
  const cfg = airtableConfig(tenant);
  if (!cfg.pat || !cfg.baseId || !cfg.webhookId) return;

  let cursor = await getCursor(tenant.id);
  let more = true;
  const changedIds = new Set<string>();

  while (more) {
    const res = await fetch(
      `https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks/${cfg.webhookId}/payloads?cursor=${cursor}`,
      { headers: { Authorization: `Bearer ${cfg.pat}` }, cache: "no-store" },
    );
    if (!res.ok) throw new Error(`webhook_payloads_${res.status}`);
    const data = (await res.json()) as {
      payloads?: Array<{
        changedTablesById?: Record<
          string,
          {
            changedRecordsById?: Record<string, unknown>;
            createdRecordsById?: Record<string, unknown>;
            destroyedRecordIds?: string[];
          }
        >;
      }>;
      cursor?: number;
      mightHaveMore?: boolean;
    };

    for (const payload of data.payloads ?? []) {
      const table = payload.changedTablesById?.[cfg.tableId];
      Object.keys(table?.changedRecordsById ?? {}).forEach((id) => changedIds.add(id));
      Object.keys(table?.createdRecordsById ?? {}).forEach((id) => changedIds.add(id));
      (table?.destroyedRecordIds ?? []).forEach((id) => changedIds.add(`DEL:${id}`));
    }

    cursor = data.cursor ?? cursor;
    more = Boolean(data.mightHaveMore);
  }

  await setCursor(tenant.id, cursor);
  for (const id of changedIds) {
    await loadChangedRecord(tenant, id);
  }
}

export async function refreshWebhook(tenant: Tenant) {
  const cfg = airtableConfig(tenant);
  if (!cfg.pat || !cfg.baseId || !cfg.webhookId) return false;
  const res = await fetch(
    `https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks/${cfg.webhookId}/refresh`,
    { method: "POST", headers: { Authorization: `Bearer ${cfg.pat}` } },
  );
  return res.ok;
}

export async function ensureWebhook(tenant: Tenant, notificationUrl: string) {
  const cfg = airtableConfig(tenant);
  if (!cfg.pat || !cfg.baseId) {
    throw new Error("Airtable credentials are not configured for this tenant");
  }

  const list = await fetch(`https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks`, {
    headers: { Authorization: `Bearer ${cfg.pat}` },
  });
  const data = (await list.json()) as {
    webhooks?: Array<{ id: string; notificationUrl?: string }>;
  };
  const existing = data.webhooks?.find((hook) => hook.notificationUrl === notificationUrl);
  if (existing) return { id: existing.id, created: false };

  const created = await fetch(`https://api.airtable.com/v0/bases/${cfg.baseId}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.pat}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      notificationUrl,
      specification: {
        options: {
          filters: {
            dataTypes: ["tableData"],
            recordChangeScope: cfg.tableId,
          },
        },
      },
    }),
  });
  const body = (await created.json()) as { id?: string; macSecretBase64?: string; error?: unknown };
  if (!created.ok || !body.id) {
    throw new Error("Failed to create Airtable webhook");
  }
  return { id: body.id, macSecretBase64: body.macSecretBase64, created: true };
}
