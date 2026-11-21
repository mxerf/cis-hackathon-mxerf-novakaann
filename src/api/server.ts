import type { Server, ServerWebSocket } from "bun";
import { createApiApp } from "./app.ts";
import type { MirageStore, PendingAiWaitResult } from "./context.ts";
import { createInitialState } from "./modules/mirage/mirage.core.ts";
import { DEFAULT_PRESET, getPresetById } from "./modules/mirage/mirage.presets.ts";
import type { MirageSnapshot, MirageState } from "./modules/mirage/mirage.types.ts";

type WsClientData = {
  clientId: string;
};

type WsStateMessage = {
  type: "state";
  state: MirageState;
  preset: MirageSnapshot["preset"];
};

const WS_TOPIC = "mirage-state";
const DEFAULT_PORT = 3001;

export function startServer(
  port: number = Number(process.env.PORT ?? DEFAULT_PORT),
): Server<WsClientData> {
  let currentState: MirageState = createInitialState(DEFAULT_PRESET, "en");
  let connectedClients = 0;
  let bunServer: Server<WsClientData> | null = null;
  const pendingAiBySession = new Map<string, Set<Promise<void>>>();
  let transferLockTail: Promise<void> = Promise.resolve();

  function buildSnapshot(): MirageSnapshot {
    return {
      state: currentState,
      preset: getPresetById(currentState.presetId),
    };
  }

  function serializeStateMessage(snapshot: MirageSnapshot): string {
    const payload: WsStateMessage = {
      type: "state",
      state: snapshot.state,
      preset: snapshot.preset,
    };
    return JSON.stringify(payload);
  }

  const store: MirageStore = {
    getState: () => currentState,
    getSnapshot: buildSnapshot,
    setState(next: MirageState): MirageSnapshot {
      currentState = next;
      const snapshot = buildSnapshot();
      bunServer?.publish(WS_TOPIC, serializeStateMessage(snapshot));
      return snapshot;
    },
    trackAiTask(sessionId: string, task: Promise<void>): void {
      let bucket = pendingAiBySession.get(sessionId);
      if (!bucket) {
        bucket = new Set();
        pendingAiBySession.set(sessionId, bucket);
      }
      bucket.add(task);
      void task.finally(() => {
        const active = pendingAiBySession.get(sessionId);
        if (!active) {
          return;
        }
        active.delete(task);
        if (active.size === 0) {
          pendingAiBySession.delete(sessionId);
        }
      });
    },
    async waitForPendingAi(sessionId: string, timeoutMs: number): Promise<PendingAiWaitResult> {
      const bucket = pendingAiBySession.get(sessionId);
      if (!bucket || bucket.size === 0) {
        return { waitedMs: 0, timedOut: false, hadPending: false };
      }
      const startedAt = performance.now();
      const tasks = [...bucket];
      let timerId: ReturnType<typeof setTimeout> | null = null;
      const timedOut = await Promise.race([
        Promise.allSettled(tasks).then(() => false),
        new Promise<boolean>((resolve) => {
          timerId = setTimeout(() => resolve(true), timeoutMs);
        }),
      ]);
      if (timerId !== null) {
        clearTimeout(timerId);
      }
      return {
        waitedMs: Math.round(performance.now() - startedAt),
        timedOut,
        hadPending: true,
      };
    },
    async runTransferExclusive<T>(fn: () => Promise<T>): Promise<T> {
      const previous = transferLockTail;
      let release: () => void = () => {};
      transferLockTail = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous;
      try {
        return await fn();
      } finally {
        release();
      }
    },
  };

  const apiApp = createApiApp(store, () => connectedClients);

  const server = Bun.serve<WsClientData>({
    port,
    fetch(req, srv) {
      const url = new URL(req.url);
      if (url.pathname === "/ws") {
        const upgraded = srv.upgrade(req, {
          data: { clientId: crypto.randomUUID() },
        });
        if (upgraded) {
          return undefined;
        }
        return new Response("WebSocket upgrade failed", { status: 400 });
      }
      return apiApp.fetch(req);
    },
    websocket: {
      open(ws: ServerWebSocket<WsClientData>) {
        connectedClients += 1;
        ws.subscribe(WS_TOPIC);
        ws.send(serializeStateMessage(buildSnapshot()));
      },
      message(ws: ServerWebSocket<WsClientData>, message) {
        if (typeof message === "string" && message === "ping") {
          ws.send(JSON.stringify({ type: "pong" }));
        }
      },
      close(ws: ServerWebSocket<WsClientData>) {
        connectedClients = Math.max(0, connectedClients - 1);
        ws.unsubscribe(WS_TOPIC);
      },
    },
  });

  bunServer = server;
  return server;
}

if (import.meta.main) {
  const server = startServer();
  process.stdout.write(`[mirage-api] http://127.0.0.1:${server.port} (trpc: /trpc, ws: /ws)\n`);
}
