"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { PortalRequest, StreamEvent } from "@/lib/types";

type RequestsResponse = {
  requests: PortalRequest[];
  counts: Record<string, number>;
};

export function useLiveStream() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"live" | "reconnecting">("live");
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, number>>(new Map());

  const flash = (id: string) => {
    setHighlighted((prev) => new Set(prev).add(id));
    const existing = timers.current.get(id);
    if (existing) window.clearTimeout(existing);
    const timeout = window.setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      timers.current.delete(id);
    }, 3000);
    timers.current.set(id, timeout);
  };

  const applyEvent = (event: StreamEvent) => {
    if (event.type === "ping") return;
    queryClient.setQueriesData({ queryKey: ["requests"] }, (current: RequestsResponse | undefined) => {
      if (!current) return current;
      if (event.type === "delete") {
        return {
          ...current,
          requests: current.requests.filter((row) => row.id !== event.id),
        };
      }
      const exists = current.requests.some((row) => row.id === event.request.id);
      const requests = exists
        ? current.requests.map((row) => (row.id === event.request.id ? event.request : row))
        : [event.request, ...current.requests];
      if (!exists) {
        toast.message("New request landed", { description: `Order ${event.request.order_no}` });
      }
      flash(event.request.id);
      return { ...current, requests };
    });
    queryClient.invalidateQueries({ queryKey: ["request", event.type === "upsert" ? event.request.id : event.id] });
  };

  useEffect(() => {
    let source: EventSource | null = null;
    let poll: number | undefined;
    let closed = false;

    const startPoll = () => {
      if (poll) return;
      poll = window.setInterval(() => {
        queryClient.invalidateQueries({ queryKey: ["requests"] });
      }, 30_000);
    };

    const connect = () => {
      source = new EventSource("/api/stream");
      source.onopen = () => {
        setStatus("live");
        if (poll) {
          window.clearInterval(poll);
          poll = undefined;
        }
      };
      source.onmessage = (message) => {
        try {
          applyEvent(JSON.parse(message.data) as StreamEvent);
        } catch {
          // ignore malformed frames
        }
      };
      source.onerror = () => {
        setStatus("reconnecting");
        source?.close();
        startPoll();
        if (!closed) window.setTimeout(connect, 4000);
      };
    };

    connect();
    return () => {
      closed = true;
      source?.close();
      if (poll) window.clearInterval(poll);
      timers.current.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryClient]);

  return { status, highlighted };
}
