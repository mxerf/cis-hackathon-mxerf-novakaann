import { mirageRouter } from "./modules/mirage/mirage.router.ts";
import { router } from "./trpc.ts";

export const appRouter = router({
  mirage: mirageRouter,
});

export type AppRouter = typeof appRouter;
