import type { StreamEvent } from "./types";

type Listener = (event: StreamEvent) => void;

const globalForBus = globalThis as unknown as {
  __riqBus?: Map<string, Set<Listener>>;
};

const channels = globalForBus.__riqBus ?? new Map<string, Set<Listener>>();
globalForBus.__riqBus = channels;

export function subscribe(tenantId: string, listener: Listener) {
  const key = `tenant:${tenantId}`;
  let set = channels.get(key);
  if (!set) {
    set = new Set();
    channels.set(key, set);
  }
  set.add(listener);
  return () => {
    set?.delete(listener);
    if (set && set.size === 0) channels.delete(key);
  };
}

export function publish(tenantId: string, event: StreamEvent) {
  const set = channels.get(`tenant:${tenantId}`);
  if (!set) return;
  for (const listener of set) {
    try {
      listener(event);
    } catch {
      // ignore a broken subscriber
    }
  }
}
