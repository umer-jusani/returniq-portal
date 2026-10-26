import { getSession, jsonError } from "@/lib/auth";
import { subscribe } from "@/lib/pubsub";
import type { StreamEvent } from "@/lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return jsonError("unauthorized", 401);

  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: StreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      send({ type: "ping" });
      cleanup = subscribe(session.tenantId, send);
      heartbeat = setInterval(() => send({ type: "ping" }), 15000);
    },
    cancel() {
      cleanup?.();
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
