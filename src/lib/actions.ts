import type { Tenant } from "@prisma/client";
import { getRequest, patchRequest } from "./airtable";
import { writeAudit } from "./audit";
import { callInspection, callShip, N8nError } from "./n8n";
import { upsertMockRequest } from "./mock-store";
import { isDemoTenant } from "./tenant";
import type { PortalRequest, SessionUser } from "./types";

function assertReadyForInspection(request: PortalRequest) {
  if (request.status !== "inspection_pending") {
    throw new N8nError("not_ready", 409);
  }
}

function assertReadyToShip(request: PortalRequest) {
  if (request.status === "replacement_shipped" || request.status === "completed") {
    throw new N8nError("already_shipped", 409);
  }
  if (request.status !== "inspection_done" || request.inspection_status !== "passed") {
    throw new N8nError("not_ready", 409);
  }
}

export async function inspectRequest(input: {
  tenant: Tenant;
  session: SessionUser;
  id: string;
  result: "pass" | "fail";
  note?: string;
}) {
  const current = await getRequest(input.tenant, input.id);
  if (!current) throw new N8nError("session_not_found", 404);
  assertReadyForInspection(current);

  const demo = isDemoTenant(input.tenant);
  const n8n = await callInspection(
    input.tenant,
    {
      session_id: current.customer.phone,
      result: input.result,
      note: input.note,
      inspection_by: input.session.email,
    },
    demo,
  );

  const nextStatus = input.result === "pass" ? "inspection_done" : "inspection_failed";
  const now = new Date().toISOString();
  let updated: PortalRequest | null = current;

  if (demo) {
    updated = upsertMockRequest(
      {
        ...current,
        status: nextStatus,
        inspection_status: input.result === "pass" ? "passed" : "failed",
        inspection_note: input.note ?? current.inspection_note,
        inspection_completed_at: now,
        inspection_by: input.session.email,
        updated_at: now,
        customer_notified: n8n.customer_notified ?? true,
      },
      input.tenant.id,
    );
  } else {
    updated = await getRequest(input.tenant, input.id);
  }

  await writeAudit({
    tenantId: input.tenant.id,
    userId: input.session.userId,
    requestId: input.id,
    action: "inspection",
    result: input.result,
    meta: { note: input.note, customer_notified: n8n.customer_notified ?? true },
  });

  return {
    ok: true as const,
    status: (n8n.status as string) || nextStatus,
    customer_notified: n8n.customer_notified ?? true,
    request: updated,
  };
}

export async function shipRequest(input: {
  tenant: Tenant;
  session: SessionUser;
  id: string;
  courier: string;
  tracking_number: string;
  note?: string;
}) {
  const current = await getRequest(input.tenant, input.id);
  if (!current) throw new N8nError("session_not_found", 404);
  assertReadyToShip(current);

  const demo = isDemoTenant(input.tenant);
  const n8n = await callShip(
    input.tenant,
    {
      session_id: current.customer.phone,
      courier: input.courier,
      tracking_number: input.tracking_number,
      note: input.note,
      shipped_by: input.session.email,
    },
    demo,
  );

  const now = new Date().toISOString();
  let updated: PortalRequest | null = current;

  if (demo) {
    updated = upsertMockRequest(
      {
        ...current,
        status: "replacement_shipped",
        replacement_shipment: {
          courier: input.courier,
          tracking_number: input.tracking_number,
          shipped_at: now,
          note: input.note,
        },
        shipped_by: input.session.email,
        updated_at: now,
        customer_notified: n8n.customer_notified ?? true,
      },
      input.tenant.id,
    );
  } else {
    updated = await getRequest(input.tenant, input.id);
  }

  await writeAudit({
    tenantId: input.tenant.id,
    userId: input.session.userId,
    requestId: input.id,
    action: "ship",
    result: "replacement_shipped",
    meta: {
      courier: input.courier,
      tracking_number: input.tracking_number,
      note: input.note,
      customer_notified: n8n.customer_notified ?? true,
    },
  });

  return {
    ok: true as const,
    status: "replacement_shipped" as const,
    tracking_number: input.tracking_number,
    customer_notified: n8n.customer_notified ?? true,
    request: updated,
  };
}

export async function adminRequestAction(input: {
  tenant: Tenant;
  session: SessionUser;
  id: string;
  action: "reinspect" | "resolve";
  note?: string;
}) {
  const current = await getRequest(input.tenant, input.id);
  if (!current) throw new N8nError("session_not_found", 404);

  const now = new Date().toISOString();
  const nextStatus = input.action === "reinspect" ? "inspection_pending" : "completed";

  let updated: PortalRequest | null;
  if (isDemoTenant(input.tenant)) {
    updated = upsertMockRequest(
      {
        ...current,
        status: nextStatus,
        inspection_status: input.action === "reinspect" ? "pending" : current.inspection_status,
        updated_at: now,
      },
      input.tenant.id,
    );
  } else {
    updated = await patchRequest(input.tenant, input.id, {
      exchange_status: nextStatus,
      inspection_status: input.action === "reinspect" ? "pending" : current.inspection_status,
      updated_at: now,
    });
  }

  await writeAudit({
    tenantId: input.tenant.id,
    userId: input.session.userId,
    requestId: input.id,
    action: input.action,
    result: nextStatus,
    meta: { note: input.note },
  });

  return { ok: true as const, status: nextStatus, request: updated };
}
