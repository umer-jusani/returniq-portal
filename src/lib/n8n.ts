import type { Tenant } from "@prisma/client";
import { n8nConfig } from "./tenant";

export type N8nErrorCode =
  | "unauthorized"
  | "session_not_found"
  | "ambiguous_session"
  | "not_ready"
  | "already_shipped"
  | "invalid_result"
  | "n8n_unreachable";

export class N8nError extends Error {
  code: N8nErrorCode | "N8N_PORTAL_KEY is not set";
  status: number;
  constructor(code: N8nErrorCode | "N8N_PORTAL_KEY is not set", status = 400) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

function requirePortalKey(): string {
  const key = process.env.N8N_PORTAL_KEY?.trim();
  if (!key) {
    throw new N8nError("N8N_PORTAL_KEY is not set", 500);
  }
  return key;
}

type N8nResponse = {
  ok?: boolean;
  error?: string;
  status?: string;
  tracking_number?: string;
  customer_notified?: boolean;
  [key: string]: unknown;
};

function mapError(raw: string): N8nErrorCode {
  const value = raw.toLowerCase();
  if (value.includes("unauthorized")) return "unauthorized";
  if (value.includes("session_not_found")) return "session_not_found";
  if (value.includes("ambiguous")) return "ambiguous_session";
  if (value.includes("not_ready")) return "not_ready";
  if (value.includes("already_shipped")) return "already_shipped";
  if (value.includes("invalid_result")) return "invalid_result";
  return "n8n_unreachable";
}

async function postJson(url: string, body: Record<string, unknown>): Promise<N8nResponse> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new N8nError("n8n_unreachable", 502);
  }

  const json = (await res.json().catch(() => ({}))) as N8nResponse;
  if (!res.ok || json.ok === false) {
    const code = mapError(String(json.error || res.statusText || "n8n_unreachable"));
    throw new N8nError(code, res.status >= 400 ? res.status : 400);
  }
  return json;
}

export async function callInspection(
  tenant: Tenant,
  input: { session_id: string; result: "pass" | "fail"; note?: string; inspection_by?: string },
  demo: boolean,
): Promise<N8nResponse> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 600));
    return {
      ok: true,
      status: input.result === "pass" ? "inspection_done" : "inspection_failed",
      customer_notified: true,
    };
  }

  const cfg = n8nConfig(tenant);
  if (!cfg.inspectionUrl) throw new N8nError("n8n_unreachable", 503);
  const key = requirePortalKey();
  return postJson(cfg.inspectionUrl, {
    key,
    session_id: input.session_id,
    result: input.result,
    note: input.note,
    inspection_by: input.inspection_by,
  });
}

export async function callShip(
  tenant: Tenant,
  input: {
    session_id: string;
    courier: string;
    tracking_number: string;
    note?: string;
    shipped_by?: string;
  },
  demo: boolean,
): Promise<N8nResponse> {
  if (demo) {
    await new Promise((r) => setTimeout(r, 700));
    return {
      ok: true,
      status: "replacement_shipped",
      tracking_number: input.tracking_number,
      customer_notified: true,
    };
  }

  const cfg = n8nConfig(tenant);
  if (!cfg.shipUrl) throw new N8nError("n8n_unreachable", 503);
  const key = requirePortalKey();
  return postJson(cfg.shipUrl, {
    key,
    session_id: input.session_id,
    courier: input.courier,
    tracking_number: input.tracking_number,
    note: input.note,
    shipped_by: input.shipped_by,
  });
}

export function n8nStatus(code: N8nErrorCode) {
  if (code === "unauthorized") return 401;
  if (code === "n8n_unreachable") return 502;
  return 409;
}
