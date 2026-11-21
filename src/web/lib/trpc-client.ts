import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../api/router.ts";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/trpc",
    }),
  ],
});
