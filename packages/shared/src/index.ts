export { RiskLevel } from "./enums/risk-level.enum";
export {
  RegisterDeviceInputSchema,
  AuthTokenSchema,
} from "./schemas/auth.schema";
export type { RegisterDeviceInput, AuthToken } from "./schemas/auth.schema";

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

export {
  CallerDeltaRecordSchema,
  CallerDeltaQuerySchema,
} from "./schemas/caller.schema";
export type {
  CallerDeltaRecord,
  CallerDeltaQuery,
} from "./schemas/caller.schema";

export type {
  AppRouter,
  AuthRouterHandlers,
  CallerRouterHandlers,
} from "./trpc/app-router";
export { createAppRouter } from "./trpc/app-router";
