"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAppRouter = createAppRouter;
const server_1 = require("@trpc/server");
const zod_1 = require("zod");
const trpc = server_1.initTRPC.create();
const router = trpc.router;
const publicProcedure = trpc.procedure;
function createAppRouter(authHandlers) {
    return router({
        health: publicProcedure.query(() => ({ ok: true })),
        auth: router({
            requestOtp: publicProcedure
                .input(zod_1.z.object({
                phoneE164: zod_1.z.string().min(8).max(24),
            }))
                .mutation(async ({ input }) => {
                await authHandlers.requestOtp(input.phoneE164);
                return { accepted: true };
            }),
            verifyOtp: publicProcedure
                .input(zod_1.z.object({
                phoneE164: zod_1.z.string().min(8).max(24),
                code: zod_1.z.string().min(4).max(10),
            }))
                .mutation(({ input }) => authHandlers.verifyOtp(input.phoneE164, input.code)),
        }),
    });
}
//# sourceMappingURL=app-router.js.map