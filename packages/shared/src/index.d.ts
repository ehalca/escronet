export type ScamNumberDeltaRecord = {
    phoneHash: string;
    confidence: number;
    reportCount: number;
    source: string;
    updatedAt: string;
};
export type ScamAlertEvent = {
    userId: string;
    callId: string;
    score: number;
    transcriptPreview?: string;
    detectedAt: string;
};
export type { AppRouter, AuthRouterHandlers } from "./trpc/app-router.js";
export { createAppRouter } from "./trpc/app-router.js";
