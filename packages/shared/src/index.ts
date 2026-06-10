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

export {
  GenerateGuardianLinkResponseSchema,
  ClaimGuardianLinkInputSchema,
  ClaimGuardianLinkResponseSchema,
  GuardianLinkSchema,
  ListGuardianLinksResponseSchema,
} from "./schemas/guardian-link.schema";
export type {
  GenerateGuardianLinkResponse,
  ClaimGuardianLinkInput,
  ClaimGuardianLinkResponse,
  GuardianLinkRecord,
  ListGuardianLinksResponse,
} from "./schemas/guardian-link.schema";

export {
  GuardianRecordSchema,
  ListGuardiansResponseSchema,
  GuardedUserSchema,
  ListGuardedUsersResponseSchema,
  UpdateLabelInputSchema,
} from "./schemas/guardian.schema";
export type {
  GuardianRecord,
  ListGuardiansResponse,
  GuardedUser,
  ListGuardedUsersResponse,
  UpdateLabelInput,
} from "./schemas/guardian.schema";

export { createApiClient } from "./api/client";
export type { ApiClient } from "./api/client";
