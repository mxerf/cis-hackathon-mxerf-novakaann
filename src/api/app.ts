import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { MirageStore } from "./context.ts";
import { appRouter } from "./router.ts";

export function createApiApp(store: MirageStore, getClientCount: () => number): Hono {
  const app = new Hono();

  app.use("/*", cors());

  app.get("/api/health", (c) => {
    const state = store.getState();
    return c.json({
      ok: true,
      mode: state.mode,
      honeytrapStage: state.honeytrapStage,
      clients: getClientCount(),
    });
  });

  app.all("/trpc/*", (c) =>
    fetchRequestHandler({
      endpoint: "/trpc",
      req: c.req.raw,
      router: appRouter,
      createContext: () => ({ store }),
    }),
  );

  return app;
}
