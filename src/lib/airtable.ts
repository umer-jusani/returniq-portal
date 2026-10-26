import type { Tenant } from "@prisma/client";
import { airtableConfig, isDemoTenant } from "./tenant";
import { mapAirtableRecord, matchesQuery } from "./mapper";
import { getMockRequest, listMockRequests, upsertMockRequest } from "./mock-store";
import { publish } from "./pubsub";
import type { ExchangeStatus, PortalRequest, TabKey } from "./types";
import { TAB_STATUSES } from "./types";

type ListFilters = {
  status?: string;
  q?: string;
  since?: string;
};

function tabStatuses(status?: string): ExchangeStatus[] | null {
  if (!status || status === "all") return null;
  if (status in TAB_STATUSES) return TAB_STATUSES[status as TabKey];
  return [status as ExchangeStatus];
}

function applyFilters(rows: PortalRequest[], filters: ListFilters) {
  const statuses = tabStatuses(filters.status);
  return rows
    .filter((row) => (statuses ? statuses.includes(row.status) : true))
    .filter((row) => (filters.q ? matchesQuery(row, filters.q) : true))
    .filter((row) => {
      if (!filters.since) return true;
      return new Date(row.updated_at).getTime() > new Date(filters.since).getTime();
    })
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
}

async function airtableFetch(path: string, pat: string, init?: RequestInit) {
  const res = await fetch(`https://api.airtable.com/v0/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${pat}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`airtable_${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export async function listRequests(tenant: Tenant, filters: ListFilters = {}) {
  if (isDemoTenant(tenant)) {
    return applyFilters(listMockRequests(), filters);
  }

  const cfg = airtableConfig(tenant);
  const rows: PortalRequest[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams();
    if (offset) params.set("offset", offset);
    params.set("pageSize", "100");
    const data = (await airtableFetch(
      `${cfg.baseId}/${cfg.tableId}?${params.toString()}`,
      cfg.pat,
    )) as { records: { id: string; createdTime?: string; fields: Record<string, unknown> }[]; offset?: string };
    for (const record of data.records ?? []) {
      rows.push(mapAirtableRecord(record));
    }
    offset = data.offset;
  } while (offset);

  return applyFilters(rows, filters);
}

export async function getRequest(tenant: Tenant, id: string) {
  if (isDemoTenant(tenant)) return getMockRequest(id);

  const cfg = airtableConfig(tenant);
  const record = (await airtableFetch(
    `${cfg.baseId}/${cfg.tableId}/${id}`,
    cfg.pat,
  )) as { id: string; createdTime?: string; fields: Record<string, unknown> };
  return mapAirtableRecord(record);
}

export async function patchRequest(
  tenant: Tenant,
  id: string,
  fields: Record<string, unknown>,
) {
  if (isDemoTenant(tenant)) {
    const current = getMockRequest(id);
    if (!current) return null;
    const next: PortalRequest = {
      ...current,
      ...("exchange_status" in fields
        ? { status: fields.exchange_status as PortalRequest["status"] }
        : {}),
      updated_at: new Date().toISOString(),
    };
    return upsertMockRequest(next, tenant.id);
  }

  const cfg = airtableConfig(tenant);
  const record = (await airtableFetch(`${cfg.baseId}/${cfg.tableId}/${id}`, cfg.pat, {
    method: "PATCH",
    body: JSON.stringify({ fields }),
  })) as { id: string; createdTime?: string; fields: Record<string, unknown> };
  const mapped = mapAirtableRecord(record);
  publish(tenant.id, { type: "upsert", request: mapped });
  return mapped;
}

export async function loadChangedRecord(tenant: Tenant, recordId: string) {
  if (recordId.startsWith("DEL:")) {
    publish(tenant.id, { type: "delete", id: recordId.slice(4) });
    return;
  }
  try {
    const request = await getRequest(tenant, recordId);
    if (request) publish(tenant.id, { type: "upsert", request });
  } catch {
    // record may already be gone
  }
}
