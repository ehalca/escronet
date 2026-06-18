import { z } from "zod";
import {
  CreateAlertResponseSchema,
  ListMyAlertsResponseSchema,
  ListAlertNotificationsResponseSchema,
} from "../schemas/alert.schema";
import { CallerCheckInputSchema, CallerCheckResultSchema, PublicStatsSchema } from "../schemas/stats.schema";
import type { CallerCheckInput } from "../schemas/stats.schema";
import type { CreateAlertInput, UpdateAlertStatusInput, UpdateAlertRiskInput } from "../schemas/alert.schema";
import { AuthResponseSchema } from "../schemas/auth.schema";
import type { RegisterDeviceInput } from "../schemas/auth.schema";
import { CallerDeltaRecordSchema } from "../schemas/caller.schema";
import type { CallerDeltaQuery } from "../schemas/caller.schema";
import {
  GenerateGuardianLinkResponseSchema,
  ClaimGuardianLinkResponseSchema,
  ListGuardianLinksResponseSchema,
} from "../schemas/guardian-link.schema";
import type { ClaimGuardianLinkInput } from "../schemas/guardian-link.schema";
import {
  ListGuardiansResponseSchema,
  ListGuardedUsersResponseSchema,
} from "../schemas/guardian.schema";
import { CreateReportResponseSchema } from "../schemas/report.schema";
import type { CreateReportInput } from "../schemas/report.schema";

const PingResponseSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
});

const HealthResponseSchema = z.object({ ok: z.boolean() });

const CallerDeltaResponseSchema = z.object({
  records: z.array(CallerDeltaRecordSchema),
});

const DEFAULT_VERSION = "v1";

/**
 * version: undefined → prepend /v1 (default)
 * version: "2"       → prepend /v2
 * version: null      → no version prefix (version-neutral route)
 */
type CallOpts = {
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  version?: string | null;
};

type TokenGetter = () => string | null | undefined | Promise<string | null | undefined>;

function buildUrl(
  baseUrl: string,
  path: string,
  prefix: string,
  query?: Record<string, string | number | undefined>,
): string {
  let url = `${baseUrl}${prefix}${path}`;
  if (query) {
    const qs = Object.entries(query)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join("&");
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function call<T>(
  baseUrl: string,
  method: string,
  path: string,
  schema: z.ZodType<T>,
  getToken: TokenGetter | null | undefined,
  opts?: CallOpts,
): Promise<T> {
  const ver = opts?.version === undefined ? DEFAULT_VERSION : opts.version;
  const prefix = ver ? `/${ver}` : "";
  const url = buildUrl(baseUrl, path, prefix, opts?.query);

  const token = getToken ? await Promise.resolve(getToken()) : null;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(url, {
    method,
    headers,
    body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return schema.parse(undefined);
  }

  return schema.parse(await res.json());
}

export function createApiClient(
  baseUrl: string,
  getToken?: TokenGetter,
) {
  const t = getToken ?? null;

  return {
    ping: (opts?: Pick<CallOpts, "version">) =>
      call(baseUrl, "GET", "/ping", PingResponseSchema, t, opts),
    health: (opts?: Pick<CallOpts, "version">) =>
      call(baseUrl, "GET", "/health", HealthResponseSchema, t, opts),
    auth: {
      register: (body: RegisterDeviceInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "POST", "/auth/register", AuthResponseSchema, null, { ...opts, body }),
    },
    callers: {
      delta: (query: CallerDeltaQuery, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/callers/delta", CallerDeltaResponseSchema, t, {
          ...opts,
          query: query as Record<string, string | number | undefined>,
        }),
    },
    guardianLinks: {
      generate: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "POST", "/guardian-links/generate", GenerateGuardianLinkResponseSchema, t, opts),
      claim: (body: ClaimGuardianLinkInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "POST", "/guardian-links/claim", ClaimGuardianLinkResponseSchema, t, { ...opts, body }),
      list: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/guardian-links", ListGuardianLinksResponseSchema, t, opts),
      delete: (id: string, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "DELETE", `/guardian-links/${id}`, z.void(), t, opts),
    },
    guardians: {
      list: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/guardians", ListGuardiansResponseSchema, t, opts),
      listGuarding: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/guardians/guarding", ListGuardedUsersResponseSchema, t, opts),
      updateLabel: (id: string, label: string, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "PATCH", `/guardians/${id}/label`, z.void(), t, { ...opts, body: { label } }),
      remove: (id: string, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "DELETE", `/guardians/${id}`, z.void(), t, opts),
    },
    account: {
      me: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/account/me", z.object({ ok: z.boolean() }), t, opts),
    },
    stats: {
      public: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/stats/public", PublicStatsSchema, null, opts),
      callerCheck: (body: CallerCheckInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "POST", "/stats/caller-check", CallerCheckResultSchema, null, { ...opts, body }),
    },
    alerts: {
      create: (body: CreateAlertInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "POST", "/alerts", CreateAlertResponseSchema, t, { ...opts, body }),
      listMine: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/alerts", ListMyAlertsResponseSchema, t, opts),
      listNotifications: (opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "GET", "/alerts/notifications", ListAlertNotificationsResponseSchema, t, opts),
      markSeen: (id: string, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "PATCH", `/alerts/notifications/${id}/seen`, z.void(), t, opts),
      updateStatus: (id: string, body: UpdateAlertStatusInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "PATCH", `/alerts/${id}/status`, z.void(), t, { ...opts, body }),
      updateRisk: (id: string, body: UpdateAlertRiskInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "PATCH", `/alerts/${id}/risk`, z.void(), t, { ...opts, body }),
    },
    reports: {
      create: (body: CreateReportInput, opts?: Pick<CallOpts, "version">) =>
        call(baseUrl, "POST", "/reports", CreateReportResponseSchema, t, { ...opts, body }),
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
