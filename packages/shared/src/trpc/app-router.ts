import { initTRPC } from "@trpc/server";
import { z } from "zod";
import type { RiskLevel } from "../enums/risk-level.enum";
import { RegisterDeviceInputSchema } from "../schemas/auth.schema";

const trpc = initTRPC.create();
const router = trpc.router;
const publicProcedure = trpc.procedure;

const callerDeltaInput = z.object({
  lastSyncDate: z.string().datetime(),
  limit: z.number().int().min(1).max(5000).default(1000),
});

export type AuthRouterHandlers = {
  register: (input: { deviceId: string; fcmToken?: string }) => Promise<{ token: string; userId: string }>;
};

export type CallerRouterHandlers = {
  getDelta: (input: { lastSyncDate: string; limit: number }) => Promise<{
    records: Array<{
      id: string;
      phoneNumber: string;
      riskLevel: RiskLevel;
      createdAt: string;
      updatedAt: string;
      deleteAt: string | null;
    }>;
  }>;
};

export type Handlers = {
  auth: AuthRouterHandlers;
  callers: CallerRouterHandlers;
};

export function createAppRouter(handlers: Handlers) {
  return router({
    health: publicProcedure.query(() => ({ ok: true })),
    auth: router({
      register: publicProcedure
        .input(RegisterDeviceInputSchema)
        .mutation(({ input }) => handlers.auth.register(input)),
    }),
    callers: router({
      delta: publicProcedure
        .input(callerDeltaInput)
        .query(({ input }) => handlers.callers.getDelta(input)),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
