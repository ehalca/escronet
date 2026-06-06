export type AuthRouterHandlers = {
    requestOtp(phoneE164: string): Promise<void>;
    verifyOtp(phoneE164: string, code: string): Promise<{
        token: string;
    }>;
};
export declare function createAppRouter(authHandlers: AuthRouterHandlers): import("@trpc/server").TRPCBuiltRouter<{
    ctx: object;
    meta: object;
    errorShape: import("@trpc/server").TRPCDefaultErrorShape;
    transformer: false;
}, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
    health: import("@trpc/server").TRPCQueryProcedure<{
        input: void;
        output: {
            ok: boolean;
        };
        meta: object;
    }>;
    auth: import("@trpc/server").TRPCBuiltRouter<{
        ctx: object;
        meta: object;
        errorShape: import("@trpc/server").TRPCDefaultErrorShape;
        transformer: false;
    }, import("@trpc/server").TRPCDecorateCreateRouterOptions<{
        requestOtp: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                phoneE164: string;
            };
            output: {
                accepted: true;
            };
            meta: object;
        }>;
        verifyOtp: import("@trpc/server").TRPCMutationProcedure<{
            input: {
                code: string;
                phoneE164: string;
            };
            output: {
                token: string;
            };
            meta: object;
        }>;
    }>>;
}>>;
export type AppRouter = ReturnType<typeof createAppRouter>;
