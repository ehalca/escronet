import { initTRPC } from "@trpc/server";
import { z } from "zod";

const trpc = initTRPC.create();
const router = trpc.router;
const publicProcedure = trpc.procedure;

export type AuthRouterHandlers = {
  requestOtp(phoneE164: string): Promise<void>;
  verifyOtp(phoneE164: string, code: string): Promise<{ token: string }>;
};

export function createAppRouter(authHandlers: AuthRouterHandlers) {
  return router({
    health: publicProcedure.query(() => ({ ok: true })),
    auth: router({
      requestOtp: publicProcedure
        .input(
          z.object({
            phoneE164: z.string().min(8).max(24),
          }),
        )
        .mutation(async ({ input }) => {
          await authHandlers.requestOtp(input.phoneE164);
          return { accepted: true as const };
        }),
      verifyOtp: publicProcedure
        .input(
          z.object({
            phoneE164: z.string().min(8).max(24),
            code: z.string().min(4).max(10),
          }),
        )
        .mutation(({ input }) =>
          authHandlers.verifyOtp(input.phoneE164, input.code),
        ),
    }),
  });
}

export type AppRouter = ReturnType<typeof createAppRouter>;
