import type { Server, ServerWebSocket } from "bun";
import { createApiApp } from "./app.ts";
import type { MirageStore } from "./context.ts";
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
