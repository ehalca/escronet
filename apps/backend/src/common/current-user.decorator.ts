import { createParamDecorator, ExecutionContext, SetMetadata } from "@nestjs/common";

export const SKIP_AUTH_KEY = "skipAuth";

export type AuthRequest = {
  headers: Record<string, string | string[] | undefined>;
  userId?: string;
  firebaseUid?: string;
};

export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest<AuthRequest>();
    return req.userId!;
  },
);
