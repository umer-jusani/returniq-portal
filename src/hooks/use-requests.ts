"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PortalRequest, TabKey } from "@/lib/types";

async function parseJson(res: Response) {
  const json = await res.json();
  if (!res.ok || json.ok === false) {
    throw new Error(json.error || "Request failed");
  }
  return json;
}

export function useRequests(tab: TabKey, q: string) {
  return useQuery({
    queryKey: ["requests", tab, q],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tab !== "all") params.set("status", tab);
      if (q) params.set("q", q);
      const res = await fetch(`/api/requests?${params.toString()}`);
      return parseJson(res) as Promise<{
        requests: PortalRequest[];
        counts: Record<TabKey, number>;
        demo: boolean;
      }>;
    },
  });
}

export function useRequest(id: string | null) {
  return useQuery({
    queryKey: ["request", id],
    enabled: Boolean(id),
    queryFn: async () => {
      const res = await fetch(`/api/requests/${id}`);
      return parseJson(res) as Promise<{ request: PortalRequest; audit: unknown[] }>;
    },
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      return parseJson(res);
    },
  });
}

export function useInspect() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; result: "pass" | "fail"; note?: string }) => {
      const res = await fetch(`/api/requests/${input.id}/inspection`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: input.result, note: input.note }),
      });
      return parseJson(res);
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requests"] });
      client.invalidateQueries({ queryKey: ["request", variables.id] });
    },
  });
}

export function useShip() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      courier: string;
      courierOther?: string;
      tracking_number: string;
      note?: string;
    }) => {
      const res = await fetch(`/api/requests/${input.id}/ship`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseJson(res);
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requests"] });
      client.invalidateQueries({ queryKey: ["request", variables.id] });
    },
  });
}

export function useAdminAction() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; action: "reinspect" | "resolve"; note?: string }) => {
      const res = await fetch(`/api/requests/${input.id}/admin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseJson(res);
    },
    onSuccess: (_data, variables) => {
      client.invalidateQueries({ queryKey: ["requests"] });
      client.invalidateQueries({ queryKey: ["request", variables.id] });
    },
  });
}
