import { initTRPC, type inferProcedureBuilderResolverOptions } from "@trpc/server";
import type { Context } from "./context.ts";

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    if (error.code === "INTERNAL_SERVER_ERROR") {
      return { ...shape, message: "Internal server error" };
    }
    return shape;
  },
});

export const router = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export type PublicResolverOptions = inferProcedureBuilderResolverOptions<typeof publicProcedure>;
