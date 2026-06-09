import { initTRPC } from "@trpc/server";
import { z } from "zod";

const trpc = initTRPC.create();
const router = trpc.router;
const publicProcedure = trpc.procedure;

const callerDeltaInput = z.object({
  lastSyncDate: z.string().datetime(),
  limit: z.number().int().min(1).max(5000).default(1000),
});

export type AuthRouterHandlers = {};

export type CallerRouterHandlers = {
  getDelta: (input: { lastSyncDate: string; limit: number }) => Promise<{
    records: Array<{
      id: string;
      phoneNumber: string;
      riskLevel: string;
      createdAt: string;
      updatedAt: string;
      deleteAt: string | null;
    }>;
  }>;
};

export type Handlers = {
  callers: CallerRouterHandlers;
};

export function createAppRouter(handlers: Handlers) {
  return router({
    health: publicProcedure.query(() => ({ ok: true })),
    auth: router({}),
    callers: router({
      delta: publicProcedure
        .input(callerDeltaInput)
        .query(({ input }) => handlers.callers.getDelta(input)),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
