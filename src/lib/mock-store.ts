import { createMockRequests } from "./mock-data";
import type { PortalRequest } from "./types";
import { publish } from "./pubsub";

type Store = {
  requests: Map<string, PortalRequest>;
};

const globalForStore = globalThis as unknown as { __riqStore?: Store };

function getStore(): Store {
  if (!globalForStore.__riqStore) {
    const requests = new Map<string, PortalRequest>();
    for (const row of createMockRequests()) requests.set(row.id, row);
    globalForStore.__riqStore = { requests };
  }
  return globalForStore.__riqStore;
}

export function listMockRequests() {
  return [...getStore().requests.values()].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );
}

export function getMockRequest(id: string) {
  return getStore().requests.get(id) ?? null;
}

export function upsertMockRequest(request: PortalRequest, tenantId?: string) {
  getStore().requests.set(request.id, request);
  if (tenantId) publish(tenantId, { type: "upsert", request });
  return request;
}

export function deleteMockRequest(id: string, tenantId?: string) {
  getStore().requests.delete(id);
  if (tenantId) publish(tenantId, { type: "delete", id });
}
